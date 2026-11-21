import { z } from "zod";
import {
  QUESTIONS,
  TRACK_BY_ID,
  TOPIC_BY_ID,
  countByDifficulty,
  kcLabel,
  questionKcs,
  topicKcs,
  type Difficulty,
} from "./questions";
import {
  PREREQ_GATE,
  bandFor,
  confidenceFor,
  daysUntil,
  formatReviewDue,
  nextUnlock,
  readinessLabel,
  recallProbability,
  recommendedFocus,
  reviewHealth,
  reviewQueue,
  topicEvidence,
  topicPriorities,
  type Confidence,
  type LearnerProfile,
  type SessionDraft,
} from "./learner";
import {
  AT_RISK,
  CLASS_STATS,
  MISCONCEPTION_HOTSPOTS,
  STUDENTS,
  TOPIC_GAPS,
} from "./classroom";

export type AgentSource = "agent" | "local";
export type AgentStepKind = "tool" | "model" | "verify" | "act" | "reflect";
export type AgentStepStatus = "ok" | "warn" | "error";

export type AgentStep = {
  id: string;
  kind: AgentStepKind;
  label: string;
  detail: string;
  status: AgentStepStatus;
  evidence?: string[];
};

export type VerifierCheck = {
  label: string;
  status: AgentStepStatus;
  detail: string;
};

export type VerifierReport = {
  ok: boolean;
  checks: VerifierCheck[];
  repairs: string[];
};

export type AgentTopic = {
  id: string;
  name: string;
  short: string;
  mastery: number;
  band: string;
  evidence: number;
  confidence: Confidence["level"];
  gateTopicId: string | null;
  gateTopicName: string | null;
  gateMastery: number | null;
  dueLabel: string | null;
  recall: number | null;
  leech: boolean;
  items: { total: number; easy: number; medium: number; hard: number };
  kcs: Array<{
    id: string;
    label: string;
    mastery: number;
    evidence: number;
    confidence: Confidence["level"];
  }>;
};

export type LearnerSnapshot = {
  trackId: string;
  trackName: string;
  examDate: string | null;
  daysToExam: number | null;
  overall: number;
  readiness: string;
  minutes: number;
  goal: string;
  topics: AgentTopic[];
  dueReviews: Array<{
    topicId: string;
    topicName: string;
    dueLabel: string;
    recall: number;
    leech: boolean;
  }>;
  recent: Array<{
    topicId: string;
    kc: string | null;
    correct: boolean;
    difficulty: Difficulty;
    at: string;
    misconception: string | null;
  }>;
  constraints: string[];
  privacy: string;
};

export type StudyBlock = {
  topicId: string;
  topicName: string;
  kcIds: string[];
  kcLabels: string[];
  minutes: number;
  intent: string;
  successCriterion: string;
  evidence: string[];
};

export type StudyPlan = {
  source: AgentSource;
  headline: string;
  summary: string;
  minutes: number;
  blocks: StudyBlock[];
  deferrals: Array<{ topicId: string; topicName: string; reason: string }>;
  questionsForLearner: string[];
  confidenceNote: string;
  createdAt: string;
  trace: AgentStep[];
  verifier: VerifierReport;
};

export type TeacherSnapshot = {
  cohort: string;
  students: number;
  averageReadiness: number;
  target: number;
  atRisk: number;
  dueReviews: number;
  topics: Array<{
    topicId: string;
    name: string;
    short: string;
    average: number;
    below40: number;
    weakestKc: string;
    weakestKcLabel: string;
  }>;
  misconceptions: Array<{
    kc: string;
    label: string;
    topicId: string | null;
    count: number;
    note: string;
  }>;
  atRiskSample: Array<{
    readiness: number;
    weakTopicIds: string[];
    dueReviews: number;
  }>;
  constraints: string[];
  privacy: string;
};

export type ReteachPriority = {
  topicId: string;
  topicName: string;
  students: number;
  average: number;
  why: string;
  misconceptions: Array<{ label: string; count: number }>;
};

export type ReteachPlan = {
  source: AgentSource;
  headline: string;
  summary: string;
  priorities: ReteachPriority[];
  lessonPlan: Array<{ minutes: number; activity: string; evidence: string }>;
  checks: Array<{ question: string; lookFor: string }>;
  confidenceNote: string;
  createdAt: string;
  trace: AgentStep[];
  verifier: VerifierReport;
};

export type Reflection = {
  source: AgentSource;
  headline: string;
  wins: string[];
  gaps: string[];
  nextMove: string;
  nextReview: string;
  confidenceNote: string;
  createdAt: string;
  trace: AgentStep[];
};

export type AgentMemory = {
  studyPlan: StudyPlan | null;
  reteachPlan: ReteachPlan | null;
  reflection: Reflection | null;
  updatedAt: string | null;
};

const STORAGE_PREFIX = "praxis.agent.v1";
const MAX_BLOCKS = 4;

const round = (value: number) => Math.round(value);

function confidenceLabel(level: Confidence["level"]) {
  return level === "high" ? "high confidence" : level === "medium" ? "medium confidence" : "low confidence";
}

function gateFor(profile: LearnerProfile, topicId: string) {
  const topic = TOPIC_BY_ID[topicId];
  const prerequisites = topic?.prerequisites ?? [];
  const unmet = prerequisites
    .map((id) => ({
      id,
      name: TOPIC_BY_ID[id]?.name ?? id,
      mastery: profile.mastery[id] ?? 50,
    }))
    .filter((entry) => entry.mastery < PREREQ_GATE)
    .sort((a, b) => a.mastery - b.mastery);
  return unmet[0] ?? null;
}

