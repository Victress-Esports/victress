"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";
import { addStatEntryAction, deleteStatEntryAction } from "@/app/a/dashboard/actions";
import { GAMES, formatStat, type GameId } from "@/content/games";

export function StatForm({ games, defaultGame }: { games: string[]; defaultGame: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [game, setGame] = useState(games.includes(defaultGame) ? defaultGame : games[0]);
  const [season, setSeason] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const cfg = GAMES[game as GameId];

  function submit(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await addStatEntryAction({ game, season, metrics: values });
      setMsg(r.message ?? "");
      setOk(r.ok);
      if (r.ok) {
        setValues({});
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {games.length > 1 ? (
        <Field id="st-game" label="Game">
          <select
            id="st-game"
            className={inputClass}
            value={game}
            onChange={(e) => {
              setGame(e.target.value);
              setValues({});
              setMsg("");
            }}
          >
            {games.map((g) => (
              <option key={g} value={g}>
                {GAMES[g as GameId].name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field id="st-season" label="Season or period" hint="For example “Act 3” or “Fall 2026”. Leave blank for “Current”.">
        <input id="st-season" value={season} onChange={(e) => setSeason(e.target.value)} maxLength={40} placeholder="Current" className={inputClass} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {cfg.stats.map((f) => (
          <Field key={f.key} id={`st-${f.key}`} label={`${f.label}${f.suffix ? ` (${f.suffix})` : ""}`}>
            <input
              id={`st-${f.key}`}
              inputMode="decimal"
              type="number"
              min={f.min}
              max={f.max}
              step={f.decimals === 0 ? 1 : 1 / 10 ** f.decimals}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className={`${inputClass} tnum`}
            />
          </Field>
        ))}
      </div>

      <p className="text-sm text-mute">Stats are entered by you and shown as Self-reported.</p>
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full sm:w-auto")}>
        {pending ? "Saving…" : "Save stats"}
      </button>
      <FormMessage message={msg} ok={ok} />
    </form>
  );
}

export interface StatEntry {
  id: string;
  game: string;
  season: string;
  metrics: Record<string, number>;
  created_at: string;
}

export function StatHistory({ entries }: { entries: StatEntry[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (entries.length === 0) return <p className="text-mute">Your saved stats will show up here.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((e) => {
        const cfg = GAMES[e.game as GameId];
        if (!cfg) return null;
        const parts = cfg.stats.filter((f) => typeof e.metrics[f.key] === "number").map((f) => `${f.label} ${formatStat(f, e.metrics[f.key])}`);
        return (
          <li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface-2 p-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {cfg.name} <span className="font-normal text-mute">· {e.season}</span>
              </p>
              <p className="tnum mt-1 break-words text-sm text-mute">{parts.join(" · ")}</p>
              <p className="mt-1 text-xs text-mute">
                Self-reported · {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              aria-label={`Delete ${cfg.name} ${e.season} entry`}
              onClick={() =>
                start(async () => {
                  const r = await deleteStatEntryAction(e.id);
                  if (r.ok) router.refresh();
                })
              }
              className={buttonClass("ghost", "min-h-11 shrink-0 px-3 text-sm text-mute")}
            >
              Delete
            </button>
          </li>
        );
      })}
    </ul>
  );
}
