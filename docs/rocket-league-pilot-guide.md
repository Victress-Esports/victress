# Rocket League pilot: player guide and operator checklist

Nothing here is live. It describes the pilot once the PRs are merged, the migrations are applied (each separately approved) and the roster is set. The allowlist stays on for the whole pilot.

## Pilot size and shape
A small first group: 6 to 12 players, including at least one full team and at least two players who are on no team (both paths must work). Everyone is added to `design_partner_allowlist` by hand. Nobody else sees the Rocket League page or can use `/scrim`.

## Message to pilot players (draft, edit before sending)
> You are invited to test Victress Scrim Intelligence for Rocket League. Here is what happens and what does not.
> 1. Sign in at victress.gg and accept the Terms and Privacy Policy.
> 2. Open Scrims, then Rocket League. Save your platform and player ID (only you can see it).
> 3. After a scrim, upload the replay to Ballchasing and set it to **unlisted** or public. Paste the link on the Rocket League page, or use `/scrim submit` in our private test server after linking with `/link`.
> 4. Victress reads that replay and saves **your own numbers** from it. Other players in the replay are not named or identified, and nobody can see your numbers but you.
> 5. You can unlink Discord, delete one game, or delete all your Rocket League data whenever you like.
> This is a test. Numbers are read from Ballchasing and have not been validated against the game yet. Please tell us when anything looks wrong.

## Operator checklist (before the first player)
1. PRs merged in the agreed order, migrations applied in order with your approval (`docs/rocket-league-pilot.md`).
2. Vercel: `BALLCHASING_API_TOKEN`, `SCRIM_UPLOADS_ENABLED=true`, `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`. Billing stays off.
3. Discord: endpoint URL saved, private test server, commands registered (`node scripts/discord-register.mjs`), bot installed without Attach Files or Read Message History.
4. Add each pilot player. Template (service role, one player at a time, after they have signed in once):
   ```sql
   insert into public.design_partner_allowlist (profile_id, note)
   select id, 'Rocket League pilot' from public.profiles where handle = '<their handle>';
   ```
   To remove someone: `delete from public.design_partner_allowlist where profile_id = '<id>';`. They keep the ability to delete their own data.
5. Smoke test with your own account: link, submit one replay from the website and one from Discord, unlink, delete.

## Validation during the pilot (this is what makes it more than "a successful read")
A successful replay read is not a validated ingestion workflow. For the first 30 pilot submissions, record in a sheet: replay link, the in-game scoreboard (goals, assists, saves, shots, score) as the player saw it, what Victress saved, match or mismatch. Targets from the Scrim Intelligence proposal apply: exact integer counts must match on every file counted as passing, failures are listed, the pass rate is published with the sample size. Until that is done the pages say numbers are read from Ballchasing and the data label stays "Player-submitted Ballchasing replay". Nothing is marketed.
Already measured (not a substitute): `scripts/rl-fidelity.mjs` reproduced what Ballchasing returned on 50 of 50 public replays (our normalization is faithful); it does not check Ballchasing against the game.

## Withdrawal and deletion (what each action does)
| Action | Discord | Victress | Stored match data |
|---|---|---|---|
| `/unlink` or Account page "Unlink Discord" | Commands stop working for that Discord account | Account, privacy settings and consents unchanged | Saved games stay (deleting data is a separate action) |
| "Delete this game" | `/scrim stats` no longer counts it | Gone from the page | That row deleted |
| "Delete all my Rocket League data" | Stats empty, `/profile` shows no ID | Saved ID, games and submission history (including the confirmation records) deleted | All deleted |
| Delete account | Link removed with the account | Everything deleted | Everything deleted (cascade) |
| Terms/Privacy changed | Data commands ask the player to accept on victress.gg first; `/unlink` still works | Same gate as every page | Unchanged |
| Removed from the pilot roster | `/scrim` refused | Page returns 404 | Kept until the player deletes it |

## Known limits to tell players
Private (not unlisted/public) Ballchasing replays cannot be read. Only Rocket League. Direct replay file upload is not part of the pilot. Team views across teammates are not built (see `docs/rocket-league-data-model.md`).
