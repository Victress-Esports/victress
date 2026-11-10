import "server-only";
import { PLANS, type Plan } from "@/content/pricing";
import { grantsPlan } from "@/lib/billing";
import { supabaseServer } from "@/lib/supabase/server";

export type Tier = Plan["id"];

const RANK: Record<Tier, number> = { rookie: 0, pro: 1, team: 2, scout: 3 };

/**
 * The signed in account's plan. Rookie unless billing is on AND the account has a subscription row, written only by the verified Stripe webhook,
 * that currently grants its plan (active or trialing; past_due for 7 days after the first failed payment; then Rookie). It reads the player's own
 * rows through row level security, never anything the player can edit. With billing off (Production today) every account is Rookie.
 * The highest plan wins if more than one row grants.
 */
export async function currentTier(): Promise<Tier> {
  if (!billingEnabled()) return "rookie";
  const sb = await supabaseServer();
  const { data, error } = await sb.from("subscriptions").select("plan, status, payment_failed_at");
  if (error || !data) return "rookie";
  let best: Tier = "rookie";
  for (const row of data) {
    const plan = row.plan as Tier;
    if (grantsPlan(row) && RANK[plan] > RANK[best]) best = plan;
  }
  return best;
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
