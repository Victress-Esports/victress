// Partner billing checks against a running server, with a fake Supabase and a fake Stripe. Test tooling only: no real service is contacted.
//   Build once with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4010 (the fake Supabase port), then start the server:
//   STRIPE_WEBHOOK_SECRET=whsec_test STRIPE_SECRET_KEY=sk_test_x STRIPE_API_BASE=http://127.0.0.1:4020 SUPABASE_SERVICE_ROLE_KEY=svc \
//   PARTNER_BILLING_ENABLED=true STRIPE_PRICE_PARTNER_SUPPORTING_MONTHLY=price_sm STRIPE_PRICE_PARTNER_SUPPORTING_ANNUAL=price_sa \
//   STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL=price_aa STRIPE_PRICE_PARTNER_ANCHOR_EXCLUSIVE_ANNUAL=price_ax npx next start -p 3200
//   node scripts/partner-webhook-test.mjs [port]
import { createHmac } from "node:crypto";
import http from "node:http";

const PORT = Number(process.argv[2]) || 3200;
const SECRET = "whsec_test";
const ORG = "11111111-1111-4111-8111-111111111111";
const rpcCalls = [];
const exclCalls = [];
let exclResult = "activated";
const subs = { sub_live: { id: "sub_live", customer: "cus_1", status: "active", metadata: { kind: "partner", org_id: ORG }, items: { data: [{ price: { id: "price_sa" } }] } } };

const fakeSupabase = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    if (req.url?.startsWith("/rest/v1/rpc/partner_apply_billing")) {
      rpcCalls.push(JSON.parse(Buffer.concat(chunks).toString() || "{}"));
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify("applied"));
    }
    if (req.url?.startsWith("/rest/v1/rpc/partner_exclusivity_apply_invoice")) {
      exclCalls.push(JSON.parse(Buffer.concat(chunks).toString() || "{}"));
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(exclResult));
    }
    res.writeHead(404).end("{}");
  });
}).listen(4010);
subs.sub_inv = { id: "sub_inv", customer: "cus_2", status: "active", collection_method: "send_invoice", latest_invoice: "in_paid", metadata: { kind: "partner", org_id: ORG, plan: "anchor", interval: "annual" }, items: { data: [{ price: { id: "price_aa" } }] } };
const invoices = {
  in_open: { id: "in_open", status: "open", billing_reason: "subscription_create" },
  in_paid: { id: "in_paid", status: "paid", billing_reason: "subscription_create" },
  in_renewal: { id: "in_renewal", status: "open", billing_reason: "subscription_cycle" },
};
const fakeStripe = http.createServer((req, res) => {
  const im = req.url?.match(/^\/invoices\/(.+)$/);
  if (im && invoices[im[1]]) return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(invoices[im[1]]));
  const m = req.url?.match(/^\/subscriptions\/(.+)$/);
  if (m && subs[m[1]]) return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(subs[m[1]]));
  res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: { message: "not found" } }));
}).listen(4020);

let fails = 0, checks = 0;
const ok = (c, m) => (checks++, c ? console.log("PASS", m) : (fails++, console.log("FAIL", m)));
const sign = (body, t = Math.floor(Date.now() / 1000), secret = SECRET) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
async function post(event, headers = {}, rawOverride) {
  const body = rawOverride ?? JSON.stringify(event);
  const r = await fetch(`http://127.0.0.1:${PORT}/api/stripe/webhook`, { method: "POST", headers: { "content-type": "application/json", host: "victress.gg", ...headers }, body });
  return { status: r.status, json: await r.json().catch(() => null) };
}
const ev = (type, object, created = Math.floor(Date.now() / 1000)) => ({ id: "evt_" + Math.random().toString(36).slice(2), type, created, data: { object } });
const subObj = (over = {}) => ({ id: "sub_1", customer: "cus_1", status: "active", metadata: { kind: "partner", org_id: ORG, plan: "supporting", interval: "annual" }, items: { data: [{ price: { id: "price_sa" } }] }, ...over });

let e = ev("customer.subscription.created", subObj());
let body = JSON.stringify(e);
ok((await post(e, {}, body)).status === 400, "no signature header: 400");
ok((await post(e, { "stripe-signature": sign(body, undefined, "whsec_wrong") }, body)).status === 400, "wrong secret: 400");
ok((await post(e, { "stripe-signature": sign(body, Math.floor(Date.now() / 1000) - 3600) }, body)).status === 400, "old timestamp: 400");
ok((await post(e, { "stripe-signature": sign(body) }, body + " ")).status === 400, "body changed after signing: 400");
ok(rpcCalls.length === 0, "nothing applied for any unsigned or tampered request");

