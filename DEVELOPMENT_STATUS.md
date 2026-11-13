# Development status

Updated 2026-11-13. Authoritative references: `CLAUDE.md`, `docs/strategy/victress-business-purpose.md`, the living roadmap artifact, `docs/status.md` (feature table).

## Current milestone and task
Milestone 1, Foundation. Age gate and Terms/Privacy acceptance are built and tested (consent PR open, not merged). Next: account deletion and data export, then consent before game account linking.

## Discord bot and Rocket League pilot
Working branch `claude/rl-pilot`. Not merged, not deployed, no migration applied anywhere (staging or production). Built and tested locally: Rocket League replay link import, account linking, `/scrim` commands, migrations `20261112000100` and `20261112000200`, Privacy text. **Fixes after the 2026-11-13 readiness audit:** platform handling is extensible (psynet and any platform Ballchasing reports; no Steam default or dependency; exact matching, nothing guessed); onboarding leads with the Ballchasing player link and explains unmatched replays; clearer replay messages (private, group or player link, unfinished); Discord replies are acknowledged at once with a 40 second deadline inside a 60 second function limit (no paid plan) and abandoned submissions are closed after 3 minutes; the descriptive `VICTRESS_SCRIM_DISCORD_*` variable names are preferred (generic names still work; the bot token is local only); the League of Legends experience is hidden unless `LOL_IMPORT_ENABLED=true`; the database test runner now fails if a test file crashes. Not claimed: live, production validated, or validated against the game. Runbook `docs/rocket-league-pilot.md`; player guide `docs/rocket-league-pilot-guide.md`; data model `docs/rocket-league-data-model.md`. Prerequisites still open: PRs #53, #47, #50, #35 and the external setup listed in the pilot docs.

## Team scrims and product events (2026-11-13)
Branch `claude/eager-carson-2b79tb` = `claude/rl-pilot` + this work. Not merged, not deployed, **no migration applied anywhere**. Built: Team scrims page (`/dashboard/team/scrims`), opt in "share my numbers with my team", the team choice on web and `/scrim submit team:True opponent:…`, opponent side stored as totals only, first party `public.events` (eight events, source, referral, game). Migration `20261113000100`. Design, permission rules and the staging checklist: `docs/rocket-league-team-scrims.md`. Tests (local): SQL 331 PASS 0 FAIL; staging dry run 111 PASS, nothing committed; team pipeline 27; team page 20 at 390px; Discord, RL, pilot pages 30, signed in 55, account, consent 25, age 9; typecheck, lint, build, SEO 1653/0. Fixed a stale selector in `pilot-pages-test.mjs` left by the previous commit. The "Permission and transparency" section of `claude/rl-mvp-weekend.md` was not available; implemented from the four rules in the request.
Needs approval: staging and production migrations; scheduling the 12 month events purge; Privacy Policy text (team sharing, product events) and version; Vercel Analytics in `app/layout.tsx` (an outside analytics service, not disclosed); the free text opponent label; Preview access for Discord; re-registering commands.

## Completed and merged (2026-11-10)
- PR #43 Partnerships page (first version). Superseded by:
- PR #45 Partnerships redesign per the updated specification. Live, verified.
- PR #46 Contact: Partnership conversation option (design partner and player forms unchanged). Live, verified.
- PR #44 Manual scrim log, tournament history and rank entry removed. Live; signed out pages and redirects verified. Signed in pages verified on the mock only (see blockers).
- Self-reported stats and leaderboards retired earlier (2026-11-07).

## In progress
- Consent PR (`claude/foundation-consent`): `/consent` page, gate in `requireUser` and the sign in callback, versions in `content/legal-versions.ts`, reacceptance when a version changes, under 13 refused (account and files deleted, date not kept). Migration `20261110000100_age_gate_legal_acceptance.sql`: **applied to staging only** (`cmvifuayvqhbfkeskoqi`), not production. The app tolerates the tables being absent, so deploying the code before the production migration does not lock anyone out, but the gate does not take effect until the migration is applied.

## Account deletion and data export (PR open, stacked on the consent PR)
Built: `/dashboard/account` (download my data, delete my account with typed name), JSON export of own data only, deletion of files, waitlist signup and account (cascade), team owners with players must remove them first (existing rule). One small additive migration `20261110000200_waitlist_service_role_delete.sql` (applied to staging only). See the PR for migration and deployment impact.

## Foundation requirements still outstanding
- New responsive design (mobile, tablet, desktop)
- Age gate: done, awaiting merge and production migration approval
- Terms and Privacy acceptance with version and timestamp, reacceptance on change: done, same
- Account deletion and data export: built, awaiting production approval of its migration and the consent migration
- Consent before game account linking
- Confirm sign-in, onboarding, teams and invite links on staging
- Stripe test checkout for Pro and Team
- Steam linking and rrrocket ingestion behind a feature flag

## Tests
Consent branch: tsc, lint, build pass. Local Postgres SQL suite 193 PASS, 0 FAIL (23 consent checks). The same 23 consent checks pass on Supabase staging inside a rolled back transaction; nothing left behind. `scripts/consent-test.mjs` 25 browser checks pass (gate on every signed in page, under 13, the day before the 13th birthday refused, 13 today accepted, acceptance version and timestamp, reacceptance with history kept). `scripts/age-test.mjs` 9 pass. `signed-in-test.mjs` 55 pass, `contact-test.mjs` pass, SEO audit 1651/0 failed, `test:env` pass.
Merged PRs: all automated checks passed before merge; contact form tested through both forms in a browser.

