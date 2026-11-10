import { NextResponse } from "next/server";
import { choiceForPrice, retrieveSubscription, verifyStripeSignature, type StripeSubscription } from "@/lib/partner-stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook (docs/stripe.md). Verifies the signature on the raw body, then handles only checkout.session.completed and
 * customer.subscription.created / updated / deleted that carry partner metadata (kind=partner), and invoice.paid / payment_failed / voided
 * for exclusivity invoices (kind=partner_exclusivity). Every other event, partner or not, is acknowledged and ignored. An ended
 * subscription returns the organization to Community. Exclusivity activates only on invoice.paid, never on a request or an approval.
 * 400 = bad signature. 500 = something on our side failed, so Stripe retries. 200 = handled or deliberately ignored.
 */
interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
}

const ok = (note: string) => NextResponse.json({ received: true, note });
const ENDED = new Set(["canceled", "incomplete_expired"]);

async function apply(sub: StripeSubscription, eventType: string, eventAt: number): Promise<NextResponse> {
  const meta = sub.metadata ?? {};
  if (meta.kind !== "partner") return ok("not partner");
  const orgId = meta.org_id;
  if (!orgId || !/^[0-9a-f-]{36}$/i.test(orgId)) return ok("no organization");

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: "database unavailable" }, { status: 500 });

  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const ended = eventType === "customer.subscription.deleted" || ENDED.has(sub.status);
  const choice = choiceForPrice(sub.items?.data?.[0]?.price?.id);
  if (!ended && !choice) {
    console.error(`partner webhook: subscription ${sub.id} has a price that matches no configured partner price`);
    return NextResponse.json({ error: "unknown price" }, { status: 500 });
  }

  const { data, error } = await sb.rpc("partner_apply_billing", {
    p_org: orgId,
    p_plan: ended ? null : choice!.plan,
    p_interval: ended ? null : choice!.interval,
    p_status: sub.status,
    p_customer: customer,
    p_subscription: sub.id,
    p_ended: ended,
    p_event_at: new Date(eventAt * 1000).toISOString(),
  });
  if (error) {
    console.error("partner webhook: partner_apply_billing failed", error.message);
    return NextResponse.json({ error: "could not apply" }, { status: 500 });
  }
  return ok(String(data));
}

/** Exclusivity invoices. The request is found by the invoice id Victress stored, so a forged metadata field cannot point at another request. */
async function applyInvoice(inv: Record<string, unknown>, type: string, eventAt: number): Promise<NextResponse> {
  const meta = (inv.metadata ?? {}) as Record<string, string>;
  if (meta.kind !== "partner_exclusivity" || typeof inv.id !== "string") return ok("not exclusivity");
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: "database unavailable" }, { status: 500 });
  const event = type === "invoice.paid" ? "paid" : type === "invoice.payment_failed" ? "payment_failed" : "void";
  const transitions = (inv.status_transitions ?? {}) as { paid_at?: number | null };
  const paidAt = new Date((transitions.paid_at ?? eventAt) * 1000).toISOString();
  const { data, error } = await sb.rpc("partner_exclusivity_apply_invoice", { p_invoice: inv.id, p_event: event, p_paid_at: paidAt });
  if (error) {
    console.error("partner webhook: partner_exclusivity_apply_invoice failed", error.message);
    return NextResponse.json({ error: "could not apply" }, { status: 500 });
  }
  // A paid invoice of ours that no request knows yet: answer 500 so Stripe retries, instead of losing a confirmed payment.
  if (data === "not_found" && event === "paid") {
    console.error(`partner webhook: invoice ${inv.id} was paid but matches no exclusivity request`);
    return NextResponse.json({ error: "no matching request" }, { status: 500 });
  }
  return ok(String(data));
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("partner webhook: STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  const raw = await req.text(); // the raw body: the signature covers these exact bytes
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    const obj = event.data?.object ?? {};
    switch (event.type) {
      case "checkout.session.completed": {
        const meta = (obj.metadata ?? {}) as Record<string, string>;
        if (meta.kind !== "partner" || obj.mode !== "subscription" || typeof obj.subscription !== "string") return ok("not partner");
        // The session only names the subscription; read its current state so the plan comes from the billed price.
        const sub = await retrieveSubscription(obj.subscription);
        sub.metadata = { ...meta, ...(sub.metadata ?? {}) };
        return await apply(sub, event.type, event.created);
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return await apply(obj as unknown as StripeSubscription, event.type, event.created);
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.voided":
        return await applyInvoice(obj, event.type, event.created);
      default:
        return ok("ignored");
    }
  } catch (e) {
    console.error("partner webhook failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
