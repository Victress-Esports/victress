import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileCard } from "@/components/app/ProfileCard";
import { Logo } from "@/components/brand/Logo";
import { sharedProfile } from "@/lib/privacy";
import { appHost, statRows } from "@/lib/profiles";
import { marketingUrl } from "@/lib/urls";

// A sharing link is a private capability: never cached, never indexed, no referrer, generic preview.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Shared player profile | Victress" },
  description: "A player profile shared by its owner.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function SharedProfile({ params }: { params: Promise<{ token: string }> }) {
  const p = await sharedProfile((await params).token);
  if (!p) notFound();
  const stats = statRows(p.game, p.metrics);
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo href={marketingUrl("/")} />
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-center gap-6 py-12">
        <ProfileCard
          handle={p.handle}
          displayName={p.display_name}
          avatarUrl={p.avatar_url}
          game={p.game}
          role={p.role}
          rank={p.rank}
          teamName={p.team_name}
          stats={stats}
          alsoPlays={p.games.filter((g) => !g.is_primary)}
          isDemo={!!p.is_demo}
          appHost={appHost()}
        />
        {p.bio ? <p className="max-w-md text-center text-mute">{p.bio}</p> : null}
        {stats.length ? <p className="max-w-md text-center text-sm text-mute">Stats shown are Self-reported by the player.</p> : null}
      </main>
    </div>
  );
}
