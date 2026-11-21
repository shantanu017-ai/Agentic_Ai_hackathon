import {
  DIFFICULTY_LABEL,
  DIFFICULTY_VALUE,
  QUESTIONS,
  QUESTION_BY_ID,
  TOPIC_BY_ID,
  TRACK_BY_ID,
  kcLabel,
  questionKcs,
  trackKcs,
  type Difficulty,
  type Question,
  type Topic,
  type TrackId,
} from "./questions";

export type Attempt = {
  questionId: string;
  topicId: string;
  kcs?: string[];
  choice?: number;
  misconception?: string | null;
  correct: boolean;
  hintUsed: boolean;
  difficulty: Difficulty;
  at: string;
};

export type SessionRecord = {
  id: string;
  trackId: TrackId;
  startedAt: string;
  endedAt: string;
  answered: number;
  correct: number;
  deltas: Record<string, number>;
};

export type ReviewState = {
  topicId: string;
  dueAt: string;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  lastReviewedAt: string;
};

export type LearnerProfile = {
  version: 2;
  name: string;
  trackId: TrackId;
  examDate: string | null;
  createdAt: string;
  mastery: Record<string, number>;
  kcMastery: Record<string, number>;
  attempts: Attempt[];
  sessions: SessionRecord[];
  reviews: Record<string, ReviewState>;
};

export type Selection = {
  question: Question;
  rationale: string;
  targetDifficulty: Difficulty;
};

export type AnswerResult = {
  profile: LearnerProfile;
  correct: boolean;
  before: number;
  after: number;
  delta: number;
  feedback: string;
  misconception: string | null;
  nextReviewAt: string;
  kcMoves: { kc: string; label: string; before: number; after: number }[];
};

export type SessionDraft = {
  id: string;
  trackId: TrackId;
  startedAt: string;
  startingMastery: Record<string, number>;
  questionIds: string[];
  answered: number;
  correct: number;
  deltas: Record<string, number>;
};

export type WeakKc = {
  kc: string;
  label: string;
  mastery: number;
  topicId: string;
  attempts: number;
};

const STORAGE_PREFIX = "praxis.profile.v2";
const LEGACY_STORAGE_KEY = "praxis.profile.v1";
const BASE_MASTERY = 50;
const DAY_MS = 86_400_000;

export const PREREQ_GATE = 45;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function emptyMastery(trackId: TrackId) {
  const track = TRACK_BY_ID[trackId];
  return Object.fromEntries(track.topics.map((topic) => [topic.id, BASE_MASTERY]));
}

export function emptyKcMastery(trackId: TrackId) {
  return Object.fromEntries(trackKcs(trackId).map((kc) => [kc, BASE_MASTERY]));
}

export function createProfile(trackId: TrackId, name: string): LearnerProfile {
  return {
    version: 2,
    name: name.trim(),
    trackId,
    examDate: null,
    createdAt: new Date().toISOString(),
    mastery: emptyMastery(trackId),
    kcMastery: emptyKcMastery(trackId),
    attempts: [],
    sessions: [],
    reviews: {},
  };
}

function profileStorageKey(username?: string) {
  return username
    ? `${STORAGE_PREFIX}.${username.trim().toLowerCase()}`
    : `${STORAGE_PREFIX}.guest`;
}

