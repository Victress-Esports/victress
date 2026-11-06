import Link from "next/link";

/** Simplified one-color wing/V mark. Solid shapes only so it holds up at 16px. */
export function WingMark({ className = "h-8 w-8", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g id="w">
        <path d="M15 27 1.5 5H8l8 13.5z" />
        <path d="M15 27 6.5 12H12l5 10z" opacity="0.62" />
      </g>
      <use href="#w" transform="matrix(-1 0 0 1 32 0)" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-white" aria-label="Victress home">
      <WingMark className="h-7 w-7 text-crimson" />
      <span className="font-display text-lg font-bold tracking-[0.18em]">VICTRESS</span>
    </Link>
  );
}
