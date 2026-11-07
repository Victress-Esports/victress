import Link from "next/link";

/**
 * The Victress technology wings, cropped from the original artwork (scripts/make-icons.mjs).
 * Pre-optimized transparent webp files; no on-demand image encoding.
 */
export function WingMark({ className = "h-8 w-auto", title }: { className?: string; title?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static, pre-sized brand asset
    <img
      src="/brand/wings-emblem-128.webp"
      srcSet="/brand/wings-emblem-128.webp 128w, /brand/wings-emblem-256.webp 256w"
      sizes="40px"
      width={128}
      height={102}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      decoding="async"
      className={className}
    />
  );
}

/** Wings plus the VICTRESS wordmark. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-white" aria-label="Victress home">
      <WingMark />
      <span className="font-display text-lg font-bold tracking-[0.18em]">VICTRESS</span>
    </Link>
  );
}