export function loadProfile(username?: string): LearnerProfile | null {
  try {
    let raw = localStorage.getItem(profileStorageKey(username));
    if (!raw && !username) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LearnerProfile> & { version?: number };
    if (!parsed.trackId || !TRACK_BY_ID[parsed.trackId]) return null;

    const track = TRACK_BY_ID[parsed.trackId];
    const mastery = { ...emptyMastery(parsed.trackId) };
    for (const topic of track.topics) {
      const value = parsed.mastery?.[topic.id];
      if (typeof value === "number" && Number.isFinite(value)) {
        mastery[topic.id] = clamp(value, 1, 99);
      }
    }
    const kcMastery = { ...emptyKcMastery(parsed.trackId) };
    for (const kc of Object.keys(kcMastery)) {
      const value = parsed.kcMastery?.[kc];
      if (typeof value === "number" && Number.isFinite(value)) {
        kcMastery[kc] = clamp(value, 1, 99);
      }
    }

    const reviews: Record<string, ReviewState> = {};
    if (parsed.reviews && typeof parsed.reviews === "object") {
      for (const [topicId, value] of Object.entries(parsed.reviews)) {
        if (!track.topics.some((topic) => topic.id === topicId)) continue;
        if (!value || typeof value !== "object") continue;
        const review = value as Partial<ReviewState>;
        if (typeof review.dueAt !== "string") continue;
        reviews[topicId] = {
          topicId,
          dueAt: review.dueAt,
          intervalDays:
            typeof review.intervalDays === "number" ? review.intervalDays : 1,
          ease: typeof review.ease === "number" ? review.ease : 2.3,
          reps: typeof review.reps === "number" ? review.reps : 0,
          lapses: typeof review.lapses === "number" ? review.lapses : 0,
          lastReviewedAt:
            typeof review.lastReviewedAt === "string"
              ? review.lastReviewedAt
              : new Date().toISOString(),
        };
      }
    }

    return {
      version: 2,
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 60) : "",
      trackId: parsed.trackId,
      examDate: typeof parsed.examDate === "string" ? parsed.examDate : null,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      mastery,
      kcMastery,
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts.slice(-400) : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.slice(-40) : [],
      reviews,
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: LearnerProfile, username?: string) {
  try {
    localStorage.setItem(profileStorageKey(username), JSON.stringify(profile));
  } catch {
    // Storage can be unavailable in private browsing mode; the session still works in memory.
  }
}

export function clearProfile(username?: string) {
  try {
    localStorage.removeItem(profileStorageKey(username));
    if (!username) localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function hasProfile(username?: string) {
  try {
    return Boolean(localStorage.getItem(profileStorageKey(username)));
  } catch {
    return false;
  }
}

export function exportProfileJson(profile: LearnerProfile) {
  return JSON.stringify(
    {
      app: "Praxis",
      exportedAt: new Date().toISOString(),
      format: "praxis-learner-profile",
      profile,
    },
    null,
    2,
  );
}

export function difficultyFor(mastery: number): Difficulty {
  if (mastery < 30) return "easy";
  if (mastery < 70) return "medium";
  return "hard";
}

export const BANDS = [
  {
    key: "foundational" as const,
    label: "Foundational",
    range: "1–29",
    description: "Core ideas are still forming. Questions rebuild the base.",
  },
  {
    key: "developing" as const,
    label: "Developing",
    range: "30–69",
    description: "The idea is usable. Questions apply it in new contexts.",
  },
  {
    key: "stretch" as const,
    label: "Stretch",
    range: "70–99",
    description: "Strong command. Questions combine ideas and add pressure.",
  },
];

export function bandFor(mastery: number) {
  if (mastery < 30) return BANDS[0];
  if (mastery < 70) return BANDS[1];
  return BANDS[2];
}

export function overallScore(profile: LearnerProfile) {
  const topics = TRACK_BY_ID[profile.trackId].topics;
  const total = topics.reduce(
    (sum, topic) => sum + (profile.mastery[topic.id] ?? BASE_MASTERY),
    0,
  );
  return round1(total / topics.length);
}

export function readinessLabel(score: number) {
  if (score < 40) return "Early foundation";
  if (score < 60) return "Building momentum";
  if (score < 78) return "On track";
  return "Exam ready";
}

export function topicPriorities(profile: LearnerProfile): {
  topic: Topic;
  mastery: number;
  attempts: number;
}[] {
  const track = TRACK_BY_ID[profile.trackId];
  return track.topics
    .map((topic) => ({
      topic,
      mastery: profile.mastery[topic.id] ?? BASE_MASTERY,
      attempts: profile.attempts.filter((attempt) => attempt.topicId === topic.id)
        .length,
    }))
    .sort((a, b) => a.mastery - b.mastery || a.attempts - b.attempts);
}

export function weakKcs(profile: LearnerProfile, limit = 4): WeakKc[] {
  const topicByKc = new Map<string, string>();
  for (const question of QUESTIONS) {
    if (question.trackId !== profile.trackId) continue;
    for (const kc of questionKcs(question)) {
      if (!topicByKc.has(kc)) topicByKc.set(kc, question.topicId);
    }
  }
  const attemptsByKc = new Map<string, number>();
  for (const attempt of profile.attempts) {
    for (const kc of attempt.kcs ?? [attempt.topicId]) {
      attemptsByKc.set(kc, (attemptsByKc.get(kc) ?? 0) + 1);
    }
  }
  return [...topicByKc.entries()]
    .map(([kc, topicId]) => ({
      kc,
      topicId,
      label: kcLabel(kc),
      mastery: profile.kcMastery[kc] ?? BASE_MASTERY,
      attempts: attemptsByKc.get(kc) ?? 0,
    }))
    .sort((a, b) => a.mastery - b.mastery || b.attempts - a.attempts)
    .slice(0, limit);
}

export function topicEvidence(profile: LearnerProfile, topicId: string) {
  return profile.attempts.filter((attempt) => attempt.topicId === topicId).length;
}

export function kcEvidence(profile: LearnerProfile, kc: string) {
  return profile.attempts.filter((attempt) =>
    (attempt.kcs ?? [attempt.topicId]).includes(kc),
  ).length;
}

export type Confidence = {
  level: "low" | "medium" | "high";
  label: string;
  detail: string;
};

export function confidenceFor(evidence: number): Confidence {
  if (evidence < 3) {
    return {
      level: "low",
      label: "Low confidence",
      detail: "Few responses — the estimate can still move quickly.",
    };
  }
  if (evidence < 8) {
    return {
      level: "medium",
      label: "Medium confidence",
      detail: "The estimate is settling but still open to evidence.",
    };
  }
  return {
    level: "high",
    label: "High confidence",
    detail: "Enough evidence to trust the trend, not just one answer.",
  };
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function recallProbability(review: ReviewState, now = new Date()) {
  const last = new Date(review.lastReviewedAt).getTime();
  const elapsedDays = Number.isFinite(last)
    ? Math.max(0.05, (now.getTime() - last) / DAY_MS)
    : 0.05;
  const stability = Math.max(0.75, review.intervalDays);
  return clamp(Math.exp((-Math.LN2 * elapsedDays) / stability), 0.05, 0.99);
}

export function reviewHealth(review: ReviewState, now = new Date()) {
  const recall = recallProbability(review, now);
  return {
    recall,
    percent: Math.round(recall * 100),
    leech: review.lapses >= 3 || (review.lapses >= 2 && review.ease <= 1.9),
  };
}

export function formatReviewDue(dueAt: string, now = new Date()) {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "Unscheduled";
  const diff = Math.round(
    (startOfDay(due).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );
  if (diff < -1) return `${-diff} days overdue`;
  if (diff === -1) return "1 day overdue";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 7) return `In ${diff} days`;
  if (diff < 14) return "In 1 week";
  return `In ${Math.round(diff / 7)} weeks`;
}

export function isReviewDue(review: ReviewState | undefined, now = new Date()) {
  if (!review) return false;
  return new Date(review.dueAt).getTime() <= now.getTime();
}

export function reviewFor(profile: LearnerProfile, topicId: string) {
  return profile.reviews[topicId] ?? null;
}

export function reviewQueue(profile: LearnerProfile, now = new Date()) {
  const track = TRACK_BY_ID[profile.trackId];
  return track.topics
    .map((topic) => {
      const review = profile.reviews[topic.id];
      return review && isReviewDue(review, now)
        ? {
            topic,
            review,
            mastery: profile.mastery[topic.id] ?? BASE_MASTERY,
            dueLabel: formatReviewDue(review.dueAt, now),
            overdueDays: Math.max(
              0,
              Math.round(
                (startOfDay(now).getTime() -
                  startOfDay(new Date(review.dueAt)).getTime()) /
                  DAY_MS,
              ),
            ),
          }
        : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort(
      (a, b) =>
        new Date(a.review.dueAt).getTime() - new Date(b.review.dueAt).getTime(),
    );
}

export function dueTopicIds(profile: LearnerProfile, now = new Date()) {
  return reviewQueue(profile, now).map((entry) => entry.topic.id);
}

function scheduleReview(
  previous: ReviewState | undefined,
  topicId: string,
  correct: boolean,
  hintUsed: boolean,
  at: Date,
): ReviewState {
  const ease = clamp(
    round2(
      (previous?.ease ?? 2.3) +
        (correct ? (hintUsed ? 0.02 : 0.08) : -0.22),
    ),
    1.3,
    2.8,
  );
  let intervalDays: number;
  if (!correct) {
    intervalDays = 1;
  } else if (!previous || previous.reps === 0) {
    intervalDays = hintUsed ? 1 : 2;
  } else {
    intervalDays = Math.min(
      90,
      Math.max(
        2,
        Math.round(previous.intervalDays * (hintUsed ? 1.5 : ease)),
      ),
    );
  }
  const due = new Date(at.getTime() + intervalDays * DAY_MS);
  return {
    topicId,
    dueAt: due.toISOString(),
    intervalDays,
    ease,
    reps: (previous?.reps ?? 0) + 1,
    lapses: (previous?.lapses ?? 0) + (correct ? 0 : 1),
    lastReviewedAt: at.toISOString(),
  };
}

function recentlySeen(profile: LearnerProfile) {
  return new Set(profile.attempts.slice(-24).map((attempt) => attempt.questionId));
}

function pickFromPool(
  pool: Question[],
  target: Difficulty,
  excluded: Set<string>,
  lastSeen: Map<string, number>,
) {
  if (pool.length === 0) return null;
  const order: Difficulty[] = [target];
  if (target === "medium") order.push("easy", "hard");
  if (target === "easy") order.push("medium", "hard");
  if (target === "hard") order.push("medium", "easy");

  for (const difficulty of order) {
    const unseen = pool.filter(
      (question) =>
        question.difficulty === difficulty && !excluded.has(question.id),
    );
    if (unseen.length > 0) return unseen[0];
  }

  // When the pool is exhausted, recycle the item seen longest ago rather than
  // repeating the most recent one.
  for (const difficulty of order) {
    const seen = pool
      .filter((question) => question.difficulty === difficulty)
      .sort(
        (a, b) => (lastSeen.get(a.id) ?? 0) - (lastSeen.get(b.id) ?? 0),
      );
    if (seen.length > 0) return seen[0];
  }

  return pool[0];
}

export function selectQuestion(
  profile: LearnerProfile,
  options: {
    trackId?: TrackId;
    topicId?: string;
    kcId?: string;
    topicIds?: string[];
    excludeIds?: string[];
    avoidTopics?: string[];
  } = {},
): Selection | null {
  const trackId = options.trackId ?? profile.trackId;
  const track = TRACK_BY_ID[trackId];
  if (!track) return null;

  let pool = QUESTIONS.filter((question) => question.trackId === trackId);
  if (options.kcId) {
    pool = pool.filter((question) =>
      questionKcs(question).includes(options.kcId as string),
    );
  }
  if (options.topicIds?.length) {
    pool = pool.filter((question) => options.topicIds?.includes(question.topicId));
  }
  if (pool.length === 0) return null;

  const allowedTopics = new Set(pool.map((question) => question.topicId));
  const forcedTopic = options.topicId
    ? track.topics.find(
        (topic) => topic.id === options.topicId && allowedTopics.has(topic.id),
      )
    : undefined;

  let topic = forcedTopic;
  let gateTopic: Topic | null = null;
  const priorities = topicPriorities({ ...profile, trackId }).filter((entry) =>
    allowedTopics.has(entry.topic.id),
  );
  if (!topic) {
    const avoid = new Set(options.avoidTopics ?? []);
    const withoutRecent = priorities.filter(
      (entry) => !avoid.has(entry.topic.id),
    );
    const candidate = (withoutRecent[0] ?? priorities[0])?.topic;
    topic = candidate;
    if (candidate && !options.kcId && !options.topicIds?.length) {
      const unmet = (candidate.prerequisites ?? [])
        .map((id) => priorities.find((entry) => entry.topic.id === id))
        .filter(
          (
            entry,
          ): entry is (typeof priorities)[number] =>
            entry !== undefined && entry.mastery < PREREQ_GATE,
        )
        .sort((a, b) => a.mastery - b.mastery)[0];
      if (unmet) {
        gateTopic = candidate;
        topic = unmet.topic;
      }
    }
  }

  if (!topic) return null;

  const kcMastery = options.kcId
    ? profile.kcMastery[options.kcId] ?? BASE_MASTERY
    : null;
  const mastery =
    kcMastery ?? (profile.mastery[topic.id] ?? BASE_MASTERY);
  const targetDifficulty = difficultyFor(mastery);
  const excluded = new Set([
    ...recentlySeen(profile),
    ...(options.excludeIds ?? []),
  ]);
  const lastSeen = new Map<string, number>();
  for (const attempt of profile.attempts) {
    lastSeen.set(
      attempt.questionId,
      Math.max(
        lastSeen.get(attempt.questionId) ?? 0,
        new Date(attempt.at).getTime(),
      ),
    );
  }
  const picked = pickFromPool(
    pool.filter((question) => question.topicId === topic?.id),
    targetDifficulty,
    excluded,
    lastSeen,
  );
  if (!picked) return null;

  const difficultyText =
    targetDifficulty === "easy"
      ? "Foundational items rebuild the core idea below 30% mastery."
      : targetDifficulty === "medium"
        ? "Developing items apply the idea while mastery sits between 30% and 70%."
        : "Stretch items combine ideas once mastery passes 70%.";

  const focusText = forcedTopic
    ? `You chose ${topic.name.toLowerCase()} as the focus.`
    : gateTopic
      ? `${topic.name} is below the ${PREREQ_GATE}% prerequisite gate and unlocks ${gateTopic.name}.`
      : `${topic.name} is the lowest-mastery topic in this set.`;
  const kcText = options.kcId
    ? ` Focus concept: ${kcLabel(options.kcId)} (${Math.round(mastery)}% mastery).`
    : "";

  return {
    question: picked,
    targetDifficulty,
    rationale: `${focusText}${kcText} Mastery is ${Math.round(mastery)}%, so this ${DIFFICULTY_LABEL[
      targetDifficulty
    ].toLowerCase()} item fits your current edge. ${difficultyText}`,
  };
}

export function applyAnswer(
  profile: LearnerProfile,
  question: Question,
  choiceIndex: number,
  hintUsed: boolean,
  options: { k?: number; at?: string } = {},
): AnswerResult {
  const correct = choiceIndex === question.answer;
  const before = profile.mastery[question.topicId] ?? BASE_MASTERY;
  const expected =
    1 / (1 + Math.pow(10, (DIFFICULTY_VALUE[question.difficulty] - before) / 25));
  const priorTopicEvidence = topicEvidence(profile, question.topicId);
  const k =
    options.k ??
    (priorTopicEvidence < 2 ? 26 : priorTopicEvidence < 6 ? 20 : 16);
  let delta = k * ((correct ? 1 : 0) - expected);
  if (correct && hintUsed) delta *= 0.6;
  const after = clamp(round1(before + delta), 1, 99);
  delta = round1(after - before);

  const kcs = questionKcs(question);
  const kcMastery = { ...profile.kcMastery };
  const kcMoves = kcs.map((kc) => {
    const kcBefore = kcMastery[kc] ?? BASE_MASTERY;
    const kcExpected =
      1 /
      (1 +
        Math.pow(10, (DIFFICULTY_VALUE[question.difficulty] - kcBefore) / 25));
    const kcPriorEvidence = kcEvidence(profile, kc);
    const kcK = kcPriorEvidence < 2 ? 20 : kcPriorEvidence < 6 ? 16 : 14;
    let kcDelta = kcK * ((correct ? 1 : 0) - kcExpected);
    if (correct && hintUsed) kcDelta *= 0.6;
    const kcAfter = clamp(round1(kcBefore + kcDelta), 1, 99);
    kcMastery[kc] = kcAfter;
    return {
      kc,
      label: kcLabel(kc),
      before: kcBefore,
      after: kcAfter,
    };
  });

  const at = options.at ?? new Date().toISOString();
  const atDate = new Date(at);
  const review = scheduleReview(
    profile.reviews[question.topicId],
    question.topicId,
    correct,
    hintUsed,
    atDate,
  );

  const misconception =
    !correct && question.misconceptions?.[choiceIndex]
      ? question.misconceptions[choiceIndex]
      : null;

  const attempts = [
    ...profile.attempts,
    {
      questionId: question.id,
      topicId: question.topicId,
      kcs,
      choice: choiceIndex,
      misconception,
      correct,
      hintUsed,
      difficulty: question.difficulty,
      at,
    },
  ].slice(-400);

  const nextProfile: LearnerProfile = {
    ...profile,
    mastery: { ...profile.mastery, [question.topicId]: after },
    kcMastery,
    attempts,
    reviews: {
      ...profile.reviews,
      [question.topicId]: review,
    },
  };

  const topic = TRACK_BY_ID[profile.trackId].topics.find(
    (item) => item.id === question.topicId,
  );
  const topicName = topic?.name.replace(/&/g, "and") ?? "This topic";
  const moved = `${Math.round(before)}% to ${Math.round(after)}%`;
  const changeWord = delta === 0 ? "held steady" : delta > 0 ? "rose" : "fell";

  const feedback = correct
    ? hintUsed
      ? `Correct with scaffolding. ${topicName} ${changeWord} from ${moved}. Hint-supported answers count for 60% of the gain.`
      : `Correct. ${topicName} ${changeWord} from ${moved}.`
    : `Not quite. ${topicName} ${changeWord} from ${moved}. We logged a specific reasoning gap from your choice, then scheduled this topic for an early review.`;

  return {
    profile: nextProfile,
    correct,
    before,
    after,
    delta,
    feedback,
    misconception,
    nextReviewAt: review.dueAt,
    kcMoves,
  };
}

export function startSession(
  profile: LearnerProfile,
  trackId: TrackId = profile.trackId,
): SessionDraft {
  const track = TRACK_BY_ID[trackId];
  const startingMastery = Object.fromEntries(
    track.topics.map((topic) => [
      topic.id,
      profile.mastery[topic.id] ?? BASE_MASTERY,
    ]),
  );
  return {
    id: `session-${Date.now()}`,
    trackId,
    startedAt: new Date().toISOString(),
    startingMastery,
    questionIds: [],
    answered: 0,
    correct: 0,
    deltas: {},
  };
}

export function finishSession(
  profile: LearnerProfile,
  draft: SessionDraft,
): LearnerProfile {
  if (draft.answered === 0) return profile;
  const record: SessionRecord = {
    id: draft.id,
    trackId: draft.trackId,
    startedAt: draft.startedAt,
    endedAt: new Date().toISOString(),
    answered: draft.answered,
    correct: draft.correct,
    deltas: draft.deltas,
  };
  return {
    ...profile,
    sessions: [...profile.sessions, record].slice(-40),
  };
}

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function studyStreak(profile: LearnerProfile) {
  const days = new Set(
    profile.attempts.map((attempt) => localDayKey(new Date(attempt.at))),
  );
  if (days.size === 0) return 0;
  const cursor = new Date();
  if (!days.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function recentAccuracy(profile: LearnerProfile, count = 10) {
  const recent = profile.attempts.slice(-count);
  if (recent.length === 0) return null;
  return Math.round(
    (recent.filter((attempt) => attempt.correct).length / recent.length) * 100,
  );
}

export function daysUntil(dateString: string | null) {
  if (!dateString) return null;
  const target = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function nextFocus(profile: LearnerProfile) {
  const priorities = topicPriorities(profile);
  return priorities[0];
}

export function recommendedFocus(profile: LearnerProfile) {
  const priorities = topicPriorities(profile);
  const gating = priorities.find((entry) =>
    (entry.topic.prerequisites ?? []).some(
      (id) => (profile.mastery[id] ?? BASE_MASTERY) < PREREQ_GATE,
    ),
  );
  if (gating) {
    const prereqId = (gating.topic.prerequisites ?? []).find(
      (id) => (profile.mastery[id] ?? BASE_MASTERY) < PREREQ_GATE,
    );
    const prereq = priorities.find((entry) => entry.topic.id === prereqId);
    if (prereq) {
      return {
        ...prereq,
        reason: `${prereq.topic.name} gates ${gating.topic.name} in the concept graph.`,
      };
    }
  }
  return {
    ...priorities[0],
    reason: "The lowest-mastery topic in the current set.",
  };
}

export function nextUnlock(profile: LearnerProfile) {
  const priorities = topicPriorities(profile);
  const near = priorities
    .filter((entry) => entry.mastery >= 55 && entry.mastery < 70)
    .sort((a, b) => b.mastery - a.mastery);
  return near[0] ?? null;
}

export function topicKcBreakdown(profile: LearnerProfile, topicId: string) {
  const ids = new Set<string>();
  for (const question of QUESTIONS) {
    if (question.topicId !== topicId) continue;
    for (const kc of questionKcs(question)) ids.add(kc);
  }
  return [...ids].map((kc) => ({
    kc,
    label: kcLabel(kc),
    mastery: profile.kcMastery[kc] ?? BASE_MASTERY,
    attempts: profile.attempts.filter((attempt) =>
      (attempt.kcs ?? [attempt.topicId]).includes(kc),
    ).length,
  }));
}

function isoDaysAgo(days: number, hour = 18) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

function isoDaysFromNow(days: number, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function dateInputFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDayKey(date);
}

function demoReview(
  topicId: string,
  dueInDays: number,
  intervalDays: number,
  ease: number,
  reps: number,
  lapses: number,
  lastReviewedDaysAgo: number,
): ReviewState {
  return {
    topicId,
    dueAt: isoDaysFromNow(dueInDays),
    intervalDays,
    ease,
    reps,
    lapses,
    lastReviewedAt: isoDaysAgo(lastReviewedDaysAgo),
  };
}

export function seedDemoProfile(name = "Aarav Mehta"): LearnerProfile {
  const profile = createProfile("c10-physics", name);
  profile.createdAt = isoDaysAgo(14);
  profile.examDate = dateInputFromNow(38);
  profile.mastery = {
    light: 68,
    electricity: 47,
    "human-eye": 71,
    "magnetic-effects": 33,
    "energy-sources": 56,
  };
  profile.kcMastery = {
    "law-of-reflection": 78,
    "plane-mirror-images": 72,
    "spherical-ray-diagrams": 54,
    "mirror-formula": 61,
    refraction: 57,
    "lens-formula": 42,
    "current-charge": 74,
    "ohms-law": 66,
    "series-parallel": 45,
    "electrical-power": 38,
    accommodation: 80,
    "vision-defects": 75,
    "eye-structure": 63,
    dispersion: 58,
    scattering: 51,
    "magnetic-field": 61,
    "solenoid-field": 44,
    "force-on-conductor": 31,
    "electric-motor": 45,
    "electromagnetic-induction": 22,
    "ac-dc-generator": 30,
    "renewable-sources": 82,
    "solar-energy": 74,
    biogas: 55,
    "wind-energy": 63,
    efficiency: 40,
    "energy-sources": 49,
  };

  const outcomes: [string, boolean, number, number][] = [
    ["c10-light-02", true, 0, 19],
    ["c10-elec-04", false, 0, 18],
    ["c10-eye-06", false, 0, 18],
    ["c10-mag-03", false, 1, 20],
    ["c10-energy-05", false, 1, 19],
    ["c10-light-04", true, 1, 18],
    ["c10-elec-02", true, 2, 18],
    ["c10-eye-01", true, 2, 17],
    ["c10-mag-01", true, 2, 17],
    ["c10-light-01", true, 3, 20],
    ["c10-elec-01", true, 3, 19],
    ["c10-eye-03", true, 3, 19],
    ["c10-energy-01", true, 4, 18],
    ["c10-mag-05", false, 5, 18],
    ["c10-energy-03", true, 5, 18],
    ["c10-light-03", false, 6, 18],
  ];
  profile.attempts = outcomes.flatMap(([questionId, correct, daysAgo, hour]) => {
    const question = QUESTION_BY_ID[questionId];
    if (!question) return [];
    return [
      {
        questionId,
        topicId: question.topicId,
        kcs: questionKcs(question),
        correct,
        hintUsed: false,
        difficulty: question.difficulty,
        at: isoDaysAgo(daysAgo, hour),
      },
    ];
  });

  profile.sessions = [
    {
      id: "demo-session-1",
      trackId: "c10-physics",
      startedAt: isoDaysAgo(3, 17),
      endedAt: isoDaysAgo(3, 19),
      answered: 8,
      correct: 6,
      deltas: { light: 6, electricity: 2, "human-eye": 4 },
    },
    {
      id: "demo-session-2",
      trackId: "c10-physics",
      startedAt: isoDaysAgo(2, 16),
      endedAt: isoDaysAgo(2, 18),
      answered: 8,
      correct: 5,
      deltas: { electricity: -3, "magnetic-effects": 2 },
    },
    {
      id: "demo-session-3",
      trackId: "c10-physics",
      startedAt: isoDaysAgo(1, 18),
      endedAt: isoDaysAgo(1, 19),
      answered: 6,
      correct: 3,
      deltas: { "magnetic-effects": -4, "energy-sources": -2 },
    },
  ];

  profile.reviews = {
    light: demoReview("light", 2, 4, 2.5, 3, 1, 2),
    electricity: demoReview("electricity", -1, 1, 2.1, 2, 1, 2),
    "human-eye": demoReview("human-eye", 0, 3, 2.45, 2, 0, 3),
    "magnetic-effects": demoReview("magnetic-effects", -2, 1, 1.85, 1, 2, 3),
    "energy-sources": demoReview("energy-sources", 3, 5, 2.35, 2, 1, 2),
  };

  return profile;
}

export function topicName(topicId: string) {
  return TOPIC_BY_ID[topicId]?.name ?? "Unknown topic";
}
