# Partner account

**Status: built on branch `ccr-c27f5cdb-9phu8v`, migration applied to victress-staging only. Not merged, not deployed, production untouched.**
Basis: strategy document (Creating Shared Value; Women in Esports is a commitment, not a limit on the customer base). Partner is the fifth account type, for organizations. Names used: Overview, Challenges, Participation, Opportunities, Impact, Organization Settings; Ways to Participate (Resources, Expertise & Mentorship, Infrastructure, Opportunities); seven impact categories. No "Hub", "Marketplace", "Engine" or "Tracker".

## What exists
- Marketing: `/partnerships` shows the three plans and one "Become a Partner" button to victress.gg/partner.
- `/partner`: signed out goes to `/login?next=/partner`; a member goes to `/dashboard/partner`; others see the signup form (name, type, website, plan, interval, authorization and Terms checkbox; version `terms-2026-11-07` and a server timestamp are stored).
- `/dashboard/partner` (Overview, Challenges, Participation, Opportunities, Impact, Settings). "Partner" appears in DashboardNav for members only. Non members are redirected to `/partner`.
- Migration `20261109000100_partner_account.sql` (additive), tests `supabase/tests/partner.sql` run by `supabase/tests/local/run-partner.sh` (93 checks).

## Decisions to confirm
1. **"partner" is now a reserved handle** (`/partner` is a route and every top level path is also a profile URL). Added to `lib/handles.ts` and `handle_is_allowed`. Check production for an existing `partner` handle before applying.
2. **Paid means plan is Supporting or Anchor and Stripe status is `active` or `trialing`.** `past_due` pauses paid features, existing data is kept.
3. **Anchor plan** is sold through Stripe like the others; initiatives and exclusivity are arranged manually.
4. Marketing copy says "Initiatives developed together with the Victress team" (the SEO audit forbids the word "planned" on marketing pages).
5. Platform totals are counts only, groups under 5 are not shown, demo and unfinished accounts excluded. No gender breakdown is shown because none is collected.
6. Changing an organization's name or website clears `verified` (a user edit only, not a table editor edit).
7. `PLANS` in `content/pricing.ts` is untouched; Partner plans live in `content/partner.ts`.

## Admin (manual, Supabase table editor)
Publish opportunities (`status = 'published'`, set `published_at`); set `partner_organizations.verified` and `verified_at` after checking identity (organization-verification.md); add `partner_impact_records` and `partner_findings` (set `published_at` to publish); update participation and offer `status`.

## Staging test (victress-staging, 2026-11-09)
Applied migration `partner_account`. A rolled back run confirmed: anon denied; non partner sees nothing; create organization; plan and Stripe ids not editable or readable by a partner; Community cannot offer support; a Supporting organization can; `partner_apply_billing` not callable by users; ended subscription returns to Community; `partner` handle reserved. Staging had only migrations through `privacy_expand` plus `game_api_imports`; the Partner migration needs none of the later ones. Security advisors list only the intended authenticated execute grants for the new functions.
Still to do on staging (needs your Stripe test keys and prices): signup for all three plans in test mode, and a real webhook delivery.

## Rollback (staging or production, if ever needed)
```sql
drop table public.partner_support_offers, public.partner_impact_records, public.partner_findings, public.partner_opportunities,
  public.partner_participation, public.partner_members, public.partner_organizations;
drop function public.partner_org_id(), public.partner_is_paid(uuid), public.partner_is_owner(uuid), public.partner_can_offer_on(uuid),
  public.create_partner_org(text, text, text, text, boolean), public.partner_ecosystem_summary(),
  public.partner_apply_billing(uuid, text, text, text, text, text, boolean, timestamptz),
  public.partner_caps(), public.partner_opportunity_defaults(), public.partner_org_touch();
-- handle_is_allowed: re-create from 20261106000300 to release the "partner" name.
```

## Update 2026-11-10: four plans, entitlements and Category Exclusivity
Basis: `docs/partner/` (decision authority, the approved brief and the Partner Experience specification). Plans, prices and benefits are the brief's, not the earlier branch's.

**Central configuration:** `content/partner-entitlements.ts`. Four plans (Community Partner, Supporting Partner, Anchor Partner, Anchor Partner with Category Exclusivity), every benefit with a status (`implemented`, `in_development`, `planned`) and, where a benefit is built and enforced, a capability (`offer_support`, `impact_report_csv`, `request_exclusivity`). Pages and actions ask `allowed(...)`; the database enforces the same rules. Tests: the Postgres checks below. victressesports.com labels every unbuilt benefit "Coming soon"; victress.gg shows Available, In development or Planned.

**Earlier approved wording is kept**, not replaced: Community's "All five Partner sections", "Post opportunities that need support" and "Submit ways to participate" (now `earlierWording` on the new Community benefits); Supporting's "Offer Support on published opportunities" and "A downloadable impact report (CSV)" (both built); Anchor's "Initiatives planned with the Victress team" (`anchor_initiatives`) and "Category exclusivity" (now the Request Category Exclusivity benefit and the fourth plan).

