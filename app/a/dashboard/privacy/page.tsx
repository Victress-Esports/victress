import type { Metadata } from "next";
import { PrivacyControls } from "@/components/app/PrivacyControls";
import { privateMetadata } from "@/lib/seo";
import { cleanFields, directoryEnabled, sharingEnabled } from "@/lib/privacy";
import { loadMe } from "@/lib/me";

export const metadata: Metadata = privateMetadata("Privacy and sharing | Victress", "Choose who can see your profile and what they see.");

export default async function PrivacyPage() {
  const { sb, user, profile } = await loadMe();
  const { data: links } = await sb
    .from("profile_share_links")
    .select("id, label, fields, created_at, expires_at, revoked_at, last_viewed_at, view_count")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Privacy and sharing</h1>
        <p className="mt-2 text-mute">Your profile is private. Nothing here is visible to anyone until you choose it.</p>
      </div>
      <PrivacyControls
        initial={{
          directory_listed: profile.directory_listed,
          search_indexable: profile.search_indexable,
          show_on_leaderboards: profile.show_on_leaderboards,
          public_fields: cleanFields(profile.public_fields),
        }}
        directoryAvailable={directoryEnabled()}
        sharingAvailable={sharingEnabled()}
        links={(links ?? []).map((l) => ({
          id: l.id,
          label: l.label,
          fields: cleanFields(l.fields),
          createdAt: l.created_at,
          expiresAt: l.expires_at,
          revokedAt: l.revoked_at,
          lastViewedAt: l.last_viewed_at,
          views: l.view_count,
        }))}
      />
    </div>
  );
}
