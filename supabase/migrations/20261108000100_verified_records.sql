-- Verified records only (founder decision 2026-11-08): Victress holds no self-reported stats anywhere.
-- Sources are exactly two: 'api' and 'demo_parsed'. NOT APPLIED to production; apply to staging first.
-- Back up first: production had 0 rows in scrim_matches, stat_entries and tournament_entries on 2026-11-08, and one
-- manual rank (profiles + player_games, CS2 Silver) that this migration clears. Backup file is kept outside the repo.
--
-- Removed: scrim_matches (self-reported match log, 500 cap), stat_entries (retired Nov 7), tournament_entries (manual
-- entry), leaderboard functions, the 'self_reported' metrics label in profile_payload, manual rank entry.
-- Added: game_accounts (verified in-game identity), match_records and match_players (parsed or API matches).
-- Rank columns stay, nullable, but only the service role can write them (an API will fill them later).

-- ---------------------------------------------------------------------------
-- 1. Remove self-reported data and the code paths that read it
-- ---------------------------------------------------------------------------
drop function public.board_entries(text, text, int, boolean);
drop function public.board_player_count(text, boolean);

drop table public.scrim_matches;
drop table public.stat_entries;
drop table public.tournament_entries;
drop function if exists public.metrics_are_valid(jsonb);

-- Manual rank entry is gone: no client may write rank. Existing manual ranks are cleared (they were backed up).
revoke insert on public.player_games from authenticated;
grant insert (profile_id, game, role) on public.player_games to authenticated;
revoke update on public.player_games from authenticated;
grant update (role) on public.player_games to authenticated;
update public.player_games set rank = null where rank is not null;
update public.profiles set rank = null where rank is not null;

-- ---------------------------------------------------------------------------
-- 2. Scrim uploads can be queued, parsed or failed
-- ---------------------------------------------------------------------------
alter table public.scrim_uploads drop constraint scrim_uploads_status_check;
alter table public.scrim_uploads add constraint scrim_uploads_status_check
  check (status in ('stored', 'queued', 'parsed', 'failed'));
alter table public.scrim_uploads add column sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$');
alter table public.scrim_uploads add column failure_reason text check (failure_reason is null or char_length(failure_reason) <= 200);
create unique index scrim_uploads_sha_idx on public.scrim_uploads (profile_id, sha256) where sha256 is not null;

-- ---------------------------------------------------------------------------
-- 3. Verified identity and verified records. Written by the server (service role) only.
-- ---------------------------------------------------------------------------
-- A linked in-game account. A row exists only after the platform sign in proved the player controls it.
-- 'riot' is allowed so the Riot Sign On step can use this table later; nothing writes it today.
create table public.game_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  platform text not null check (platform in ('steam', 'epic', 'riot')),
  platform_id text not null check (char_length(platform_id) between 1 and 80),
  verified_at timestamptz not null default now(),
  -- Rank, only ever from an API. Null until one is connected.
  rank text check (rank is null or char_length(rank) <= 40),
  rank_source text check (rank_source is null or rank_source = 'api'),
  rank_updated_at timestamptz,
  created_at timestamptz not null default now(),
  -- One Victress account per in-game account.
  unique (platform, platform_id)
);
create index game_accounts_profile_idx on public.game_accounts (profile_id);

create table public.match_records (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  source text not null check (source in ('api', 'demo_parsed')),
  upload_id uuid references public.scrim_uploads (id) on delete set null,
  replay_sha256 text unique check (replay_sha256 is null or replay_sha256 ~ '^[0-9a-f]{64}$'),
  parser text check (parser is null or char_length(parser) <= 60),
  parser_version text check (parser_version is null or char_length(parser_version) <= 40),
  playlist text check (playlist is null or char_length(playlist) <= 40),
  team_size int check (team_size is null or team_size between 1 and 6),
  played_at timestamptz,
  duration_seconds int check (duration_seconds is null or duration_seconds between 1 and 7200),
  created_at timestamptz not null default now()
);

