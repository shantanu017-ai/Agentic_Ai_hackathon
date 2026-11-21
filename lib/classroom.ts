import { TRACK_BY_ID, kcLabel } from "./questions";

export type StudentRow = {
  id: string;
  name: string;
  mastery: Record<string, number>;
  readiness: number;
  weakTopics: string[];
  dueReviews: number;
  streak: number;
  lastActiveDays: number;
  risk: boolean;
};

export type TopicGap = {
  topicId: string;
  name: string;
  short: string;
  average: number;
  below40: number;
  weakestKc: string;
  weakestKcLabel: string;
};

const TRACK = TRACK_BY_ID["c10-physics"];
const TOPIC_IDS = TRACK.topics.map((topic) => topic.id);

const names = [
  "Aarav Mehta",
  "Diya Sharma",
  "Kabir Nair",
  "Ananya Iyer",
  "Vivaan Patel",
  "Ishita Rao",
  "Arjun Menon",
  "Meera Joshi",
  "Rohan Gupta",
  "Saanvi Reddy",
  "Aditya Verma",
  "Kavya Singh",
  "Reyansh Bose",
  "Nisha Pillai",
  "Dev Malhotra",
  "Tara Kulkarni",
  "Aryan Das",
  "Pari Chatterjee",
  "Krish Agarwal",
  "Anvi Deshmukh",
  "Neel Kapoor",
  "Riya Banerjee",
  "Yash Thakur",
  "Zara Khan",
];

const overrides: Record<string, number[]> = {
  "Aarav Mehta": [68, 47, 71, 33, 56],
  "Riya Banerjee": [34, 28, 41, 26, 31],
  "Neel Kapoor": [29, 31, 27, 24, 33],
  "Dev Malhotra": [38, 36, 33, 29, 40],
  "Pari Chatterjee": [41, 44, 39, 35, 48],
  "Yash Thakur": [52, 49, 58, 37, 44],
  "Zara Khan": [61, 57, 66, 42, 59],
  "Kabir Nair": [77, 71, 82, 64, 69],
  "Ananya Iyer": [82, 78, 85, 72, 80],
};

const centers = [57, 51, 62, 44, 56];

function pseudoRandom(a: number, b: number) {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function buildStudents(): StudentRow[] {
  return names.map((name, index) => {
    const values =
      overrides[name] ??
      TOPIC_IDS.map((_, topicIndex) =>
        clamp(
          Math.round(
            centers[topicIndex] + (pseudoRandom(index + 1, topicIndex + 1) - 0.5) * 34,
          ),
          18,
          94,
        ),
      );
    const mastery = Object.fromEntries(
      TOPIC_IDS.map((topicId, topicIndex) => [topicId, values[topicIndex]]),
    );
    const readiness = round1(
      values.reduce((sum, value) => sum + value, 0) / values.length,
    );
    const weakTopics = TOPIC_IDS.filter(
      (topicId) => mastery[topicId] < 45,
    );
    const risk = readiness < 45 || weakTopics.length >= 2;
    const dueReviews = Math.max(
      0,
      Math.round((1 - readiness / 100) * 5) + (index % 3 === 0 ? 1 : 0),
    );
    return {
      id: `student-${index + 1}`,
      name,
      mastery,
      readiness,
      weakTopics,
      dueReviews,
      streak: 1 + (index % 9),
      lastActiveDays: index % 7,
      risk,
    };
  });
}

export const STUDENTS = buildStudents();

const weakestKcByTopic: Record<string, string> = {
  light: "mirror-formula",
  electricity: "electrical-power",
  "human-eye": "scattering",
  "magnetic-effects": "electromagnetic-induction",
  "energy-sources": "efficiency",
};

export const TOPIC_GAPS: TopicGap[] = TRACK.topics.map((topic) => {
  const values = STUDENTS.map((student) => student.mastery[topic.id] ?? 50);
  const average = round1(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
  const kc = weakestKcByTopic[topic.id] ?? topic.id;
  return {
    topicId: topic.id,
    name: topic.name,
    short: topic.short,
    average,
    below40: values.filter((value) => value < 40).length,
    weakestKc: kc,
    weakestKcLabel: kcLabel(kc),
  };
}).sort((a, b) => a.average - b.average);

export const CLASS_STATS = {
  students: STUDENTS.length,
  averageReadiness: round1(
    STUDENTS.reduce((sum, student) => sum + student.readiness, 0) /
      STUDENTS.length,
  ),
  atRisk: STUDENTS.filter((student) => student.risk).length,
  dueReviews: STUDENTS.reduce((sum, student) => sum + student.dueReviews, 0),
  target: 60,
};

export const AT_RISK = [...STUDENTS]
  .filter((student) => student.risk)
  .sort((a, b) => a.readiness - b.readiness);

export const MISCONCEPTION_HOTSPOTS = [
  {
    kc: "electrical-power",
    label: "Bulb rating → resistance",
    topic: "Electricity",
    count: 11,
    note: "Students divide 220 V by 100 W and treat the result as resistance instead of using R = V²/P.",
  },
  {
    kc: "mirror-formula",
    label: "Concave mirror sign convention",
    topic: "Light",
    count: 9,
    note: "The image is placed behind the mirror because f and u are entered as positive.",
  },
  {
    kc: "electric-motor",
    label: "Motor vs. generator",
    topic: "Magnetism",
    count: 8,
    note: "The split-ring commutator is described as producing energy instead of reversing coil current.",
  },
  {
    kc: "series-parallel",
    label: "Parallel total current",
    topic: "Electricity",
    count: 7,
    note: "One branch current is reported as the total because the equivalent resistance is skipped.",
  },
  {
    kc: "scattering",
    label: "Blue sky / red sunset",
    topic: "Human eye",
    count: 6,
    note: "Scattering is described as absorption and re-emission at a different wavelength.",
  },
];
