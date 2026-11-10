import type { Metadata } from "next";
import { StatusChip } from "@/components/app/StatusChip";
import { ParticipationForm } from "@/components/app/PartnerForms";
import { Section } from "@/components/ui/form";
import { PARTNER_SECTION_LINES, WAYS, statusLabel, wayLabel } from "@/content/partner";
import { requirePartner } from "@/lib/partner";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Partner Participation | Victress", "Tell Victress how your organization wants to take part.");

export default async function Participation() {
  const { sb } = await requirePartner();
  const { data: items } = await sb.from("partner_participation").select("id, way, title, description, status, created_at").order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Participation</h1>
        <p className="mt-2 text-mute">{PARTNER_SECTION_LINES.participation}</p>
      </div>

      <Section title="Ways to Participate">
        <ul className="grid gap-3 sm:grid-cols-2">
          {WAYS.map((w) => (
            <li key={w.id} className="rounded-2xl border border-line bg-surface-2 p-4">
              <p className="font-semibold">{w.label}</p>
              <p className="mt-1 text-sm text-mute">{w.line}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Submit a way to participate" line="Victress reviews each submission. Submitting is not a commitment by either side.">
        <ParticipationForm />
      </Section>

      <Section title="Your submissions">
        {!items || items.length === 0 ? (
          <p className="text-mute">Nothing submitted yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((i) => (
              <li key={i.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold">{i.title}</p>
                  <StatusChip>{statusLabel(i.status)}</StatusChip>
                </div>
                <p className="mt-1 text-sm text-mute">{wayLabel(i.way)} · {new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                <p className="mt-2 text-mute">{i.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
