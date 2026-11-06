import type { Metadata } from "next";
import { seo } from "@/content/seo";
import { privateMetadata } from "@/lib/seo";
import { GamesManager } from "@/components/app/GamesManager";
import { AvatarUploader, HandleForm, ProfileForm } from "@/components/app/ProfileForm";
import { Section } from "@/components/ui/form";
import { loadMe } from "@/lib/me";
import { appHost } from "@/lib/profiles";

export const metadata: Metadata = privateMetadata(seo.app.editProfile.title, seo.app.editProfile.description);

export default async function ProfileEditor() {
  const { sb, user, profile, games } = await loadMe();
  // The database returns a date only while a change is on cooldown.
  const { data: availableAt } = await sb.rpc("handle_change_available_at");
  const lockedUntil = availableAt
    ? new Date(availableAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-4xl font-bold">Edit profile</h1>

      <Section title="Photo">
        <AvatarUploader userId={user.id} avatarUrl={profile.avatar_url} initial={(profile.display_name || profile.handle).charAt(0).toUpperCase()} />
      </Section>

      <Section title="About you">
        <ProfileForm displayName={profile.display_name ?? ""} bio={profile.bio ?? ""} />
      </Section>

      <Section title="Games" line="Add every game you play and mark one as primary. Your primary game shows first.">
        <GamesManager games={games} />
      </Section>

      <Section title="Your name">
        <HandleForm handle={profile.handle} lockedUntil={lockedUntil} appHost={appHost()} />
      </Section>
    </div>
  );
}
