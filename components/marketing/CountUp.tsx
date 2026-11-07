"use client";

import { useEffect, useState } from "react";

/**
 * Shows `to` on the server and with reduced motion. Once `active`, counts from `from` (default 0) up to `to`.
 * `initial` is what shows before it is active (default: the final number).
 */
export function CountUp({
  to,
  from = 0,
  initial = to,
  decimals = 0,
  suffix = "",
  active,
}: {
  to: number;
  from?: number;
  initial?: number;
  decimals?: number;
  suffix?: string;
  active: boolean;
}) {
  const [v, setV] = useState(initial);
  // Only evaluated once `active` is true (after hydration), so server and client markup still match.
  const instant = active && typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setV(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, from, to]);

  return (
    <span className="tnum">
      {(instant ? to : v).toFixed(decimals)}
      {suffix}
    </span>
  );
}
