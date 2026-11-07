import "server-only";
import { PLANS, type Plan } from "@/content/pricing";

export type Tier = Plan["id"];

/**
 * The account's plan. No billing or entitlement data exists yet and billing is off, so every account is Rookie.
 * When billing ships, this reads entitlements derived from verified Stripe webhook events (docs/proposals/entitlements.md),
 * never from anything the user can edit.
 */
export async function currentTier(): Promise<Tier> {
  return "rookie";
}

export const planName = (t: Tier) => PLANS.find((p) => p.id === t)?.name ?? "Rookie";
export const billingEnabled = () => process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

/** Scout Desk (player discovery) is the Scout plan only. Team does not include it until the founder approves otherwise. */
export const canUseScoutDesk = (t: Tier) => t === "scout";
