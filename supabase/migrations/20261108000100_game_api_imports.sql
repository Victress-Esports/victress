-- Game API imports (additive). Run after 20261107000620. NOT APPLIED to production. Staging first.
-- Normalized, game independent storage for matches that come from a game API (source 'api') or a parsed replay
-- ('demo_parsed'), plus a Riot account link and an import job queue. League of Legends is the first user.
--
-- Rules built in:
--  * Nothing here can hold a typed in stat: `source` allows only 'api' and 'demo_parsed', and clients cannot write these
--    tables at all (the server writes with the service role after calling the game API). Owners can read and delete.
--  * Private by default: owner only (RLS), never part of a public view, directory or sharing link.
--  * Other players in a match are stored as anonymous slots (champion and numbers, no Riot ID, no PUUID).
--    Only the owner's own Riot account link holds a PUUID.
--  * Delete on request: owners may delete matches, jobs and the Riot link directly. Deleting the link deletes its matches.
--  * Custom games (queue 0) are counted but not stored unless the server is configured to allow them (Riot policy:
--    custom match data may only be made available to the player through Riot Sign On).
--  * Caps: matches per player, import size per job, and jsonb size per row.

create table public.game_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  provider text not null check (provider = 'riot'),
  external_id text not null check (char_length(external_id) between 20 and 100),       -- Riot PUUID
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),  -- Riot ID name part
  tag text not null check (tag ~ '^[A-Za-z0-9]{3,5}$'),
  region text not null check (region in ('americas', 'europe', 'asia', 'sea')),
  ownership_verified boolean not null default false,  -- true only after Riot Sign On, which needs a production key
  created_at timestamptz not null default now(),
  last_imported_at timestamptz,
  unique (profile_id, game)
);

create table public.game_matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.game_accounts (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  source text not null check (source in ('api', 'demo_parsed')),
  external_id text not null check (char_length(external_id) between 3 and 60),   -- Riot match id
  queue_id integer,
  queue_kind text not null check (queue_kind in ('ranked', 'normal', 'custom', 'other')),
  queue_label text check (queue_label is null or char_length(queue_label) <= 80),
  played_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds between 0 and 20000),
  game_version text check (game_version is null or char_length(game_version) <= 40),
  result text not null check (result in ('win', 'loss', 'remake')),
  me jsonb not null,                 -- the owner's numbers (champion, role, KDA, CS, gold, damage, vision)
  participants jsonb not null,       -- anonymous slots for all players, no names and no ids
  objectives jsonb not null default '{}'::jsonb,
  timeline jsonb,                    -- compact: per minute team gold, owner gold and CS, and key events
  imported_at timestamptz not null default now(),
  unique (profile_id, game, external_id),
  check (pg_column_size(me) < 8000 and pg_column_size(participants) < 40000 and pg_column_size(objectives) < 4000
         and (timeline is null or pg_column_size(timeline) < 400000))
);
create index game_matches_profile_idx on public.game_matches (profile_id, game, played_at desc);
create index game_matches_account_idx on public.game_matches (account_id);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  provider text not null check (provider in ('riot')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  requested integer not null check (requested between 1 and 50),
  imported integer not null default 0 check (imported >= 0),
  skipped_existing integer not null default 0 check (skipped_existing >= 0),
  skipped_custom integer not null default 0 check (skipped_custom >= 0),
  failed_matches integer not null default 0 check (failed_matches >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 40),
  error_message text check (error_message is null or char_length(error_message) <= 200),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index import_jobs_profile_idx on public.import_jobs (profile_id, created_at desc);
-- At most one active job per player.
create unique index import_jobs_one_active on public.import_jobs (profile_id) where status in ('queued', 'running');

-- Caps per player (service role inserts are capped too).
create function public.game_import_caps()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n int;
  cap int := case tg_table_name when 'game_matches' then 1000 when 'import_jobs' then 200 else 5 end;
begin
  execute format('select count(*) from public.%I where profile_id = $1', tg_table_name) into n using new.profile_id;
  if n >= cap then
    raise exception 'import_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.game_import_caps() from public, anon, authenticated;
create trigger game_matches_cap before insert on public.game_matches for each row execute function public.game_import_caps();
create trigger import_jobs_cap before insert on public.import_jobs for each row execute function public.game_import_caps();
create trigger game_accounts_cap before insert on public.game_accounts for each row execute function public.game_import_caps();

alter table public.game_accounts enable row level security;
alter table public.game_matches enable row level security;
alter table public.import_jobs enable row level security;
create policy "owners read their game accounts" on public.game_accounts for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners delete their game accounts" on public.game_accounts for delete to authenticated using (profile_id = (select auth.uid()));
create policy "owners read their game matches" on public.game_matches for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners delete their game matches" on public.game_matches for delete to authenticated using (profile_id = (select auth.uid()));
create policy "owners read their import jobs" on public.import_jobs for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners delete their import jobs" on public.import_jobs for delete to authenticated using (profile_id = (select auth.uid()));

-- Grants: this project's default privileges give the API roles almost nothing, so every grant is explicit.
revoke all on public.game_accounts, public.game_matches, public.import_jobs from public, anon, authenticated, service_role;
grant select, delete on public.game_accounts, public.game_matches, public.import_jobs to authenticated;
grant select, insert, update, delete on public.game_accounts, public.game_matches, public.import_jobs to service_role;
