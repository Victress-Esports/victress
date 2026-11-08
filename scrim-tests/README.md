# scrim-tests

Internal validation harness for Scrim Intelligence. Nothing here is a product claim: Rocket League parsing is **not** claimed to work (see CLAUDE.md section 2).
Replay files, player names and API responses live in the gitignored `data/` folder and must never be committed or published.

Keys: `BALLCHASING_API_KEY` and `RIOT_API_KEY` are read from `../.env.local` if it exists; otherwise the scripts send no auth header and rely on the environment proxy.

## Rocket League (ballchasing + rrrocket)
Parser: `rrrocket` (built from github.com/nickbabcock/rrrocket, `cargo install --git`).

| Step | Script |
|---|---|
| list 50 ranked doubles replays, save expected stats, download raw files | `rl_fetch.py` |
| save full ballchasing stats (advanced stats for check c) | `rl_fetch_detail.py` |
| (a) header stats vs scoreboard, (b1) counter based goals | `rl_compare.py` |
| extract gameplay facts from network frames (ball position goals, touches, boost, thirds) | `rl_extract.py` |
| choose touch parameters on replays 1 to 25, score replays 26 to 50 once | `rl_tune.py` |
| strict (b) goals from ball position and (c) boost and thirds vs ballchasing | `rl_checks.py` |
| corruption controls (the checks must catch deliberate faults) | `rl_control.py` |

How goals are derived (strict b): ball centre past the goal line inside the goal mouth, in the frame data. The scorer is the last player on the scoring team whose car was near the ball when its velocity changed. The header is not used.

## League of Legends (Riot API)
`lol_challenger.py`: 5 NA1 Challenger players, ranked solo (queue 420), last 4 matches each, matches under 5 minutes dropped.
Players are labelled P1 to P5; no names or PUUIDs are printed or saved.
