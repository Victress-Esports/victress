import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/form";
import { PARTNER_SECTION_LINES, VERIFICATION_NOTE, orgTypeLabel, planLabel } from "@/content/partner";
import { requirePartner } from "@/lib/partner";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Partner Overview | Victress", "Your Partner plan, verification status and activity.");

const SECTIONS = [
  { href: "/dashboard/partner/challenges", label: "Challenges", line: PARTNER_SECTION_LINES.challenges },
  { href: "/dashboard/partner/participation", label: "Participation", line: PARTNER_SECTION_LINES.participation },
  { href: "/dashboard/partner/opportunities", label: "Opportunities", line: PARTNER_SECTION_LINES.opportunities },
  { href: "/dashboard/partner/impact", label: "Impact", line: PARTNER_SECTION_LINES.impact },
];

async function count(p: Awaited<ReturnType<typeof requirePartner>>, table: "partner_participation" | "partner_support_offers" | "partner_impact_records" | "partner_findings") {
  const { count } = await p.sb.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function Overview() {
  const p = await requirePartner();
  const { sb, org, plan } = p;
  const [participation, offers, impact, findings, mine, listed] = await Promise.all([
    count(p, "partner_participation"),
    count(p, "partner_support_offers"),
    count(p, "partner_impact_records"),
    count(p, "partner_findings"),
    sb.from("partner_opportunities").select("id", { count: "exact", head: true }).eq("org_id", org.id),
    sb.from("partner_opportunities").select("id", { count: "exact", head: true }).eq("status", "published").neq("org_id", org.id),
  ]);

  const stats = [
    { label: "Participation submitted", value: participation, href: "/dashboard/partner/participation" },
    { label: "Opportunities posted", value: mine.count ?? 0, href: "/dashboard/partner/opportunities" },
    { label: "Published opportunities to support", value: listed.count ?? 0, href: "/dashboard/partner/opportunities" },
    { label: "Support offers sent", value: offers, href: "/dashboard/partner/opportunities" },
    { label: "Impact records", value: impact, href: "/dashboard/partner/impact" },
    { label: "Published findings", value: findings, href: "/dashboard/partner/challenges" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-bold">Overview</h1>
      <Section title="Organization">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-mute">Partner Plan</dt>
            <dd className="mt-1 font-semibold">{planLabel(plan)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mute">Verification</dt>
            <dd className="mt-1 font-semibold">{org.verified ? "Verified" : "Not verified yet"}</dd>
          </div>
          <div>
            <dt className="text-sm text-mute">Type</dt>
            <dd className="mt-1 font-semibold">{orgTypeLabel(org.org_type)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-mute">{VERIFICATION_NOTE}</p>
      </Section>

      <Section title="Impact Summary" line="Counts from your own activity. Nothing here is estimated.">
        <ul className="grid gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <li key={s.label}>
              <Link href={s.href} className="block rounded-2xl border border-line bg-surface-2 p-4 hover:border-white">
                <p className="tnum font-display text-3xl font-bold">{s.value}</p>
                <p className="mt-1 text-sm text-mute">{s.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Sections">
        <ul className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block rounded-2xl border border-line bg-surface-2 p-4 hover:border-white">
                <p className="font-semibold">{l.label}</p>
                <p className="mt-1 text-sm text-mute">{l.line}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

