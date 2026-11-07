-- Scrim match log (additive). Run after 20261107000300_dashboard_foundation.sql. NOT APPLIED to production.
-- A player's own record of practice matches: date, game, opponent TEAM name, result, optional score, map and note.
-- Every row is entered by the player, so its provenance is Self-reported (`source = 'manual'`). Owner only: no anonymous
-- access, never part of a public view or sharing link. No opponent player names: only a team or group name, 60 characters.
-- Nothing here is parsed from a file; automated analysis does not exist yet.

create table public.scrim_matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  played_on date not null check (played_on between date '2000-01-01' and current_date + 1),
  opponent text check (opponent is null or char_length(btrim(opponent)) between 1 and 60),
  result text not null check (result in ('win', 'loss', 'draw')),
  score text check (score is null or score ~ '^[0-9]{1,3} ?[-:] ?[0-9]{1,3}$'),
  map text check (map is null or char_length(btrim(map)) between 1 and 40),
  note text check (note is null or char_length(note) <= 200),
  source text not null default 'manual' check (source = 'manual'),
  created_at timestamptz not null default now()
);
create index scrim_matches_profile_idx on public.scrim_matches (profile_id, played_on desc, created_at desc);

-- Same per player cap trigger as the other dashboard tables, with a cap for this one.
create or replace function public.dashboard_caps()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n int;
  cap int := case tg_table_name when 'tournament_entries' then 50 when 'highlights' then 20 when 'scrim_matches' then 500 else 25 end;
begin
  execute format('select count(*) from public.%I where profile_id = $1', tg_table_name) into n using new.profile_id;
  if n >= cap then
    raise exception 'dashboard_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.dashboard_caps() from public, anon, authenticated;
create trigger scrim_matches_cap before insert on public.scrim_matches for each row execute function public.dashboard_caps();

alter table public.scrim_matches enable row level security;
create policy "owners manage their matches" on public.scrim_matches
  for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

revoke all on public.scrim_matches from anon, authenticated;
grant select, delete on public.scrim_matches to authenticated;
grant insert (profile_id, game, played_on, opponent, result, score, map, note) on public.scrim_matches to authenticated;
grant update (game, played_on, opponent, result, score, map, note) on public.scrim_matches to authenticated;
