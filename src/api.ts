import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export type FileItem = {
  id: string;
  name: string;
  mime: string;
  size: number;
  indexed: boolean;
  created: number;
  run_id?: string;
  parse_error?: string;
};
export type Run = {
  id: string;
  conversation_id: string;
  task: string;
  status: string;
  permission: string;
  server_id?: string;
  result: string;
  error: string;
  created: number;
  updated: number;
  usage: string;
  files?: FileItem[];
  max_calls?: number;
  max_seconds?: number;
  allow_memory?: boolean | number;
};
export type RecordItem = {
  id: string;
  kind: string;
  payload: Record<string, any>;
  created: number;
  updated: number;
};
export type EventItem = {
  run_id: string;
  seq: number;
  kind: string;
  data: Record<string, any>;
  created: number;
};
export type ServerItem = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  workdir: string;
  host_key: string;
  key_configured: boolean;
};

let token = sessionStorage.getItem("xinxin-session") || "";
let base =
  localStorage.getItem("xinxin-server") || import.meta.env.VITE_API_BASE || "";

export async function restoreSession() {
  if (Capacitor.isNativePlatform())
    token = (await Preferences.get({ key: "session" })).value || "";
}
export async function setSession(value: string) {
  token = value;
  if (value) sessionStorage.setItem("xinxin-session", value);
  else sessionStorage.removeItem("xinxin-session");
  if (Capacitor.isNativePlatform())
    await Preferences.set({ key: "session", value });
}
export const hasSession = () => Boolean(token);
export const getServer = () => base;
export function setServer(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed) {
    const url = new URL(trimmed);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error("请输入完整的 HTTP(S) 服务地址");
    if (
      url.protocol === "http:" &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    )
      throw new Error("远程连接请使用 HTTPS 地址");
  }
  void setSession("");
  base = trimmed;
  if (base) localStorage.setItem("xinxin-server", base);
  else localStorage.removeItem("xinxin-server");
}
export const url = (path: string) => `${base}/api/v1${path}`;

// Retain the request identity after an uncertain network response, including reloads.
export async function stableRequestKey(namespace: string, payload: unknown) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const fingerprint = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  const storageKey = `xinxin-request:${namespace}`;
  let previous: { fingerprint: string; key: string } | null = null;
  try {
    previous = JSON.parse(sessionStorage.getItem(storageKey) || "null");
  } catch {
    /* Discard malformed local state. */
  }
  if (previous?.fingerprint === fingerprint) return previous.key;
  const key = crypto.randomUUID();
  sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, key }));
  return key;
}
export function acknowledgeRequest(namespace: string) {
  sessionStorage.removeItem(`xinxin-request:${namespace}`);
}

async function timedFetch(input: string, options: RequestInit = {}) {
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)])
    : AbortSignal.timeout(30000);
  try {
    return await fetch(input, { ...options, signal });
  } catch (error) {
    if ((error as Error).name === "TimeoutError")
      throw new Error("连接超时，请检查后端地址和网络后重试");
    throw error;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
async function responseError(response: Response): Promise<never> {
  if (response.status === 401) {
    await setSession("");
    window.dispatchEvent(new Event("xinxin-unauthorized"));
  }
  const data = await response.json().catch(() => null);
  const detail = data?.detail;
  throw new ApiError(
    typeof detail === "string"
      ? detail
      : response.status === 422
        ? "请检查表单内容"
        : `请求失败 (${response.status})`,
    response.status,
  );
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await timedFetch(url(path), { ...options, headers });
  if (!response.ok) return responseError(response);
  return response.json();
}
export const post = <T = any>(path: string, data: any) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const put = <T = any>(path: string, data: any) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(data) });
export const remove = (path: string) => api(path, { method: "DELETE" });
export async function upload(file: File) {
  const body = new FormData();
  body.append("file", file);
  return api<FileItem>("/files", { method: "POST", body });
}
export async function getBlob(path: string, signal?: AbortSignal) {
  const response = await timedFetch(url(path), {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) return responseError(response);
  return response.blob();
}
export async function download(file: FileItem) {
  const blob = await getBlob(`/files/${file.id}/download`);
  return saveBlob(blob, file.name, file.id);
}
export async function saveBlob(
  blob: Blob,
  filename: string,
  id: string = crypto.randomUUID(),
) {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("无法读取下载文件"));
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(blob);
    });
    const name = filename.replace(/[^\p{L}\p{N}_.-]/gu, "_");
    const saved = await Filesystem.writeFile({
      path: `exports/${id}-${name}`,
      data: encoded,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: filename,
      files: [saved.uri],
      dialogTitle: "保存或打开文件",
    });
    return;
  }
  const object = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = object;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(object), 1000);
}

export async function watchRun(
  id: string,
  onEvent: (event: EventItem) => void,
  signal: AbortSignal,
  onConnection?: (state: string) => void,
) {
  let cursor = 0,
    delay = 500;
  while (!signal.aborted) {
    try {
      const response = await fetch(url(`/runs/${id}/events?after=${cursor}`), {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!response.ok) await responseError(response);
      if (!response.body) throw new Error("浏览器不支持事件流");
      onConnection?.("connected");
      delay = 500;
      const reader = response.body!.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (block.includes("event: end")) return;
          const text = block
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!text) continue;
          const event = JSON.parse(text) as EventItem;
          if (event.seq > cursor) {
            cursor = event.seq;
            onEvent(event);
          }
        }
      }
      const run = await api<Run>(`/runs/${id}`);
      if (!["queued", "running", "cancelling"].includes(run.status)) return;
    } catch (error) {
      if (signal.aborted) return;
      if (!hasSession()) throw error;
    }
    onConnection?.("reconnecting");
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", finish);
        resolve();
      };
      const timer = setTimeout(finish, delay);
      signal.addEventListener("abort", finish, { once: true });
    });
    delay = Math.min(delay * 2, 10000);
  }
}
