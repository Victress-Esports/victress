# Proposal: Scrim Intelligence (private practice into performance information)

**Status: PROPOSAL. Nothing in this document is built or proven.** The owner approved the integration order on 2026-11-08: **Rocket League first, Counter-Strike 2 second, League of Legends via the Riot API.** That approval covers building and validating only. Parsing feasibility has **not** been proven for any game, and Rocket League parsing is not claimed to work until `scrim-tests/` meets this bar: Scoreboard stats from the replay header must match ballchasing exactly; frame-derived stats (positioning, boost) must match ballchasing within 2% median on 100+ real files across 2v2 and 3v3. Only stats that pass may be shown to users. Real Counter-Strike 2 demos have not been supplied yet. Per the project principles, research and architecture are presented for approval before any major integration, and all six games stay in the architecture: VALORANT, Counter-Strike 2, Rocket League, League of Legends, Apex Legends and Overwatch 2.

Everything about game file formats, third party parsers, publisher policies and plan limits below is **background knowledge that has not been checked against current official sources**. It is labeled **UNVERIFIED** where it matters, and section 9 lists how each unknown gets resolved before anything is promised. Do not copy any of it into public copy.

## 1. What exists today
- Uploads: a private `scrim-uploads` bucket design, an allowlist gate and a server action that stores a file and records it. The extensions it accepts are `dem`, `rofl`, `replay`, `zip`, `gz`, `bz2`, `7z`, up to 200 MB. It stores files and analyzes nothing. **Not on production** (migrations `000300` and `000310` are not applied; `SCRIM_UPLOADS_ENABLED` is off). See [dashboard-migrations-production-plan.md](dashboard-migrations-production-plan.md).
- A match log the player types in (migration `000400`, not on production). Every row is Self-reported.
- Provenance values already defined in code: `self_reported`, `api`, `demo_parsed`. `api` and `demo_parsed` are marked "Coming soon". The database `source` column on stat tables currently only allows `manual`.
- No parser, no worker, no queue, no storage of parsed results.

## 2. The pipeline (target design)
1. **Upload.** A signed in, allowlisted design partner uploads a file to their own folder in the private bucket (exists). The upload form states what the file may contain and requires the player to confirm they took part (exists).
2. **Private storage.** The file stays private (owner read and delete only). Nothing is public, nothing is indexed. A SHA-256 of the file is recorded so the same file is not parsed twice and results can be traced to a file.
3. **Record.** The server records the upload after checking the flag, the allowlist, the path and the real size (exists). New: state `stored` becomes `queued` when the player asks for analysis, or automatically if they opted in.
4. **Parse job.** A worker outside the Next.js request path reads the file from storage with a short lived signed URL and runs a parser for that game and file format. **Where the worker runs is undecided** (see 8). Serverless request functions are the wrong place for 100 MB files.
5. **Results.** The worker writes through a server only function (service role) into new tables, never directly from the browser. Each row carries: the upload id, parser name and version, game and game version if present in the file, a content hash, `source = 'demo_parsed'`, created time, and a parse status with any warnings. Results are private to the uploader until the player chooses otherwise, exactly like the rest of the dashboard.
6. **Identity mapping.** The file names players by in-game identifiers. The uploader must say which player is them (and which teammates, if any). Mapping is shown to the player for confirmation. Stats for people other than the uploader are **not** attributed to Victress accounts without those people's own consent (see 5).
7. **Display.** The dashboard shows parsed stats with a "Demo parsed" label next to the Self-reported ones, never merged into one number. Verification here means provenance and integrity of the evidence, not a judgment of ability.

## 3. Candidate games, ranked
Ranking criteria, in this order: **(a) demo or replay availability to players** (can a player get a file at all), **(b) parser reliability** (is there a maintained parser and does it survive game updates), **(c) feasibility for Victress** (effort, hosting, legal), **(d) pilot demand** (who in the design partner pilot plays it). Criteria (a) to (c) below are UNVERIFIED background; criterion (d) is **unknown** until the pilot roster is known.