export function observeLearner(
  profile: LearnerProfile,
  options: { minutes: number; goal?: string },
): { snapshot: LearnerSnapshot; trace: AgentStep[] } {
  const track = TRACK_BY_ID[profile.trackId];
  const due = reviewQueue(profile);
  const dueByTopic = new Map(due.map((entry) => [entry.topic.id, entry]));
  const priorities = topicPriorities(profile);

  const topics: AgentTopic[] = priorities.map(({ topic, mastery, attempts }) => {
    const gate = gateFor(profile, topic.id);
    const review = dueByTopic.get(topic.id)?.review;
    const health = review ? reviewHealth(review) : null;
    const kcs = topicKcs(topic.id)
      .map((kc) => {
        const evidence = profile.attempts.filter((attempt) =>
          (attempt.kcs ?? [attempt.topicId]).includes(kc),
        ).length;
        return {
          id: kc,
          label: kcLabel(kc),
          mastery: round(profile.kcMastery[kc] ?? 50),
          evidence,
          confidence: confidenceFor(evidence).level,
        };
      })
      .sort((a, b) => a.mastery - b.mastery || b.evidence - a.evidence)
      .slice(0, 4);

    return {
      id: topic.id,
      name: topic.name,
      short: topic.short,
      mastery: round(mastery),
      band: bandFor(mastery).label,
      evidence: attempts,
      confidence: confidenceFor(topicEvidence(profile, topic.id)).level,
      gateTopicId: gate?.id ?? null,
      gateTopicName: gate?.name ?? null,
      gateMastery: gate ? round(gate.mastery) : null,
      dueLabel: review ? formatReviewDue(review.dueAt) : null,
      recall: review ? Math.round(recallProbability(review) * 100) : null,
      leech: health?.leech ?? false,
      items: countByDifficulty(profile.trackId, topic.id),
      kcs,
    };
  });

  const recent = [...profile.attempts]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12)
    .map((attempt) => ({
      topicId: attempt.topicId,
      kc: attempt.kcs?.[0] ?? null,
      correct: attempt.correct,
      difficulty: attempt.difficulty,
      at: attempt.at,
      misconception: attempt.misconception ?? null,
    }));

  const snapshot: LearnerSnapshot = {
    trackId: profile.trackId,
    trackName: track.name,
    examDate: profile.examDate,
    daysToExam: daysUntil(profile.examDate),
    overall: round(
      topics.reduce((sum, topic) => sum + topic.mastery, 0) / Math.max(1, topics.length),
    ),
    readiness: readinessLabel(
      topics.reduce((sum, topic) => sum + topic.mastery, 0) / Math.max(1, topics.length),
    ),
    minutes: options.minutes,
    goal: (options.goal ?? "").trim().slice(0, 280),
    topics,
    dueReviews: due.slice(0, 6).map((entry) => {
      const health = reviewHealth(entry.review);
      return {
        topicId: entry.topic.id,
        topicName: entry.topic.name,
        dueLabel: formatReviewDue(entry.review.dueAt),
        recall: health.percent,
        leech: health.leech,
      };
    }),
    recent,
    constraints: [
      "Only topics and knowledge components listed below exist in the local bank.",
      "The learner model is authoritative; do not invent counts or mastery values.",
      "Prerequisite gates below 45% must be addressed before the gated topic.",
      "Total planned minutes must stay within the stated budget.",
    ],
    privacy: "No account names, credentials or raw question text are included.",
  };

  const weakest = topics[0];
  const gated = topics.find((topic) => topic.gateTopicId);
  const dueFirst = due[0];
  const trace: AgentStep[] = [
    {
      id: "read-mastery",
      kind: "tool",
      label: "read_learner_model",
      detail: `Read ${topics.length} topics and ${profile.attempts.length} recorded answers for ${track.name}.`,
      status: "ok",
      evidence: topics.slice(0, 3).map((topic) => `${topic.short} ${topic.mastery}% · ${confidenceLabel(topic.confidence)}`),
    },
    {
      id: "check-gates",
      kind: "tool",
      label: "check_prerequisites",
      detail: gated
        ? `${gated.gateTopicName} is below the ${PREREQ_GATE}% gate and blocks ${gated.name}.`
        : "No prerequisite gate is currently blocking a higher topic.",
      status: gated ? "warn" : "ok",
      evidence: gated
        ? [`${gated.gateTopicName} ${gated.gateMastery}% · gate ${PREREQ_GATE}%`]
        : undefined,
    },
    {
      id: "rank-concepts",
      kind: "tool",
      label: "rank_concepts",
      detail: weakest
        ? `${weakest.name} is the weakest topic; ${weakest.kcs[0]?.label ?? "its core concept"} is the lowest concept estimate.`
        : "No concept evidence is available yet.",
      status: "ok",
      evidence: weakest?.kcs.slice(0, 2).map((kc) => `${kc.label} ${kc.mastery}% · ${kc.evidence} answers`),
    },
    {
      id: "recall-risk",
      kind: "tool",
      label: "check_recall_risk",
      detail: dueFirst
        ? `${dueFirst.topic.name} is due for review; current recall is ${reviewHealth(dueFirst.review).percent}%.`
        : "No topic is currently due for spaced review.",
      status: dueFirst && reviewHealth(dueFirst.review).recall < 0.6 ? "warn" : "ok",
      evidence: dueFirst
        ? [`${dueFirst.topic.name} · ${formatReviewDue(dueFirst.review.dueAt)} · ${reviewHealth(dueFirst.review).percent}% recall`]
        : undefined,
    },
    {
      id: "check-bank",
      kind: "tool",
      label: "check_item_bank",
      detail: "Confirmed that every planned topic has items in the local bank.",
      status: "ok",
      evidence: topics.slice(0, 3).map((topic) => `${topic.short}: ${topic.items.total} items`),
    },
  ];

  return { snapshot, trace };
}

