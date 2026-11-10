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

Stripe test mode prices (ids are not secrets; set them as server env vars on the staging deployment):

| Product | Price | Env var | Test mode id |
|---|---|---|---|
| Supporting Partner | $1,000 per month | `STRIPE_PRICE_PARTNER_SUPPORTING_MONTHLY` | `price_1Ua3keP3pSL2v8NHkQZLgZUE` |
| Supporting Partner | $10,000 per year | `STRIPE_PRICE_PARTNER_SUPPORTING_ANNUAL` | `price_1Ua3keP3pSL2v8NH8uMUb9qS` |
| Anchor Partner | $50,000 per year | `STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL` | not received yet |
| Anchor Partner with Category Exclusivity | $85,000 per year | `STRIPE_PRICE_PARTNER_ANCHOR_EXCLUSIVE_ANNUAL` | not received yet |


- Separate server only switch: `PARTNER_BILLING_ENABLED` (default `false`). `NEXT_PUBLIC_BILLING_ENABLED` stays `false`. With the switch off, a paid choice creates the organization on Community Partner and shows an Upgrade note in Organization Settings.
- Prices (create in Stripe test mode, then set as server env vars). Products: "Supporting Partner", "Anchor Partner" and "Anchor Partner with Category Exclusivity"; Community Partner is free and needs none. `STRIPE_PRICE_PARTNER_SUPPORTING_MONTHLY` ($1,000 per month), `STRIPE_PRICE_PARTNER_SUPPORTING_ANNUAL` ($10,000 per year), `STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL` ($50,000 per year), `STRIPE_PRICE_PARTNER_ANCHOR_EXCLUSIVE_ANNUAL` ($85,000 per year, used only on the hosted invoice for an approved request). Also needs `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- Checkout is a subscription. Metadata on the session and the subscription: `kind=partner`, `org_id`, `plan`, `interval`.
- Webhook `/api/stripe/webhook` (`app/api/stripe/webhook/route.ts`): verifies the signature on the raw body, handles only `checkout.session.completed` and `customer.subscription.created`, `updated`, `deleted` with `kind=partner`, acknowledges and ignores everything else. The plan comes from the price Stripe billed (not metadata). Applied through `partner_apply_billing` (service role only; ignores out of order events). An ended subscription returns the organization to Community. `past_due` keeps the plan but paid features pause (the database requires `active` or `trialing`).
- Category Exclusivity (`docs/partner/partner-build-brief.md`) is not a Checkout subscription. Anchor Partner with Category Exclusivity ($85,000) REPLACES Anchor Partner ($50,000) and includes everything in it (founder decision, 2026-11-10). An existing Anchor Partner who upgrades is invoiced the DIFFERENCE, worked out from the two Stripe prices (`STRIPE_PRICE_PARTNER_ANCHOR_EXCLUSIVE_ANNUAL` minus `STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL`, $35,000). Nothing is cancelled or credited automatically; what happens to the $50,000 subscription at its renewal is an open question for the founder. An Anchor Partner owner requests a category and duration in Organization Settings (`partner_exclusivity`, status `requested`). Victress sets `status = 'approved'` in the admin queue (the table editor); a unique index means one approved or active record per category. The owner then presses Pay by invoice, which creates a Stripe invoice (`collection_method=send_invoice`, `auto_advance=false`, metadata `kind=partner_exclusivity`, `org_id`, `request_id`) with the exclusivity price and sends the owner to the hosted invoice page. Exclusivity activates only on `invoice.paid` (`partner_exclusivity_apply_invoice`, keyed by the stored invoice id); `invoice.payment_failed` and `invoice.voided` are recorded and grant nothing. Ending the Anchor subscription ends exclusivity and frees the category. Card, ACH and bank transfer on the invoice depend on what the Victress Stripe account has enabled for invoices (to verify in the sandbox).
- Anchor by Stripe invoice (alongside Checkout with card or ACH): a subscription with `collection_method=send_invoice`. Stripe calls it `active` the moment it exists, so the webhook records it as `incomplete` (not paid, in the database) until its FIRST invoice is paid (`invoice.paid`, which then applies the plan from the billed price). A renewal invoice that goes unpaid follows Stripe's own status (`past_due`).
- Payment history (Organization Settings, owner only) is read live from Stripe (`GET /invoices?customer=`), newest first. No payment data is copied into the database.
- Checks: `node scripts/partner-webhook-test.mjs` (fake Stripe and Supabase, no real service contacted).
