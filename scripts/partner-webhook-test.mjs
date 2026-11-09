// Partner billing checks against a running server, with a fake Supabase and a fake Stripe. Test tooling only: no real service is contacted.
//   Build once with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4010 (the fake Supabase port), then start the server:
//   STRIPE_WEBHOOK_SECRET=whsec_test STRIPE_SECRET_KEY=sk_test_x STRIPE_API_BASE=http://127.0.0.1:4020 SUPABASE_SERVICE_ROLE_KEY=svc \
//   PARTNER_BILLING_ENABLED=true STRIPE_PRICE_PARTNER_SUPPORTING_MONTHLY=price_sm STRIPE_PRICE_PARTNER_SUPPORTING_ANNUAL=price_sa \
//   STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL=price_aa npx next start -p 3200
//   node scripts/partner-webhook-test.mjs [port]
import { createHmac } from "node:crypto";
import http from "node:http";

const PORT = Number(process.argv[2]) || 3200;
const SECRET = "whsec_test";
const ORG = "11111111-1111-4111-8111-111111111111";
const rpcCalls = [];
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
    res.writeHead(404).end("{}");
  });
}).listen(4010);
const fakeStripe = http.createServer((req, res) => {
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

for (const type of ["invoice.paid", "invoice.payment_failed", "customer.created"]) {
  e = ev(type, { id: "in_1", metadata: { kind: "partner", org_id: ORG } });
  body = JSON.stringify(e); rpcCalls.length = 0;
  r = await post(e, { "stripe-signature": sign(body) }, body);
  ok(r.status === 200 && rpcCalls.length === 0, `${type} is acknowledged and ignored`);
}

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

const get = await fetch(`http://127.0.0.1:${PORT}/api/stripe/webhook`, { headers: { host: "victress.gg" } });
ok(get.status === 405, "GET is not allowed");

console.log(`\n${checks} checks, ${fails} failed`);
fakeSupabase.close(); fakeStripe.close();
process.exit(fails ? 1 : 0);
