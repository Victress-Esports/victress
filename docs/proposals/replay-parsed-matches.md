# Proposal: tables for parsed replay matches (victress-staging only)

**Status: PROPOSAL. Nothing in this document has been applied to any database.** Target is the Supabase project `victress-staging` (ref `cmvifuayvqhbfkeskoqi`) only. Production (`Victress`) is out of scope and untouched. The SQL below lives in this document on purpose and is not in `supabase/migrations/`, so it cannot be applied by accident. Per CLAUDE.md, a proposed database change is not implemented until approved, and every environment step needs its own authorization.

This proposal covers storing the output of the Rocket League replay parser (`demo_parsed`). It does not claim the parser works. What may be shown to users is decided by the pass bar in CLAUDE.md section 2 and the results in `scrim-tests/`, and this design enforces that bar inside the database.

## 1. Read this first: staging does not match the repository
A read only look at staging (table list and migration history, no changes) found:

| Finding | Why it matters |
|---|---|
| Staging has `game_accounts`, `game_matches` and `import_jobs`, from a migration named `game_api_imports` dated 2026-11-08 04:22 UTC. **That migration is not in this repository** (no file in `supabase/migrations/`, nothing in git history). | Someone applied schema to staging outside the repo. The tables are shaped for Riot API imports (`provider = 'riot'`, queue kinds, `participants` and `timeline` as jsonb). The source of that migration needs to be found and committed, or the tables reconciled, before anything new is added. |
| Staging's migration history lists 7 migrations. The repo has 14 files. Tables from the missing ones (`scrim_uploads`, `scrim_matches`, `design_partner_allowlist`, `tournament_entries`, `highlights`) exist in staging. | The history table and the real schema disagree, so "apply the next migration" is not safe until they are reconciled. |
| All 15 public tables in staging are empty and have RLS enabled. | Good: a rolled back dry run costs nothing and there is no data to protect yet. |

**Recommendation:** treat reconciliation as step zero (section 8).

## 2. Design principles (from the existing documents)
- **Provenance is mandatory.** Every row says `source = 'demo_parsed'`, with parser name and version, the game build, and the SHA-256 of the file. Never merged with Self-reported values.
- **Only stats that pass may be shown.** A `stat_catalog` table marks each stat as validated or not and as user visible or not. A row level security policy lets users read a stat only if the catalog says it is visible. The pass bar becomes a database rule, not a convention.
- **Unavailable is not zero.** If the replay header omits a player, that player is listed from the frame data and their scoreboard stats are stored as `unavailable` (no value), never estimated.
- **Privacy by default** (Scrim Intelligence proposal section 5). Results belong to the uploader and are private. Teammates and opponents are stored as anonymous per file slots: no in-game names, no platform ids. Nothing here is shared, indexed or visible to other users.
- **Owner only access, server only writes.** The browser can read and delete its own rows. Only the parse worker (service role) writes results.
- **Additive.** New tables only. No existing table or shared function is altered.
- **Boost is out.** It has no validated reference, so it is not stored for users and has no catalog row, no column and no label. The code and results stay in `scrim-tests/`.

## 3. Tables

| Table | Purpose |
|---|---|
| `stat_catalog` | The list of stats the product may ever show, with validation status, user visibility and the evidence behind it. Gates reads. |
| `parse_jobs` | One row per request to analyze an upload: status, failure code, parser version. Keeps `scrim_uploads` untouched. |
| `replay_matches` | One row per parsed match: provenance, context (kind, team size, map, duration), completeness. |
| `replay_match_players` | One row per player slot in a match. No names or platform ids. |
| `replay_player_stats` | One row per player per stat, with availability. Readable only for catalog stats marked visible. |

`replay_player_stats` is deliberately long and narrow (one row per stat). It lets the database gate each stat separately and lets new validated stats arrive without a schema change. At pilot scale a match is at most 8 players by about 8 stats.

## 4. Draft SQL (NOT APPLIED)

