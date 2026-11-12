# Production migrations for the consent and account PRs: review

Two additive migrations. **Neither is applied to production.** Each needs its own explicit approval (CLAUDE.md section 7). Both are applied to staging only (`cmvifuayvqhbfkeskoqi`).

## 1. `20261110000100_age_gate_legal_acceptance.sql` (PR #47)
**Changes:** two new tables, `age_confirmations` and `legal_acceptances`, and two trigger functions. Nothing existing is altered or dropped.
- `age_confirmations`: one row per account (`birth_date`, `confirmed_at`). The player can read and insert their own row only; no update, no delete. A trigger refuses a birth date under 13 years ago, and a check refuses future dates.
- `legal_acceptances`: one row per document version a player accepted (`terms` or `privacy`, version as a date, `accepted_at`). Insert and read own rows only; no update or delete. A trigger refuses an acceptance before the age confirmation exists. Unique per player, document and version.
- Both reference `profiles` with `on delete cascade`, so they go with the account. RLS is on; `anon` has no access.

**Why:** the age gate and Terms and Privacy acceptance with version and timestamp, and reacceptance when a version changes (the app compares the current version with the rows).

**If not applied:** the app skips the gate (it treats the missing tables as "not enforced"), so deploying the code first locks nobody out, but there is no age gate or acceptance record until it is applied.

**Deploy effect:** none for existing players until they next sign in, when they are asked once for a date of birth and acceptance. Existing production data: 1 test account (per `docs/status.md`) would be asked on its next sign in.

**Reverse:** safe while the tables hold only test data:
```sql
drop table public.legal_acceptances;
drop table public.age_confirmations;
drop function public.legal_acceptances_needs_age();
drop function public.age_confirmations_minimum();
```
After real players have accepted, dropping deletes their consent records, so prefer leaving the tables and turning the gate off in code. The migration is a normal additive step; reversing is only for an abort.

**Tested:** local Postgres, 23 checks; the same 23 on staging in a rolled back transaction; browser tests for the consent flow locally and on staging (see DEVELOPMENT_STATUS.md).

## 2. `20261110000200_waitlist_service_role_delete.sql` (PR #50)
**Changes:** two grants to the server-only `service_role` on `public.waitlist`:
```sql
grant select (email) on public.waitlist to service_role;
grant delete on public.waitlist to service_role;
```
No table or data change. `anon` and `authenticated` still have no privilege; RLS stays on. The service role can read only the email column and delete rows.

**Why:** a waitlist signup is keyed by email, not by account. Account deletion removes it. Without the grant the app deletes the account and tells the player their signup could not be removed automatically.

**Deploy effect:** none until a player deletes their account.

**Reverse:** `revoke select (email), delete on public.waitlist from service_role;`

**Tested:** local suite (6 checks); applied to staging and privileges verified (delete yes, email select yes, other columns no, update no, anon and authenticated no).

## Order and dependencies
- Migration 1 is independent. Migration 2 is independent of 1 and can be applied before or after it. Neither needs the other.
- Production already has migration `20261107000620` (service role may insert into the waitlist); migration 2 adds to it.
