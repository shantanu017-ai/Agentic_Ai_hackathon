import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowRight,
  CalendarDays,
  CalendarClock,
  Download,
  RotateCcw,
  Target,
} from "lucide-react";
import { MasteryBar } from "./MasteryBar";
import { ConceptGraph } from "./ConceptGraph";
import { StudyAgent } from "./StudyAgent";
import { TOPIC_BY_ID, TRACK_BY_ID } from "@/lib/questions";
import {
  bandFor,
  confidenceFor,
  daysUntil,
  exportProfileJson,
  formatReviewDue,
  nextUnlock,
  overallScore,
  readinessLabel,
  recallProbability,
  recentAccuracy,
  recommendedFocus,
  reviewFor,
  reviewHealth,
  reviewQueue,
  studyStreak,
  topicEvidence,
  topicPriorities,
  weakKcs,
  type LearnerProfile,
} from "@/lib/learner";

type Props = {
  profile: LearnerProfile;
  onChange: (profile: LearnerProfile) => void;
  onStartPractice: (topicId?: string, kcId?: string) => void;
  onStartReview: () => void;
  onStartPlan: () => void;
  onReset: () => void;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function downloadProfile(profile: LearnerProfile) {
  const blob = new Blob([exportProfileJson(profile)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `praxis-${profile.trackId}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ConfidenceChip({ evidence }: { evidence: number }) {
  const confidence = confidenceFor(evidence);
  const tone =
    confidence.level === "high"
      ? "border-sage/45 text-success"
      : confidence.level === "medium"
        ? "border-line text-ink-soft"
        : "border-brick/35 text-brick";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${tone}`}
      title={confidence.detail}
    >
      {confidence.label}
    </span>
  );
}

export function Dashboard({
  profile,
  onChange,
  onStartPractice,
  onStartReview,
  onStartPlan,
  onReset,
}: Props) {
  const reduce = useReducedMotion();
  const track = TRACK_BY_ID[profile.trackId];
  const score = overallScore(profile);
  const band = bandFor(score);
  const priorities = topicPriorities(profile);
  const focus = recommendedFocus(profile);
  const unlock = nextUnlock(profile);
  const closestToStretch =
    unlock ??
    [...priorities].sort((a, b) => b.mastery - a.mastery)[0] ??
    focus;
  const accuracy = recentAccuracy(profile);
  const streak = studyStreak(profile);
  const countdown = daysUntil(profile.examDate);
  const dueReviews = reviewQueue(profile);
  const weak = weakKcs(profile, 4);
  const weakestKc = weak[0];
  const conceptsTouched = new Set(
    profile.attempts.flatMap((attempt) => attempt.kcs ?? [attempt.topicId]),
  ).size;
  const lowConfidenceTopics = priorities.filter(
    (entry) => topicEvidence(profile, entry.topic.id) < 3,
  ).length;

  const scheduled = track.topics
    .flatMap((topic) => {
      const review = reviewFor(profile, topic.id);
      return review ? [{ topic, review }] : [];
    })
    .sort(
      (a, b) =>
        new Date(a.review.dueAt).getTime() - new Date(b.review.dueAt).getTime(),
    );
  const nextScheduled = scheduled.find(
    (entry) => new Date(entry.review.dueAt).getTime() > Date.now(),
  );

  const radarData = track.topics.map((topic) => ({
    short: topic.short,
    topic: topic.name,
    mastery: Math.round(profile.mastery[topic.id] ?? 50),
  }));

  const [confirmReset, setConfirmReset] = useState(false);

  const examCopy =
    countdown === null
      ? "Set a date to see a countdown."
      : countdown > 1
        ? `${countdown} days to your exam`
        : countdown === 1
          ? "Your exam is tomorrow"
          : countdown === 0
            ? "Exam day is today"
            : "That date has passed — choose a new one.";

  const dueLabel = dueReviews.length === 1 ? "review" : "reviews";

  return (
    <div className="site-container py-10 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-brick">
            Learner profile · {track.name}
          </p>
          <h1 className="section-title mt-4 max-w-[18ch] text-ink">
            {greeting()}
            {profile.name ? `, ${profile.name}` : ""}.
          </h1>
          <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-mutedink">
            The model has seen {profile.attempts.length} answer
            {profile.attempts.length === 1 ? "" : "s"} across{" "}
            {Object.keys(profile.kcMastery).length} knowledge components. Your
            next question comes from the gaps below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStartPractice()}
            className="btn btn-primary"
          >
            Start a session
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          {dueReviews.length > 0 && (
            <button
              type="button"
              onClick={onStartReview}
              className="btn btn-secondary"
            >
              <CalendarClock className="size-4" aria-hidden="true" />
              Review {dueReviews.length} due
            </button>
          )}
        </div>
      </header>

      <div className="mt-9 grid gap-5 lg:grid-cols-12">
        <StudyAgent profile={profile} onStartPlan={onStartPlan} />

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.4 }}
          className="card lg:col-span-7"
          aria-labelledby="radar-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="radar-heading" className="eyebrow text-ink">
              Topic mastery
            </h2>
            <p className="mono-meta">
              {track.topics.length} axes · mastery 1–99
            </p>
          </div>
          <div className="p-4 md:p-6">
            <div className="h-[300px] w-full md:h-[320px]" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={radarData}
                  cx="50%"
                  cy="50%"
                  outerRadius="68%"
                  margin={{ top: 18, right: 34, bottom: 18, left: 34 }}
                >
                  <PolarGrid stroke="var(--site-border)" />
                  <PolarAngleAxis
                    dataKey="short"
                    tick={{
                      fill: "var(--site-muted)",
                      fontSize: 10,
                      fontFamily: "var(--font-mono-stack)",
                      letterSpacing: "0.08em",
                    }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Mastery"
                    dataKey="mastery"
                    stroke="var(--sage)"
                    fill="var(--sage)"
                    fillOpacity={0.16}
                    strokeWidth={1.5}
                    dot={{ r: 3, fill: "var(--sage)", strokeWidth: 0 }}
                    isAnimationActive={!reduce}
                    animationDuration={900}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <ul className="sr-only">
              {radarData.map((entry) => (
                <li key={entry.topic}>
                  {entry.topic}: {entry.mastery}% mastery
                </li>
              ))}
            </ul>

            <div className="mono-meta flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <span>Weakest: {focus.topic.name}</span>
              <span>
                Strongest:{" "}
                {
                  [...priorities].sort((a, b) => b.mastery - a.mastery)[0]
                    .topic.name
                }
              </span>
            </div>
          </div>
        </motion.section>

        <section className="card flex flex-col lg:col-span-5">
          <div className="border-b border-line px-6 py-4">
            <h2 className="eyebrow text-ink">Overall readiness</h2>
          </div>
          <div className="flex flex-1 flex-col p-6">
            <div className="flex items-end gap-3">
              <p className="font-serif text-[4.4rem] leading-none tracking-[-0.03em] text-ink tabular">
                {Math.round(score)}
              </p>
              <p className="mono-meta mb-2">/ 100 · {readinessLabel(score)}</p>
            </div>
            <div className="mt-4">
              <MasteryBar value={score} label="Overall readiness" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-mutedink">
              {band.description} Readiness is the mean of every topic score in your
              current track. {lowConfidenceTopics > 0
                ? `${lowConfidenceTopics} topic${
                    lowConfidenceTopics === 1 ? " has" : "s have"
                  } low-confidence estimates, so those can still move quickly.`
                : "Every topic now has enough evidence for a steadier estimate."}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--site-radius)] border border-line bg-line">
              {[
                ["Questions", String(profile.attempts.length)],
                ["Concepts touched", String(conceptsTouched)],
                ["Last 10 accuracy", accuracy === null ? "—" : `${accuracy}%`],
                ["Day streak", String(streak)],
                ["Reviews due", String(dueReviews.length)],
                ["Low-confidence topics", String(lowConfidenceTopics)],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface px-4 py-3">
                  <dt className="mono-meta">{label}</dt>
                  <dd className="mt-1 font-serif text-2xl text-ink tabular">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-auto border-t border-line pt-5">
              <label htmlFor="exam-date" className="eyebrow">
                <CalendarDays
                  className="mr-1.5 inline size-3.5 align-[-2px]"
                  aria-hidden="true"
                />
                Exam date
              </label>
              <input
                id="exam-date"
                type="date"
                value={profile.examDate ?? ""}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    examDate: event.target.value || null,
                  })
                }
                className="field mt-2"
              />
              <p className="mono-meta mt-2" aria-live="polite">
                {examCopy}
              </p>
            </div>
          </div>
        </section>

        <div className="lg:col-span-12">
          <ConceptGraph
            profile={profile}
            onPractise={(topicId) => onStartPractice(topicId)}
          />
        </div>

        <section className="card lg:col-span-7" aria-labelledby="plan-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="plan-heading" className="eyebrow text-ink">
              Today&apos;s plan
            </h2>
            <p className="mono-meta">Chosen from your model</p>
          </div>
          <div className="divide-y divide-[var(--site-border)]">
            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="mono-meta">01 · Prerequisite-aware focus</p>
                <h3 className="mt-2 font-serif text-[1.35rem] text-ink">
                  {focus.topic.name}
                </h3>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-mutedink">
                  {Math.round(focus.mastery)}% mastery ·{" "}
                  {bandFor(focus.mastery).label} · {focus.reason}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStartPractice(focus.topic.id)}
                className="btn btn-secondary btn-sm"
              >
                Practise
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="mono-meta">02 · Weakest concept</p>
                <h3 className="mt-2 font-serif text-[1.35rem] text-ink">
                  {weakestKc ? weakestKc.label : focus.topic.name}
                </h3>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-mutedink">
                  {weakestKc
                    ? `${Math.round(weakestKc.mastery)}% mastery · ${
                        TOPIC_BY_ID[weakestKc.topicId]?.short ?? "Topic"
                      } · ${weakestKc.attempts} attempt${
                        weakestKc.attempts === 1 ? "" : "s"
                      }`
                    : "No knowledge-component evidence yet."}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  weakestKc
                    ? onStartPractice(weakestKc.topicId, weakestKc.kc)
                    : onStartPractice(focus.topic.id)
                }
                className="btn btn-secondary btn-sm"
              >
                Practise concept
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              {dueReviews.length > 0 ? (
                <>
                  <div>
                    <p className="mono-meta">03 · Spaced review</p>
                    <h3 className="mt-2 font-serif text-[1.35rem] text-ink">
                      {dueReviews.length} topic{dueReviews.length === 1 ? "" : "s"}{" "}
                      due
                    </h3>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-mutedink">
                      Earliest: {dueReviews[0].topic.name} ·{" "}
                      {dueReviews[0].dueLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onStartReview}
                    className="btn btn-secondary btn-sm"
                  >
                    Review
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="mono-meta">
                      {unlock ? "03 · Next unlock" : "03 · Closest to stretch"}
                    </p>
                    <h3 className="mt-2 font-serif text-[1.35rem] text-ink">
                      {closestToStretch.topic.name}
                    </h3>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-mutedink">
                      {Math.round(closestToStretch.mastery)}% mastery ·{" "}
                      {unlock
                        ? "a few strong answers unlock stretch items"
                        : "stretch items begin at 70%"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartPractice(closestToStretch.topic.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    Practise
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="card lg:col-span-5" aria-labelledby="reviews-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="reviews-heading" className="eyebrow text-ink">
              Review queue
            </h2>
            <p className="mono-meta">
              {dueReviews.length} {dueLabel} now
            </p>
          </div>
          <div className="flex flex-1 flex-col p-6">
            {dueReviews.length > 0 ? (
              <>
                <ul className="divide-y divide-[var(--site-border)]">
                  {dueReviews.slice(0, 4).map((entry) => {
                    const health = reviewHealth(entry.review);
                    return (
                      <li
                        key={entry.topic.id}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {entry.topic.name}
                          </p>
                          <p className="mono-meta mt-0.5">
                            {entry.dueLabel} · {Math.round(entry.mastery)}%
                            mastery · {health.percent}% recall
                          </p>
                          {health.leech && (
                            <p className="mt-1 inline-flex rounded-full border border-brick/40 bg-brick-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-brick">
                              Needs reteach · {entry.review.lapses} lapses
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onStartPractice(entry.topic.id)}
                          className="link-underline shrink-0 text-xs"
                        >
                          Review
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={onStartReview}
                  className="btn btn-secondary btn-sm mt-5 w-full"
                >
                  Review all due topics
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              </>
            ) : (
              <div>
                <p className="font-serif text-[1.25rem] leading-snug text-ink">
                  Nothing due right now.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-mutedink">
                  Review dates come from recall strength. A correct, unaided answer
                  widens the interval; a miss brings the topic back tomorrow.
                </p>
                {nextScheduled && (
                  <p className="mono-meta mt-4 rounded-sm border border-line bg-paper px-3 py-2">
                    Next: {nextScheduled.topic.name} ·{" "}
                    {formatReviewDue(nextScheduled.review.dueAt)}
                  </p>
                )}
              </div>
            )}

            <div className="mt-auto border-t border-line pt-4">
              <p className="eyebrow">Scheduled</p>
              <ul className="mt-3 space-y-2">
                {track.topics.map((topic) => {
                  const review = reviewFor(profile, topic.id);
                  return (
                    <li
                      key={topic.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-ink-soft">{topic.short}</span>
                      <span className="mono-meta text-right">
                        {review
                          ? `${formatReviewDue(review.dueAt)} · ${Math.round(
                              recallProbability(review) * 100,
                            )}% recall`
                          : "after first answer"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mono-meta mt-4 leading-relaxed">
                FSRS-inspired: ease and interval update after every recall attempt.
              </p>
            </div>
          </div>
        </section>

        <section className="card lg:col-span-7" aria-labelledby="kc-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="kc-heading" className="eyebrow text-ink">
              Weak knowledge components
            </h2>
            <p className="mono-meta">Mastery updated per concept</p>
          </div>
          <ul className="divide-y divide-[var(--site-border)]">
            {weak.map((kc) => (
              <li
                key={kc.kc}
                className="grid gap-3 px-6 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(8rem,1fr)_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{kc.label}</p>
                  <p className="mono-meta mt-0.5">
                    {TOPIC_BY_ID[kc.topicId]?.short ?? "Topic"} · {kc.attempts}{" "}
                    attempt{kc.attempts === 1 ? "" : "s"}
                  </p>
                  <span className="mt-1.5 block">
                    <ConfidenceChip evidence={kc.attempts} />
                  </span>
                </div>
                <div>
                  <MasteryBar
                    value={kc.mastery}
                    label={`${kc.label} mastery`}
                    tone={kc.mastery < 40 ? "brick" : "sage"}
                  />
                  <p className="mono-meta mt-1.5">
                    {Math.round(kc.mastery)}% mastery
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onStartPractice(kc.topicId, kc.kc)}
                  className="link-underline justify-self-start text-xs sm:justify-self-end"
                >
                  Practise
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-6 py-3 text-xs leading-relaxed text-mutedink">
            Concepts are the smaller ideas inside each topic. Targeting one lets the
            model test a specific explanation, not just a chapter.
          </p>
        </section>

        <section className="card lg:col-span-5" aria-labelledby="sessions-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="sessions-heading" className="eyebrow text-ink">
              Recent sessions
            </h2>
            <p className="mono-meta">{profile.sessions.length} saved</p>
          </div>
          <div className="p-6">
            {profile.sessions.length === 0 ? (
              <div>
                <p className="font-serif text-[1.3rem] leading-snug text-ink">
                  No practice sessions yet.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-mutedink">
                  Placement set your first estimates. A short session will start
                  refining them.
                </p>
                <button
                  type="button"
                  onClick={() => onStartPractice(focus.topic.id)}
                  className="btn btn-secondary btn-sm mt-5"
                >
                  <Target className="size-3.5" aria-hidden="true" />
                  Begin with {focus.topic.short.toLowerCase()}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--site-border)]">
                {[...profile.sessions]
                  .reverse()
                  .slice(0, 4)
                  .map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {TRACK_BY_ID[session.trackId].shortName} session
                        </p>
                        <p className="mono-meta mt-0.5">
                          {shortDate(session.endedAt)} · {session.answered}{" "}
                          questions
                        </p>
                      </div>
                      <p className="font-serif text-xl text-ink tabular">
                        {session.correct}/{session.answered}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </section>

        <section className="card lg:col-span-12" aria-labelledby="topics-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="topics-heading" className="eyebrow text-ink">
              Topic detail
            </h2>
            <p className="mono-meta">
              Mastery and next review update after every response
            </p>
          </div>
          <ul className="divide-y divide-[var(--site-border)]">
            {priorities.map(({ topic, mastery, attempts }) => {
              const review = reviewFor(profile, topic.id);
              const confidence = confidenceFor(
                topicEvidence(profile, topic.id),
              );
              const prerequisites = (topic.prerequisites ?? [])
                .map((id) => TOPIC_BY_ID[id]?.short ?? id)
                .join(", ");
              return (
                <li
                  key={topic.id}
                  className="grid gap-4 px-6 py-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(10rem,1fr)_auto] sm:items-center"
                >
                  <div>
                    <h3 className="font-serif text-[1.15rem] text-ink">
                      {topic.name}
                    </h3>
                    <p className="mono-meta mt-1">
                      {bandFor(mastery).label} · {attempts} answered ·{" "}
                      {confidence.label.toLowerCase()} ·{" "}
                      {prerequisites
                        ? `requires ${prerequisites}`
                        : "root concept"}
                    </p>
                  </div>
                  <div>
                    <MasteryBar
                      value={mastery}
                      label={`${topic.name} mastery`}
                      tone={mastery < 30 ? "brick" : "sage"}
                    />
                    <p className="mono-meta mt-2">
                      {Math.round(mastery)}% mastery ·{" "}
                      {review
                        ? `review ${formatReviewDue(review.dueAt).toLowerCase()}`
                        : "review after first answer"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartPractice(topic.id)}
                    className="btn btn-secondary btn-sm justify-self-start sm:justify-self-end"
                  >
                    Practise
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <p className="mono-meta max-w-2xl leading-relaxed">
          This profile is stored in this browser under your account. Early
          answers move estimates more; confidence rises as evidence accumulates.
          Signing out keeps your data; resetting deletes every score.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadProfile(profile)}
            className="btn btn-secondary btn-sm"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Download my data
          </button>
          {confirmReset ? (
            <div
              className="card flex flex-wrap items-center gap-3 border-brick/40 bg-brick-tint px-4 py-3"
              role="alert"
            >
              <p className="text-sm text-ink">Reset the entire learner model?</p>
              <button
                type="button"
                onClick={onReset}
                className="btn btn-primary btn-sm"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="btn btn-quiet btn-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="btn btn-quiet btn-sm text-mutedink"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reset learner model
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
