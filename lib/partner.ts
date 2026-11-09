import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isPaidPlan } from "@/content/partner";
import { isMissingTable } from "@/lib/db-errors";
import { loadMe } from "@/lib/me";

const ORG_COLUMNS = "id, name, org_type, website, plan, billing_interval, verified, verified_at, subscription_status, terms_version, terms_accepted_at, created_at, updated_at";

/** The signed in account's Partner organization, or null. `available` is false when the Partner tables do not exist yet. */
export const loadPartner = cache(async () => {
  const me = await loadMe();
  const { sb } = me;
  const { data: member, error } = await sb.from("partner_members").select("org_id, role").maybeSingle();
  if (isMissingTable(error)) return { ...me, available: false as const, org: null, role: null, paid: false };
  if (!member) return { ...me, available: true as const, org: null, role: null, paid: false };
  const { data: org } = await sb.from("partner_organizations").select(ORG_COLUMNS).eq("id", member.org_id).maybeSingle();
  // Mirrors the database rule partner_is_paid(): a paid plan with an active or trialing subscription. The database enforces it too.
  const paid = !!org && isPaidPlan(org.plan) && ["active", "trialing"].includes(org.subscription_status ?? "");
  return { ...me, available: true as const, org: org ?? null, role: member.role, paid };
});

/** Use at the top of every Partner page. Anyone who is not a member of a Partner organization goes to /partner. */
export async function requirePartner() {
  const p = await loadPartner();
  if (!p.org) redirect("/partner");
  return { ...p, org: p.org, isOwner: p.role === "owner" };
}

/** Same-site return base for Stripe. */
export { APP_URL as partnerReturnBase } from "@/lib/urls";
