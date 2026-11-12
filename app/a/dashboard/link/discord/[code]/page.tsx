import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscordLinkConfirm } from "@/components/app/DiscordLink";
import { Section } from "@/components/ui/form";
import { requireUser } from "@/lib/auth";
import { hashLinkCode, isLinkCode } from "@/lib/discord/link";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Link Discord | Victress", "Confirm linking your Discord account.");
export const dynamic = "force-dynamic";

export default async function LinkDiscordPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isLinkCode(code)) notFound();
  // requireUser sends signed out visitors to sign in and applies the age gate and Terms acceptance before anything below runs.
  const { sb, user } = await requireUser();
  const [{ data: preview }, { data: existing }] = await Promise.all([
    sb.rpc("discord_link_preview", { p_code_hash: hashLinkCode(code) }),
    sb.from("discord_links").select("linked_at").eq("profile_id", user.id).maybeSingle(),
  ]);
  const status = (preview as { status?: string; hint?: string } | null)?.status;
  const hint = (preview as { hint?: string } | null)?.hint;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Link your Discord account</h1>
        <p className="mt-2 text-mute">Connect Discord to your Victress account so you can use Victress Scrim Intelligence there.</p>
      </div>

      {existing ? (
        <Section title="Already linked" line="Your Victress account is linked to a Discord account.">
          <Link href="/dashboard/account" className="text-sm underline">Open your Account page to unlink it first</Link>
        </Section>
      ) : status === "ok" ? (
        <>
          <Section title="Check this is you" line="A Discord account asked to link to the Victress account you are signed in to now.">
            <p className="text-lg font-semibold">{hint ? hint : "A Discord account"}</p>
            <p className="mt-2 text-sm text-mute">If you did not just run /link in Discord yourself, close this page. Anyone can start a link; only you can finish it, and only if you recognize the name above.</p>
          </Section>
          <Section title="What linking does" line="Linking only connects the two accounts.">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-mute">
              <li>Victress saves your Discord user ID with your account. It does not save your Discord name, picture or server.</li>
              <li>It lets the Discord bot show you your own information and take replays you submit, as you.</li>
              <li><strong className="text-white">It does not share your profile or any numbers with anyone</strong>, and it does not change your privacy settings.</li>
              <li>You can unlink at any time, here or with /unlink in Discord. Your Victress account and saved data stay as they are.</li>
            </ul>
          </Section>
          <DiscordLinkConfirm code={code} />
        </>
      ) : (
        <Section title={status === "expired" ? "This link has expired" : "This link is not valid"} line="Run /link in Discord again to get a new one. A link works once and lasts 10 minutes." >
          <p className="text-mute">Nothing was linked.</p>
        </Section>
      )}
    </div>
  );
}
