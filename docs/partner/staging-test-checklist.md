# Partner staging test checklist (Stripe test mode)

Approved 2026-11-10: `PARTNER_BILLING_ENABLED=true` on STAGING ONLY. Production stays off. `NEXT_PUBLIC_BILLING_ENABLED` stays false. Only Stripe TEST mode. Use your own accounts only.

Preview URL for this branch (stable, follows every push): `https://victress-git-claude-intelli-a6dcaa-matt-hills-projects-54d303a1.vercel.app`
Called `PREVIEW` below. Vercel team slug: `matt-hills-projects-54d303a1`. Supabase staging project: `cmvifuayvqhbfkeskoqi`.

## A. Set up before you start

### A1. Stripe (test mode switch on)
1. **Webhook endpoint** (Developers, Webhooks, Add endpoint):
   - URL: `PREVIEW/api/stripe/webhook`
   - If Vercel Deployment Protection is on for previews, Stripe cannot reach it. Either turn on "Protection Bypass for Automation" (Vercel, Settings, Deployment Protection) and use `PREVIEW/api/stripe/webhook?x-vercel-protection-bypass=<that secret>`, or exclude this branch from protection.
   - Events (exactly these seven): `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.voided`.
   - Copy the endpoint's **Signing secret** (`whsec_...`). Each endpoint has its own.
2. **Customer portal** (Settings, Billing, Customer portal): save a configuration in test mode, or Manage billing will fail.
3. **Payment methods** (Settings, Payment methods): card on, ACH Direct Debit on, bank transfer on, and make sure they are allowed for invoices (the invoice page lists only what is enabled). The app does not pick methods; Stripe does.
4. Confirm the four prices exist in test mode (ids are in `.env.example` and `docs/stripe.md`).

### A2. Vercel (Project Settings, Environment Variables)
Scope to **Preview**, ideally only the Git branch `claude/intelligent-mayer-vs1i1f` so other previews stay off:

| Name | Value |
|---|---|
| `PARTNER_BILLING_ENABLED` | `true` |
| `STRIPE_SECRET_KEY` | test secret key `sk_test_...` (Sensitive) |
| `STRIPE_WEBHOOK_SECRET` | the `whsec_...` from A1 (Sensitive) |
| `STRIPE_PRICE_PARTNER_SUPPORTING_MONTHLY` | `price_1Ua3keP3pSL2v8NHkQZLgZUE` |
| `STRIPE_PRICE_PARTNER_SUPPORTING_ANNUAL` | `price_1Ua3keP3pSL2v8NH8uMUb9qS` |
| `STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL` | `price_1Ua3lDP3pSL2v8NHhsCZGaDZ` |
| `STRIPE_PRICE_PARTNER_ANCHOR_EXCLUSIVE_ANNUAL` | `price_1Ua3oLP3pSL2v8NH4yWgAmKv` |

