import type { Metadata } from "next";
import Link from "next/link";
import { CopyLink } from "@/components/app/CopyLink";
import { ProfileCard } from "@/components/app/ProfileCard";
import { buttonClass } from "@/components/ui/Button";
import { GAME_LIST } from "@/content/games";
import { loadMe } from "@/lib/me";
import { appHost, statRows } from "@/lib/profiles";
import { APP_URL } from "@/lib/urls";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function Dashboard() {
  const { profile, games, entries, team } = await loadMe();
  const latest = entries.find((e) => e.game === profile.game);
  const stats = statRows(profile.game, latest?.metrics);
  const link = `${APP_URL}/${profile.handle}`;

  // One obvious next step at a time.
  const next =
    entries.length === 0
      ? { text: "Add your first stats to fill out your profile.", href: "/dashboard/stats", label: "Add stats" }
      : games.length < GAME_LIST.length && games.length === 1
        ? { text: "Play more than one game? Add it to your profile.", href: "/dashboard/profile", label: "Add a game" }
        : !team
          ? { text: "Run a club or play on a roster? Start or join a team.", href: "/dashboard/team", label: "Start your team" }
          : null;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Your profile is live.</h1>
        <p className="mt-3 text-lg text-mute">Share it anywhere.</p>
        <p className="tnum mt-6 break-all rounded-xl border border-line bg-surface px-4 py-3 text-sm text-mute">{link}</p>
        <CopyLink url={link} className="mt-4 w-full sm:w-auto" />

        {next ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-5">
            <p className="text-mute">{next.text}</p>
            <Link href={next.href} className={buttonClass("secondary", "mt-4")}>
              {next.label}
            </Link>
          </div>
        ) : null}
      </div>

      <section aria-label="Live preview of your public profile" className="flex flex-col items-center gap-3">
        <p className="text-sm text-mute">Live preview</p>
        <ProfileCard
          handle={profile.handle}
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          game={profile.game}
          role={profile.role}
          rank={profile.rank}
          teamName={team?.name ?? null}
          stats={stats}
          alsoPlays={games.filter((g) => !g.is_primary)}
          appHost={appHost()}
        />
      </section>
    </div>
  );
}
