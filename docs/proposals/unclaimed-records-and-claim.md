# Proposal: unclaimed player records and the claim page

**Status: PROPOSAL, not implemented.** Written 2026-11-15. It changes what data Victress holds about people, so CLAUDE.md requires approval first (privacy, database). The `rl-mvp-weekend.md` section for these items was never available; this is built from the item names and the rules that are approved.

## The goal
A player whose games were submitted by someone else (a teammate or an opponent) can later join Victress, prove who they are, and get those games into their own private history, matched only by exact platform and id, never by name.

## Why not store "unclaimed records" at submission time
The obvious design saves every other player's platform id and numbers from each replay into an unclaimed table, waiting to be claimed. That conflicts with what is approved and published:
- Privacy Policy 2026-11-15: "Players in the replay are not named or identified, and no other player's name or platform ID is saved."
- These are people who never agreed to anything with Victress, and some may be under 13 (the age gate cannot reach them).
- It also creates a growing store of data about non-users that must be secured, kept to a deadline and deleted on request by people who cannot easily prove who they are.

## Recommended design: claim on demand (no data about non-users)
Victress already keeps, for each submitted replay, its Ballchasing replay id (`game_matches.external_id`, `team_scrims.replay_id`). That is enough.
1. **Only a verified identity can claim.** Today that is Epic (verified by Epic sign in). Typed ids cannot claim, or anyone could take another player's games. Steam can claim once Steam sign in exists; it is not built.
2. **Claim page** (`/dashboard/scrims/rocket-league/claim`, pilot flag, allowlist): "Find my games in replays other players submitted." On request, the server lists the distinct replay ids submitted to Victress by anyone (server side, service role), excluding those the player already has. It reads each from Ballchasing and looks for a slot with exactly the player's verified platform and id. Matching ids are listed with date, mode and result; nothing about other players is shown.
3. **The player chooses** which games to add. They are saved exactly like a submission (`game_matches`, source `api`, `ballchasing_replay`), labeled "added by you from a replay submitted by another player". Nothing is added without the click.
4. **Nothing new is stored about anyone else.** The only data read is what is already held (replay ids) plus Ballchasing's replay, as for a normal submission.
5. **Limits:** Ballchasing allows about 2 reads per second and 480 per hour for our token. At pilot scale (hundreds of replays) a scan takes minutes, so it runs as a job with progress, at most once a day per player, newest replays first, capped (for example 200 replays per scan). If the pilot grows, add a server-only index of "verified identity fingerprints seen in replays", populated only for verified Victress players (not for non-users), and revisit.
6. **Privacy Policy addition:** "If you verify a game account, you can ask Victress to look for your games in replays other players submitted. Victress reads those replays from Ballchasing and adds only the games you choose."
7. **Deletion:** claimed games behave like any of the player's games (delete one, all, or the account).
8. **Teams:** a claimed game is the player's own history only; it does not create or change a team scrim.

## Alternative (not recommended): pseudonymous unclaimed records
Store each other slot's numbers keyed by an HMAC of platform and id (server secret, never the raw id), unreadable by anyone, deleted after 90 days unclaimed, claimable only by a verified identity with the same HMAC. It is faster to claim, but it is still personal data about non-users (pseudonymised data is personal data), it needs a policy change, a lawful basis decision by counsel, a deletion route for non-users, and it collides with the under-13 rule. Only consider it if claim on demand proves too slow.

## Decisions needed
1. Approve claim on demand (recommended) or the alternative.
2. Approve the Privacy Policy line in point 6 (for legal review with the rest).
3. Confirm that only verified identities (Epic now, Steam later) can claim.

## Tests to write when approved
Exact platform and id matching only (case, platform mismatch, missing id, duplicates refused); a typed identity cannot claim; another player's numbers are never shown or stored; nothing is saved without the click; limits and the daily cap; deletion; a staging run against real submitted replays with the founder's verified Epic account.
