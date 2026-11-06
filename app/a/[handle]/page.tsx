import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/app/CopyLink";
import { ProfileCard } from "@/components/app/ProfileCard";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";
import { checkHandle } from "@/lib/handles";
import { appHost, statRows } from "@/lib/profiles";
import { supabasePublic } from "@/lib/supabase/public";
import { APP_URL, MARKETING_URL } from "@/lib/urls";

export const revalidate = 60;

async function load(raw: string) {
  const { verdict, handle } = checkHandle(raw);
  if (verdict !== "ok") return null;
  const db = supabasePublic();
  const { data: profile } = await db.from("public_profiles").select("*").eq("handle", handle).maybeSingle();
  if (!profile?.id || !profile.handle) return null;
  const { data: latest } = await db
    .from("stat_entries")
    .select("metrics")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { profile, stats: statRows(profile.game, latest?.metrics) };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const found = await load((await params).handle);
  if (!found) return { title: "Player not found", robots: { index: false } };
  const { profile } = found;
  const name = profile.display_name || profile.handle!;
  const title = `${name} (@${profile.handle}) on Victress`;
  const description =
    [profile.game, profile.role, profile.rank].filter(Boolean).join(" · ") || "Player profile on Victress.";
  const image = `/api/og/profile?handle=${profile.handle}`;
  return {
    metadataBase: new URL(APP_URL),
    title: { absolute: title },
    description,
    alternates: { canonical: `/${profile.handle}` },
    openGraph: { title, description, type: "profile", url: `/${profile.handle}`, images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PublicProfile({ params }: { params: Promise<{ handle: string }> }) {
  const found = await load((await params).handle);
  if (!found) notFound();
  const { profile, stats } = found;

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo href={MARKETING_URL} />
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-center gap-8 py-12">
        <ProfileCard
          handle={profile.handle!}
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          game={profile.game}
          role={profile.role}
          rank={profile.rank}
          teamName={profile.team_name}
          stats={stats}
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
