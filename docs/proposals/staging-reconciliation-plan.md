# Staging reconciliation plan (migration by migration)

**Status: PROPOSAL. Nothing has been applied.** Evidence gathered 2026-11-12 with read only queries against `victress-staging` and `Victress` (production). Staging holds test data only (3 auth users, 3 profiles, 1 team, 2 memberships, 7 legal acceptances, 0 scrim, upload or game rows), but it is shared state, so nothing is dropped, truncated or rewritten, and every step below is reversible or a record only.

## 1. Correction to the earlier reconciliation
The first reconciliation said staging "lacks 7 migrations". The schema shows otherwise: staging **already has the effects** of `privacy_contract` (the public view, leaderboard functions and public read policies are gone), `dashboard_foundation` plus the allowlist, `scrim_matches`, `longer_invite_codes` (codes are 26 characters) and `rls_auto_enable` (not executable by anon). What it lacks is the **history record** for those, because they were applied another way. Only three small migrations are truly not applied (grants and revokes).

## 2. Migration by migration
Legend: **Effect** = is the change present in the staging schema. **History** = is there a row in `supabase_migrations`.
| Repo file | On production | Staging effect | Staging history | Action on staging |
|---|---|---|---|---|
| `20261106000100` to `20261107000100` (waitlist, core, M3, SEO, search visibility, privacy expand) | yes | yes | yes | none |
| `20261107000200_privacy_contract` | yes | **yes** | **no** | record only |
| `20261107000200` family: `revoke_rls_auto_enable_public_execute` | yes | yes | no | record only |
| `20261107000300_dashboard_foundation` + `000310_upload_allowlist` (one entry on production) | yes | yes (tables, bucket, allowlist) | no | record only |
| `20261107000400_scrim_matches` | yes | yes | no | record only |
| `20261107000500_longer_invite_codes` | yes | yes | no | record only |
| `20261107000600_invite_info_service_grant` | yes | **no** (`service_role` cannot execute `team_invite_info`) | no | **apply** (grant only) |
| `20261107000610_invite_info_revoke_public` | yes | **no** (`anon` can still execute it) | no | **apply** (revoke only) |
| `20261107000620_waitlist_service_role_grants` | yes | **no** (`service_role` cannot insert into `waitlist`) | no | **apply** (grant only) |
| `20261108000100_game_api_imports` (#35) | no | yes, 0 rows | yes | none |
| `20261109000100_partner_account` (#42) | no | yes | yes | none |
| `20261111000100/200` partner exclusivity and admin (#42, renumbered) | no | yes | yes (as `partner_exclusivity`, `partner_admin`) | none |
| `20261110000100_age_gate_legal_acceptance` (#47) | no | yes, 7 acceptances | yes | none |
| `20261110000200_waitlist_service_role_delete` (#50) | no | yes | yes | none |
| `20261111000300_player_billing` (#42) | no | no | no | not needed for the pilot; apply only with the Stripe sandbox tests |
| `20261108000200_funnel_events` (#36) | no | no | no | not needed; it also enables `pg_cron` |
The renumbering in #42 changes repo filenames only. Both databases record versions as timestamps and names, so no database is affected.

## 3. Destructive or irreversible operations
- **Pending migrations (#35, #36, #42, #47, #50, and the two new ones):** none contains `drop`, `truncate`, `delete from`, column drops or type changes. `update` statements appear only inside function bodies. `20261108000200_funnel_events` creates the `pg_cron` extension (an environment change, not data loss) and is excluded from the pilot.
- **Already applied to production (`privacy_contract`, `upload_allowlist`):** they dropped a view, functions and policies. They are done and are not part of this plan; they are why staging must not be re-run from scratch.
- **Steps proposed here:** the three apply steps are `grant` and `revoke` only. Rollback: `revoke execute on function public.team_invite_info(text) from service_role; grant execute ... to anon;` and `revoke insert on public.waitlist from service_role;` (exact statements recorded in the migration files themselves).

## 4. Proposed sequence (each step needs your go ahead)
1. Before: snapshot counts (done above), confirm no one is testing on staging.
2. Apply `000600`, `000610`, `000620` to staging through `apply_migration`; re-run the same read only queries; run the Supabase security advisors.
3. Repair the history table so staging matches production: insert records for the six effect-only migrations (`privacy_contract`, `revoke_rls_auto_enable`, `dashboard_foundation_with_allowlist`, `scrim_matches`, `longer_invite_codes`) without executing their SQL. This is metadata only; it changes what future tooling believes is applied, so it is its own step.
4. Run the full local Postgres suite and the staging rolled back transaction checks for the new pilot migrations (`20261112000100`, `20261112000200`) before they are applied anywhere.
5. Production is separate: its own dry run in a rolled back transaction, rollback statements written first, and your approval for each migration. Production currently lacks #35, #42, #47, #50 and the new ones.
