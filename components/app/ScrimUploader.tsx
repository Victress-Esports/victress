"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteScrimUploadAction, recordScrimUploadAction } from "@/app/a/dashboard/scrims/actions";
import { buttonClass } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";
import { GAME_LIST, getGame } from "@/content/games";
import { MAX_SCRIM_BYTES, SCRIM_EXTENSIONS } from "@/content/provenance";
import { supabaseBrowser } from "@/lib/supabase/client";

export type UploadRow = { id: string; game: string; original_name: string; size_bytes: number; created_at: string };

const mb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function ScrimUploader({ userId, games, rows }: { userId: string; games: string[]; rows: UploadRow[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const options = games.length ? games : GAME_LIST.map((g) => g.id);
  const [game, setGame] = useState(options[0]);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!(SCRIM_EXTENSIONS as readonly string[]).includes(ext)) return setMsg(`Supported file types: ${SCRIM_EXTENSIONS.map((e) => "." + e).join(", ")}.`);
    if (file.size > MAX_SCRIM_BYTES) return setMsg("That file is over 200 MB.");
    setBusy(true);
    setMsg("");
    try {
      const sb = supabaseBrowser();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("scrim-uploads").upload(path, file, { upsert: false, contentType: "application/octet-stream" });
      if (error) throw error;
      const r = await recordScrimUploadAction({ game: game as never, path, name: file.name });
      setMsg(r.message ?? "");
      if (r.ok) router.refresh();
    } catch {
      setMsg("Couldn't upload that file. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  function remove(id: string) {
    start(async () => {
      const r = await deleteScrimUploadAction(id);
      setMsg(r.message ?? "");
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Field id="scrim-game" label="Game">
        <select id="scrim-game" value={game} onChange={(e) => setGame(e.target.value)} className={inputClass}>
          {options.map((g) => (
            <option key={g} value={g}>
              {getGame(g)?.name ?? g}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#CF142B]" />
        <span>I took part in this practice. I understand the file may contain other players&apos; names, voice or chat, and I will not share it.</span>
      </label>
      <div>
        <input ref={input} id="scrim-file" type="file" accept={SCRIM_EXTENSIONS.map((e) => "." + e).join(",")} className="sr-only" disabled={!ack || busy} onChange={(e) => onFile(e.target.files?.[0])} />
        <label htmlFor="scrim-file" className={`${buttonClass("primary", "cursor-pointer")} ${!ack || busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy ? "Uploading…" : "Choose a file"}
        </label>
        <p className="mt-2 text-sm text-mute">Up to 200 MB. Files are stored privately and only you can open them. They are not analyzed.</p>
      </div>
      <FormMessage message={msg} />
      {rows.length ? (
        <ul className="flex flex-col gap-2">
          {rows.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{u.original_name}</p>
                <p className="text-sm text-mute">
                  {getGame(u.game)?.name ?? u.game} · {mb(u.size_bytes)} · stored privately · not analyzed
                </p>
              </div>
              <button type="button" onClick={() => remove(u.id)} disabled={pending} className={buttonClass("ghost", "min-h-11 px-3 text-sm")} aria-label={`Delete ${u.original_name}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-mute">No files yet.</p>
      )}
    </div>
  );
}
