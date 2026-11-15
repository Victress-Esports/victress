# Rocket League Discord and claim loop: staging setup and test

Branch `claude/wizardly-ride-bafh0x` (PR #54), Preview host `https://victress-git-claude-wizardl-6d3298-matt-hills-projects-54d303a1.vercel.app`, staging Supabase.
Staging only: no production setting, migration or deployment.

## The loop
`/scrim submit link:<replay> authorized:True consent:True team:True` in Discord. Victress reads the replay from Ballchasing and stores your own row once. It adds the team scrim (opponents as totals only) and makes a **snapshot** for each other player on **your side** who has a platform ID: their five numbers under a coded key, never their ID or name. The private reply is the **result card**: W/L and score, team totals, "N snapshots ready. Claim yours: <link>". No individual numbers.
A teammate opens `/claim`, signs up (age, Terms and Privacy), verifies Steam or Epic, and sees their snapshot only if the coded key of their **verified** platform ID matches exactly.

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
5. Installation (or OAuth2, URL Generator): scope **`applications.commands` only**. No `bot` scope and no permissions are needed: every reply is private and is sent through the interaction itself. Open the link and add the app to your **private test server**.
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

## Test script (run in order; tell Claude after each step marked Claude)
**Accounts:** A = you. B = a second staging account for the teammate whose snapshot will be claimed. Use your own second Steam or Epic account if one of them appears on your side of the replay; otherwise a real teammate who agrees.
**Replay:** a 2v2 or 3v3 Ballchasing replay set to Unlisted or Public, where you and that teammate are on the same side.
1. A: on the Preview, finish the consent page (staging account already allowlisted). Rocket League page: **Verify with Epic Games** (or Steam). Claude checks the stored ID against the replay with `scripts/epic-ballchasing-match.mjs` (it must say EXACT MATCH: YES; if NO, stop, and Claude shows both fingerprints).
2. A: Team page, create a team. Team scrims page: optional "Share my numbers".
3. Discord (test server): `/link` and open the link while signed in as A. Then `/privacy` and `/help`.
4. Discord: `/scrim submit link:<replay> authorized:True consent:True team:True opponent:Test`. Expect the private result card: "Added to your team's scrims.", "Win X to Y" (or Loss), "Team totals: …", "1 snapshot ready. Claim yours: <link>". No individual numbers. **Claude**: checks staging: one `game_matches` row, one `team_scrims` row, one `rl_snapshots` row per teammate with an ID (coded key only), events.
5. The same command again: "You already submitted this replay…", nothing new (Claude checks counts).
6. `/scrim stats`: your own summary only.
7. B: open the claim link from the card, sign up, age and Terms and Privacy. **Claude** adds B to the staging pilot allowlist. B: **Verify with Steam** or **Verify with Epic Games** with the teammate's account. Expect "1 new snapshot found" and that game with B's own five numbers only.
8. Negative: a third account that verifies a different Steam or Epic account sees no snapshot. Typing B's ID without verifying claims nothing.
9. Team scrims page as A: the scrim, team and opponent totals; no opponent names.
10. Clean up: B deletes the snapshot on `/claim`; A runs `/unlink` in Discord; A, Rocket League page, Delete all Rocket League data; A, Account, Delete my account. **Claude** confirms on staging that the rows are gone (cascade) and the unclaimed snapshots go with the scrim.
