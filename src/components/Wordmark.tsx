export function Wordmark({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-sm"
      aria-label="Praxis — return to the home page"
    >
      <span className="font-serif text-[1.55rem] leading-none tracking-[-0.02em]">
        Praxis
      </span>
      <span
        aria-hidden="true"
        className="mt-[-0.55rem] inline-block size-1.5 rounded-full bg-brick"
      />
    </button>
  );
}
