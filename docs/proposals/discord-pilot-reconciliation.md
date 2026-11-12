# Discord and Rocket League pilot: reconciliation of migrations, PRs and decisions

**Status: PROPOSAL. Nothing here is implemented or applied.** Written 2026-11-12 from the repository, the open PRs, and a read only look at the migration lists of both Supabase projects. Companion to [discord-account-linking.md](discord-account-linking.md).

## 1. Founder decisions recorded (2026-11-12)
- **Rocket League first submission method: Ballchasing replay links**, submitted in Victress or in Discord. Victress reads the replay through the Ballchasing API. **Victress's own Ballchasing upload quota is not a dependency** for any player submission. Direct replay file upload stays the longer term goal; the parser (39 of 50 matched) needs more validation first.
- **Account linking:** one Discord account per Victress account and one Victress account per Discord account. A player sees their own linked game identity privately. Players without a team can use individual scrim features. Team specific information needs live team membership and permission. **Linking never grants data sharing permission.**

## 2. What is actually applied (read only check)
| | Production (`Victress`) | Staging (`victress-staging`) |
|---|---|---|
| Core, M3 teams, SEO, search visibility, privacy expand | yes | yes |
| `privacy_contract`, `revoke_rls_auto_enable`, `longer_invite_codes`, `waitlist_service_role_grants` | yes | **no** |
| `dashboard_foundation_with_allowlist`, `scrim_matches`, `invite_info_*` | yes | **no** |
| `game_api_imports` (#35) | no | yes |
| `partner_account`, `partner_exclusivity`, `partner_admin` (#41/#42) | no | **yes** (the #42 description says exclusivity was not applied; it is) |
| `age_gate_legal_acceptance` (#47), `waitlist_service_role_delete` (#50) | no | yes |
| `player_billing`, `funnel_events` | no | no |
Consequences: (a) `DEVELOPMENT_STATUS.md` says "No migrations run" on production; production in fact has 14. (b) Staging is **not** a faithful copy of production: it lacks 7 migrations production has, and has 7 production lacks, so staging results for new work depend on those gaps. (c) Both projects record versions as timestamps from when they were applied, not as the repo filenames, so renaming a not yet applied repo file never breaks either database.

## 3. Migration number collisions in the repo
The repo runner and the Supabase CLI order files by name, so two files with one version collide.
| Version | Files | Fix |
|---|---|---|
| `20261110000100` | #47 `age_gate_legal_acceptance`, #42 `partner_exclusivity` | renumber #42 |
| `20261110000200` | #50 `waitlist_service_role_delete`, #42 `partner_admin` | renumber #42 |
| `20261109000100` | #41 `partner_account` and the same file inside #42 | #42 already contains #41; merge #42 only, close #41 |
| #42 `20261110000300_player_billing` | no collision, but must stay after exclusivity and admin | renumber with them |
**Recommended renumbering (on #42's branch, needs your go ahead because it is another PR's branch):** `partner_exclusivity` to `20261111000100`, `partner_admin` to `20261111000200`, `player_billing` to `20261111000300`. #42 is a draft and the largest, so it moves; #47 and #50 stay (both already on staging). Staging needs no change.
New work after that: `20261112000100_discord_account_link.sql`, `20261112000200_rocket_league_link_import.sql`.

## 4. Merge order that gets players in
| Step | PR | Why | Migration |
|---|---|---|---|
| 1 | #53 Discord bot phase 1 | independent | none |
| 2 | #47, then #50 | consent before linking; unlink and deletion must be real before a Discord id is stored | `20261110000100`, `20261110000200` |
| 3 | #35 League import | provides `game_accounts`, `game_matches`, `import_jobs` (reused for Rocket League, no duplicate tables) and the `SCRIM_UPLOADS_ENABLED` plus allowlist gate | `20261108000100` |
| 4 | Rocket League link import (new) | web page first: paste a link, see the result | `20261112000200` |
| 5 | Account linking (new) | needs 2 | `20261112000100` |
| 6 | Discord `/link`, `/unlink`, `/profile`, `/scrim submit|status|stats` | needs 4 and 5 | none |
#35 adds a Riot notice and a Riot sentence to `content/legal.ts`; it will conflict with the Privacy and Terms text merged in #51 and #52, so merge it with the Privacy text read in full. #36 (funnel events) is stacked on #35 and is not needed for the pilot. #48/#49 (website) and #42 (Partner) are not on the pilot path; only the renumbering matters for #42.
Applying anything to production needs its own approval each time; production currently has none of steps 2 to 5.

## 5. Rocket League link import (design)
Verified today with the existing Ballchasing token: the replay detail endpoint returns full data for a replay by id (HTTP 200). Fields include `visibility`, `status`, playlist, map, duration, team scores, per player `stats` groups (core, boost, movement, positioning, demo), per player `id` {platform, id}, and `uploader`. Reading a replay counts against Ballchasing's read limits (2 per second, 500 per hour on our tier), **not** the upload quota (10 per day, 70 per week).
1. **Submit:** a link such as `https://ballchasing.com/replay/<uuid>` or the bare id. Only the extracted UUID is used; Victress builds the API URL itself (no fetching of user supplied URLs).
2. **Fetch:** server side, existing Ballchasing client (`lib/ballchasing/core.ts`, on the M2 branch, not yet on `main`; it moves with this work unchanged). One call, so no worker host is needed for this path.
3. **Visibility:** accept `public` and `unlisted` (the player chose to share the link). `private` fails with a plain message to change visibility. **Decision needed:** the earlier M2 note said public only.
4. **Whose numbers:** the submitter must have a Rocket League identity (platform and id) on their account; their slot in the replay is matched by it. Stored as `game_accounts` with a new provider value, `ownership_verified = false` and labeled so. A match with no slot for that identity is refused.
5. **Store:** one `game_matches` row per player and replay (`game = ROCKET_LEAGUE`, `source = 'api'`, `external_id` = replay id; the existing unique key stops duplicates). The submitter's numbers go in `me`; every other player is an anonymous slot with **no name, platform id or avatar**, as the approved default says. Nobody else's numbers are shown to the submitter's team without that player's opt in.
6. **Provenance label:** the data came through an API, so `source = 'api'`; the screen says it comes from Ballchasing and is the replay's public data, not verified ability. **Decision needed:** exact on screen label ("Public data" in earlier docs).
7. **Limits:** a per user daily cap, plus a shared limiter backed by the database (not the in memory one; Vercel runs many instances) so one player cannot exhaust the 500 per hour shared by everyone.
8. **Additive migration `20261112000200` (changes only existing tables):** allow a Rocket League provider on `game_accounts`, allow `ballchasing` on `import_jobs.provider`, a small attempt counter for the shared limit. No new match or player tables.
9. **Privacy and Terms** need a short addition (Ballchasing retrieval, platform id stored, submit only replays you may share) and `/privacy` bot text updated at the same time.

## 6. Gating the pilot
Use what exists: `SCRIM_UPLOADS_ENABLED` and the `design_partner_allowlist` (already on production). Pilot players are added to the allowlist; nobody else sees the page. Billing stays off. No pilot data is collected until consent (#47) and deletion (#50) are live and approved for production, per the project rules.

## 7. Needed from the founder
1. OK to renumber #42's three files (section 3), and to close #41 in favor of #42.
2. The merge order in section 4, each production migration approved separately.
3. Bring staging in line with production's 7 missing migrations before testing new work there (non production, but it is shared state).
4. Visibility rule (section 5.3) and the on screen provenance label (5.6).
5. OK for a player to store a Rocket League platform id (privacy text change).
6. Pilot roster and which Discord server is the private test server.
