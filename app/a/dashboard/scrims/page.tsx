import type { Metadata } from "next";
import { ComingSoonNote } from "@/components/app/ComingSoonNote";
import { MatchLog, type MatchRow } from "@/components/app/MatchLog";
import { ProvenanceTag } from "@/components/app/ProvenanceTag";
import { ScrimUploader, type UploadRow } from "@/components/app/ScrimUploader";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Section } from "@/components/ui/form";
import { PROVENANCE, PROVENANCE_ORDER } from "@/content/provenance";
import { scrimUploadsEnabled } from "@/lib/dashboard";
import { isMissingTable } from "@/lib/db-errors";
import { loadMe } from "@/lib/me";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Scrim Intelligence | Victress", "Match log, practice file storage and automated analysis are coming soon.");

export default async function ScrimsPage() {
  const { sb, user, games } = await loadMe();
  const flagOn = scrimUploadsEnabled();
  // Only approved design partners can upload. The database enforces this too; this only decides what to show.
  const { data: approved } = flagOn ? await sb.rpc("upload_allowed") : { data: false };
  const enabled = flagOn && approved === true;
  const { data: matches, error: matchesError } = await sb
    .from("scrim_matches")
    .select("id, game, played_on, opponent, result, score, map, note")
    .eq("profile_id", user.id)
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  const matchLogMissing = isMissingTable(matchesError);
  const { data: uploads } = enabled
    ? await sb.from("scrim_uploads").select("id, game, original_name, size_bytes, created_at").eq("profile_id", user.id).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Scrim Intelligence</h1>
        <p className="mt-2 text-mute">Turn private practice into performance information. This is the foundation: your own match log and private file storage first, analysis later.</p>
      </div>

      <Section title="Automated analysis" line="Coming soon">
        <p className="text-mute">
          Victress does not analyze files yet and shows no automated stats. Analysis will switch on only after a parser has been validated against real
          demos. Until then, nothing on this page is measured by Victress: the match log below is what you enter yourself.
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

      {enabled ? (
        <Section title="League of Legends" line="Import your match history through the Riot API. Private to you.">
          <Link href="/dashboard/scrims/lol" className={buttonClass("secondary")}>Open League of Legends imports</Link>
        </Section>
      ) : null}

      <Section title="Match log" line={matchLogMissing ? "Coming soon" : "Record your practice matches. Private to you, and entered by you, so every entry is Self-reported."}>
        {matchLogMissing ? <ComingSoonNote what="The match log" /> : <MatchLog rows={(matches ?? []) as MatchRow[]} games={games.map((g) => g.game)} />}
      </Section>

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
