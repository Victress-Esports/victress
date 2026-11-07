# Feature flag readiness (SHARING_ENABLED, DIRECTORY_ENABLED, SCRIM_UPLOADS_ENABLED)

Written 2026-11-07. The founder approved turning on public profiles, leaderboards, sharing links and the directory **once they pass tests, Preview first, production only after seeing these results and confirming**. This is the test evidence so far and what is still missing. Nothing was turned on: Vercel settings are not changeable from here, and the production values of these flags are **unknown** (code default: off). `NEXT_PUBLIC_BILLING_ENABLED` stays false.

## What was tested, and where
| Evidence | Result |
|---|---|
| Local Postgres 16 privacy suite (`supabase/tests/privacy.sql`, 92 checks) | All pass |
| Same negative tests on the real staging project (`victress-staging`), one rolled back call, real Supabase default grants (81 checks: consent defaults, closed anonymous reads, server only functions, token handling, directory, leaderboard, handle checks, function privilege audit) | **81 PASS, 0 FAIL**; nothing kept (staging still has 0 users) |
| App level tests (`scripts/privacy-test.mjs`, flags on versus off) against the mock Supabase | All pass: pages, indexing headers, uniform 404 for private, revoked and unknown |
| Signed in tests (`scripts/signed-in-test.mjs`, 57 checks, including uploads flag off, on and not approved, on and approved) | All pass |
| Production, read only: schema equals staging; anonymous API returns 401 for every table and server only function (43 checks) | Pass |

## Consent defaults off: what that proves
A new profile has every consent off (`directory_listed`, `show_on_leaderboards`, `search_indexable`, `scoutable` false and every `public_fields` entry false). With those defaults: anonymous users and other signed in users read no profile, stat, game, team or share link row; the directory returns the same null for a private profile as for a handle that does not exist; the board is empty and counts nobody; the sitemap lists nobody; a share link returns only the fields chosen when it was made, and revoked, expired and unknown links are indistinguishable (null). Turning a consent off takes effect at once. `scoutable` cannot be set by a player and no recruiter access exists. The payloads contain no email and no provider name. Private contact details are not stored on the profile at all (the only email is on the auth account, never returned by any public function).

## Readiness per flag
| Flag | What it opens | Code and database | Remaining before Preview | Remaining before production |
|---|---|---|---|---|
| `SHARING_ENABLED` | Player created private links `/r/{token}` (hash only in the database, revocable, expiring, 20 active per player) | Built, merged, on production (table, `shared_profile`); tests above pass | A browser test on a Preview against staging with a real sign in (Preview builds now work) | **Decision 5**: Trust and Safety owner (now Matt Hill), deputy, hours and a report channel must exist before link sharing launches (founder direction 2026-11-06); an edge rate limit on `/r/*` (not built); counsel on minors. The founder's approval to launch the flags once tests pass may supersede the deputy and channel parts; that is for the founder to confirm in writing |
| `DIRECTORY_ENABLED` | Public profile pages `/{handle}` for players who list themselves; named leaderboards (open at 10 real players per game); sitemap entries for players who opt into search | Built, merged, on production; tests above pass | Same as sharing | Reporting, blocking and a protective hold in place, plus moderation of display name, bio and photo ([reporting-blocking-moderation.md](reporting-blocking-moderation.md)); community guidelines (**LEGAL**); the first real profile that lists itself should be a test account |
| `SCRIM_UPLOADS_ENABLED` | The practice file uploader for allowlisted design partners only | Built, merged; **now on production** (tables, private bucket, allowlist gate, applied 2026-11-07); policies deny uploads for anyone not on `design_partner_allowlist` (verified in the production dry run) | A real signed in upload against staging Storage (not yet done) | At least one allowlisted partner; counsel on other people's names and chat inside demos; the Free plan's per file upload limit (unverified, may be below demo sizes) and Pro; consent text in the uploader already requires the player to confirm they took part |

## What blocks "Preview first" today
1. **Resolved:** Preview builds now work. #24 chose the Supabase project by Vercel environment (Preview reads the `STAGING_SUPABASE_*` variables and never the production ones) and its Preview build is green. What has **not** been done yet: loading a Preview URL, signing in on it against the staging project, and running the flag checklist in a real browser. That is the next test.
2. Staging Auth settings (Site URL, redirect URLs, Discord and Google callbacks) are in [staging-test-plan.md](staging-test-plan.md) and have not been confirmed by the founder.
3. A Preview needs `SHARING_ENABLED` and `DIRECTORY_ENABLED` set to `true` in the **Preview** environment only (a Vercel setting the founder makes); production keeps them off until the results above are accepted.
4. Trust and Safety: Matt Hill is recorded as owner (2026-11-07); the deputy, review hours, report channel and the reporting and blocking build (see [reporting-blocking-moderation.md](reporting-blocking-moderation.md)) are not in place. Decision 5 asks for these before link sharing launches, and the directory needs them more.

## Recommended order
Sharing links first (the player controls the audience and can revoke it), then the directory and leaderboards after reporting and blocking exist. Design partners do not need the public directory to use Scrim Intelligence or their own resume.
