# Privacy foundation: rollout and rollback plan

Status: proposal. Nothing here has been applied to production. Each production step needs its own explicit founder authorization (decision register).

Migrations: `20261107000100_privacy_expand.sql` (adds, breaks nothing) and `20261107000200_privacy_contract.sql` (closes anonymous reads). Tested on a throwaway local Postgres with `supabase/tests/local/run-privacy.sh`.

## Before every step
1. Count profiles in production (`select count(*) from public.profiles`). Both migrations abort with `STOP (decision 4)` if any profile exists. If the count is not zero, stop and prepare a plan for founder review.
2. Confirm the step is explicitly authorized.

## Steps
1. **Expand.** Apply `..000100`. Old application keeps working (verified by `supabase/tests/privacy_expand.sql`). Rollback: drop the new columns, table, functions and restore the previous `handle_new_user()`; no data depends on them yet.
2. **Switch.** Deploy the application that reads only through the service role functions (`lib/privacy.ts`). Needs `SUPABASE_SERVICE_ROLE_KEY` set server side in Vercel. `SHARING_ENABLED` and `DIRECTORY_ENABLED` stay unset (off). Rollback: redeploy the previous build (expand left the old reads intact).
3. **Contract.** Apply `..000200` only after the switch is live and verified. It drops the public view, old functions and public read policies and revokes anonymous table access. Rollback: recreate them from migrations `20260101..20261106` (policies "profiles are publicly readable", "player games are publicly readable", "stats are publicly readable", "teams are publicly readable", view `public_profiles`, functions `leaderboard`, `leaderboard_player_count`, `sitemap_profiles`, `sitemap_profile_count`) and re-grant select to anon. Take this rollback only before real users exist, or with a plan.

## Feature flags
`SHARING_ENABLED` (private share links) and `DIRECTORY_ENABLED` (public profiles, leaderboards, sitemap) default off. Turning either on needs Trust and Safety readiness (decision 5) and counsel review (decision 10). Recruiter discovery does not exist and `scoutable` is not writable by users.

## Still open
Path token versus fragment and log scrubbing (R3), avatar delivery with signed URLs and the private avatar bucket (R6), edge rate limiting, a scoped server credential instead of service role, sign in open or closed state in production.

## Status on 2026-11-07
- **Expand applied to production** (founder authorization, 0 profiles and 0 auth users at the time). The rollback is `privacy-expand-rollback.md` (tested locally, not applied).
- **Switch deployed**: PR #5 is merged to `main`; the application reads through the server only functions. Flags `SHARING_ENABLED` and `DIRECTORY_ENABLED` and `SCRIM_UPLOADS_ENABLED` and `NEXT_PUBLIC_BILLING_ENABLED` must be unset or false in Vercel (not verifiable from the repository).
- **Contract prepared, NOT applied.** Dry run on production inside a rolled back transaction: the view, the four public read policies and the four old functions were removed, the four owner/member policies appeared, anon lost all access to `profiles`, `player_games`, `stat_entries` and `teams`, the anonymous invite lookup (`team_invite_info`, security definer) still worked, the server only functions still worked for `service_role`, and with two throwaway users a signed in user could claim a handle, create a team, read their own games and stats and the roster, while seeing nothing of the other user. Afterwards a read only check showed everything back. Rollback: `privacy-contract-rollback.md` (recreates the exact production definitions; tested by `supabase/tests/local/run-contract-rollback.sh`). Applying it still needs its own explicit authorization and a fresh profile and auth user count.

