-- M3: six games, multi-game players (one primary), demo flag, handle cooldown, leaderboards, team functions.

-- ---------------------------------------------------------------------------
-- 1. Six games
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint profiles_game_check;
alter table public.profiles add constraint profiles_game_check
  check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2'));

alter table public.stat_entries drop constraint stat_entries_game_check;
alter table public.stat_entries add constraint stat_entries_game_check
  check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2'));

-- Metrics must be a small object of bounded numbers. Stops a user storing text that would break leaderboard casts.
create function public.metrics_are_valid(m jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- CASE guarantees evaluation order (plain AND/OR does not), so non-objects and non-numbers return false instead of erroring.
  select case
    when jsonb_typeof(m) <> 'object' then false
    when (select count(*) from jsonb_object_keys(m)) > 12 then false
    else not exists (
      select 1 from jsonb_each(m) e
      where e.key !~ '^[a-z0-9_]{1,30}$'
         or jsonb_typeof(e.value) <> 'number'
         or case when jsonb_typeof(e.value) = 'number'
                 then (e.value #>> '{}')::numeric not between 0 and 1000000
                 else true end
    )
  end;
$$;

alter table public.stat_entries add constraint stat_entries_metrics_valid check (public.metrics_are_valid(metrics));

-- ---------------------------------------------------------------------------
-- 2. Profile columns: demo flag and handle-change timestamp
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column is_demo boolean not null default false,
  add column handle_changed_at timestamptz;

grant select (is_demo) on public.profiles to anon, authenticated;
-- handle_changed_at is intentionally not readable: functions below read it.

-- game / role / rank / team_id on profiles are now maintained by triggers and functions only.
revoke update (game, role, rank, team_id) on public.profiles from authenticated;

-- ---------------------------------------------------------------------------
-- 3. Handle rules: more reserved names (the placeholder pattern is refused by claim_handle, not by this constraint function)
-- ---------------------------------------------------------------------------
create or replace function public.handle_is_allowed(h text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select h ~ '^[a-z0-9_]{3,20}$'
    and h <> all (array[
      'admin','api','login','app','www','support','victress',
      'dashboard','onboarding','join','settings','pricing','teams','team','about','privacy','terms',
      'staff','help','mod','moderator','official','root','null','undefined','auth',
      'leaderboard','leaderboards','games','stats','profile','profiles','signup','logout'
    ])
    and not exists (
      select 1
      from unnest(array[
        'fuck','shit','bitch','cunt','nigg','fagg','retard','rapist','nazi','hitler','slut','whore'
      ]) as f
      where replace(h, '_', '') like '%' || f || '%'
    );
$$;

-- ---------------------------------------------------------------------------
-- 4. Handle changes: first claim (from the placeholder) is free, then once per 30 days
-- ---------------------------------------------------------------------------
create or replace function public.claim_handle(p_handle text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  h text := lower(btrim(coalesce(p_handle, '')));
  cur text;
  changed timestamptz;
  is_placeholder boolean;
begin
  if auth.uid() is null then
    return 'unauthorized';
  end if;
  if h !~ '^[a-z0-9_]{3,20}$' then
    return 'invalid';
  end if;
  if not public.handle_is_allowed(h) or h ~ '^p[0-9a-f]{12}$' then
    return 'reserved'; -- the placeholder pattern is reserved for signup-generated handles
  end if;

  select handle, handle_changed_at into cur, changed from public.profiles where id = auth.uid();
  if not found then
    return 'unauthorized';
  end if;
  if h = cur then
    return 'ok';
  end if;

  is_placeholder := cur ~ '^p[0-9a-f]{12}$';
  if not is_placeholder and changed is not null and changed > now() - interval '30 days' then
    return 'cooldown';
  end if;

  begin
    update public.profiles
      set handle = h,
          handle_changed_at = case when is_placeholder then null else now() end
      where id = auth.uid();
  exception when unique_violation then
    return 'taken';
  end;
  return 'ok';
end;
$$;

-- When can the signed-in user change their handle next? NULL means now.
create function public.handle_change_available_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when handle !~ '^p[0-9a-f]{12}$' and handle_changed_at is not null and handle_changed_at > now() - interval '30 days'
    then handle_changed_at + interval '30 days'
  end
  from public.profiles where id = auth.uid();
$$;
revoke execute on function public.handle_change_available_at() from public, anon;
grant execute on function public.handle_change_available_at() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Players can add several games and mark one primary
-- ---------------------------------------------------------------------------
create table public.player_games (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  role text check (char_length(role) <= 40),
  rank text check (char_length(rank) <= 40),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, game)
);
create unique index player_games_one_primary on public.player_games (profile_id) where is_primary;

alter table public.player_games enable row level security;

create policy "player games are publicly readable" on public.player_games
  for select to anon, authenticated using (true);
create policy "users add their own games" on public.player_games
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "users edit their own games" on public.player_games
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "users remove their own games" on public.player_games
  for delete to authenticated using (profile_id = (select auth.uid()));

revoke all on public.player_games from anon, authenticated;
grant select on public.player_games to anon, authenticated;
grant insert (profile_id, game, role, rank) on public.player_games to authenticated;
grant update (role, rank) on public.player_games to authenticated;
grant delete on public.player_games to authenticated;
-- is_primary changes only through set_primary_game() and the triggers below.

-- The first game a player adds becomes their primary.
create function public.player_games_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.is_primary := not exists (select 1 from public.player_games where profile_id = new.profile_id);
  return new;
end;
$$;
revoke execute on function public.player_games_before_insert() from public, anon, authenticated;
create trigger player_games_before_insert before insert on public.player_games
  for each row execute function public.player_games_before_insert();

-- Keep profiles.game/role/rank mirroring the primary game; promote another game if the primary is removed.
create function public.sync_primary_game()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := coalesce(new.profile_id, old.profile_id);
begin
  if tg_op = 'DELETE' and old.is_primary then
    update public.player_games set is_primary = true
    where profile_id = pid
      and game = (select game from public.player_games where profile_id = pid order by created_at, game limit 1);
  end if;

  update public.profiles p
    set game = g.game, role = g.role, rank = g.rank
    from (select game, role, rank from public.player_games where profile_id = pid and is_primary) g
    where p.id = pid;
  if not found then
    update public.profiles set game = null, role = null, rank = null where id = pid;
  end if;
  return null;
end;
$$;
revoke execute on function public.sync_primary_game() from public, anon, authenticated;
create trigger player_games_sync after insert or update or delete on public.player_games
  for each row execute function public.sync_primary_game();

create function public.set_primary_game(p_game text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return 'unauthorized';
  end if;
  if not exists (select 1 from public.player_games where profile_id = auth.uid() and game = p_game) then
    return 'not_found';
  end if;
  update public.player_games set is_primary = false where profile_id = auth.uid() and is_primary and game <> p_game;
  update public.player_games set is_primary = true where profile_id = auth.uid() and game = p_game;
  return 'ok';
end;
$$;
revoke execute on function public.set_primary_game(text) from public, anon;
grant execute on function public.set_primary_game(text) to authenticated;

-- Backfill anything set before this migration (none expected).
insert into public.player_games (profile_id, game, role, rank)
select id, game, role, rank from public.profiles where game is not null
on conflict do nothing;

-- Public view gains the demo flag (appended, so existing columns keep their positions).
create or replace view public.public_profiles
with (security_invoker = true) as
select
  p.id, p.handle, p.display_name, p.avatar_url, p.game, p.role, p.rank, p.bio, p.created_at,
  t.name as team_name, t.slug as team_slug,
  p.is_demo
from public.profiles p
left join public.teams t on t.id = p.team_id;

-- ---------------------------------------------------------------------------
-- 6. Leaderboards (latest self-reported entry per player, per game)
-- ---------------------------------------------------------------------------
create function public.leaderboard(
  p_game text,
  p_metric text,
  p_limit int default 50,
  p_include_demo boolean default false
)
returns table (
  place bigint,
  handle text,
  display_name text,
  avatar_url text,
  role text,
  rank text,
  value numeric,
  matches numeric,
  is_demo boolean,
  season text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (
    select distinct on (s.profile_id) s.profile_id, s.metrics, s.season, s.created_at
    from public.stat_entries s
    join public.profiles p on p.id = s.profile_id
    where s.game = p_game and (p_include_demo or not p.is_demo)
    order by s.profile_id, s.created_at desc
  ),
  scored as (
    select l.*, (l.metrics ->> p_metric)::numeric as v
    from latest l
    where p_metric ~ '^[a-z0-9_]{1,30}$' and jsonb_typeof(l.metrics -> p_metric) = 'number'
  )
  select
    rank() over (order by sc.v desc) as place,
    p.handle, p.display_name, p.avatar_url,
    pg.role, pg.rank,
    sc.v as value,
    case when jsonb_typeof(sc.metrics -> 'matches') = 'number' then (sc.metrics ->> 'matches')::numeric end as matches,
    p.is_demo, sc.season, sc.created_at as updated_at
  from scored sc
  join public.profiles p on p.id = sc.profile_id
  left join public.player_games pg on pg.profile_id = sc.profile_id and pg.game = p_game
  order by sc.v desc, p.handle
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;
grant execute on function public.leaderboard(text, text, int, boolean) to anon, authenticated;

-- How many players have entered stats for a game. A board opens at 10 real (non-demo) players.
create function public.leaderboard_player_count(p_game text, p_include_demo boolean default false)
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select count(distinct s.profile_id)::int
  from public.stat_entries s
  join public.profiles p on p.id = s.profile_id
  where s.game = p_game and (p_include_demo or not p.is_demo);
$$;
grant execute on function public.leaderboard_player_count(text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Teams: create, invite, join, leave, remove. Roster cap 10 (8 players + 2 coaches).
--    Members only change through these functions.
-- ---------------------------------------------------------------------------
drop policy "members can leave" on public.team_members;
revoke delete on public.team_members from authenticated;

create function public.create_team(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n text := btrim(coalesce(p_name, ''));
  base text;
  tid uuid;
begin
  if uid is null then return jsonb_build_object('status', 'unauthorized'); end if;
  if char_length(n) < 2 or char_length(n) > 40 then return jsonb_build_object('status', 'invalid'); end if;
  if exists (select 1 from public.team_members where profile_id = uid) then
    return jsonb_build_object('status', 'already_in_team');
  end if;

  base := trim(both '-' from regexp_replace(lower(n), '[^a-z0-9]+', '-', 'g'));
  if base = '' then base := 'team'; end if;

  insert into public.teams (name, slug, owner_id)
  values (n, left(base, 40) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6), uid)
  returning id into tid;
  insert into public.team_members (team_id, profile_id, role) values (tid, uid, 'owner');
  update public.profiles set team_id = tid where id = uid;
  return jsonb_build_object('status', 'ok', 'team_id', tid);
end;
$$;

-- Shown on the join page before sign-in: only the team name and size.
create function public.team_invite_info(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', t.name,
    'member_count', (select count(*) from public.team_members m where m.team_id = t.id)
  )
  from public.teams t
  where t.invite_code = lower(btrim(coalesce(p_code, '')));
$$;

create function public.join_team(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  tid uuid;
begin
  if uid is null then return 'unauthorized'; end if;
  select id into tid from public.teams where invite_code = lower(btrim(coalesce(p_code, '')));
  if tid is null then return 'invalid'; end if;
  if exists (select 1 from public.team_members where team_id = tid and profile_id = uid) then return 'already_member'; end if;
  if exists (select 1 from public.team_members where profile_id = uid) then return 'in_other_team'; end if;
  if (select count(*) from public.team_members where team_id = tid) >= 10 then return 'full'; end if;

  insert into public.team_members (team_id, profile_id, role) values (tid, uid, 'player');
  update public.profiles set team_id = tid where id = uid;
  return 'ok';
end;
$$;

-- The owner's invite code (never exposed through table reads).
create function public.team_invite_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select invite_code from public.teams where owner_id = auth.uid() limit 1;
$$;

create function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  update public.teams set invite_code = code where owner_id = auth.uid();
  if not found then return null; end if;
  return code;
end;
$$;

create function public.leave_team()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  m record;
begin
  if uid is null then return 'unauthorized'; end if;
  select * into m from public.team_members where profile_id = uid;
  if not found then return 'not_in_team'; end if;

  if m.role = 'owner' then
    if exists (select 1 from public.team_members where team_id = m.team_id and profile_id <> uid) then
      return 'owner_has_members';
    end if;
    delete from public.teams where id = m.team_id; -- sole member: disbands the team
  else
    delete from public.team_members where team_id = m.team_id and profile_id = uid;
  end if;
  update public.profiles set team_id = null where id = uid;
  return 'ok';
end;
$$;

create function public.remove_team_member(p_profile uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  tid uuid;
begin
  select id into tid from public.teams where owner_id = auth.uid();
  if tid is null then return 'not_owner'; end if;
  if p_profile = auth.uid() then return 'cannot_remove_self'; end if;
  delete from public.team_members where team_id = tid and profile_id = p_profile;
  if not found then return 'not_found'; end if;
  update public.profiles set team_id = null where id = p_profile;
  return 'ok';
end;
$$;

revoke execute on function
  public.create_team(text), public.team_invite_info(text), public.join_team(text),
  public.team_invite_code(), public.regenerate_invite_code(), public.leave_team(),
  public.remove_team_member(uuid)
from public, anon;
grant execute on function
  public.create_team(text), public.join_team(text), public.team_invite_code(),
  public.regenerate_invite_code(), public.leave_team(), public.remove_team_member(uuid)
to authenticated;
grant execute on function public.team_invite_info(text) to anon, authenticated;
