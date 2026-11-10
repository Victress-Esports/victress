"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addHighlightAction, removeHighlightAction } from "@/app/a/dashboard/resume/actions";
import { buttonClass } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";
import { GAME_LIST, getGame } from "@/content/games";

export type HighlightRow = { id: string; game: string; title: string; url: string; note: string | null };

function GameSelect({ id, value, onChange, options }: { id: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {options.map((g) => (
        <option key={g} value={g}>
          {getGame(g)?.name ?? g}
        </option>
      ))}
    </select>
  );
}

export function HighlightSection({ rows, games }: { rows: HighlightRow[]; games: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const options = games.length ? games : GAME_LIST.map((g) => g.id);
  const [game, setGame] = useState(options[0]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await addHighlightAction({ game: game as never, title, url, note });
      setMsg(r.message ?? "");
      if (r.ok) {
        setTitle("");
        setUrl("");
        setNote("");
        router.refresh();
      }
    });
  }
  function remove(id: string) {
    start(async () => {
      await removeHighlightAction(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {rows.length ? (
        <ul className="flex flex-col gap-2">
          {rows.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{h.title}</p>
                <p className="truncate text-sm text-mute">
                  {getGame(h.game)?.name ?? h.game}
                  {h.note ? ` · ${h.note}` : ""}
                </p>
                <a href={h.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-block py-1 text-sm underline">
                  Open link
                </a>
              </div>
              <button type="button" onClick={() => remove(h.id)} disabled={pending} className={buttonClass("ghost", "min-h-11 px-3 text-sm")} aria-label={`Remove ${h.title}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-mute">No highlights yet. Link a clip you host elsewhere.</p>
      )}
      <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
        <Field id="h-title" label="Title">
          <input id="h-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
        </Field>
        <Field id="h-game" label="Game">
          <GameSelect id="h-game" value={game} onChange={setGame} options={options} />
        </Field>
        <Field id="h-url" label="Link" hint="A full https:// link to a clip you host elsewhere. Victress does not host video.">
          <input id="h-url" type="url" inputMode="url" value={url} maxLength={300} onChange={(e) => setUrl(e.target.value)} className={inputClass} required />
        </Field>
        <Field id="h-note" label="Note (optional)">
          <input id="h-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </Field>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            Add highlight
          </button>
          <FormMessage message={msg} />
        </div>
      </form>
    </div>
  );
}
