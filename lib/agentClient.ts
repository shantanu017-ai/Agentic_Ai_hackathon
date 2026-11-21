export type AgentTask = "study" | "reteach" | "reflect";

export type AgentResponse =
  | { mode: "live"; text: string; model?: string; elapsedMs?: number }
  | { mode: "unavailable"; reason: string };

export async function requestAgent(
  task: AgentTask,
  evidence: unknown,
  timeoutMs = 55_000,
): Promise<AgentResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("/functions/v1/app?action=plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, evidence }),
      signal: controller.signal,
      credentials: "same-origin",
    });
    if (!response.ok) {
      return {
        mode: "unavailable",
        reason: response.status === 429 ? "rate_limited" : `http_${response.status}`,
      };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    if (payload.mode === "live" && typeof payload.text === "string") {
      return {
        mode: "live",
        text: payload.text,
        model: typeof payload.model === "string" ? payload.model : undefined,
        elapsedMs: typeof payload.elapsedMs === "number" ? payload.elapsedMs : undefined,
      };
    }
    return {
      mode: "unavailable",
      reason: typeof payload.reason === "string" ? payload.reason : "unavailable",
    };
  } catch {
    return {
      mode: "unavailable",
      reason: controller.signal.aborted ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function unavailableCopy(reason: string) {
  switch (reason) {
    case "not_configured":
      return "The cloud agent is not configured on this deployment. The verified local planner is shown.";
    case "initializing":
      return "The cloud agent is still initialising. The verified local planner is shown meanwhile.";
    case "rate_limited":
      return "The agent is rate-limited right now. The verified local planner is shown.";
    case "timeout":
      return "The cloud agent did not answer in time. The verified local planner is shown.";
    case "network":
      return "The site service is unreachable. The verified local planner is shown.";
    case "agent_failed":
    case "invalid_session":
    case "answer_too_large":
      return "The agent run did not complete. The verified local planner is shown.";
    default:
      return "The agent was unavailable. The verified local planner is shown.";
  }
}
