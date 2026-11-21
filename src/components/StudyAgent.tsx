import { useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Clock,
  HelpCircle,
  RefreshCw,
  Target,
} from "lucide-react";
import { AgentBadge, AgentTrace, VerifierLine } from "./AgentTrace";
import { useAuth } from "../contexts/AuthContext";
import {
  buildLocalStudyPlan,
  loadAgentMemory,
  observeLearner,
  saveAgentMemory,
  adoptStudyPlan,
  type StudyPlan,
} from "@/lib/agent";
import { unavailableCopy, requestAgent } from "@/lib/agentClient";
import type { LearnerProfile } from "@/lib/learner";

const MINUTE_CHOICES = [15, 25, 40];
const GOAL_CHIPS = ["Reviews first", "Unlock the next topic", "Numericals before the test"];

function withFallback(plan: StudyPlan, reason: string): StudyPlan {
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

export function StudyAgent({
  profile,
  onStartPlan,
}: {
  profile: LearnerProfile;
  onStartPlan: () => void;
}) {
  const { user } = useAuth();
  const scope = user?.username;
  const [minutes, setMinutes] = useState(25);
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState<StudyPlan | null>(
    () => loadAgentMemory(scope).studyPlan,
  );
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    setModel(null);
    const { snapshot, trace } = observeLearner(profile, { minutes, goal });
    const local = buildLocalStudyPlan(profile, snapshot, trace);
    setPlan(local);
    saveAgentMemory(scope, { studyPlan: local });

    const response = await requestAgent("study", { learner: snapshot }, 55_000);
    if (response.mode === "live") {
      const adopted = adoptStudyPlan(response.text, snapshot, trace);
      if (adopted.plan) {
        setPlan(adopted.plan);
        saveAgentMemory(scope, { studyPlan: adopted.plan });
        setModel(response.model ?? null);
        setNotice(
          adopted.plan.verifier.ok
            ? `Live plan verified in ${Math.max(1, Math.round((response.elapsedMs ?? 0) / 1000))}s.`
            : "Live plan arrived with issues; the verifier repaired it before display.",
        );
      } else {
        const fallback = withFallback(local, "agent_failed");
        setPlan(fallback);
        saveAgentMemory(scope, { studyPlan: fallback });
        setNotice(
          adopted.reason
            ? `${adopted.reason} The verified local planner is shown.`
            : unavailableCopy("agent_failed"),
        );
      }
    } else {
      const fallback = withFallback(local, response.reason);
      setPlan(fallback);
      saveAgentMemory(scope, { studyPlan: fallback });
      setNotice(unavailableCopy(response.reason));
    }
    setBusy(false);
  };

  const staleCount = plan
    ? profile.attempts.filter(
        (attempt) => new Date(attempt.at).getTime() > new Date(plan.createdAt).getTime(),
      ).length
    : 0;
  const planned = plan?.blocks.reduce((sum, block) => sum + block.minutes, 0) ?? 0;

  return (
    <section
      className="card overflow-hidden border-ink bg-ink text-paper lg:col-span-12"
      aria-labelledby="agent-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/15 px-6 py-4">
        <div>
          <h2 id="agent-heading" className="eyebrow text-paper/70">
            Study agent
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-paper/60">
            The agent reads your learner model, proposes the next session, and a
            deterministic verifier checks every block before you start.
          </p>
        </div>
        <AgentBadge
          source={plan?.source ?? "local"}
          busy={busy}
          model={model ?? undefined}
          tone="ink"
        />
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/50">
              <Clock className="size-3" aria-hidden="true" />
              Budget
            </span>
            {MINUTE_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setMinutes(choice)}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                  minutes === choice
                    ? "border-paper bg-paper text-ink"
                    : "border-paper/25 text-paper/70 hover:border-paper/50"
                }`}
                aria-pressed={minutes === choice}
              >
                {choice} min
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {GOAL_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setGoal(goal === chip ? "" : chip)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  goal === chip
                    ? "border-sage/70 bg-sage/15 text-paper"
                    : "border-paper/20 text-paper/60 hover:border-paper/40"
                }`}
                aria-pressed={goal === chip}
              >
                {chip}
              </button>
            ))}
          </div>

          <label
            htmlFor="agent-goal"
            className="mt-4 block font-mono text-[10px] uppercase tracking-[0.12em] text-paper/50"
          >
            What matters right now? (optional)
          </label>
          <input
            id="agent-goal"
            type="text"
            value={goal}
            maxLength={160}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="e.g. numericals before Friday's test"
            className="mt-1.5 w-full rounded-[var(--site-radius)] border border-paper/20 bg-transparent px-3 py-2 text-sm text-paper placeholder:text-paper/35 focus:border-paper/50 focus:outline-none"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {plan ? (
                <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
              ) : (
                <Target className="size-4" aria-hidden="true" />
              )}
              {busy ? "Agent is planning…" : plan ? "Re-plan with new evidence" : "Plan next session"}
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-paper/40">
              Observe → plan → verify
            </span>
          </div>

          <p className="mt-3 min-h-5 text-xs leading-relaxed text-paper/55" aria-live="polite">
            {notice ?? (staleCount > 0
              ? `${staleCount} new answer${staleCount === 1 ? "" : "s"} since this plan. Re-plan when you are ready.`
              : plan
                ? "The plan is stored in this browser and reused until you re-plan."
                : "The agent never sees your name, password, or raw question text.")}
          </p>

          {plan ? (
            <div className="mt-6">
              <h3 className="font-serif text-[1.6rem] leading-snug text-paper">
                {plan.headline}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper/70">
                {plan.summary}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-paper/45">
                <span>{planned} of {plan.minutes} min planned</span>
                <span>{plan.blocks.length} block{plan.blocks.length === 1 ? "" : "s"}</span>
                <span>Built {new Date(plan.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </p>

              <ol className="mt-4 space-y-2.5">
                {plan.blocks.map((block, index) => (
                  <li
                    key={`${block.topicId}-${index}`}
                    className="rounded-[var(--site-radius)] border border-paper/15 bg-paper/5 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/45">
                          0{index + 1} · {block.minutes} min
                        </p>
                        <p className="mt-1 font-serif text-[1.15rem] text-paper">
                          {block.topicName}
                        </p>
                      </div>
                      <span className="rounded-full border border-paper/20 px-2 py-0.5 font-mono text-[10px] text-paper/60">
                        {block.kcLabels.slice(0, 2).join(" · ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-paper/70">{block.intent}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-paper/50">
                      Done when: {block.successCriterion}
                    </p>
                    {block.evidence.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {block.evidence.map((item) => (
                          <li
                            key={item}
                            className="rounded-full border border-paper/15 px-2 py-0.5 font-mono text-[10px] text-paper/50"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>

              {plan.deferrals.length > 0 && (
                <div className="mt-4 rounded-[var(--site-radius)] border border-brick/40 bg-brick/10 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-brick">
                    Deliberately deferred
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-paper/65">
                    {plan.deferrals.map((entry) => (
                      <li key={entry.topicId}>
                        <span className="text-paper">{entry.topicName}:</span> {entry.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.questionsForLearner.length > 0 && (
                <div className="mt-4">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/45">
                    <HelpCircle className="size-3" aria-hidden="true" />
                    Open questions · they do not block the plan
                  </p>
                  <ul className="mt-2 space-y-1 text-xs leading-relaxed text-paper/60">
                    {plan.questionsForLearner.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 rounded-[var(--site-radius)] border border-paper/15 p-4">
                <p className="text-xs leading-relaxed text-paper/60">
                  {plan.confidenceNote}
                </p>
                <VerifierLine
                  ok={plan.verifier.ok}
                  checks={plan.verifier.checks.length}
                  repairs={plan.verifier.repairs}
                  tone="ink"
                />
              </div>

              <button
                type="button"
                onClick={onStartPlan}
                className="mt-5 inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-sage px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-sage/80"
              >
                Start this plan
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-paper/40">
                <CalendarClock className="mr-1 inline size-3" aria-hidden="true" />
                Runs block by block · your answers update the model after each step
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-[var(--site-radius)] border border-dashed border-paper/20 p-5">
              <p className="font-serif text-[1.2rem] leading-snug text-paper">
                No plan yet.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-paper/60">
                Pick a time budget and a goal, then let the agent plan. A local
                verified plan appears instantly while the cloud agent works, so the
                button never waits on the network.
              </p>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[var(--site-radius)] border border-paper/15 bg-paper/5 p-4">
            {plan ? (
              <AgentTrace steps={plan.trace} busy={busy} tone="ink" />
            ) : (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">
                  Observe → plan → verify
                </p>
                <p className="mt-3 text-xs leading-relaxed text-paper/55">
                  Each run logs the learner-model reads, the agent's proposal, and
                  the verifier result. The trace is built from structured steps, not
                  hidden reasoning text.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
