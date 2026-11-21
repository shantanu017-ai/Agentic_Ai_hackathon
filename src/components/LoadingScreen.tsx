export function LoadingScreen({ label = "Opening Praxis" }: { label?: string }) {
  return (
    <div className="site-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-24">
      <div className="flex items-center gap-2">
        <span className="font-serif text-[1.8rem] tracking-[-0.02em]">Praxis</span>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-brick" />
      </div>
      <p className="mono-meta" role="status">
        {label}…
      </p>
    </div>
  );
}