### Read paths contract can affect (all on `main`)
| Path | Reads through | Affected by contract |
|---|---|---|
| Public profile page and social card (`/{handle}`, `/api/og/profile`) | `directory_profile()` via the service role | No |
| Sharing link page (`/r/{token}`) | `shared_profile()` via the service role | No |
| Leaderboards (`/leaderboard/*`) | `board_entries()`, `board_player_count()` via the service role | No |
| Sitemap | `sitemap_directory_count()`, `sitemap_directory_profiles()`, `board_player_count()` via the service role | No |
| Handle check (`/api/handle-check`) | `handle_available()` via the service role | No |
| Team invite page (`/join/{code}`) | `team_invite_info()`, security definer, the only anon key call in the app | No (verified in the dry run) |
| Dashboard, onboarding, auth callback | the signed in user's own session, own rows only (owner policies) | No (verified with two test users) |
| Team page | `team_roster()` through the user's session | No |
| Waitlist | service role insert | No |
| Browser client | sign in and the public `avatars` bucket only | No |
Nothing in the application references `public_profiles`, `leaderboard`, `leaderboard_player_count`, `sitemap_profiles` or `sitemap_profile_count` any more, and no database function or policy refers to the view. The remaining exposure after contract is anyone calling the database's REST API directly with the public key: that is exactly what contract closes.

### Migration version bookkeeping
Production recorded the expand step as version **`20261107052543`** (name `privacy_expand`), because the tool used to apply it stamps the current time. The repository file is **`20261107000100_privacy_expand.sql`**. The earlier five migrations show the same offset (for example `waitlist` is `20261106013302` in production and `20261106000100` in the repository), so the repository and production have never matched on version numbers, only on content. Consequences for later tooling:
- The Supabase CLI (`migration list`, `db push`, `db pull`) and the dashboard's GitHub integration compare by version. They will report every repository file as unapplied and every production version as missing locally, and `db push` would try to re run files whose objects already exist.
- Do not enable automatic deploys from `main` or run `supabase db push` until the history is reconciled with `supabase migration repair` (marking the production versions reverted and the repository versions applied), or the repository files are renamed to the production versions. That edits production migration metadata and is a separate decision; **nothing was changed**.
- Until then, apply migrations by the same route as before (the migration tool or SQL editor), each with its own authorization. The contract step will again be stamped with the time it is applied.

### Production migration versions (as of 2026-11-07)
| Repository file | Production version | Production name |
|---|---|---|
| `20261106000100_waitlist.sql` | `20261106013302` | `waitlist` |
| `20261106000200_core_schema.sql` | `20261106013408` | `core_schema` |
| `20261106000300_m3_games_leaderboards_teams.sql` | `20261106035218` | `m3_games_leaderboards_teams` |
| `20261106000400_seo_profile_updated_at.sql` | `20261106043315` | `seo_profile_updated_at` |
| `20261106000500_profile_search_visibility.sql` | `20261106045048` | `profile_search_visibility` |
| `20261107000100_privacy_expand.sql` | `20261107052543` | `privacy_expand` |
| `20261107000200_privacy_contract.sql` | `20261107054445` | `privacy_contract` |
| (statement from `docs/proposals/rls-auto-enable-revoke.md`, no repository migration file) | `20261107055545` | `revoke_rls_auto_enable_public_execute` |
| `20261107000500_longer_invite_codes.sql` | `20261107060917` | `longer_invite_codes` |

Not applied: `20261107000300_dashboard_foundation.sql` and anything after it (`..000310`, `..000400`). Content matches; only the version numbers differ (production stamps the time of application). The `rls_auto_enable` revoke exists only as a statement in its proposal, not as a repository migration file. See the bookkeeping note above before using any tool that compares versions.

## Dashboard foundation (migration `20261107000300_dashboard_foundation.sql`)
Additive, owner only, not applied to production. Adds `tournament_entries`, `highlights`, `scrim_uploads` and the private `scrim-uploads` bucket (own folder only). Apply only after the contract step and with its own authorization and profile count check. Tested with `supabase/tests/local/run-dashboard.sh`.

`SCRIM_UPLOADS_ENABLED` stays off until the privacy foundation is live and approved. Open before turning it on: counsel review of demo files that contain other people's names, voice and chat (the uploader asks the player to confirm they took part and will not share the file); retention and deletion policy for stored files; virus and content handling; the project level upload size limit. Files are stored only. No parser has been validated, so no stats are produced from them.

See also [pilot compliance review](../compliance/pilot-review.md) for the demo file, case study and flag gating review prepared for counsel.
