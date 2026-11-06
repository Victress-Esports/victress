"use client";

import { useState } from "react";
import { ClaimInput } from "@/components/marketing/ClaimInput";
import { SAMPLE } from "@/components/marketing/sampleData";
import { SampleTag, SoonTag } from "@/components/marketing/SampleTag";
import { GAME_LIST, type GameId } from "@/content/games";

const chip =
  "inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[13px] font-semibold text-white transition-colors hover:border-white focus-visible:border-white aria-pressed:border-crimson aria-pressed:bg-crimson";

const W = 320;
const H = 72;

function trendPath(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 6 - ((v - min) / (max - min || 1)) * (H - 14)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return { line, area: `${line} L${W} ${H} L0 ${H} Z`, last: pts[pts.length - 1] };
}

/**
 * Hero: the claim box and a live profile preview. Typing a name shows the visitor their own profile before they sign up;
 * the chips switch game and rank. Everything except the typed name is sample data and is labeled Sample.
 */
export function HeroClaim({ title, line }: { title: string; line: string }) {
  const [handle, setHandle] = useState("");
  const [gameId, setGameId] = useState<GameId>("VALORANT");
  const [rank, setRank] = useState<string>("Diamond");
  const game = GAME_LIST.find((g) => g.id === gameId)!;
  const sample = SAMPLE[gameId];
  const name = handle || "yourname";
  const t = trendPath(sample.trend);
  const statLabel = (key: string) => game.stats.find((s) => s.key === key)?.label ?? key;

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_30rem] lg:gap-16 lg:pt-20">
        <div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] min-[400px]:text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
          <p className="mt-5 max-w-md text-balance text-lg text-mute sm:text-xl">{line}</p>
          <div className="mt-10">
            <ClaimInput id="claim-hero" onChange={setHandle} />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          {/* Soft glow only. The logo lives in the navigation and footer, not the hero. */}
          <div aria-hidden className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(closest-side,rgba(207,20,43,0.22),transparent)]" />
          <article
            aria-label="Sample profile preview"
            className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(207,20,43,0.5)]"
          >
            {/* Profile */}
            <div className="p-5 pb-4">
              <header className="flex items-center gap-4">
                <div
                  aria-hidden
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-crimson to-warm-coral font-display text-2xl font-bold"
                >
                  {handle ? handle.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xl font-bold ${handle ? "" : "text-mute"}`}>{name}</p>
                  <p className="truncate text-sm text-mute">victress.gg/{name}</p>
                </div>
                <SampleTag />
              </header>

              <div key={`b-${gameId}`} className="chip-in mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-full bg-surface-2 px-3.5 py-1.5">{game.name}</span>
                {sample.role ? <span className="rounded-full bg-surface-2 px-3.5 py-1.5">{sample.role}</span> : null}
                <span className="rounded-full bg-crimson px-3.5 py-1.5">{rank}</span>
              </div>

              <dl key={`s-${gameId}`} className="chip-in mt-4 grid grid-cols-3 gap-2.5">
                {sample.stats.map(([key, value]) => (
                  <div key={key} className="flex flex-col justify-between rounded-2xl bg-surface-2 px-3 py-2.5">
                    <dt className="text-[11px] leading-tight text-mute">{statLabel(key)}</dt>
                    <dd className="tnum mt-1.5 text-2xl font-bold leading-none">{value}</dd>
                  </div>
                ))}
              </dl>

              {/* Progress */}
              <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs text-mute">{sample.trendLabel}, last 8 weeks</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="tnum text-sm font-semibold text-coral">{sample.trendDelta}</p>
                    <SoonTag />
                  </div>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sample chart: ${sample.trendLabel} rising over eight weeks`} className="mt-1 h-11 w-full overflow-visible">
                  <g key={gameId}>
                    <path d={t.area} fill="var(--crimson)" fillOpacity="0.22" className="chart-area chart-area--go" />
                    <path d={t.line} pathLength={1} fill="none" stroke="var(--signal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="chart-line chart-line--go" />
                    <circle cx={t.last[0]} cy={t.last[1]} r="4.5" fill="var(--white)" stroke="var(--signal)" strokeWidth="2.5" className="chart-dot chart-dot--go" />
                  </g>
                </svg>
              </div>
              <p className="mt-2 text-[11px] text-mute">Self-reported</p>
            </div>

            {/* Try it */}
            <div className="border-t border-line bg-carbon/40 p-5 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-mute">Game</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GAME_LIST.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={g.id === gameId}
                    onClick={() => {
                      setGameId(g.id);
                      setRank(g.ranks[Math.floor(g.ranks.length / 2)]);
                    }}
                    className={chip}
                  >
                    {g.short}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-mute">Rank</p>
              <div key={`r-${gameId}`} className="chip-in mt-2 flex flex-wrap gap-2">
                {game.ranks.map((r) => (
                  <button key={r} type="button" aria-pressed={r === rank} onClick={() => setRank(r)} className={chip}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
