# Rocket League data model: what it supports (verified 2026-11-12, platforms updated 2026-11-13)

## Individual history over time: supported
- One `game_matches` row per player per replay, keyed `(profile_id, game, external_id)` and ordered by `played_at` (the replay's own date, not the submission date), with an index on `(profile_id, game, played_at desc)`. Tests: `scripts/rl-link-test.mjs` (history order, filters, small sample flag).
- A player with no team has the full history: nothing in the import or the views reads a team table (test: a stand-in database with no team tables).
- Same replay submitted twice, in any URL form: one row (unique key, and the check happens before spending a Ballchasing read).
- The player can delete a game, all Rocket League data, or the account; each cascades as described in the pilot guide (local Postgres tests, 70+ checks).

## Team context without exposing other players: supported for the submitter's own side
Every other player is an anonymous slot (`team` colour and five numbers, no name, platform, id or avatar). From those slots the page and `/scrim stats` show **side totals** (goals and shots for and against, the player's share of their side's goals and shots). No teammate or opponent is shown one by one. Tests: `scripts/rl-link-test.mjs`, `scripts/discord-commands-test.mjs`; live check on 50 replays: `scripts/rl-fidelity.mjs`.

## Team performance across teammates: built on branch `claude/eager-carson-2b79tb`, not applied (2026-11-13)
Implemented as `team_scrims` (one row per team and replay, side totals and opponent totals only), `team_scrim_lines` (only for roster members who opted in) and `team_stat_sharing` (the per player opt in), migration `20261113000100`. Details, rules and the staging checklist: `docs/rocket-league-team-scrims.md`. The original analysis follows.

### Original analysis (2026-11-12)
A team's own longitudinal view across several players needs three things the pilot deliberately does not have:
1. A team context on each row. Rows do not store a team, because rosters change; a team view would need `team_id` (and the player's role) captured at submission, or derived from membership at that date.
2. Each teammate's opt in before their numbers are visible to the team (the approved default: stats about other players are not shown to anyone but the submitter). Without it, a team view is limited to the side totals above, per submitter.
3. A shared key to avoid double counting: teammates' rows for the same replay share `external_id`, so a team view can count each replay once.
Proposed next step (additive, after the pilot): `game_matches.team_id` nullable, set from the submitter's membership at submission; a per player "share my Rocket League numbers with my team" consent; team views read only consenting players' rows and the side totals. Nothing here is implemented or applied.

## Identity matching
The submitter's slot is found only by their saved platform and player id (case insensitive, exactly one match). An id that is not in the replay, appears twice, or is empty saves nothing.

**Platforms.** Nothing depends on Steam. Platform values seen in 600 real replays (2,897 slots): `epic` 1,206 (id: 32 hex characters), `steam` 992 (17 digits), `ps4` 296 (9 to 11 digits), `xbox` 182 (16 hex), `psynet` 16 (16 hex), and 205 slots with no platform or id. `switch` is supported but unseen. The database stores the platform as 2 to 16 lower case letters or digits instead of a fixed list, the form offers the known ones with nothing preselected, and a pasted Ballchasing player link may name any platform, so a new one needs no migration. Matching is exact on both platform and id: `ps4` and `psynet` are different identities and are never treated as equal, a vague name like "PlayStation" or "ps5" is never guessed into one, and a slot with no platform or id is never matched to anyone. If the submitter's id string appears under a different platform name, the player is told which platform (their own id only); other players' ids and names are never shown. The id is not verified as belonging to the player (labeled so). Two accounts that claim the same id each get separate private rows; nothing is merged or shared.
