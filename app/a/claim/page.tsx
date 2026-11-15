import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteSnapshot } from "@/components/app/DeleteSnapshot";
import { Logo } from "@/components/brand/Logo";
import { ProvenanceTag } from "@/components/app/ProvenanceTag";
import { Section } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { platformLabel, RL_DATA_LABEL } from "@/lib/ballchasing/rl";
import { claimKeyFn } from "@/lib/claim";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { EPIC_MESSAGES, epicEnabled } from "@/lib/epic";
import { recordEvent } from "@/lib/events";
import { privateMetadata } from "@/lib/seo";
import { STEAM_MESSAGES, steamEnabled } from "@/lib/steam";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = privateMetadata("Claim your snapshot | Victress", "Verify your game account to see the Rocket League snapshots your team saved for you.");

type Snap = { id: string; played_at: string; duration_seconds: number; queue_kind: string; result: string; goals_for: number; goals_against: number; overtime: boolean; stats: Record<string, number>; mvp: boolean };
const shooting = (s: Record<string, number>) => (s.shots ? `${Math.round(((s.goals ?? 0) / s.shots) * 100)}%` : "n/a");
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default async function Claim({ searchParams }: { searchParams: Promise<{ epic?: string; steam?: string; from?: string }> }) {
  if (!scrimUploadsEnabled()) notFound();
  const pre = await supabaseServer();
  const { data: { user: signedIn } } = await pre.auth.getUser();
  const sp = await searchParams;
  const fromCard = sp.from === "card";
  // Sign up or sign in first; the age gate and Terms and Privacy follow. The card marker survives the trip.
  if (!signedIn) redirect(`/login?next=${encodeURIComponent(fromCard ? "/claim?from=card" : "/claim")}`);
  const { sb, user } = await requireUser();

  const { data: approved } = await sb.rpc("upload_allowed");
  const { data: acct } = await sb.from("game_accounts").select("platform, external_id, ownership_verified").eq("profile_id", user.id).eq("game", "ROCKET_LEAGUE").maybeSingle();
  const verified = acct?.ownership_verified === true && (acct.platform === "steam" || acct.platform === "epic");

  // Claim on every visit, from the VERIFIED identity only. The key is made on the server; the id is never sent anywhere.
  let claimedNow = 0;
  const key = claimKeyFn();
  const admin = supabaseAdmin();
  if (approved === true && verified && key && admin && acct?.platform) {
    const { data } = await admin.rpc("claim_rl_snapshots", { p_profile: user.id, p_key: key(acct.platform, acct.external_id) });
    claimedNow = Number(data ?? 0);
    if (claimedNow > 0) await recordEvent(user.id, "profile_claimed", { game: "ROCKET_LEAGUE" }, admin);
  }
  // Arrived from the result card's Claim button (the link carries ?from=card). Recorded once the visitor is a signed in player.
  if (fromCard && admin) await recordEvent(user.id, "claim_button_clicked", { source: "discord", game: "ROCKET_LEAGUE" }, admin);
  const { data: rows } = verified
    ? await sb.from("rl_snapshots").select("id, played_at, duration_seconds, queue_kind, result, goals_for, goals_against, overtime, stats, mvp").order("played_at", { ascending: false }).limit(50)
    : { data: [] };
  const snaps = (rows ?? []) as Snap[];
  const note = sp.epic && sp.epic in EPIC_MESSAGES ? EPIC_MESSAGES[sp.epic as keyof typeof EPIC_MESSAGES] : sp.steam && sp.steam in STEAM_MESSAGES ? STEAM_MESSAGES[sp.steam as keyof typeof STEAM_MESSAGES] : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header><Logo href="/dashboard" /></header>
      <main id="main" className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-4xl font-bold">Claim your snapshot</h1>
          <p className="mt-2 text-mute">When a teammate adds a Rocket League replay to their team on Victress, your numbers from that game wait here for you. Victress finds them only by your verified platform ID, never by name. Nobody else can see them, including the teammate who submitted the replay.</p>
        </div>
        {note ? <p role="status" className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">{note}</p> : null}

        {approved !== true ? (
          <Section title="Not open yet" line="Claiming is open to players in the Rocket League pilot. Ask the teammate who invited you to contact Victress.">
            <Link href="/dashboard" className="text-sm underline">Go to your dashboard</Link>
          </Section>
        ) : !verified ? (
          <Section title="Verify your game account" line={acct ? `Your saved ${platformLabel(acct.platform)} ID is typed in, not verified, so it cannot claim snapshots. Sign in with the platform you play on to verify it.` : "Sign in with the platform you play Rocket League on. Victress keeps only your platform ID, uses it to find your games, and never signs you in with it."}>
            <div className="flex flex-wrap gap-3">
              {steamEnabled() ? <a href="/dashboard/link/steam/start?next=claim" className="inline-flex min-h-11 items-center rounded-full border border-white px-4 font-semibold text-white">Verify with Steam</a> : null}
              {epicEnabled() ? <a href="/dashboard/link/epic/start?next=claim" className="inline-flex min-h-11 items-center rounded-full border border-white px-4 font-semibold text-white">Verify with Epic Games</a> : null}
              {!steamEnabled() && !epicEnabled() ? <p className="text-sm text-mute">Account verification is not open yet.</p> : null}
            </div>
          </Section>
        ) : (
          <Section title="Your snapshots" line={`${platformLabel(acct!.platform)} account verified.${claimedNow ? ` ${claimedNow} new snapshot${claimedNow === 1 ? "" : "s"} found.` : ""} These are your own numbers only. They describe those games in their own context, not how good you are.`}>
            <p className="mb-4 flex flex-wrap items-center gap-3 text-sm text-mute"><ProvenanceTag source="api" /> {RL_DATA_LABEL}.</p>
            {snaps.length ? (
              <ul className="flex flex-col gap-3">
                {snaps.map((s) => (
                  <li key={s.id} className="rounded-xl border border-line bg-surface-2 px-4 py-3">
                    <p className="font-semibold">{s.result === "win" ? "Win" : s.result === "loss" ? "Loss" : "Draw"} <span className="font-normal text-mute">{s.goals_for} to {s.goals_against}{s.overtime ? ", overtime" : ""}</span></p>
                    <p className="mt-1 text-sm text-mute">{new Date(s.played_at).toLocaleDateString("en-US")} · {s.queue_kind === "custom" ? "Private match" : s.queue_kind} · {mmss(s.duration_seconds)} · from a team scrim a teammate submitted</p>
                    <p className="mt-1 text-sm">{s.stats.goals ?? 0} goals, {s.stats.saves ?? 0} saves, {s.stats.shots ?? 0} shots, shooting {shooting(s.stats)}, score {s.stats.score ?? 0}{s.mvp ? ", MVP" : ""}</p>
                    <div className="mt-3"><DeleteSnapshot id={s.id} /></div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-mute">No snapshots for your account yet. When a teammate adds a replay you played in to their team, it appears here.</p>
            )}
            <p className="mt-5 text-sm"><Link href="/dashboard/profile" className="font-semibold underline">Finish your free Rookie profile</Link><span className="text-mute"> to keep building your Player Resume. It stays private until you choose to share it.</span></p>
          </Section>
        )}
        <p className="text-sm text-mute">Unclaimed snapshots are deleted after 90 days. <Link href="/privacy" className="underline">Privacy Policy</Link></p>
      </main>
    </div>
  );
}
