import type { Metadata } from "next";
import { DeleteAccount } from "@/components/app/DeleteAccount";
import { DiscordUnlink } from "@/components/app/DiscordLink";
import { buttonClass } from "@/components/ui/Button";
import { Section } from "@/components/ui/form";
import { loadMe } from "@/lib/me";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Account | Victress", "Download your data or delete your account.");

export default async function AccountPage() {
  const { sb, user, profile } = await loadMe();
  const { data: discord } = await sb.from("discord_links").select("linked_at").eq("profile_id", user.id).maybeSingle();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Account</h1>
        <p className="mt-2 text-mute">{user.email ?? "Signed in"}</p>
      </div>

      <Section title="Download your data" line="Everything Victress holds about you, as one file. It contains nothing about other people.">
        <a href="/dashboard/account/export" download className={buttonClass("secondary")}>
          Download my data
        </a>
      </Section>

      <Section title="Discord" line={discord ? "Your Discord account is linked." : "Not linked. Run /link in Discord to start."}>
        {discord ? (
          <>
            <p className="mb-4 text-mute">Linked {new Date(discord.linked_at).toLocaleDateString("en-US")}. Linking does not share your profile or numbers with anyone.</p>
            <DiscordUnlink />
          </>
        ) : null}
      </Section>

      <Section title="Delete your account" line="This cannot be undone.">
        <ul className="mb-5 flex list-disc flex-col gap-2 pl-5 text-mute">
          <li>Your profile, games, highlight links, share links, practice files and consent records are deleted.</li>
          <li>If you own a team by yourself, it is deleted. If it has other players, remove them first.</li>
          <li>Your name becomes available to others, and any email list signup under your address is removed.</li>
        </ul>
        <DeleteAccount handle={profile.handle} />
      </Section>
    </div>
  );
}
