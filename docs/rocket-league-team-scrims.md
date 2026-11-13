# Rocket League team scrims, sharing consent and product events

Branch `claude/eager-carson-2b79tb` (the `claude/rl-pilot` work plus this change). **Nothing is merged, deployed or applied** to staging or production. Migration `20261113000100_team_scrims_and_events.sql` is tested only on a throwaway local Postgres.

## What it does
- **Team scrims page** on victress.gg, `/dashboard/team/scrims` (linked from the Team page). Mobile first, existing components, no charts. For each scrim: date, opponent label, side, W/L, score, overtime, match type and size, the side's totals (goals, assists, saves, shots, score), the opponent side's totals, and individual lines only for teammates who opted in.
- **Adding a scrim to a team is a choice, off by default.** Website: a checkbox under the replay form (shown only to players on a team). Discord: `/scrim submit … team:True`. Without it, a submission stays private exactly as before.
- **Sharing my numbers with my team** is a per player opt in on the Team scrims page (off by default). Lines are stored only for players who had it on when the scrim was submitted.
- **Events** (`public.events`): `registration_completed`, `discord_linked`, `game_identity_linked`, `team_created`, `team_joined`, `first_scrim_submitted`, `scrim_processing_completed`, `repeat_scrim_submitted`, with `source`, `referral` (from `victress.gg/login?ref=<code>`) and `game` where known. Nothing else is accepted.

## Permission and transparency, as implemented
The "Permission and transparency" section of `claude/rl-mvp-weekend.md` was not available to me (the file is in no branch and the paste did not arrive). This is what is built from the four rules stated in the request. Compare it with that section before approving.

| Rule | How it is enforced |
|---|---|
| No Message Content intent | HTTP interactions only (`app/api/discord/interactions/route.ts`). No Gateway connection, so no intents of any kind; slash commands only. Keep Presence, Server Members and Message Content off in the Developer Portal. |
| Ephemeral replies by default | Every reply path sets `flags: 64` and `allowed_mentions: { parse: [] }`, including the deferred acknowledgement. Tested (`scripts/discord-commands-test.mjs`). There is no public reply path. |
| Consent checks in the database and RLS | `team_scrim_lines_guard` trigger refuses a line for anyone who is not a current roster member with the opt in, for every writer including the table owner. `record_team_scrim()` checks again and derives the team from the submitter's current membership. RLS: only current members read a team's scrims; a teammate's line is visible only while they are on the roster and opted in. Turning sharing off, leaving or being removed deletes the lines (triggers). Clients cannot write any of these tables. |
| Opponent names and IDs stripped before storing | The replay is reduced in `lib/ballchasing/team.ts` to five summed numbers per side. The database refuses any other key in totals and lines (`rl_numbers_ok`), so a name, platform or ID cannot be stored even by mistake. Ballchasing team names are not copied. The only opponent text is an optional label the submitter types. |

Additional protections:
- **Subtraction guard:** teammates' lines are withheld from a scrim when exactly one player on the side would be left hidden, because side totals minus visible lines would reveal that player's numbers. Enforced in RLS (`team_scrim_line_visible`).
- **1v1 replays** are never team scrims: the side total would be one person's numbers.
- **Non roster:** a player on no team cannot create a team scrim (database returns `no_team`, the player is told) and reads nothing.
- **Second team, same replay:** a separate row for that team, from its own side. Neither team sees the other's row or lines.
- **Events:** server only table (no client access); no replay numbers, replay or match ids, platform ids, names, IP, device or page data; deleted with the account; included in the account data export; 12 month purge function (`purge_events`), not scheduled yet.

## Tests run (local only)
- SQL on a throwaway Postgres: full suite 331 PASS, 0 FAIL (33 new in `supabase/tests/team_scrims.sql`). The non PASS lines in older files are pre existing and identical without this migration.
- Staging dry run generator (`scripts/staging-dry-run.mjs`) now includes this migration: 111 checks pass locally, nothing committed.
- `scripts/team-scrims-test.mjs` 27 (payload and pipeline), `scripts/team-scrims-page-test.mjs` 20 (browser, 390px wide), `scripts/discord-commands-test.mjs` (+5), `rl-link-test`, `pilot-pages-test` 30 (one stale selector from the previous commit fixed), `signed-in-test` 55, `account-test`, `consent-test` 25, `age-test` 9, typecheck, lint, build, SEO audit 1653/0.

## Staging test checklist (your own Ballchasing replays)

