# Rocket League data model: what it supports (verified 2026-11-12)

## Individual history over time: supported
- One `game_matches` row per player per replay, keyed `(profile_id, game, external_id)` and ordered by `played_at` (the replay's own date, not the submission date), with an index on `(profile_id, game, played_at desc)`. Tests: `scripts/rl-link-test.mjs` (history order, filters, small sample flag).
- A player with no team has the full history: nothing in the import or the views reads a team table (test: a stand-in database with no team tables).
- Same replay submitted twice, in any URL form: one row (unique key, and the check happens before spending a Ballchasing read).
- The player can delete a game, all Rocket League data, or the account; each cascades as described in the pilot guide (local Postgres tests, 70+ checks).

## Team context without exposing other players: supported for the submitter's own side
Every other player is an anonymous slot (`team` colour and five numbers, no name, platform, id or avatar). From those slots the page and `/scrim stats` show **side totals** (goals and shots for and against, the player's share of their side's goals and shots). No teammate or opponent is shown one by one. Tests: `scripts/rl-link-test.mjs`, `scripts/discord-commands-test.mjs`; live check on 50 replays: `scripts/rl-fidelity.mjs`.

## Team performance across teammates: not built (decision needed)
A team's own longitudinal view across several players needs three things the pilot deliberately does not have:
1. A team context on each row. Rows do not store a team, because rosters change; a team view would need `team_id` (and the player's role) captured at submission, or derived from membership at that date.
2. Each teammate's opt in before their numbers are visible to the team (the approved default: stats about other players are not shown to anyone but the submitter). Without it, a team view is limited to the side totals above, per submitter.
3. A shared key to avoid double counting: teammates' rows for the same replay share `external_id`, so a team view can count each replay once.
Proposed next step (additive, after the pilot): `game_matches.team_id` nullable, set from the submitter's membership at submission; a per player "share my Rocket League numbers with my team" consent; team views read only consenting players' rows and the side totals. Nothing here is implemented or applied.

## Identity matching
The submitter's slot is found only by their saved platform and player id (case insensitive, exactly one match). An id that is not in the replay, appears twice, or is empty saves nothing. The id is not verified as belonging to the player (labeled so). Two accounts that claim the same id each get separate private rows; nothing is merged or shared.
