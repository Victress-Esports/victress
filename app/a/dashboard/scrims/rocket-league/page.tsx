import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProvenanceTag } from "@/components/app/ProvenanceTag";
import { RlDeleteAll, RlDeleteMatch, RlIdentityForm, RlSubmitForm } from "@/components/app/RlSubmit";
import { Section } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { ballchasingClient } from "@/lib/ballchasing";
import { RL_DATA_LABEL, platformLabel } from "@/lib/ballchasing/rl";
import { summarizeRl, type RlRow } from "@/lib/ballchasing/summary";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { privateMetadata } from "@/lib/seo";

export const maxDuration = 60;
export const metadata: Metadata = privateMetadata("Rocket League | Victress", "Your private Rocket League games, read from Ballchasing replays you submit.");

const KINDS = [["all", "All"], ["custom", "Private matches"], ["ranked", "Ranked"], ["normal", "Casual"], ["other", "Other modes"]] as const;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const one = (n: number | null) => (n === null ? "n/a" : n.toFixed(1));
const pct = (n: number | null) => (n === null ? "n/a" : `${Math.round(n)}%`);
const maskedId = (id: string) => (id.length <= 6 ? id : `${id.slice(0, 3)}…${id.slice(-3)}`);

type MatchRow = RlRow & { id: string; queue_label: string | null; objectives: { blue_goals?: number; orange_goals?: number; overtime?: boolean; map?: string | null } };

