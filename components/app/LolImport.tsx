"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLolDataAction, deleteLolMatchAction, importLolAction } from "@/app/a/dashboard/scrims/lol/actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";

const ROUTES = [
  ["americas", "Americas (NA, BR, LAN, LAS)"],
  ["europe", "Europe (EUW, EUNE, TR, RU)"],
  ["asia", "Asia (KR, JP)"],
  ["sea", "Southeast Asia and Oceania (OCE, SG, PH, TH, TW, VN)"],
] as const;

export function LolImportForm({ linked }: { linked: { name: string; tag: string; region: string } | null }) {
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
        setMsg("Importing. This can take up to a minute.");
        start(async () => {
          const r = await importLolAction({ riotId: String(f.get("riotId") ?? ""), route: String(f.get("route")) as never, count: Number(f.get("count")) });
          setOk(r.ok); setMsg(r.message ?? ""); if (r.ok) router.refresh();
        });
      }}
    >
      <Field id="riotId" label="Riot ID" hint="The name and tag shown in the League client, for example Name#EUW. Not your login name.">
        <input id="riotId" name="riotId" required maxLength={30} defaultValue={linked ? `${linked.name}#${linked.tag}` : ""} readOnly={!!linked} autoComplete="off" className={inputClass} placeholder="Name#TAG" />
      </Field>
      <Field id="route" label="Region">
        <select id="route" name="route" defaultValue={linked?.region ?? "americas"} disabled={!!linked} className={inputClass}>
          {ROUTES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      {linked ? <input type="hidden" name="route" value={linked.region} /> : null}
      <Field id="count" label="How many recent matches">
        <select id="count" name="count" defaultValue="20" className={inputClass}>
          {[10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Field>
      <div><Button type="submit" disabled={pending}>{pending ? "Importing" : linked ? "Import new matches" : "Link Riot ID and import"}</Button></div>
      <FormMessage message={msg} ok={ok} />
    </form>
  );
}

export function LolDeleteAll() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary" disabled={pending} type="button"
        onClick={() => { if (!confirm("Delete your linked Riot ID, all imported matches and import history? This cannot be undone.")) return; start(async () => { const r = await deleteLolDataAction(); setMsg(r.message ?? ""); if (r.ok) router.refresh(); }); }}
      >
        Delete all my League of Legends data
      </Button>
      <FormMessage message={msg} />
    </div>
  );
}

export function LolDeleteMatch({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" type="button" disabled={pending} onClick={() => { if (!confirm("Delete this match?")) return; start(async () => { const r = await deleteLolMatchAction(id); if (r.ok) router.push("/dashboard/scrims/lol"); }); }}>
      Delete this match
    </Button>
  );
}