```sql
-- PROPOSAL ONLY. Do not run. Target: victress-staging after reconciliation and approval.

create table public.stat_catalog (
  stat_key text primary key check (stat_key ~ '^[a-z0-9_]{2,40}$'),
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  kind text not null check (kind in ('header_scoreboard', 'frame_derived')),
  validation_status text not null default 'not_validated' check (validation_status in ('validated', 'not_validated')),
  user_visible boolean not null default false,
  evidence text check (evidence is null or char_length(evidence) <= 200),   -- test run and repo path, e.g. scrim-tests results id
  validated_at timestamptz,
  -- a stat can only be visible if it was validated
  check (not user_visible or (validation_status = 'validated' and validated_at is not null))
);

create table public.parse_jobs (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.scrim_uploads (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  status text not null default 'queued' check (status in ('queued', 'parsing', 'parsed', 'partial', 'failed')),
  failure_code text check (failure_code is null or failure_code in
    ('unsupported_file', 'unsupported_version', 'corrupted', 'too_large', 'timeout', 'parser_error')),
  parser_name text check (parser_name is null or char_length(parser_name) <= 40),
  parser_version text check (parser_version is null or char_length(parser_version) <= 40),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  check ((status = 'failed') = (failure_code is not null))
);
-- at most one active job per upload (makes "analyze" idempotent)
create unique index parse_jobs_one_active on public.parse_jobs (upload_id) where status in ('queued', 'parsing');
create index parse_jobs_profile_idx on public.parse_jobs (profile_id, created_at desc);

create table public.replay_matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  upload_id uuid not null references public.scrim_uploads (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  source text not null default 'demo_parsed' check (source = 'demo_parsed'),
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  parser_name text not null check (char_length(parser_name) between 1 and 40),
  parser_version text not null check (char_length(parser_version) between 1 and 40),
  game_version text check (game_version is null or char_length(game_version) <= 40),
  match_kind text not null check (match_kind in ('ranked', 'private', 'other')),
  team_size smallint not null check (team_size between 1 and 4),
  map text check (map is null or char_length(btrim(map)) between 1 and 60),
  played_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 20000),
  overtime boolean,
  blue_score smallint check (blue_score is null or blue_score >= 0),
  orange_score smallint check (orange_score is null or orange_score >= 0),
  -- false when the replay header's player list lacked someone seen in the frame data
  header_complete boolean not null,
  status text not null check (status in ('parsed', 'partial')),
  created_at timestamptz not null default now(),
  unique (id, profile_id),
  unique (profile_id, file_sha256, parser_version)        -- re-running replaces, never duplicates
);
create index replay_matches_profile_idx on public.replay_matches (profile_id, played_at desc nulls last, created_at desc);

create table public.replay_match_players (
  match_id uuid not null,
  profile_id uuid not null,
  slot smallint not null check (slot between 1 and 8),
  team text not null check (team in ('blue', 'orange')),
  is_uploader boolean not null default false,            -- set only after the player confirms which slot is them
  scoreboard_available boolean not null,                 -- false = the header omitted this player
  primary key (match_id, slot),
  foreign key (match_id, profile_id) references public.replay_matches (id, profile_id) on delete cascade
);
create unique index replay_one_uploader on public.replay_match_players (match_id) where is_uploader;

create table public.replay_player_stats (
  match_id uuid not null,
  profile_id uuid not null,
  slot smallint not null,
  stat_key text not null references public.stat_catalog (stat_key),
  value numeric(12, 2),
  availability text not null check (availability in ('available', 'unavailable')),
  primary key (match_id, slot, stat_key),
  foreign key (match_id, slot) references public.replay_match_players (match_id, slot) on delete cascade,
  foreign key (match_id, profile_id) references public.replay_matches (id, profile_id) on delete cascade,
  check ((availability = 'available') = (value is not null))   -- unavailable means no value, never a guess
);

-- per player cap, dedicated function (the shared dashboard_caps() is left alone)
create function public.replay_matches_cap() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.replay_matches where profile_id = new.profile_id) >= 500 then
    raise exception 'dashboard_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.replay_matches_cap() from public, anon, authenticated;
create trigger replay_matches_cap before insert on public.replay_matches for each row execute function public.replay_matches_cap();

alter table public.stat_catalog enable row level security;
alter table public.parse_jobs enable row level security;
alter table public.replay_matches enable row level security;
alter table public.replay_match_players enable row level security;
alter table public.replay_player_stats enable row level security;

create policy "signed in users see visible stats" on public.stat_catalog
  for select to authenticated using (user_visible);
create policy "owners read their jobs" on public.parse_jobs
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners request analysis of their uploads" on public.parse_jobs
  for insert to authenticated with check (
    profile_id = (select auth.uid())
    and exists (select 1 from public.scrim_uploads u where u.id = upload_id and u.profile_id = (select auth.uid())));
create policy "owners read their matches" on public.replay_matches
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners delete their matches" on public.replay_matches
  for delete to authenticated using (profile_id = (select auth.uid()));
create policy "owners read their match players" on public.replay_match_players
  for select to authenticated using (profile_id = (select auth.uid()));
-- the pass bar, enforced: a stat is readable only if the catalog marks it visible
create policy "owners read visible stats only" on public.replay_player_stats
  for select to authenticated using (
    profile_id = (select auth.uid())
    and exists (select 1 from public.stat_catalog c where c.stat_key = replay_player_stats.stat_key and c.user_visible));

revoke all on public.stat_catalog, public.parse_jobs, public.replay_matches, public.replay_match_players, public.replay_player_stats
  from anon, authenticated;
grant select on public.stat_catalog, public.parse_jobs, public.replay_matches, public.replay_match_players, public.replay_player_stats to authenticated;
grant delete on public.replay_matches to authenticated;                      -- cascades to players and stats
grant insert (upload_id, profile_id, game) on public.parse_jobs to authenticated;
-- the worker (service role) is the only writer of results and the only editor of the catalog
grant select, insert, update on public.stat_catalog, public.parse_jobs, public.replay_matches, public.replay_match_players, public.replay_player_stats to service_role;
grant update (is_uploader) on public.replay_match_players to authenticated;   -- see decision D2: the player confirms their own slot
```

