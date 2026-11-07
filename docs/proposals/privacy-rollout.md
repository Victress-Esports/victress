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

## Dashboard foundation (migrations `20261107000300_dashboard_foundation.sql` and `20261107000310_upload_allowlist.sql`)

> **WARNING: do not apply `20261107000300_dashboard_foundation.sql` to production until file uploads are formally approved.**
> It creates the `scrim-uploads` Storage bucket. The application flag `SCRIM_UPLOADS_ENABLED` only hides the interface; it does not stop a signed in user calling Storage directly. If `..000300` is applied without `..000310`, any signed in user could upload files to their own folder regardless of the flag. If uploads are not approved, apply neither. When they are approved, apply `..000300` and `..000310` together (the allowlist closes the direct path), each with its own explicit authorization, a fresh profile count check and a rollback plan.

Additive, owner only, not applied to production. `..000300` adds `tournament_entries`, `highlights`, `scrim_uploads` and the private bucket (own folder only). `..000310` adds the `design_partner_allowlist` table (readable and writable by `service_role` only), `upload_allowed()`, requires the allowlist in the Storage insert policy, and removes every client write path to `scrim_uploads`: the server action records uploads with the service role after checking the flag, the allowlist, the path, and the real size reported by Storage, so a client cannot write `size_bytes`. A partner removed from the allowlist can no longer upload but can still delete what they stored. Tests: `supabase/tests/local/run-dashboard.sh` (`dashboard.sql` and `upload_allowlist.sql`).

`20261107000400_scrim_matches.sql` (the match log) is additive and owner only: a player's own record of practice matches (date, game, opponent team name, result, optional score, map and note), Self-reported (`source = manual`, enforced), capped at 500 per player, never part of a public view or sharing link. It replaces `dashboard_caps()` from `..000300`, so it must be applied after it, and it waits with it. Opponent is a team or group name only; the form asks players not to enter individual players' names. Tests: `supabase/tests/scrim_matches.sql`.

The tournament and highlight tables in `..000300` are harmless on their own, but they share the file with the bucket, so the whole file waits. Splitting the bucket into its own migration is an option if the resume sections should ship before uploads are approved (needs a decision).

`SCRIM_UPLOADS_ENABLED` stays off until the privacy foundation is live and approved. Open before turning it on: counsel review of demo files that contain other people's names, voice and chat (the uploader asks the player to confirm they took part and will not share the file); retention and deletion policy for stored files; virus and content handling; the project level upload size limit; who may add partners to the allowlist (service role only, through a reviewed process). Files are stored only. No parser has been validated, so no stats are produced from them.

See also [pilot compliance review](../compliance/pilot-review.md) for the demo file, case study and flag gating review prepared for counsel.
