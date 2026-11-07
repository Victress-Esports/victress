/** Small, visible label for every sample or mock element on the marketing site. */
export function SampleTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-mute ${className}`}
    >
      Sample
    </span>
  );
}

/** For sample visuals of something the product does not do yet. */
export function SoonTag({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-coral ${className}`}>
      Coming soon
    </span>
  );
}
