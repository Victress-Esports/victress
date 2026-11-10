import type { Metadata } from "next";
import { AdminButtons } from "@/components/app/AdminButtons";
import { Section } from "@/components/ui/form";
import { opportunityTypeLabel, orgTypeLabel, planLabel } from "@/content/partner";
import { requireAdmin } from "@/lib/partner-admin";
import { privateMetadata } from "@/lib/seo";
import { adminExclusivityAction, adminOpportunityAction, adminVerifyAction } from "./actions";

export const metadata: Metadata = privateMetadata("Partner Admin | Victress", "Review queue for Partner organizations.");
export const dynamic = "force-dynamic";

const date = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Internal. Not linked from the app; non admins get a 404. Everything shown here is read with the service role after the admin check. */
export default async function PartnerAdmin() {
  const { admin } = await requireAdmin();
  const [{ data: requests }, { data: opps }, { data: orgs }, { data: log }, { data: held }, { data: past }] = await Promise.all([
    admin.from("partner_exclusivity").select("id, org_id, category, duration_months, note, status, invoice_status, created_at").in("status", ["requested", "approved"]).order("created_at"),
    admin.from("partner_opportunities").select("id, org_id, organization_name, type, title, purpose, support_needed, created_at").eq("status", "in_review").order("created_at"),
    admin.from("partner_organizations").select("id, name, org_type, website, plan, subscription_status, verified, created_at").order("created_at", { ascending: false }).limit(100),
    admin.from("partner_admin_log").select("id, action, target_table, detail, created_at").order("created_at", { ascending: false }).limit(15),
    admin.from("partner_exclusivity").select("id, org_id, category, status, duration_months, activated_at, ends_at").in("status", ["approved", "active"]).order("category"),
    admin.from("partner_exclusivity").select("id, org_id, category, status, ends_at").in("status", ["ended", "declined", "withdrawn"]).order("updated_at", { ascending: false }).limit(15),
  ]);
  const nameOf = new Map((orgs ?? []).map((o) => [o.id as string, o.name as string]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-bold">Partner admin</h1>

      <Section title="Category Exclusivity" line="Approving reserves the category. The owner is then invoiced the difference between Anchor and Category Exclusivity. Nothing starts until Stripe confirms payment.">
        {(requests ?? []).length === 0 ? <p className="text-mute">No requests waiting.</p> : null}
        <ul className="flex flex-col gap-4">
          {(requests ?? []).map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface-2 p-4">
              <p className="font-semibold">{r.category}</p>
              <p className="text-sm text-mute">
                {nameOf.get(r.org_id) ?? "Organization"} · {r.duration_months / 12} year{r.duration_months === 12 ? "" : "s"} · requested {date(r.created_at)} ·{" "}
                {r.status === "approved" ? `approved, ${r.invoice_status === "open" ? "invoice sent, waiting for payment" : r.invoice_status === "payment_failed" ? "payment failed" : "no invoice yet"}` : "waiting for review"}
              </p>
              {r.note ? <p className="mt-2 text-sm">{r.note}</p> : null}
              {r.status === "requested" ? (
                <div className="mt-3">
                  <AdminButtons
                    actions={[
                      { label: "Approve category", tone: "primary", run: adminExclusivityAction.bind(null, r.id, "approve") },
                      { label: "Decline", run: adminExclusivityAction.bind(null, r.id, "decline") },
                    ]}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Categories" line="Categories that are held now. A category is available again when its exclusivity ends (the Anchor plan ended or the term ran out) or the request is declined or withdrawn.">
        {(held ?? []).length === 0 ? <p className="text-mute">No category is held.</p> : null}
        <ul className="flex flex-col gap-2 text-sm">
          {(held ?? []).map((h) => (
            <li key={h.id}>
              <span className="font-semibold">{h.category}</span> <span className="text-mute">· {nameOf.get(h.org_id) ?? "Organization"} · {h.status === "active" ? `active until ${h.ends_at ? date(h.ends_at) : "unset"}` : "approved, waiting for payment"}</span>
            </li>
          ))}
        </ul>
        {(past ?? []).length > 0 ? (
          <>
            <p className="mt-4 text-sm font-semibold">Released recently</p>
            <ul className="mt-1 flex flex-col gap-1 text-sm text-mute">
              {(past ?? []).map((h) => (
                <li key={h.id}>
                  {h.category} · {nameOf.get(h.org_id) ?? "Organization"} · {h.status}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Section>

      <Section title="Opportunities in review" line="Publish only what you can stand behind. Partners cannot publish their own.">
        {(opps ?? []).length === 0 ? <p className="text-mute">Nothing in review.</p> : null}
        <ul className="flex flex-col gap-4">
          {(opps ?? []).map((o) => (
            <li key={o.id} className="rounded-2xl border border-line bg-surface-2 p-4">
              <p className="font-semibold">{o.title}</p>
              <p className="text-sm text-mute">
                {o.organization_name} · {opportunityTypeLabel(o.type)} · {date(o.created_at)}
              </p>
              <p className="mt-2 text-sm">{o.purpose}</p>
              <p className="mt-1 text-sm text-mute">Support needed: {o.support_needed}</p>
              <div className="mt-3">
                <AdminButtons
                  actions={[
                    { label: "Publish", tone: "primary", run: adminOpportunityAction.bind(null, o.id, "publish") },
                    { label: "Close", run: adminOpportunityAction.bind(null, o.id, "close") },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Organizations" line="Verification means Victress confirmed who the organization is and that its representative is authorized. Payment is not verification.">
        <ul className="flex flex-col gap-3">
          {(orgs ?? []).map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 p-4">
              <div>
                <p className="font-semibold">
                  {o.name} {o.verified ? <span className="text-sm text-mute">(verified)</span> : null}
                </p>
                <p className="text-sm text-mute">
                  {orgTypeLabel(o.org_type)} · {planLabel(o.plan)}
                  {o.subscription_status ? ` (${o.subscription_status})` : ""} · {o.website ?? "no website"} · joined {date(o.created_at)}
                </p>
              </div>
              <AdminButtons actions={[{ label: o.verified ? "Clear verification" : "Mark verified", run: adminVerifyAction.bind(null, o.id, !o.verified) }]} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Recent admin actions">
        {(log ?? []).length === 0 ? <p className="text-mute">Nothing yet.</p> : null}
        <ul className="flex flex-col gap-1 text-sm text-mute">
          {(log ?? []).map((l) => (
            <li key={l.id}>
              {date(l.created_at)} · {l.action.replaceAll("_", " ")}
              {typeof (l.detail as { name?: string; title?: string; category?: string } | null)?.name === "string" ? ` · ${(l.detail as { name: string }).name}` : ""}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
