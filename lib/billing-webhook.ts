import "server-only";
import { NextResponse } from "next/server";
import { playerChoiceForPrice, retrievePlayerSubscription, type PlayerSubscription } from "@/lib/billing";
import { invoiceSubscriptionId, type StripeInvoice } from "@/lib/partner-stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Player billing events (kind=player), called by /api/stripe/webhook after the signature is verified. Returns null when the event is not a
 * player event, so the Partner handlers run. Every player event is recorded once (stripe_events): a replay of an applied event returns 200 and does
 * nothing, and a failed attempt can be retried by Stripe. Plan comes from the price Stripe billed, never from metadata alone. Test mode only
 * (the route ignores live mode events). The profile id comes from OUR metadata on the checkout and subscription, never from user input here.
 */
export interface PlayerEvent {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
}

const ok = (note: string) => NextResponse.json({ received: true, note });
const fail = (error: string) => NextResponse.json({ error }, { status: 500 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (sec?: number | null) => (typeof sec === "number" ? new Date(sec * 1000).toISOString() : null);
const ENDED = new Set(["canceled", "incomplete_expired"]);

export async function handlePlayerEvent(event: PlayerEvent): Promise<NextResponse | null> {
  const obj = event.data?.object ?? {};
  let kind: "checkout" | "subscription" | "invoice" | null = null;
  let sub: PlayerSubscription | null = null;
  let inv: StripeInvoice | null = null;

  switch (event.type) {
    case "checkout.session.completed":
      if ((obj.metadata as Record<string, string> | undefined)?.kind !== "player" || obj.mode !== "subscription") return null;
      kind = "checkout";
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      if ((obj.metadata as Record<string, string> | undefined)?.kind !== "player") return null;
      kind = "subscription";
      sub = obj as unknown as PlayerSubscription;
      break;
    case "invoice.paid":
    case "invoice.payment_failed": {
      inv = obj as unknown as StripeInvoice;
      if (inv.metadata?.kind === "partner_exclusivity") return null;
      const subId = invoiceSubscriptionId(inv);
      if (!subId) return null;
      try {
        sub = await retrievePlayerSubscription(subId);
      } catch {
        return null; // not ours or not readable: let the Partner handlers look at it
      }
      if (sub.metadata?.kind !== "player") return null;
      kind = "invoice";
      break;
    }
    default:
      return null;
  }

  const sb = supabaseAdmin();
  if (!sb) return fail("database unavailable");
  const { data: fresh, error: recErr } = await sb.rpc("billing_record_event", { p_id: event.id, p_type: event.type, p_livemode: false });
  if (recErr) {
    console.error("player webhook: billing_record_event failed", recErr.message);
    return fail("could not record");
  }
  if (!fresh) return ok("duplicate");
  const finish = async (outcome: "applied" | "ignored" | "failed") => {
    await sb.rpc("billing_finish_event", { p_id: event.id, p_outcome: outcome });
  };

  try {
    if (kind === "checkout") {
      const meta = obj.metadata as Record<string, string>;
      const customer = typeof obj.customer === "string" ? obj.customer : null;
      if (!meta.profile_id || !UUID.test(meta.profile_id) || meta.profile_id !== obj.client_reference_id || !customer) {
        await finish("ignored");
        return ok("no player");
      }
      const { data, error } = await sb.rpc("billing_link_customer", { p_profile: meta.profile_id, p_customer: customer });
      if (error) throw new Error(error.message);
      await finish(data === "ok" ? "applied" : "ignored");
      if (data !== "ok") console.error(`player webhook: customer not linked (${data})`);
      return ok(String(data));
    }

    if (kind === "subscription" && sub) {
      const profile = sub.metadata?.profile_id ?? "";
      if (!UUID.test(profile)) {
        await finish("ignored");
        return ok("no player");
      }
      const ended = event.type === "customer.subscription.deleted" || ENDED.has(sub.status);
      const priceId = sub.items?.data?.[0]?.price?.id ?? "";
      const choice = playerChoiceForPrice(priceId);
      if (!choice) {
        if (ended) {
          // An ended subscription whose price we no longer know: nothing to keep or grant.
          await finish("ignored");
          return ok("ended, unknown price");
        }
        console.error(`player webhook: subscription ${sub.id} has a price that matches no configured player price`);
        await finish("failed");
        return fail("unknown price");
      }
      const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
      const periodEnd = iso(sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end);
      const { data, error } = await sb.rpc("billing_apply_subscription", {
        p_profile: profile,
        p_sub: sub.id,
        p_customer: customer,
        p_plan: choice.plan,
        p_interval: choice.interval,
        p_status: ended ? "canceled" : sub.status,
        p_price: priceId,
        p_period_end: periodEnd,
        p_cancel: !!sub.cancel_at_period_end,
        p_event_at: new Date(event.created * 1000).toISOString(),
      });
      if (error) throw new Error(error.message);
      await finish(data === "applied" ? "applied" : "ignored");
      if (data !== "applied" && data !== "stale") console.error(`player webhook: subscription not applied (${data})`);
      return ok(String(data));
    }

    if (kind === "invoice" && sub && inv) {
      const { data, error } = await sb.rpc("billing_payment_event", {
        p_sub: sub.id,
        p_kind: event.type === "invoice.paid" ? "paid" : "failed",
        p_at: new Date(event.created * 1000).toISOString(),
      });
      if (error) throw new Error(error.message);
      if (data === "not_found") {
        // The subscription row does not exist yet (this invoice event beat subscription.created). Let Stripe retry.
        await finish("failed");
        return fail("subscription not known yet");
      }
      await finish("applied");
      return ok("applied");
    }
  } catch (e) {
    console.error("player webhook failed", e instanceof Error ? e.message : e);
    await finish("failed");
    return fail("failed");
  }
  return null;
}