| Approved order | Game | (a) File availability | (b) Parser reliability | (c) Feasibility notes | (d) Pilot demand |
|---|---|---|---|---|---|
| 1 | Rocket League | Local `.replay` files for matches, including private matches (UNVERIFIED) | Community parsers exist (UNVERIFIED reliability across patches) | Smaller files; per player stats are well defined | Unknown |
| 2 | Counter-Strike 2 | Players can record or download `.dem` files from private servers and some match services. UNVERIFIED which sources still allow download after the CS2 move | Open source parsers exist (UNVERIFIED current maintenance and CS2 coverage). Format changes with game updates are a known risk | Mature ecosystem; files are large (tens to hundreds of MB, UNVERIFIED) | Unknown |
| 3 | League of Legends | Local replay files exist in the client (UNVERIFIED format and what Riot permits third parties to do with them) | Parsing is community maintained and tied to patches (UNVERIFIED) | Publisher policy risk: needs reading Riot's terms | Unknown |
| 4 | VALORANT | UNVERIFIED: no player exportable demo or replay file known to the author. If true, a file pipeline is not possible and only an official API path could apply, which for private scrim data is unlikely | n/a if no files | The Game Changers audience named in the design partner pilot plays VALORANT, so demand may be highest where the file route is weakest. This is the central tension of the proposal | Possibly high (pilot copy names Game Changers). Unknown for the actual roster |
| 5 | Overwatch 2 | UNVERIFIED: in-game replay viewing exists but no known exportable file | n/a if no files | Likely not feasible without a publisher API | Unknown |
| 6 | Apex Legends | UNVERIFIED: no player exportable replay known | n/a if no files | Likely not feasible without a publisher API | Unknown |

What this order is not: a promise or a statement that any parser works. The owner approved Rocket League first, Counter-Strike 2 second and League of Legends via the Riot API (2026-11-08). Real demo availability, parser reliability and technical feasibility are still validated with real files, and the Rocket League accuracy test in `scrim-tests/` is the first of those checks.

If VALORANT is the pilot's main game and no file path exists, Scrim Intelligence for that segment is the **match log the player enters** (built, Self-reported) and, later, whatever an official API allows. That would be said plainly, not hidden.

## 4. What real files the founder must supply
Nothing is validated without real files. For each game that is validated (start with Rocket League):
- **10 to 20 files** per game: a mix of private practice matches (the actual use case) and ordinary matches.
- From **at least 3 different players or teams**, on **at least 2 game versions** (patches), so version drift is tested.
- For each file: the **ground truth**, such as a final scoreboard screenshot or the in-game match summary, the game version and date, and which in-game identity is which person. Parser output is compared to this.
- **Consent in writing** from every person who appears in the file (their names, and voice or chat if present) to use it for validation, and confirmation of their age bracket (13 or older is the minimum; people under 18 need the minors rules in [minors-and-recruiter-access.md](minors-and-recruiter-access.md)).
- A few **deliberately bad files**: truncated, renamed, from an old version, from a different game, to test failure handling.
- File format and size per game (extensions in the upload list are a guess until files arrive: `dem`, `rofl`, `replay`).

## 5. Privacy and consent for uploaded demos
- A demo or replay can contain **other people's names, voice, chat and match behavior**. The uploader confirms they took part and will not share it (exists). That does not cover the other people in the file.
- **Teammates and opponents.** Proposed default: parsed stats are attributed only to the uploader. Statistics about other players are not stored against any Victress account, are not shown to anyone but the uploader, and opponent identifiers are not retained beyond the parse (stored as per file anonymous slots, or dropped). Any feature that shows a teammate's stats to the team needs that teammate's opt in. **LEGAL:** counsel to confirm.
- **Voice and chat.** Proposed: the parser reads only the structured match data it needs and does not extract, store or expose voice or chat even when present in the file. The raw file still contains them, which is why files stay private and deletable.
- **Retention and deletion.** The player can delete a file and its parsed results at any time (deleting the file also removes derived rows). Proposed default retention after a successful parse: keep the file for a limited period or delete on request; the period is a **LEGAL and product decision**. Account deletion removes both.
- **Minors.** Ages are not verified. Practices can include players under 18. No file from a known minor is used for validation without guardian consent. **LEGAL.**
- **No sharing.** Parsed stats join the sharing and directory controls only through the same consent fields as everything else, labeled by provenance. A file is never shared.
- **Access.** Only the uploader (RLS) and, for support, named staff with logged access. Nothing parses a file the player has not chosen to upload.
- **Disclosure of what Victress does with the file** goes in the privacy text (pending legal review); no privacy or security claim is made until built and tested.

