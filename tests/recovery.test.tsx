import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RunFailureNotice, { failureReason } from "../src/pages/RunFailureNotice";
import type { Run } from "../src/api";

const run = {
  status: "failed",
  permission: "full",
  max_calls: 8,
  max_seconds: 300,
  max_total_tokens: 50000,
  usage: JSON.stringify({ total_tokens: 55701 }),
  error: "任务达到模型调用或 token [redacted]",
} as Run;

describe("failed task recovery", () => {
  it("knows the legacy fixed limit even before the backend schema is upgraded", () => {
    expect(failureReason({ ...run, max_total_tokens: undefined })).toContain(
      "55701/50000",
    );
  });
  it("explains the legacy hidden budget without claiming permissions are missing", () => {
    expect(failureReason(run)).toContain("55701/50000");
    const html = renderToStaticMarkup(
      <RunFailureNotice
        run={run}
        onContinue={() => {}}
        onOptions={() => {}}
        onTrace={() => {}}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("调整预算");
    expect(html).toContain("查看过程");
    expect(html).toContain("继续处理");
    expect(html).not.toContain("调整权限");
  });
  it("shows the actual tool error and escapes provider markup", () => {
    const error = "SSH连接失败 <img src=x onerror=alert(1)>";
    const html = renderToStaticMarkup(
      <RunFailureNotice
        run={{ ...run, error }}
        onContinue={() => {}}
        onOptions={() => {}}
        onTrace={() => {}}
      />,
    );
    expect(html).toContain("SSH连接失败");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(failureReason({ ...run, usage: "invalid" })).toBe(run.error);
  });
});
