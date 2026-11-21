import { motion, useReducedMotion } from "framer-motion";

export function MasteryBar({
  value,
  label,
  tone = "sage",
}: {
  value: number;
  label: string;
  tone?: "sage" | "brick";
}) {
  const reduce = useReducedMotion();
  const rounded = Math.round(value);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={99}
      aria-valuenow={rounded}
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
    >
      <motion.div
        className={`h-full rounded-full ${tone === "brick" ? "bg-brick" : "bg-sage"}`}
        initial={{ width: reduce ? `${rounded}%` : 0 }}
        animate={{ width: `${rounded}%` }}
        transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
