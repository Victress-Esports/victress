# scrim-tests

Internal validation harness for Scrim Intelligence. Nothing here is a product claim: Rocket League parsing is **not** claimed to work (see CLAUDE.md section 2).
Replay files, player names and API responses live in the gitignored `data/` folder and must never be committed or published.

Keys: `BALLCHASING_API_KEY` and `RIOT_API_KEY` are read from `../.env.local` if it exists; otherwise the scripts send no auth header and rely on the environment proxy.

## Rocket League (ballchasing + rrrocket)
Parser: `rrrocket` (built from github.com/nickbabcock/rrrocket, `cargo install --git`).

| Step | Script |
|---|---|
| list N replays of a playlist, save expected + full stats, download raw files; `--new` skips replays already held, `--size K` keeps private matches with K players per team | `rl_fetch.py <playlist> <count> [--new] [--size K]` |
| (legacy) original header and counter goal comparison on raw files | `rl_compare.py` |
| extract gameplay facts from network frames (ball position goals, touches, boost, thirds) | `rl_extract.py` |
| choose touch parameters on replays 1 to 25, score replays 26 to 50 once | `rl_tune.py` |
| unified report: (a) header scoreboard, (b1) counter goals, strict (b) ball position goals, (c) boost and thirds, graded against the pass bar | `rl_checks.py` |
| corruption controls (the checks must catch deliberate faults) | `rl_control.py` |

Pass bar (CLAUDE.md): header scoreboard stats must match ballchasing exactly; frame derived stats (positioning, boost) must match within 2% median on 100+ files across 2v2 and 3v3. Only stats that pass may be shown to users.

Groups: ranked 2v2 and 3v3 by playlist; private matches by the players who actually played per team (the lobby setting is unreliable). The roster is the players seen in the frame data plus header entries with non zero stats; zero stat lobby members are ignored; a player missing from the header is listed from the frames with scoreboard stats unavailable; a player who changed display name is linked by platform id.

Boost is not shown to users until it has a validated reference. Notes: the game samples boost sparsely and pad pickups hide consumption inside the net change. `rl_extract.py` adds it back from firing time (the boost component's active flag) times the drain rate (255/3 per second). Average boost holds the last sample.

Goal detection (strict b) is informational only; frame goal attribution is not a product requirement.

How goals are derived (strict b): ball centre past the goal line inside the goal mouth, in the frame data. The scorer is the last player on the scoring team whose car was near the ball when its velocity changed. The header is not used.

## League of Legends (Riot API)
`lol_challenger.py`: 5 NA1 Challenger players, ranked solo (queue 420), last 4 matches each, matches under 5 minutes dropped.
Players are labelled P1 to P5; no names or PUUIDs are printed or saved.
