import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PartnerInterval, SignupPlanId } from "@/content/partner";

/**
 * Partner billing, server only. Talks to Stripe over its REST API with fetch (no SDK), and verifies webhook signatures itself.
 * Partner billing has its own switch, PARTNER_BILLING_ENABLED, and never reads NEXT_PUBLIC_BILLING_ENABLED, which stays false.
 */
export const partnerBillingEnabled = () => process.env.PARTNER_BILLING_ENABLED === "true";

type PaidPlan = Exclude<SignupPlanId, "community">;
export interface PaidChoice {
  plan: PaidPlan;
  interval: PartnerInterval;
}

/** The three subscription prices (env vars hold Stripe price ids, test mode first). Anchor is annual only. The exclusivity price is separate: see exclusivityPriceId. */
export function partnerPriceId({ plan, interval }: PaidChoice): string | null {
  const env = process.env;
  if (plan === "supporting" && interval === "monthly") return env.STRIPE_PRICE_PARTNER_SUPPORTING_MONTHLY || null;
  if (plan === "supporting" && interval === "annual") return env.STRIPE_PRICE_PARTNER_SUPPORTING_ANNUAL || null;
  if (plan === "anchor" && interval === "annual") return env.STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL || null;
  return null;
}

/** Reverse lookup, used by the webhook: the plan is decided by the price Stripe actually billed, never by metadata alone. */
export function choiceForPrice(priceId: string | null | undefined): PaidChoice | null {
  if (!priceId) return null;
  const all: PaidChoice[] = [
    { plan: "supporting", interval: "monthly" },
    { plan: "supporting", interval: "annual" },
    { plan: "anchor", interval: "annual" },
  ];
  return all.find((c) => partnerPriceId(c) === priceId) ?? null;
}

export const isValidChoice = (plan: string, interval: string): plan is PaidPlan =>
  (plan === "supporting" && (interval === "monthly" || interval === "annual")) || (plan === "anchor" && interval === "annual");

/** Test only: lets scripts/partner-webhook-test.mjs point at a local fake. Production never sets it. */
const api = () => process.env.STRIPE_API_BASE || "https://api.stripe.com/v1";

/** Previews and local runs refuse a live Stripe key. Only the Production deployment may ever hold one, and Partner billing is test mode until the founder approves live mode. */
function stripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (process.env.VERCEL_ENV !== "production" && key.startsWith("sk_live_")) throw new Error("A live Stripe key is set outside Production. Refusing to use it.");
  return key;
}

async function stripe<T>(path: string, params: URLSearchParams, idempotencyKey?: string): Promise<T> {
  const key = stripeKey();
  const res = await fetch(`${api()}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: params,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !json) throw new Error(`Stripe ${path} failed (${res.status}): ${json?.error?.message ?? "no detail"}`);
  return json;
}

async function stripeGet<T>(path: string): Promise<T> {
  const key = stripeKey();
  const res = await fetch(`${api()}/${path}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !json) throw new Error(`Stripe ${path} failed (${res.status}): ${json?.error?.message ?? "no detail"}`);
  return json;
}

