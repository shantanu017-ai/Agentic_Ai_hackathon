import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CalendarClock,
  Check,
  Lightbulb,
  X,
} from "lucide-react";
import { MasteryBar } from "./MasteryBar";
import { useAuth } from "../contexts/AuthContext";
import {
  DIFFICULTY_LABEL,
  QUESTION_BY_ID,
  TOPIC_BY_ID,
  TRACK_BY_ID,
  kcLabel,
  questionKcs,
} from "@/lib/questions";
import {
  applyAnswer,
  bandFor,
  confidenceFor,
  dueTopicIds,
  finishSession,
  formatReviewDue,
  kcEvidence,
  reviewFor,
  reviewHealth,
  selectQuestion,
  startSession,
  topicEvidence,
  type AnswerResult,
  type LearnerProfile,
  type Selection,
  type SessionDraft,
} from "@/lib/learner";
import {
  loadAgentMemory,
  saveAgentMemory,
  type StudyPlan,
} from "@/lib/agent";

const SESSION_LENGTH = 8;

type Props = {
  profile: LearnerProfile;
  topicId?: string;
  kcId?: string;
  reviewMode?: boolean;
  planMode?: boolean;
  onProfileChange: (profile: LearnerProfile) => void;
  onFinish: (draft: SessionDraft, finalProfile: LearnerProfile) => void;
  onExit: () => void;
};

