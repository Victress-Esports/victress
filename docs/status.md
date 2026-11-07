# Status: what is built, merged and live

As of 2026-11-07 (night). PRs #24, #22, #23, #26, #27, #28, #31 and #25 are merged; #29 (this page) and #30 follow. #11 (analytics) stays held. Checked against `main` (`8dbf628`), the open pull requests, and the production database `pmamceqshyfptvjgimsf` (read only: schema, privileges, row counts) plus the live sites (read only GETs and the anonymous API). Staging is `victress-staging` (`cmvifuayvqhbfkeskoqi`).

How to read the columns. **Built**: the code exists. **Merged**: it is on `main`. **On production**: the code is deployed and the database objects it needs exist (checked against the production schema), not that anyone has used it. **Gate**: the flag or migration that switches it on. **Unknown** means this repository and the read only checks cannot tell: Vercel environment variables, the Supabase Auth dashboard settings and email templates, and the Resend account are not visible from here.

## Production facts used below (read only, 2026-11-07)
- 1 auth user (the founder's test account, email link sign up, confirmed), 1 profile (`test`, CS2, every consent off), 1 `player_games` row. 0 stat entries, 0 teams, 0 team members, 0 share links, 0 waitlist rows, 0 storage objects.
- Tables in `public` (12): `profiles`, `player_games`, `stat_entries`, `teams`, `team_members`, `profile_share_links`, `waitlist`, and, **applied 2026-11-07 after a rolled back production dry run**, `tournament_entries`, `highlights`, `scrim_uploads`, `scrim_matches`, `design_partner_allowlist` with `dashboard_caps` and `upload_allowed`. Buckets: `avatars` and the private `scrim-uploads` (200 MB, upload policy requires the allowlist, which is empty). The production schema now equals staging in every structural category (columns, defaults, constraints, indexes, policies, triggers, functions, tables with RLS, buckets); the anonymous API returns 401 for all 12 tables and every server only function.
- Applied migrations (production versions): waitlist, core_schema, m3_games_leaderboards_teams, seo_profile_updated_at, profile_search_visibility, privacy_expand, privacy_contract, revoke_rls_auto_enable_public_execute, longer_invite_codes, waitlist_service_role_grants (`20261107204332`), dashboard_foundation_with_allowlist (`20261107212657`, repository `000300` plus `000310` in one transaction), scrim_matches (`000400`) and invite_info_service_grant (`000600`). `000610` (`20261107221521`, `invite_info_revoke_public`) is applied too, after #25's code was deployed and the production API logs showed the join page calling `team_invite_info` with the service role. All migrations in the repository are now applied to production.
- #24 is merged and deployed: Production reads `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; Preview reads `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY` and `STAGING_SUPABASE_SERVICE_ROLE_KEY` and never falls back to production. The live site loads, the served JavaScript has the production project's publishable key and no service role value, and the anonymous API returns 401 everywhere (43 live checks). `npm run test:env` guards this (31 checks).

## Feature table
| Feature | Built | Merged | On production | Gate (flag or migration) | What blocks it |
|---|---|---|---|---|---|
| Marketing pages (home, platform, Women in Esports, design partner, pricing, teams, about, partnerships, contact, privacy, terms) | Yes | Yes | Yes (all 200; live SEO audit 691 checks, 0 failed) | None | `main` still says Player Resume is "Available now" and "shareable" in places; fixed in #22 (unmerged). Titles and descriptions still use the tagline until #28. Legal text is draft, pending counsel |
| `llms.txt`, `robots.txt`, sitemap, structured data | Yes | Yes | Yes | None | Nothing; wording follows the same unmerged fixes |
| Sign up and onboarding (Discord, Google, email link) | Yes | Yes | **Email link: yes, completed by the founder.** Discord and Google: **unknown** (provider setup is in the Supabase dashboard) | Supabase Auth settings (sign up on or off) | Auth email templates unknown (proposal drafted); name step showed a hard coded "taken" line and the welcome email promised a link (both fixed in #22, unmerged); Pro (no backups on Free) |
| Dashboard: Overview | Yes | Yes | Yes (schema) | None | Hub labels claim "Available now" for Player Resume and Privacy and sharing (fixed in #22) |
| Dashboard: Profile (name, photo, bio, games) | Yes | Yes | Yes (schema; `avatars` bucket exists). Not exercised beyond onboarding | None | Nothing known; photo upload is untested on production |
| Dashboard: Stats (self-reported) | Yes | Yes | Schema yes; **0 entries, never exercised on production** | None | Only a real entry will show |
| Dashboard: Team | Yes | Yes | Schema yes; **0 teams, never exercised** | None | Join page calls the public API directly (no throttle), see #25 |
| Dashboard: Privacy | Yes | Yes | Columns and tables exist; settings can be stored | Effects depend on `DIRECTORY_ENABLED` and `SHARING_ENABLED` | Flags' production values **unknown** (code default: off) |
| Dashboard: Resume, about you, games, stats | Yes | Yes | Yes | None | None |
| Dashboard: Resume, tournament history and highlights | Yes | Yes | **Tables now exist** (applied 2026-11-07), owner only, capped. Untested by a real user | None left | Nothing blocking; the page still needs the production deployment to include current code (it works with the old code too) |
| Dashboard: Scout (shell) | Yes (explains, reads no player data) | Yes | Yes | Scout plan (entitlements) | Not a feature; see Scout Desk |
| Scrim match log | Yes | Yes | **Table now exists** (applied 2026-11-07), owner only, Self-reported, capped at 500 | None left | Nothing blocking; untested by a real user |
| Scrim file uploads | Yes (stores files, analyzes nothing) | Yes | **Database side yes** (private bucket and allowlist gate applied 2026-11-07; allowlist empty). Flag value **unknown** (code default off) | `SCRIM_UPLOADS_ENABLED` + a profile on `design_partner_allowlist` | Counsel on demo contents (other people's names, chat); the Free plan's per file upload limit (unverified, may be below demo size); a real upload test on staging Storage |
| Scrim Intelligence analysis (parsing, demo_parsed stats) | **No** | n/a | No | None exists | No parser, no approved game, no real demos supplied. Proposal: `proposals/scrim-intelligence.md` |
| Scout Desk (discovery, rosters, contact) | **No** (gated shell only) | n/a | No | Scout plan + billing | Counsel, organization verification, safety operations, billing, minors rules |
| Public profiles `/{handle}` | Yes (reads `directory_profile`) | Yes | Function exists; the one profile is not listed | `DIRECTORY_ENABLED` and the player's `directory_listed` | Negative tests pass (81 on staging, 92 local); reporting, blocking and moderation not built and Trust and Safety owner not assigned; no Preview that builds yet. See `proposals/feature-flag-readiness.md`; flag value **unknown** |
| Directory and search indexing | Yes | Yes | Functions exist | `DIRECTORY_ENABLED`, `directory_listed`, `search_indexable` | Same as above |
| Leaderboards | Yes | Yes | Functions exist; pages return 200 and are `noindex` | `DIRECTORY_ENABLED`, `show_on_leaderboards`, 10 real players per game | 0 players |
| Sharing links `/r/{token}` | Yes (token hashed in the database) | Yes | Table and `shared_profile` exist; 0 links | `SHARING_ENABLED` | Tests pass; appointments before launch (decision 5) unless the founder supersedes; edge rate limit on `/r/*` not done; no Preview that builds yet; flag value **unknown** |
| Billing and Stripe | Scaffold only (entitlements, a flag). No checkout, portal or webhook | Proposal merged (docs); code no | No tables, no webhook | `NEXT_PUBLIC_BILLING_ENABLED` (code default false) | Founder approval; Pro first; 4 PR plan in `proposals/stripe-billing.md`; Scout is not sold |
| Reporting, blocking, moderation | **No** (no code, no tables) | n/a | No | None exists | Owner recorded (Matt Hill, 2026-11-07); deputy, hours, report channel and tooling not established. Proposal: `proposals/reporting-blocking-moderation.md` |
| Waitlist form | Yes | Yes | Grant applied 2026-11-07 (migration `20261107204332`); **0 rows at last check, no submission seen since** | None | Needs one real submission to confirm; the confirmation email depends on Resend |
| Contact and design partner forms | Yes (send an email to `hello@victressesports.com`, store nothing) | Yes | Code yes; **Resend configuration unknown** | `RESEND_API_KEY` (Vercel) | Unknown until a form is submitted. On `main` no acknowledgement email goes to the submitter; a fixed plain text one is added in #22 (tested against a local Resend stand in) |
| Emails the app sends (welcome, waitlist) | Yes | Yes | **Unknown** (Resend not visible) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Welcome text promised a shareable link (fixed in #22); list in `emails.md` (after #22 merges) |
| Supabase Auth emails (confirm signup, magic link) | n/a (dashboard) | n/a | **Unknown text** | Supabase dashboard | Proposal drafted in #22 |
| Analytics | Vercel Analytics component loads when `VERCEL` is set; #11 (consent aware analytics) is unmerged | Component yes; #11 no | **Unknown** whether Vercel Analytics is enabled for the project | Vercel project setting | Consent control must be built and approved first (pilot readiness list) |

## Feature flags (code defaults; production values are unknown)
`NEXT_PUBLIC_BILLING_ENABLED`, `DIRECTORY_ENABLED`, `SHARING_ENABLED`, `SCRIM_UPLOADS_ENABLED`: all default off in code and `.env.example`. Vercel's settings are not visible from here, so the production values are **unknown**; the anonymous checks cannot show them (private profiles return the same 404 either way).

## Pull requests
| PR | What | State |
|---|---|---|
| #24 | Supabase project chosen by Vercel environment, `npm run test:env` | Merged |
| #22 | Copy fixes, emails, acknowledgement emails, Coming soon labels | Merged |
| #23 | Staging test plan | Merged |
| #26 | Waitlist grants (migration applied) | Merged |
| #27 | Production migrations plan (executed) | Merged |
| #28, #31 | Plain titles; descriptions describe only what is live; audit fails on the tagline, "coming soon", "planned" and unbuilt product names | Merged |
| #25 | Invite lookup server only (`000600` and `000610` applied) | Merged |
| #29 | This page and two proposals | Open |
| #30 | Proposals: join_team throttling, analytics consent, Women in Esports wording, flag readiness, Stripe note | Open |
| #11 | Analytics (consent aware), blocked | Held; needs the consent control first |

## Infrastructure
| Item | State |
|---|---|
| Supabase plan | Free (no backups). Pro recommended before more migrations and required before the first design partner |
| Staging project | Exists, all migrations applied (including the three unapplied on production) plus the `rls_auto_enable` revoke; 0 users |
| Preview deployments | Build with the staging `STAGING_` variables (the #24 Preview is green). A Preview URL has not been loaded or signed in to yet |
| Domains | victressesports.com (marketing) and victress.gg (app) both serve; `www` redirects |