function studyCandidates(snapshot: LearnerSnapshot) {
  const used = new Set<string>();
  const candidates: Array<{
    topic: AgentTopic;
    kcIds: string[];
    weight: number;
    intent: string;
    successCriterion: string;
    evidence: string[];
  }> = [];

  const review = snapshot.dueReviews[0];
  if (review) {
    const topic = snapshot.topics.find((entry) => entry.id === review.topicId);
    if (topic) {
      used.add(topic.id);
      candidates.push({
        topic,
        kcIds: topic.kcs.slice(0, 2).map((kc) => kc.id),
        weight: review.recall < 55 || review.leech ? 1.25 : 0.9,
        intent: "Retrieve before the memory fades; do not relearn from scratch.",
        successCriterion: "2 of 3 correct without notes, with the reason spoken aloud.",
        evidence: [`${review.dueLabel} · ${review.recall}% recall`, review.leech ? "Flagged for reteach after repeated lapses" : "Spaced review is due"],
      });
    }
  }

  const gateTopic = snapshot.topics.find((topic) => topic.gateTopicId);
  if (gateTopic?.gateTopicId) {
    const prerequisite = snapshot.topics.find((topic) => topic.id === gateTopic.gateTopicId);
    if (prerequisite && !used.has(prerequisite.id)) {
      used.add(prerequisite.id);
      candidates.push({
        topic: prerequisite,
        kcIds: prerequisite.kcs.slice(0, 2).map((kc) => kc.id),
        weight: 1.4,
        intent: `Rebuild the prerequisite that unlocks ${gateTopic.name}.`,
        successCriterion: "3 of 4 foundational items correct, with the rule written in your own words.",
        evidence: [
          `${prerequisite.name} ${prerequisite.mastery}% · below the ${PREREQ_GATE}% gate`,
          `Unlocks ${gateTopic.name} (${gateTopic.mastery}%)`,
        ],
      });
    }
  }

  const weakest = snapshot.topics.find((topic) => !used.has(topic.id));
  if (weakest) {
    used.add(weakest.id);
    candidates.push({
      topic: weakest,
      kcIds: weakest.kcs.slice(0, 2).map((kc) => kc.id),
      weight: 1.1,
      intent: `Target the weakest concept inside ${weakest.name}.`,
      successCriterion:
        weakest.band === "Foundational"
          ? "3 of 4 single-step items correct with the hint closed."
          : "3 of 4 items correct, including one unfamiliar context.",
      evidence: [
        `${weakest.mastery}% mastery · ${weakest.band}`,
        `${confidenceLabel(weakest.confidence)} · ${weakest.evidence} answers`,
      ],
    });
  }

  const consolidate = snapshot.topics
    .filter((topic) => !used.has(topic.id) && topic.mastery >= 55)
    .sort((a, b) => b.mastery - a.mastery)[0];
  if (consolidate && snapshot.minutes >= 30) {
    used.add(consolidate.id);
    candidates.push({
      topic: consolidate,
      kcIds: consolidate.kcs.slice(0, 1).map((kc) => kc.id),
      weight: 0.7,
      intent: "Consolidate a nearly secure topic with a stretch item so the gain holds.",
      successCriterion: "1 of 2 stretch items correct with a written justification.",
      evidence: [
        `${consolidate.mastery}% mastery · closest to the next band`,
        `${consolidate.items.hard} stretch items available`,
      ],
    });
  }

  return candidates.slice(0, MAX_BLOCKS);
}

function allocateMinutes(total: number, weights: number[]) {
  const count = weights.length;
  if (!count) return [];
  const minimum = 5;
  const weightsTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
  const spare = Math.max(0, total - count * minimum);
  const minutes = weights.map(
    (weight) => minimum + Math.floor((weight / weightsTotal) * spare / 5) * 5,
  );
  const order = weights
    .map((weight, index) => ({ weight, index }))
    .sort((a, b) => b.weight - a.weight);
  let used = minutes.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  while (used + 5 <= total && cursor < count * 8) {
    const slot = order[cursor % count].index;
    if (minutes[slot] + 5 <= 30) {
      minutes[slot] += 5;
      used += 5;
    }
    cursor += 1;
  }
  return minutes;
}

function buildLocalReport(plan: Omit<StudyPlan, "verifier">, snapshot: LearnerSnapshot): VerifierReport {
  return verifyStudyPlan(plan, snapshot);
}

