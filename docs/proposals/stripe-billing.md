# Proposal: Stripe sandbox billing (checkout, billing portal, webhook)

Status: **PROPOSAL; business decisions recorded 2026-11-07 (section 0). Nothing is implemented, no Stripe setting is changed, no migration is applied.** Scope is the Stripe **sandbox (test mode)** only. `NEXT_PUBLIC_BILLING_ENABLED` stays `false`; no plan or price changes; the existing test mode product and price IDs in [../stripe.md](../stripe.md) are reused and nothing new is created in Stripe.

Inputs already decided: webhook endpoint `https://victress.gg/api/stripe/webhook`, **snapshot** payloads, API version **`2026-10-28.endive`**, six events (`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`; **`invoice.paid`, not `invoice.payment_succeeded`**), signing secret in Vercel as `STRIPE_WEBHOOK_SECRET`. Plans and prices are as in `content/pricing.ts`: Rookie free; Pro $7.99 per month or $75 per year; Team $49 per month; Scout $249 per month.

> **Update 2026-11-07 (founder message).** Confirmed and unchanged: grace period 7 days; no refund wording until counsel reviews it (checkout and portal use placeholders); the six webhook events are exactly `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` and `invoice.payment_failed`. **Annual Pro:** the approved price stays $75 per year in `content/pricing.ts` and `STRIPE_PRICE_PRO_ANNUAL` stays defined. The written decision in section 0 below is that annual plans are **not offered at launch (monthly only)**; the message of 2026-11-07 says "annual Pro per approved pricing", which can be read as keeping the price or as enabling it. Left as monthly only until the founder says which; no pricing or plan description was changed. Billing stays off (`NEXT_PUBLIC_BILLING_ENABLED=false`); Stripe live mode is not approved.

## 0. Business decisions (founder, 2026-11-07)
- **Grace period: 7 days.** After a payment fails, the paid plan stays for 7 days; after that the account drops to Rookie until the payment succeeds.
- **Annual plans: disabled for launch.** Monthly plans only. Pro annual (`STRIPE_PRICE_PRO_ANNUAL`, $75 per year) stays defined in Stripe and in `content/pricing.ts` but is not offered at checkout and not mapped by the webhook until a later approval.
- **Infrastructure requirement: Supabase Pro before any billing enablement.** The project must be upgraded to the Pro plan (backups) before `NEXT_PUBLIC_BILLING_ENABLED` can be switched on or the billing migration applied to production.

## 1. What gets built (three parts, in this order)