### 0. Before you start (each needs your go-ahead; I have done none of it)
1. **Staging database:** run the dry run first: `node scripts/staging-dry-run.mjs > dry-run.sql`, run it on victress-staging only; it must end with `DRY RUN COMPLETE. NOTHING COMMITTED.` and every line PASS. Then apply, in order, whatever staging lacks of `20261108000100`, `20261110000100`, `20261110000200`, `20261112000100`, `20261112000200`, then `20261113000100` (order and current staging state: `docs/proposals/staging-reconciliation-plan.md`).
2. **Preview deployment** of this branch with Preview variables: the `STAGING_` Supabase trio, `BALLCHASING_API_TOKEN`, `VICTRESS_SCRIM_DISCORD_APPLICATION_ID`, `VICTRESS_SCRIM_DISCORD_PUBLIC_KEY`, `SCRIM_UPLOADS_ENABLED=true`. `NEXT_PUBLIC_BILLING_ENABLED` stays false.
3. **Discord can reach the Preview:** Previews are behind Vercel Deployment Protection, which blocks Discord's signed requests. Use a separate Discord test application, and either a Vercel "Protection Bypass for Automation" token in its Interactions Endpoint URL (`https://<preview>/api/discord/interactions?x-vercel-protection-bypass=<token>`) or a staging domain without protection. Your decision.
4. **Register commands** for that test application: `node scripts/discord-register.mjs` (adds the `team` and `opponent` options). In the Developer Portal, Bot, confirm all three Privileged Gateway Intents are off.
5. **Accounts on the Preview** (staging only). Discord is needed only for step 1; every other step can use the website form, which runs the same pipeline.
   - **P1** you: on Team A (owner), linked to your Discord, Rocket League ID = your Ballchasing player link.
   - **P2** teammate: joins Team A with the invite link. Needs no Rocket League ID.
   - **O1**: creates Team B. Its Rocket League ID must appear in the replay. Your own ID is fine (two accounts may claim one ID; each gets separate private rows). Use another real person's ID only with their permission.
   - **N1**: on no team. Rocket League ID that appears in the replay (again, your own is fine).
   - Add P1, O1 and N1 to `design_partner_allowlist` (Supabase dashboard, staging). Leave P2 off it on purpose.
   - Create P1 by opening `/login?ref=staging-test` first, to check the referral code.
6. Pick a **3v3** replay you played in, set to Unlisted or Public on Ballchasing. Note its link.

### 1. Submit via Discord
1. As P1 on the website: Team scrims, **Share my numbers with my team** (on).
2. In the Discord test server: `/scrim submit link:<replay> authorized:True consent:True team:True opponent:Staging test`.
3. Expect: "Only you can see this" under the reply; "Saved." plus "Added to your team's scrims"; nobody is mentioned.
4. Website as P1, Team scrims: one card with the date, `vs Staging test`, your side, W or L, the score matching Ballchasing, a Team row, your line (You), an Opponent row. No opponent player names anywhere.
5. Compare the Team and Opponent totals with the Ballchasing scoreboard (sum of each side).

### 2. Duplicate submit
1. Run the same command again. Then again with the link in another form (with `www.` or a trailing `/`).
2. Expect each time: "You already submitted this replay. Nothing new was saved." and "Your team already has this scrim". Still one card. `/scrim status` lists the submissions as saved.
3. Run it once with `team` left out: private only, no team message.

### 3. Second team submits the same replay
1. As O1 on the website, Rocket League page: paste the same link, tick both confirmations and **Also add this scrim to Team B's scrims**.
2. Expect "Added to your team's scrims". O1's Team scrims page: one card from O1's side, with no P1 line.
3. P1's page is unchanged (one card, Team A only).

### 4. Non roster user blocked
1. As N1 on the website, open the Rocket League page: the team box is not offered to a player on no team. If you have a second Discord account, link it to N1 and run `/scrim submit … team:True` to test the server side refusal.
2. Expect "You are not on a team roster, so nothing was added to a team." Their own numbers are saved privately.
3. N1 opens `/dashboard/team/scrims`: "Join or create a team first". Nothing from Team A or B.
4. Optional, needs more Discord accounts: P2 (not on the allowlist) runs `/scrim submit`: "approved pilot players only", nothing saved. A Discord account that is not linked: "Link your Victress account first".

### 5. Teammate sees the result without submitting
1. As P2 on a phone: Team, then **Team scrims**.
2. Expect the card from step 1 with P1's line ("1 of 3 players share individual numbers"). No line for P2 and none for the third player. No horizontal scrolling.
3. P1 turns sharing **off**. P2 reloads: P1's line is gone and "No individual numbers shown". P1 turns it back on: the old scrim stays without the line (lines are captured at submission).
4. As P1, Team, remove P2. P2 reloads Team scrims: "Join or create a team first".

### 6. Events (read only, staging SQL)
```sql
select name, props, created_at from public.events order by id desc limit 40;
select count(*) from public.events where props::text ~ '[0-9a-f]{8}-[0-9a-f]{4}' or props ?| array['goals','replay_id','platform','id'];
```
Expect the eight names to appear for the accounts above (`registration_completed` only for accounts created after the migration, with `referral: staging-test` for P1), `repeat_scrim_submitted` for P1's duplicates, and the second query returning 0. P1's account export (Account, Download my data) includes `team_scrims` and `product_events`.

### 7. Clean up
Remove the test scrims (Remove from team), delete Rocket League data, delete the test accounts (each cascades its lines, sharing choice and events).
