"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMatchAction, removeMatchAction } from "@/app/a/dashboard/scrims/match-actions";
import { ProvenanceTag } from "@/components/app/ProvenanceTag";
import { buttonClass } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";
import { GAME_LIST, getGame } from "@/content/games";

export type MatchRow = { id: string; game: string; played_on: string; opponent: string | null; result: "win" | "loss" | "draw"; score: string | null; map: string | null; note: string | null };
const LABEL = { win: "Win", loss: "Loss", draw: "Draw" } as const;
const today = () => new Date().toISOString().slice(0, 10);

export function MatchLog({ rows, games }: { rows: MatchRow[]; games: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const options = games.length ? games : GAME_LIST.map((g) => g.id);
  const [game, setGame] = useState(options[0]);
  const [date, setDate] = useState(today());
  const [opponent, setOpponent] = useState("");
  const [result, setResult] = useState<"win" | "loss" | "draw">("win");
  const [score, setScore] = useState("");
  const [map, setMap] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const tally = rows.reduce((a, r) => ({ ...a, [r.result]: a[r.result] + 1 }), { win: 0, loss: 0, draw: 0 });

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await addMatchAction({ game: game as never, played_on: date, opponent, result, score, map, note });
      setMsg(r.message ?? "");
      if (r.ok) {
        setOpponent("");
        setScore("");
        setMap("");
        setNote("");
        router.refresh();
      }
    });
  }
  function remove(id: string) {
    start(async () => {
      await removeMatchAction(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {rows.length ? (
        <>
          <p className="flex flex-wrap items-center gap-3 text-sm text-mute" aria-label="Your logged results">
            <span>
              <span className="tnum font-bold text-white">{tally.win}</span> wins · <span className="tnum font-bold text-white">{tally.loss}</span> losses ·{" "}
              <span className="tnum font-bold text-white">{tally.draw}</span> draws, counted from the {rows.length} {rows.length === 1 ? "match" : "matches"} you logged
            </span>
            <ProvenanceTag source="self_reported" />
          </p>
          <ul className="flex flex-col gap-2">
            {rows.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {LABEL[m.result]}
                    {m.score ? ` · ${m.score}` : ""}
                    {m.opponent ? ` vs ${m.opponent}` : ""}
                  </p>
                  <p className="truncate text-sm text-mute">{[m.played_on, getGame(m.game)?.name ?? m.game, m.map, m.note].filter(Boolean).join(" · ")}</p>
                </div>
                <button type="button" onClick={() => remove(m.id)} disabled={pending} className={buttonClass("ghost", "min-h-11 px-3 text-sm")} aria-label={`Remove match ${m.played_on}${m.opponent ? " vs " + m.opponent : ""}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-mute">No matches logged yet. Add the practice matches you play.</p>
      )}

      <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
        <Field id="m-game" label="Game">
          <select id="m-game" value={game} onChange={(e) => setGame(e.target.value)} className={inputClass}>
            {options.map((g) => (
              <option key={g} value={g}>
                {getGame(g)?.name ?? g}
              </option>
            ))}
          </select>
        </Field>
        <Field id="m-date" label="Date">
          <input id="m-date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
        </Field>
        <Field id="m-result" label="Result">
          <select id="m-result" value={result} onChange={(e) => setResult(e.target.value as typeof result)} className={inputClass}>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="draw">Draw</option>
          </select>
        </Field>
        <Field id="m-score" label="Score (optional)" hint="For example 13-9.">
          <input id="m-score" value={score} maxLength={10} inputMode="numeric" onChange={(e) => setScore(e.target.value)} className={inputClass} />
        </Field>
        <Field id="m-opp" label="Opponent team (optional)" hint="A team or group name. Do not enter individual players' names.">
          <input id="m-opp" value={opponent} maxLength={60} onChange={(e) => setOpponent(e.target.value)} className={inputClass} />
        </Field>
        <Field id="m-map" label="Map (optional)">
          <input id="m-map" value={map} maxLength={40} onChange={(e) => setMap(e.target.value)} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field id="m-note" label="Note (optional)">
            <input id="m-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="flex items-center gap-4 sm:col-span-2">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Saving…" : "Log match"}
          </button>
          <FormMessage message={msg} />
        </div>
      </form>
    </div>
  );
}
