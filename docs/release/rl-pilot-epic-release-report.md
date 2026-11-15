# Release report: Rocket League pilot and Epic verification

Updated 2026-11-15 (second pass). **Status: NOT APPROVED FOR RELEASE.** Nothing is merged or deployed, and no production migration or setting has been changed. The policy text is pending legal review. Decisions are summarized in `docs/release/decision-brief.md`.

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
| `schedule_event_purge` (pg_cron job, proposal) | applied 2026-11-15 (test) | **not applied**; needs approval |

**Staging database tests, run against staging itself in transactions that roll back (2026-11-15):** team scrims and events 33/33; Discord linking 46/46; consent November 15 11/11; verified Epic identity 18/18; event cleanup 4/4. The Rocket League import test (`rocket_league_import.sql`) has passed only on local Postgres. Staging holds no test rows. Supabase security advisor: no new issues beyond the expected notes (section 8).
Production read-only facts: 83 accounts (82 have never signed in; 1 signed in within 30 days); 0 teams; 1 account with a saved game; no uploads or highlights; none of the pilot tables exist.

## 2. Production release sequence (each step needs your explicit approval)
1. **Consent migration** `20261110000100`. Additive (two tables, two check functions, policies, grants); it drops, rewrites and deletes nothing. Safe before any code change, because the live site does not read these tables.
2. **Remaining migrations**, each as its own step after a rolled-back dry run on production: `20261110000200`, `20261108000100`, `20261112000100`, `20261112000200`, `20261113000100`, `20261115000100`.
3. **Merge**, in order: #47, #50, #35, #53, the pilot branch (it needs a PR first), then #54. Merging #54 alone into the stack gives the same tree.
4. **Deploy** with `SCRIM_UPLOADS_ENABLED`, `LOL_IMPORT_ENABLED` and `VICTRESS_EPIC_SIGNIN_ENABLED` off, and `NEXT_PUBLIC_BILLING_ENABLED=false`. **Never deploy before step 1:** the consent gate fails closed, so without the tables every signed-in page shows "Victress is finishing an update".
5. **Check**: the policy is on both domains; a signed-in account is sent to `/consent`; the Epic routes return 404.
6. **Separately approved after release:** event cleanup schedule (and the matching policy line); the pilot flag for allowlisted players; Epic on Preview, then production.
Not in this release: #48 and #49 (website stages; 3 small textual conflicts with #50, resolved in `claude/integration-check`), #42 and #36.

## 3. Consent and age verification (no behaviour changed in this pass)
**What the 83 production accounts will experience.** After the migration and the deploy, on their next signed-in page view (or right after their next sign-in) they are sent to `/consent`. Because none has a record yet, they see "Before you start." with a date of birth field and one checkbox accepting the Terms and the Privacy Policy. Nothing else is reachable until they submit (they can sign out). The 82 who have never signed in see this the first time they do.
**How date of birth is collected and stored.** One date input (`autocomplete="bday"`), with the note "Used only to check that you meet the minimum age. It is private and never shown on your profile." It is stored once, in `age_confirmations.birth_date` (full date) with `confirmed_at`. The player can read their own row, cannot change or delete it, and it is deleted with the account. It is in the data export. It is not asked again when documents change.
**Under 13.** The server computes the age. Under 13 means `deleteAccount` runs immediately: it removes the waitlist row for the email, the player's stored files and the Supabase Auth user (which cascades to the profile and all owned data), then signs them out and shows "You must be 13 or older… we have not created an account and have not kept the details you gave." The date of birth is never written for them. The database also refuses an under-13 date itself (trigger), as a second check.
**Immediate and irreversible:** yes. There is no confirmation step, no grace period, no soft delete and no backup restore path in the app.
**Risks found:**
1. **A typo deletes an existing account.** Picking this year, or a wrong year on a phone date picker, permanently deletes the account with one click. For the 83 existing accounts the loss is small today (one account has one saved game), but the path is permanent.
2. **Wrong message for existing accounts:** "we have not created an account" is untrue for someone who already had one.
3. **The team guard is bypassed.** Normal deletion refuses a team owner with other members; the under-13 path does not. Because `teams.owner_id` cascades, an owner's under-13 entry would delete the team for all its members. Production has 0 teams, and new users confirm age before they can create a team, so this is latent; it matters only if a team owner is ever asked for a date of birth.
4. **Data minimisation:** the full date of birth is kept when only "13 or older on this date" is needed.
**Safer alternatives (each needs your approval; none implemented):**
- (a) **Confirm before deleting:** "You entered 14 March 2016, which makes you 9. Is that right?" Smallest change; removes most typo risk.
- (b) **Hold instead of delete:** block the account and delete it after a short window (for example 7 days) unless corrected through support. Safer, but it keeps a minor's data briefly, which counsel should weigh.
- (c) **Correct the message** for existing accounts ("your account and its data have been deleted").
- (d) **Apply the team owner guard** to the under-13 path (refuse and ask the owner to contact support).
- (e) **Store less:** keep only `confirmed_at` (and possibly the birth year), not the full date.
Recommendation: (a), (c) and (d) before the consent migration goes live; ask counsel about (b) and (e).

