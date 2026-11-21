import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  QUESTIONS,
  TRACK_BY_ID,
  TRACKS,
  questionsFor,
  type Question,
  type TrackId,
} from "@/lib/questions";
import {
  applyAnswer,
  createProfile,
  type LearnerProfile,
} from "@/lib/learner";

type Props = {
  accountName: string;
  onComplete: (profile: LearnerProfile) => void;
  onCancel: () => void;
};

export function Placement({ accountName, onComplete, onCancel }: Props) {
  const [trackId, setTrackId] = useState<TrackId>("c10-physics");
  const [name, setName] = useState(accountName);
  const [started, setStarted] = useState(false);
  const [working, setWorking] = useState<LearnerProfile | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const calibration = useMemo<Question[]>(() => {
    const track = TRACK_BY_ID[trackId];
    return track.topics
      .map(
        (topic) =>
          QUESTIONS.find(
            (question) =>
              question.trackId === trackId &&
              question.topicId === topic.id &&
              question.difficulty === "medium",
          ) ??
          QUESTIONS.find(
            (question) =>
              question.trackId === trackId && question.topicId === topic.id,
          ),
      )
      .filter((question): question is Question => Boolean(question));
  }, [trackId]);

  useEffect(() => {
    if (started) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [index, started]);

  const start = () => {
    setWorking(createProfile(trackId, name.trim() || accountName));
    setIndex(0);
    setSelected(null);
    setStarted(true);
  };

  const submit = () => {
    if (!working || selected === null) return;
    const question = calibration[index];
    const result = applyAnswer(working, question, selected, false, { k: 30 });
    setWorking(result.profile);

    if (index + 1 >= calibration.length) {
      onComplete(result.profile);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
  };

  if (!started) {
    return (
      <div className="site-container max-w-5xl py-12 md:py-16">
        <button type="button" onClick={onCancel} className="btn btn-quiet btn-sm -ml-2">
          ← Cancel
        </button>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow text-brick">Placement</p>
            <h1 className="section-title mt-5 max-w-[15ch] text-ink">
              Let&apos;s build your starting map.
            </h1>
            <p className="mt-6 max-w-md text-[1.025rem] leading-[1.75] text-ink-soft">
              Pick one syllabus. You&apos;ll answer one question per topic. There is
              no feedback during placement, so answer the way you would on test day.
            </p>
            <div className="mt-6 space-y-2 text-sm leading-relaxed text-mutedink">
              <p>· One topic estimate and its knowledge components per answer</p>
              <p>· Every response schedules a first review</p>
              <p>· Concept-level gaps drive the questions afterwards</p>
            </div>
            <p className="mono-meta mt-6">
              {calibration.length} questions · about 3 minutes · saved under your
              account on this device
            </p>
            {calibration.length < 4 && (
              <p
                role="alert"
                className="mt-4 rounded-sm border border-brick/40 bg-brick-tint px-3 py-2 text-sm text-brick"
              >
                This question set is incomplete. Choose another syllabus or check
                the bank.
              </p>
            )}
          </div>

          <form
            className="card p-6 md:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              start();
            }}
          >
            <fieldset>
              <legend className="eyebrow">Choose your exam</legend>
              <div className="mt-4 space-y-2.5">
                {TRACKS.map((track) => {
                  const active = trackId === track.id;
                  return (
                    <label
                      key={track.id}
                      className={`choice block cursor-pointer rounded-[var(--site-radius)] border p-4 transition-colors ${
                        active
                          ? "border-brick bg-brick-tint"
                          : "border-line bg-paper hover:border-linestrong"
                      }`}
                    >
                      <input
                        type="radio"
                        name="track"
                        value={track.id}
                        checked={active}
                        onChange={() => setTrackId(track.id)}
                        className="sr-only"
                      />
                      <span className="flex items-start justify-between gap-4">
                        <span>
                          <span className="block font-serif text-[1.2rem] text-ink">
                            {track.name}
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-mutedink">
                            {track.description}
                          </span>
                          <span className="mono-meta mt-2 block">
                            {track.topics.length} topics ·{" "}
                            {questionsFor(track.id).length} items
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                            active ? "border-brick" : "border-line"
                          }`}
                        >
                          {active && (
                            <span className="size-2 rounded-full bg-brick" />
                          )}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6">
              <label htmlFor="learner-name" className="eyebrow">
                What should the tutor call you?
                <span className="normal-case tracking-normal"> (optional)</span>
              </label>
              <input
                id="learner-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                placeholder="Your name or nickname"
                autoComplete="nickname"
                className="field mt-2"
              />
            </div>

            <button type="submit" className="btn btn-primary mt-6 w-full">
              Start calibration
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <p className="mono-meta mt-4 leading-relaxed">
              Your profile stays in this browser under your username. No email
              required.
            </p>
          </form>
        </div>
      </div>
    );
  }

  const question = calibration[index];
  if (!question || !working) return null;
  const track = TRACK_BY_ID[trackId];
  const progress = (index / calibration.length) * 100;

  return (
    <div className="site-container max-w-3xl py-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onCancel} className="btn btn-quiet btn-sm -ml-2">
          ← Exit
        </button>
        <p className="mono-meta">
          Calibration · {track.shortName} · {index + 1} of {calibration.length}
        </p>
      </div>

      <div
        className="mt-5 h-px w-full bg-line"
        role="progressbar"
        aria-label="Calibration progress"
        aria-valuemin={0}
        aria-valuemax={calibration.length}
        aria-valuenow={index}
      >
        <div
          className="h-px bg-brick transition-[width] duration-500"
          style={{ width: `${Math.max(progress, 3)}%` }}
        />
      </div>

      <div className="card mt-8 p-6 md:p-10">
        <p className="eyebrow">
          Mixed topics · answers hidden until the map is ready
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-6 font-serif text-[1.55rem] leading-[1.35] text-ink focus:outline-none md:text-[1.85rem]"
        >
          {question.prompt}
        </h1>

        <fieldset className="mt-8">
          <legend className="sr-only">Choose one answer</legend>
          <div className="space-y-2.5">
            {question.choices.map((choice, choiceIndex) => {
              const active = selected === choiceIndex;
              return (
                <label
                  key={choice}
                  className={`choice flex cursor-pointer items-center gap-3 rounded-[var(--site-radius)] border px-4 py-3.5 transition-colors ${
                    active
                      ? "border-brick bg-brick-tint"
                      : "border-line bg-paper hover:border-linestrong"
                  }`}
                >
                  <input
                    type="radio"
                    name="placement-answer"
                    checked={active}
                    onChange={() => setSelected(choiceIndex)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                      active ? "border-brick" : "border-line"
                    }`}
                  >
                    {active && <span className="size-2 rounded-full bg-brick" />}
                  </span>
                  <span className="text-[0.975rem] leading-relaxed text-ink">
                    {choice}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="mono-meta">
            {working.name ? `${working.name} · ` : ""}
            {Math.round(progress)}% through placement
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={selected === null}
            className="btn btn-primary"
          >
            {index + 1 === calibration.length
              ? "Finish and build my map"
              : "Continue"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="mono-meta mt-5 text-center">
        No feedback during placement. Every answer becomes your first mastery
        estimate.
      </p>
    </div>
  );
}