**Exclusivity flow:** request (Anchor owner, paid and active) → Victress approves in the admin queue (`partner_exclusivity.status = 'approved'`; a category cannot be approved twice) → owner pays a Stripe hosted invoice from Organization Settings → `invoice.paid` webhook activates it for the requested duration → the Anchor subscription ending ends it. No email step. Migration `20261111000100_partner_exclusivity.sql` (additive, 55 new checks in `supabase/tests/partner_exclusivity.sql`; the 93 earlier checks are unchanged and still pass).

**Self-serve:** the marketing page no longer has an email link or "case by case" note; "handled directly with Victress" and "contact Victress" are gone. Every plan card has one Become a Partner button to victress.gg/partner.

### Open questions for the founder (not decided in code)
1. **$85,000 versus $50,000.** The code treats the $85,000 as the full annual price of the plan ("Everything in Anchor Partner"), invoiced on top of an active Anchor subscription. Does the $85,000 replace the $50,000 (credit or cancel the Anchor subscription) or is it additional? Nothing is cancelled or credited automatically.
2. **Anchor by invoice.** The brief allows a Stripe hosted invoice for Anchor itself. Anchor is Checkout only for now (card or ACH as the Stripe account allows). Invoice-based Anchor needs a subscription with `send_invoice` and a rule that activates it on `invoice.paid`, not on creation.
3. **Specification versus brief on exclusivity.** The specification says no self-service $85,000 subscription; the brief says an invoice. Built as the brief says (not a subscription, not Checkout). Resolved by the handoff, listed for the record.
4. **Anchor lapse.** If the Anchor subscription ends, exclusivity ends and the category is freed. Confirm.
5. **Brand rule versus verbatim wording.** victressesports.com bans hyphens, so "Co-developed" and "co-investment" are shown there as "Codeveloped" and "co investment". victress.gg shows them exactly as approved.
6. **Scout Desk seats and Scrim Intelligence subsidization** are `planned` and show "Coming soon". CLAUDE.md earlier said to leave Scout Desk seats out of the plans; the handoff overrides it. Seats stay opt-in players only, never minors.
7. **Stripe invoice payment methods** (card, ACH, bank transfer) must be enabled on the Victress Stripe account for invoices. Not verified; no sandbox access here.
8. **Invoice price type.** The exclusivity price is used as an invoice item. If Stripe rejects a recurring price there, create it as a one time price.
9. **Not built from the specification** (outside this task): PDF reports, the Offer Support discussion thread, multi user roles beyond owner and member, an in-app admin console (the table editor is used), manual check recording, payment history and invoices list in Settings.

## Update 2026-11-10 (second): founder answers and the next build queue
Answers recorded: (1) $85,000 Anchor with Category Exclusivity replaces $50,000 Anchor and includes everything in it; an existing Anchor Partner who upgrades is invoiced the difference ($35,000), nothing cancelled or credited automatically. (2) Build Anchor by Stripe invoice, card or ACH. (3) Anchor ends, exclusivity ends and the category is freed. (4) The hyphen rule on victressesports.com stays; victress.gg shows approved wording. (5) Statuses stay in the entitlements config; `PARTNER_BILLING_ENABLED` stays off until the founder decides how planned benefits are shown to people about to pay; Scout Desk seats are opt-in players only, never minors. (6) Build order: admin console, payment history, roles beyond owner and member, PDF reports, Offer Support discussion thread, manual check recording.

Built in this update: exclusivity upgrade invoice for the difference; Anchor by Stripe invoice (and Checkout); admin console at `/dashboard/admin` (exclusivity approvals, opportunity review, verification, action log; migration `20261111000200_partner_admin.sql`, admins are rows in `partner_admins` added by the founder with the service role; non admins get a 404; every action is logged in `partner_admin_log`); payment history in Organization Settings.

Still to build, in order: roles beyond owner and member, PDF reports, Offer Support discussion thread, manual check recording.

Open: what happens to the $50,000 Anchor subscription at renewal after the upgrade invoice is paid (the subscription still bills $50,000 unless the founder decides to change it in Stripe). Nothing is changed automatically.

## Update 2026-11-10 (third): staging guard
A Preview build is already refused if `STAGING_SUPABASE_URL` points at the production project (`lib/supabase/resolve-env.ts`, thrown from `next.config.ts` at build time). Added a visible guard: a banner on every page of a deployment connected to the staging project, and a red "Wrong database" banner if a non production deployment ever points at the production project (`components/app/EnvBanner.tsx`). The Partner Stripe client also refuses a live key (`sk_live_`) outside Production. Decisions 1 to 6 of the founder's consolidated message are recorded above (replacement and $35,000 difference invoice, Anchor by invoice, exclusivity ends with the subscription, hyphen rule, statuses and seats, build order).
