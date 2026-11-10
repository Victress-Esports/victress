"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createPlayerCheckout, createPlayerPortal, grantsPlan, hasTestKey, isPlayerChoice, playerBillingEnabled, type PlayerChoice } from "@/lib/billing";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_URL } from "@/lib/urls";

export type BillingResult = { ok: false; message: string };
const fail = (message: string): BillingResult => ({ ok: false, message });

/** These refuse server side, not only in the interface: billing off, not signed in, not a Stripe test key, or a plan that is not on the server's list. */
async function gate(): Promise<BillingResult | Awaited<ReturnType<typeof requireUser>>> {
  if (!playerBillingEnabled()) return fail("Billing is not open yet.");
  if (!hasTestKey()) return fail("Billing is only available in Stripe test mode right now.");
  return await requireUser();
}

async function customerIdFor(profileId: string): Promise<string | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from("billing_customers").select("stripe_customer_id").eq("profile_id", profileId).maybeSingle();
  return (data as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;
}

/** Starts Stripe Checkout. The plan changes only when the verified webhook arrives. */
export async function startPlayerCheckoutAction(plan: string, interval: string): Promise<BillingResult> {
  const g = await gate();
  if ("ok" in g) return g;
  if (!isPlayerChoice(plan, interval)) return fail("Choose a plan.");
  const { data: rows } = await g.sb.from("subscriptions").select("plan, status, payment_failed_at");
  if ((rows ?? []).some((r) => grantsPlan(r))) return fail("You already have a paid plan. Use Manage billing to change or cancel it.");
  let url: string;
  try {
    url = await createPlayerCheckout({
      profileId: g.user.id,
      choice: { plan, interval } as PlayerChoice,
      email: g.user.email,
      customerId: await customerIdFor(g.user.id),
      returnBase: APP_URL,
    });
  } catch (e) {
    console.error("player checkout failed", e instanceof Error ? e.message : e);
    return fail("Checkout could not start. Try again in a moment.");
  }
  redirect(url);
}

/** Opens the Stripe customer portal for the player's own customer. The customer id never reaches the browser. */
export async function openPlayerPortalAction(): Promise<BillingResult> {
  const g = await gate();
  if ("ok" in g) return g;
  const customer = await customerIdFor(g.user.id);
  if (!customer) return fail("There is no billing account for you yet.");
  let url: string;
  try {
    url = await createPlayerPortal(customer, `${APP_URL}/settings/billing`);
  } catch (e) {
    console.error("player portal failed", e instanceof Error ? e.message : e);
    return fail("The billing portal could not open. Try again.");
  }
  redirect(url);
}
