import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CopyLink } from "@/components/app/CopyLink";
import { ProfileCard } from "@/components/app/ProfileCard";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";
import { PLACEHOLDER_HANDLE, requireUser } from "@/lib/auth";
import { appHost, statRows } from "@/lib/profiles";
import { APP_URL } from "@/lib/urls";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function Dashboard() {
  const { sb, user } = await requireUser();

  const { data: profile } = await sb
    .from("profiles")
    .select("handle, display_name, avatar_url, game, role, rank, team_id")
    .eq("id", user.id)
    .single();
  if (!profile || PLACEHOLDER_HANDLE.test(profile.handle) || !user.user_metadata?.onboarded) redirect("/onboarding");

  const [{ data: latest }, { data: team }] = await Promise.all([
    sb.from("stat_entries").select("metrics").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    profile.team_id ? sb.from("teams").select("name").eq("id", profile.team_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const stats = statRows(profile.game, latest?.metrics);
  const link = `${APP_URL}/${profile.handle}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo href="/dashboard" />
        <form action="/auth/signout" method="post">
          <button type="submit" className={buttonClass("ghost", "min-h-11 px-3 text-sm text-mute")}>
            Sign out
          </button>
        </form>
      </header>

      <main id="main" className="mt-12 grid items-start gap-10 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Your profile is live.</h1>
          <p className="mt-3 text-lg text-mute">Share it anywhere.</p>
          <p className="tnum mt-6 break-all rounded-xl border border-line bg-surface px-4 py-3 text-sm text-mute">{link}</p>
          <CopyLink url={link} className="mt-4 w-full sm:w-auto" />
          {stats.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-line px-4 py-4 text-mute">
              Add your first stats to fill out your profile.
            </p>
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
            appHost={appHost()}
          />
        </section>
      </main>
    </div>
  );
}
