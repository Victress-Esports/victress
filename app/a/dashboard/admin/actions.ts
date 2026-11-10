"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAdminAction, requireAdmin } from "@/lib/partner-admin";

export type AdminResult = { ok: boolean; message?: string };
const fail = (message = "Something went wrong. Try again."): AdminResult => ({ ok: false, message });
const uuid = z.string().uuid();
const refresh = () => revalidatePath("/dashboard/admin");

/** Approve or decline a Category Exclusivity request. Approval reserves the category: the database allows one approved or active record per category. */
export async function adminExclusivityAction(id: string, decision: "approve" | "decline"): Promise<AdminResult> {
  const { admin, adminId } = await requireAdmin();
  if (!uuid.safeParse(id).success || (decision !== "approve" && decision !== "decline")) return fail();
  const { data: req } = await admin.from("partner_exclusivity").select("id, org_id, category, status").eq("id", id).maybeSingle();
  if (!req || req.status !== "requested") return fail("This request is no longer waiting for review.");
  if (decision === "approve") {
    // The organization must still be a paid, active Anchor Partner.
    const { data: org } = await admin.from("partner_organizations").select("plan, subscription_status").eq("id", req.org_id).maybeSingle();
    if (!org || org.plan !== "anchor" || !["active", "trialing"].includes(org.subscription_status ?? "")) return fail("This organization is not an active Anchor Partner, so exclusivity cannot be approved.");
  }
  const { error } = await admin.from("partner_exclusivity").update({ status: decision === "approve" ? "approved" : "declined" }).eq("id", id).eq("status", "requested");
  if (error) return fail(error.code === "23505" ? `The category "${req.category}" is already approved or active for another organization.` : undefined);
  await logAdminAction(admin, adminId, decision === "approve" ? "approve_exclusivity" : "decline_exclusivity", "partner_exclusivity", id, { org_id: req.org_id, category: req.category });
  refresh();
  return { ok: true, message: decision === "approve" ? "Approved. The owner can now pay the invoice." : "Declined." };
}

/** Publish (or close) an opportunity. Partners cannot publish their own. */
export async function adminOpportunityAction(id: string, decision: "publish" | "close"): Promise<AdminResult> {
  const { admin, adminId } = await requireAdmin();
  if (!uuid.safeParse(id).success || (decision !== "publish" && decision !== "close")) return fail();
  const { data: opp } = await admin.from("partner_opportunities").select("id, org_id, title, status").eq("id", id).maybeSingle();
  if (!opp || opp.status !== "in_review") return fail("This opportunity is no longer in review.");
  const patch = decision === "publish" ? { status: "published", published_at: new Date().toISOString() } : { status: "closed" };
  const { error } = await admin.from("partner_opportunities").update(patch).eq("id", id).eq("status", "in_review");
  if (error) return fail();
  await logAdminAction(admin, adminId, decision === "publish" ? "publish_opportunity" : "close_opportunity", "partner_opportunities", id, { org_id: opp.org_id, title: opp.title });
  refresh();
  return { ok: true, message: decision === "publish" ? "Published." : "Closed." };
}

/** Set or clear verification after checking identity (docs/proposals/organization-verification.md). Payment is not verification. */
export async function adminVerifyAction(orgId: string, verified: boolean): Promise<AdminResult> {
  const { admin, adminId } = await requireAdmin();
  if (!uuid.safeParse(orgId).success) return fail();
  const { data: org } = await admin.from("partner_organizations").select("id, name, verified").eq("id", orgId).maybeSingle();
  if (!org) return fail("Organization not found.");
  const { error } = await admin.from("partner_organizations").update({ verified, verified_at: verified ? new Date().toISOString() : null }).eq("id", orgId);
  if (error) return fail();
  await logAdminAction(admin, adminId, verified ? "verify_organization" : "unverify_organization", "partner_organizations", orgId, { name: org.name });
  refresh();
  return { ok: true, message: verified ? "Verified." : "Verification cleared." };
}
