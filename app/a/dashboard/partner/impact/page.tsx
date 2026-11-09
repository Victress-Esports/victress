import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/Button";
import { IMPACT_ATTRIBUTION, IMPACT_CATEGORIES, PARTNER_SECTION_LINES, opportunityTypeLabel, statusLabel, wayLabel } from "@/content/partner";
import { requirePartner } from "@/lib/partner";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Partner Impact | Victress", "What your organization's participation has involved, and impact records from Victress.");

const date = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function Impact() {
  const { sb, org, paid } = await requirePartner();
  const [{ data: participation }, { data: opps }, { data: offers }, { data: records }] = await Promise.all([
    sb.from("partner_participation").select("id, way, title, status, created_at").order("created_at", { ascending: false }),
    sb.from("partner_opportunities").select("id, type, title, status, created_at").eq("org_id", org.id).order("created_at", { ascending: false }),
    sb.from("partner_support_offers").select("id, support_type, status, created_at, opportunity_id").order("created_at", { ascending: false }),
    sb.from("partner_impact_records").select("id, category, title, summary, quantity, unit, occurred_on").order("occurred_on", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Impact</h1>
          <p className="mt-2 text-mute">{PARTNER_SECTION_LINES.impact}</p>
        </div>
        {paid ? (
          // A plain link: the route returns a CSV attachment.
          <a href="/dashboard/partner/impact/report" className={buttonClass("secondary")}>
            Download Report
          </a>
        ) : null}
      </div>
      {!paid ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-mute">
          Download Report (CSV) is part of the Supporting and Anchor plans.{" "}
          <Link href="/dashboard/partner/settings" className="font-semibold text-white underline underline-offset-2">
            See Organization Settings
          </Link>
          .
        </p>
      ) : null}
      <p className="text-sm text-mute">{IMPACT_ATTRIBUTION}</p>

      <Section title="Your involvement" line="What your organization has submitted.">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold">Participation ({participation?.length ?? 0})</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-mute">
              {(participation ?? []).slice(0, 8).map((p) => (
                <li key={p.id}>{p.title}: {wayLabel(p.way)}, {statusLabel(p.status)}</li>
              ))}
              {!participation?.length ? <li>None yet.</li> : null}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Opportunities ({opps?.length ?? 0})</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-mute">
              {(opps ?? []).slice(0, 8).map((o) => (
                <li key={o.id}>{o.title}: {opportunityTypeLabel(o.type)}, {statusLabel(o.status)}</li>
              ))}
              {!opps?.length ? <li>None yet.</li> : null}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Support offers ({offers?.length ?? 0})</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-mute">
              {(offers ?? []).slice(0, 8).map((o) => (
                <li key={o.id}>{wayLabel(o.support_type)}, {statusLabel(o.status)}, {date(o.created_at)}</li>
              ))}
              {!offers?.length ? <li>None yet.</li> : null}
            </ul>
          </div>
        </div>
      </Section>

      {IMPACT_CATEGORIES.map((c) => {
        const list = (records ?? []).filter((r) => r.category === c.id);
        return (
          <Section key={c.id} title={c.label}>
            {list.length === 0 ? (
              <p className="text-mute">No records yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {list.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                    <p className="font-semibold">{r.title}</p>
                    <p className="mt-1 text-sm text-mute">
                      {date(r.occurred_on)}
                      {r.quantity != null ? ` · ${r.quantity}${r.unit ? ` ${r.unit}` : ""}` : ""}
                    </p>
                    <p className="mt-2 text-mute">{r.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        );
      })}
    </div>
  );
}
