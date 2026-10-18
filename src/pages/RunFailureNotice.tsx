import { PanelRightOpen, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Run } from "../api";

function tokenLimit(run: Run): number | undefined {
  return (
    run.max_total_tokens ??
    (run.error?.startsWith("任务达到模型调用或 token") ? 50000 : undefined)
  );
}

export function failureReason(run: Run): string {
  if (run.error?.startsWith("任务达到模型调用或 token")) {
    try {
      const usage = JSON.parse(run.usage || "{}");
      const limit = tokenLimit(run) ?? usage.max_total_tokens;
      if (limit > 0 && usage.total_tokens >= limit)
        return `本轮累计令牌达到预算（${usage.total_tokens}/${limit}）。可调整预算后继续，前轮工具记录会用于续接。`;
    } catch {
      // Legacy rows may not have parseable usage; keep the actual error below.
    }
  }
  return run.error || "任务未完成，请查看过程中的工具记录。";
}

export default function RunFailureNotice({
  run,
  onContinue,
  onOptions,
  onTrace,
}: {
  run: Run;
  onContinue: () => void;
  onOptions: () => void;
  onTrace: () => void;
}) {
  return (
    <div className="conversation-recovery" role="alert">
      <div className="recovery-reason">
        <strong>本轮未完成</strong>
        <p>{failureReason(run)}</p>
        <small>
          本轮预算：{run.max_calls ?? "—"} 次模型调用 ·{" "}
          {tokenLimit(run)?.toLocaleString() ?? "由服务端决定"} 令牌 ·{" "}
          {run.max_seconds ?? "—"} 秒
        </small>
      </div>
      <div className="recovery-actions">
        <button className="text-button" onClick={onTrace}>
          <PanelRightOpen size={14} />
          查看过程
        </button>
        <button className="text-button" onClick={onOptions}>
          <SlidersHorizontal size={14} />
          调整预算
        </button>
        <button className="text-button" onClick={onContinue}>
          <RotateCcw size={14} />
          继续处理
        </button>
      </div>
    </div>
  );
}
