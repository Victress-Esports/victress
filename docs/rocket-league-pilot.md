# Rocket League pilot: how it works and how to turn it on

Branch `claude/rl-pilot` is a **working integration branch** (main + #47 + #50 + #35 + #53 + the Ballchasing client + the new work). It is not a pull request and nothing on it is merged, deployed or applied. The new work is meant to be rebased onto `main` and opened as separate PRs once the PRs it depends on are merged (order in `docs/proposals/discord-pilot-reconciliation.md`).

## What a pilot player can do
1. Sign in to victress.gg, accept the Terms and Privacy Policy (#47).
2. **Rocket League page** (`/dashboard/scrims/rocket-league`): save their Rocket League identity (private, not verified) by pasting their Ballchasing player link, or by choosing a platform and entering an ID. Any platform works (Steam, Epic Games, PlayStation, Xbox, Switch); nothing depends on Steam. paste a Ballchasing replay link, tick two confirmations (allowed to submit, agrees to processing). Victress reads the replay from Ballchasing (a read, not an upload) and saves **only their own numbers**; everyone else becomes an anonymous slot with no name or ID. Private replays are refused with a plain explanation. Duplicates, rate limits, and every failure reason are visible under "Your submissions".
3. **Link Discord:** `/link` in the private test server gives a one time link (10 minutes). Opening it while signed in shows which Discord account asked, and links only after an explicit confirmation. Unlink with `/unlink` or on the Account page. Linking shares nothing.
4. In Discord: `/profile`, `/scrim submit link authorized consent`, `/scrim status`, `/scrim stats`. All replies are visible only to the player. Scrim commands need a linked account **and** the pilot roster.
5. Delete one game, or all Rocket League data, from the Rocket League page.

## What the founder has to do (nothing here has been done)
1. Approve and merge, in order: #53, #47, #50, #35, then the Rocket League and linking PRs (to be opened from this branch).
2. Apply migrations in order, each only with separate approval: `20261110000100`, `20261110000200`, `20261108000100`, `20261112000100` (linking, needs the consent tables), `20261112000200` (Rocket League, needs the game import tables). Staging steps: `docs/proposals/staging-reconciliation-plan.md`.
3. Vercel environment (names as used by the code): `BALLCHASING_API_TOKEN`, `VICTRESS_SCRIM_DISCORD_APPLICATION_ID`, `VICTRESS_SCRIM_DISCORD_PUBLIC_KEY` (the generic `DISCORD_APPLICATION_ID` and `DISCORD_PUBLIC_KEY` also work), and `SCRIM_UPLOADS_ENABLED=true` last (the pilot flag; it also turns on the existing practice file upload page, which stays limited to the same roster). `VICTRESS_SCRIM_DISCORD_BOT_TOKEN` is **not needed in Vercel**: only the local registration script reads it. `RIOT_API_KEY` stays as it is. **Leave `LOL_IMPORT_ENABLED` unset:** the League of Legends experience is hidden until you verify the Riot key and set it. `NEXT_PUBLIC_BILLING_ENABLED` stays false.
4. Pilot roster: add each player's `profile_id` to `design_partner_allowlist` (service role, Supabase dashboard). Nobody else sees the page or can use `/scrim`.
5. Discord: endpoint URL, private test server, token, register commands, install: `docs/discord-bot.md`. Re-run `node scripts/discord-register.mjs` to register the new commands (it replaces the full list).
6. Privacy and Terms: the Privacy text on this branch discloses the Rocket League ID, replay processing, link requests, retention and deletion (version 2026-11-12). It goes live only with the merge; players are asked to accept the new version.

Pilot group, player guide, validation plan and what each deletion does: `docs/rocket-league-pilot-guide.md`. Data model findings (history, side context, what teams still need): `docs/rocket-league-data-model.md`.

## Tests (all local, nothing real touched)
`npm run test:discord` (signature, commands registry, command logic) · `npm run test:rl` (parsing, privacy of the stored row, pipeline, limits; add `live` for one real read) · `npm run test:riot` · `node scripts/rl-fidelity.mjs` (live, 50 real public replays) · local Postgres: `supabase/tests/local/run-dashboard.sh` (70 checks for the two new migrations plus the existing ones) · browser: `scripts/consent-test.mjs`, `scripts/signed-in-test.mjs`, `scripts/account-test.mjs`, `scripts/pilot-pages-test.mjs` · `npm run seo:audit`.

## Migration order and dependencies (nothing applied yet)
| Order | Migration | Depends on | Notes |
|---|---|---|---|
| 1 | `20261108000100_game_api_imports` (#35) | core schema | shared match, account and job tables |
| 2 | `20261110000100_age_gate_legal_acceptance` (#47) | profiles | consent tables |
| 3 | `20261110000200_waitlist_service_role_delete` (#50) | waitlist | deletion support |
| 4 | `20261112000100_discord_account_link` | 2 (consent tables) | link tables and functions, including `discord_consent_current` |
| 5 | `20261112000200_rocket_league_link_import` | 1 (match tables) | additive and relaxing; platform stored as 2 to 16 lower case letters or digits, so a new platform needs no migration |
All additive: no drops of data, no truncates. Version numbers were checked against `main`, every open PR branch and this branch on 2026-11-13: no collisions (the Partner migrations were renumbered to `20261111…`). Apply in this order, each with its own approval and a rolled back dry run first; deploy the code after the migrations. Nothing here has been applied to staging or production.

## Staging dry run
`node scripts/staging-dry-run.mjs` builds one SQL script from the repo files: begin, both pilot migrations, both database check files, then an unconditional error and rollback. It cannot commit. Proven on a throwaway local database (74 checks pass, nothing left behind). Run it on victress-staging only, then read-only queries confirm staging is unchanged.

## Not verified yet
A real signed request from Discord; the migrations on staging (including a rolled back run there); a real Ballchasing read through the deployed app (the library path was verified live); the Vercel variable name for the Ballchasing token; the Riot key (unrelated to Rocket League).
