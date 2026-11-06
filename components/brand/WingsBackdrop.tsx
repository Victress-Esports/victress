/**
 * The original technology wings, used as a faint compositional element: cropped by its parent, never in front of text.
 * Decorative only (aria-hidden). `half` is the left wing alone; `flip` mirrors it so it can sit on the right edge.
 * Files come from scripts/make-icons.mjs, which only crops and resizes wings.webp.
 */
export function WingsBackdrop({
  variant = "half",
  flip = false,
  className = "",
}: {
  variant?: "half" | "band";
  flip?: boolean;
  className?: string;
}) {
  const half = variant === "half";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- decorative, pre-sized static asset
    <img
      src={half ? "/brand/wings-half-560.webp" : "/brand/wings-band-1200.webp"}
      width={half ? 560 : 1200}
      height={half ? 888 : 953}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      className={`pointer-events-none absolute select-none opacity-[0.09] ${flip ? "-scale-x-100" : ""} ${className}`}
    />
  );
}
