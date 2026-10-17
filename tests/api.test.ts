import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: vi.fn(), set: vi.fn() },
}));

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.stubGlobal("sessionStorage", storage());
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("window", new EventTarget());
});

class UploadRequest {
  static instances: UploadRequest[] = [];
  upload: { onprogress?: (event: object) => void } = {};
  headers: Record<string, string> = {};
  timeout = 0;
  status = 200;
  responseText = '{"id":"saved-resource","name":"phone.txt"}';
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  ontimeout?: () => void;
  open = vi.fn();
  send = vi.fn();
  constructor() {
    UploadRequest.instances.push(this);
  }
  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }
  abort() {
    this.onabort?.();
  }
}

describe("resource uploads", () => {
  it("reports actual transfer progress and preserves the retry identity", async () => {
    vi.stubGlobal("XMLHttpRequest", UploadRequest);
    const { upload, setSession } = await import("../src/api");
    await setSession("private-local-session");
    const progress = vi.fn();
    const pending = upload(new File(["file content"], "phone.txt"), {
      onProgress: progress,
      requestId: "same-retry-id",
    });
    const request = UploadRequest.instances.at(-1)!;
    expect(request.headers["Authorization"]).toBe(
      "Bearer private-local-session",
    );
    expect(request.headers["X-Upload-ID"]).toBe("same-retry-id");
    request.upload.onprogress?.({
      lengthComputable: true,
      loaded: 40,
      total: 100,
    });
    expect(progress).toHaveBeenCalledWith(40, 100);
    request.onload?.();
    expect((await pending).id).toBe("saved-resource");
  });
  it("distinguishes cancellation from server rejection and revokes expired sessions", async () => {
    vi.stubGlobal("XMLHttpRequest", UploadRequest);
    const { upload, setSession, hasSession } = await import("../src/api");
    const controller = new AbortController();
    const pending = upload(new File(["data"], "a.txt"), {
      signal: controller.signal,
    });
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();
    await rejected;
    await setSession("expired");
    const expired = upload(new File(["data"], "a.txt"));
    const expiredCheck = expect(expired).rejects.toMatchObject({
      status: 401,
      message: "请重新登录",
    });
    const request = UploadRequest.instances.at(-1)!;
    request.status = 401;
    request.responseText = '{"detail":"请重新登录"}';
    request.onload?.();
    await expiredCheck;
    expect(hasSession()).toBe(false);
  });
  it("rejects empty and oversized resources before sending", async () => {
    vi.stubGlobal("XMLHttpRequest", UploadRequest);
    const { upload } = await import("../src/api");
    const count = UploadRequest.instances.length;
    await expect(upload(new File([], "empty.txt"))).rejects.toThrow("为空");
    await expect(
      upload({ size: 64 * 1024 * 1024 + 1 } as File),
    ).rejects.toThrow("64 MB");
    expect(UploadRequest.instances.length).toBe(count);
  });
  it("allows HTTP LAN only in the native local-test build", async () => {
    vi.stubEnv("VITE_LOCAL_PHONE_TEST", "1");
    const { Capacitor } = await import("@capacitor/core");
    const native = vi
      .spyOn(Capacitor, "isNativePlatform")
      .mockReturnValue(true);
    const { setServer, isPrivateIPv4 } = await import("../src/api");
    expect(() => setServer("http://192.168.1.12:8000")).not.toThrow();
    expect(() => setServer("http://8.8.8.8:8000")).toThrow("HTTPS");
    native.mockReturnValue(false);
    expect(() => setServer("http://192.168.1.12:8000")).toThrow("HTTPS");
    expect(isPrivateIPv4("10..0.2")).toBe(false);
    expect(isPrivateIPv4("172.32.0.1")).toBe(false);
    expect(isPrivateIPv4("172.16.0.1")).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe("private transport boundaries", () => {
  it("does not restore a native credential from a different backend even if preference clearing is unfinished", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
    const { Preferences } = await import("@capacitor/preferences");
    vi.mocked(Preferences.get).mockImplementation(async ({ key }) => ({
      value:
        key === "session"
          ? "previous-server-token"
          : "https://previous.example",
    }));
    const { setServer, restoreSession, hasSession } =
      await import("../src/api");
    setServer("https://new.example");
    await restoreSession();
    expect(hasSession()).toBe(false);
  });
  it("removes the previous server token before contacting a different server", async () => {
    const { setSession, setServer, api } = await import("../src/api");
    await setSession("old-server-secret");
    setServer("https://another.example");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("{}", { headers: { "content-type": "application/json" } }),
      );
    vi.stubGlobal("fetch", fetch);
    await api("/auth/status");
    expect(
      new Headers(fetch.mock.calls[0][1].headers).has("Authorization"),
    ).toBe(false);
    expect(() => setServer("http://remote.example")).toThrow("HTTPS");
    expect(() => setServer("https://owner:password@example.com")).toThrow();
  });
  it("reuses an uncertain submission identity across a page reload and distinguishes changed work", async () => {
    const first = await import("../src/api");
    const key = await first.stableRequestKey("agent", {
      task: "部署",
      permission: "read",
    });
    vi.resetModules();
    const restored = await import("../src/api");
    expect(
      await restored.stableRequestKey("agent", {
        task: "部署",
        permission: "read",
      }),
    ).toBe(key);
    expect(
      await restored.stableRequestKey("agent", {
        task: "部署",
        permission: "full",
      }),
    ).not.toBe(key);
    restored.acknowledgeRequest("agent");
    expect(sessionStorage.getItem("xinxin-request:agent")).toBe(null);
  });
  it("decodes fragmented UTF-8 events and reconnects from the last accepted cursor without duplication", async () => {
    const { setSession, watchRun } = await import("../src/api");
    await setSession("local-test");
    const encoder = new TextEncoder(),
      seen: string[] = [];
    const event = (seq: number, text: string) =>
      `id: ${seq}\ndata: ${JSON.stringify({ seq, kind: "delta", data: { text } })}\n\n`;
    let streams = 0;
    const fetch = vi.fn(async (input: string) => {
      if (!input.includes("/events"))
        return new Response('{"status":"running"}');
      streams++;
      if (streams === 2) expect(input).toContain("after=1");
      const bytes = encoder.encode(
        streams === 1
          ? event(1, "你好")
          : event(1, "你好") + event(2, "完成") + "event: end\ndata: {}\n\n",
      );
      return new Response(
        new ReadableStream({
          start(controller) {
            for (let i = 0; i < bytes.length; i += 3)
              controller.enqueue(bytes.slice(i, i + 3));
            controller.close();
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    await watchRun(
      "task",
      (item) => seen.push(item.data.text),
      new AbortController().signal,
    );
    expect(seen).toEqual(["你好", "完成"]);
    expect(streams).toBe(2);
  });
});
