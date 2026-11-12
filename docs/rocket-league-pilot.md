# Rocket League pilot: how it works and how to turn it on

Branch `claude/rl-pilot` is a **working integration branch** (main + #47 + #50 + #35 + #53 + the Ballchasing client + the new work). It is not a pull request and nothing on it is merged, deployed or applied. The new work is meant to be rebased onto `main` and opened as separate PRs once the PRs it depends on are merged (order in `docs/proposals/discord-pilot-reconciliation.md`).

## What a pilot player can do
1. Sign in to victress.gg, accept the Terms and Privacy Policy (#47).
2. **Rocket League page** (`/dashboard/scrims/rocket-league`): save their platform and player ID (private, not verified), paste a Ballchasing replay link, tick two confirmations (allowed to submit, agrees to processing). Victress reads the replay from Ballchasing (a read, not an upload) and saves **only their own numbers**; everyone else becomes an anonymous slot with no name or ID. Private replays are refused with a plain explanation. Duplicates, rate limits, and every failure reason are visible under "Your submissions".
3. **Link Discord:** `/link` in the private test server gives a one time link (10 minutes). Opening it while signed in shows which Discord account asked, and links only after an explicit confirmation. Unlink with `/unlink` or on the Account page. Linking shares nothing.
4. In Discord: `/profile`, `/scrim submit link authorized consent`, `/scrim status`, `/scrim stats`. All replies are visible only to the player. Scrim commands need a linked account **and** the pilot roster.
5. Delete one game, or all Rocket League data, from the Rocket League page.

## What the founder has to do (nothing here has been done)
1. Approve and merge, in order: #53, #47, #50, #35, then the Rocket League and linking PRs (to be opened from this branch).
2. Apply migrations in order, each only with separate approval: `20261110000100`, `20261110000200`, `20261108000100`, `20261112000100` (linking, needs the consent tables), `20261112000200` (Rocket League, needs the game import tables). Staging steps: `docs/proposals/staging-reconciliation-plan.md`.
3. Vercel environment: `BALLCHASING_API_TOKEN` (the code reads exactly this name; if the existing variable has another name, tell me and I will follow it or you rename it), `SCRIM_UPLOADS_ENABLED=true` (the pilot flag; it also turns on the existing practice file upload page, which stays limited to the same roster), `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`. `NEXT_PUBLIC_BILLING_ENABLED` stays false.
4. Pilot roster: add each player's `profile_id` to `design_partner_allowlist` (service role, Supabase dashboard). Nobody else sees the page or can use `/scrim`.
5. Discord: endpoint URL, private test server, token, register commands, install: `docs/discord-bot.md`. Re-run `node scripts/discord-register.mjs` to register the new commands (it replaces the full list).
6. Privacy and Terms: the Privacy text on this branch discloses the Rocket League ID, replay processing, link requests, retention and deletion (version 2026-11-12). It goes live only with the merge; players are asked to accept the new version.

## Tests (all local, nothing real touched)
`npm run test:discord` (signature, commands registry, command logic) · `npm run test:rl` (parsing, privacy of the stored row, pipeline, limits; add `live` for one real read) · `npm run test:riot` · local Postgres: `supabase/tests/local/run-dashboard.sh` (70 checks for the two new migrations plus the existing ones) · browser: `scripts/consent-test.mjs`, `scripts/signed-in-test.mjs`, `scripts/account-test.mjs`, `scripts/pilot-pages-test.mjs` · `npm run seo:audit`.

## Not verified yet
A real signed request from Discord; the migrations on staging (including a rolled back run there); a real Ballchasing read through the deployed app (the library path was verified live); the Vercel variable name for the Ballchasing token; the Riot key (unrelated to Rocket League).
