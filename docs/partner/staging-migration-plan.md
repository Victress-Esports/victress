# Staging plan for the Partner migrations (NOT applied)

Status (2026-11-10): both migrations APPLIED to victress-staging (project `cmvifuayvqhbfkeskoqi`) with the founder's approval, as `partner_exclusivity` and `partner_admin`. Verified there: row level security on, anon has no access, execute grants as designed, security advisors show only the intended authenticated grants and the service role only `partner_admin_log`. Production untouched.

Original status: prepared, tested on a throwaway local Postgres. Not applied to production. Waiting for the founder's explicit approval. Partner billing stays off (`PARTNER_BILLING_ENABLED` unset or false). No signup or checkout tests run until authorized.

Staging currently has the earlier Partner migration (`20261109000100_partner_account.sql`, applied 2026-11-09). Two additive migrations follow it, in this order.

## 1. `20261110000100_partner_exclusivity.sql`
Adds
- Table `partner_exclusivity`: one row per Category Exclusivity request (organization, category, duration of 1 to 5 whole years, note, status `requested`, `approved`, `declined`, `withdrawn`, `active`, `ended`, Stripe invoice id and hosted URL, invoice status, approval, activation and end dates).
- Two unique indexes: one approved or active record per category (case and spacing ignored), and one open request per organization.
- Functions: `partner_is_anchor_owner`, `partner_category_taken`, `partner_exclusivity_active` (callable by signed in users, read only checks); `partner_exclusivity_withdraw` (owner, own request); `partner_exclusivity_attach_invoice` and `partner_exclusivity_apply_invoice` (service role only, used by the server and the Stripe webhook).
- Row level security: members read their own organization's rows; only an owner of a paid, active Anchor organization can insert, and only for a category nobody holds; no one but the service role can set status, invoice, approval or dates. Anon gets nothing.
Replaces (same behavior, plus one thing)
- `partner_caps()`: adds a cap of 10 requests per organization.
- `partner_apply_billing(...)`: identical, plus: when a subscription ends or the plan moves off Anchor, any approved or active exclusivity becomes `ended`, which frees the category.
Does not change `partner_organizations`, any existing policy, any existing grant, or any data.

## 2. `20261110000200_partner_admin.sql`
Adds
- Table `partner_admins` (who may use the admin console). Rows are added by the founder with the service role in the table editor. A signed in user can read only their own row.
- Function `partner_is_admin()` (signed in users).
- Table `partner_admin_log` (every console action). Service role only.
Being an admin grants no extra access through normal app roles. The console reads and writes with the service role after the server confirms `partner_is_admin()` with the person's own session.

## Tests (local Postgres)
`supabase/tests/local/run-partner.sh`: 163 checks pass (93 earlier, 55 exclusivity, 15 admin). Each test rolls itself back.

## Steps when approved
1. Apply `20261110000100` then `20261110000200` to victress-staging (apply_migration), run the Supabase security advisors, and run a rolled back check of the same assertions.
2. Founder adds themself to `partner_admins` (profile id) in the table editor.
3. Founder creates the Stripe test products and prices and sets the four `STRIPE_PRICE_PARTNER_*` env vars on the staging deployment. Billing stays off until the founder says otherwise.
4. Only after separate authorization: signup and checkout or invoice test for each plan, and a real webhook delivery.

## Rollback
```sql
drop table public.partner_admin_log, public.partner_admins, public.partner_exclusivity;
drop function public.partner_is_admin(), public.partner_is_anchor_owner(uuid), public.partner_category_taken(text),
  public.partner_exclusivity_active(uuid), public.partner_exclusivity_withdraw(uuid),
  public.partner_exclusivity_attach_invoice(uuid, text, text, text), public.partner_exclusivity_apply_invoice(text, text, timestamptz),
  public.partner_exclusivity_touch();
-- partner_caps() and partner_apply_billing(): re-create from 20261109000100_partner_account.sql.
```
