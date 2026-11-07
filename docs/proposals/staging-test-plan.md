# Staging test plan (Supabase project `victress-staging`)

Created 2026-11-07. Status: **draft, nothing here has been run on a Preview URL yet.** Production is not touched by any step. This plan closes the "separate Supabase project for Preview deployments" item in [pilot-readiness-checklist.md](pilot-readiness-checklist.md).

## 0. What staging is
- Supabase project `victress-staging`, ref `cmvifuayvqhbfkeskoqi`, region ca-central-1, same organization as production (`pmamceqshyfptvjgimsf`). Created empty: 0 tables in `public`, 0 auth users, 0 migrations, no buckets.
- Schema target: the production schema (nine applied migrations, including the `rls_auto_enable()` revoke) plus `20261107000300_dashboard_foundation.sql`, `20261107000310_upload_allowlist.sql` and `20261107000400_scrim_matches.sql`. Those three exist only on staging until the founder approves them for production and Supabase is on Pro.
- Migration versions on staging are stamped with the apply time, like production. They will not match the repository file numbers.
- Real people must not use staging. Test with your own accounts only. Staging has the same Free plan limits as production (no backups).

## 1. Order of work
1. Apply the migrations to staging (SQL editor), in repository order. Verify read only after each.
2. Create the Preview variables in Vercel (section 2). Scope them to **Preview only**.
3. Add the redirect URLs and provider callbacks (section 3).
4. Redeploy a Preview of a pull request branch. Run the checklist in section 5.
5. Only after the checklist passes: decide separately about production.

## 2. Vercel Preview variables (names only, no values)
Set each in Vercel, project Settings, Environment Variables, environment **Preview** only. Production keeps its own values.

| Name | Preview value comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | staging project API URL | Must be the staging URL, never the production URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging publishable (anon) key | Public by design |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service role key | Server only. Mark Sensitive. Never the production key |
| `NEXT_PUBLIC_VERCEL_ENV` | Vercel system variable | Needs "Automatically expose System Environment Variables" turned on; see section 4 |
| `NEXT_PUBLIC_VERCEL_URL` | Vercel system variable | Same setting |
| `NEXT_PUBLIC_BILLING_ENABLED` | `false` | Stays false |
| `DIRECTORY_ENABLED` | `true` only while testing privacy controls | Default false |
| `SHARING_ENABLED` | `true` only while testing share links | Default false |
| `SCRIM_UPLOADS_ENABLED` | `true` only while testing the allowlisted upload | Default false |
| `RESEND_API_KEY` | leave **unset** on Preview | Contact and waitlist then cannot send or write real mail |
| `RESEND_FROM_EMAIL` | leave unset on Preview | |
| `LEADERBOARD_INCLUDE_DEMO` | optional, `false` | |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MARKETING_URL` | leave unset on Preview | Preview overrides them (section 4) |

Do not copy the Production values for Supabase into Preview. Verify afterwards that a Preview deployment reads staging: sign in on the Preview and confirm the new user appears in the staging Auth users list and not in production.

## 3. Redirect URLs
Staging project, Authentication, URL Configuration:
- **Site URL:** the stable Preview URL you test on (a Vercel branch URL such as `https://<project>-git-<branch>-<team>.vercel.app`).
- **Redirect URLs:** `https://*-<team>.vercel.app/auth/callback` (wildcard for Preview deployments), plus `http://localhost:3000/auth/callback` for local work.

Providers (staging project, Authentication, Providers). Supabase gives each provider one callback URL: `https://cmvifuayvqhbfkeskoqi.supabase.co/auth/v1/callback`.
- **Discord:** Developer Portal, application, OAuth2, Redirects: add the staging callback above. Use a **separate Discord application** for staging if you want production's client secret kept apart.
- **Google:** Google Cloud Console, OAuth client, Authorized redirect URIs: add the staging callback above. Same advice: a separate OAuth client for staging.
- Enter the client id and secret for each in the staging project only. Email sign in needs the Site URL and the redirect list above.

The app itself sends the user back to `${location.origin}/auth/callback` (`components/app/LoginForm.tsx`), so the return trip lands on whichever Preview host started the sign in.

## 4. Sign in on a Preview URL when `NEXT_PUBLIC_APP_URL` points to production
`lib/urls.ts` handles this, but only when the Vercel system variables are available:
- `IS_PREVIEW` is true only when `NEXT_PUBLIC_VERCEL_ENV` is `preview` **and** `NEXT_PUBLIC_VERCEL_URL` is set. Then `APP_URL` and `MARKETING_URL` are the Preview origin, and the value of `NEXT_PUBLIC_APP_URL` is ignored. Links hop between the two sites through `/__site/app` and `/__site/marketing`, which set a cookie.
- If those two variables are missing, `IS_PREVIEW` is false and every marketing button links to `https://victress.gg` (production). Someone clicking "Get started" on a Preview would then leave the Preview and sign in against production. **That is the failure to check first**: on a Preview, hover Get started and confirm it goes through `/__site/app`, not to `victress.gg`.
- The OAuth return does not use `NEXT_PUBLIC_APP_URL`: it uses the browser origin. If the Redirect URLs allowlist does not contain the Preview host, Supabase falls back to the Site URL, so a wrong Site URL sends the user to the wrong host. Keep the Site URL on the Preview you are testing.
- `/auth/callback` redirects within `url.origin`, so after sign in the user stays on the Preview.
- Preview responses carry `X-Robots-Tag: noindex, nofollow` (`middleware.ts`).
- Cookies are per host. The marketing and app sides share one Preview host through the `v_site` cookie, so this works only in one browser profile with cookies enabled.

