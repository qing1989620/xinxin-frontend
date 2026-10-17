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
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.stubGlobal("sessionStorage", storage());
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("window", new EventTarget());
});

describe("private transport boundaries", () => {
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