export default async function RocketLeaguePage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { sb, user } = await requireUser();
  if (!scrimUploadsEnabled()) notFound();
  const { data: approved } = await sb.rpc("upload_allowed");
  if (approved !== true) notFound();
  const wanted = (await searchParams).kind;
  const kind = KINDS.some(([k]) => k === wanted) ? (wanted as string) : "all";

  const [{ data: acct }, { data: jobs }, { data: rows }] = await Promise.all([
    sb.from("game_accounts").select("platform, external_id, last_imported_at").eq("profile_id", user.id).eq("game", "ROCKET_LEAGUE").maybeSingle(),
    sb.from("import_jobs").select("id, status, error_message, external_ref, submitted_via, created_at").eq("profile_id", user.id).eq("game", "ROCKET_LEAGUE").order("created_at", { ascending: false }).limit(8),
    sb.from("game_matches").select("id, queue_kind, queue_label, played_at, duration_seconds, result, me, objectives, participants").eq("profile_id", user.id).eq("game", "ROCKET_LEAGUE").order("played_at", { ascending: false }).limit(60),
  ]);
  const all = (rows ?? []) as unknown as MatchRow[];
  const shown = all.filter((r) => kind === "all" || r.queue_kind === kind);
  const s = summarizeRl(all, kind);
  const configured = ballchasingClient() !== null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm"><Link href="/dashboard/scrims" className="text-mute hover:text-white">Scrim Intelligence</Link></p>
        <h1 className="font-display text-4xl font-bold">Rocket League</h1>
        <p className="mt-2 text-mute">Submit a Ballchasing replay link and Victress saves your own numbers from it. Everything here is private to you. The numbers describe those games in their own context. They are not a judgment of how good you are.</p>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-mute"><ProvenanceTag source="api" /> {RL_DATA_LABEL}. Nothing here is typed in.</p>
      </div>

      <Section title="Your Rocket League ID" line={acct ? `${platformLabel(acct.platform)}, ${maskedId(acct.external_id)}. Only you can see this. Victress does not verify that it is yours.` : "Needed once, so Victress can find your own numbers in a replay. Any platform works: Steam, Epic Games, PlayStation, Xbox or Switch. Only you can see it, and Victress does not verify that it is yours."}>
        <RlIdentityForm saved={acct ? { platform: acct.platform ?? "", id: acct.external_id } : null} />
      </Section>

      <Section title="Submit a replay" line="One replay at a time. Victress reads it from Ballchasing, which does not use any upload allowance of yours.">
        {!configured ? (
          <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">Replay import is not configured on this server yet.</p>
        ) : !acct ? (
          <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">Save your Rocket League ID above first.</p>
        ) : (
          <RlSubmitForm />
        )}
        <details className="mt-4 rounded-xl border border-line px-4 py-3 text-sm text-mute">
          <summary className="cursor-pointer font-semibold text-white">If a replay is not accepted or not matched</summary>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
            <li><strong className="text-white">Private replay.</strong> Victress can only read replays set to Unlisted or Public. On Ballchasing, open the replay, choose Edit, set Visibility, wait a minute, and submit again.</li>
            <li><strong className="text-white">Your ID is not found.</strong> Your saved platform and ID must be the ones Ballchasing shows for you in that replay. Open the replay, click your name, and compare with the link you saved.</li>
            <li><strong className="text-white">Some players have no ID.</strong> Bots and some private matches have no platform ID recorded. If your own slot has none, Victress cannot match you, and it will never guess who you are.</li>
            <li><strong className="text-white">Not a replay link.</strong> Group and player links do not work here. Paste the address of a single replay page.</li>
          </ul>
        </details>
      </Section>

      <Section title="Your submissions" line="What happened to each replay you submitted, including why one failed.">
        {jobs?.length ? (
          <ul className="flex flex-col gap-3">
            {jobs.map((j) => (
              <li key={j.id} className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
                <p className="font-semibold">
                  {j.status === "succeeded" ? "Saved" : j.status === "failed" ? "Not saved" : "Processing"}
                  <span className="ml-2 font-normal text-mute">{new Date(j.created_at).toLocaleString("en-US")} · from {j.submitted_via === "discord" ? "Discord" : "the website"}</span>
                </p>
                <p className="mt-1 break-all text-mute">ballchasing.com/replay/{j.external_ref}</p>
                {j.status === "failed" && j.error_message ? <p className="mt-1">{j.error_message}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-mute">Nothing submitted yet.</p>
        )}
      </Section>

      <nav aria-label="Match type" className="flex flex-wrap gap-2">
        {KINDS.map(([k, label]) => (
          <Link key={k} href={`/dashboard/scrims/rocket-league?kind=${k}`} aria-current={k === kind ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${k === kind ? "border-white text-white" : "border-line text-mute hover:text-white"}`}>
            {label}
          </Link>
        ))}
      </nav>

      <Section title="Your performance" line={s ? `${s.games} game${s.games === 1 ? "" : "s"}${kind === "all" ? "" : `, ${KINDS.find(([k]) => k === kind)?.[1].toLowerCase()}`}. ${s.smallSample ? "A small sample: read these as a first look, not a pattern." : "Averages per game."}` : "Submit a replay to see your numbers here."}>
        {s ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {([
              ["Record", `${s.wins} wins, ${s.losses} losses`], ["Score", one(s.perGame.score)], ["Goals", one(s.perGame.goals)], ["Assists", one(s.perGame.assists)],
              ["Saves", one(s.perGame.saves)], ["Shots", one(s.perGame.shots)], ["Shooting", pct(s.shootingPercent)], ["Boost per minute", s.boostPerMinute === null ? "n/a" : Math.round(s.boostPerMinute).toString()],
              ["Average speed", s.averageSpeed === null ? "n/a" : Math.round(s.averageSpeed).toString()], ["Supersonic time", pct(s.supersonicPercent)],
              ["Time in own third", pct(s.defensiveThirdPercent)], ["Time in opponents' third", pct(s.offensiveThirdPercent)], ["Demos given", one(s.perGame.demosInflicted)], ["Demos taken", one(s.perGame.demosTaken)],
            ] as const).map(([k, v]) => (
              <div key={k}><dt className="text-sm text-mute">{k}</dt><dd className="mt-1 text-xl font-semibold">{v}</dd></div>
            ))}
          </dl>
        ) : null}
      </Section>

      {s?.team ? (
        <Section title="Your side" line={`Totals for your side across ${s.team.games} game${s.team.games === 1 ? "" : "s"}. Your teammates and opponents are never shown one by one.`}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {([
              ["Goals for", one(s.team.teamGoalsFor)], ["Goals against", one(s.team.teamGoalsAgainst)], ["Your share of goals", pct(s.team.yourShareOfTeamGoals)],
              ["Shots for", one(s.team.teamShotsFor)], ["Shots against", one(s.team.teamShotsAgainst)], ["Your share of shots", pct(s.team.yourShareOfTeamShots)],
            ] as const).map(([k, v]) => (
              <div key={k}><dt className="text-sm text-mute">{k}</dt><dd className="mt-1 text-xl font-semibold">{v}</dd></div>
            ))}
          </dl>
        </Section>
      ) : null}

      <Section title="Your games" line={shown.length ? "Newest first. Each one links back to the replay you submitted." : undefined}>
        {shown.length ? (
          <ul className="flex flex-col gap-3">
            {shown.map((m) => (
              <li key={m.id} className="rounded-xl border border-line bg-surface-2 px-4 py-3">
                <p className="font-semibold">
                  {m.result === "win" ? "Win" : m.result === "loss" ? "Loss" : "No result"}
                  <span className="ml-2 font-normal text-mute">{m.objectives?.blue_goals ?? "?"} to {m.objectives?.orange_goals ?? "?"} (blue to orange){m.objectives?.overtime ? ", overtime" : ""}</span>
                </p>
                <p className="mt-1 text-sm text-mute">
                  {new Date(m.played_at).toLocaleDateString("en-US")} · {m.queue_label ?? m.queue_kind} · {mmss(m.duration_seconds)}{m.objectives?.map ? ` · ${m.objectives.map}` : ""}
                </p>
                <p className="mt-1 text-sm">
                  {m.me.core?.goals ?? 0} goals, {m.me.core?.assists ?? 0} assists, {m.me.core?.saves ?? 0} saves, {m.me.core?.shots ?? 0} shots, score {m.me.core?.score ?? 0}
                </p>
                <div className="mt-3"><RlDeleteMatch id={m.id} /></div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-mute">No games saved{kind === "all" ? " yet" : " for this match type"}.</p>
        )}
      </Section>

      <Section title="Your data" line="You can delete everything Victress holds for Rocket League at any time.">
        <RlDeleteAll />
      </Section>
    </div>
  );
}
