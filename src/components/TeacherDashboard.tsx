import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Layers,
  Users,
} from "lucide-react";
import { MasteryBar } from "./MasteryBar";
import { ReteachAgent } from "./ReteachAgent";
import { useAuth } from "../contexts/AuthContext";
import { TRACK_BY_ID } from "@/lib/questions";
import {
  AT_RISK,
  CLASS_STATS,
  MISCONCEPTION_HOTSPOTS,
  STUDENTS,
  TOPIC_GAPS,
} from "@/lib/classroom";

const track = TRACK_BY_ID["c10-physics"];

function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <span className="text-mutedink">{icon}</span>
      </div>
      <p className="mt-4 font-serif text-[2.4rem] leading-none text-ink tabular">
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-mutedink">{detail}</p>
    </div>
  );
}

function topicName(topicId: string) {
  return track.topics.find((topic) => topic.id === topicId)?.short ?? topicId;
}

export function TeacherDashboard() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const rows = showAll
    ? [...STUDENTS].sort((a, b) => a.readiness - b.readiness)
    : AT_RISK;

  return (
    <div className="site-container py-10 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-brick">
            Teacher view · Class 10 Physics · Section A
          </p>
          <h1 className="section-title mt-4 max-w-[18ch] text-ink">
            Where the class is actually stuck.
          </h1>
          <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-mutedink">
            {user?.name ?? "Teacher"} sees class-wide mastery, the concepts behind
            repeated wrong answers, and a review queue that needs attention. The
            reteach agent drafts the next lesson from that evidence and verifies it
            before you teach it. This roster is seeded demo data, not connected
            student accounts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono-meta rounded-full border border-brick/30 bg-brick-tint px-3 py-1.5 text-brick">
            Illustrative roster · {CLASS_STATS.students} learners
          </span>
          <button
            type="button"
            onClick={() => setPlanOpen((value) => !value)}
            className="btn btn-primary"
          >
            <ClipboardList className="size-4" aria-hidden="true" />
            {planOpen ? "Hide reteach plan" : "Draft a reteach plan"}
          </button>
        </div>
      </header>

      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Class readiness"
          value={String(CLASS_STATS.averageReadiness)}
          detail={`Against a 60% target · ${CLASS_STATS.students} seeded students`}
          icon={<Layers className="size-4" aria-hidden="true" />}
        />
        <Stat
          label="Needs a check-in"
          value={String(CLASS_STATS.atRisk)}
          detail="Below 45% readiness, or two or more weak topics"
          icon={<AlertTriangle className="size-4" aria-hidden="true" />}
        />
        <Stat
          label="Reviews due"
          value={String(CLASS_STATS.dueReviews)}
          detail="Across the class queue right now"
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
        />
        <Stat
          label="Top misconception"
          value={`${MISCONCEPTION_HOTSPOTS[0].count}/${CLASS_STATS.students}`}
          detail={MISCONCEPTION_HOTSPOTS[0].label}
          icon={<Users className="size-4" aria-hidden="true" />}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.35 }}
          className="card lg:col-span-7"
          aria-labelledby="gap-chart-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="gap-chart-heading" className="eyebrow text-ink">
              Class mastery by topic
            </h2>
            <p className="mono-meta">Dashed line = 60% target</p>
          </div>
          <div className="p-4 md:p-6">
            <div className="h-[280px] w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={TOPIC_GAPS}
                  margin={{ top: 18, right: 8, bottom: 4, left: -18 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--site-border)"
                    strokeDasharray="2 5"
                  />
                  <XAxis
                    dataKey="short"
                    tick={{
                      fill: "var(--site-muted)",
                      fontSize: 10,
                      fontFamily: "var(--font-mono-stack)",
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fill: "var(--site-muted)",
                      fontSize: 9,
                      fontFamily: "var(--font-mono-stack)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--site-paper-deep)", opacity: 0.7 }}
                    contentStyle={{
                      background: "var(--site-surface)",
                      border: "1px solid var(--site-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--site-fg)",
                    }}
                    formatter={(value) => [`${value}%`, "Class average"]}
                  />
                  <ReferenceLine
                    y={CLASS_STATS.target}
                    stroke="var(--brick)"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="average" radius={[3, 3, 0, 0]}>
                    {TOPIC_GAPS.map((gap) => (
                      <Cell
                        key={gap.topicId}
                        fill={gap.average < 45 ? "var(--brick)" : "var(--sage)"}
                        fillOpacity={gap.average < 45 ? 0.9 : 0.82}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Class mastery by topic</caption>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Average</th>
                  <th>Below 40</th>
                  <th>Weakest concept</th>
                </tr>
              </thead>
              <tbody>
                {TOPIC_GAPS.map((gap) => (
                  <tr key={gap.topicId}>
                    <td>{gap.name}</td>
                    <td>{gap.average}%</td>
                    <td>{gap.below40} students</td>
                    <td>{gap.weakestKcLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 border-t border-line pt-4">
              <MasteryBar
                value={CLASS_STATS.averageReadiness}
                label="Class readiness"
                tone={
                  CLASS_STATS.averageReadiness < 40 ? "brick" : "sage"
                }
              />
              <p className="mono-meta mt-2">
                Weakest topic: {TOPIC_GAPS[0].name} ·{" "}
                {TOPIC_GAPS[0].average}% class average
              </p>
            </div>
          </div>
        </motion.section>

        <section className="card lg:col-span-5" aria-labelledby="risk-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="risk-heading" className="eyebrow text-ink">
              Check-in list
            </h2>
            <p className="mono-meta">Lowest readiness first</p>
          </div>
          <div className="p-6">
            <ul className="divide-y divide-[var(--site-border)]">
              {AT_RISK.slice(0, 5).map((student) => (
                <li key={student.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {student.name}
                      </p>
                      <p className="mono-meta mt-1">
                        {student.weakTopics
                          .slice(0, 2)
                          .map(topicName)
                          .join(" · ")}{" "}
                        · {student.dueReviews} due
                      </p>
                    </div>
                    <p
                      className={`font-serif text-xl tabular ${
                        student.readiness < 40 ? "text-brick" : "text-ink"
                      }`}
                    >
                      {Math.round(student.readiness)}
                    </p>
                  </div>
                  <div className="mt-2">
                    <MasteryBar
                      value={student.readiness}
                      label={`${student.name} readiness`}
                      tone={student.readiness < 40 ? "brick" : "sage"}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="link-underline mt-5 inline-flex items-center gap-1.5 text-sm"
            >
              {showAll ? "Show only at-risk learners" : "Show the whole class"}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="card lg:col-span-7" aria-labelledby="heatmap-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="heatmap-heading" className="eyebrow text-ink">
              Concept gap heat map
            </h2>
            <p className="mono-meta">
              {showAll ? `All ${STUDENTS.length}` : `At risk (${AT_RISK.length})`} ·
              mastery 1–99
            </p>
          </div>
          <div className="overflow-x-auto p-2 md:p-4">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
              <caption className="sr-only">
                Topic mastery for each learner in the demo roster.
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-surface px-3 py-2 text-left"
                  >
                    <span className="eyebrow">Learner</span>
                  </th>
                  {track.topics.map((topic) => (
                    <th
                      key={topic.id}
                      scope="col"
                      className="px-2 py-2 text-center"
                    >
                      <span className="mono-meta">{topic.short}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((student) => (
                  <tr key={student.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-t border-line bg-surface px-3 py-2 text-left font-normal"
                    >
                      <span className="block text-[0.82rem] text-ink">
                        {student.name}
                      </span>
                      <span className="mono-meta mt-0.5 block">
                        {Math.round(student.readiness)} overall
                      </span>
                    </th>
                    {track.topics.map((topic) => {
                      const value = Math.round(student.mastery[topic.id] ?? 50);
                      const tone =
                        value < 40
                          ? "bg-brick text-paper"
                          : value < 55
                            ? "bg-brick-tint text-brick"
                            : value < 70
                              ? "bg-paper-deep text-ink-soft"
                              : "bg-sage-tint text-sage";
                      return (
                        <td
                          key={topic.id}
                          className="border-t border-line px-1.5 py-2 text-center"
                        >
                          <span
                            className={`inline-flex min-w-10 items-center justify-center rounded-sm px-1.5 py-1 font-mono text-[11px] tabular ${tone}`}
                            title={`${topic.name}: ${value}% mastery`}
                          >
                            {value}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-6 py-3">
            <div className="mono-meta flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-brick" aria-hidden="true" />
                below 40
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm bg-brick-tint"
                  aria-hidden="true"
                />
                40–54
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm bg-paper-deep"
                  aria-hidden="true"
                />
                55–69
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm bg-sage-tint"
                  aria-hidden="true"
                />
                70+
              </span>
            </div>
          </div>
        </section>

        <section className="card lg:col-span-5" aria-labelledby="misconceptions-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="misconceptions-heading" className="eyebrow text-ink">
              Reasoning after wrong answers
            </h2>
            <p className="mono-meta">Distractor analysis</p>
          </div>
          <ul className="divide-y divide-[var(--site-border)] px-6">
            {MISCONCEPTION_HOTSPOTS.map((hotspot) => (
              <li key={hotspot.kc} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {hotspot.label}
                    </p>
                    <p className="mono-meta mt-0.5">
                      {hotspot.topic} · {hotspot.kc}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-ink-soft">
                    {hotspot.count}/{CLASS_STATS.students}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-mutedink">
                  {hotspot.note}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {planOpen && <ReteachAgent />}
      </div>

      <p className="mono-meta mt-8 max-w-3xl leading-relaxed">
        Classroom analytics are illustrative. The student demo stores one real
        browser-local profile; this teacher view uses a separate seeded cohort so
        class-level patterns can be reviewed without pretending that shared student
        data exists.
      </p>
    </div>
  );
}
