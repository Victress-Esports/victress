import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LolDeleteAll, LolImportForm } from "@/components/app/LolImport";
import { MiniChart } from "@/components/app/MiniChart";
import { ProvenanceTag } from "@/components/app/ProvenanceTag";
import { Section } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { recordFunnelEvent } from "@/lib/funnel";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { privateMetadata } from "@/lib/seo";
import { riotClient } from "@/lib/riot";
import { computeTrend, type TrendRow } from "@/lib/riot/trends";

export const maxDuration = 60;
export const metadata: Metadata = privateMetadata("League of Legends imports | Victress", "Private League of Legends match history imported with the Riot API.");

const KINDS = [["all", "All"], ["ranked", "Ranked"], ["normal", "Normal"], ["custom", "Custom"], ["other", "Other modes"]] as const;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

type Row = TrendRow & { id: string; queue_label: string; me: TrendRow["me"] & { role: string; level: number; gold: number } };

export default async function LolPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { sb, user } = await requireUser();
  if (!scrimUploadsEnabled()) notFound();
  const { data: approved } = await sb.rpc("upload_allowed");
  if (approved !== true) notFound();
  const wanted = (await searchParams).kind;
  const kind = KINDS.some(([k]) => k === wanted) ? (wanted as string) : "all";

  const [{ data: acct }, { data: jobs }, { data: rows }] = await Promise.all([
    sb.from("game_accounts").select("display_name, tag, region, last_imported_at, ownership_verified").eq("profile_id", user.id).eq("game", "LOL").maybeSingle(),
    sb.from("import_jobs").select("id, status, imported, skipped_existing, skipped_custom, failed_matches, error_message, created_at").eq("profile_id", user.id).eq("game", "LOL").order("created_at", { ascending: false }).limit(5),
    sb.from("game_matches").select("id, queue_kind, queue_label, played_at, duration_seconds, result, me").eq("profile_id", user.id).eq("game", "LOL").order("played_at", { ascending: false }).limit(200),
  ]);
  const all = (rows ?? []) as Row[];
  const shown = all.filter((r) => kind === "all" || r.queue_kind === kind);
  const trend = computeTrend(all, kind);
  if (trend) await recordFunnelEvent("first_analysis_viewed", user.id, { game: "LOL" });
  const configured = riotClient() !== null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm"><Link href="/dashboard/scrims" className="text-mute hover:text-white">Scrim Intelligence</Link></p>
        <h1 className="font-display text-4xl font-bold">League of Legends</h1>
        <p className="mt-2 text-mute">Your match history, imported through the Riot API and kept private to you. Numbers are shown with their queue and role. They describe those games, not how good you are.</p>
        <p className="mt-3 flex items-center gap-3 text-sm text-mute"><ProvenanceTag source="api" /> Obtained through the Riot API. Nothing here is typed in.</p>
      </div>

      <Section title={acct ? "Your Riot ID" : "Link your Riot ID"} line={acct ? `${acct.display_name}#${acct.tag}, ${acct.region}. Ownership is not verified: Victress takes the Riot ID you enter at its word.` : "Enter your Riot ID to import recent matches. Only you can see what is imported."}>
        {configured ? (
          <LolImportForm linked={acct ? { name: acct.display_name, tag: acct.tag, region: acct.region } : null} />
        ) : (
          <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">Riot import is not configured on this server.</p>
        )}
        {jobs?.[0] ? (
          <p className="mt-4 text-sm text-mute">
            Last import: {jobs[0].status === "succeeded" ? "finished" : jobs[0].status === "failed" ? "failed" : "running"}, {new Date(jobs[0].created_at).toLocaleString("en-US")}.
            {jobs[0].status === "failed" || jobs[0].error_message ? ` ${jobs[0].error_message ?? ""}` : ` ${jobs[0].imported} imported, ${jobs[0].skipped_existing} already stored${jobs[0].skipped_custom ? `, ${jobs[0].skipped_custom} custom games not stored` : ""}.`}
          </p>
        ) : null}
      </Section>

      <nav aria-label="Queue" className="flex flex-wrap gap-2">
        {KINDS.map(([k, label]) => (
          <Link key={k} href={`/dashboard/scrims/lol?kind=${k}`} aria-current={k === kind ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${k === kind ? "border-white text-white" : "border-line text-mute hover:text-white"}`}>
            {label}
          </Link>
        ))}
      </nav>

      <Section title="Trends" line={kind === "all" ? "Last 30 games across queues. Choose a queue above to compare like with like." : `Last 30 ${kind} games. Remakes are left out.`}>
        {trend ? (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[["Games", String(trend.games)], ["Win rate", pct(trend.winRate)], ["KDA", trend.kda.toFixed(2)], ["CS per minute", trend.csPerMin.toFixed(1)], ["Vision per minute", trend.visionPerMin.toFixed(2)]].map(([t, v]) => (
                <div key={t}><dt className="text-sm text-mute">{t}</dt><dd className="font-display text-2xl font-bold">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div><p className="mb-1 text-sm font-semibold">KDA per game, oldest to newest</p><MiniChart values={trend.series.map((s) => s.kda)} label="KDA per game" /></div>
              <div><p className="mb-1 text-sm font-semibold">CS per minute per game</p><MiniChart values={trend.series.map((s) => s.csPerMin)} label="CS per minute per game" /></div>
            </div>
            {trend.topChampions.length ? <p className="mt-4 text-sm text-mute">Most played: {trend.topChampions.map((c) => `${c.champion} (${c.games})`).join(", ")}.</p> : null}
            {trend.games < 10 ? <p className="mt-2 text-sm text-mute">With fewer than 10 games these averages move a lot from one game to the next.</p> : null}
          </>
        ) : <p className="text-mute">No matches to show for this queue yet.</p>}
      </Section>

      <Section title="Matches" line={`${shown.length} shown, newest first.`}>
        {shown.length ? (
          <ul className="divide-y divide-line">
            {shown.slice(0, 100).map((m) => (
              <li key={m.id}>
                <Link href={`/dashboard/scrims/lol/${m.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:text-coral">
                  <span className="font-semibold">{m.me.champion} <span className="font-normal text-mute">{m.me.role === "NONE" ? "" : m.me.role.toLowerCase()}</span></span>
                  <span className={m.result === "win" ? "text-white" : "text-mute"}>{m.result === "win" ? "Win" : m.result === "loss" ? "Loss" : "Remake"}</span>
                  <span>{m.me.kills}/{m.me.deaths}/{m.me.assists}</span>
                  <span className="text-mute">{m.me.cs} CS</span>
                  <span className="text-mute">{mmss(m.duration_seconds)}</span>
                  <span className="text-sm text-mute">{m.queue_label}, {new Date(m.played_at).toLocaleDateString("en-US")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-mute">Nothing imported yet.</p>}
      </Section>

      {acct || all.length ? (
        <Section title="Your data" line="Delete everything Victress holds from Riot for you, at any time. Deleting the linked Riot ID also deletes its matches.">
          <LolDeleteAll />
        </Section>
      ) : null}
    </div>
  );
}
