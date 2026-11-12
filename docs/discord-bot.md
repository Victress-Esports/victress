# Victress Scrim Intelligence: Discord bot

Status: **Phase 1** (HTTP interactions endpoint, `/help`, `/privacy`). Nothing is saved from commands. Account linking, `/scrim`
commands and Rocket League submission are **Planned**, not built. Do not describe them as available.

## Design
- Interactions over HTTP, hosted by the existing Next.js app on Vercel: `POST /api/discord/interactions` (reachable on victress.gg;
  API routes skip the site middleware). No Gateway worker and no privileged intents (Presence, Server Members and Message Content stay off).
- Every request is verified with the application's **public key** (Ed25519 over `timestamp + body`, five minute window). Unsigned or
  invalid requests get 401. `lib/discord/verify.ts`.
- Longer work answers with a deferred acknowledgement, then edits the original reply through the interaction's own webhook
  (`lib/discord/followup.ts`). That token comes with each interaction, lasts 15 minutes and is not the bot token.
- The bot reuses the Victress backend. It will not get Supabase credentials or a second database. Later phases call server routes in
  this app that use existing business logic.
- Logs hold event names, interaction type and command name only. No tokens, user ids, guild ids or message text.

## Credentials
| Variable | What it is | Secret | Used by |
|---|---|---|---|
| `DISCORD_APPLICATION_ID` | Application ID (1569918291319849150) | no | the app, the register script |
| `DISCORD_PUBLIC_KEY` | Public Key from General Information | no | the app (signature check) |
| `DISCORD_BOT_TOKEN` | Bot token | **yes** | only the register script, on your machine |
| `DISCORD_DEV_GUILD_ID` | private test server id | no | the register script |

The Public Key is **not** the bot token. The deployed app never needs the bot token.

## Setup (founder)
1. Vercel: add `DISCORD_APPLICATION_ID` and `DISCORD_PUBLIC_KEY` (Production, and Preview if previews should answer).
2. Deploy this branch (needs approval). Discord validates the endpoint when you save the URL, so it must be live first.
3. Developer Portal > General Information > Interactions Endpoint URL: `https://victress.gg/api/discord/interactions`. Save. Discord
   sends a signed PING; saving succeeds only if the endpoint answers it. (An HTTP bot shows as offline. That is expected.)
4. Create a private Discord server for testing. In Discord, turn on Developer Mode, right click the server, Copy Server ID.
5. Generate the bot token: Developer Portal > Bot > Reset Token. It is shown once. Put it in your shell for the next command only,
   without saving it to a file or your history:
   ```bash
   read -rs DISCORD_BOT_TOKEN && export DISCORD_BOT_TOKEN
   ```
6. Register the commands to the test server only:
   ```bash
   DISCORD_APPLICATION_ID=1569918291319849150 DISCORD_DEV_GUILD_ID=<server id> node scripts/discord-register.mjs
   ```
   Use `--dry-run` first to see what would be sent. `--global` is deliberate and not needed for testing.
7. Install the bot in the test server with the generated install link, after removing **Attach Files** and **Read Message History**.
   Slash command replies need no channel permissions at all in Phase 1.
8. Run `/help` and `/privacy` in the test server.

If the token is ever exposed (chat, commit, log, screenshot), Reset Token in the portal immediately.

## Tests
`npm run test:discord` (module checks, no network). For the route over HTTP, build and start the app with
`DISCORD_PUBLIC_KEY=$(node scripts/discord-test.mjs --print-key) DISCORD_APPLICATION_ID=111111111111111111`, then
`node scripts/discord-test.mjs 3200`. The test key is a throwaway, unrelated to the real application.

## Not built yet (Planned)
Account linking (`/link`, `/unlink`, `/profile`), `/scrim submit|status|stats`, the Rocket League replay pipeline, team and server
connection. Linking needs an additive migration and a proposal approved first (`docs/proposals/`). Rocket League parsing is not
validated (39 of 50 replays matched, 2026-11-08), so submission cannot be called working when it arrives.
