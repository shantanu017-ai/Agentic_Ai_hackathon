import { Fragment } from "react";
import { ArrowRight, GitBranch } from "lucide-react";
import { TRACK_BY_ID, type Topic } from "@/lib/questions";
import {
  PREREQ_GATE,
  bandFor,
  confidenceFor,
  topicEvidence,
  type LearnerProfile,
} from "@/lib/learner";

function buildLayers(topics: Topic[]) {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const depths = new Map<string, number>();
  const visiting = new Set<string>();

  const depthOf = (id: string): number => {
    const cached = depths.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const topic = byId.get(id);
    const parents = (topic?.prerequisites ?? []).filter((parent) =>
      byId.has(parent),
    );
    const depth =
      parents.length === 0 ? 0 : Math.max(...parents.map(depthOf)) + 1;
    visiting.delete(id);
    depths.set(id, depth);
    return depth;
  };

  for (const topic of topics) depthOf(topic.id);
  const maxDepth = Math.max(0, ...depths.values());
  return Array.from({ length: maxDepth + 1 }, (_, layer) =>
    topics.filter((topic) => depths.get(topic.id) === layer),
  );
}

export function ConceptGraph({
  profile,
  onPractise,
}: {
  profile: LearnerProfile;
  onPractise: (topicId: string) => void;
}) {
  const track = TRACK_BY_ID[profile.trackId];
  const layers = buildLayers(track.topics);

  return (
    <section className="card" aria-labelledby="graph-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-sage" aria-hidden="true" />
          <h2 id="graph-heading" className="eyebrow text-ink">
            Concept graph
          </h2>
        </div>
        <p className="mono-meta">
          {track.topics.length} topics · builds in prerequisite order
        </p>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          {layers.map((layer, layerIndex) => (
            <Fragment key={layerIndex}>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="mono-meta">
                  {layerIndex === 0
                    ? "Foundation"
                    : `Builds on layer ${layerIndex}`}
                </p>
                {layer.map((topic) => {
                  const mastery = Math.round(profile.mastery[topic.id] ?? 50);
                  const band = bandFor(mastery);
                  const evidence = topicEvidence(profile, topic.id);
                  const confidence = confidenceFor(evidence);
                  const unmet = (topic.prerequisites ?? []).filter(
                    (id) => (profile.mastery[id] ?? 50) < PREREQ_GATE,
                  );
                  const tone =
                    mastery < 40
                      ? "border-brick/45"
                      : mastery < 70
                        ? "border-line"
                        : "border-sage/40";
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => onPractise(topic.id)}
                      aria-label={`Practise ${topic.name}. ${mastery}% mastery.`}
                      className={`w-full rounded-[var(--site-radius)] border ${tone} bg-surface p-3.5 text-left transition-colors hover:border-linestrong`}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-serif text-[1.08rem] text-ink">
                          {topic.short}
                        </span>
                        <span className="font-mono text-[11px] text-mutedink tabular">
                          {mastery}%
                        </span>
                      </span>
                      <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-line">
                        <span
                          className={`block h-full rounded-full ${
                            mastery < 40 ? "bg-brick" : "bg-sage"
                          }`}
                          style={{ width: `${mastery}%` }}
                        />
                      </span>
                      <span className="mono-meta mt-2 block leading-relaxed">
                        {band.label} · {confidence.label.toLowerCase()}
                        {unmet.length > 0
                          ? ` · gate: ${
                              track.topics.find((item) => item.id === unmet[0])
                                ?.short ?? unmet[0]
                            }`
                          : topic.prerequisites?.length
                            ? " · prerequisites met"
                            : " · root concept"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {layerIndex < layers.length - 1 && (
                <div
                  className="hidden w-5 shrink-0 items-center justify-center text-mutedink md:flex"
                  aria-hidden="true"
                >
                  <ArrowRight className="size-4" />
                </div>
              )}
            </Fragment>
          ))}
        </div>

        <p className="mono-meta mt-5 border-t border-line pt-4 leading-relaxed">
          Click any node to practise that topic. A gate label marks an unmet
          prerequisite below {PREREQ_GATE}% mastery; adaptive sessions and the
          plan on this page will prioritise it first.
        </p>
      </div>
    </section>
  );
}
