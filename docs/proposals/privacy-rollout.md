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