## 4. Consent enforcement tests
- Fail closed (fixed earlier): missing consent tables keep every signed-in page shut. Discord also fails closed.
- Browser (`scripts/consent-test.mjs`, 39 checks): new user; under 13; older version; **a player on the November 10 documents** must accept November 15, gets one new Privacy row with a timestamp, and keeps the earlier rows; **missing tables** keep the dashboard, scrims, account and onboarding shut.
- Database (`consent_nov15.sql`, 11 checks, local and staging): the player cannot set or backdate the time, or rewrite or delete records; one row per version; versions are dates; deletion cascades; **Discord** refuses the old version and allows November 15.
- Discord commands: `/profile` and `/scrim submit|status|stats` refuse without current consent; `/unlink` still works.

## 5. Privacy Policy (`content/legal.ts`, version `2026-11-15`, pending legal review)
- Same document on victressesports.com/privacy and victress.gg/privacy; canonical `https://victressesports.com/privacy`; visible pending legal review notice.
- Epic Games disclosures (no Ballchasing lookup); team scrims, team stat sharing and product events, written from the implementation (`scripts/policy-facts-test.mjs` pins the code facts).
- **Not yet disclosed: Vercel Web Analytics** (section 6).

## 6. Vercel Web Analytics (decision needed)
**What runs today:** `app/layout.tsx` renders `<Analytics />` from `@vercel/analytics` 2.0.1 on every page of both domains when deployed on Vercel. It is live on production (the script at `/_vercel/insights/script.js` returns 200).
**What the browser sends** (read from the deployed script, version 0.1.3, and the package source):
- On each page view, a POST to `/_vercel/insights/view` on our own domain with: `o`, the **full page URL including the query string**; `dp`, the route pattern (for example `/r/[token]`); the script and SDK version; and `r`, the referrer, only on the first page view and only when it is another site.
- No user ID, traits or custom events: Victress never calls `identify` or `track`.
- With the request, Vercel also receives what any HTTP request carries: IP address and user agent.
**Cookies and storage:** no cookies (the optional `enableCookie` is never called). `localStorage` is touched only to remove an empty `__va_attribution` key; nothing is stored. Vercel's documentation says visitors are identified by a hash of the incoming request that resets daily, so it cannot follow a visitor across days or sites, and that it does not collect data that lets you identify an end user (vercel.com/docs/analytics/privacy-policy; read through search results, since vercel.com is outside this environment's network).
**A concrete exposure:** because the full URL is sent, these secrets in URLs go to Vercel Analytics: **private profile share links** (`/r/<token>`), **team invite codes** (`/join/<code>`), **Discord link codes** (`/dashboard/link/discord/<code>`), and query values such as `?ref=` and `?claim=`. Vercel already receives every URL as our host in its request logs (disclosed under "Basic technical data"), so no new company is involved. But the analytics product keeps them longer, and anyone with Vercel dashboard access can see them.
**Is it disclosed?** No. The policy says "we do not run advertising or third party tracking tags" and lists Vercel only for "hosting and delivery".
**Option A: disclose and keep.** Add a `beforeSend` that drops query strings and replaces token or code path segments with the route pattern, and add a policy line, for example: "Vercel Web Analytics: counts of page views (the page, without private codes, the referring site and general device and country information), without cookies and without identifying you. Vercel processes it under its own terms." Product benefit: marketing traffic and referrer insight. Cost: a small code change, a third service named in the policy, and counsel review.
**Option B: remove.** Delete the two lines in `app/layout.tsx` and the package. The policy stays accurate as written. Cost: no page-view or referrer statistics; first-party product events still measure the product steps that matter for the pilot.
**Recommendation: B for this release.** It is the smallest and safest change, fixes a live inaccuracy and the URL secret exposure at once, and loses nothing the pilot needs. Option A can be added later as a deliberate, disclosed choice. **The decision is yours; nothing has been changed.**

## 7. Supabase Auth: leaked-password protection
- **How it works** (supabase.com/docs/guides/auth/password-security): when a password is set (sign-up or change), Supabase checks it against the HaveIBeenPwned Pwned Passwords list and rejects known leaked passwords. **It requires the Pro plan or above.**
- **Victress impact:** the app has no password sign-in. Sign-in is an email link (`signInWithOtp`), Discord or Google. Turning it on changes nothing for players. It matters only if the Email provider still accepts passwords through the Auth API: the staging test accounts use password sign-in, which shows staging allows it.
- **Safe on staging first:** yes. It affects only new or changed passwords; existing sessions and email links are unaffected.
- **Rollout plan:** (1) In Supabase, Authentication, check the project plan and whether Email password sign-up is enabled. (2) Staging: enable leaked-password protection and a minimum length; set a password for a test account to confirm a known leaked one is refused. (3) Production, after your approval: either disable password sign-in entirely (the stronger option, since Victress does not use passwords; confirm no account depends on one), or enable leaked-password protection. I cannot change Auth settings from here; there is no tool for them.