let r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls.length === 1, "valid subscription.created applied");
ok(rpcCalls[0]?.p_plan === "supporting" && rpcCalls[0]?.p_interval === "annual" && rpcCalls[0]?.p_ended === false && rpcCalls[0]?.p_org === ORG, "plan and interval come from the billed price (price_sa = Supporting annual)");
ok(rpcCalls[0]?.p_customer === "cus_1" && rpcCalls[0]?.p_subscription === "sub_1", "customer and subscription ids passed");

// metadata says anchor, but the price Stripe billed is Supporting monthly: the price wins
e = ev("customer.subscription.updated", subObj({ metadata: { kind: "partner", org_id: ORG, plan: "anchor", interval: "annual" }, items: { data: [{ price: { id: "price_sm" } }] } }));
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(rpcCalls[0]?.p_plan === "supporting" && rpcCalls[0]?.p_interval === "monthly", "metadata cannot choose the plan; the billed price decides");

e = ev("customer.subscription.updated", subObj({ items: { data: [{ price: { id: "price_unknown" } }] } }));
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 500 && rpcCalls.length === 0, "an unknown price is not applied and returns 500 so Stripe retries");

e = ev("customer.subscription.deleted", subObj({ status: "canceled" }));
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls[0]?.p_ended === true && rpcCalls[0]?.p_plan === null, "subscription.deleted returns the organization to Community");

e = ev("customer.subscription.updated", subObj({ status: "canceled" }));
body = JSON.stringify(e); rpcCalls.length = 0;
await post(e, { "stripe-signature": sign(body) }, body);
ok(rpcCalls[0]?.p_ended === true, "a canceled status ends the plan even on an updated event");

e = ev("customer.subscription.updated", subObj({ status: "past_due" }));
body = JSON.stringify(e); rpcCalls.length = 0;
await post(e, { "stripe-signature": sign(body) }, body);
ok(rpcCalls[0]?.p_status === "past_due" && rpcCalls[0]?.p_ended === false, "past_due keeps the plan but records the status");

e = ev("customer.subscription.updated", subObj({ metadata: { kind: "pro" } }));
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls.length === 0, "a non partner subscription is ignored");

e = ev("customer.subscription.updated", subObj({ metadata: {} }));
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls.length === 0, "a subscription with no metadata is ignored");

e = ev("customer.subscription.updated", subObj({ metadata: { kind: "partner", org_id: "not-a-uuid" } }));
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls.length === 0, "a bad organization id is ignored");

// Invoice events: only exclusivity invoices (kind=partner_exclusivity) do anything. Everything else is acknowledged and ignored.
for (const type of ["invoice.paid", "invoice.payment_failed", "invoice.voided", "customer.created"]) {
  e = ev(type, { id: "in_1", metadata: { kind: "partner", org_id: ORG } });
  body = JSON.stringify(e); rpcCalls.length = 0; exclCalls.length = 0;
  r = await post(e, { "stripe-signature": sign(body) }, body);
  ok(r.status === 200 && rpcCalls.length === 0 && exclCalls.length === 0, `${type} for a subscription invoice or other event is acknowledged and ignored`);
}
const exclInv = (over = {}) => ({ id: "in_ex1", metadata: { kind: "partner_exclusivity", org_id: ORG, request_id: "r1" }, status_transitions: { paid_at: 1796000000 }, ...over });

e = ev("invoice.paid", exclInv());
body = JSON.stringify(e); exclCalls.length = 0; rpcCalls.length = 0; exclResult = "activated";
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && exclCalls.length === 1 && exclCalls[0].p_invoice === "in_ex1" && exclCalls[0].p_event === "paid", "invoice.paid for an exclusivity invoice is applied by invoice id");
ok(exclCalls[0]?.p_paid_at === new Date(1796000000 * 1000).toISOString(), "the term starts at Stripe's paid time");
ok(rpcCalls.length === 0, "an exclusivity invoice never touches the subscription plan");

e = ev("invoice.payment_failed", exclInv());
body = JSON.stringify(e); exclCalls.length = 0; exclResult = "recorded";
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && exclCalls[0]?.p_event === "payment_failed", "invoice.payment_failed is recorded and grants nothing");