-- One row per player in a match. Only validated stats exist as columns: header scoreboard stats and time in thirds.
-- profile_id stays null until that player's in-game account is verified and linked; such rows are stored, not shown.
create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match_records (id) on delete cascade,
  platform text not null check (platform in ('steam', 'epic', 'psn', 'xbox', 'switch', 'unknown')),
  platform_id text not null check (char_length(platform_id) between 1 and 80),
  in_game_name text check (in_game_name is null or char_length(in_game_name) <= 60),
  team int check (team in (0, 1)),
  goals int check (goals >= 0), saves int check (saves >= 0), shots int check (shots >= 0),
  assists int check (assists >= 0), score int check (score >= 0),
  time_defensive_third_s numeric check (time_defensive_third_s >= 0),
  time_neutral_third_s numeric check (time_neutral_third_s >= 0),
  time_offensive_third_s numeric check (time_offensive_third_s >= 0),
  profile_id uuid references public.profiles (id) on delete set null,
  unique (match_id, platform, platform_id)
);
create index match_players_profile_idx on public.match_players (profile_id) where profile_id is not null;
create index match_players_account_idx on public.match_players (platform, platform_id);

-- profile_payload: 'stats' consent now covers verified match totals only (Demo parsed). No self-reported field remains.
create or replace function public.profile_payload(p_profile uuid, p_fields jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'handle', p.handle,
    'display_name', case when (p_fields ->> 'display_name')::boolean then p.display_name end,
    'avatar_url', case when (p_fields ->> 'avatar')::boolean then p.avatar_url end,
    'bio', case when (p_fields ->> 'bio')::boolean then p.bio end,
    'team_name', case when (p_fields ->> 'team')::boolean then t.name end,
    'game', p.game,
    'role', case when (p_fields ->> 'rank_role')::boolean then p.role end,
    'rank', case when (p_fields ->> 'rank_role')::boolean then p.rank end,
    'games', coalesce((
      select jsonb_agg(jsonb_build_object(
        'game', g.game,
        'is_primary', g.is_primary,
        'role', case when (p_fields ->> 'rank_role')::boolean then g.role end,
        'rank', case when (p_fields ->> 'rank_role')::boolean then g.rank end
      ) order by g.created_at)
      from public.player_games g where g.profile_id = p.id
    ), '[]'::jsonb),
    'verified_matches', case when (p_fields ->> 'stats')::boolean then (
      select jsonb_build_object(
        'source', 'demo_parsed',
        'count', count(*),
        'goals', coalesce(sum(mp.goals), 0), 'saves', coalesce(sum(mp.saves), 0),
        'shots', coalesce(sum(mp.shots), 0), 'assists', coalesce(sum(mp.assists), 0),
        'score', coalesce(sum(mp.score), 0)
      )
      from public.match_players mp join public.match_records m on m.id = mp.match_id
      where mp.profile_id = p.id and m.source = 'demo_parsed'
    ) end,
    'is_demo', p.is_demo,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  from public.profiles p
  left join public.teams t on t.id = p.team_id
  where p.id = p_profile;
$$;
revoke execute on function public.profile_payload(uuid, jsonb) from public, anon, authenticated;

-- Attach stored rows when an account is linked. Called by the server after a verified platform sign in.
create function public.attach_verified_matches(p_profile uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  update public.match_players mp set profile_id = ga.profile_id
  from public.game_accounts ga
  where ga.profile_id = p_profile and mp.platform = ga.platform and mp.platform_id = ga.platform_id and mp.profile_id is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.attach_verified_matches(uuid) from public, anon, authenticated;
grant execute on function public.attach_verified_matches(uuid) to service_role;

alter table public.game_accounts enable row level security;
alter table public.match_records enable row level security;
alter table public.match_players enable row level security;

create policy "owners read their accounts" on public.game_accounts
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners delete their accounts" on public.game_accounts
  for delete to authenticated using (profile_id = (select auth.uid()));
create policy "owners read their rows" on public.match_players
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners read their matches" on public.match_records
  for select to authenticated using (exists (
    select 1 from public.match_players mp where mp.match_id = match_records.id and mp.profile_id = (select auth.uid())
  ));

revoke all on public.game_accounts, public.match_records, public.match_players from anon, authenticated;
grant select, delete on public.game_accounts to authenticated;
grant select on public.match_records, public.match_players to authenticated;
grant all on public.game_accounts, public.match_records, public.match_players to service_role;