## 5. First end to end test checklist (staging only, Preview URL)
Preparation: staging has 0 users. Use your own test accounts. Keep `DIRECTORY_ENABLED`, `SHARING_ENABLED` and `SCRIM_UPLOADS_ENABLED` off for 1 to 6, then switch them on for 7 and 8.
- [ ] 1. **Get started goes through the hop.** On the Preview, the nav button leads to the sign in page via `/__site/app`, and the address bar stays on the Preview host.
- [ ] 2. **Sign in.** Discord, Google and email each return to the Preview `/auth/callback` and land signed in. A user row appears in staging Auth, none in production.
- [ ] 3. **Placeholder profile.** The new profile has a random `p` + 12 characters handle, no real name and no photo copied from the provider.
- [ ] 4. **Onboarding.** Claim a name (taken, reserved and invalid names are refused with a clear message), add a game, role and rank.
- [ ] 5. **Profile and Player Resume.** Dashboard shows the account and the stats you enter. Resume sections (tournaments, highlights) save and reload (needs 000300). Player Resume is labeled In development; nothing says Available now.
- [ ] 6. **Self-reported stats.** Add a stat entry. It is labeled Self-reported. Edit and delete work. A 13th metric key or a text value is refused.
- [ ] 7. **Team and invite.** Create a team, copy the 26 character invite link, open it in a second browser profile signed in as a second test account, join, see both on the roster. Regenerate the code and confirm the old link no longer works. A full roster (10) refuses an 11th.
- [ ] 8. **Scrim match log** (000400). Add a match with a result, edit it, delete it. Rows are visible only to the owner.
- [ ] 9. **Allowlisted upload** (000310, flag on). A signed in user not on `design_partner_allowlist` cannot upload (policy denies the Storage insert). Add the test profile to the allowlist with the service role from the SQL editor, then upload a small file in the `scrim-uploads` bucket under your own folder. Uploading to another user's folder is refused. Deleting your own file works.
- [ ] 10. **Privacy controls.** Default is private: the handle URL shows nothing to a signed out visitor. Turn on the directory with one field, confirm only that field appears. Create a share link, open it signed out, revoke it, confirm it stops. Leaving the directory removes search indexing. The anonymous API returns no rows for `profiles`, `stat_entries`, `player_games` and `teams`.
- [ ] 11. **Sign out**, and sign in again with the other provider using the same email; note whether accounts merge (record, do not assume).
- [ ] 12. **No cross over.** Confirm production still has 0 auth users and 0 profiles after the whole test.

## 6. Which marketing forms write to Supabase
Checked in the code on 2026-11-07:

| Form | Route | Writes to Supabase? |
|---|---|---|
| Waitlist (Coming soon buttons) | `POST /api/waitlist` | **Yes.** Inserts `email` and `interest` into `public.waitlist` through the service role (`lib/supabase-admin.ts`). RLS is on with no policy for anon or authenticated, so only the server can write it |
| Contact (general contact, design partner application) | `POST /api/contact` | **No.** Validates, then sends an email through Resend (`lib/email.ts`). Nothing is stored in the database |
| Handle availability check | `POST /api/handle-check` | Reads only (calls `handle_available` through the service role) |

What happens with a paused project: a paused or unreachable Supabase project makes **waitlist** fail with its error response (`Couldn't save. Try again.` on a failed insert, `Unavailable.` when the service client cannot be built). The **contact and design partner forms keep working**, because they only need Resend. Sign in and the product pages would also fail. The Free plan pauses a project after about a week of inactivity, which is another reason to upgrade before the pilot. Staging can be paused without affecting the marketing contact forms; production must not be.

## 7. Verification of the staging schema
Read only checks, to run after the migrations are applied (counts to be filled in when verified):
- Tables in `public`, RLS enabled on every one, and the policy list per table.
- The `scrim-uploads` bucket exists, is private, and has the 200 MB limit. Storage policies on `storage.objects` for it: read own, delete own, and the insert policy that requires `upload_allowed()`. `design_partner_allowlist` readable only by `service_role`.
- Anonymous API: `GET /rest/v1/profiles`, `/stat_entries`, `/player_games`, `/teams` return an empty list or 401, never rows; `rpc/directory_profile`, `rpc/shared_profile` and `rpc/board_entries` return permission denied; `rpc/team_invite_info` with a bad code returns null; `rpc/rls_auto_enable` is denied.
- Schema comparison with production (function list, policy list, grants), expected difference: only the three dashboard migrations.
- Advisors: security advisor run on staging, results recorded.

## 8. Not covered here
Billing, Stripe, analytics and the production Supabase upgrade. Applying anything to production still needs the founder's explicit approval and Supabase Pro.
