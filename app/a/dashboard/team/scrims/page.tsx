import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProvenanceTag } from "@/components/app/ProvenanceTag";
import { StatusChip } from "@/components/app/StatusChip";
import { DeleteTeamScrim, TeamSharingToggle } from "@/components/app/TeamScrims";
import { Section } from "@/components/ui/form";
import { RL_DATA_LABEL } from "@/lib/ballchasing/rl";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { loadMe } from "@/lib/me";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Team scrims | Victress", "Your team's private Rocket League scrims, from Ballchasing replays your roster submits.");

type Numbers = { score?: number; goals?: number; assists?: number; saves?: number; shots?: number };
const COLS = [["goals", "G"], ["assists", "A"], ["saves", "Sv"], ["shots", "Sh"], ["score", "Score"]] as const;
const n = (v: unknown) => (typeof v === "number" ? v : 0);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const KIND: Record<string, string> = { custom: "Private match", ranked: "Ranked", normal: "Casual", other: "Other mode" };

function NumberRow({ label, v, emphasis = false }: { label: string; v: Numbers; emphasis?: boolean }) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className={`max-w-[9rem] truncate py-2 pr-2 text-left font-normal ${emphasis ? "font-semibold text-white" : "text-mute"}`}>{label}</th>
      {COLS.map(([k]) => <td key={k} className={`py-2 pl-2 text-right tabular-nums ${emphasis ? "font-semibold" : ""}`}>{n(v[k])}</td>)}
    </tr>
  );
}

export default async function TeamScrimsPage() {
  if (!scrimUploadsEnabled()) notFound();
  const { sb, user, team } = await loadMe();

  if (!team) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="font-display text-4xl font-bold">Team scrims</h1>
        <p className="text-mute">Team scrims are visible to a team&apos;s roster only. Join or create a team first.</p>
        <p><Link href="/dashboard/team" className="underline underline-offset-4">Go to Team</Link></p>
      </div>
    );
  }

  const [{ data: scrims }, { data: lines }, { data: sharing }, { data: roster }] = await Promise.all([
    sb.from("team_scrims").select("id, played_at, duration_seconds, queue_kind, side, result, goals_for, goals_against, overtime, side_players, opponent_label, team_totals, opponent_totals, submitted_by, submitted_via").eq("team_id", team.id).order("played_at", { ascending: false }).limit(50),
    sb.from("team_scrim_lines").select("scrim_id, profile_id, stats"),
    sb.from("team_stat_sharing").select("team_id").eq("profile_id", user.id).eq("team_id", team.id).maybeSingle(),
    sb.rpc("team_roster"),
  ]);
  const names = new Map((roster ?? []).map((m) => [m.profile_id, m.display_name || (m.handle ? `@${m.handle}` : "Teammate")]));
  const byScrim = new Map<string, { profile_id: string; stats: Numbers }[]>();
  for (const l of lines ?? []) byScrim.set(l.scrim_id, [...(byScrim.get(l.scrim_id) ?? []), { profile_id: l.profile_id, stats: l.stats as Numbers }]);
  const isOwner = team.owner_id === user.id;
  const list = scrims ?? [];
  const wins = list.filter((s) => s.result === "win").length, losses = list.filter((s) => s.result === "loss").length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm"><Link href="/dashboard/team" className="text-mute hover:text-white">{team.name}</Link></p>
        <h1 className="font-display text-4xl font-bold">Team scrims</h1>
        <p className="mt-2 text-mute">Rocket League scrims your roster added from Ballchasing replays. Only {team.name}&apos;s current roster can see this page. Opponents are shown as totals only, never by name or ID.</p>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-mute"><ProvenanceTag source="api" /> {RL_DATA_LABEL}. Nothing here is typed in except the optional opponent label.</p>
      </div>

      <Section title="Your numbers on this team" line={sharing ? "You share your numbers with your team. They appear in scrims submitted while sharing is on." : "Off. Your team sees results and side totals, but not your individual numbers."}>
        <TeamSharingToggle on={!!sharing} />
        <p className="mt-2 text-sm text-mute">Turning it off removes your individual numbers from every scrim of this team. Leaving the team does the same. Teammates&apos; numbers are held back from a scrim when showing them would let someone work out the one player who does not share.</p>
      </Section>

      <Section title={list.length ? `${list.length} scrim${list.length === 1 ? "" : "s"}` : "No scrims yet"} line={list.length ? `${wins} ${wins === 1 ? "win" : "wins"}, ${losses} ${losses === 1 ? "loss" : "losses"}. Newest first. Results describe those games in their own context.` : "When a teammate submits a replay and chooses to add it to the team, it appears here for the whole roster. Use /scrim submit with team set to True in Discord, or the Rocket League page."}>
        {list.length ? (
          <ul className="flex flex-col gap-4">
            {list.map((s) => {
              const shared = byScrim.get(s.id) ?? [];
              const totals = s.team_totals as Numbers, opp = s.opponent_totals as Numbers;
              return (
                <li key={s.id} className="rounded-2xl border border-line bg-surface-2 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip tone={s.result === "win" ? "on" : "muted"}>{s.result === "win" ? "W" : s.result === "loss" ? "L" : "No result"}</StatusChip>
                    <span className="text-xl font-semibold tabular-nums">{s.goals_for} to {s.goals_against}</span>
                    {s.overtime ? <span className="text-sm text-mute">OT</span> : null}
                    <StatusChip>{s.side === "blue" ? "Blue" : "Orange"}</StatusChip>
                  </div>
                  <p className="mt-2 font-semibold">vs {s.opponent_label ?? <span className="font-normal text-mute">opponent not named</span>}</p>
                  <p className="mt-1 text-sm text-mute">
                    {new Date(s.played_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {KIND[s.queue_kind] ?? s.queue_kind} · {mmss(s.duration_seconds)} · {s.side_players}v{s.side_players} · from {s.submitted_via === "discord" ? "Discord" : "the website"}
                  </p>
                  <table className="mt-3 w-full text-sm">
                    <caption className="sr-only">Team totals and shared individual numbers</caption>
                    <thead>
                      <tr className="text-xs text-mute">
                        <th scope="col" className="pb-1 text-left font-normal"><span className="sr-only">Who</span></th>
                        {COLS.map(([k, label]) => <th key={k} scope="col" className="pb-1 pl-2 text-right font-normal">{label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <NumberRow label="Team" v={totals} emphasis />
                      {shared.map((l) => <NumberRow key={l.profile_id} label={l.profile_id === user.id ? "You" : names.get(l.profile_id) ?? "Teammate"} v={l.stats} />)}
                      <NumberRow label="Opponent" v={opp} />
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-mute">
                    {shared.length ? `${shared.length} of ${s.side_players} players share individual numbers.` : "No individual numbers shown: they appear only for teammates who share them."}
                  </p>
                  {isOwner || s.submitted_by === user.id ? <div className="mt-2"><DeleteTeamScrim id={s.id} /></div> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Section>
    </div>
  );
}
