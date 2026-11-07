"use client";

import Image from "next/image";

// Pre-optimized files (scripts/make-wings.mjs). The loader picks the smallest one that is wide enough
// (within 10%, so a 750px request gets the 720px file), so the browser downloads a static file with no on-demand encoding.
const FILES = [
  { width: 480, src: "/brand/wings-480.webp" },
  { width: 720, src: "/brand/wings-720.webp" },
  { width: 1024, src: "/brand/wings.webp" },
];
const loader = ({ width }: { width: number }) => (FILES.find((f) => f.width >= width * 0.9) ?? FILES[FILES.length - 1]).src;

/** Detailed wing art. Hero and large surfaces only. */
export function WingArt({
  className,
  preload = false,
  alt = "Victress winged emblem in red and silver",
}: {
  className?: string;
  /** Set on the one image that is the largest thing in the first screen. */
  preload?: boolean;
  alt?: string;
}) {
  return (
    <Image
      loader={loader}
      src="/brand/wings.webp"
      alt={alt}
      width={1024}
      height={1024}
      preload={preload}
      fetchPriority={preload ? "high" : "auto"}
      sizes="(min-width: 1024px) 560px, 90vw"
      className={className}
    />
  );
}
