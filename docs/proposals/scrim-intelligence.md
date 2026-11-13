# Proposal: Scrim Intelligence (private practice into performance information)

## Approved direction (founder, 2026-11-07)
First integrations are **approved**, in this order:
1. **Rocket League**, using public ballchasing replays. The scoreboard inside each replay is the accuracy check.
2. **CS2**, using demos the founder supplies and public sources.
3. **League of Legends**, through the Riot match API, once the founder's production key is approved. A development key is for development only.

Rules that come with the approval:
- Real public files replace "synthetic only". Anything that is not a design partner's file is labeled **Sample** or **Public data**.
- Each source's terms are read before anything ships, and any limit on commercial use is reported (below).
- **Parsing is not claimed to work until it matches the scoreboard on at least 50 real files, and the pass rate is published.** Until then the site says Coming soon.
- All six games stay in the architecture. VALORANT, Overwatch 2 and Apex Legends are not approved.

### What each source's terms say (read 2026-11-07)
**ballchasing.com** (terms last updated February 17, 2021; API documentation):
- Every API call needs an API token (sent as the `Authorization` header). The token is free to generate; limits depend on Patreon tier.
- Rate limits for "All others" (no Patreon tier): listing replays 2 calls per second and 500 per hour; **downloading a replay file 1 call per second and 200 per hour** (the documentation says file downloads are costly). 50 replays fit inside one hour; a larger corpus is paced across hours or needs a paid tier.
- The terms prohibit using the service to "spam, phish, pharm, pretext, spider, crawl, or scrape". Use the API, never the website pages.
- Replays: "If you upload a replay with a public visibility, or you share links to unlisted replays you own, you effectively lose the sole ownership of those files, and anyone using this service can download those replays and share them with whom they chose." So public replays are meant to be downloadable by anyone using the service.
- **Not stated: any rule on commercial use, on building a product on the API, on storing or republishing replay data, or on attribution.** The terms are silent, so there is no written permission and no written ban. The operator is one person ("a one-man labor of love") and an email address is given in the terms. **Recommendation: email the operator for written confirmation before any paid use, do not redistribute replay files, keep files private to Victress, label results Public data, and credit ballchasing where results appear.**
- The replay files and names inside them belong to Rocket League's publisher and to the players. Public replays contain player names and platform ids: treat them as personal data (see the privacy section below).
- The API returns per player statistics including core scoreboard values (score, goals, assists, saves, shots) computed by ballchasing from the same replay. They can serve as a second, independent cross check of our parser besides the scoreboard stored in the replay itself.

**Riot Games** (General Policies updated May 29, 2025; League of Legends developer API policy):
- Monetization is allowed if the product is registered on the Developer Portal with status **Approved or Acknowledged**, has a **free tier** for players, is **transformative**, and has no betting. Subscriptions are an acceptable way to charge. "No apps serving as a 'data broker' between our API and another third party company."
- **Production keys are "meant for larger-size, professional projects"**; Riot wants a working or testable product or a prototype and user flow. One product per key; the key must never be in distributed code.
- The product must show the Riot legal boilerplate ("... isn't endorsed by Riot Games ...") where players can see it and must display Riot IDs, not summoner names.
- Game integrity: products must not give a competitive edge using information not in the game client.
- Not verified from the pages read: the development key's lifetime and rate limits, data retention rules, and whether private scrim games can be accessed (Tournament API and tournament codes exist; the details were not read). A development key is for development only and must not power the live product.

**CS2** demos: the sources are not chosen yet. Before using any public source its terms must be read the same way (many match sites forbid scraping). Demos the founder supplies need the written consent of the players in them (see "What real files the founder must supply").

### Acceptance and publication
- A file **passes** when every counted value the parser reports for every player (score, goals, assists, saves, shots, and the match score) equals the scoreboard stored in the replay itself, and also equals ballchasing's value for the same replay.
- The validation set is at least **50 real public replays** from different players, playlists and game versions, chosen before the parser is run (no cherry picking) and listed by replay id in the repository.
- The pass rate is the number of passing files divided by the number run, **published with the failures and why each failed**, on the Scrim Intelligence page once the set exists. No marketing line says parsing works before that number exists and is acceptable (target: 100 percent on exact counts; any failure is explained and fixed or the file type is excluded and said so).
- Result screens for non partner data carry the label **Public data** (a file from a public source) or **Sample** (a fixture), never mixed with a partner's own results.

### Build order (next)
1. Parser spike on public ballchasing replays (needs a ballchasing API token and a decision on where the worker runs). 2. The pipeline from section 2 below: upload, private storage, parse job, results with source labels, failure states. 3. The validation run and the published pass rate. 4. CS2 with supplied demos. 5. League of Legends after the production key is approved.

---

**Status: PROPOSAL. Nothing in this document is built, approved or proven.** No first integration is approved. Parsing feasibility has **not** been proven for any game. Real demos or replays have not been supplied yet. Per the project principles, research and architecture are presented for approval before any major integration, and all six games stay in the architecture: VALORANT, Counter-Strike 2, Rocket League, League of Legends, Apex Legends and Overwatch 2.

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

| Rank (provisional) | Game | (a) File availability | (b) Parser reliability | (c) Feasibility notes | (d) Pilot demand |
|---|---|---|---|---|---|
| 1 | Counter-Strike 2 | Players can record or download `.dem` files from private servers and some match services. UNVERIFIED which sources still allow download after the CS2 move | Open source parsers exist (UNVERIFIED current maintenance and CS2 coverage). Format changes with game updates are a known risk | Mature ecosystem; files are large (tens to hundreds of MB, UNVERIFIED) | Unknown |
| 2 | Rocket League | Local `.replay` files for matches, including private matches (UNVERIFIED) | Community parsers exist (UNVERIFIED reliability across patches) | Smaller files; per player stats are well defined | Unknown |
| 3 | League of Legends | Local replay files exist in the client (UNVERIFIED format and what Riot permits third parties to do with them) | Parsing is community maintained and tied to patches (UNVERIFIED) | Publisher policy risk: needs reading Riot's terms | Unknown |
| 4 | VALORANT | UNVERIFIED: no player exportable demo or replay file known to the author. If true, a file pipeline is not possible and only an official API path could apply, which for private scrim data is unlikely | n/a if no files | The Game Changers audience named in the design partner pilot plays VALORANT, so demand may be highest where the file route is weakest. This is the central tension of the proposal | Possibly high (pilot copy names Game Changers). Unknown for the actual roster |
| 5 | Overwatch 2 | UNVERIFIED: in-game replay viewing exists but no known exportable file | n/a if no files | Likely not feasible without a publisher API | Unknown |
| 6 | Apex Legends | UNVERIFIED: no player exportable replay known | n/a if no files | Likely not feasible without a publisher API | Unknown |

What this ranking is not: an approval, a promise, or a statement that any parser works. It decides which game to **research first**, nothing else. Real demo availability, parser reliability, technical feasibility and pilot demand decide the first integration (project principle); CS2 is only one candidate.

If VALORANT is the pilot's main game and no file path exists, Scrim Intelligence for that segment is the **match log the player enters** (built, Self-reported) and, later, whatever an official API allows. That would be said plainly, not hidden.

## 4. What real files the founder must supply
Nothing is validated without real files. For each candidate game that is researched (start with one):
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
