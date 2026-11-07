import type { Metadata } from "next";
import { ProvenanceTag } from "@/components/app/ProvenanceTag";
import { ScrimUploader, type UploadRow } from "@/components/app/ScrimUploader";
import { Section } from "@/components/ui/form";
import { PROVENANCE, PROVENANCE_ORDER } from "@/content/provenance";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { loadMe } from "@/lib/me";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Scrim Intelligence | Victress", "Store private practice files. Automated analysis is coming soon.");

export default async function ScrimsPage() {
  const { sb, user, games } = await loadMe();
  const enabled = scrimUploadsEnabled();
  const { data: uploads } = enabled
    ? await sb.from("scrim_uploads").select("id, game, original_name, size_bytes, created_at").eq("profile_id", user.id).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Scrim Intelligence</h1>
        <p className="mt-2 text-mute">Turn private practice into performance information. This is the foundation: storage first, analysis later.</p>
      </div>

      <Section title="Automated analysis" line="Coming soon">
        <p className="text-mute">
          Victress does not analyze files yet and shows no automated stats. Analysis will switch on only after a parser has been validated against real
          demos. Until then, nothing on this page is a measurement of your play.
        </p>
      </Section>

      <Section title="Where every number comes from" line="Three sources, never mixed up.">
        <ul className="flex flex-col gap-3">
          {PROVENANCE_ORDER.map((k) => (
            <li key={k} className="flex flex-wrap items-center gap-3">
              <ProvenanceTag source={k} />
              <span className="text-mute">{PROVENANCE[k].line}</span>
              <span className="text-sm text-coral">{PROVENANCE[k].available ? "Available now" : "Coming soon"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-mute">Verification will mean we can show where evidence came from and that it is intact. It never judges how good a player is.</p>
      </Section>

      <Section title="Your practice files" line="Demo and replay files, stored privately.">
        {enabled ? (
          <ScrimUploader userId={user.id} games={games.map((g) => g.game)} rows={(uploads ?? []) as UploadRow[]} />
        ) : (
          <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">
            Uploads are not open yet. They open for design partners once the privacy foundation is live. Nothing is collected until then.
          </p>
        )}
      </Section>
    </div>
  );
}
