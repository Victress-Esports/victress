"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRlDataAction, deleteRlMatchAction, saveRlIdentityAction, submitReplayAction } from "@/app/a/dashboard/scrims/rocket-league/actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";

const PLATFORMS = [["steam", "Steam"], ["epic", "Epic Games"], ["xbox", "Xbox"], ["ps4", "PlayStation"], ["switch", "Nintendo Switch"]] as const;

export function RlIdentityForm({ saved }: { saved: { platform: string; id: string } | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await saveRlIdentityAction({ platform: String(f.get("platform") ?? ""), id: String(f.get("id") ?? "") });
          setOk(r.ok); setMsg(r.message ?? ""); if (r.ok) router.refresh();
        });
      }}
    >
      <Field id="platform" label="Platform">
        <select id="platform" name="platform" defaultValue={saved?.platform ?? "steam"} className={inputClass}>
          {PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <Field id="id" label="Player ID" hint="Easiest: open your own page on ballchasing.com and paste the link to it (ballchasing.com/player/…). It holds both your platform and your ID.">
        <input id="id" name="id" required maxLength={200} defaultValue={saved?.id ?? ""} autoComplete="off" className={inputClass} placeholder="Player ID or Ballchasing player link" />
      </Field>
      <div><Button type="submit" disabled={pending}>{pending ? "Saving" : saved ? "Update" : "Save"}</Button></div>
      <FormMessage message={msg} ok={ok} />
    </form>
  );
}

export function RlSubmitForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setMsg("Reading the replay.");
        start(async () => {
          const r = await submitReplayAction({ link: String(f.get("link") ?? ""), authorized: f.get("authorized") === "on", consent: f.get("consent") === "on" });
          setOk(r.ok); setMsg(r.message ?? ""); if (r.ok) { form.reset(); router.refresh(); }
        });
      }}
    >
      <Field id="link" label="Ballchasing replay link" hint="The replay must be set to unlisted or public on Ballchasing. Private replays cannot be read.">
        <input id="link" name="link" required maxLength={300} autoComplete="off" className={inputClass} placeholder="https://ballchasing.com/replay/…" />
      </Field>
      <label className="flex items-start gap-3 text-sm text-mute">
        <input type="checkbox" name="authorized" required className="mt-1 h-5 w-5" />
        <span>I played in this replay or I am allowed to submit it, and submitting it does not break anyone&apos;s rights or the rules of the event it came from.</span>
      </label>
      <label className="flex items-start gap-3 text-sm text-mute">
        <input type="checkbox" name="consent" required className="mt-1 h-5 w-5" />
        <span>I agree that Victress reads this replay from Ballchasing and saves my own numbers from it, privately to my account. Other players in the replay are not named or identified.</span>
      </label>
      <div><Button type="submit" disabled={pending}>{pending ? "Reading" : "Submit replay"}</Button></div>
      <FormMessage message={msg} ok={ok} />
    </form>
  );
}

export function RlDeleteAll() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary" type="button" disabled={pending}
        onClick={() => { if (!confirm("Delete your saved Rocket League ID, all saved games and submission history? This cannot be undone.")) return; start(async () => { const r = await deleteRlDataAction(); setMsg(r.message ?? ""); if (r.ok) router.refresh(); }); }}
      >
        Delete all my Rocket League data
      </Button>
      <FormMessage message={msg} />
    </div>
  );
}

export function RlDeleteMatch({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" type="button" disabled={pending} onClick={() => { if (!confirm("Delete this game?")) return; start(async () => { const r = await deleteRlMatchAction(id); if (r.ok) router.refresh(); }); }}>
      Delete this game
    </Button>
  );
}
