# Epic staging test (Preview of `claude/wizardly-ride-bafh0x`, staging Supabase)

Prepared 2026-11-15. Staging only: no production database, setting or deployment is touched.
Preview host (branch alias): `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app`

## Checked from here
- PR #54 head `039baab` (branch `claude/wizardly-ride-bafh0x`) has a successful Vercel Preview build (04:00:56 UTC, GitHub status "Vercel: Deployment has completed").
- The code accepts the registered Preview callback exactly and sends it to Epic unchanged: `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app/dashboard/link/epic/callback`. A trailing `/`, or `http://`, would leave Epic off; spaces are trimmed.
- Staging database: every pilot migration is applied, including `20261115000100`; tests pass on staging.
- Staging pilot allowlist: **empty**. The tester has **no staging account** yet.
- The ID match tool works: `scripts/epic-ballchasing-match.mjs` (compares SHA-256 fingerprints and prints no ids).

## Cannot be checked from here (no Vercel access; the Preview is behind Deployment Protection)
Please confirm in Vercel, Project, Settings, Environment Variables, **Preview** scope (branch `claude/wizardly-ride-bafh0x` where branch-specific):
| Variable | Needed value |
|---|---|
| `VICTRESS_EPIC_CLIENT_ID` | set |
| `VICTRESS_EPIC_CLIENT_SECRET` | set, Sensitive |
| `VICTRESS_EPIC_REDIRECT_URI` | exactly the Preview callback above |
| `VICTRESS_EPIC_SIGNIN_ENABLED` | **not set yet** (set `true` only when you approve the test) |
| `SCRIM_UPLOADS_ENABLED` | `true` (the Epic routes are pilot only) |
| `BALLCHASING_API_TOKEN` | set (needed to submit the replay) |
| `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `STAGING_SUPABASE_SERVICE_ROLE_KEY` | set (the service role key saves the verified identity) |
| `NEXT_PUBLIC_BILLING_ENABLED` | `false` or unset |
Also "Automatically expose System Environment Variables" must be on (the app tells Preview from Production with `VERCEL_ENV`).
**Supabase staging, Authentication, URL Configuration:** the redirect URLs must allow `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app/auth/callback` (the email link and Discord or Google return there). Otherwise the email link goes to the staging Site URL instead.
**Environment variables apply only to builds made after they are saved.** Variables added after 04:00 UTC need a new Preview build: a new commit on the branch, or Redeploy of the latest Preview deployment in Vercel (Preview only, never Production).

## Steps
1. **Create your staging account.** Open `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app/__site/app?to=/login` (the `/__site/app` hop switches the Preview to the application). Sign in with your email link. Complete the age and Terms and Privacy step (version 2026-11-15) and onboarding.
2. **Tell Claude.** Claude adds your staging profile to `design_partner_allowlist` (staging only) and confirms the row.
3. **Approve the flag.** In Vercel, Preview scope for the branch: `VICTRESS_EPIC_SIGNIN_ENABLED=true`. Redeploy the Preview.
4. **Verify with Epic.** On the Preview: Scrim Intelligence, Rocket League, **Verify with Epic Games**. Sign in at Epic with the Epic account you play Rocket League on (until brand review passes, it must be a member of your Epic organization). Expected: back on the Rocket League page with "Your Epic Games account is verified…", and the ID line reads "Epic Games, abc…xyz. Verified by signing in with Epic Games."
5. **Check what was stored** (Claude, staging, read only): one `game_accounts` row with `platform = 'epic'`, a 32 character lower case hex `external_id`, `verified_via = 'epic_oauth'`, `ownership_verified = true`; one `game_identity_linked` event; no other new data.
6. **The exact ID match.** Give Claude the link of an Unlisted or Public Ballchasing replay **you played on your Epic account**. Claude runs, without printing any id:
   ```sql
   select encode(extensions.digest(external_id, 'sha256'), 'hex') from public.game_accounts
   where verified_via = 'epic_oauth' and profile_id = '<your staging profile id>';
   ```
   ```bash
   NODE_USE_ENV_PROXY=1 node scripts/epic-ballchasing-match.mjs <replay link> <that fingerprint>
   ```
   **Pass:** "EXACT MATCH (platform epic, identical id): YES". **If NO:** stop; the Epic sign-in account ID and Ballchasing's id differ, and Epic verification must not be released as is.
7. **End to end in the app.** Submit the same replay on the Rocket League page (both confirmations). Expected: "Saved", with your own numbers. That proves the import matched your verified identity by platform and id.
8. **Negative checks.** Cancel at Epic once: "Epic sign in was cancelled. Nothing was changed." Open the start link, then the callback in another browser: refused. Typed IDs (Steam etc.) still work for another test account with the flag on.
9. **Afterwards.** Turn `VICTRESS_EPIC_SIGNIN_ENABLED` off again for Preview if you want, and record the result in the release report.
