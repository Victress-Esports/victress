# Development status

Updated 2026-11-10. Authoritative references: `CLAUDE.md`, `docs/strategy/victress-business-purpose.md`, the living roadmap artifact, `docs/status.md` (feature table).

## Current milestone and task
Milestone 1, Foundation. Age gate and Terms/Privacy acceptance are built and tested (consent PR open, not merged). Next: account deletion and data export, then consent before game account linking.

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
Live now: PR #43 (superseded), #45, #46, #44. No production migrations have been run. Billing flag stays false. Production still needs, separately approved: migration `20261110000100` (and the earlier dashboard migrations already applied).

## Blockers needing a decision
- Staging is behind main: it lacks `privacy_contract`, `dashboard_foundation`, `upload_allowlist`, `scrim_matches`, invite code migrations and has Partner and game import migrations from other branches. I did not change that. Preview checks on staging need it brought level.
- I cannot open the Vercel Preview URLs from this environment (network policy blocks vercel.app) and have no staging login, so signed in pages on the real staging project are untested. Smallest action: sign in once on a Preview with a staging test account and click Resume, Scrims, Onboarding; or allow `*.vercel.app` hosts and give me a staging test login.
- Approval to apply the consent migration to production, then merge the consent PR.
