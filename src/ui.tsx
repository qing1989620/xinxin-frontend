import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, Loader2, ArrowUpRight, FolderOpen } from "lucide-react";
import { api, getBlob } from "./api";

type Toast = (message: string, error?: boolean) => void;
export const ToastContext = createContext<Toast>(() => {});
export const useToast = () => useContext(ToastContext);
export function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query);
    const change = () => setMatches(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [query]);
  return matches;
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <ToastContext.Provider
      value={(message, error = false) => setToast({ message, error })}
    >
      {children}
      <div className="toast-host" aria-live="polite">
        {toast && (
          <div
            className={`toast ${toast.error ? "error" : ""}`}
            role={toast.error ? "alert" : "status"}
          >
            {toast.message}
            <button
              className="icon-button"
              onClick={() => setToast(null)}
              aria-label="关闭提示"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement as HTMLElement;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "dialog wide" : "dialog"}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <header className="dialog-header">
          <h2>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="icon-button"
            aria-label="关闭对话框"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FolderOpen size={24} strokeWidth={1.3} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <Loader2 className="spin" size={22} />
      <span>正在读取私人空间</span>
    </div>
  );
}
export function PageHeader({
  overline,
  title,
  description,
  action,
}: {
  overline: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{overline}</p>
        <h1>{title}</h1>
        {description && <p className="lead">{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Status({ value }: { value: string }) {
  const labels: Record<string, string> = {
    queued: "等待执行",
    running: "执行中",
    cancelling: "正在停止",
    completed: "已完成",
    failed: "执行失败",
    cancelled: "已取消",
    interrupted: "已中断",
  };
  return (
    <span className={`status ${value}`}>
      <span />
      {labels[value] || value}
    </span>
  );
}
export function PrivateImage({
  path,
  alt = "",
  className = "",
  loading,
}: {
  path: string;
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [source, setSource] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let object = "";
    getBlob(path, controller.signal)
      .then((blob) => {
        object = URL.createObjectURL(blob);
        setSource(object);
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (object) URL.revokeObjectURL(object);
      setSource("");
    };
  }, [path]);
  return source ? (
    <img src={source} alt={alt} className={className} loading={loading} />
  ) : (
    <span
      className={`image-placeholder ${className}`}
      role="img"
      aria-label={alt || "图片加载中"}
    />
  );
}
export function useResource<T>(path: string) {
  const [resource, setResource] = useState<{ path: string; data: T } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setError("");
    api<T>(path)
      .then((value) => {
        if (alive) setResource({ path, data: value });
      })
      .catch((error) => {
        if (alive) setError(error.message);
      });
    return () => {
      alive = false;
    };
  }, [path, revision]);
  return {
    data: resource?.path === path ? resource.data : null,
    error,
    reload: () => setRevision((value) => value + 1),
  };
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      <button className="button secondary" onClick={retry}>
        重新读取 <ArrowUpRight size={16} />
      </button>
    </div>
  );
}
export const date = (value: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(value);
export const size = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes > 1048576
      ? `${(bytes / 1048576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