## 6. Failure handling
- Every upload has a visible state: `stored`, `queued`, `parsing`, `parsed`, `failed`, with a plain reason on failure (unsupported file type, game version not supported, corrupted or truncated, too large, timed out, parser error). Nothing is hidden.
- **Never show partial results as complete.** A parse that cannot confirm the whole match marks the result `failed` or `partial` with the missing parts named; partial results are labeled and never ranked or compared.
- **Unsupported versions fail closed.** The worker records the game version it saw; if the parser version is not on the supported list, the file is `failed: unsupported version`, not guessed.
- Retries are limited and idempotent (the file hash prevents duplicate rows); timeouts and memory caps per job; a dead letter state a human can inspect.
- The player can re-run after a parser update, which replaces (not duplicates) results and records the new parser version.
- An internal kill switch turns parsing off without touching uploads or stored files.
- Failures are logged without file contents or personal data.

## 7. Validation plan (before any claim of "Scrim Intelligence works")
1. **Pick one game to research** from section 3, with the founder, based on pilot roster and file availability.
2. **Feasibility check (no code in the product):** confirm from official sources that files can be obtained, what the publisher's terms allow, the parser's license and maintenance, and the file sizes. Output: a short written finding per game. Unknowns stay labeled.
3. **Offline spike** on supplied files in a scratch environment, not in the product: parse, then compare to ground truth.
4. **Acceptance thresholds (proposed, to be agreed):** counts that can be exact (rounds, kills, deaths, assists, scores) must match the ground truth on **every** validated file; derived rates match to the displayed precision; parse success on supported versions at least an agreed rate (proposal: 95 percent) with failures always surfaced; zero silent wrong answers.
5. **Version drift test:** files from at least two patches; define and document the support window and the behavior outside it.
6. **Security and abuse test:** malformed, huge and hostile files cannot crash or escape the worker; the worker has no database write access beyond the results function.
7. **Privacy review** with counsel on the consent and retention points in section 5.
8. **Private pilot** with allowlisted design partners: stats shown only to the uploader, labeled Demo parsed, with a plain note that the feature is in testing.
9. **Go / no-go.** Go only if the thresholds hold on real files. No-go is a valid outcome: Scrim Intelligence then stays on the player-entered match log and the game stays out. Nothing is marketed until the go decision; until then the site says Coming soon.

## 8. Unknowns and decisions
| Unknown | How it gets resolved |
|---|---|
| Which games actually allow file export, and publisher terms for each | Written feasibility check from official sources (7.2) |
| Which parsers are maintained and license compatible | Same |
| Where the worker runs, and cost (queue plus a container host, or another approach) | Architecture decision after the game is chosen; needs founder approval |
| Storage and upload size limits on the current Supabase plan (the Free plan's per file limit may be below demo sizes) | Check current limits; Pro is already recommended for other reasons |
| The pilot roster's games | Founder |
| Retention period, teammate and opponent handling | Counsel plus founder |
| Who validates ground truth | Founder or a named pilot contact |

Decisions needed: the first game to research; approval to spend time on the offline spike once real files are supplied; who owns the privacy and legal review; the retention period.

## 9. What stays true meanwhile
The site keeps saying Scrim Intelligence is **Coming soon**. No page claims parsing, accuracy, automatic stats or any integration. Player stats remain Self-reported until a validated source exists, and account linking by itself never provides private scrim data.
