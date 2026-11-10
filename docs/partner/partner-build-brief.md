# Partner build brief (approved, current version)

Source: Victress-Partner-Handoff.md, Part 2 (2026-11-09). Plans, prices and benefits here win over any earlier brief or older code. Where the repository disagrees on migration names or test counts, the repository is correct.

Follow CLAUDE.md and the roadmap: work on its own branch, open a pull request, never merge or deploy without Matt's approval, staging first.

## What it is
Partner is a fifth account type next to Rookie, Pro, Team and Scout. It's for organizations: universities, companies, esports organizations, leagues, community groups and nonprofits. Partners sign up themselves on victress.gg, pay (or choose the free plan) and get a Partner section inside the normal dashboard. It is fully automated: nobody is told to email or contact anyone to become a Partner, on any page of either domain.

- Partner is the account type. Creating Shared Value is the strategy. Women in Esports is the commitment. No new brand, and no "Hub", "Marketplace", "Engine" or "Tracker" in names.

## Plans (Matt's approved offering)
| Plan | Price | Includes |
|---|---|---|
| Community Partner | Free | Join the partner community, discover initiatives, share opportunities, contribute resources and expertise |
| Supporting Partner | $1,000/month or $10,000/year | Direct subsidization of Scrim Intelligence access for developing rosters; tracking of supported teams and program milestones; quarterly impact reports for ESG and DEI review; 2 Scout Desk evaluator seats for talent identification |
| Anchor Partner | $50,000/year | Platform-wide integration across the Victress network; ESG and Shared Value analytics suite; 10 Scout Desk seats with priority access to opt-in talent pipelines; co-developed public impact features and joint PR rights |
| Anchor Partner with Category Exclusivity | $85,000/year | Everything in Anchor Partner; exclusive rights within an agreed category across platform-wide events and initiatives; custom research reports; direct co-investment advisory |

All of these benefits are part of the offering. Keep every one in the central entitlements configuration with a status (implemented, in development, planned). Scout Desk seats and any individual player information stay subject to the player consent rules in the specification (opt-in only, nothing for minors). Do not name any real company as a partner.

Exclusivity flow: an Anchor Partner requests exclusivity inside the dashboard (category, duration). Victress approves the category in the admin queue so the same category is never sold twice. Payment goes through a Stripe-hosted invoice (or card or ACH), and exclusivity activates on confirmed payment. There is no email step.

## Signup flow
1. victressesports.com/partnerships shows the plans and one button, "Become a Partner", which links to victress.gg/partner.
2. /partner: a signed-out visitor goes to /login?next=/partner. A signed-in user without an organization sees a form with organization name, type, website, plan and billing interval, plus a checkbox confirming they're authorized and accept the Terms (store the terms version and timestamp). A user who already has an organization goes to /dashboard/partner.
3. Community Partner: the organization is created and the user goes straight to the dashboard.
4. Paid plans: Stripe Checkout (subscription, metadata kind=partner, org_id, plan, interval) with card and ACH, or a Stripe-hosted invoice for Anchor. The webhook grants access on confirmed payment. Never grant paid access on a started checkout. When partner billing is off, the user lands on Community with an upgrade button.
5. Organization Settings: edit name, type and website (owner only), upgrade, request Category Exclusivity, and Manage billing (Stripe customer portal).

## Dashboard
Navigation: Overview, Challenges, Participation, Opportunities, Impact, Organization Settings. Use real data only, with empty states. No invented numbers.

## Stripe
- Products: Supporting Partner ($1,000/month and $10,000/year), Anchor Partner ($50,000/year), Anchor Partner with Category Exclusivity ($85,000/year, used for approved invoices). Community Partner needs no product.
- Env: STRIPE_PRICE_PARTNER_SUPPORTING_MONTHLY, STRIPE_PRICE_PARTNER_SUPPORTING_ANNUAL, STRIPE_PRICE_PARTNER_ANCHOR_ANNUAL, STRIPE_PRICE_PARTNER_ANCHOR_EXCLUSIVE_ANNUAL.
- A separate server-only switch, PARTNER_BILLING_ENABLED, so partner checkout can open without turning on player billing.
- Webhook at /api/stripe/webhook: verify the signature on the raw body; handle checkout.session.completed, customer.subscription.created/updated/deleted and invoice paid/failed for partner metadata.

## Admin
Review queue for opportunities, organization verification, exclusivity requests, impact records and findings.

## Done when
Migration tested on victress-staging; typecheck, lint, build and SEO audit pass; signup works for every plan in Stripe test mode; entitlements are enforced centrally; the database tests are extended for the Anchor and Exclusivity plans; a non-partner can't open partner pages; Matt approves before production.
