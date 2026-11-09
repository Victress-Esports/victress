"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { OPPORTUNITY_TYPE_IDS, ORG_TYPE_IDS, WAY_IDS } from "@/content/partner";
import { requirePartner } from "@/lib/partner";
import { createPartnerCheckout, createPortalSession, isValidChoice, partnerBillingEnabled } from "@/lib/partner-stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_URL } from "@/lib/urls";

export type Result = { ok: boolean; message?: string };
const fail = (message = "Something went wrong. Try again."): Result => ({ ok: false, message });
const refresh = () => revalidatePath("/dashboard/partner", "layout");
const limit = (code?: string) => code === "P0001";

// ---------------------------------------------------------------- organization settings (owner)

const orgSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(ORG_TYPE_IDS),
  website: z.string().trim().max(200),
});

export async function updateOrganizationAction(input: z.input<typeof orgSchema>): Promise<Result> {
  const { sb, org, isOwner } = await requirePartner();
  if (!isOwner) return fail("Only the owner can change organization details.");
  const p = orgSchema.safeParse(input);
  if (!p.success) return fail("A name of 2 to 80 characters and an organization type are required.");
  const site = p.data.website && !/^[a-z][a-z0-9+.-]*:/i.test(p.data.website) ? `https://${p.data.website}` : p.data.website;
  if (site && !/^https?:\/\/\S+$/i.test(site)) return fail("Enter a website that starts with http:// or https://, or leave it empty.");
  const { error } = await sb.from("partner_organizations").update({ name: p.data.name, org_type: p.data.type, website: site || null }).eq("id", org.id);
  if (error) return fail();
  refresh();
  return {
    ok: true,
    message: org.verified && (p.data.name !== org.name || (site || null) !== org.website) ? "Saved. Changing the name or website means verification must be checked again." : "Saved.",
  };
}

// ---------------------------------------------------------------- billing (owner)

/** Starts Stripe Checkout for an upgrade. The plan changes only when the verified webhook arrives. */
export async function startUpgradeAction(plan: string, interval: string): Promise<Result> {
  const { user, org, isOwner, paid } = await requirePartner();
  if (!isOwner) return fail("Only the owner can change the plan.");
  if (!partnerBillingEnabled()) return fail("Paid plans are not open yet. You stay on Community Partner.");
  if (paid) return fail("This organization already has a paid plan. Use Manage billing to change it.");
  const iv = plan === "anchor" ? "annual" : interval;
  if (!isValidChoice(plan, iv)) return fail("Choose a plan and billing interval.");
  let customerId: string | null = null;
  const admin = supabaseAdmin();
  if (admin) {
    const { data } = await admin.from("partner_organizations").select("stripe_customer_id").eq("id", org.id).maybeSingle();
    customerId = (data as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;
  }
  let url: string;
  try {
    url = await createPartnerCheckout({ orgId: org.id, choice: { plan, interval: iv as "monthly" | "annual" }, email: user.email, customerId, returnBase: APP_URL });
  } catch (e) {
    console.error("partner checkout failed", e instanceof Error ? e.message : e);
    return fail("Checkout could not start. Try again, or contact Victress.");
  }
  redirect(url);
}

/** Opens the Stripe customer portal. The customer id never reaches the browser: it is read with the service role after checking ownership. */
export async function openBillingPortalAction(): Promise<Result> {
  const { org, isOwner } = await requirePartner();
  if (!isOwner) return fail("Only the owner can manage billing.");
  if (!partnerBillingEnabled()) return fail("Billing is not open yet.");
  const admin = supabaseAdmin();
  const { data } = admin ? await admin.from("partner_organizations").select("stripe_customer_id").eq("id", org.id).maybeSingle() : { data: null };
  const customer = (data as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
  if (!customer) return fail("There is no billing account for this organization yet.");
  let url: string;
  try {
    url = await createPortalSession(customer, `${APP_URL}/dashboard/partner/settings`);
  } catch (e) {
    console.error("partner portal failed", e instanceof Error ? e.message : e);
    return fail("The billing portal could not open. Try again.");
  }
  redirect(url);
}

// ---------------------------------------------------------------- participation, opportunities, support

const participationSchema = z.object({
  way: z.enum(WAY_IDS),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(1000),
});

export async function submitParticipationAction(input: z.input<typeof participationSchema>): Promise<Result> {
  const { sb, org } = await requirePartner();
  const p = participationSchema.safeParse(input);
  if (!p.success) return fail("Choose a way to participate, a title (3 to 120 characters) and a description (10 to 1000).");
  const { error } = await sb.from("partner_participation").insert({ org_id: org.id, way: p.data.way, title: p.data.title, description: p.data.description });
  if (error) return fail(limit(error.code) ? "You have reached the limit of 50 submissions." : undefined);
  refresh();
  return { ok: true, message: "Submitted. Victress will review it." };
}

const opportunitySchema = z.object({
  type: z.enum(OPPORTUNITY_TYPE_IDS),
  title: z.string().trim().min(3).max(120),
  purpose: z.string().trim().min(10).max(1000),
  support_needed: z.string().trim().min(5).max(1000),
});

export async function submitOpportunityAction(input: z.input<typeof opportunitySchema>): Promise<Result> {
  const { sb, org } = await requirePartner();
  const p = opportunitySchema.safeParse(input);
  if (!p.success) return fail("Choose a type, then add a title, a purpose (10 characters or more) and the support needed.");
  const { error } = await sb.from("partner_opportunities").insert({ org_id: org.id, ...p.data });
  if (error) return fail(limit(error.code) ? "You have reached the limit of 25 opportunities." : undefined);
  refresh();
  return { ok: true, message: "Submitted. It stays In review until Victress publishes it." };
}

const offerSchema = z.object({
  opportunity_id: z.string().uuid(),
  support_type: z.enum(WAY_IDS),
  message: z.string().trim().min(10).max(1000),
});

/** Paid, active plan only, and only on another organization's published opportunity. The database policy enforces both, whatever this page shows. */
export async function offerSupportAction(input: z.input<typeof offerSchema>): Promise<Result> {
  const { sb, org, paid } = await requirePartner();
  if (!paid) return fail("Offer Support is part of the Supporting and Anchor plans.");
  const p = offerSchema.safeParse(input);
  if (!p.success) return fail("Choose a type of support and add a message of 10 to 1000 characters.");
  const { error } = await sb.from("partner_support_offers").insert({ org_id: org.id, ...p.data });
  if (error) {
    if (error.code === "23505") return fail("You have already offered support on this opportunity.");
    if (limit(error.code)) return fail("You have reached the limit of 100 support offers.");
    return fail("That offer could not be sent. It may not be available anymore.");
  }
  refresh();
  return { ok: true, message: "Offer sent. Victress will follow up." };
}
