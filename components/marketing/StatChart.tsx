"use client";

import { useState } from "react";
import { SampleTag, SoonTag } from "@/components/marketing/SampleTag";
import { useInView } from "@/components/marketing/useInView";

// Sample data only. Eight weekly points per stat.
const SERIES = [
  { key: "kd", label: "K/D", values: [0.92, 0.98, 1.05, 1.02, 1.14, 1.21, 1.27, 1.35], decimals: 2, suffix: "" },
  { key: "win", label: "Win rate", values: [44, 47, 46, 51, 53, 52, 56, 58], decimals: 0, suffix: "%" },
  { key: "acs", label: "ACS", values: [182, 190, 201, 198, 214, 226, 238, 251], decimals: 0, suffix: "" },
] as const;

const W = 320;
const H = 150;
const PAD = 14;

function geometry(values: readonly number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => [PAD + (i / (values.length - 1)) * (W - PAD * 2), H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`;
  return { line, area, last: pts[pts.length - 1] };
}

/** Product moment 2: a chart that draws itself when it scrolls into view, and again when you tap another stat. */
export function StatChart() {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  const [i, setI] = useState(0);
  const s = SERIES[i];
  const g = geometry(s.values);
  const first = s.values[0];
  const last = s.values[s.values.length - 1];
  const go = seen ? "--go" : "";

  return (
    <div ref={ref} className="lift w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-[0_30px_80px_-30px_rgba(207,20,43,0.45)] sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-mute">{s.label}, last 8 weeks</p>
          <p className="tnum mt-1 text-5xl font-bold">
            {last.toFixed(s.decimals)}
            {s.suffix}
          </p>
          <p className="tnum mt-1 text-sm font-semibold text-coral">
            +{(last - first).toFixed(s.decimals)}
            {s.suffix}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <SampleTag />
          <SoonTag />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sample chart: ${s.label} rising from ${first} to ${last} over eight weeks`} className="mt-6 h-40 w-full overflow-visible">
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} stroke="var(--line)" strokeWidth="1" />
        ))}
        <g key={s.key}>
          <path d={g.area} fill="var(--crimson)" fillOpacity="0.2" className={`chart-area chart-area${go}`} />
          <path d={g.line} pathLength={1} fill="none" stroke="var(--signal)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className={`chart-line chart-line${go}`} />
          <circle cx={g.last[0]} cy={g.last[1]} r="5.5" fill="var(--white)" stroke="var(--signal)" strokeWidth="3" className={`chart-dot chart-dot${go}`} />
        </g>
      </svg>

      <div className="mt-5 flex gap-2" role="group" aria-label="Choose a stat">
        {SERIES.map((x, idx) => (
          <button
            key={x.key}
            type="button"
            aria-pressed={idx === i}
            onClick={() => setI(idx)}
            className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold transition-colors hover:border-white aria-pressed:border-crimson aria-pressed:bg-crimson"
          >
            {x.label}
          </button>
        ))}
      </div>
    </div>
  );
}