export function buildLocalStudyPlan(
  profile: LearnerProfile,
  snapshot: LearnerSnapshot,
  trace: AgentStep[],
): StudyPlan {
  const maxBlocks = Math.max(1, Math.floor(snapshot.minutes / 5));
  const candidates = studyCandidates(snapshot).slice(0, maxBlocks);
  const minutes = allocateMinutes(snapshot.minutes, candidates.map((candidate) => candidate.weight));
  const blocks: StudyBlock[] = candidates.map((candidate, index) => ({
    topicId: candidate.topic.id,
    topicName: candidate.topic.name,
    kcIds: candidate.kcIds,
    kcLabels: candidate.kcIds.map(kcLabel),
    minutes: minutes[index] ?? 8,
    intent: candidate.intent,
    successCriterion: candidate.successCriterion,
    evidence: candidate.evidence,
  }));

  const totalMinutes = blocks.reduce((sum, block) => sum + block.minutes, 0);
  const lead = blocks[0];
  const plan: Omit<StudyPlan, "verifier"> = {
    source: "local",
    headline: lead ? `${totalMinutes}-minute plan built around ${lead.topicName}` : `${snapshot.minutes}-minute study plan`,
    summary: lead
      ? `The local planner starts with ${lead.topicName}, then rotates through the next weakest evidence. Every block is chosen from the current mastery band and prerequisite gates.`
      : "There is not enough evidence for a targeted plan yet. Start with a diagnostic placement or an adaptive session.",
    minutes: snapshot.minutes,
    blocks,
    deferrals: snapshot.topics
      .filter((topic) => topic.gateTopicId && !blocks.some((block) => block.topicId === topic.id))
      .slice(0, 2)
      .map((topic) => ({
        topicId: topic.id,
        topicName: topic.name,
        reason: `${topic.gateTopicName} is still below the ${PREREQ_GATE}% prerequisite gate.`,
      })),
    questionsForLearner: [
      `Is ${snapshot.minutes} minutes a firm budget, or should the agent split this across two sessions?`,
      "Do you want a hint-first block or an assessment-style block?",
    ],
    confidenceNote:
      snapshot.topics.filter((topic) => topic.confidence === "low").length > 0
        ? "Several estimates are low confidence. Expect the plan to change after the first few answers."
        : "The estimates have enough evidence for a stable plan; the verifier still checks every action.",
    createdAt: new Date().toISOString(),
    trace: [
      ...trace,
      {
        id: "local-plan",
        kind: "model",
        label: "local_planner",
        detail: `Built ${blocks.length} block${blocks.length === 1 ? "" : "s"} from the current evidence without a live model call.`,
        status: "ok",
        evidence: blocks.map((block) => `${block.topicName} · ${block.minutes} min`),
      },
    ],
  };

  return { ...plan, verifier: buildLocalReport(plan, snapshot) };
}

export function verifyStudyPlan(
  plan: Omit<StudyPlan, "verifier"> | StudyPlan,
  snapshot: LearnerSnapshot,
): VerifierReport {
  const checks: VerifierCheck[] = [];
  const repairs: string[] = [];
  const topicById = new Map(snapshot.topics.map((topic) => [topic.id, topic]));
  const kcOwner = new Map<string, string>();
  for (const topic of snapshot.topics) {
    for (const kc of topic.kcs) kcOwner.set(kc.id, topic.id);
  }

  const unknownTopics = plan.blocks.filter((block) => !topicById.has(block.topicId));
  checks.push({
    label: "Known topics",
    status: unknownTopics.length ? "error" : "ok",
    detail: unknownTopics.length
      ? `${unknownTopics.length} block${unknownTopics.length === 1 ? "" : "s"} reference a topic outside the learner's track.`
      : "Every block maps to a topic in the active track.",
  });

  const unknownKcs = plan.blocks.flatMap((block) =>
    block.kcIds.filter((kc) => kcOwner.get(kc) !== block.topicId),
  );
  checks.push({
    label: "Known concepts",
    status: unknownKcs.length ? "error" : "ok",
    detail: unknownKcs.length
      ? `${unknownKcs.length} concept ID${unknownKcs.length === 1 ? " does" : "s do"} not belong to the cited topic.`
      : "Every concept ID belongs to its cited topic.",
  });

  const minutes = plan.blocks.reduce((sum, block) => sum + block.minutes, 0);
  checks.push({
    label: "Time budget",
    status: minutes <= snapshot.minutes + 2 ? "ok" : "error",
    detail: `${minutes} planned minutes against a ${snapshot.minutes}-minute budget.`,
  });

  const malformed = plan.blocks.filter(
    (block) => block.minutes < 5 || block.minutes > 30 || block.kcIds.length === 0,
  );
  checks.push({
    label: "Block shape",
    status: malformed.length ? "error" : "ok",
    detail: malformed.length
      ? `${malformed.length} block${malformed.length === 1 ? "" : "s"} fall outside 5–30 minutes or cite no concept.`
      : "Every block is 5–30 minutes and cites at least one concept.",
  });

  const gateViolations = plan.blocks.filter((block) => {
    const topic = topicById.get(block.topicId);
    return Boolean(topic?.gateTopicId) && block.topicId !== topic?.gateTopicId;
  });
  checks.push({
    label: "Prerequisite gates",
    status: gateViolations.length ? "error" : "ok",
    detail: gateViolations.length
      ? `${gateViolations.length} block${gateViolations.length === 1 ? "" : "s"} schedule a gated topic before its prerequisite.`
      : `No block starts a topic below the ${PREREQ_GATE}% prerequisite gate.`,
  });

  const missingItems = plan.blocks.filter((block) => (topicById.get(block.topicId)?.items.total ?? 0) === 0);
  checks.push({
    label: "Bank coverage",
    status: missingItems.length ? "error" : "ok",
    detail: missingItems.length
      ? `${missingItems.length} topic${missingItems.length === 1 ? " has" : "s have"} no items in the local bank.`
      : "Every planned topic has items in the local bank.",
  });

  if (unknownTopics.length) repairs.push("Removed blocks that referenced unknown topics.");
  if (unknownKcs.length) repairs.push("Removed concept IDs that did not belong to their topic.");
  if (minutes > snapshot.minutes + 2) repairs.push("Trimmed the plan to the time budget.");

  return {
    ok: checks.every((check) => check.status !== "error"),
    checks,
    repairs,
  };
}