Current evidence from `scrim-tests` (200 ranked, 29 private 2v2, 66 private 3v3 files): goals, saves, shots and assists match ballchasing exactly (1512 player comparisons, 0 mismatches) and time in the defensive, neutral and offensive thirds is within 0.4% median in every group. **`score` does not match exactly** (2 of 1512, header 2 points higher than ballchasing and the frame counters), so it would not get a visible catalog row yet. Boost has no validated reference and gets no row.

Seed rows for `stat_catalog` are **not** part of the migration. They are written by a service role step after the pass bar is met, one row per stat, with `evidence` pointing at the `scrim-tests` run. Until then every stat stays invisible, so the dashboard shows nothing parsed. Boost gets no row.

The last grant (`update (is_uploader)`) needs a policy to be safe and is flagged in D2 rather than finalized here.

## 5. What each rule buys
| Rule | Enforced by |
|---|---|
| Only the uploader sees results | owner policies on every table, no `anon` grant |
| Browser cannot write results | no insert or update grant on result tables (only `parse_jobs` insert, checked against upload ownership) |
| Unvalidated stats never reach a user, even if stored | `replay_player_stats` policy joins `stat_catalog.user_visible`; catalog check forbids `user_visible` without validation |
| Missing header players are not guessed | `check ((availability = 'available') = (value is not null))` |
| Same file and parser never duplicates | unique `(profile_id, file_sha256, parser_version)`; re-run replaces |
| Deleting a file removes derived data | `on delete cascade` from `scrim_uploads` through jobs, matches, players, stats |
| Account deletion removes everything | cascade from `profiles` |
| No names or platform ids of other people | no such columns exist |
| Provenance on every match | `source = 'demo_parsed'`, parser name and version, `file_sha256` |

## 6. Test plan (nothing runs until approved)
1. **Local first.** Add a test file beside `supabase/tests/local/run.sh` and run it on the throwaway Postgres: owner isolation (user A cannot read user B), `anon` denied everywhere, `authenticated` cannot insert into result tables, `parse_jobs` insert rejected for an upload the user does not own, hidden stat unreadable while the same row is readable once the catalog flips to visible, `unavailable` with a value rejected, `available` without a value rejected, cascades from upload and profile delete.
2. **Staging dry run.** The whole migration inside `begin; ... rollback;` on victress-staging, with the same tests, after reconciliation (section 8). Staging tables are empty today.
3. **Rollback.** Drop order is stats, players, matches, jobs, catalog, then the cap function. All tables are new, so nothing else depends on them.
4. **Advisors.** Run the Supabase security and performance advisors after the dry run. All policies use `(select auth.uid())`, and the foreign key columns are indexed through the primary keys and the `profile_id` indexes.

## 7. Decisions needed
| # | Decision | Recommendation |
|---|---|---|
| D1 | Long and narrow `replay_player_stats` (database gates each stat) vs typed columns | Long and narrow, because it makes "only stats that pass may be shown" a database rule |
| D2 | How the uploader says which slot is them without storing other people's names. The worker can return in-game names transiently for the confirmation screen and drop them, or the uploader enters their own in-game name once (their own data) | Transient names, not stored. `is_uploader` update needs a policy and a column grant restricted to that one column. Confirm with counsel (proposal section 5, LEGAL) |
| D3 | Separate `replay_*` tables vs reusing the unapproved `game_matches` (Riot shaped: provider, queue kinds, participants jsonb) | Separate. Reusing it would force Rocket League into a League shaped table and tie it to the unrecorded `game_api_imports` migration |
| D4 | Where the parse worker runs (undecided in the Scrim Intelligence proposal) | Not decided here. The tables are the same either way |
| D5 | `header_complete = false` matches: show them? | Show, with a plain note that some scoreboard values are unavailable. Positioning stats still validate against ballchasing for these players |
| D6 | Per player cap of 500 matches | Matches `scrim_matches`. Change if the pilot needs more |
| D7 | When `stat_catalog` rows are written | Only after `scrim-tests` meets the pass bar on all four groups (ranked 2v2, ranked 3v3, private 2v2, private 3v3), by a human run, recording the evidence |

## 8. Order of work (each step needs its own approval)
0. Find the source of the `game_api_imports` migration, commit it to the repo (or decide to drop and recreate in staging), and reconcile staging's migration history with the repo.
1. Approve or amend this design (decisions D1 to D7).
2. Write the migration file and the local tests; run them on the throwaway Postgres.
3. Staging dry run in a rolled back transaction; review the advisors.
4. Apply to staging only. Production is a separate decision with its own plan, and uploads stay off (`SCRIM_UPLOADS_ENABLED`) until the privacy foundation is approved for production, as CLAUDE.md requires before any pilot data is collected.
