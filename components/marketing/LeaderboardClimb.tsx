"use client";

import type { CSSProperties } from "react";
import { CountUp } from "@/components/marketing/CountUp";
import { SampleTag } from "@/components/marketing/SampleTag";
import { useInView } from "@/components/marketing/useInView";

// Sample data only. Listed in final order; `start` is where each row sits before the climb.
const ROWS = [
  { name: "Sample A", score: 318, start: 0, final: 0 },
  { name: "You", score: 309, from: 262, start: 4, final: 1, you: true },
  { name: "Sample B", score: 306, start: 1, final: 2 },
  { name: "Sample C", score: 297, start: 2, final: 3 },
  { name: "Sample D", score: 281, start: 3, final: 4 },
] as const;

const ROW = "4.5rem"; // row height plus gap

/** Product moment 3: a leaderboard where "You" climbs from 5th to 2nd when it scrolls into view. */
export function LeaderboardClimb() {
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  return (
    <div ref={ref} className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-[0_30px_80px_-30px_rgba(207,20,43,0.45)] sm:p-8">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Club leaderboard</p>
        <SampleTag />
      </div>
      {/* DOM order is the final order, so assistive tech reads the result. The climb is a visual transform. */}
      <ol aria-label="Sample leaderboard" className="relative mt-5" style={{ height: `calc(${ROWS.length} * ${ROW} - 0.5rem)` }}>
        {ROWS.map((r) => {
          const pos = seen ? r.final : r.start;
          return (
            <li
              key={r.name}
              style={{ "--pos": pos, transform: `translateY(calc(var(--pos) * ${ROW}))` } as CSSProperties}
              className={`absolute inset-x-0 top-0 flex h-16 items-center gap-3 rounded-2xl px-4 transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${seen ? "delay-300" : ""} ${
                "you" in r ? "z-10 bg-crimson" : "bg-surface-2"
              }`}
            >
              <span className="tnum w-6 text-lg font-bold">{pos + 1}</span>
              <span className="flex-1 font-semibold">{r.name}</span>
              <span className="tnum text-lg font-bold">
                {"from" in r ? <CountUp from={r.from} to={r.score} initial={r.from} active={seen} /> : r.score}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
