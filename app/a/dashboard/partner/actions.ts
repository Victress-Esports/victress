"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { OPPORTUNITY_TYPE_IDS, ORG_TYPE_IDS, WAY_IDS } from "@/content/partner";
import { requirePartner } from "@/lib/partner";
import { createExclusivityInvoice, createPartnerCheckout, createPortalSession, isValidChoice, partnerBillingEnabled } from "@/lib/partner-stripe";
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
    return fail("Checkout could not start. Try again in a moment.");
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
  const { sb, org, allowed } = await requirePartner();
  if (!allowed("offer_support")) return fail("Offer Support is part of the Supporting and Anchor plans.");
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

// ---------------------------------------------------------------- category exclusivity (Anchor Partner, owner)

const exclusivitySchema = z.object({
  category: z.string().trim().min(3).max(80),
  duration_months: z.union([z.literal(12), z.literal(24), z.literal(36), z.literal(48), z.literal(60)]),
  note: z.string().trim().max(1000),
});

/**
 * An Anchor Partner asks for a category and a duration. This only records a request. Victress approves the category in the admin queue
 * (so a category is never sold twice), then the owner pays a Stripe hosted invoice, and exclusivity starts when Stripe confirms the payment.
 * The database refuses the request unless the caller owns a paid, active Anchor organization and the category is not already held.
 */
export async function requestExclusivityAction(input: z.input<typeof exclusivitySchema>): Promise<Result> {
  const { sb, org, isOwner, allowed } = await requirePartner();
  if (!isOwner) return fail("Only the owner can request Category Exclusivity.");
  if (!allowed("request_exclusivity")) return fail("Category Exclusivity is requested by an Anchor Partner with an active plan.");
  const p = exclusivitySchema.safeParse(input);
  if (!p.success) return fail("Enter a category of 3 to 80 characters and choose a duration.");
  const { error } = await sb.from("partner_exclusivity").insert({ org_id: org.id, category: p.data.category, duration_months: p.data.duration_months, note: p.data.note || null });
  if (error) {
    if (error.code === "23505") return fail("You already have a Category Exclusivity request open. Withdraw it first to change it.");
    if (error.code === "42501") return fail("That category is not available, or this plan cannot request it. Try a different category.");
    if (limit(error.code)) return fail("You have reached the limit of 10 requests.");
    return fail();
  }
  refresh();
  return { ok: true, message: "Request sent. It stays In review until Victress approves the category. Then you can pay the invoice here." };
}

export async function withdrawExclusivityAction(id: string): Promise<Result> {
  const { sb, isOwner } = await requirePartner();
  if (!isOwner) return fail("Only the owner can withdraw a request.");
  if (!z.string().uuid().safeParse(id).success) return fail();
  const { data, error } = await sb.rpc("partner_exclusivity_withdraw", { p_request: id });
  if (error || data !== "ok") return fail(data === "not_open" ? "This request can no longer be withdrawn." : undefined);
  refresh();
  return { ok: true, message: "Request withdrawn." };
}

/** After Victress approves a category: creates the Stripe hosted invoice for $85,000 and sends the owner to it. Nothing is granted until it is paid. */
export async function startExclusivityInvoiceAction(id: string): Promise<Result> {
  const { sb, user, org, isOwner } = await requirePartner();
  if (!isOwner) return fail("Only the owner can pay for Category Exclusivity.");
  if (!partnerBillingEnabled()) return fail("Invoices are not open yet. Your approval is kept.");
  if (!z.string().uuid().safeParse(id).success) return fail();
  const { data: req } = await sb.from("partner_exclusivity").select("id, status, invoice_url").eq("id", id).maybeSingle();
  if (!req || req.status !== "approved") return fail("This request is not approved yet.");
  if (req.invoice_url) redirect(req.invoice_url);
  const admin = supabaseAdmin();
  if (!admin) return fail();
  const { data: orgRow } = await admin.from("partner_organizations").select("stripe_customer_id").eq("id", org.id).maybeSingle();
  let created: { customerId: string; invoiceId: string; url: string };
  try {
    created = await createExclusivityInvoice({
      orgId: org.id,
      requestId: id,
      orgName: org.name,
      email: user.email,
      customerId: (orgRow as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null,
    });
  } catch (e) {
    console.error("partner exclusivity invoice failed", e instanceof Error ? e.message : e);
    return fail("The invoice could not be created. Try again in a moment.");
  }
  const { data: attached, error } = await admin.rpc("partner_exclusivity_attach_invoice", { p_request: id, p_customer: created.customerId, p_invoice: created.invoiceId, p_url: created.url });
  if (error || (attached !== "ok" && attached !== "invoice_exists")) {
    console.error("partner exclusivity invoice not recorded", error?.message ?? attached);
    return fail("The invoice could not be saved. Try again in a moment.");
  }
  redirect(created.url);
}