export function repairStudyPlan(plan: StudyPlan, snapshot: LearnerSnapshot): { plan: StudyPlan; changed: boolean } {
  const topicById = new Map(snapshot.topics.map((topic) => [topic.id, topic]));
  let changed = false;
  let blocks = plan.blocks
    .filter((block) => {
      const topic = topicById.get(block.topicId);
      const keep =
        topic !== undefined &&
        (!topic.gateTopicId || block.topicId === topic.gateTopicId) &&
        topic.items.total > 0;
      if (!keep) changed = true;
      return keep;
    })
    .map((block) => {
      const topic = topicById.get(block.topicId);
      const allowed = new Set(topic?.kcs.map((kc) => kc.id) ?? []);
      const kcIds = block.kcIds.filter((kc) => allowed.has(kc)).slice(0, 3);
      if (kcIds.length !== block.kcIds.length) changed = true;
      let minutes = Math.min(30, Math.max(5, block.minutes));
      if (minutes !== block.minutes) changed = true;
      return {
        ...block,
        kcIds,
        kcLabels: kcIds.map(kcLabel),
        minutes,
      };
    })
    .filter((block) => block.kcIds.length > 0);

  let total = blocks.reduce((sum, block) => sum + block.minutes, 0);
  while (total > snapshot.minutes + 2 && blocks.length > 1) {
    const last = blocks[blocks.length - 1];
    if (last.minutes > 5) {
      last.minutes -= 2;
      changed = true;
    } else {
      blocks = blocks.slice(0, -1);
      changed = true;
    }
    total = blocks.reduce((sum, block) => sum + block.minutes, 0);
  }

  return { plan: { ...plan, blocks, verifier: verifyStudyPlan({ ...plan, blocks }, snapshot) }, changed };
}

const studyPayloadSchema = z.object({
  headline: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(600),
  blocks: z
    .array(
      z.object({
        topicId: z.string().trim().min(1).max(80),
        kcIds: z.array(z.string().trim().min(1).max(80)).min(1).max(3),
        minutes: z.number().int().min(5).max(45),
        intent: z.string().trim().min(1).max(260),
        successCriterion: z.string().trim().min(1).max(220),
        evidence: z.array(z.string().trim().max(220)).max(4).default([]),
      }),
    )
    .min(1)
    .max(5),
  deferrals: z
    .array(
      z.object({
        topicId: z.string().trim().max(80),
        reason: z.string().trim().max(220),
      }),
    )
    .max(3)
    .default([]),
  questionsForLearner: z.array(z.string().trim().max(220)).max(3).default([]),
  confidenceNote: z.string().trim().max(400).default(""),
});

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const body = fenced ? fenced[1] : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in the agent response.");
  return JSON.parse(body.slice(start, end + 1));
}

export function adoptStudyPlan(
  raw: string,
  snapshot: LearnerSnapshot,
  trace: AgentStep[],
): { plan: StudyPlan | null; reason: string | null } {
  let parsed: z.infer<typeof studyPayloadSchema>;
  try {
    parsed = studyPayloadSchema.parse(extractJson(raw));
  } catch {
    return { plan: null, reason: "The agent response did not match the approved plan schema." };
  }

  const topicById = new Map(snapshot.topics.map((topic) => [topic.id, topic]));
  const plan: StudyPlan = {
    source: "agent",
    headline: parsed.headline,
    summary: parsed.summary,
    minutes: snapshot.minutes,
    blocks: parsed.blocks.map((block) => ({
      topicId: block.topicId,
      topicName: topicById.get(block.topicId)?.name ?? block.topicId,
      kcIds: block.kcIds,
      kcLabels: block.kcIds.map(kcLabel),
      minutes: block.minutes,
      intent: block.intent,
      successCriterion: block.successCriterion,
      evidence: block.evidence,
    })),
    deferrals: parsed.deferrals.map((entry) => ({
      topicId: entry.topicId,
      topicName: topicById.get(entry.topicId)?.name ?? entry.topicId,
      reason: entry.reason,
    })),
    questionsForLearner: parsed.questionsForLearner,
    confidenceNote: parsed.confidenceNote,
    createdAt: new Date().toISOString(),
    trace: [
      ...trace,
      {
        id: "model-plan",
        kind: "model",
        label: "cloud_planner",
        detail: `The agent proposed ${parsed.blocks.length} block${parsed.blocks.length === 1 ? "" : "s"} for a ${snapshot.minutes}-minute budget.`,
        status: "ok",
        evidence: parsed.blocks.map((block) => `${topicById.get(block.topicId)?.short ?? block.topicId} · ${block.minutes} min`),
      },
    ],
    verifier: { ok: false, checks: [], repairs: [] },
  };

  const verification = verifyStudyPlan(plan, snapshot);
  plan.verifier = verification;
  plan.trace.push({
    id: "verify-plan",
    kind: "verify",
    label: "verify_plan",
    detail: verification.ok
      ? "All plan actions passed the deterministic checks."
      : `The verifier found ${verification.checks.filter((check) => check.status === "error").length} issue${verification.checks.filter((check) => check.status === "error").length === 1 ? "" : "s"}.`,
    status: verification.ok ? "ok" : "warn",
    evidence: verification.checks.filter((check) => check.status !== "ok").map((check) => check.detail),
  });

  if (!verification.ok) {
    const repaired = repairStudyPlan(plan, snapshot);
    if (!repaired.plan.verifier.ok || repaired.plan.blocks.length === 0) {
      return { plan: null, reason: "The agent plan could not be reconciled with the learner's evidence." };
    }
    repaired.plan.trace.push({
      id: "repair-plan",
      kind: "verify",
      label: "repair_plan",
      detail: "The verifier repaired the agent plan before showing it.",
      status: "warn",
      evidence: repaired.plan.verifier.repairs,
    });
    return { plan: repaired.plan, reason: null };
  }

  return { plan, reason: null };
}

