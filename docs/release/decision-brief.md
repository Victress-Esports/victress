# Decision brief: Rocket League pilot and Epic verification

2026-11-15. Details and evidence: `docs/release/rl-pilot-epic-release-report.md`. **Nothing is merged or deployed; no production migration or setting has changed.**

## 1. Complete
- Pilot features built and tested: Discord linking and commands, Rocket League replay import, team scrims with per player sharing, product events, account export and deletion, consent with renewed acceptance (now fails closed).
- Epic verification behind a flag (off), server only, basic profile scope; no secret in browser code.
- Staging has every pilot migration; the database tests pass against staging itself (Discord 46, team scrims and events 33, consent 11, Epic 18, cleanup 4).
- Privacy Policy on both domains from one source, with a pending legal review notice, Epic, team and event disclosures.
- Epic brand review submitted, case `500QP00001tKTKIYA4`.
- Event cleanup schedule designed and proven on staging.

## 2. Still needs engineering work (small)
1. Whichever Vercel Analytics option you choose (B: remove two lines; A: redaction plus policy text).
2. Under-13 safeguards, if approved: a confirmation step, a correct message for existing accounts, the team owner guard.
3. Open a PR for the pilot branch so it can be reviewed and merged as one unit.
4. End-to-end tests on a Vercel Preview: Epic sign-in with your account, Discord with a staging app, your own Ballchasing replays. Needs your Preview access and the variables below.
5. Run the Rocket League import database test on staging (passes locally).
6. Staging migration history repair (metadata).

## 3. Your decisions
1. **Vercel Analytics:** A (disclose, redact URL secrets) or **B (remove; recommended)**.
2. **Under-13 handling:** approve (a) confirm before deleting, (c) correct message, (d) team owner guard (recommended); decide with counsel on (b) hold instead of delete and (e) store less than the full date of birth.
3. **Leaked passwords:** check plan and Email provider settings; recommended: turn off password sign-in in production (Victress does not use passwords), or enable leaked-password protection; staging first.
4. **Event retention:** approve the daily 12 month cleanup in production and the policy line "Product events: 12 months after they are recorded, or sooner if you delete your account."
5. Each production migration, the merge order, and the deploy.
6. Vercel environment variables for Epic (Preview now, Production later).

## 4. Legal review
- The Privacy Policy version `2026-11-15` as a whole, including Epic, team scrims, sharing, product events and whichever analytics option you choose.
- Age gate: immediate deletion for under 13, storing the full date of birth, and the hold option.
- Whether the Terms need updates for Epic, team scrims and events.
- Remove the pending legal review notice only after sign-off.

## 5. Recommended production release sequence
0. Decide 3.1 and 3.2; land the resulting small changes in PR #54; rerun all tests.
1. Legal sign-off on the policy (or explicit approval to launch with the pending notice).
2. Apply `20261110000100` (consent). Safe before code.
3. Apply `20261110000200`, `20261108000100`, `20261112000100`, `20261112000200`, `20261113000100`, `20261115000100`, one at a time, each after a rolled-back dry run.
4. Merge #47, #50, #35, #53, the pilot branch PR, then #54.
5. Deploy with pilot, League and Epic flags off; billing off.
6. Verify: policy on both domains; a signed-in account goes to `/consent`; Epic routes 404.
7. Then, each separately: the event cleanup schedule plus its policy line; the leaked-password or password setting; the pilot flag for allowlisted players; Epic on Preview, then production.
