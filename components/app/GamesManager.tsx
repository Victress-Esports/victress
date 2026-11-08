"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { FormMessage, inputClass } from "@/components/ui/form";
import { removeGameAction, saveGameAction, setPrimaryGameAction } from "@/app/a/dashboard/actions";
import { GAME_LIST, GAMES, type GameId } from "@/content/games";

export interface PlayerGame {
  game: string;
  role: string | null;
  rank: string | null;
  is_primary: boolean;
}

export function GamesManager({ games }: { games: PlayerGame[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? "" : (r.message ?? "Something went wrong."));
      if (r.ok) router.refresh();
    });

  const owned = new Set(games.map((g) => g.game));
  const addable = GAME_LIST.filter((g) => !owned.has(g.id));

  return (
    <div className="flex flex-col gap-5">
      {games.length === 0 ? <p className="text-mute">Add the games you play.</p> : null}

      <ul className="flex flex-col gap-3">
        {games.map((pg) => {
          const cfg = GAMES[pg.game as GameId];
          if (!cfg) return null;
          return (
            <li key={pg.game} className="rounded-2xl border border-line bg-surface-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">
                  {cfg.name}
                  {pg.is_primary ? <span className="ml-2 rounded-full bg-crimson px-2.5 py-0.5 text-xs font-semibold">Primary</span> : null}
                </h3>
                <div className="flex gap-1">
                  {!pg.is_primary ? (
                    <button type="button" disabled={pending} onClick={() => run(() => setPrimaryGameAction(pg.game))} className={buttonClass("ghost", "min-h-11 px-3 text-sm")}>
                      Make primary
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeGameAction(pg.game))}
                    aria-label={`Remove ${cfg.name}`}
                    className={buttonClass("ghost", "min-h-11 px-3 text-sm text-mute")}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {cfg.roles.length ? (
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">
                    {cfg.roleLabel}
                    <select
                      className={inputClass}
                      value={pg.role ?? ""}
                      disabled={pending}
                      onChange={(e) => run(() => saveGameAction({ game: cfg.id, role: e.target.value || null, rank: pg.rank }))}
                    >
                      <option value="">Not set</option>
                      {cfg.roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  Rank
                  <select
                    className={inputClass}
                    value={pg.rank ?? ""}
                    disabled={pending}
                    onChange={(e) => run(() => saveGameAction({ game: cfg.id, role: pg.role, rank: e.target.value || null }))}
                  >
                    <option value="">Not set</option>
                    {cfg.ranks.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          );
        })}
      </ul>

      {addable.length ? (
        <div>
          <p className="mb-2 text-sm font-semibold">Add a game</p>
          <div className="flex flex-wrap gap-2">
            {addable.map((g) => (
              <button key={g.id} type="button" disabled={pending} onClick={() => run(() => saveGameAction({ game: g.id }))} className={buttonClass("secondary", "min-h-11 px-4 text-sm")}>
                + {g.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <FormMessage message={msg} />
    </div>
  );
}
