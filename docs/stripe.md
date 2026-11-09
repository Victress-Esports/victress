# Stripe: record for M4 (nothing is implemented yet)

Billing stays off (`NEXT_PUBLIC_BILLING_ENABLED=false`) until checkout, cancellation and webhooks are tested.
These **test-mode** products and prices already exist. Do not create duplicates.

| Plan | Product | Price |
|---|---|---|
| Pro, monthly | `prod_VZmwLOIqKOJ988` | `price_1UYdMWP3pSL2v8NHDOoAeNmv` |
| Pro, annual | `prod_VZmwLOIqKOJ988` | `price_1UYdMWP3pSL2v8NHhLbhhXsB` |
| Team, monthly | `prod_VZmwzsdpWW9rtG` | `price_1UYdMuP3pSL2v8NH2e7HWUZD` |
| Scout, monthly | `prod_VZmx7WPkAn88pN` | `price_1UYdNCP3pSL2v8NHcIyuuyge` |

Price IDs are not secrets, but they go in server-side env vars (not `NEXT_PUBLIC_`):

```
STRIPE_PRICE_PRO_MONTHLY=price_1UYdMWP3pSL2v8NHDOoAeNmv
STRIPE_PRICE_PRO_ANNUAL=price_1UYdMWP3pSL2v8NHhLbhhXsB
STRIPE_PRICE_TEAM_MONTHLY=price_1UYdMuP3pSL2v8NH2e7HWUZD
STRIPE_PRICE_SCOUT_MONTHLY=price_1UYdNCP3pSL2v8NHcIyuuyge
```

## Webhook (recorded 2026-11-07, not implemented)

Configured in the Stripe sandbox by the founder:

- Endpoint: `https://victress.gg/api/stripe/webhook`
- Payload style: snapshot. API version: `2026-10-28.endive`.
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Use `invoice.paid`, not `invoice.payment_succeeded`.
- Signing secret: `STRIPE_WEBHOOK_SECRET`, stored in Vercel (never committed). The handler must verify the signature on the raw request body and ignore all other event types.
- `NEXT_PUBLIC_BILLING_ENABLED` stays `false`. The endpoint, checkout and portal are built in the billing milestone after the privacy milestone, with separate approval.

## Partner billing (implemented on branch, test mode, not deployed)

- Separate server only switch: `PARTNER_BILLING_ENABLED` (default `false`). `NEXT_PUBLIC_BILLING_ENABLED` stays `false`. With the switch off, a paid choice creates the organization on Community Partner and shows an Upgrade note in Organization Settings.
- Prices (create in Stripe test mode, then set as server env vars): `STRIPE_PRICE_PARTNER_SUPPORTING_MONTHLY` ($1,000 per month), `STRIPE_PRICE_PARTNER_SUPPORTING_ANNUAL` ($10,000 per year), `STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL` ($50,000 per year). Also needs `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- Checkout is a subscription. Metadata on the session and the subscription: `kind=partner`, `org_id`, `plan`, `interval`.
- Webhook `/api/stripe/webhook` (`app/api/stripe/webhook/route.ts`): verifies the signature on the raw body, handles only `checkout.session.completed` and `customer.subscription.created`, `updated`, `deleted` with `kind=partner`, acknowledges and ignores everything else. The plan comes from the price Stripe billed (not metadata). Applied through `partner_apply_billing` (service role only; ignores out of order events). An ended subscription returns the organization to Community. `past_due` keeps the plan but paid features pause (the database requires `active` or `trialing`).
- Checks: `node scripts/partner-webhook-test.mjs` (fake Stripe and Supabase, no real service contacted).
