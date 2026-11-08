# M2: Rocket League replay import and validation harness

Status 2026-11-08: **the importer client exists; no replay has been downloaded or parsed; nothing works yet and nothing may be claimed.** The pass rate is unknown because the harness has not run.

## What exists
- `lib/ballchasing/core.ts`: ballchasing API client (public replays only, raw token in the `Authorization` header, list and detail calls paced under 2 per second and 480 per hour, downloads at least 1.1 seconds apart and under 190 per hour, 429 and 5xx backoff, 20 MB file cap, no token in errors). `node scripts/ballchasing-test.mjs`: 15 checks pass against a stub.

## What blocks the 50 file run
1. **`BALLCHASING_API_TOKEN` is not in the sandbox.** It lives in Vercel; the harness runs here. The token must be added to the sandbox environment as a variable (never pasted in chat).
2. **No parser is installed.** Installing a parser package was refused by the session's permission classifier, so no replay can be read yet. Options:
   | Option | Notes |
   |---|---|
   | `boxcars` Rust crate (small CLI that prints header and network frame data) | MIT licensed, actively maintained, the parser most community tools build on. Needs `cargo build` from crates.io |
   | `subtr-actor-py` (PyPI wheel, prebuilt, built on boxcars) | No compile step; adds frame level helpers. Check its license before shipping |
   | `boxcars-py` 0.1.0 | **Rejected**: 2020, boxcars 0.6, pyo3 0.8 on nightly Rust, GPL-3. Too old for current replays and the licence does not fit |
   | ballchasing's own parsed stats | Cannot validate parsing: its core stats come from the same scoreboard |
3. **Worker host** for production parse jobs is undecided (parsing must not run in a Vercel request).

## Harness design (what "matches the scoreboard" means)
The truth is the scoreboard stored in each replay: the header `PlayerStats` array (name, platform, team, Score, Goals, Assists, Saves, Shots) and the team scores (`Team0Score`, `Team1Score`) and `Goals` list. The parsed side must be computed independently from the **network frames**: each car's player replication values (`Engine.PlayerReplicationInfo:Score`, `TAGame.PRI_TA:MatchGoals`, `MatchAssists`, `MatchSaves`, `MatchShots`) at the last frame, and team scores from the game event. Where both exist they are different data paths, so agreement is a real check; agreement of the header with itself is not.
- Per file, per player, per field: exact integer match required. A file passes only if every player and every field matches and the team scores equal the sum of goals.
- Also recorded per file: players found vs header, parse error text, replay build/patch id, playlist, duration, file size, parse time.
- Output: `docs/validation/rocket-league-<date>.md` and a JSON file with every file id and every mismatch. Failures are listed, not hidden. Pass rate = fully matching files / files attempted (parse errors count as failures).
- Sample: **50 public replays**, chosen by the script with a fixed seed from ballchasing's public list, spread across playlists (duels, doubles, standard, plus unranked and private match types if present), at least 3 patch builds across the last 12 months, and a range of ranks. At most 200 downloads per hour on the free tier, so a 50 file run needs about 3 minutes of downloads.
- Files are stored in a scratch folder outside the repository and deleted after the run; only ids, counts and results are kept. They contain player names and platform ids, so no file or name is committed.
- Proposed threshold (from scrim-intelligence.md): every exact count matches on every file counted as passing, and the published pass rate is stated with the sample size. Nothing is marketed until the founder approves the result.

## Product side after the harness passes
Upload (`.replay`, private bucket), a `game_matches` row per match with `source = 'demo_parsed'` (schema from M1), job queue via `import_jobs` (provider enum needs `ballchasing` and `upload` values: additive migration), private to the owner, other players anonymous slots, public ballchasing imports labeled **Public data**, uploads labeled **Demo parsed**.

## Terms (read 2026-11-07)
Free API token required; scraping banned; public replays are downloadable by anyone using the service; the terms are silent on commercial use, so written confirmation from the operator is recommended before Victress shows ballchasing sourced data to customers. Files are personal data.
