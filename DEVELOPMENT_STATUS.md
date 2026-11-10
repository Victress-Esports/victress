# Development status

Updated 2026-11-10. Authoritative references: `CLAUDE.md`, `docs/strategy/victress-business-purpose.md`, the living roadmap artifact, `docs/status.md` (feature table).

## Current milestone and task
Milestone 1, Foundation. Current: remove manual competitive entry (done, in PR below). Next: age gate, then Terms and Privacy acceptance with version and date.

## Completed
- Partnerships marketing page: PR #43 (page only, "Coming Soon" buttons, no mailto). Merged. Production https://victressesports.com/partnerships verified 2026-11-10: 200, new page, 6 disabled Coming Soon buttons in the served HTML, 0 mailto, 0 "Email us". PR #42 stays unmerged.
- Self-reported stats and leaderboards retired earlier (2026-11-07).
- Manual scrim match log, tournament history entry and manual rank entry removed (UI, server actions and public display). Database tables and columns are untouched (no migration). Existing saved values are no longer shown anywhere.

## In progress
- Website stage 1 (front door), PR open, not merged. Tests: tsc, lint, build; SEO audit 1652/0 failed; `scripts/journey-test.mjs` (5 role journeys from the marketing site through registration and onboarding to the destination, Partnerships, navigation on 7 pages); signed-in flows 59 pass; contact tests pass.
- Branch `claude/zealous-thompson-3lz759`: remove manual entry (see above). Open PR, not merged: it changes the app that production serves, so it waits for approval.

## Website sequence (founder direction 2026-11-10: one connected experience, Apple and Airbnb simplicity)
Rule for every stage: short copy, one primary action, no repeated explanations, no invented activity, no feature promised that does not exist. Contact is never the conversion path.
1. **Front door (PR open):** short main navigation (Platform, Partners, Women in Esports, Pricing, Log in, Get started); homepage cut to hero, "Where do you belong?" and the three products; one registration entry (`/login?role=`) with five roles (player, coach or team, scout or recruiter, college program, partner organization); onboarding follows the role and ends at that role's destination; Partnerships reduced to one next step, Become a Partner. Roles whose own experience is not built say so and save the account.
2. **Rest of the marketing site, same layout and length:** Platform, For teams, Pricing, About, Women in Esports (what it is and how organizations take part, kept distinct from the platform), Design Partner (pilot application, linked from teams, not from the hero). Remove repeated sections, one visual per idea, phone first pass.
3. **Role experiences in the app, in roadmap order:** player and team (Foundation, in progress); consent and account controls; scout (after launch); college program; Partner platform on its own branch (PR #42 and the Partner phases), at which point `partner` accounts route into it.
Each stage is its own PR, tested as user journeys, staging first.

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
Only the Partnerships page is authorised and live. No migrations run. Billing flag stays false.

## Blockers needing a decision
None.
