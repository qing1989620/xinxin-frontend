import { api, post, stableRequestKey, type Run } from "./api";

export type AgentSettings = {
  model: string;
  model_configured: boolean;
  capabilities?: { run_token_budget?: boolean; run_recovery?: boolean };
};

export type RunSubmission = {
  task: string;
  conversation_id: string | null;
  permission: string;
  server_id: string | null;
  max_calls: number;
  max_seconds: number;
  max_total_tokens?: number;
  allow_memory: boolean;
  file_ids: string[];
};

export async function submitAgentRun(payload: RunSubmission): Promise<Run> {
  const settings = await api<AgentSettings>("/settings");
  if (
    payload.max_total_tokens !== undefined &&
    !settings.capabilities?.run_token_budget
  )
    throw new Error(
      "当前后端不支持自定义令牌预算，请刷新连接或更新后端后再提交。",
    );
  return post<Run>("/runs", {
    ...payload,
    request_key: await stableRequestKey("agent", payload),
  });
}
