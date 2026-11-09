import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/app/StatusChip";
import { OfferSupportForm, OpportunityForm } from "@/components/app/PartnerForms";
import { Section } from "@/components/ui/form";
import { PARTNER_SECTION_LINES, opportunityTypeLabel, statusLabel, wayLabel } from "@/content/partner";
import { requirePartner } from "@/lib/partner";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Partner Opportunities | Victress", "Published opportunities that need support, and your own submissions.");

export default async function Opportunities() {
  const { sb, org, paid } = await requirePartner();
  const [{ data: all }, { data: offers }] = await Promise.all([
    sb.from("partner_opportunities").select("id, org_id, organization_name, type, title, purpose, support_needed, status, published_at, created_at").order("created_at", { ascending: false }),
    sb.from("partner_support_offers").select("id, opportunity_id, support_type, status, created_at"),
  ]);
  const published = (all ?? []).filter((o) => o.status === "published");
  const mine = (all ?? []).filter((o) => o.org_id === org.id);
  const offered = new Map((offers ?? []).map((o) => [o.opportunity_id, o]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Opportunities</h1>
        <p className="mt-2 text-mute">{PARTNER_SECTION_LINES.opportunities}</p>
      </div>

      <Section title="Opportunity Listings" line="Published by Victress after review.">
        {!paid ? (
          <p className="mb-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">
            Offer Support is part of the Supporting and Anchor plans.{" "}
            <Link href="/dashboard/partner/settings" className="font-semibold text-white underline underline-offset-2">
              See Organization Settings
            </Link>
            .
          </p>
        ) : null}
        {published.length === 0 ? (
          <p className="text-mute">No opportunities are published yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {published.map((o) => {
              const own = o.org_id === org.id;
              const offer = offered.get(o.id);
              return (
                <li key={o.id} className="rounded-2xl border border-line bg-surface-2 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-display text-xl font-bold">{o.title}</p>
                    <StatusChip>{opportunityTypeLabel(o.type)}</StatusChip>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-mute">Organization</dt>
                      <dd className="mt-1">{o.organization_name}</dd>
                    </div>
                    <div>
                      <dt className="text-mute">Purpose</dt>
                      <dd className="mt-1">{o.purpose}</dd>
                    </div>
                    <div>
                      <dt className="text-mute">Support Needed</dt>
                      <dd className="mt-1">{o.support_needed}</dd>
                    </div>
                  </dl>
                  {own ? (
                    <p className="mt-4 text-sm text-mute">This is your organization&apos;s opportunity.</p>
                  ) : offer ? (
                    <p className="mt-4 text-sm text-mute">You offered {wayLabel(offer.support_type)}. Status: {statusLabel(offer.status)}.</p>
                  ) : paid ? (
                    <OfferSupportForm opportunityId={o.id} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Post an opportunity" line="Describe something that needs support.">
        <OpportunityForm />
      </Section>

      <Section title="Your opportunities">
        {mine.length === 0 ? (
          <p className="text-mute">You have not posted an opportunity yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map((o) => (
              <li key={o.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold">{o.title}</p>
                  <StatusChip>{statusLabel(o.status)}</StatusChip>
                </div>
                <p className="mt-1 text-sm text-mute">{opportunityTypeLabel(o.type)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
