# Rocket League Discord and claim loop: staging setup and test

Branch `claude/wizardly-ride-bafh0x` (PR #54), Preview host `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app`, staging Supabase.
Staging only: no production setting, migration or deployment.
**Use only this branch address.** On a Preview every link Victress makes (the Discord `/link` link, the **Claim your stats** button, sign in returns, and the Steam and Epic callbacks) uses this branch address, never the per-deployment `…vercel.app` address of a single build, so you stay signed in on one host. Vercel's "Automatically expose System Environment Variables" must be on for this.

## The loop (docs/rl-mvp-weekend.md)
`/scrim submit link:<replay> authorized:True consent:True team:True [side:Blue|Orange]` in Discord. Victress reads the replay from Ballchasing, stores your own row once, adds the team scrim (one session per team per day, opponents as totals only), and makes a **player snapshot** for **every player on your side, you included**, who has a platform ID: five numbers and MVP under a coded key, never the ID or name.
You get a private reply. The channel gets the **result card**: score, W/L, team totals, "N player snapshots ready. Claim yours" and a **Claim your stats** button to `/claim`. No individual numbers.
On `/claim` a player signs up (age, Terms and Privacy), verifies Steam or Epic, and sees their own snapshot only if the coded key of the **verified** platform ID matches exactly.

## Vercel, Preview, branch `claude/wizardly-ride-bafh0x` (you enter the values; secrets never in the repo or chat)
| Variable | Value |
|---|---|
| `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `STAGING_SUPABASE_SERVICE_ROLE_KEY` | staging project values |
| `SCRIM_UPLOADS_ENABLED` | `true` |
| `BALLCHASING_API_TOKEN` | your Ballchasing token (secret) |
| `VICTRESS_CLAIM_KEY` | **new secret**: run `openssl rand -hex 32` locally and paste the output into Vercel only |
| `VICTRESS_STEAM_SIGNIN_ENABLED` | `true` |
| `VICTRESS_STEAM_RETURN_URL` | `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app/dashboard/link/steam/callback` |
| `VICTRESS_EPIC_CLIENT_ID`, `VICTRESS_EPIC_CLIENT_SECRET` | already set by you |
| `VICTRESS_EPIC_REDIRECT_URI` | `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app/dashboard/link/epic/callback` |
| `VICTRESS_EPIC_SIGNIN_ENABLED` | `true` when you start the test |
| `VICTRESS_SCRIM_DISCORD_APPLICATION_ID`, `VICTRESS_SCRIM_DISCORD_PUBLIC_KEY` | from the **staging** Discord application (below) |
| `NEXT_PUBLIC_BILLING_ENABLED` | `false` |
Steam needs no developer portal entry or key: its OpenID accepts any realm. After saving, **Redeploy the Preview** (variables reach only new builds).
Supabase staging, Authentication, URL Configuration: allow `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app/auth/callback`.

## Discord Developer Portal (a separate staging application; leave the production one alone)
1. New Application, for example "Victress Scrim (staging)". General Information: copy the **Application ID** and **Public Key** into the two Vercel variables above.
2. Vercel, Project Settings, Deployment Protection, **Protection Bypass for Automation**: create the secret. (Previews are behind Vercel login, which Discord cannot pass.)
3. Redeploy the Preview, then General Information, **Interactions Endpoint URL**:
   `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app/api/discord/interactions?x-vercel-protection-bypass=<that secret>` and Save. Discord sends a signed PING; it saves only if the endpoint answers.
4. Bot tab: **Presence, Server Members and Message Content intents all off.** The bot uses HTTP interactions only, with no Gateway connection.
5. Installation (or OAuth2, URL Generator): scope **`applications.commands` only**. No `bot` scope and no permissions are needed: replies are private, and the result card is posted in the channel as a follow-up to the interaction itself, so the bot needs no channel permissions. Open the link and add the app to your **private test server**.
6. Discord, Developer Mode on, right-click the test server, Copy Server ID.
7. Bot tab, Reset Token (shown once). In your own terminal only:
   ```bash
   read -rs VICTRESS_SCRIM_DISCORD_BOT_TOKEN && export VICTRESS_SCRIM_DISCORD_BOT_TOKEN
   ```
   ```bash
   VICTRESS_SCRIM_DISCORD_APPLICATION_ID=<staging app id> DISCORD_DEV_GUILD_ID=<server id> node scripts/discord-register.mjs --dry-run
   ```
   ```bash
   VICTRESS_SCRIM_DISCORD_APPLICATION_ID=<staging app id> DISCORD_DEV_GUILD_ID=<server id> node scripts/discord-register.mjs
   ```
   This registers the commands to that server only: `/help`, `/privacy`, `/link`, `/unlink`, `/profile`, `/scrim submit|status|stats`. The bot token is never needed by Vercel.

## Test script (your real account only; tell Claude at the steps marked Claude)
**Replay:** an Unlisted or Public Ballchasing replay (2v2 or 3v3) that you played on the Steam or Epic account you will verify, on your team's side.
1. On the Preview, open `/__site/app?to=/login` and sign up with your real email. Complete the age gate and Terms and Privacy.
2. **Claude**: tell Claude "signed up". Claude finds your new staging account by its sign up time and email and adds it to the staging pilot allowlist (staging only), then confirms.
3. Rocket League page: **Verify with Steam** (or **Verify with Epic Games**). **Claude**: compares your verified ID with the replay by SHA-256 fingerprints only (for Epic `scripts/epic-ballchasing-match.mjs`; for Steam the same comparison on the replay's `steam` slots). It must be an exact match on your side. If not, stop: Claude shows both fingerprints.
4. Team page: create a team. (Team scrims page: "Share my numbers" is optional and separate.)
5. Discord test server: `/help`, `/privacy`, then `/link` and open the link while signed in.
6. `/scrim submit link:<replay> authorized:True consent:True team:True opponent:Test side:<your side>`. Expect the private reply, then in the channel the result card with **Claim your stats**: "Win X to Y" or "Loss", "Team totals: …", "N player snapshots ready. Claim yours." No individual numbers. **Claude**: checks staging: one `game_matches` row, one `team_scrims` row with a session, one `rl_snapshots` row per player on your side with an ID (coded keys only), events.
7. The same command again: "You already submitted this replay…". No second card, nothing new (Claude checks counts).
8. Same replay with the wrong `side`: nothing saved.
9. `/scrim stats`: your own summary only.
10. Press **Claim your stats** in the channel. On `/claim` (already verified) you see **your own** snapshot: goals, saves, shots, shooting %, score, MVP. **Claude**: checks `claim_button_clicked` and `profile_claimed` events.
11. Team scrims page: the scrim, team and opponent totals; no opponent names.
12. Clean up: delete the snapshot on `/claim`; `/unlink` in Discord; Rocket League page, Delete all Rocket League data; Account, Delete my account. **Claude** confirms on staging that the rows are gone.
Teammates on your side get snapshots too; they can claim later the same way once Claude adds them to the allowlist.
