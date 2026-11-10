import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { can, effectivePlan, isPaidPlan, type Capability, type PartnerPlanId } from "@/content/partner";
import { isMissingTable } from "@/lib/db-errors";
import { loadMe } from "@/lib/me";

const ORG_COLUMNS = "id, name, org_type, website, plan, billing_interval, verified, verified_at, subscription_status, terms_version, terms_accepted_at, created_at, updated_at";

export interface ExclusivityRow {
  id: string;
  category: string;
  duration_months: number;
  note: string | null;
  status: "requested" | "approved" | "declined" | "withdrawn" | "active" | "ended";
  invoice_url: string | null;
  invoice_status: "open" | "paid" | "payment_failed" | "void" | null;
  approved_at: string | null;
  activated_at: string | null;
  ends_at: string | null;
  created_at: string;
}
const EXCLUSIVITY_COLUMNS = "id, category, duration_months, note, status, invoice_url, invoice_status, approved_at, activated_at, ends_at, created_at";

/** The signed in account's Partner organization, or null. `available` is false when the Partner tables do not exist yet. */
export const loadPartner = cache(async () => {
  const me = await loadMe();
  const { sb } = me;
  const { data: member, error } = await sb.from("partner_members").select("org_id, role").maybeSingle();
  if (isMissingTable(error)) return { ...me, available: false as const, org: null, role: null, paid: false, plan: "community" as PartnerPlanId, exclusivity: null, allowed: (_c: Capability): boolean => false };
  if (!member) return { ...me, available: true as const, org: null, role: null, paid: false, plan: "community" as PartnerPlanId, exclusivity: null, allowed: (_c: Capability): boolean => false };
  const { data: org } = await sb.from("partner_organizations").select(ORG_COLUMNS).eq("id", member.org_id).maybeSingle();
  // Mirrors the database rule partner_is_paid(): a paid plan with an active or trialing subscription. The database enforces it too.
  const paid = !!org && isPaidPlan(org.plan) && ["active", "trialing"].includes(org.subscription_status ?? "");
  // The latest request that is still open or running. Older (withdrawn, declined, ended) ones are history. The table is missing until the exclusivity migration is applied.
  let exclusivity: ExclusivityRow | null = null;
  if (org) {
    const { data, error: exErr } = await sb.from("partner_exclusivity").select(EXCLUSIVITY_COLUMNS).in("status", ["requested", "approved", "active"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!exErr) exclusivity = (data as ExclusivityRow | null) ?? null;
  }
  const running = !!exclusivity && exclusivity.status === "active" && (!exclusivity.ends_at || new Date(exclusivity.ends_at) > new Date());
  // The plan whose entitlements apply right now (content/partner-entitlements.ts). Pages and actions ask `allowed(...)`, not plan names.
  const plan = effectivePlan(org?.plan ?? "community", paid, running);
  return { ...me, available: true as const, org: org ?? null, role: member.role, paid, plan, exclusivity, allowed: (c: Capability): boolean => can(plan, c) };
});

/** Use at the top of every Partner page. Anyone who is not a member of a Partner organization goes to /partner. */
export async function requirePartner() {
  const p = await loadPartner();
  if (!p.org) redirect("/partner");
  return { ...p, org: p.org, isOwner: p.role === "owner" };
}

/** Same-site return base for Stripe. */
export { APP_URL as partnerReturnBase } from "@/lib/urls";