### A. Data model (additive migration, owner read only)
| Table | Purpose | Notes |
|---|---|---|
| `billing_customers` | one row per player account that has a Stripe customer | `profile_id` (pk, references `profiles` on delete cascade), `stripe_customer_id` (unique), `created_at`. No card data, ever. |
| `subscriptions` | the current state of a subscription, as last reported by Stripe | `stripe_subscription_id` (pk), `profile_id`, `plan` (`pro`, `team` or `scout`, derived from the price id), `billing_interval` (`month` for launch; `year` is reserved for later), `status` (Stripe's value), `current_period_end`, `cancel_at_period_end`, `stripe_price_id`, `last_paid_at`, `last_event_created` (for ordering), `updated_at`. |
| `stripe_events` | idempotency and audit | `event_id` (pk), `type`, `livemode`, `received_at`, `processed_at`, `outcome` (`applied`, `ignored`, `failed`). No payload bodies stored. |

Row level security: players can **read their own** `billing_customers` and `subscriptions` rows; **nobody but `service_role` can write** any of the three; `stripe_events` is `service_role` only. Same pattern, dry run and rollback as the privacy steps. Applying it to production needs its own authorization, a fresh recount and awareness that the Free plan has no backups.

### B. Webhook `/api/stripe/webhook` (flag independent, secret gated)
1. Read the **raw** request body; verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET` using the Stripe library (`webhooks.constructEvent`). Invalid signature or timestamp outside the tolerance: **400**, nothing stored.
2. Insert the event id into `stripe_events`. Already there: return **200** without acting (idempotent replays).
3. Handle exactly the six events; any other type: record `ignored`, return **200**.
4. Respond 2xx only after the database write succeeds; on a transient failure return **500** so Stripe retries.
5. Never log payloads (they carry email and customer details); log event id, type and outcome only.
6. If `STRIPE_WEBHOOK_SECRET` is not set the route returns 404, so it does nothing until it is configured.

| Event | Action |
|---|---|
| `checkout.session.completed` | Link the Stripe customer to the account: take the profile id from `client_reference_id` (set by our checkout, never from user input at the webhook), upsert `billing_customers`. Subscription details arrive with the subscription events. |
| `customer.subscription.created` | Upsert `subscriptions` (plan from the price id via the `STRIPE_PRICE_*` mapping, interval, status, period end, cancel flag). |
| `customer.subscription.updated` | Same upsert (plan change, renewal, cancel at period end, status change such as `past_due` or `canceled`). |
| `customer.subscription.deleted` | Set status `canceled` and keep the row for history; entitlement ends. |
| `invoice.paid` | Record `last_paid_at`; if the subscription was `past_due`, the next `subscription.updated` restores `active` (the invoice event itself does not change the plan). |
| `invoice.payment_failed` | Mark the account as having a failed payment (status follows the subscription events); the grace behaviour in section 3 applies. No email in the first version. |

**Out of order and duplicate events.** Each upsert compares the event's `created` time with `last_event_created` and ignores older events. Subscription events carry the whole object (snapshot payloads), so no extra API call is needed to apply them.

### C. Checkout, billing portal and `/settings/billing`
- `/settings/billing` (signed in, victress.gg): shows the current plan from the database, an upgrade button per paid plan and a "Manage billing" button for accounts that have a customer.
- **Checkout:** a server action creates a Checkout Session in `subscription` mode. The price comes only from a server side allow list built from `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_TEAM_MONTHLY` (annual Pro is disabled for launch, section 0) (the client sends a plan name, never a price id). `client_reference_id` is the player's profile id; the existing Stripe customer is reused or created. Success and cancel URLs are on `victress.gg/settings/billing`. Hosted checkout, so no card field is ever on our pages.
- **Billing portal:** a server action creates a portal session for the account's own customer id and redirects. Cancel, payment method updates and invoice history are configured in the Stripe sandbox portal settings (a founder task, listed below).
- Both actions refuse (server side, not only hidden in the interface) unless `NEXT_PUBLIC_BILLING_ENABLED` is exactly `"true"`, the user is signed in, and the sandbox safety guard in section 4 passes.
- **Scout plan is not sold.** Checkout refuses the Scout price: decision 7 says Scout access is not sold or enabled until verification capacity and policy exist, and recruiter discovery stays disabled pending legal review. The Team plan does not include Scout Desk.

## 2. Entitlements
`lib/entitlements.ts` already returns Rookie for everyone and is the single place that reads plan data. It will read the signed in user's own `subscriptions` row (through row level security, never from anything the user can edit) and map: `active` or `trialing` to the plan; `past_due` per section 3; `canceled` or none to Rookie. Plan to capability follows [entitlements.md](entitlements.md); the hub's plan chip and the Scout Desk lock then reflect real data.

## 3. Behaviour decisions to approve
- **Failed payments:** decided (section 0): keep the plan for **7 days** after the payment first fails, then Rookie until paid. The date is computed from the first `invoice.payment_failed` for the billing period (stored on the subscription row). Stripe's own retry schedule is configured in the sandbox settings.
- **Cancellation:** access continues to the end of the paid period (`cancel_at_period_end`), then Rookie.
- **Plan changes:** annual Pro is disabled for launch, so there is no monthly to annual switch; the portal is configured not to offer it.
- **Trials, coupons, tax:** none proposed. Whether Stripe Tax is needed is a question for counsel and the accountant before any live payment.
- **Receipts and invoices:** Stripe's hosted receipts only.

## 4. Safety rules
- **Test mode only.** The server code refuses to start a checkout or portal session if `STRIPE_SECRET_KEY` does not begin with `sk_test_` (or a restricted test key), and the webhook ignores any event with `livemode: true`. Moving to live mode is a separate approval and a separate change.
- Secrets live only in Vercel environment variables, never in the repository; `STRIPE_PRICE_*` are server side. No Stripe values are committed (the product and price identifiers already in `docs/stripe.md` are not secrets).
- **Environments.** Preview deployments currently share the production Supabase project and service role key (readiness checklist). Do not put the webhook secret on Preview, and do not run end to end tests against production data. The readiness gate "separate Supabase project for Preview" should be done before any end to end sandbox purchase.
- API version pinned in code to `2026-10-28.endive`; the sandbox endpoint is already set to the same version.
- No account or purchase is created on production or any preview URL while building; tests use Stripe's test cards only against a separate sandbox project.

## 5. Tests (all before any production step)
- Unit tests for the webhook handler with fixture events signed by `stripe.webhooks.generateTestHeaderString`: valid signature, bad signature, replay (idempotent), out of order, each of the six events, an unknown event, `livemode: true`, a price id that is not in the allow list.
- Local Postgres tests for the three tables (owner read, no client writes, stranger sees nothing, anon sees nothing, service role writes) in the same harness as the privacy suites.
- Browser tests on the local mock stack for `/settings/billing` with the flag off (everything hidden and server actions refuse) and on (buttons call the actions; Stripe itself is stubbed).
- A sandbox end to end run with the Stripe CLI (`stripe listen`, `stripe trigger`) after the separate sandbox Supabase project exists.

## 6. Pull requests, one milestone each (stacked only where unavoidable)
1. Migration, local tests and rollback for the three tables (not applied).
2. Webhook handler and tests (inert without the secret; no UI).
3. Checkout, portal, `/settings/billing` and entitlement reading, behind the flag, with the Scout refusal.
4. Production steps, each separately authorized: apply the migration; confirm Vercel variables; sandbox end to end run. Billing stays off until you say otherwise.

## 7. Founder tasks in Stripe and Vercel (not done by this proposal)
- Confirm the sandbox endpoint uses API version `2026-10-28.endive`, snapshot payloads and exactly the six events.
- Set `STRIPE_WEBHOOK_SECRET` (and later `STRIPE_SECRET_KEY` with a test key and `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_TEAM_MONTHLY`) in Vercel for Production only, after the Supabase Pro upgrade.
- Configure the sandbox customer portal (allow cancel, update payment method, show invoices; do not offer plan switching to annual billing).
- Decide retry and grace settings, terms and refund text (placeholders until counsel reviews).

## 8. Open questions
Decided: grace period (7 days), annual Pro (off for launch), Supabase Pro first. Still open: what text the checkout and portal show about cancellation and refunds (needs counsel; terms and privacy are placeholders); when Scout becomes sellable (verification capacity and policy, decision 7).
