import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoonNote } from "@/components/app/ComingSoonNote";
import { GamesManager } from "@/components/app/GamesManager";
import { ProfileForm } from "@/components/app/ProfileForm";
import { ProvenanceTag } from "@/components/app/ProvenanceTag";
import { HighlightSection, TournamentSection, type HighlightRow, type TournamentRow } from "@/components/app/ResumeSections";
import { ResumeVisibility } from "@/components/app/ResumeVisibility";
import { buttonClass } from "@/components/ui/Button";
import { Section } from "@/components/ui/form";
import { getGame } from "@/content/games";
import { isMissingTable } from "@/lib/db-errors";
import { cleanFields } from "@/lib/privacy";
import { loadMe } from "@/lib/me";
import { appHost, statRows } from "@/lib/profiles";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Player Resume | Victress", "Your games and self-reported stats. Tournaments, highlights and sharing are coming soon.");

export default async function ResumePage() {
  const { sb, user, profile, games, entries, team } = await loadMe();
  const [{ data: tournaments, error: tournamentsError }, { data: highlights, error: highlightsError }] = await Promise.all([
    sb
      .from("tournament_entries")
      .select("id, game, name, placement, team_name, played_on")
      .eq("profile_id", user.id)
      .order("played_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    sb.from("highlights").select("id, game, title, url, note").eq("profile_id", user.id).order("created_at", { ascending: false }),
  ]);

  // The tables behind these two sections come from a migration that may not be applied yet: say so instead of showing forms that cannot save.
  const resumeExtrasMissing = isMissingTable(tournamentsError) || isMissingTable(highlightsError);

  // Newest entry per game (entries are newest first).
  const latest = new Map<string, (typeof entries)[number]>();
  for (const e of entries) if (!latest.has(e.game)) latest.set(e.game, e);
  const primaryRows = statRows(profile.game, latest.get(profile.game ?? "")?.metrics);
  const gameIds = games.map((g) => g.game);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Player Resume</h1>
        <p className="mt-2 text-mute">Your competitive identity, experience and development in one place. You decide who sees what.</p>
      </div>

      <Section title="About you" line="Your display name and bio. Each is shown only if you choose to show it (see Who can see your resume below).">
        <ProfileForm displayName={profile.display_name ?? ""} bio={profile.bio ?? ""} />
      </Section>

      <Section title="Games, role and rank" line="Add every game you play and mark one as primary. Your primary game shows first.">
        <GamesManager games={games} />
      </Section>

      <Section title="Stats" line="Each stat shows where it came from.">
        {[...latest.values()].length ? (
          <div className="flex flex-col gap-4">
            {[...latest.values()].map((e) => {
              const rows = statRows(e.game, e.metrics);
              return (
                <div key={e.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {getGame(e.game)?.name ?? e.game} · {e.season}
                    </p>
                    <ProvenanceTag source="self_reported" />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {rows.map((r) => (
                      <div key={r.label}>
                        <dt className="text-xs text-mute">{r.label}</dt>
                        <dd className="tnum text-lg font-bold">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-mute">No stats yet.</p>
        )}
        <p className="mt-4 text-sm text-mute">
          Every stat here is Self-reported: you entered it. Stats from a game API or from parsed demos will appear with their own source label once
          automated analysis exists. Coming soon.
        </p>
        <Link href="/dashboard/stats" className={buttonClass("secondary", "mt-4")}>
          Add or update stats
        </Link>
      </Section>

      <Section title="Tournament history" line={resumeExtrasMissing ? "Coming soon" : "Events you have played. Private for now."}>
        {resumeExtrasMissing ? <ComingSoonNote what="Tournament history" /> : <TournamentSection rows={(tournaments ?? []) as TournamentRow[]} games={gameIds} />}
      </Section>

      <Section title="Highlights" line={resumeExtrasMissing ? "Coming soon" : "Links to clips you host elsewhere. Private for now."}>
        {resumeExtrasMissing ? <ComingSoonNote what="Highlights" /> : <HighlightSection rows={(highlights ?? []) as HighlightRow[]} games={gameIds} />}
      </Section>

      <Section title="Who can see your resume">
        <ResumeVisibility
          initial={{
            directory_listed: profile.directory_listed,
            search_indexable: profile.search_indexable,
            show_on_leaderboards: profile.show_on_leaderboards,
            public_fields: cleanFields(profile.public_fields),
          }}
          full={{
            handle: profile.handle,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            bio: profile.bio,
            teamName: team?.name ?? null,
            game: profile.game,
            role: profile.role,
            rank: profile.rank,
            stats: primaryRows,
            appHost: appHost(),
          }}
        />
      </Section>
    </div>
  );
}
