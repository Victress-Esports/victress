import "server-only";
import { stripeGet, stripePost } from "@/lib/partner-stripe";

/**
 * Player billing (Pro monthly and annual, Team monthly, Scout monthly), server only.
 * Behind NEXT_PUBLIC_BILLING_ENABLED, which stays false on Production. Test mode only: a key that is not a Stripe TEST key is refused here,
 * and the webhook ignores live mode events. Moving to live mode is a separate approval and a separate change.
 * The price always comes from this server side list (built from env vars); the browser sends a plan name and an interval, never a price id.
 * Partner billing is separate (lib/partner-stripe.ts, PARTNER_BILLING_ENABLED).
 */
export type PlayerPlanId = "pro" | "team" | "scout";
export type PlayerInterval = "month" | "year";
export interface PlayerChoice {
  plan: PlayerPlanId;
  interval: PlayerInterval;
}

/** Every offering. Annual Pro is offered (founder decision, 2026-11-10); Team and Scout are monthly. */
export const PLAYER_CHOICES: (PlayerChoice & { env: string })[] = [
  { plan: "pro", interval: "month", env: "STRIPE_PRICE_PRO_MONTHLY" },
  { plan: "pro", interval: "year", env: "STRIPE_PRICE_PRO_ANNUAL" },
  { plan: "team", interval: "month", env: "STRIPE_PRICE_TEAM_MONTHLY" },
  { plan: "scout", interval: "month", env: "STRIPE_PRICE_SCOUT_MONTHLY" },
];

export const isPlayerChoice = (plan: string, interval: string): boolean => PLAYER_CHOICES.some((c) => c.plan === plan && c.interval === interval);

export function playerPriceId(c: PlayerChoice): string | null {
  const row = PLAYER_CHOICES.find((x) => x.plan === c.plan && x.interval === c.interval);
  return (row && process.env[row.env]) || null;
}

/** Reverse lookup for the webhook: the plan is decided by the price Stripe billed, never by metadata alone. */
export function playerChoiceForPrice(priceId: string | null | undefined): PlayerChoice | null {
  if (!priceId) return null;
  const row = PLAYER_CHOICES.find((c) => process.env[c.env] === priceId);
  return row ? { plan: row.plan, interval: row.interval } : null;
}

export const playerBillingEnabled = () => process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

/** Test mode guard. Only a Stripe test key (secret or restricted) may be used for player billing. */
export const hasTestKey = () => /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");

export async function createPlayerCheckout(opts: {
  profileId: string;
  choice: PlayerChoice;
  email?: string | null;
  customerId?: string | null;
  returnBase: string;
}): Promise<string> {
  if (!hasTestKey()) throw new Error("Player billing needs a Stripe test mode key");
  const price = playerPriceId(opts.choice);
  if (!price) throw new Error(`No Stripe price is configured for ${opts.choice.plan} ${opts.choice.interval}`);
  const meta = { kind: "player", profile_id: opts.profileId, plan: opts.choice.plan, interval: opts.choice.interval };
  const p = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${opts.returnBase}/settings/billing?checkout=success`,
    cancel_url: `${opts.returnBase}/settings/billing?checkout=cancelled`,
    client_reference_id: opts.profileId,
  });
  for (const [k, v] of Object.entries(meta)) {
    p.set(`metadata[${k}]`, v);
    p.set(`subscription_data[metadata][${k}]`, v);
  }
  if (opts.customerId) p.set("customer", opts.customerId);
  else if (opts.email) p.set("customer_email", opts.email);
  const s = await stripePost<{ url?: string }>("checkout/sessions", p);
  if (!s.url) throw new Error("Stripe returned no checkout URL");
  return s.url;
}

export async function createPlayerPortal(customerId: string, returnUrl: string): Promise<string> {
  if (!hasTestKey()) throw new Error("Player billing needs a Stripe test mode key");
  const s = await stripePost<{ url?: string }>("billing_portal/sessions", new URLSearchParams({ customer: customerId, return_url: returnUrl }));
  if (!s.url) throw new Error("Stripe returned no portal URL");
  return s.url;
}

export interface PlayerSubscription {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { id?: string }; current_period_end?: number }[] };
}
export const retrievePlayerSubscription = (id: string) => stripeGet<PlayerSubscription>(`subscriptions/${encodeURIComponent(id)}`);

/** Grace period after a failed payment (founder decision, 2026-11-07): 7 days. */
export const GRACE_DAYS = 7;

/** Does a stored subscription row grant its plan right now? active and trialing do. past_due does for 7 days from the first failure. Everything else does not. */
export function grantsPlan(row: { status: string; payment_failed_at: string | null }, now = Date.now()): boolean {
  if (row.status === "active" || row.status === "trialing") return true;
  if (row.status === "past_due" && row.payment_failed_at) return now - new Date(row.payment_failed_at).getTime() < GRACE_DAYS * 86_400_000;
  return false;
}
