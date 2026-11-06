"use client";

import { CountUp } from "@/components/marketing/CountUp";
import { SampleTag } from "@/components/marketing/SampleTag";
import { Card } from "@/components/ui/Card";
import { useInView } from "@/components/marketing/useInView";

/** Product moment 1: a profile card. The stat numbers count up when it scrolls into view. */
export function ProfileMoment() {
  const [ref, seen] = useInView<HTMLElement>(0.4);
  return (
    <Card as="article" ref={ref} aria-label="Sample player profile" className="w-full max-w-md">
      <header className="flex items-center gap-4">
        <div aria-hidden className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-surface-2 font-display text-3xl font-bold text-coral">
          Y
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-bold">yourname</p>
          <p className="truncate text-sm text-mute">victress.gg/yourname</p>
        </div>
        <SampleTag />
      </header>

      <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
        {["VALORANT", "Duelist", "Diamond"].map((c) => (
          <span key={c} className="rounded-full bg-surface-2 px-3.5 py-1.5">
            {c}
          </span>
        ))}
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        {[
          { k: "K/D", to: 1.35, d: 2 },
          { k: "Win rate", to: 58, d: 0, s: "%" },
          { k: "ACS", to: 251, d: 0 },
        ].map((m) => (
          <div key={m.k} className="rounded-2xl bg-surface-2 px-3 py-4">
            <dt className="text-xs text-mute">{m.k}</dt>
            <dd className="mt-1 text-3xl font-bold">
              <CountUp to={m.to} decimals={m.d} suffix={m.s} active={seen} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-mute">Self-reported</p>
    </Card>
  );
}
