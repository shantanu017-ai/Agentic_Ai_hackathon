import {
  AlertTriangle,
  ArrowRight,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import type { AgentSource, AgentStep } from "@/lib/agent";

export function AgentBadge({
  source,
  busy,
  model,
  tone = "light",
}: {
  source: AgentSource;
  busy?: boolean;
  model?: string;
  tone?: "light" | "ink";
}) {
  const label = busy
    ? "Writing your plan"
    : source === "agent"
      ? "Live AI agent"
      : "Built-in planner (checked)";
  const classes =
    tone === "ink"
      ? busy
        ? "border-paper/40 text-paper"
        : source === "agent"
          ? "border-sage/60 text-sage"
          : "border-paper/30 text-paper/70"
      : busy
        ? "border-line text-ink-soft"
        : source === "agent"
          ? "border-sage/50 text-success"
          : "border-line text-ink-soft";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${classes}`}
      title={model ? `Model: ${model}` : undefined}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      {label}
      {source === "agent" && model ? (
        <span className="normal-case tracking-normal opacity-70">· {model}</span>
      ) : null}
    </span>
  );
}

function iconFor(kind: AgentStep["kind"]) {
  if (kind === "tool") return Wrench;
  if (kind === "verify") return ShieldCheck;
  if (kind === "reflect") return MessageCircle;
  if (kind === "act") return ArrowRight;
  return Sparkles;
}

function statusIcon(status: AgentStep["status"]) {
  if (status === "ok") return Check;
  if (status === "warn") return AlertTriangle;
  return X;
}

export function AgentTrace({
  steps,
  busy,
  tone = "light",
  busyLabel = "Calling the AI agent",
}: {
  steps: AgentStep[];
  busy?: boolean;
  tone?: "light" | "ink";
  busyLabel?: string;
}) {
  const ink = tone === "ink";
  return (
    <div>
      <p
        className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
          ink ? "text-paper/50" : "text-mutedink"
        }`}
      >
        What the agent did
      </p>
      <ol className="mt-3 space-y-3">
        {steps.map((step) => {
          const Icon = iconFor(step.kind);
          const Status = statusIcon(step.status);
          const statusTone =
            step.status === "ok"
              ? ink
                ? "border-sage/60 text-sage"
                : "border-sage/50 text-success"
              : step.status === "warn"
                ? "border-brick/50 text-brick"
                : "border-brick text-brick";
          return (
            <li
              key={step.id}
              className={`rounded-[var(--site-radius)] border p-3 ${
                ink ? "border-paper/15 bg-paper/5" : "border-line bg-paper"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${statusTone}`}
                >
                  <Status className="size-3" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`flex flex-wrap items-center gap-1.5 font-mono text-[11px] ${
                      ink ? "text-paper" : "text-ink"
                    }`}
                  >
                    <Icon
                      className={`size-3 ${ink ? "text-paper/50" : "text-mutedink"}`}
                      aria-hidden="true"
                    />
                    {step.label}
                    <span
                      className={`text-[9px] uppercase tracking-[0.12em] ${
                        ink ? "text-paper/40" : "text-mutedink"
                      }`}
                    >
                      {step.kind}
                    </span>
                  </p>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      ink ? "text-paper/70" : "text-mutedink"
                    }`}
                  >
                    {step.detail}
                  </p>
                  {step.evidence && step.evidence.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {step.evidence.map((item) => (
                        <li
                          key={item}
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                            ink
                              ? "border-paper/20 text-paper/60"
                              : "border-line text-ink-soft"
                          }`}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {busy && (
          <li
            className={`flex items-center gap-2.5 rounded-[var(--site-radius)] border border-dashed p-3 ${
              ink ? "border-paper/25" : "border-line"
            }`}
            aria-live="polite"
          >
            <span className="relative flex size-5 shrink-0 items-center justify-center">
              <span
                className={`absolute inline-flex size-2.5 animate-ping rounded-full ${
                  ink ? "bg-sage" : "bg-sage"
                } opacity-60`}
              />
              <span className="relative inline-flex size-2 rounded-full bg-sage" />
            </span>
            <div>
              <p
                className={`font-mono text-[11px] ${
                  ink ? "text-paper" : "text-ink"
                }`}
              >
                {busyLabel}
              </p>
              <p
                className={`mt-0.5 text-[11px] ${
                  ink ? "text-paper/50" : "text-mutedink"
                }`}
              >
                One request · checked before it is shown
              </p>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}

export function VerifierLine({
  ok,
  checks,
  repairs,
  tone = "light",
}: {
  ok: boolean;
  checks: number;
  repairs: string[];
  tone?: "light" | "ink";
}) {
  const ink = tone === "ink";
  return (
    <details className="mt-3">
      <summary
        className={`cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.12em] [&::-webkit-details-marker]:hidden ${
          ok
            ? ink
              ? "text-sage"
              : "text-success"
            : ink
              ? "text-brick"
              : "text-brick"
        }`}
      >
        <ShieldCheck className="mr-1 inline size-3" aria-hidden="true" />
        {ok
          ? `Rules checked this plan · ${checks} checks passed`
          : repairs.length > 0
            ? `Rules fixed ${repairs.length} issue${repairs.length === 1 ? "" : "s"} before showing`
            : "Rule check flagged an issue · review before starting"}
      </summary>
      {repairs.length > 0 && (
        <ul
          className={`mt-2 list-disc space-y-1 pl-4 text-[11px] ${
            ink ? "text-paper/60" : "text-mutedink"
          }`}
        >
          {repairs.map((repair) => (
            <li key={repair}>{repair}</li>
          ))}
        </ul>
      )}
    </details>
  );
}
