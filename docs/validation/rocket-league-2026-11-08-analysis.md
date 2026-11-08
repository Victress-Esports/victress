# Rocket League validation, 2026-11-08: what the 50 file result means

**Result: 39 of 50 files match the in-replay scoreboard exactly (78.0%). Rocket League parsing is NOT approved and must not be described as working.** The proposed bar in `docs/proposals/scrim-intelligence.md` is every exact count matching on every counted file with at least 95% of supported files parsing. This run is below it.

Method: 50 public ballchasing replays, seed 1, spread over 20 queries (4 playlist groups by 5 date windows), 5 game builds (251202 to 261031), dates 2026-01-20 to 2026-11-08, team sizes 1, 2 and 3 (12, 18 and 20 files). Truth is the scoreboard in each replay header. The compared side is rebuilt from the network frames with boxcars 0.13 (`tools/rlparse`). A file passes only if every header player is found with the same team and every field (score, goals, assists, saves, shots) is equal, no extra network player exists, and both team scores are equal. Parse time was 20 ms on average, 42 ms at most. Per file results with ids are in the JSON next to this file; no player names are stored.

## What matched
- **Both team scores matched in all 50 files.** No file had a team score difference.
- **No file had a differing stat value.** Not one `score`, `goals`, `assists`, `saves` or `shots` mismatch for any player found in both places.
- All 5 game builds parsed without a parse error; no file crashed the parser.

## Why 11 files failed (every failure is about the roster, none about a number)
| Cause | Files | What the files show |
|---|---|---|
| Header has no player scoreboard | 3 | The replay's `PlayerStats` list is empty (team scores are present and match). There is no per player truth to compare. These files cannot be validated, so they count as failures here |
| Player on the scoreboard has no team in the network data | 3 | A player who joined late or left early (score 0 to 24) never receives a team in the network stream. Their stats match; the team cannot be rebuilt |
| Player on the scoreboard is missing from the network data | 3 | Players with score 0 (joined and left) appear in the header only |
| The network has more entries than the scoreboard | 2 | A player who rejoined has two entries in the network data (one without a team) where the scoreboard lists one; one extra entry for a player not on the scoreboard. Two real players can also share a name, so merging by name is unsafe |

By another cut: 47 of the 50 files have a header scoreboard; 39 of those 47 pass (83.0%). By build: 260602 13 of 13, 251202 9 of 12, 260316 6 of 9, 260811 6 of 9, 261031 5 of 7.

## What this does and does not say
- It does say: for the players the network data identifies, scoreboard counts rebuilt from the network frames equalled the header counts in every one of the 50 files. This is a check of counts the game itself keeps, not of tactical analysis, and a pass rate over public online matches of 1, 2 and 3 players per side only.
- It does not say Rocket League parsing "works": 11 files fail on roster resolution, and we have no files from private or tournament matches, 4 player teams, or local files a partner would upload.
- The failures are concentrated in players with almost no play time, which are the cases a coach cares least about but a strict equality rule counts the same as any other.

## Options (not applied; no tuning was done after seeing these results)
1. **Keep the strict bar and fix the parser**: resolve teams for late or early leavers (inspect the team attribute and reconnect behaviour), and decide a rule for rejoined players. Then re-run on a **fresh** sample (a different seed) so the fix is not tested on the files it was tuned on.
2. **Change the claim, not the bar**: validate "counts for players who completed the match" and publish that wording with the result, treating zero play time roster entries as out of scope. This needs your approval because it changes what "matches the scoreboard" means.
3. Add files without a header scoreboard to a separate "not validatable" count rather than failures.
Nothing here is applied. The M2 pull request is not opened until the validation passes the bar you set.