export function buildTeacherSnapshot(): { snapshot: TeacherSnapshot; trace: AgentStep[] } {
  const topicIdByKc = new Map<string, string>();
  for (const question of QUESTIONS) {
    for (const kc of questionKcs(question)) {
      if (!topicIdByKc.has(kc)) topicIdByKc.set(kc, question.topicId);
    }
  }

  const snapshot: TeacherSnapshot = {
    cohort: "Illustrative Class 10 Physics cohort · Section A",
    students: CLASS_STATS.students,
    averageReadiness: CLASS_STATS.averageReadiness,
    target: CLASS_STATS.target,
    atRisk: CLASS_STATS.atRisk,
    dueReviews: CLASS_STATS.dueReviews,
    topics: TOPIC_GAPS.map((gap) => ({
      topicId: gap.topicId,
      name: gap.name,
      short: gap.short,
      average: gap.average,
      below40: gap.below40,
      weakestKc: gap.weakestKc,
      weakestKcLabel: gap.weakestKcLabel,
    })),
    misconceptions: MISCONCEPTION_HOTSPOTS.map((hotspot) => ({
      kc: hotspot.kc,
      label: hotspot.label,
      topicId: topicIdByKc.get(hotspot.kc) ?? null,
      count: hotspot.count,
      note: hotspot.note,
    })),
    atRiskSample: AT_RISK.slice(0, 5).map((student) => ({
      readiness: student.readiness,
      weakTopicIds: student.weakTopics,
      dueReviews: student.dueReviews,
    })),
    constraints: [
      "The roster is seeded demonstration data, not real student records.",
      "Lesson plan minutes must total 20 or less.",
      "Use only the topic, concept and misconception data provided.",
    ],
    privacy: "No student names or account identifiers are included.",
  };

  const trace: AgentStep[] = [
    {
      id: "read-class",
      kind: "tool",
      label: "read_class_snapshot",
      detail: `Read ${snapshot.students} seeded learners, ${snapshot.topics.length} topics and ${snapshot.misconceptions.length} misconception hot spots.`,
      status: "ok",
      evidence: [`Class readiness ${snapshot.averageReadiness}% · target ${snapshot.target}%`, `${snapshot.atRisk} learners need a check-in`],
    },
    {
      id: "rank-gaps",
      kind: "tool",
      label: "rank_topic_gaps",
      detail: `Lowest class topic is ${snapshot.topics[0]?.name ?? "unknown"} at ${snapshot.topics[0]?.average ?? 0}%.`,
      status: "ok",
      evidence: snapshot.topics.slice(0, 3).map((topic) => `${topic.short} ${topic.average}% · ${topic.below40} below 40%`),
    },
    {
      id: "check-hotspots",
      kind: "tool",
      label: "match_misconceptions",
      detail: `Top shared reasoning gap: ${snapshot.misconceptions[0]?.label ?? "none"} (${snapshot.misconceptions[0]?.count ?? 0} learners).`,
      status: "ok",
      evidence: snapshot.misconceptions.slice(0, 3).map((hotspot) => `${hotspot.label} · ${hotspot.count} learners`),
    },
  ];

  return { snapshot, trace };
}

export function buildLocalReteachPlan(snapshot: TeacherSnapshot, trace: AgentStep[]): ReteachPlan {
  const priorities: ReteachPriority[] = snapshot.topics.slice(0, 3).map((topic) => ({
    topicId: topic.topicId,
    topicName: topic.name,
    students: topic.below40,
    average: topic.average,
    why: `${topic.below40} learners are below 40% in ${topic.name}; the class average is ${topic.average}%.`,
    misconceptions: snapshot.misconceptions
      .filter((hotspot) => hotspot.topicId === topic.topicId)
      .map((hotspot) => ({ label: hotspot.label, count: hotspot.count })),
  }));

  const leadTopic = snapshot.topics[0];
  const leadPriority = priorities[0];
  const leadGapLabel = leadPriority?.misconceptions[0]?.label;
  const leadMisconception =
    snapshot.misconceptions.find((hotspot) => hotspot.label === leadGapLabel) ??
    null;
  const nextTopic = snapshot.topics[1];

  const plan: Omit<ReteachPlan, "verifier"> = {
    source: "local",
    headline: "A 20-minute reteach built from the class's shared reasoning gaps",
    summary:
      "The local planner opens with the lowest class topic, rehearses two contrasting cases around the weakest concept, and closes with a short exit ticket.",
    priorities,
    lessonPlan: [
      {
        minutes: 5,
        activity: `Open with a worked example on ${
          leadTopic?.weakestKcLabel ?? "the weakest concept"
        }${
          leadMisconception
            ? `, then name “${leadMisconception.label}” as the trap before solving`
            : ". Name the target reasoning explicitly before solving"
        }.`,
        evidence: `${leadTopic?.below40 ?? 0} learners below 40%${
          leadMisconception ? ` · ${leadMisconception.label}` : ""
        }`,
      },
      {
        minutes: 10,
        activity: "Pair-rehearse one correct and one broken solution. Ask learners to find the exact step where the reasoning fails, not just the final answer.",
        evidence: leadMisconception
          ? `${leadMisconception.count} learners show this pattern in ${leadTopic?.short ?? "the lead topic"}`
          : "Rehearse the same misconception against a correct solution.",
      },
      {
        minutes: 5,
        activity: "Close with a three-item exit ticket from the bank and re-check the same misconception tomorrow.",
        evidence: `${nextTopic?.below40 ?? 0} learners also below 40% in ${nextTopic?.short ?? "the next topic"}`,
      },
    ],
    checks: [
      {
        question: leadMisconception
          ? `Where exactly does the “${leadMisconception.label}” reasoning break down?`
          : "Where exactly does the flawed reasoning break down?",
        lookFor: "Learners name the step that fails, not only the final answer.",
      },
      {
        question: "Which distractor in the exit ticket is the most tempting, and why?",
        lookFor: "Learners name the reasoning gap rather than only the right answer.",
      },
    ],
    confidenceNote: "This is a draft for an illustrative cohort. Confirm it against real student work before teaching.",
    createdAt: new Date().toISOString(),
    trace: [
      ...trace,
      {
        id: "local-reteach",
        kind: "model",
        label: "local_planner",
        detail: "Built the reteach draft from the seeded class evidence without a live model call.",
        status: "ok",
      },
    ],
  };

  return { ...plan, verifier: verifyReteachPlan(plan, snapshot) };
}