export function Practice({
  profile,
  topicId,
  kcId,
  reviewMode = false,
  planMode = false,
  onProfileChange,
  onFinish,
  onExit,
}: Props) {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const scope = user?.username;
  const [dueSnapshot] = useState<string[]>(() =>
    reviewMode ? dueTopicIds(profile) : [],
  );
  const [plan] = useState<StudyPlan | null>(() =>
    planMode ? loadAgentMemory(scope).studyPlan : null,
  );

  const blockFor = (answered: number) => {
    if (!plan || plan.blocks.length === 0) return undefined;
    const total = plan.blocks.reduce((sum, block) => sum + block.minutes, 0) || 1;
    let upto = 0;
    for (let index = 0; index < plan.blocks.length; index += 1) {
      upto += plan.blocks[index].minutes / total;
      if ((answered + 0.5) / SESSION_LENGTH <= upto) {
        return plan.blocks[index];
      }
    }
    return plan.blocks[plan.blocks.length - 1];
  };

  const optionsFor = (
    extra: { excludeIds?: string[]; avoidTopics?: string[] } = {},
  ) => {
    const block = plan ? blockFor(draft.answered) : undefined;
    return {
      topicId: block ? block.topicId : topicId || undefined,
      kcId: block ? undefined : kcId || undefined,
      topicIds: reviewMode ? dueSnapshot : undefined,
      excludeIds: extra.excludeIds,
      avoidTopics: extra.avoidTopics,
    };
  };

  const [draft, setDraft] = useState<SessionDraft>(() => startSession(profile));
  const [liveProfile, setLiveProfile] = useState(profile);
  const [selection, setSelection] = useState<Selection | null>(() => {
    if (reviewMode && dueSnapshot.length === 0) return null;
    return (
      selectQuestion(profile, optionsFor()) ??
      (plan ? selectQuestion(profile) : null)
    );
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const actionsRef = useRef<(event: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    const handler = (event: KeyboardEvent) => actionsRef.current(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (selection) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [selection?.question.id]);

  const finish = (finalProfile: LearnerProfile) => {
    const finished = finishSession(finalProfile, draft);
    if (plan && draft.answered >= SESSION_LENGTH) {
      saveAgentMemory(scope, { studyPlan: null });
    }
    onProfileChange(finished);
    onFinish(draft, finished);
  };

  const endSession = () => {
    if (draft.answered === 0 && !result) {
      onExit();
      return;
    }
    finish(result?.profile ?? liveProfile);
  };

  if (!selection) {
    const message =
      reviewMode && dueSnapshot.length === 0
        ? "No reviews are due. The scheduler will bring topics back when recall is likely to be shaky."
        : kcId
          ? `There are no local items for the concept “${kcLabel(kcId)}” in this track.`
          : topicId
            ? "This topic has no items in the local bank. Choose another topic from the dashboard."
            : "The local bank has no available items for this track.";

    return (
      <div className="site-container max-w-2xl py-16">
        <p className="eyebrow">Practice</p>
        <h1 className="section-title mt-4 text-ink">No questions available.</h1>
        <p className="mt-4 leading-relaxed text-mutedink">{message}</p>
        <button type="button" onClick={onExit} className="btn btn-primary mt-6">
          Back to dashboard
        </button>
      </div>
    );
  }

  const question = selection.question;
  const topic = TOPIC_BY_ID[question.topicId];
  const track = TRACK_BY_ID[question.trackId];
  const activeProfile = result?.profile ?? liveProfile;
  const mastery = activeProfile.mastery[question.topicId] ?? 50;
  const band = bandFor(mastery);
  const accuracy = draft.answered
    ? Math.round((draft.correct / draft.answered) * 100)
    : null;
  const progress = (draft.answered / SESSION_LENGTH) * 100;
  const isChecked = result !== null;
  const revealKey = Boolean(result?.correct) || revealed;
  const review = reviewFor(activeProfile, question.topicId);
  const evidence = topicEvidence(activeProfile, question.topicId);
  const confidence = confidenceFor(evidence);
  const health = review ? reviewHealth(review) : null;
  const activeBlock = plan ? blockFor(draft.answered) : undefined;
  const activeBlockIndex =
    activeBlock && plan ? plan.blocks.indexOf(activeBlock) : -1;

  const sessionLabel = plan
    ? `Study plan · ${plan.blocks.length} block${
        plan.blocks.length === 1 ? "" : "s"
      }`
    : reviewMode
    ? `Spaced review · ${dueSnapshot.length} topic${
        dueSnapshot.length === 1 ? "" : "s"
      } due`
    : kcId
      ? `Concept focus · ${kcLabel(kcId)}`
      : topicId
        ? `Focus session · ${topic.name}`
        : "Adaptive session";

  const submit = () => {
    if (selected === null) return;
    const answer = applyAnswer(liveProfile, question, selected, hintUsed);
    setLiveProfile(answer.profile);
    onProfileChange(answer.profile);
    setResult(answer);
    setDraft((previous) => {
      const priorDelta = previous.deltas[question.topicId] ?? 0;
      return {
        ...previous,
        questionIds: [...previous.questionIds, question.id],
        answered: previous.answered + 1,
        correct: previous.correct + (answer.correct ? 1 : 0),
        deltas: {
          ...previous.deltas,
          [question.topicId]: Math.round((priorDelta + answer.delta) * 10) / 10,
        },
      };
    });
  };

  const advance = () => {
    if (!result) return;
    if (draft.answered >= SESSION_LENGTH) {
      finish(result.profile);
      return;
    }

    const recentTopics = draft.questionIds
      .slice(-2)
      .map((id) => QUESTION_BY_ID[id]?.topicId)
      .filter((id): id is string => Boolean(id));

    let next = selectQuestion(
      result.profile,
      optionsFor({
        excludeIds: draft.questionIds,
        avoidTopics: recentTopics,
      }),
    );

    if (!next && plan) {
      next = selectQuestion(result.profile, {
        excludeIds: draft.questionIds,
        avoidTopics: recentTopics,
      });
    }

    if (!next) {
      finish(result.profile);
      return;
    }

    setSelection(next);
    setSelected(null);
    setResult(null);
    setRevealed(false);
    setShowHint(false);
    setHintUsed(false);
  };

  actionsRef.current = (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        "textarea, select, input[type='text'], input[type='search'], [contenteditable='true']",
      )
    ) {
      return;
    }

    if (!isChecked) {
      if (/^[1-4]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index < question.choices.length) {
          event.preventDefault();
          setSelected(index);
        }
        return;
      }
      if (event.key.toLowerCase() === "h" && !showHint) {
        event.preventDefault();
        setShowHint(true);
        setHintUsed(true);
        return;
      }
      if (event.key === "Enter" && selected !== null) {
        event.preventDefault();
        submit();
      }
      return;
    }

    if (!result) return;
    if (event.key.toLowerCase() === "r" && !result.correct && !revealed) {
      event.preventDefault();
      setRevealed(true);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (result.correct || revealed) advance();
      else setRevealed(true);
    }
  };

  return (
    <div className="site-container py-8 md:py-12">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="btn btn-quiet btn-sm -ml-2">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Dashboard
        </button>
        <button type="button" onClick={endSession} className="btn btn-quiet btn-sm">
          End session
        </button>
      </div>

      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="mono-meta">
              {sessionLabel} · {track.shortName}
            </p>
            <p className="mono-meta">
              Question {Math.min(draft.answered + 1, SESSION_LENGTH)} of{" "}
              {SESSION_LENGTH} · {draft.correct} correct
            </p>
          </div>
          <div
            className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Session progress"
            aria-valuemin={0}
            aria-valuemax={SESSION_LENGTH}
            aria-valuenow={draft.answered}
          >
            <div
              className="h-full rounded-full bg-sage transition-[width] duration-500"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>

          {plan && activeBlock && (
            <div className="mt-5 rounded-[var(--site-radius)] border border-sage/35 bg-sage-tint/60 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="mono-meta text-success">
                  {plan.source === "agent" ? "AI agent plan" : "Built-in plan (checked)"}{" "}
                  · block {activeBlockIndex + 1} of {plan.blocks.length}
                </p>
                <p className="mono-meta">
                  {activeBlock.minutes} min · {activeBlock.topicName}
                </p>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">
                {activeBlock.intent}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-mutedink">
                Done when: {activeBlock.successCriterion}
              </p>
            </div>
          )}

          <motion.div
            key={question.id}
            initial={reduce ? false : { opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0 : 0.26, ease: "easeOut" }}
          >
            <div className="card mt-6 p-6 md:p-9">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mutedink">
                  {topic.short}
                </span>
                <span className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mutedink">
                  {DIFFICULTY_LABEL[question.difficulty]}
                </span>
                {question.kc && (
                  <span className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mutedink">
                    {kcLabel(question.kc)}
                  </span>
                )}
                <span className="mono-meta ml-auto">
                  {Math.round(mastery)}% mastery
                </span>
              </div>

              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mt-6 max-w-2xl font-serif text-[1.5rem] leading-[1.36] text-ink focus:outline-none md:text-[1.85rem]"
              >
                {question.prompt}
              </h1>

              <fieldset className="mt-7">
                <legend className="sr-only">Choose one answer</legend>
                <div className="space-y-2.5">
                  {question.choices.map((choice, choiceIndex) => {
                    const chosen = selected === choiceIndex;
                    const correctChoice =
                      isChecked && revealKey && choiceIndex === question.answer;
                    const chosenWrong = isChecked && chosen && !result?.correct;

                    let classes = "border-line bg-paper hover:border-linestrong";
                    if (correctChoice) classes = "border-sage bg-sage-tint";
                    else if (chosenWrong) classes = "border-brick bg-brick-tint";
                    else if (chosen) classes = "border-brick bg-brick-tint/40";
                    else if (isChecked) classes = "border-line bg-paper opacity-55";

                    return (
                      <label
                        key={choice}
                        className={`choice flex cursor-pointer items-center gap-3 rounded-[var(--site-radius)] border px-4 py-3.5 transition-colors ${classes} ${
                          isChecked ? "cursor-default" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="practice-answer"
                          checked={chosen}
                          disabled={isChecked}
                          onChange={() => setSelected(choiceIndex)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                            correctChoice
                              ? "border-sage"
                              : chosenWrong
                                ? "border-brick"
                                : chosen
                                  ? "border-brick"
                                  : "border-line"
                          }`}
                        >
                          {chosen && (
                            <span
                              className={`size-2 rounded-full ${
                                correctChoice ? "bg-sage" : "bg-brick"
                              }`}
                            />
                          )}
                        </span>
                        <span className="flex-1 text-[0.975rem] leading-relaxed text-ink">
                          {choice}
                        </span>
                        {correctChoice && (
                          <Check
                            className="size-4 shrink-0 text-sage"
                            aria-label="Correct answer"
                          />
                        )}
                        {chosenWrong && (
                          <X
                            className="size-4 shrink-0 text-brick"
                            aria-label="Your answer, incorrect"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {!isChecked && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  {showHint ? (
                    <div className="flex items-start gap-2 text-sm text-mutedink">
                      <Lightbulb
                        className="mt-0.5 size-4 shrink-0 text-sage"
                        aria-hidden="true"
                      />
                      <span>
                        {question.hint}
                        <span className="mono-meta mt-1 block">
                          Scaffolding noted · a correct answer counts 60%
                        </span>
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHint(true);
                        setHintUsed(true);
                      }}
                      className="btn btn-quiet btn-sm"
                    >
                      <Lightbulb className="size-3.5" aria-hidden="true" />
                      Reveal a hint
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={submit}
                    disabled={selected === null}
                    className="btn btn-primary"
                  >
                    Check answer
                  </button>
                </div>
              )}

              {!isChecked && (
                <p className="mono-meta mt-4 border-t border-line pt-4">
                  Choose an answer, then check it. The model updates immediately.
                  <span className="mt-1 hidden sm:block">
                    Shortcuts: 1–4 choose · H hint · Enter check / continue · R
                    reveal
                  </span>
                </p>
              )}
            </div>

            {result && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.25 }}
                role="status"
                aria-live="polite"
                className={`card mt-4 border-l-2 p-6 md:p-7 ${
                  result.correct ? "border-l-sage" : "border-l-brick"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow text-ink">
                      {result.correct ? "Correct" : "Not quite"}
                    </p>
                    <p className="mt-2 max-w-xl font-serif text-[1.3rem] leading-snug text-ink">
                      {result.feedback}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 font-mono text-[11px] tabular ${
                      result.delta >= 0
                        ? "border-sage text-success"
                        : "border-brick text-brick"
                    }`}
                  >
                    {result.delta > 0 ? "+" : ""}
                    {Math.round(result.delta)} mastery
                  </span>
                </div>

                {result.kcMoves.length > 0 && (
                  <p className="mono-meta mt-3">
                    Concept evidence:{" "}
                    {result.kcMoves
                      .map(
                        (move) =>
                          `${move.label} ${Math.round(move.before)}→${Math.round(
                            move.after,
                          )}`,
                      )
                      .join(" · ")}
                  </p>
                )}

                {!result.correct && (
                  <div className="mt-5 rounded-[var(--site-radius)] border border-brick/30 bg-brick-tint/45 p-5">
                    <div className="flex items-center gap-2">
                      <Brain className="size-4 text-brick" aria-hidden="true" />
                      <p className="eyebrow text-brick">Slow down · reasoning check</p>
                    </div>
                    {result.misconception && (
                      <p className="mt-3 text-sm leading-relaxed text-ink">
                        <span className="font-medium">Likely reasoning gap: </span>
                        {result.misconception}
                      </p>
                    )}
                    <p className="mt-3 font-serif text-[1.1rem] leading-snug text-ink">
                      Which test or extreme case would separate your model from the
                      correct one?
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-mutedink">
                      Nudge: {question.hint}
                    </p>
                    {!revealed && (
                      <button
                        type="button"
                        onClick={() => setRevealed(true)}
                        className="btn btn-secondary btn-sm mt-4"
                      >
                        Reveal the worked explanation
                      </button>
                    )}
                  </div>
                )}

                {revealKey && (
                  <>
                    {!result.correct && (
                      <p className="mt-4 text-sm font-medium text-ink">
                        Correct answer: {question.choices[question.answer]}
                      </p>
                    )}
                    <p className="mt-3 max-w-2xl text-[0.95rem] leading-[1.7] text-mutedink">
                      {question.explanation}
                    </p>
                  </>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                  <div>
                    <p className="mono-meta">
                      Mastery {Math.round(result.before)} →{" "}
                      {Math.round(result.after)} · {bandFor(result.after).label}
                    </p>
                    <p className="mono-meta mt-1">
                      Next review {formatReviewDue(result.nextReviewAt).toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!result.correct && !revealed && (
                      <button
                        type="button"
                        onClick={advance}
                        className="btn btn-quiet btn-sm"
                      >
                        {draft.answered >= SESSION_LENGTH
                          ? "Skip to summary"
                          : "Skip explanation"}
                      </button>
                    )}
                    {(result.correct || revealed) && (
                      <button
                        type="button"
                        onClick={advance}
                        className="btn btn-primary"
                      >
                        {draft.answered >= SESSION_LENGTH
                          ? "See session summary"
                          : "Next question"}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="card p-5">
            <p className="eyebrow text-ink">Learner model</p>
            <h2 className="mt-3 font-serif text-[1.2rem] leading-snug text-ink">
              {topic.name}
            </h2>
            <div className="mt-4 flex items-end justify-between gap-2">
              <p className="font-serif text-[2.6rem] leading-none text-ink tabular">
                {Math.round(mastery)}
                <span className="mono-meta ml-1 align-middle">%</span>
              </p>
              <p className="mono-meta mb-1">{band.label}</p>
            </div>
            <div className="mt-3">
              <MasteryBar
                value={mastery}
                label={`${topic.name} mastery`}
                tone={mastery < 30 ? "brick" : "sage"}
              />
            </div>
            <p className="mono-meta mt-2">
              {evidence} answer{evidence === 1 ? "" : "s"} ·{" "}
              {confidence.label.toLowerCase()}
            </p>

            {question.kc && (
              <div className="mt-5 space-y-3 border-t border-line pt-4">
                <p className="eyebrow">Skill</p>
                {questionKcs(question).map((kc) => {
                  const move = result?.kcMoves.find((entry) => entry.kc === kc);
                  const value =
                    move?.after ?? liveProfile.kcMastery[kc] ?? 50;
                  const kcCount = kcEvidence(activeProfile, kc);
                  return (
                    <div key={kc}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm text-ink-soft">{kcLabel(kc)}</p>
                        <p className="mono-meta text-right">
                          {Math.round(value)}%
                          <span className="block text-[10px]">
                            {kcCount} answer{kcCount === 1 ? "" : "s"}
                          </span>
                        </p>
                      </div>
                      <div className="mt-1.5">
                        <MasteryBar
                          value={value}
                          label={`${kcLabel(kc)} mastery`}
                          tone={value < 40 ? "brick" : "sage"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <p className="eyebrow flex items-center gap-1.5">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                Spaced review
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                {review
                  ? formatReviewDue(review.dueAt)
                  : "First review scheduled after this answer"}
              </p>
              {review && (
                <p className="mono-meta mt-1">
                  {review.intervalDays}-day interval · ease {review.ease} ·{" "}
                  {review.lapses} lapse{review.lapses === 1 ? "" : "s"}
                </p>
              )}
              {health && (
                <p className="mono-meta mt-1">
                  Recall likelihood {health.percent}%
                  {health.leech ? " · flagged for reteach" : ""}
                </p>
              )}
            </div>

            <p className="mono-meta mt-4 border-t border-line pt-3">
              Difficulty chosen · {DIFFICULTY_LABEL[selection.targetDifficulty]}
            </p>
            <details className="mt-3 border-t border-line pt-3">
              <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.12em] text-brick [&::-webkit-details-marker]:hidden">
                Why this question?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-mutedink">
                {selection.rationale}
              </p>
            </details>
          </div>

          <div className="card p-5">
            <p className="eyebrow text-ink">This session</p>
            <dl className="mt-4 space-y-2.5">
              {[
                [
                  "Mode",
                  plan
                    ? "Agent study plan"
                    : reviewMode
                      ? "Spaced review"
                      : kcId
                        ? "Concept focus"
                        : "Adaptive",
                ],
                ["Answered", `${draft.answered} of ${SESSION_LENGTH}`],
                ["Correct", String(draft.correct)],
                ["Accuracy", accuracy === null ? "—" : `${accuracy}%`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0"
                >
                  <dt className="text-sm text-mutedink">{label}</dt>
                  <dd className="font-mono text-sm text-ink tabular">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={endSession}
              className="btn btn-secondary btn-sm mt-5 w-full"
            >
              End and review
            </button>
          </div>

          <p className="mono-meta leading-relaxed">
            Every answer is saved to your account in this browser immediately.
            Leaving mid-session keeps your mastery, review date, and reasoning-gap
            record.
          </p>
        </aside>
      </div>
    </div>
  );
}
