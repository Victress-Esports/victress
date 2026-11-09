import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PartnerInterval, PartnerPlanId } from "@/content/partner";

/**
 * Partner billing, server only. Talks to Stripe over its REST API with fetch (no SDK), and verifies webhook signatures itself.
 * Partner billing has its own switch, PARTNER_BILLING_ENABLED, and never reads NEXT_PUBLIC_BILLING_ENABLED, which stays false.
 */
export const partnerBillingEnabled = () => process.env.PARTNER_BILLING_ENABLED === "true";

type PaidPlan = Exclude<PartnerPlanId, "community">;
export interface PaidChoice {
  plan: PaidPlan;
  interval: PartnerInterval;
}

/** The three partner prices (env vars hold Stripe price ids, test mode first). Anchor is annual only. */
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

async function stripe<T>(path: string, params: URLSearchParams): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const res = await fetch(`${api()}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !json) throw new Error(`Stripe ${path} failed (${res.status}): ${json?.error?.message ?? "no detail"}`);
  return json;
}

async function stripeGet<T>(path: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
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

export interface StripeSubscription {
  id: string;
  customer: string | { id: string };
  status: string;
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
