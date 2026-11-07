"use client";

import { useState } from "react";
import { SampleTag } from "@/components/marketing/SampleTag";
import { GAME_LIST, type GameId } from "@/content/games";

const chip =
  "inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold transition-colors hover:border-white focus-visible:border-white aria-pressed:border-crimson aria-pressed:bg-crimson";

const defaultRank = (ranks: string[]) => ranks[Math.floor(ranks.length / 2)];

/** Six large tiles. Tapping one swaps the sample profile's roles and ranks for that game's real ones. */
export function GamePicker() {
  const [gameId, setGameId] = useState<GameId>("VALORANT");
  const game = GAME_LIST.find((g) => g.id === gameId)!;
  const [role, setRole] = useState<string | null>(game.roles[0] ?? null);
  const [rank, setRank] = useState<string>(defaultRank(game.ranks));

  function pick(id: GameId) {
    const g = GAME_LIST.find((x) => x.id === id)!;
    setGameId(id);
    setRole(g.roles[0] ?? null);
    setRank(defaultRank(g.ranks));
  }

  return (
    <div>
      <div role="group" aria-label="Pick a game" className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {GAME_LIST.map((g, idx) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={g.id === gameId}
            onClick={() => pick(g.id)}
            // VALORANT and Counter-Strike 2 are the featured games: larger tiles on wide screens.
            className={`lift flex min-h-28 items-end rounded-3xl border border-line bg-surface p-5 text-left font-display text-2xl font-bold leading-tight transition-colors hover:border-white focus-visible:border-white aria-pressed:border-crimson aria-pressed:bg-crimson sm:min-h-36 ${
              idx < 2 ? "sm:col-span-3" : "sm:col-span-2"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <article aria-label="Sample profile for the selected game" className="mt-6 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-2xl font-bold">{game.name}</p>
          <SampleTag />
        </div>

        <div key={gameId} className="chip-in">
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-mute">{game.roles.length ? game.roleLabel : "Role"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {game.roles.length ? (
              game.roles.map((r) => (
                <button key={r} type="button" aria-pressed={r === role} onClick={() => setRole(r)} className={chip}>
                  {r}
                </button>
              ))
            ) : (
              <span className="inline-flex min-h-10 items-center rounded-full bg-surface-2 px-4 text-sm font-semibold text-mute">No fixed roles</span>
            )}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-mute">Rank</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {game.ranks.map((r) => (
              <button key={r} type="button" aria-pressed={r === rank} onClick={() => setRank(r)} className={chip}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
