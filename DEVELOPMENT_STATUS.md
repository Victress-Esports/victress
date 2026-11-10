# Development status

Updated 2026-11-10. Authoritative references: `CLAUDE.md`, `docs/strategy/victress-business-purpose.md`, the living roadmap artifact, `docs/status.md` (feature table).

## Current milestone and task
Milestone 1, Foundation. PR #44 (manual entry removal) is ready for its staging Preview. In progress: age gate and Terms and Privacy acceptance (branch `claude/foundation-consent`).

## Completed
- Partnerships marketing page: PR #43, merged and verified live 2026-11-10. PR #42 stays unmerged.
- Self-reported stats and leaderboards retired earlier (2026-11-07).
- Manual scrim log, tournament history and rank entry removed: PR #44 (no migration; old values no longer shown).
- Partnerships redesign per the approved updated specification: PR #45, page only, built and tested, awaiting approval to merge.

## In progress
- `claude/foundation-consent`: migration `20261110000100_age_gate_legal_acceptance.sql` (age_confirmations, legal_acceptances; owner only, insert only, under 13 refused by the database) with 23 local Postgres checks passing; full local SQL suite 193 PASS, 0 FAIL. Next: consent page, gate in `requireUser`, version constants, reacceptance, mock test updates. The gate must tolerate the tables being absent until the production migration is approved.

## Foundation requirements still outstanding
- New responsive design (mobile, tablet, desktop)
- Age gate (database done, app in progress)
- Terms and Privacy acceptance (version, timestamp) and reacceptance on change (database done, app in progress)
- Account deletion and data export
- Consent before game account linking
- Confirm sign-in, onboarding, teams and invite links on staging
- Stripe test checkout for Pro and Team
- Steam linking and rrrocket ingestion behind a feature flag

## Tests
PR #44:
Typecheck pass. Lint pass. Build pass. `scripts/signed-in-test.mjs` (mock Supabase, uploads off/on/not approved/approved) all pass, including new checks that the resume has no tournament or rank entry and the scrims page has no match log. `npm run seo:audit`: 1650 checks, 0 failed. Staging flows not yet run.

## Production
Only the Partnerships page is authorised and live. No migrations run. Billing flag stays false.

PR #45: tsc, lint, build pass; SEO audit 1648 checks, 0 failed; no horizontal overflow at 1440, 820 and 390 px; no prices in served HTML.

## Blockers needing a decision
- PR #45 CTA: it links to the existing /contact page, which is worded for the Design Partner pilot. Smallest improvement: add a "Partnership conversation" option to the contact form and API (touches the contact page, so not done without approval).
- Approvals to merge PR #44 and PR #45 (staging first for #44).
