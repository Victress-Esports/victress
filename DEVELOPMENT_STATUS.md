# Development status

Updated 2026-11-10. Authoritative references: `CLAUDE.md`, `docs/strategy/victress-business-purpose.md`, the living roadmap artifact, `docs/status.md` (feature table).

## Current milestone and task
Milestone 1, Foundation. Current: remove manual competitive entry (done, in PR below). Next: age gate, then Terms and Privacy acceptance with version and date.

## Completed
- Partnerships marketing page: PR #43 (page only, "Coming Soon" buttons, no mailto). Merged. Production https://victressesports.com/partnerships verified 2026-11-10: 200, new page, 6 disabled Coming Soon buttons in the served HTML, 0 mailto, 0 "Email us". PR #42 stays unmerged.
- Self-reported stats and leaderboards retired earlier (2026-11-07).
- Manual scrim match log, tournament history entry and manual rank entry removed (UI, server actions and public display). Database tables and columns are untouched (no migration). Existing saved values are no longer shown anywhere.

## In progress
- Branch `claude/zealous-thompson-3lz759`: remove manual entry (see above). Open PR, not merged: it changes the app that production serves, so it waits for approval.

## Foundation requirements still outstanding
- New responsive design (mobile, tablet, desktop)
- Age gate
- Terms and Privacy acceptance (version, timestamp) and reacceptance on change
- Account deletion and data export
- Consent before game account linking
- Confirm sign-in, onboarding, teams and invite links on staging
- Stripe test checkout for Pro and Team
- Steam linking and rrrocket ingestion behind a feature flag

## Tests (this branch)
Typecheck pass. Lint pass. Build pass. `scripts/signed-in-test.mjs` (mock Supabase, uploads off/on/not approved/approved) all pass, including new checks that the resume has no tournament or rank entry and the scrims page has no match log. `npm run seo:audit`: 1650 checks, 0 failed. Staging flows not yet run.

## Production
Only the Partnerships page is authorised and live. Production database has 14 migrations applied (through `invite_info_revoke_public`, checked read only 2026-11-12); none from #35, #41, #42, #47, #50. Billing flag stays false.

## Blockers needing a decision
None.