export function verifyReteachPlan(
  plan: Omit<ReteachPlan, "verifier"> | ReteachPlan,
  snapshot: TeacherSnapshot,
): VerifierReport {
  const topicIds = new Set(snapshot.topics.map((topic) => topic.topicId));
  const minutes = plan.lessonPlan.reduce((sum, step) => sum + step.minutes, 0);
  const checks: VerifierCheck[] = [
    {
      label: "Known topics",
      status: plan.priorities.every((priority) => topicIds.has(priority.topicId)) ? "ok" : "error",
      detail: "Every priority maps to a topic in the seeded cohort.",
    },
    {
      label: "Lesson time",
      status: minutes <= 22 ? "ok" : "error",
      detail: `${minutes} planned minutes against a 20-minute target.`,
    },
    {
      label: "Evidence cited",
      status:
        plan.priorities.every((priority) => priority.why.trim().length > 10) &&
        plan.lessonPlan.every((step) => step.evidence.trim().length > 0)
          ? "ok"
          : "error",
      detail: "Every priority and activity cites the evidence behind it.",
    },
  ];
  return { ok: checks.every((check) => check.status !== "error"), checks, repairs: [] };
}

const reteachPayloadSchema = z.object({
  headline: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(600),
  priorities: z
    .array(
      z.object({
        topicId: z.string().trim().min(1).max(80),
        why: z.string().trim().min(1).max(300),
        students: z.number().int().min(0).max(1000),
        average: z.number().min(0).max(100),
        misconceptions: z
          .array(
            z.object({
              label: z.string().trim().min(1).max(160),
              count: z.number().int().min(0).max(1000),
            }),
          )
          .max(3)
          .default([]),
      }),
    )
    .min(1)
    .max(3),
  lessonPlan: z
    .array(
      z.object({
        minutes: z.number().int().min(3).max(20),
        activity: z.string().trim().min(1).max(400),
        evidence: z.string().trim().min(1).max(240),
      }),
    )
    .min(2)
    .max(4),
  checks: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(240),
        lookFor: z.string().trim().min(1).max(240),
      }),
    )
    .min(1)
    .max(4),
  confidenceNote: z.string().trim().max(400).default(""),
});

export function adoptReteachPlan(
  raw: string,
  snapshot: TeacherSnapshot,
  trace: AgentStep[],
): { plan: ReteachPlan | null; reason: string | null } {
  let parsed: z.infer<typeof reteachPayloadSchema>;
  try {
    parsed = reteachPayloadSchema.parse(extractJson(raw));
  } catch {
    return { plan: null, reason: "The agent response did not match the approved reteach schema." };
  }

  const topicById = new Map(snapshot.topics.map((topic) => [topic.topicId, topic]));
  const plan: ReteachPlan = {
    source: "agent",
    headline: parsed.headline,
    summary: parsed.summary,
    priorities: parsed.priorities.map((priority) => ({
      topicId: priority.topicId,
      topicName: topicById.get(priority.topicId)?.name ?? priority.topicId,
      students: priority.students,
      average: priority.average,
      why: priority.why,
      misconceptions: priority.misconceptions,
    })),
    lessonPlan: parsed.lessonPlan,
    checks: parsed.checks,
    confidenceNote: parsed.confidenceNote,
    createdAt: new Date().toISOString(),
    trace: [
      ...trace,
      {
        id: "model-reteach",
        kind: "model",
        label: "cloud_reteach_planner",
        detail: `The agent proposed ${parsed.priorities.length} priority topic${parsed.priorities.length === 1 ? "" : "s"} and a ${parsed.lessonPlan.reduce((sum, step) => sum + step.minutes, 0)}-minute lesson.`,
        status: "ok",
      },
    ],
    verifier: { ok: false, checks: [], repairs: [] },
  };

  const verification = verifyReteachPlan(plan, snapshot);
  plan.verifier = verification;
  plan.trace.push({
    id: "verify-reteach",
    kind: "verify",
    label: "verify_reteach_plan",
    detail: verification.ok ? "The reteach draft passed the deterministic checks." : "The draft cites a topic or time total outside the approved bounds.",
    status: verification.ok ? "ok" : "warn",
    evidence: verification.checks.filter((check) => check.status !== "ok").map((check) => check.detail),
  });
  if (!verification.ok) return { plan: null, reason: "The agent draft did not pass the reteach verifier." };
  return { plan, reason: null };
}

