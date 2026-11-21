type Node = {
  label: string;
  pct: number;
  x: number;
  y: number;
  anchor: "start" | "middle";
  labelX: number;
  labelY: number;
};

const nodes: Node[] = [
  { label: "Linear", pct: 72, x: 113, y: 194, anchor: "middle", labelX: 113, labelY: 172 },
  { label: "Quadratics", pct: 46, x: 323, y: 97, anchor: "start", labelX: 338, labelY: 94 },
  { label: "Rates", pct: 58, x: 394, y: 312, anchor: "start", labelX: 409, labelY: 309 },
  { label: "Data", pct: 81, x: 150, y: 396, anchor: "middle", labelX: 150, labelY: 429 },
  { label: "Geometry", pct: 32, x: 167, y: 179, anchor: "middle", labelX: 167, labelY: 157 },
];

export function OrbitMap() {
  return (
    <figure className="relative mx-auto w-full max-w-[540px]">
      <svg
        viewBox="0 0 480 480"
        className="h-auto w-full"
        role="img"
        aria-labelledby="orbit-title orbit-desc"
      >
        <title id="orbit-title">Illustrative mastery map</title>
        <desc id="orbit-desc">
          A learner profile at the center, connected to five topics: Linear 72
          percent, Quadratics 46 percent, Rates 58 percent, Data 81 percent, and
          Geometry 32 percent.
        </desc>

        <g fill="none" stroke="var(--site-border)" strokeWidth="1">
          <circle cx="240" cy="240" r="90" strokeDasharray="2 7" opacity="0.75" />
          <circle cx="240" cy="240" r="140" strokeDasharray="2 7" opacity="0.55" />
          <circle cx="240" cy="240" r="195" strokeDasharray="2 7" opacity="0.4" />
        </g>

        {nodes.map((node) => (
          <line
            key={`line-${node.label}`}
            x1="240"
            y1="240"
            x2={node.x}
            y2={node.y}
            stroke="var(--site-border)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}

        <circle cx="240" cy="240" r="38" fill="var(--paper-deep)" opacity="0.7" />
        <circle cx="240" cy="240" r="27" fill="none" stroke="var(--site-border)" />
        <circle cx="240" cy="240" r="7" fill="var(--site-accent)" />
        <text
          x="240"
          y="292"
          textAnchor="middle"
          fill="var(--site-muted)"
          fontFamily="var(--font-mono-stack)"
          fontSize="10"
          letterSpacing="2"
        >
          YOU
        </text>

        {nodes.map((node) => {
          const circumference = 62.8;
          return (
            <g key={node.label}>
              <circle
                cx={node.x}
                cy={node.y}
                r="10"
                fill="var(--site-surface)"
                stroke="var(--site-border)"
                strokeWidth="2"
              />
              <circle
                cx={node.x}
                cy={node.y}
                r="10"
                fill="none"
                stroke="var(--sage)"
                strokeWidth="2"
                strokeDasharray={`${(node.pct / 100) * circumference} ${circumference}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${node.x} ${node.y})`}
              />
              <circle cx={node.x} cy={node.y} r="2.5" fill="var(--site-fg)" />
              <text
                x={node.labelX}
                y={node.labelY}
                textAnchor={node.anchor}
                fill="var(--site-fg)"
                fontFamily="var(--font-serif-stack)"
                fontSize="16"
              >
                {node.label}
              </text>
              <text
                x={node.labelX}
                y={node.labelY + 17}
                textAnchor={node.anchor}
                fill="var(--site-muted)"
                fontFamily="var(--font-mono-stack)"
                fontSize="9.5"
                letterSpacing="1"
              >
                {node.pct}% MASTERY
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mono-meta mt-1 flex items-center justify-between gap-4">
        <span>Illustrative profile</span>
        <span>Mastery 1–99</span>
      </figcaption>
    </figure>
  );
}