Already needed (should exist from the earlier staging setup, Preview only): `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, and "Automatically expose System Environment Variables" on. Do NOT set any of the new vars on Production.
Env var changes only reach NEW deployments: after saving, press **Redeploy** on the latest preview deployment (Vercel dashboard), then check the deployment is Ready.

### A3. Sign in on staging (Supabase staging project, Authentication, URL Configuration)
- Add to **Redirect URLs**: `PREVIEW/auth/callback` (exact), or the README wildcard `https://*-matt-hills-projects-54d303a1.vercel.app/auth/callback`.
- Check **Site URL**. A magic link whose redirect is not in the allow list falls back to the Site URL. If the staging Site URL is `https://victress.gg` the link would land on PRODUCTION, so confirm the redirect is allowed before you click any email link.
- Magic link is enough (the login form has email magic link, Google and Discord; the OAuth ones use Supabase's own callback and need nothing new). Supabase's built in email sender is rate limited (a few emails per hour) and may only send to your organization's members; if links do not arrive, wait, or configure custom SMTP (Resend) on the staging project.
- Start at `PREVIEW/__site/app?to=/login` (this sets the cookie that serves the product site on a preview host). After sign in, finish onboarding (handle and profile) before testing Partner: an account that has not finished onboarding is sent there first.

### A4. Test accounts
One account can belong to only one organization, so use five email addresses (plus addressing works: `you+p1@...`, `you+p2@...`). Each needs onboarding. Plan: A1 Community, A2 Supporting monthly, A3 Supporting annual, A4 Anchor (card), A5 Anchor (invoice). A4 is also used for the exclusivity upgrade.

### A5. Make yourself an admin (for the exclusivity and review tests)
Tell me which email to use and I will run it, or run in the staging SQL editor:
```sql
insert into public.partner_admins (profile_id) select id from auth.users where email = 'YOUR_EMAIL';
```

Test cards: success `4242 4242 4242 4242`, declined `4000 0000 0000 0002` (any future expiry, any CVC, any ZIP). For ACH in Checkout, pick Stripe's test bank in the bank dialog.

## B. Tests. After each, tell me and I check the staging database.

Read only query I use (replace the name):
```sql
select o.name, o.plan, o.billing_interval, o.subscription_status, o.verified, o.terms_version,
       o.stripe_customer_id is not null as has_customer, o.stripe_subscription_id is not null as has_sub, o.billing_event_at, m.role
from partner_organizations o join partner_members m on m.org_id = o.id where o.name = '...';
select category, status, invoice_status, approved_at, activated_at, ends_at from partner_exclusivity order by created_at desc;
```

### T0. Marketing and entry
0. Every page on PREVIEW shows a banner at the top: "Staging. Connected to the victress-staging database. Stripe test mode only. Test accounts only." If you ever see a red "Wrong database" banner, or no banner on a preview, STOP and tell me. (The build also refuses a Preview that points at the production project, and a live Stripe key outside Production is refused at runtime.)
1. Open `PREVIEW`, go to Partnerships. See four plans: Community Partner $0; Supporting Partner $1,000 per month, or $10,000 per year; Anchor Partner $50,000 per year; Anchor Partner with Category Exclusivity $85,000 per year. Unbuilt benefits have a "Coming soon" label. No email address or "contact us" anywhere on the page. Each plan has one Become a Partner button.
2. Signed out, press Become a Partner. You end on the login page, and after signing in you come back to the Become a Partner form.
3. Signed in with an account that has no organization, open `PREVIEW/__site/app?to=/dashboard/partner`. You are sent to the Become a Partner form.

### T1. Community (A1)
See: form with name, type, website, plan picker, authorization and Terms checkbox. Choose Community, tick the box, Create organization. You land on Partner Overview with "Community Partner". The Partner link appears in the dashboard nav. Opportunities: Offer Support shows as part of paid plans. Impact: no Download Report button. Organization Settings: Upgrade panel; Payment history says "No payments yet".
DB: plan `community`, interval null, status null, no Stripe ids, verified false, `terms_version` `terms-2026-11-07`, role `owner`.

### T2. Supporting monthly (A2)
1. Declined card first: choose Supporting, Monthly, Continue to checkout. Stripe Checkout shows $1,000.00 per month. Pay with `4000 0000 0000 0002`: Stripe declines. Plan stays Community (DB: plan `community`).
2. Cancel from Checkout (back arrow): you return to Organization Settings with "Checkout was cancelled. Nothing was charged." DB unchanged.
3. Upgrade (Settings, Supporting, Monthly) and pay with `4242...`. You return with "Thank you. Your plan updates when Stripe confirms the payment". Within about a minute and after refresh: "Supporting Partner, billed monthly". Offer Support is available on published opportunities. Download Report appears on Impact. Payment history lists a paid $1,000.00 invoice.
DB: plan `supporting`, interval `monthly`, status `active`, has customer and subscription, billing_event_at set. Stripe webhook log: `checkout.session.completed` and `customer.subscription.created` delivered with 200.

### T3. Supporting annual (A3)
Same as T2 step 3 with Annual: Checkout shows $10,000.00 per year. After: "billed annually". DB: interval `annual`. Then press Manage billing: Stripe customer portal opens (needs A1.2).

### T4. Anchor by card (A4)
Choose Anchor, "Card or bank account (ACH)". Checkout shows $50,000.00 per year. Pay with `4242...` (or the test bank). After: "Anchor Partner". Settings now has a Category Exclusivity section with a request form.
DB: plan `anchor`, interval `annual`, status `active`. Payment history shows the $50,000.00 invoice.

### T5. Anchor by Stripe invoice (A5)
1. Choose Anchor, "Stripe invoice", Continue. You are sent to a Stripe hosted invoice page for $50,000.00 (status open). Note which payment methods it lists.
2. BEFORE paying, refresh the dashboard. It shows Community Partner; Offer Support and Download Report are not available; Settings shows "Subscription status: incomplete". DB: plan `anchor`, status `incomplete` (not paid), so nothing is granted yet.
3. Pay the invoice on the hosted page (`4242...`). Within about a minute: "Anchor Partner" with paid features. DB: status `active`. Webhook log: `customer.subscription.created` then `invoice.paid`, both 200.
4. Optional: on a fresh invoice, check that ACH or bank transfer is offered (depends on A1.3).

### T6. Exclusivity upgrade and lifecycle (A4, Anchor)
1. Settings, Category Exclusivity: category "Gaming peripherals", 1 year, Request. See "In review". DB: one row, status `requested`. A second request shows "You already have a Category Exclusivity request open."
2. Open `PREVIEW/__site/app?to=/dashboard/admin` as the admin: the request is under Category Exclusivity. Approve category. See "Approved. The owner can now pay the invoice." DB: status `approved`, `approved_at` set. Admin log row `approve_exclusivity`.
3. As A4: Settings shows "Approved, waiting for payment" with a note that the invoice is the $35,000 difference and nothing is cancelled. Press Pay by invoice. Stripe hosted invoice for **$35,000.00** ("Upgrade from Anchor Partner ... the difference"). DB: `invoice_status` `open`, invoice id and URL set. Plan label is still "Anchor Partner", exclusivity not active.
4. Pay it (`4242...`). Within a minute: Settings "Active until <date one year out>", plan label "Anchor Partner with Category Exclusivity". DB: status `active`, `activated_at` set, `ends_at` = payment time + 12 months, `invoice_status` `paid`, org plan still `anchor`. Admin Categories shows it held.
5. Same category from A5 (Anchor): request is refused ("not available"). A2 (Supporting) has no exclusivity section.
6. Lifecycle: in the Stripe dashboard cancel A4's $50,000 subscription (test). Webhook `customer.subscription.deleted`: A4 returns to Community, DB exclusivity `ended`, admin Categories shows the category released and it can be requested again. (This also shows nothing was cancelled or credited automatically before.)

### T7. Admin console
1. As A2, Opportunities, submit an opportunity. It stays In review. In admin, Opportunities in review shows it, Publish. A4/A5 now see it; A1 (Community) cannot Offer Support.
2. Admin, Organizations: Mark verified on A2. Settings for A2 shows Verified.
3. DB: `partner_admin_log` has a row for each action.

### T8. Access checks
- A non admin opening `PREVIEW/__site/app?to=/dashboard/admin` gets Not found.
- An account with no organization cannot open any `/dashboard/partner` page (redirects to the form).
- A Community account cannot offer support (button absent; the database also refuses).

## C. Report
For each test: Passed, Failed, or Not run, what you saw if it differed, and the Stripe webhook delivery status. I run the database checks after each and report.

## D. When finished
Set `PARTNER_BILLING_ENABLED` back to off on staging unless you want it on. Production env vars are never touched by this checklist.
