# Release report: Rocket League pilot and Epic verification

Prepared 2026-11-15. **Status: NOT APPROVED FOR RELEASE.** Nothing is merged or deployed, and no production migration has been applied. The policy text is pending legal review.

Scope: PR #54 (`claude/wizardly-ride-bafh0x`), stacked on `claude/eager-carson-2b79tb` (the Rocket League pilot: Discord linking and bot, Ballchasing replay import, team scrims, product events). That branch already contains the substance of PRs #47 (consent), #50 (account controls), #35 (League of Legends import, hidden behind a flag) and #53 (Discord bot phase 1). It lacks only their "merge main" commits. A trial merge of #54 into main is clean.

## 1. Migration status
| Migration | Staging (`cmvifuayvqhbfkeskoqi`) | Production (`pmamceqshyfptvjgimsf`) |
|---|---|---|
| `20261107000600/610/620` invite and waitlist grants | applied 2026-11-15 | applied earlier |
| `20261108000100` game API imports (#35) | applied earlier | **not applied** |
| `20261110000100` age gate and legal acceptance (#47) | applied earlier | **not applied** (no consent tables) |
| `20261110000200` waitlist service role delete (#50) | applied earlier | **not applied** |
| `20261112000100` Discord account link | applied 2026-11-15 | **not applied** |
| `20261112000200` Rocket League link import | applied 2026-11-15 | **not applied** |
| `20261113000100` team scrims and events | applied 2026-11-15 | **not applied** |
| `20261115000100` verified Epic identity | applied 2026-11-15 | **not applied** |

Staging checks after applying: the database tests ran on staging inside transactions that roll back (consent 11/11, verified Epic identity 18/18); 7 policies and 4 triggers are present; events and team tables have no anonymous or player access beyond the designed policies; the tables hold no test rows. Not done on staging: the history record repair for the "effect only" migrations (metadata, `docs/proposals/staging-reconciliation-plan.md`).

Production read-only checks: 83 accounts; `public.profiles` exists (the only dependency of `20261110000100`); none of the pilot tables exist. `20261110000100` is additive: it creates two tables, two check functions, policies and grants, and drops, rewrites or deletes nothing.

### Production deployment order (each step needs your explicit approval)
1. Apply `20261110000100` (consent). Safe before any code change: the live site does not read these tables.
2. Apply `20261110000200`, then `20261108000100`, `20261112000100`, `20261112000200`, `20261113000100`, `20261115000100`, each as its own approved step, after a rolled-back dry run on production.
3. Merge in order: #47, #50, #35, #53, then the pilot branch (it has no PR yet), then #54. Or merge the stack together; the result is the same tree.
4. Deploy with `SCRIM_UPLOADS_ENABLED`, `VICTRESS_EPIC_SIGNIN_ENABLED` and `LOL_IMPORT_ENABLED` **off**, and `NEXT_PUBLIC_BILLING_ENABLED=false`.
5. Check: the policy is live on both domains; an existing account is sent to the consent page.
6. Only then, and separately: turn on the pilot flag for the allowlisted players, set up Epic, and submit Epic brand review.
**The code must not be deployed before step 1.** The consent gate now fails closed (below), so without the tables every signed-in page shows "Victress is finishing an update".
Not part of this release: #48 and #49 (website stages; 3 small textual conflicts with #50, resolved in `claude/integration-check`), #42 and #36.

## 2. Consent enforcement
- **Fail open, found and fixed.** `consentStatus` returned `unavailable` when the tables were missing, and the gate let everyone through. This was deliberate, so code could deploy before the migration. It now fails closed: signed-in pages redirect to `/consent`, which shows a neutral update message with no form and never the dashboard. The consent action refuses too. Discord already failed closed (any database error means no consent).
- **Renewed acceptance:** the app compares exact versions (`content/legal-versions.ts`: terms `2026-11-10`, privacy `2026-11-15`). After the migration, all 83 production accounts will be asked for their date of birth and both documents on next sign-in, because none has a record yet. **Anyone who enters an age under 13 has their account deleted (existing design).** Players already accepted on staging (version `2026-11-07`) are asked again.
- Tests:
  - Browser (`scripts/consent-test.mjs`, 39 checks): new users; under 13; a player on an older version; **a player on the documents live today (November 10)** is sent to `/consent`. Scrims, team and account pages are blocked; the player accepts and only one new Privacy row (`2026-11-15`) is added, with a timestamp. The November 10 rows are unchanged and Terms (unchanged) gets no new row. **With the consent tables missing**, the dashboard, scrims, account and onboarding stay shut.
  - Database (`supabase/tests/consent_nov15.sql`, 11 checks, local and **staging**): the player cannot set or backdate the time and cannot rewrite or delete acceptances; one row per version; versions must be dates; earlier times are unchanged; the record is deleted with the account. **Discord**: refused on the November 10 Privacy Policy, allowed after November 15, refused again if Terms change.
  - Discord commands (`scripts/discord-commands-test.mjs`): `/profile`, `/scrim submit`, `/scrim status` and `/scrim stats` refuse a player whose consent is not current; `/unlink` still works (leaving is never blocked).

## 3. Privacy Policy changes (`content/legal.ts`, version `2026-11-15`, pending legal review)
- **Both domains, one source:** victressesports.com/privacy and victress.gg/privacy render the same document; the canonical and `og:url` are `https://victressesports.com/privacy`. Tested at desktop and phone width: identical text, all 10 sections, footers.
- **Visible notice** under the date on both: "This policy is pending legal review. It describes how Victress works today, and we will update it if the review changes anything." The SEO audit's ban on "pending" and "legal review" now has an exception for this exact sentence on `/privacy` only.
- **Epic Games:** what Epic sends (Epic Account ID, temporary sign-in tokens, possibly a display name, which is not read or kept); what is kept (the Epic Account ID and the time it was verified); never sent to Ballchasing or any other service; basic profile only; no friends, presence, country or game activity; not a way to sign in to Victress; how to remove it; retention.
- **Team scrims, sharing and product events**, written from the implementation (below).
- **Ballchasing lookup removed:** the Epic callback no longer searches Ballchasing by Epic Account ID.

## 4. Inventory: product events and team statistics (from the code and migration `20261113000100`)
| Question | Product events | Team scrims | Team lines (individual numbers) |
|---|---|---|---|
| What is collected | Event name (8 fixed names), time, and optionally source (web, discord, email, google, invite), referral code and game. The database refuses anything else. No numbers, replay or match IDs, game IDs, names, emails, IPs or pages | Date, length, match type, side, result and score, side totals and opponent totals (goals, assists, saves, shots, score only; the database refuses other keys), optional opponent label typed by the submitter, submitter and channel, Ballchasing replay ID | The player's own goals, assists, saves, shots and score for that scrim |
| When | Key account steps | Only when the submitter ticks "add to team" or passes `team:True` in Discord | Only for players who turned sharing on before the scrim was submitted (off by default) |
| Who can read | Nobody but the server (no player access). The player can download their own in the data export | Current members of that team only | Current teammates, only while the line's owner is on the team and sharing is on; withheld if it would reveal a non-sharing teammate's numbers by subtraction; the owner always sees their own |
| Scouts and recruiters | No | No | No |
| Public | No: not on profiles, share links, social cards, leaderboards, sitemaps or Scout Desk (`scripts/policy-facts-test.mjs`) | No | No |
| Player leaves or is removed | Unchanged | The scrim stays with the team | Their sharing choice and all their lines on that team are deleted |
| Player turns sharing off | n/a | Unchanged | All their lines on that team are deleted; turning it on again does not restore old lines |
| Account deleted | Deleted | Stays with the team; "submitted by" is cleared; totals are not separated by player | Deleted |
| Team deleted | n/a | Deleted | Deleted |
| Retention | Until account deletion. A 12 month purge function exists but is **not scheduled**, so the policy does not promise 12 months | Until the owner or submitter removes it, or the team is deleted | As above |

## 5. Epic verification tests
- Unit (`scripts/epic-test.mjs`, 44 checks): flag and config; authorize URL (Epic's documented endpoint, `basic_profile` only, state, no secret); token request (Basic credentials, body) and token info confirmation; every refusal path (cancelled, forged or missing state, another Victress account, bad code, Epic error or outage, wrong client, inactive token, account mismatch); saving rules; **policy accuracy** (no Ballchasing call, no token logging, display name never read, only basic profile, pending review marker).
- Browser (`scripts/epic-page-test.mjs`, 17): flag off means no button and 404 routes; flag on shows the button and wording, the redirect, a cookie that is HttpOnly, Secure, SameSite Lax and path-scoped, no caching, a forged state refused, and refusals for non-pilot and signed-out users; 390px.
- Database: 18 checks, local and **staging**.
- **Not done:** a real Epic sign-in (no Epic client yet), so it is not yet shown that a real Epic Account ID equals the Ballchasing `epic` ID (the format matches: 32 lowercase hex). Check: verify, then submit a replay you played on Epic. If it says your ID is not in the replay, stop.
- Brand Settings (on hold until release and policy approval): website `https://victress.gg`, privacy `https://victressesports.com/privacy`, support `https://victressesports.com/contact`.

## 6. Remaining security and data-disclosure gaps
1. **Vercel Analytics** (`app/layout.tsx`) runs on the live site and in this release. The policy says "no advertising or third party tracking tags" and lists Vercel only for hosting. Decide: disclose it or remove it.
2. **Leaked-password protection is off** in Supabase Auth on staging and production (security advisor warning). It is an Auth setting, not code.
3. **Event retention:** schedule `purge_events(12)` and then add 12 months to the policy, or keep "until you delete your account".
4. **Terms** were not changed for Epic, team scrims or events. Counsel should review whether they need to be.
5. **Opponent label** is free text typed by the submitter. It can contain another team's name; it is disclosed and visible to the team only.
6. **Team totals after deletion:** a deleted player's contribution remains inside the team's side totals (disclosed; not separable).
7. **Not tested end to end:** anything on a Vercel Preview (Deployment Protection), Discord against a staging app, the founder's own Ballchasing replays, a real Epic sign-in, and a successful account deletion on staging (no staging service key here).
8. Staging migration history repair (metadata only) is still pending.
9. Advisor notes reviewed and expected: tables without policies are server-only by design; the signed-in functions that can be called check `auth.uid()` themselves.

## 7. Tests run for this report (local unless stated)
Database suite: 21 migrations, 360 PASS, 0 FAIL; plus staging runs above. Browser: consent 39, privacy pages 21, Epic 17, pilot pages 30, signed in 55, team scrims page 20, account export 20 (Epic off and on). Unit: Epic 44, policy facts 19, `test:rl` 113, `test:discord` 94. Typecheck, lint and build pass; SEO audit 1672 checks, 0 failed.

## Needs your approval
Each production migration (section 1); the merge order and the deploy; the policy wording after legal review; Vercel Analytics (disclose or remove); event retention; leaked-password protection; opening a PR for the pilot branch; the Discord test app and Preview access for staging tests.
