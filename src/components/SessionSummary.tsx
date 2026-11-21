import { ArrowRight, Brain, CalendarClock, TrendingUp } from "lucide-react";
import { MasteryBar } from "./MasteryBar";
import { TOPIC_BY_ID, TRACK_BY_ID } from "@/lib/questions";
import {
  bandFor,
  daysUntil,
  formatReviewDue,
  recommendedFocus,
  type LearnerProfile,
  type SessionDraft,
} from "@/lib/learner";

type Props = {
  draft: SessionDraft;
  profile: LearnerProfile;
  onPracticeAgain: () => void;
  onDashboard: () => void;
};

export function SessionSummary({
  draft,
  profile,
  onPracticeAgain,
  onDashboard,
}: Props) {
  const track = TRACK_BY_ID[draft.trackId];
  const accuracy = draft.answered
    ? Math.round((draft.correct / draft.answered) * 100)
    : 0;
  const full = draft.answered >= 8;

  const changes = track.topics
    .map((topic) => ({
      topic,
      before: draft.startingMastery[topic.id] ?? 50,
      after: profile.mastery[topic.id] ?? 50,
    }))
    .filter((entry) => Math.round(entry.before) !== Math.round(entry.after))
    .sort(
      (a, b) =>
        Math.abs(b.after - b.before) - Math.abs(a.after - a.before),
    );

  const focus = recommendedFocus(profile);
  const countdown = daysUntil(profile.examDate);
  const touchedReviews = Object.keys(draft.deltas).flatMap((topicId) => {
    const review = profile.reviews[topicId];
    const topic = TOPIC_BY_ID[topicId];
    return review && topic ? [{ topic, review }] : [];
  });
  const reasoningGaps = profile.attempts.filter(
    (attempt) =>
      new Date(attempt.at).getTime() >= new Date(draft.startedAt).getTime() &&
      attempt.misconception,
  );
  const session = profile.sessions.find((record) => record.id === draft.id);
  const minutes = session
    ? Math.max(
        1,
        Math.round(
          (new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime()) /
            60_000,
        ),
      )
    : null;

  return (
    <div className="site-container max-w-4xl py-10 md:py-16">
      <p className="eyebrow text-brick">Session review · {track.name}</p>
      <h1 className="section-title mt-4 max-w-[18ch] text-ink">
        {full
          ? "Eight questions, a clearer map."
          : "Session paused — but not lost."}
      </h1>
      <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-mutedink">
        {full
          ? "Your mastery estimates have been updated and saved. Here is what moved."
          : "Every answer you gave is saved. A short session is still evidence for the model."}
      </p>

      <div className="card mt-8 grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center md:p-8">
        <div>
          <p className="mono-meta">Score</p>
          <p className="mt-2 font-serif text-[3.6rem] leading-none tracking-[-0.03em] text-ink tabular">
            {draft.correct}
            <span className="text-[1.6rem] text-mutedink"> / {draft.answered}</span>
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--site-radius)] border border-line bg-line sm:grid-cols-3">
          {[
            ["Accuracy", `${accuracy}%`],
            ["Questions", String(draft.answered)],
            ["Minutes", minutes === null ? "—" : String(minutes)],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface px-4 py-3">
              <dt className="mono-meta">{label}</dt>
              <dd className="mt-1 font-serif text-xl text-ink tabular">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="card p-6" aria-labelledby="moved-heading">
          <h2 id="moved-heading" className="eyebrow text-ink">
            What moved
          </h2>
          {changes.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-mutedink">
              No measurable movement yet. A very short session is still data — the
              next one will carry it forward.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--site-border)]">
              {changes.map(({ topic, before, after }) => {
                const delta = Math.round(after - before);
                return (
                  <li key={topic.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-ink">{topic.name}</p>
                      <p
                        className={`font-mono text-[11px] tabular ${
                          delta > 0 ? "text-success" : "text-brick"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta} · {Math.round(after)}%
                      </p>
                    </div>
                    <div className="mt-2">
                      <MasteryBar
                        value={after}
                        label={`${topic.name} new mastery`}
                        tone={delta < 0 ? "brick" : "sage"}
                      />
                    </div>
                    <p className="mono-meta mt-1.5">
                      {Math.round(before)}% → {Math.round(after)}% ·{" "}
                      {bandFor(after).label}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-6" aria-labelledby="next-heading">
          <h2 id="next-heading" className="eyebrow text-ink">
            Where to go next
          </h2>
          <div className="mt-4 flex items-start gap-3">
            <TrendingUp
              className="mt-1 size-4 shrink-0 text-sage"
              aria-hidden="true"
            />
            <div>
              <p className="font-serif text-[1.3rem] leading-snug text-ink">
                {focus.topic.name}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-mutedink">
                {Math.round(focus.mastery)}% mastery. {focus.reason}
              </p>
            </div>
          </div>
          {countdown !== null && (
            <p className="mono-meta mt-5 border-t border-line pt-4">
              {countdown > 0
                ? `${countdown} days to your exam`
                : countdown === 0
                  ? "Exam day is today"
                  : "Your exam date has passed"}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPracticeAgain}
              className="btn btn-primary"
            >
              Start another session
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDashboard}
              className="btn btn-secondary"
            >
              Back to dashboard
            </button>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="card p-6" aria-labelledby="reviews-heading">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-sage" aria-hidden="true" />
            <h2 id="reviews-heading" className="eyebrow text-ink">
              Reviews scheduled
            </h2>
          </div>
          {touchedReviews.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-mutedink">
              No review dates were scheduled in this session.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {touchedReviews.map(({ topic, review }) => (
                <li
                  key={topic.id}
                  className="border-b border-line pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{topic.short}</p>
                    <p className="mono-meta">{formatReviewDue(review.dueAt)}</p>
                  </div>
                  <p className="mono-meta mt-1">
                    {review.intervalDays}-day interval · ease {review.ease} ·{" "}
                    {review.reps} recall{review.reps === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6" aria-labelledby="gaps-heading">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-brick" aria-hidden="true" />
            <h2 id="gaps-heading" className="eyebrow text-ink">
              Reasoning gaps logged
            </h2>
          </div>
          {reasoningGaps.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-mutedink">
              No distractor-level reasoning gaps were logged this session.
            </p>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {reasoningGaps.length} response
                {reasoningGaps.length === 1 ? "" : "s"} revealed a specific
                misconception. These are the explanations the tutor will probe next
                time.
              </p>
              <ul className="mt-3 space-y-2">
                {reasoningGaps.slice(-2).map((attempt, index) => (
                  <li
                    key={`${attempt.questionId}-${attempt.at}`}
                    className="rounded-sm border border-brick/25 bg-brick-tint/40 px-3 py-2 text-xs leading-relaxed text-ink-soft"
                  >
                    {attempt.misconception}
                    {index === 0 && reasoningGaps.length > 2
                      ? ` (+${reasoningGaps.length - 2} more)`
                      : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <p className="mono-meta mt-6">
        Saved to your account in this browser · no external server involved
      </p>
    </div>
  );
}
