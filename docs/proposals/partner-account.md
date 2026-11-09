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