e = ev("invoice.voided", exclInv());
body = JSON.stringify(e); exclCalls.length = 0; exclResult = "recorded";
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && exclCalls[0]?.p_event === "void", "invoice.voided releases the invoice");

e = ev("invoice.paid", exclInv({ id: "in_unknown" }));
body = JSON.stringify(e); exclCalls.length = 0; exclResult = "not_found";
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 500, "a paid exclusivity invoice that no request knows returns 500 so Stripe retries");

e = ev("invoice.payment_failed", exclInv({ id: "in_unknown" }));
body = JSON.stringify(e); exclCalls.length = 0; exclResult = "not_found";
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200, "an unknown invoice failure is acknowledged");

e = ev("invoice.paid", exclInv({ metadata: { kind: "pro" } }));
body = JSON.stringify(e); exclCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && exclCalls.length === 0, "an invoice with another kind is ignored");

e = ev("checkout.session.completed", { id: "cs_x", mode: "payment", metadata: { kind: "partner_exclusivity", org_id: ORG } });
body = JSON.stringify(e); exclCalls.length = 0; rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && exclCalls.length === 0 && rpcCalls.length === 0, "a started checkout never grants exclusivity");

e = ev("checkout.session.completed", { id: "cs_1", mode: "subscription", subscription: "sub_live", metadata: { kind: "partner", org_id: ORG } });
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls[0]?.p_plan === "supporting" && rpcCalls[0]?.p_org === ORG, "checkout.session.completed reads the subscription and applies it");

e = ev("checkout.session.completed", { id: "cs_2", mode: "subscription", subscription: "sub_x", metadata: { kind: "team" } });
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls.length === 0, "a non partner checkout is ignored");

e = ev("checkout.session.completed", { id: "cs_3", mode: "payment", metadata: { kind: "partner", org_id: ORG } });
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls.length === 0, "a one time payment checkout is ignored");

// Anchor paid by Stripe invoice: a send_invoice subscription is "active" in Stripe before anyone pays. It must not grant access until its first invoice is paid.
const invSub = (over = {}) => subObj({ id: "sub_inv", customer: "cus_2", collection_method: "send_invoice", status: "active", metadata: { kind: "partner", org_id: ORG, plan: "anchor", interval: "annual" }, items: { data: [{ price: { id: "price_aa" } }] }, ...over });
for (const [inv, expected, why] of [
  ["in_open", "incomplete", "an unpaid first invoice is recorded as incomplete, not active"],
  ["in_paid", "active", "a paid first invoice keeps the subscription status"],
  ["in_renewal", "active", "an unpaid renewal follows Stripe's own status"],
]) {
  e = ev("customer.subscription.created", invSub({ latest_invoice: inv }));
  body = JSON.stringify(e); rpcCalls.length = 0;
  r = await post(e, { "stripe-signature": sign(body) }, body);
  ok(r.status === 200 && rpcCalls[0]?.p_status === expected && rpcCalls[0]?.p_plan === "anchor", `invoice subscription: ${why}`);
}
e = ev("customer.subscription.updated", invSub({ latest_invoice: null }));
body = JSON.stringify(e); rpcCalls.length = 0;
await post(e, { "stripe-signature": sign(body) }, body);
ok(rpcCalls[0]?.p_status === "incomplete", "an invoice subscription with no invoice is never active");

e = ev("invoice.paid", { id: "in_paid", subscription: "sub_inv", metadata: {} });
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls[0]?.p_status === "active" && rpcCalls[0]?.p_plan === "anchor" && rpcCalls[0]?.p_interval === "annual", "invoice.paid on an Anchor invoice subscription grants Anchor");

e = ev("invoice.paid", { id: "in_x", subscription: "sub_live", metadata: {} });
body = JSON.stringify(e); rpcCalls.length = 0;
r = await post(e, { "stripe-signature": sign(body) }, body);
ok(r.status === 200 && rpcCalls.length === 0, "invoice.paid on a subscription paid by card is ignored (Checkout already handled it)");

const get = await fetch(`http://127.0.0.1:${PORT}/api/stripe/webhook`, { headers: { host: "victress.gg" } });
ok(get.status === 405, "GET is not allowed");

console.log(`\n${checks} checks, ${fails} failed`);
fakeSupabase.close(); fakeStripe.close();
process.exit(fails ? 1 : 0);