/** A subscription Checkout Session. Metadata is on both the session and the subscription so every webhook event carries it. */
export async function createPartnerCheckout(opts: {
  orgId: string;
  choice: PaidChoice;
  email?: string | null;
  customerId?: string | null;
  returnBase: string;
}): Promise<string> {
  const price = partnerPriceId(opts.choice);
  if (!price) throw new Error(`No Stripe price is configured for ${opts.choice.plan} ${opts.choice.interval}`);
  const meta = { kind: "partner", org_id: opts.orgId, plan: opts.choice.plan, interval: opts.choice.interval };
  const p = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${opts.returnBase}/dashboard/partner/settings?billing=success`,
    cancel_url: `${opts.returnBase}/dashboard/partner/settings?billing=cancelled`,
    client_reference_id: opts.orgId,
  });
  for (const [k, v] of Object.entries(meta)) {
    p.set(`metadata[${k}]`, v);
    p.set(`subscription_data[metadata][${k}]`, v);
  }
  if (opts.customerId) p.set("customer", opts.customerId);
  else if (opts.email) p.set("customer_email", opts.email);
  const s = await stripe<{ url?: string }>("checkout/sessions", p);
  if (!s.url) throw new Error("Stripe returned no checkout URL");
  return s.url;
}

export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const s = await stripe<{ url?: string }>("billing_portal/sessions", new URLSearchParams({ customer: customerId, return_url: returnUrl }));
  if (!s.url) throw new Error("Stripe returned no portal URL");
  return s.url;
}

/** The Stripe price for "Anchor Partner with Category Exclusivity" ($85,000 per year). Read only to work out the upgrade difference; never used in Checkout. */
export const exclusivityPriceId = () => process.env.STRIPE_PRICE_PARTNER_ANCHOR_EXCLUSIVE_ANNUAL || null;

/** Unit amount in cents of a Stripe price. */
async function priceCents(id: string): Promise<number> {
  const p = await stripeGet<{ unit_amount?: number | null }>(`prices/${encodeURIComponent(id)}`);
  if (typeof p.unit_amount !== "number") throw new Error(`Stripe price ${id} has no unit amount`);
  return p.unit_amount;
}

/**
 * A Stripe hosted invoice for an APPROVED exclusivity request. Anchor Partner with Category Exclusivity replaces Anchor and includes
 * everything in it, so an Anchor Partner who upgrades is invoiced the DIFFERENCE between the two prices (85,000 minus 50,000 as Stripe
 * has them configured). Nothing is cancelled or credited automatically. Never Checkout: the person pays on the hosted invoice page
 * (card, ACH or bank transfer, whatever the Victress Stripe account has enabled for invoices) and exclusivity activates only when the
 * invoice.paid webhook arrives. Idempotency keys make a double click or a retry return the same customer, invoice and item.
 * collection_method send_invoice with auto_advance false, so Stripe emails no one: the app sends the person to the hosted page.
 */
export async function createExclusivityInvoice(opts: {
  orgId: string;
  requestId: string;
  orgName: string;
  email?: string | null;
  customerId?: string | null;
}): Promise<{ customerId: string; invoiceId: string; url: string; amountCents: number }> {
  const exclusive = exclusivityPriceId();
  const anchor = partnerPriceId({ plan: "anchor", interval: "annual" });
  if (!exclusive) throw new Error("STRIPE_PRICE_PARTNER_ANCHOR_EXCLUSIVE_ANNUAL is not set");
  if (!anchor) throw new Error("STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL is not set");
  const amountCents = (await priceCents(exclusive)) - (await priceCents(anchor));
  if (amountCents <= 0) throw new Error("The exclusivity price must be higher than the Anchor price");

  const meta = { kind: "partner_exclusivity", org_id: opts.orgId, request_id: opts.requestId };
  const withMeta = (p: URLSearchParams) => {
    for (const [k, v] of Object.entries(meta)) p.set(`metadata[${k}]`, v);
    return p;
  };
  const idem = (step: string) => `exclusivity-${opts.requestId}-${step}`;

  let customerId = opts.customerId ?? null;
  if (!customerId) {
    const c = new URLSearchParams({ name: opts.orgName });
    if (opts.email) c.set("email", opts.email);
    customerId = (await stripe<{ id: string }>("customers", withMeta(c), idem("customer"))).id;
  }
  const inv = await stripe<{ id: string }>(
    "invoices",
    withMeta(new URLSearchParams({ customer: customerId, collection_method: "send_invoice", days_until_due: "30", auto_advance: "false", pending_invoice_items_behavior: "exclude" })),
    idem("invoice"),
  );
  await stripe(
    "invoiceitems",
    withMeta(new URLSearchParams({
      customer: customerId,
      invoice: inv.id,
      amount: String(amountCents),
      currency: "usd",
      description: "Upgrade from Anchor Partner to Anchor Partner with Category Exclusivity (the difference between the two annual prices)",
    })),
    idem("item"),
  );
  const done = await stripe<{ id: string; hosted_invoice_url?: string | null }>(`invoices/${encodeURIComponent(inv.id)}/finalize`, new URLSearchParams({ auto_advance: "false" }), idem("finalize"));
  if (!done.hosted_invoice_url) throw new Error("Stripe returned no hosted invoice URL");
  return { customerId, invoiceId: done.id, url: done.hosted_invoice_url, amountCents };
}

/**
 * Anchor Partner paid by Stripe hosted invoice (the other ways are card or ACH through Checkout). A subscription with
 * collection_method send_invoice: Stripe marks it active as soon as it exists, so access is NOT granted from the subscription events.
 * The webhook records such a subscription as incomplete until its first invoice is paid (see app/api/stripe/webhook/route.ts).
 */
export async function createAnchorInvoiceSubscription(opts: {
  orgId: string;
  orgName: string;
  email?: string | null;
  customerId?: string | null;
}): Promise<{ url: string }> {
  const price = partnerPriceId({ plan: "anchor", interval: "annual" });
  if (!price) throw new Error("No Stripe price is configured for anchor annual");
  const meta = { kind: "partner", org_id: opts.orgId, plan: "anchor", interval: "annual" };
  let customerId = opts.customerId ?? null;
  if (!customerId) {
    const c = new URLSearchParams({ name: opts.orgName });
    if (opts.email) c.set("email", opts.email);
    for (const [k, v] of Object.entries(meta)) c.set(`metadata[${k}]`, v);
    customerId = (await stripe<{ id: string }>("customers", c, `anchor-invoice-customer-${opts.orgId}`)).id;
  }
  const p = new URLSearchParams({
    customer: customerId,
    "items[0][price]": price,
    "items[0][quantity]": "1",
    collection_method: "send_invoice",
    days_until_due: "30",
    "expand[0]": "latest_invoice",
  });
  for (const [k, v] of Object.entries(meta)) p.set(`metadata[${k}]`, v);
  const sub = await stripe<{ latest_invoice?: { id: string; hosted_invoice_url?: string | null; status?: string } | null }>("subscriptions", p, `anchor-invoice-sub-${opts.orgId}`);
  const inv = sub.latest_invoice;
  if (!inv) throw new Error("Stripe returned no invoice for the subscription");
  let url = inv.hosted_invoice_url ?? null;
  if (!url && inv.status === "draft") url = (await stripe<{ hosted_invoice_url?: string | null }>(`invoices/${encodeURIComponent(inv.id)}/finalize`, new URLSearchParams({ auto_advance: "false" }))).hosted_invoice_url ?? null;
  if (!url) throw new Error("Stripe returned no hosted invoice URL");
  return { url };
}

export interface StripeInvoice {
  id: string;
  status?: string | null;
  billing_reason?: string | null;
  amount_due?: number;
  amount_paid?: number;
  currency?: string;
  created?: number;
  number?: string | null;
  description?: string | null;
  hosted_invoice_url?: string | null;
  subscription?: string | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  metadata?: Record<string, string>;
}
export const invoiceSubscriptionId = (inv: StripeInvoice) => inv.subscription ?? inv.parent?.subscription_details?.subscription ?? null;
export const retrieveInvoice = (id: string) => stripeGet<StripeInvoice>(`invoices/${encodeURIComponent(id)}`);
/** Payment history for the organization's Stripe customer: newest first. Read only. */
export async function listInvoices(customerId: string, limit = 24): Promise<StripeInvoice[]> {
  const r = await stripeGet<{ data?: StripeInvoice[] }>(`invoices?customer=${encodeURIComponent(customerId)}&limit=${limit}`);
  return (r.data ?? []).filter((i) => i.status !== "draft");
}

export interface StripeSubscription {
  id: string;
  customer: string | { id: string };
  status: string;
  collection_method?: string;
  latest_invoice?: string | { id: string } | null;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { id?: string } }[] };
}

export const retrieveSubscription = (id: string) => stripeGet<StripeSubscription>(`subscriptions/${encodeURIComponent(id)}`);

/**
 * Verifies a Stripe-Signature header against the RAW request body (never a parsed and re-serialized one).
 * Accepts any v1 signature in the header, rejects timestamps more than `toleranceSeconds` away, compares in constant time.
 */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300): boolean {
  if (!header || !secret) return false;
  let t = "";
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") sigs.push(v);
  }
  const ts = Number(t);
  if (!t || !Number.isFinite(ts) || sigs.length === 0) return false;
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest("hex"), "utf8");
  return sigs.some((s) => {
    const got = Buffer.from(s, "utf8");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** The Stripe REST helpers, shared with player billing (lib/billing.ts). Same key rules: a live key is refused outside Production. */
export { stripe as stripePost, stripeGet };
