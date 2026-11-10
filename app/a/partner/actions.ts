"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { ORG_TYPE_IDS, PARTNER_TERMS_VERSION } from "@/content/partner";
import { requireUser } from "@/lib/auth";
import { createAnchorInvoiceSubscription, createPartnerCheckout, isValidChoice, partnerBillingEnabled } from "@/lib/partner-stripe";
import { APP_URL } from "@/lib/urls";

export type PartnerSignupResult = { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  invalid_name: "Organization names are 2 to 80 characters.",
  invalid_type: "Choose an organization type.",
  invalid_website: "Enter a website that starts with http:// or https://, or leave it empty.",
  terms_required: "Confirm that you are authorized and accept the Terms to continue.",
  unauthorized: "Sign in again to continue.",
};

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(ORG_TYPE_IDS),
  website: z.string().trim().max(200),
  plan: z.enum(["community", "supporting", "anchor"]),
  interval: z.enum(["monthly", "annual"]),
  /** Anchor only: pay by Stripe hosted invoice instead of Checkout (card or ACH). */
  payment: z.enum(["checkout", "invoice"]).default("checkout"),
  authorized: z.literal(true),
});

/** A bare domain is allowed in the form; store it as https://. Anything with another scheme stays as typed and the database refuses it. */
const normalizeWebsite = (w: string) => (w && !/^[a-z][a-z0-9+.-]*:/i.test(w) ? `https://${w}` : w);

/**
 * Creates the organization on Community (create_partner_org: organization and owner together, terms version and time stored),
 * then, for a paid plan with partner billing on, sends the person to Stripe Checkout. The plan is changed only by the verified
 * webhook, never here. Redirects on success; returns a message on a problem.
 */
export async function createPartnerOrgAction(input: z.input<typeof schema>): Promise<PartnerSignupResult> {
  const { sb, user } = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const terms = parsed.error.issues.some((i) => i.path[0] === "authorized");
    return { ok: false, message: terms ? MESSAGES.terms_required : "Check the form. A name and an organization type are required." };
  }
  const v = parsed.data;

  const { data, error } = await sb.rpc("create_partner_org", {
    p_name: v.name,
    p_type: v.type,
    p_website: normalizeWebsite(v.website) || null,
    p_terms_version: PARTNER_TERMS_VERSION,
    p_authorized: true,
  });
  const res = data as { status?: string; org_id?: string } | null;
  if (error || !res?.status) return { ok: false, message: "Something went wrong. Try again." };
  if (res.status === "already_member") redirect("/dashboard/partner");
  if (res.status !== "ok" || !res.org_id) return { ok: false, message: MESSAGES[res.status] ?? "Something went wrong. Try again." };

  if (v.plan === "community") redirect("/dashboard/partner");

  // A paid plan. The organization now exists on Community either way.
  if (!partnerBillingEnabled()) redirect("/dashboard/partner/settings?billing=off");
  const interval = v.plan === "anchor" ? "annual" : v.interval;
  if (!isValidChoice(v.plan, interval)) redirect("/dashboard/partner/settings?billing=error");
  let url: string;
  try {
    if (v.plan === "anchor" && v.payment === "invoice") {
      url = (await createAnchorInvoiceSubscription({ orgId: res.org_id, orgName: v.name, email: user.email })).url;
    } else url = await createPartnerCheckout({ orgId: res.org_id, choice: { plan: v.plan, interval }, email: user.email, returnBase: APP_URL });
  } catch (e) {
    console.error("partner checkout failed", e instanceof Error ? e.message : e);
    redirect("/dashboard/partner/settings?billing=error");
  }
  redirect(url);
}