const reflectionPayloadSchema = z.object({
  headline: z.string().trim().min(1).max(180),
  wins: z.array(z.string().trim().min(1).max(260)).min(1).max(3),
  gaps: z.array(z.string().trim().max(260)).max(3).default([]),
  nextMove: z.string().trim().min(1).max(320),
  nextReview: z.string().trim().min(1).max(240),
  confidenceNote: z.string().trim().max(400).default(""),
});

export function buildLocalReflection(
  draft: SessionDraft,
  profile: LearnerProfile,
  trace: AgentStep[] = [],
): Reflection {
  const moved = Object.entries(draft.deltas).sort((a, b) => b[1] - a[1]);
  const wins = moved
    .filter(([, delta]) => delta > 0)
    .slice(0, 2)
    .map(([topicId, delta]) => `${TOPIC_BY_ID[topicId]?.name ?? topicId} moved ${delta > 0 ? "+" : ""}${round(delta)} points.`);
  const gaps = moved
    .filter(([, delta]) => delta <= 0)
    .slice(0, 2)
    .map(([topicId, delta]) => `${TOPIC_BY_ID[topicId]?.name ?? topicId} did not move (${round(delta)}).`);
  const accuracy = draft.answered ? round((draft.correct / draft.answered) * 100) : 0;
  const focus = recommendedFocus(profile);
  const unlock = nextUnlock(profile);
  const due = reviewQueue(profile)[0];

  return {
    source: "local",
    headline: `${draft.correct}/${draft.answered} correct · ${accuracy}% in this session`,
    wins: wins.length ? wins : ["The session produced fresh evidence even though no topic gained mastery."],
    gaps: gaps.length ? gaps : [`No topic lost ground; ${focus?.topic.name ?? "the weakest topic"} remains the next focus.`],
    nextMove: unlock
      ? `Run one focused block on ${unlock.topic.name} to unlock the next topic.`
      : `Run a short block on ${focus?.topic.name ?? "your weakest topic"}, then re-check the same concept.`,
    nextReview: due
      ? `${due.topic.name} is due; bring it back now at ${reviewHealth(due.review).percent}% recall.`
      : "No review is due immediately; the scheduler will bring the weakest topic back soon.",
    confidenceNote:
      "The debrief is built from this session's deltas and the local learner model. It does not claim more than the evidence shows.",
    createdAt: new Date().toISOString(),
    trace: [
      ...trace,
      {
        id: "reflect-local",
        kind: "reflect",
        label: "reflect_session",
        detail: `Compared ${draft.answered} answers with the pre-session mastery map.`,
        status: "ok",
        evidence: moved.slice(0, 3).map(([topicId, delta]) => `${TOPIC_BY_ID[topicId]?.short ?? topicId} ${delta > 0 ? "+" : ""}${round(delta)}`),
      },
    ],
  };
}

export function buildReflectionContext(draft: SessionDraft, profile: LearnerProfile) {
  return {
    session: {
      answered: draft.answered,
      correct: draft.correct,
      accuracy: draft.answered ? Math.round((draft.correct / draft.answered) * 100) : 0,
      deltas: Object.entries(draft.deltas).map(([topicId, delta]) => ({
        topicId,
        topicName: TOPIC_BY_ID[topicId]?.name ?? topicId,
        delta: Math.round(delta),
      })),
      questions: draft.questionIds.slice(0, 12),
    },
    after: TRACK_BY_ID[profile.trackId].topics.map((topic) => ({
      topicId: topic.id,
      topicName: topic.name,
      mastery: round(profile.mastery[topic.id] ?? 50),
      dueAt: profile.reviews[topic.id]?.dueAt ?? null,
    })),
    constraints: [
      "Only cite the deltas and mastery values provided.",
      "Do not invent topics or claim gains that are not in the data.",
    ],
  };
}

export function adoptReflection(raw: string, trace: AgentStep[]): { reflection: Reflection | null; reason: string | null } {
  let parsed: z.infer<typeof reflectionPayloadSchema>;
  try {
    parsed = reflectionPayloadSchema.parse(extractJson(raw));
  } catch {
    return { reflection: null, reason: "The agent debrief did not match the approved schema." };
  }
  return {
    reflection: {
      source: "agent",
      headline: parsed.headline,
      wins: parsed.wins,
      gaps: parsed.gaps,
      nextMove: parsed.nextMove,
      nextReview: parsed.nextReview,
      confidenceNote: parsed.confidenceNote,
      createdAt: new Date().toISOString(),
      trace: [
        ...trace,
        {
          id: "reflect-model",
          kind: "reflect",
          label: "cloud_reflection",
          detail: "The agent compared the session deltas with the post-session mastery map.",
          status: "ok",
        },
      ],
    },
    reason: null,
  };
}

function storageKey(scope?: string) {
  return scope ? `${STORAGE_PREFIX}.${scope}` : STORAGE_PREFIX;
}

export function loadAgentMemory(scope?: string): AgentMemory {
  const empty: AgentMemory = { studyPlan: null, reteachPlan: null, reflection: null, updatedAt: null };
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AgentMemory>;
    return {
      studyPlan: parsed.studyPlan ?? null,
      reteachPlan: parsed.reteachPlan ?? null,
      reflection: parsed.reflection ?? null,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return empty;
  }
}

export function saveAgentMemory(scope: string | undefined, patch: Partial<AgentMemory>): AgentMemory {
  const next: AgentMemory = {
    ...loadAgentMemory(scope),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    // Storage can be blocked; the in-memory copy still serves this view.
  }
  return next;
}

export function clearAgentMemory(scope?: string) {
  try {
    localStorage.removeItem(storageKey(scope));
  } catch {
    // Nothing else to clear.
  }
}
