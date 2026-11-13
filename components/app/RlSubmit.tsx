"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRlDataAction, deleteRlMatchAction, saveRlIdentityAction, submitReplayAction } from "@/app/a/dashboard/scrims/rocket-league/actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";

// Platform names as Ballchasing reports them in replays. The player link path is preferred because it carries the platform exactly.
const PLATFORMS = [
  ["steam", "Steam"], ["epic", "Epic Games"], ["xbox", "Xbox"],
  ["ps4", "PlayStation (numeric ID)"], ["psynet", "PlayStation Network (psynet)"], ["switch", "Nintendo Switch"],
] as const;

export function RlIdentityForm({ saved }: { saved: { platform: string; id: string } | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const link = String(f.get("link") ?? "").trim();
        // A pasted player link carries the platform and the id. Otherwise the platform and id fields are used.
        const input = link ? { platform: "", id: link } : { platform: String(f.get("platform") ?? ""), id: String(f.get("id") ?? "") };
        start(async () => {
          const r = await saveRlIdentityAction(input);
          setOk(r.ok); setMsg(r.message ?? ""); if (r.ok) router.refresh();
        });
      }}
    >
      <Field id="link" label="Your Ballchasing player link (easiest)" hint="Open any replay you played in on ballchasing.com, click your own name, and copy the address of the page that opens. It looks like ballchasing.com/player/… and already contains your platform and ID.">
        <input id="link" name="link" maxLength={200} autoComplete="off" className={inputClass} placeholder="https://ballchasing.com/player/…" />
      </Field>
      <details className="rounded-xl border border-line px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold">Enter your platform and ID instead</summary>
        <div className="mt-4 flex flex-col gap-4">
          <Field id="platform" label="Platform" hint="Pick the platform Ballchasing shows for you. Not sure, or yours is not listed? Use the player link above.">
            <select id="platform" name="platform" defaultValue="" className={inputClass}>
              <option value="" disabled>Choose a platform</option>
              {PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field id="id" label="Player ID" hint="A Steam ID is 17 digits. An Epic ID is 32 letters and numbers. These are not your display names.">
            <input id="id" name="id" maxLength={64} autoComplete="off" className={inputClass} placeholder="Player ID" />
          </Field>
        </div>
      </details>
      <div><Button type="submit" disabled={pending}>{pending ? "Saving" : saved ? "Update my ID" : "Save my ID"}</Button></div>
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
      <Field id="link" label="Ballchasing replay link" hint="Paste the address of one replay page. The replay must be set to Unlisted or Public on Ballchasing (Edit, Visibility). Private replays cannot be read.">
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
