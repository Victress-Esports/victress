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

/**
 * What the Scout Desk page may do for a plan.
 * - "plan": the account is not on the Scout plan. Locked, with an explanation.
 * - "closed": on the Scout plan, but discovery is not open. There is no state in which this page shows player data today:
 *   recruiter discovery and contact are disabled for all players pending qualified legal review, individual scouts are excluded,
 *   and Scout access is not sold or enabled until verification capacity and policy exist (decision register, decision 7).
 * No database policy, function or flag grants any recruiter access to other players' data, and this file does not add one.
 */
export type ScoutDeskState = "plan" | "closed";
export const scoutDeskState = (t: Tier): ScoutDeskState => (canUseScoutDesk(t) ? "closed" : "plan");
