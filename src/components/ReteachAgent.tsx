import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ClipboardList, RefreshCw, Users } from "lucide-react";
import { AgentBadge, AgentTrace, VerifierLine } from "./AgentTrace";
import { useAuth } from "../contexts/AuthContext";
import {
  adoptReteachPlan,
  buildLocalReteachPlan,
  buildTeacherSnapshot,
  loadAgentMemory,
  saveAgentMemory,
  type ReteachPlan,
} from "@/lib/agent";
import { unavailableCopy, requestAgent } from "@/lib/agentClient";

function withFallback(plan: ReteachPlan, reason: string): ReteachPlan {
  return {
    ...plan,
    source: "local",
    trace: [
      ...plan.trace,
      {
        id: `fallback-${plan.createdAt}`,
        kind: "model",
        label: "local_fallback",
        detail: unavailableCopy(reason),
        status: "warn",
      },
    ],
  };
}

export function ReteachAgent() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const scope = `teacher:${user?.username ?? "demo"}`;
  const [{ snapshot, trace }] = useState(() => buildTeacherSnapshot());
  const [plan, setPlan] = useState<ReteachPlan | null>(
    () => loadAgentMemory(scope).reteachPlan,
  );
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const running = useRef(false);

  const run = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setNotice(null);
    setModel(null);
    const local = buildLocalReteachPlan(snapshot, trace);
    setPlan(local);
    saveAgentMemory(scope, { reteachPlan: local });

    const response = await requestAgent("reteach", { classroom: snapshot }, 45_000);
    if (response.mode === "live") {
      const adopted = adoptReteachPlan(response.text, snapshot, trace);
      if (adopted.plan) {
        setPlan(adopted.plan);
        saveAgentMemory(scope, { reteachPlan: adopted.plan });
        setModel(response.model ?? null);
        setNotice(
          adopted.plan.verifier.ok
            ? `Live reteach draft verified in ${Math.max(1, Math.round((response.elapsedMs ?? 0) / 1000))}s.`
            : "The draft needed repairs; the verifier reconciled it before display.",
        );
      } else {
        const fallback = withFallback(local, "agent_failed");
        setPlan(fallback);
        saveAgentMemory(scope, { reteachPlan: fallback });
        setNotice(adopted.reason ?? unavailableCopy("agent_failed"));
      }
    } else {
      const fallback = withFallback(local, response.reason);
      setPlan(fallback);
      saveAgentMemory(scope, { reteachPlan: fallback });
      setNotice(unavailableCopy(response.reason));
    }
    setBusy(false);
    running.current = false;
  };

  useEffect(() => {
    if (!plan) void run();
    // Run once when the panel first opens without a stored draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.25 }}
      className="card border-brick/30 bg-brick-tint/40 lg:col-span-12"
      aria-labelledby="plan-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brick/20 px-6 py-4">
        <div>
          <h2 id="plan-heading" className="eyebrow text-ink">
            Reteach agent
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mutedink">
            Reads the class evidence, ranks shared misconceptions, and drafts a
            {plan ? ` ${plan.lessonPlan.reduce((sum, step) => sum + step.minutes, 0)}-minute` : " 20-minute"}{" "}
            lesson. A verifier checks topics, time, and citations before you teach it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AgentBadge source={plan?.source ?? "local"} busy={busy} model={model ?? undefined} />
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
            Re-run
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div>
          <p className="min-h-5 text-xs leading-relaxed text-mutedink" aria-live="polite">
            {notice ?? (plan?.source === "agent"
              ? "Live draft shown. The seeded roster never leaves this site except as de-identified aggregates."
              : "A local draft appears instantly; the cloud agent replaces it when its answer passes the verifier.")}
          </p>

          {plan ? (
            <>
              <h3 className="mt-3 font-serif text-[1.55rem] leading-snug text-ink">
                {plan.headline}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
                {plan.summary}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {plan.priorities.map((priority, index) => (
                  <div
                    key={priority.topicId}
                    className="rounded-[var(--site-radius)] border border-line bg-surface p-4"
                  >
                    <p className="mono-meta">
                      0{index + 1} · {priority.average}% average
                    </p>
                    <h4 className="mt-1.5 font-serif text-[1.15rem] text-ink">
                      {priority.topicName}
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-mutedink">
                      {priority.why}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-brick">
                      <Users className="size-3" aria-hidden="true" />
                      {priority.students} below 40%
                    </p>
                    {priority.misconceptions.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {priority.misconceptions.map((entry) => (
                          <li
                            key={entry.label}
                            className="rounded-full border border-brick/25 bg-brick-tint px-2 py-0.5 font-mono text-[10px] text-brick"
                          >
                            {entry.label} · {entry.count}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mutedink">
                  <ClipboardList className="size-3" aria-hidden="true" />
                  Lesson sequence
                </p>
                <ol className="mt-2 space-y-2">
                  {plan.lessonPlan.map((step, index) => (
                    <li
                      key={`${step.minutes}-${index}`}
                      className="flex gap-3 rounded-[var(--site-radius)] border border-line bg-surface p-3"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-brick/30 bg-brick-tint font-mono text-[11px] text-brick">
                        {step.minutes}′
                      </span>
                      <div>
                        <p className="text-sm leading-relaxed text-ink">{step.activity}</p>
                        <p className="mono-meta mt-1">Evidence: {step.evidence}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {plan.checks.map((check) => (
                  <div
                    key={check.question}
                    className="rounded-[var(--site-radius)] border border-line bg-paper p-3"
                  >
                    <p className="text-sm font-medium leading-relaxed text-ink">
                      {check.question}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-mutedink">
                      Look for: {check.lookFor}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-relaxed text-mutedink">
                {plan.confidenceNote}
              </p>
            </>
          ) : (
            <div className="mt-4 rounded-[var(--site-radius)] border border-dashed border-line p-6">
              <p className="font-serif text-[1.2rem] text-ink">Drafting the reteach…</p>
              <p className="mt-2 text-sm text-mutedink">
                The local evidence reader runs first; the cloud agent refines the
                draft if it is available.
              </p>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[var(--site-radius)] border border-line bg-surface p-4">
            <AgentTrace steps={plan?.trace ?? trace} busy={busy} />
            {plan && (
              <VerifierLine
                ok={plan.verifier.ok}
                checks={plan.verifier.checks.length}
                repairs={plan.verifier.repairs}
              />
            )}
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-mutedink">
              The draft uses the seeded demonstration roster. Check it against real
              student work before teaching.
            </p>
          </div>
          {plan && (
            <button
              type="button"
              onClick={() => document.getElementById("risk-heading")?.scrollIntoView({ behavior: "smooth" })}
              className="link-underline mt-3 inline-flex items-center gap-1.5 text-xs text-mutedink"
            >
              Inspect the check-in list
              <ArrowRight className="size-3" aria-hidden="true" />
            </button>
          )}
        </aside>
      </div>
    </motion.section>
  );
}
