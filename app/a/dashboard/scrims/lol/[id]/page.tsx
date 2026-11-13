import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { LolDeleteMatch } from "@/components/app/LolImport";
import { MiniChart } from "@/components/app/MiniChart";
import { ProvenanceTag } from "@/components/app/ProvenanceTag";
import { Section } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { lolImportEnabled } from "@/lib/dashboard";
import { privateMetadata } from "@/lib/seo";
import type { CompactTimeline, Slot } from "@/lib/riot/normalize";

export const metadata: Metadata = privateMetadata("Match detail | Victress", "A private League of Legends match.");

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const n = (v: number) => v.toLocaleString("en-US");

type Detail = {
  id: string; queue_label: string; queue_kind: string; played_at: string; duration_seconds: number; game_version: string | null; result: string;
  me: Slot & { items: number[] }; participants: Slot[]; objectives: Record<string, Record<string, { first: boolean; kills: number }>>; timeline: CompactTimeline | null;
};

export default async function LolMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success || !lolImportEnabled()) notFound();
  const { sb, user } = await requireUser();
  const { data } = await sb.from("game_matches").select("id, queue_label, queue_kind, played_at, duration_seconds, game_version, result, me, participants, objectives, timeline").eq("id", id).eq("profile_id", user.id).eq("game", "LOL").maybeSingle();
  if (!data) notFound();
  const m = data as unknown as Detail;
  const minutes = m.duration_seconds / 60;
  const myTeam = m.me.team;
  const tl = m.timeline;
  const lead = tl ? tl.frames.map((f) => (myTeam === 100 ? f.blue - f.red : f.red - f.blue)) : [];
  const slotName = (s: number) => { const p = m.participants.find((x) => x.slot === s); return s === m.me.slot ? "You" : p ? `${p.champion}` : `Player ${s}`; };
  const objectiveKeys = ["baron", "dragon", "riftHerald", "horde", "tower", "inhibitor"];
  const sideOf = (team: 100 | 200) => (team === 100 ? "blue" : "red");
  const rows = (team: 100 | 200) => m.participants.filter((p) => p.team === team).sort((a, b) => a.slot - b.slot);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm"><Link href="/dashboard/scrims/lol" className="text-mute hover:text-white">League of Legends</Link></p>
        <h1 className="font-display text-4xl font-bold">{m.me.champion} <span className="text-mute">{m.result === "win" ? "Win" : m.result === "loss" ? "Loss" : "Remake"}</span></h1>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-mute">
          <ProvenanceTag source="api" />
          <span>{m.queue_label} ({m.queue_kind})</span><span>{mmss(m.duration_seconds)}</span><span>{new Date(m.played_at).toLocaleString("en-US")}</span>{m.game_version ? <span>Patch {m.game_version.split(".").slice(0, 2).join(".")}</span> : null}
        </p>
      </div>

      <Section title="Your game" line={`${m.me.role === "NONE" ? "Role not reported" : m.me.role.toLowerCase()}, level ${m.me.level}.`}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[["KDA", `${m.me.kills}/${m.me.deaths}/${m.me.assists}`], ["KDA ratio", ((m.me.kills + m.me.assists) / Math.max(1, m.me.deaths)).toFixed(2)], ["CS", `${m.me.cs} (${(m.me.cs / minutes).toFixed(1)}/min)`], ["Gold", `${n(m.me.gold)} (${n(Math.round(m.me.gold / minutes))}/min)`],
            ["Damage to champions", `${n(m.me.damage)}`], ["Damage taken", n(m.me.damageTaken)], ["Vision score", `${m.me.vision}`], ["Wards", `${m.me.wardsPlaced} placed, ${m.me.wardsKilled} cleared, ${m.me.controlWards} control`]].map(([t, v]) => (
            <div key={t}><dt className="text-sm text-mute">{t}</dt><dd className="font-semibold">{v}</dd></div>
          ))}
        </dl>
      </Section>

      <Section title="Objectives" line="Team totals for this game.">
        <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm">
          <thead><tr className="text-mute"><th className="py-2 pr-4 font-semibold">Team</th>{objectiveKeys.map((k) => <th key={k} className="py-2 pr-4 font-semibold capitalize">{k === "riftHerald" ? "Herald" : k === "horde" ? "Grubs" : k}</th>)}</tr></thead>
          <tbody>{([myTeam, myTeam === 100 ? 200 : 100] as const).map((t, i) => (
            <tr key={t} className="border-t border-line"><td className="py-2 pr-4 font-semibold">{i === 0 ? "Your team" : "Other team"}</td>{objectiveKeys.map((k) => <td key={k} className="py-2 pr-4">{m.objectives?.[sideOf(t)]?.[k]?.kills ?? 0}</td>)}</tr>
          ))}</tbody>
        </table></div>
      </Section>

      <Section title="Timeline" line={tl ? "Gold lead of your team over the other team, by minute. Above the line means ahead." : "No timeline was stored for this match."}>
        {tl ? (
          <>
            <MiniChart values={lead} label="Team gold lead over time" zero />
            <p className="mt-2 text-sm text-mute">Final lead {lead.length ? `${lead[lead.length - 1] >= 0 ? "+" : ""}${n(lead[lead.length - 1])}` : "none"} gold. Your gold {n(tl.frames[tl.frames.length - 1]?.gold ?? 0)}, CS {tl.frames[tl.frames.length - 1]?.cs ?? 0}.</p>
            <h3 className="mt-6 font-semibold">Key events</h3>
            <ul className="mt-2 max-h-80 overflow-y-auto text-sm">
              {tl.events.slice(0, 200).map((e, i) => (
                <li key={i} className="flex gap-3 border-t border-line py-1.5 first:border-t-0">
                  <span className="w-12 shrink-0 text-mute">{mmss(e.t)}</span>
                  <span>{e.type === "kill" ? `${slotName(e.killer ?? 0)} defeated ${slotName(e.victim ?? 0)}` : e.type === "monster" ? `${e.team === myTeam ? "Your team" : "Other team"} took ${(e.what ?? "an objective").replaceAll("_", " ").toLowerCase()}` : `${e.team === myTeam ? "Other team lost" : "Your team lost"} a ${(e.what ?? "building").replaceAll("_", " ").toLowerCase()}`}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Section>

      <Section title="All players" line="Everyone in the match as anonymous slots. Other players' names and ids are never stored.">
        {[myTeam, myTeam === 100 ? 200 : 100].map((t, i) => (
          <div key={t} className="mb-4 overflow-x-auto last:mb-0">
            <p className="mb-1 text-sm font-semibold">{i === 0 ? "Your team" : "Other team"}</p>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead><tr className="text-mute"><th className="py-1 pr-3">Champion</th><th className="pr-3">KDA</th><th className="pr-3">CS</th><th className="pr-3">Gold</th><th className="pr-3">Damage</th><th>Vision</th></tr></thead>
              <tbody>{rows(t as 100 | 200).map((p) => (
                <tr key={p.slot} className={`border-t border-line ${p.slot === m.me.slot ? "font-semibold text-white" : "text-mute"}`}>
                  <td className="py-1.5 pr-3">{p.champion}{p.slot === m.me.slot ? " (you)" : ""}</td><td className="pr-3">{p.kills}/{p.deaths}/{p.assists}</td><td className="pr-3">{p.cs}</td><td className="pr-3">{n(p.gold)}</td><td className="pr-3">{n(p.damage)}</td><td>{p.vision}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}
      </Section>

      <div><LolDeleteMatch id={m.id} /></div>
    </div>
  );
}
