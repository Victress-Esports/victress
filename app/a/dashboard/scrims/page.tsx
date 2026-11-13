import type { Metadata } from "next";
import { ScrimUploader, type UploadRow } from "@/components/app/ScrimUploader";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Section } from "@/components/ui/form";
import { lolImportEnabled, scrimUploadsEnabled } from "@/lib/dashboard";
import { loadMe } from "@/lib/me";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Scrims | Victress", "Your private practice files.");

export default async function ScrimsPage() {
  const { sb, user, games } = await loadMe();
  const flagOn = scrimUploadsEnabled();
  // Only approved design partners can upload. The database enforces this too; this only decides what to show.
  const { data: approved } = flagOn ? await sb.rpc("upload_allowed") : { data: false };
  const enabled = flagOn && approved === true;
  const { data: uploads } = enabled
    ? await sb.from("scrim_uploads").select("id, game, original_name, size_bytes, created_at").eq("profile_id", user.id).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Scrims</h1>
        <p className="mt-2 text-mute">Your practice, in one private place.</p>
      </div>

      <Section title="Automated analysis" line="Coming soon">
        <p className="text-mute">Scrim Intelligence turns private practice files into performance information.</p>
      </Section>

      {enabled ? (
        <Section title="Rocket League" line="Submit Ballchasing replay links and see your own numbers. Private to you.">
          <Link href="/dashboard/scrims/rocket-league" className={buttonClass("secondary")}>Open Rocket League</Link>
        </Section>
      ) : null}

      {enabled && lolImportEnabled() ? (
        <Section title="League of Legends" line="Import your match history through the Riot API. Private to you.">
          <Link href="/dashboard/scrims/lol" className={buttonClass("secondary")}>Open League of Legends imports</Link>
        </Section>
      ) : null}

      <Section title="Your practice files" line="Demo and replay files, stored privately.">
        {enabled ? (
          <ScrimUploader userId={user.id} games={games.map((g) => g.game)} rows={(uploads ?? []) as UploadRow[]} />
        ) : (
          <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">
            {flagOn
              ? "Uploads are open to approved design partners only. Your account is not on the list."
              : "Uploads are not open yet. Nothing is collected."}
          </p>
        )}
      </Section>
    </div>
  );
}
