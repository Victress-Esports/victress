import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/app/CopyLink";
import { ProfileCard } from "@/components/app/ProfileCard";
import { Logo } from "@/components/brand/Logo";
import { JsonLd } from "@/components/seo/JsonLd";
import { buttonClass } from "@/components/ui/Button";
import { getGame } from "@/content/games";
import { profileSeo } from "@/content/seo";
import { checkHandle } from "@/lib/handles";
import { profilePage } from "@/lib/jsonld";
import { directoryProfile } from "@/lib/privacy";
import { appHost } from "@/lib/profiles";
import { pageMetadata } from "@/lib/seo";
import { APP_URL, marketingUrl } from "@/lib/urls";

export const revalidate = 60;

/** Only profiles in the directory whose owner also switched on "Show my profile in search engines" are indexable. */
const isIndexable = (p: { search_indexable?: boolean; is_demo: boolean }) => !!p.search_indexable && !p.is_demo;

/** A profile is public only if its owner listed it in the directory and the directory is switched on. Otherwise: not found. */
async function load(raw: string) {
  const { verdict, handle } = checkHandle(raw);
  if (verdict !== "ok") return null;
  const profile = await directoryProfile(handle);
  if (!profile) return null;
  return {
    profile,
    games: profile.games,
    alsoPlays: profile.games.filter((g) => !g.is_primary),
    updatedAt: profile.updated_at,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const found = await load((await params).handle);
  if (!found) return { title: { absolute: "Player not found | Victress" }, robots: { index: false, follow: false } };
  const { profile } = found;
  const handle = profile.handle;
  const cfg = getGame(profile.game);
  const facts = [cfg?.name, profile.role, profile.rank].filter(Boolean).join(" · ");
  const { title, description } = profileSeo({ name: profile.display_name, handle, facts, bio: profile.bio });

  const meta = pageMetadata({
    title,
    description,
    path: `/${handle}`,
    type: "profile",
    image: { url: `/api/og/profile?handle=${handle}`, alt: `${profile.display_name || handle} on Victress` },
  });
  if (isIndexable(profile)) return meta;
  // Not opted in (the default), or a demo player: viewable by link and shareable (social tags stay), but not indexed.
  // No canonical here: it would send a mixed signal next to noindex.
  return { ...meta, alternates: undefined, robots: { index: false, follow: false } };
}

export default async function PublicProfile({ params }: { params: Promise<{ handle: string }> }) {
  const found = await load((await params).handle);
  if (!found) notFound();
  const { profile, alsoPlays, games, updatedAt } = found;

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 sm:px-6">
      {isIndexable(profile) ? (
        <JsonLd
          data={profilePage({
            handle: profile.handle,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            bio: profile.bio,
            teamName: profile.team_name,
            games: games.map((g) => g.game),
            createdAt: profile.created_at,
            updatedAt,
          })}
        />
      ) : null}
      <header className="flex items-center justify-between">
        <Logo href={marketingUrl("/")} />
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-center gap-8 py-12">
        <ProfileCard
          handle={profile.handle}
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          game={profile.game}
          role={profile.role}
          rank={profile.rank}
          teamName={profile.team_name}
          alsoPlays={alsoPlays}
          isDemo={!!profile.is_demo}
          appHost={appHost()}
        />
        {profile.bio ? <p className="max-w-md text-center text-mute">{profile.bio}</p> : null}
        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <CopyLink url={`${APP_URL}/${profile.handle}`} label="Copy link" className="flex-1" />
          <Link href="/" className={buttonClass("secondary", "flex-1")}>
            Claim your name
          </Link>
        </div>
      </main>
    </div>
  );
}