## 8. Event retention
See `docs/proposals/event-retention-schedule.md`. Not scheduled because it needs `pg_cron`, an environment change left for approval. Recommended mechanism: a Supabase Cron (`pg_cron`) job calling `purge_events(12)` daily at 03:17 UTC; tested on staging. It deletes only events older than 12 months. Policy line once scheduled in production: "Product events: 12 months after they are recorded, or sooner if you delete your account."

## 9. Epic verification
**Brand review: submitted.** Case number `500QP00001tKTKIYA4`. Brand Settings submitted: website `https://victress.gg`, privacy policy `https://victressesports.com/privacy`, support `https://victressesports.com/contact`. Note: until the release, that privacy URL shows the November 10 policy, which does not mention Epic. If the reviewer asks, the Epic wording is in the pending release (pending legal review).
**Environment variables** (server only; `lib/epic/core.ts` `EPIC_ENV_NAMES`, read through `lib/epic/index.ts`, which is `server-only`; none is `NEXT_PUBLIC_`; checked: no Epic variable, endpoint or test secret appears in the built browser bundles):
| Name | Required | Value |
|---|---|---|
| `VICTRESS_EPIC_SIGNIN_ENABLED` | yes, to turn it on | exactly `true`; anything else is off |
| `VICTRESS_EPIC_CLIENT_ID` | yes | Client ID of the client linked to the Victress Epic Account Services application |
| `VICTRESS_EPIC_CLIENT_SECRET` | yes (secret) | that client's secret (`********`); Vercel only, mark it Sensitive |
| `VICTRESS_EPIC_REDIRECT_URI` | yes | the exact callback URL of the deployment (below) |
| `VICTRESS_EPIC_DEPLOYMENT_ID` | no | leave unset (below) |
Also needed where Epic is used: `SCRIM_UPLOADS_ENABLED=true` (the routes are pilot only, and the player must be on `design_partner_allowlist`), `BALLCHASING_API_TOKEN`, and on Preview the `STAGING_` Supabase trio.
**Where to get the client values:** Epic Developer Portal, your product, Product Settings, **Clients** tab: the client listed under the Epic Account Services application's **Linked Clients**. Its Client ID and Client Secret go into Vercel only, never into the repo or chat.
**Callback URI** (route `app/a/dashboard/link/epic/callback`, served at `/dashboard/link/epic/callback`; the code refuses any value that is not https, or http on localhost, ending in that path):
- Production: `https://victress.gg/dashboard/link/epic/callback`
- Preview: `https://<that Preview deployment's host>/dashboard/link/epic/callback`. Copy the host from Vercel; it differs per branch. Set it as a branch-scoped Preview variable for `claude/wizardly-ride-bafh0x`.
Each value must also be registered as a redirect URL on the Epic client, matching exactly.
**Deployment ID:** not required for this flow. The code sends `deployment_id` only when set. Epic documents it as affecting "interactions with other services that require a deployment" and entitlement-gated sign-in; Victress uses only the account ID. Leave it unset unless Epic's token endpoint refuses the exchange without it during the staging test.
**Which Vercel environments:** Preview now (flag `true` only for the staging test); Production later (variables can be added in advance with the flag unset or `false`).
**Do the variables already exist in Vercel?** Unknown: this environment has no Vercel CLI, token or API access, so it cannot be checked from here. Check Vercel, Project, Settings, Environment Variables (filter "EPIC").
**Tests:** unit 44, browser 17, database 18 (local and staging). Not done: a real Epic sign-in, so it is not yet shown that a real Epic Account ID equals Ballchasing's `epic` ID (the format matches).

## 10. Release readiness and remaining gaps
**Covered by tests:** Epic verification (unit, browser, database, staging); Discord linking (database 46 on staging, commands and env tests); Rocket League import (`test:rl` 113, database local); team scrims and events (database 33 on staging, pipeline 27, page 20); consent (browser 39, database 11 on staging); account export (20, Epic off and on); privacy pages 21; policy facts 19; SEO 1672/0; typecheck, lint, build.
**Gaps:**
1. Vercel Analytics: undisclosed, sends full URLs (section 6). Decision needed.
2. Under-13 path: immediate deletion without confirmation; wrong message for existing accounts; team guard bypassed (section 3). Decision needed.
3. Leaked-password protection, or password sign-in enabled at all (section 7). Decision and dashboard check.
4. Event cleanup not scheduled in production (section 8). Decision.
5. Not tested end to end: anything on a Vercel Preview (Deployment Protection; no access from here); Discord against a staging application; the founder's own Ballchasing replays; a real Epic sign-in; a full account deletion through the app on staging (no staging service key here); the Rocket League import database test on staging.
6. The pilot branch has no PR, so it cannot be reviewed as one unit.
7. Terms were not reviewed for Epic, team scrims or events.
8. Staging migration history repair (metadata only) is pending.
9. Advisor notes, expected: server-only tables without policies; signed-in functions that check `auth.uid()` themselves.