## Production
Live now: PR #43 (superseded), #45, #46, #44. Correction (read only check 2026-11-12): the production database already has 14 migrations applied (core through `invite_info_revoke_public`, including the dashboard and scrim tables); none from #35, #42, #47, #50 or the pilot work. Billing flag stays false. Production still needs, separately approved: migration `20261110000100` (and the earlier dashboard migrations already applied).

## Staging verification (2026-11-10), what is and is not verified
**How:** Vercel Previews are behind Vercel Deployment Protection (SSO), which was not bypassed, so no Preview was browsed. Instead the PR #50 code (which includes the consent flow from PR #47) was built and run locally, pointed at the real staging Supabase project (`cmvifuayvqhbfkeskoqi`: real Auth, database, row level security), signed in as staging-only test accounts (`@test.invalid`) through staging's password grant. This is **staging backend verification from a local app, not a Preview test**.
- **Verified on staging:** consent gate sends a new account to `/consent` before the account page; adult acceptance recorded with both versions and a timestamp; accepted player not asked again; reacceptance after a terms version change (older row kept, new row added, date of birth not asked again); export of own data only (profile, games, highlights, team name and own role, consent records), no teammate data, no share link tokens; a team owner with players is refused with the reason and nothing changes; a failed deletion destroys nothing (account, team, waitlist row intact); account delete cascade on the real schema removes the profile and a team owned alone with no orphans; staging migration privileges verified.
- **Bug found only on staging, fixed:** the export read `handle_changed_at`, which signed in users cannot select. (Fixed and re-verified.)
- **Bug found while planning staging tests, fixed:** deletion called `leave_team` before the irreversible step, which would have disbanded a solo-owned team if the delete then failed.
- **Not verified on staging:** (1) a complete successful deletion through the app: it needs the staging service role key. No staging service role configuration exists in this environment (its only configured variable is an unrelated API key), and the key was not requested or exposed. So Storage file removal through the API, waitlist removal through the app, and the final "account deleted" sign in confirmation were verified only against the local mock; (2) anything on a Vercel Preview (protected by Vercel SSO, not bypassed; local execution against the staging backend is used instead and is labelled as such).
- **Staging test data cleanup: NOT DONE.** Three attempts (the latest explicitly authorized by the founder) were each stopped by an unanswered confirmation prompt and not retried. Earlier: two attempts to run the cleanup SQL on staging were stopped by the Supabase tool's confirmation prompt for a destructive statement, which received no answer and timed out. Nothing was removed. Still on staging (`cmvifuayvqhbfkeskoqi` only, no production data involved): accounts `stg-fresh`, `stg-owner`, `stg-member` and `stg-solo` (all `@test.invalid`; correction after the final safety review: `stg-solo` and its team "Stg Solo" were already removed by the earlier cascade test, so staging currently holds 3 users, 1 team and the `stg-solo@test.invalid` waitlist row) with their profiles, team "Stg Squad" and "Stg Solo", consent rows, a highlight, a game, and a waitlist row for `stg-solo@test.invalid`. The founder will run it manually: reviewed script `docs/staging/cleanup-test-accounts.sql` (three parts: read only preview, atomic guarded deletion, read only verification; staging only). Final safety review done against the real staging schema (column types, every foreign key and delete rule, role switching inside a DO block, rollback) and the script's mechanics tested on a local scratch Postgres (success paths, 7 abort paths, rollback of the waitlist delete when a later step fails). Final correction: Guard 7 now classifies every foreign key to users, profiles and teams (35 on staging: none composite, none off `id`, none in other schemas, 10 Auth-owned and non-blocking), aborting on any composite or non-`id` key and on rows in any unexpected table; re-tested locally (16 cases). afterwards verify counts of zero for `auth.users like 'stg-%@test.invalid'`, `profiles like 'stg\_%'`, `teams like 'stg-%'` and `waitlist like '%@test.invalid'`.

## PR dependency order (trial merge, reference branch `claude/integration-check`, no PR)
1. **#47** consent (migration 1). 2. **#50** account controls (migration 2; base is #47). 3. **#48** site stage 1 (merges after #50 with 3 small textual conflicts: `app/a/login/page.tsx`, `scripts/seo-audit.mjs`, `DEVELOPMENT_STATUS.md`; resolved in the trial). 4. **#49** site stage 2 (stacked on #48; merges clean).
The trial merge and its conflict resolutions are preserved on branch `claude/integration-check` (reference only, no PR). Integrated tree: typecheck, lint, build pass; journey 60, consent 25, account 20, signed-in 59, SEO audit 1661/0 failed. Two test updates are needed when #48 lands after #47 (role journeys pass through `/consent`; the export reads `account_type`); they are in the reference branch.
Migration review: `docs/proposals/consent-account-migrations.md`.

## Blockers needing a decision
- Staging is behind main: it lacks `privacy_contract`, `dashboard_foundation`, `upload_allowlist`, `scrim_matches`, invite code migrations and has Partner and game import migrations from other branches. I did not change that. Preview checks on staging need it brought level.
- I cannot open the Vercel Preview URLs from this environment (network policy blocks vercel.app) and have no staging login, so signed in pages on the real staging project are untested. Smallest action: sign in once on a Preview with a staging test account and click Resume, Scrims, Onboarding; or allow `*.vercel.app` hosts and give me a staging test login.
- Approval to apply the consent migration to production, then merge the consent PR.
