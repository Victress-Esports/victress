"use client";

import { useState } from "react";
import { SAMPLE } from "@/components/marketing/sampleData";
import { SampleTag } from "@/components/marketing/SampleTag";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GAME_LIST, type GameId } from "@/content/games";

const chip =
  "inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[13px] font-semibold text-white transition-colors hover:border-white focus-visible:border-white aria-pressed:border-crimson aria-pressed:bg-crimson";

/**
 * Hero: title, one factual sentence, the two sign-in links and a sample profile card.
 * The card is a labeled Sample. The chips switch its game and rank so a visitor can see how a profile reads.
 */
export function HeroClaim({ title, sentence, primary, secondary }: { title: string; sentence: string; primary: string; secondary: string }) {
  const [gameId, setGameId] = useState<GameId>("VALORANT");
  const [rank, setRank] = useState<string>("Diamond");
  const game = GAME_LIST.find((g) => g.id === gameId)!;
  const sample = SAMPLE[gameId];
  const statLabel = (key: string) => game.stats.find((s) => s.key === key)?.label ?? key;

  return (
    <section>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_30rem] lg:gap-16 lg:pt-20">
        <div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] min-[400px]:text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
          <p className="mt-5 max-w-md text-balance text-lg text-mute sm:text-xl">{sentence}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/platform">{primary}</ButtonLink>
            <ButtonLink href="/design-partner" variant="secondary">
              {secondary}
            </ButtonLink>
          </div>
        </div>

        <Card as="article" aria-label="Sample profile preview" padded={false} className="mx-auto w-full max-w-md overflow-hidden lg:max-w-none">
          <div className="p-5 pb-4">
            <header className="flex items-center gap-4">
              <div aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface-2 font-display text-2xl font-bold text-coral">
                Y
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold">yourname</p>
                <p className="truncate text-sm text-mute">victress.gg/yourname</p>
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
            <p className="mt-3 text-[11px] text-mute">Self-reported</p>
          </div>

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
        </Card>
      </div>
    </section>
  );
}
