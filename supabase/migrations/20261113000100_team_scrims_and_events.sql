-- Team scrims for Rocket League, per player sharing consent, and first party product events (additive). NOT APPLIED anywhere.
-- Run after 20261112000200_rocket_league_link_import.sql. Test on the throwaway local Postgres first (supabase/tests/team_scrims.sql).
--
-- Team scrims
--  * A team member who submits a Ballchasing replay may choose to add it to their team's scrim list. One row per team and replay
--    (team_scrims): date, side, result, score, duration, an optional opponent label typed by the submitter, the side's totals and the
--    opponent side's totals. Totals hold five whitelisted numbers only (score, goals, assists, saves, shots): the database refuses any
--    other key, so a player name, platform or id cannot be stored in them. Opponent players are never stored one by one.
--  * Individual lines (team_scrim_lines) exist only for roster members who have opted in to sharing (team_stat_sharing) at the time of
--    submission. A trigger refuses any line for a non member or a member without the opt in, whoever writes it.
--  * Reading is enforced by row level security: only current members read their team's scrims. A line is visible to its owner, and to
--    teammates only while its owner is still on the team and still opted in. Teammates' lines are withheld when exactly one player on
--    the side has no visible line, because the side's totals minus the visible lines would reveal that player's numbers.
--  * Revoking the opt in, leaving the team or being removed deletes that player's lines for the team. Deleting the account deletes them.
--  * Writes only through record_team_scrim() (service role) and set_team_stat_sharing() (the signed in player). No direct client writes.
--
-- Events
--  * public.events: a fixed list of product events, tied to the account, deleted with it. Extra data is limited to a source, a referral
--    code and a game name, checked by the database. No replay stats, replay or match ids, platform ids, IP address, device or page data.
--    Server only (no client access). No outside analytics service. Retention: purge_events(12) deletes rows older than 12 months; it is
--    NOT scheduled by this migration (scheduling needs a separate approval).
--
-- Rollback (nothing else depends on these objects):
--   drop function public.record_team_scrim(uuid, jsonb), public.set_team_stat_sharing(boolean), public.team_scrim_line_visible(uuid, uuid),
--     public.record_event(uuid, text, jsonb), public.purge_events(integer), public.rl_numbers_ok(jsonb), public.event_props_ok(jsonb);
--   drop trigger team_members_sharing_cleanup on public.team_members; drop function public.team_members_sharing_cleanup();
--   drop table public.team_scrim_lines, public.team_scrims, public.team_stat_sharing, public.events;
--   drop function public.team_scrim_lines_guard(), public.team_stat_sharing_cleanup(), public.team_scrims_cap();

-- ------------------------------------------------------------------ shared checks

-- Five whitelisted Rocket League numbers, nothing else. Used for side totals, opponent totals and individual lines.
create function public.rl_numbers_ok(j jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(j) = 'object'
     and not exists (
       select 1 from jsonb_each(j) e
       where e.key not in ('score', 'goals', 'assists', 'saves', 'shots')
          or jsonb_typeof(e.value) <> 'number'
          or (e.value)::numeric < 0 or (e.value)::numeric > 100000
     );
$$;

-- ------------------------------------------------------------------ sharing consent

create table public.team_stat_sharing (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  game text not null check (game = 'ROCKET_LEAGUE'),
  granted_at timestamptz not null default now(),
  primary key (profile_id, team_id, game)
);
create index team_stat_sharing_team_idx on public.team_stat_sharing (team_id);

-- ------------------------------------------------------------------ team scrims

create table public.team_scrims (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  game text not null default 'ROCKET_LEAGUE' check (game = 'ROCKET_LEAGUE'),
  source text not null default 'api' check (source = 'api'),
  source_detail text not null default 'ballchasing_replay' check (source_detail = 'ballchasing_replay'),
  replay_id text not null check (replay_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  submitted_by uuid references public.profiles (id) on delete set null,
  submitted_via text not null check (submitted_via in ('web', 'discord')),
  played_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds between 0 and 20000),
  queue_kind text not null check (queue_kind in ('ranked', 'normal', 'custom', 'other')),
  side text not null check (side in ('blue', 'orange')),
  result text not null check (result in ('win', 'loss', 'no_result')),
  goals_for integer not null check (goals_for between 0 and 99),
  goals_against integer not null check (goals_against between 0 and 99),
  overtime boolean not null default false,
  side_players integer not null check (side_players between 2 and 8),     -- 1v1 replays are never team scrims
  opponent_label text check (opponent_label is null or char_length(btrim(opponent_label)) between 1 and 40),
  team_totals jsonb not null check (public.rl_numbers_ok(team_totals)),
  opponent_totals jsonb not null check (public.rl_numbers_ok(opponent_totals)),
  created_at timestamptz not null default now(),
  unique (team_id, replay_id),
  check ((result = 'win') = (goals_for > goals_against) and (result = 'loss') = (goals_for < goals_against))
);
create index team_scrims_team_idx on public.team_scrims (team_id, played_at desc);
create index team_scrims_submitter_idx on public.team_scrims (submitted_by);

create table public.team_scrim_lines (
  scrim_id uuid not null references public.team_scrims (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stats jsonb not null check (public.rl_numbers_ok(stats)),
  primary key (scrim_id, profile_id)
);
create index team_scrim_lines_profile_idx on public.team_scrim_lines (profile_id);

-- At most 2000 team scrims per team.
create function public.team_scrims_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.team_scrims where team_id = new.team_id) >= 2000 then
    raise exception 'team_scrim_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.team_scrims_cap() from public, anon, authenticated;
create trigger team_scrims_cap before insert on public.team_scrims for each row execute function public.team_scrims_cap();

-- A line may only exist for a current member of the scrim's team who has opted in to sharing. Enforced for every writer.
create function public.team_scrim_lines_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare tid uuid;
begin
  select team_id into tid from public.team_scrims where id = new.scrim_id;
  if tid is null
     or not exists (select 1 from public.team_members where team_id = tid and profile_id = new.profile_id)
     or not exists (select 1 from public.team_stat_sharing where team_id = tid and profile_id = new.profile_id and game = 'ROCKET_LEAGUE') then
    raise exception 'sharing_not_granted' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.team_scrim_lines_guard() from public, anon, authenticated;
create trigger team_scrim_lines_guard before insert or update on public.team_scrim_lines for each row execute function public.team_scrim_lines_guard();

-- Revoking the opt in deletes the player's lines for that team.
create function public.team_stat_sharing_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.team_scrim_lines l using public.team_scrims s
   where l.scrim_id = s.id and s.team_id = old.team_id and l.profile_id = old.profile_id;
  return old;
end;
$$;
revoke execute on function public.team_stat_sharing_cleanup() from public, anon, authenticated;
create trigger team_stat_sharing_cleanup after delete on public.team_stat_sharing for each row execute function public.team_stat_sharing_cleanup();

-- Leaving or being removed from a team ends the opt in (and so deletes the lines).
create function public.team_members_sharing_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.team_stat_sharing where team_id = old.team_id and profile_id = old.profile_id;
  return old;
end;
$$;
revoke execute on function public.team_members_sharing_cleanup() from public, anon, authenticated;
create trigger team_members_sharing_cleanup after delete on public.team_members for each row execute function public.team_members_sharing_cleanup();

-- Whether the signed in viewer may see one line. Used by row level security (security definer avoids policy recursion).
create function public.team_scrim_line_visible(p_scrim uuid, p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select sc.id, sc.team_id, sc.side_players from public.team_scrims sc
    where sc.id = p_scrim
      and exists (select 1 from public.team_members me where me.team_id = sc.team_id and me.profile_id = auth.uid())
  ),
  shared as (  -- lines whose owner is still on the team and still opted in
    select l.profile_id from public.team_scrim_lines l, s
    where l.scrim_id = s.id
      and exists (select 1 from public.team_members m where m.team_id = s.team_id and m.profile_id = l.profile_id)
      and exists (select 1 from public.team_stat_sharing t where t.team_id = s.team_id and t.profile_id = l.profile_id and t.game = 'ROCKET_LEAGUE')
  )
  select exists (select 1 from s)
     and (
       p_profile = auth.uid()
       or (p_profile in (select profile_id from shared)
           -- withhold when exactly one player on the side would be left without a visible line (totals minus lines = that player)
           and (select side_players from s) - (select count(*) from shared) <> 1)
     );
$$;
revoke execute on function public.team_scrim_line_visible(uuid, uuid) from public, anon;
grant execute on function public.team_scrim_line_visible(uuid, uuid) to authenticated;

alter table public.team_stat_sharing enable row level security;
alter table public.team_scrims enable row level security;
alter table public.team_scrim_lines enable row level security;

create policy "players read their own sharing choice" on public.team_stat_sharing
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "members read their team's scrims" on public.team_scrims
  for select to authenticated using (public.is_team_member(team_id));
create policy "owner or submitter removes a team scrim" on public.team_scrims
  for delete to authenticated using (
    submitted_by = (select auth.uid())
    or exists (select 1 from public.team_members m where m.team_id = team_scrims.team_id and m.profile_id = (select auth.uid()) and m.role = 'owner')
  );
create policy "lines visible by consent" on public.team_scrim_lines
  for select to authenticated using (public.team_scrim_line_visible(scrim_id, profile_id));
create policy "players remove their own lines" on public.team_scrim_lines
  for delete to authenticated using (profile_id = (select auth.uid()));

revoke all on public.team_stat_sharing, public.team_scrims, public.team_scrim_lines from public, anon, authenticated, service_role;
grant select on public.team_stat_sharing to authenticated;
grant select, delete on public.team_scrims, public.team_scrim_lines to authenticated;
grant select on public.team_stat_sharing, public.team_scrims, public.team_scrim_lines to service_role;

-- The signed in player turns team sharing on or off for their current team. Off deletes their lines (trigger above).
create function public.set_team_stat_sharing(p_on boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  tid uuid;
begin
  if uid is null then return 'unauthorized'; end if;
  select team_id into tid from public.team_members where profile_id = uid;
  if tid is null then
    delete from public.team_stat_sharing where profile_id = uid;  -- nothing should be left, but never keep an orphan choice
    return 'no_team';
  end if;
  if p_on then
    insert into public.team_stat_sharing (profile_id, team_id, game) values (uid, tid, 'ROCKET_LEAGUE') on conflict do nothing;
    return 'on';
  end if;
  delete from public.team_stat_sharing where profile_id = uid and team_id = tid and game = 'ROCKET_LEAGUE';
  return 'off';
end;
$$;
revoke execute on function public.set_team_stat_sharing(boolean) from public, anon;
grant execute on function public.set_team_stat_sharing(boolean) to authenticated;

-- The server records a team scrim for the submitter's CURRENT team. Service role only. Lines for anyone who is not a current member
-- with the opt in are dropped here (and refused by the trigger if written any other way).
-- p jsonb: replay_id, via, played_at, duration_seconds, queue_kind, side, goals_for, goals_against, overtime, side_players,
--          opponent_label, team_totals, opponent_totals, lines: [{profile_id, stats}]
create function public.record_team_scrim(p_submitter uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tid uuid;
  sid uuid;
  ln jsonb;
  kept int := 0;
  gf int := (p->>'goals_for')::int;
  ga int := (p->>'goals_against')::int;
begin
  select team_id into tid from public.team_members where profile_id = p_submitter;
  if tid is null then return jsonb_build_object('status', 'no_team'); end if;
  if coalesce((p->>'side_players')::int, 0) < 2 then return jsonb_build_object('status', 'solo_replay'); end if;
  insert into public.team_scrims (team_id, replay_id, submitted_by, submitted_via, played_at, duration_seconds, queue_kind, side, result,
                                  goals_for, goals_against, overtime, side_players, opponent_label, team_totals, opponent_totals)
  values (tid, p->>'replay_id', p_submitter, p->>'via', (p->>'played_at')::timestamptz, (p->>'duration_seconds')::int, p->>'queue_kind',
          p->>'side', case when gf > ga then 'win' when gf < ga then 'loss' else 'no_result' end,
          gf, ga, coalesce((p->>'overtime')::boolean, false), (p->>'side_players')::int,
          nullif(btrim(left(coalesce(p->>'opponent_label', ''), 40)), ''), p->'team_totals', p->'opponent_totals')
  on conflict (team_id, replay_id) do nothing
  returning id into sid;
  if sid is null then return jsonb_build_object('status', 'already'); end if;
  for ln in select * from jsonb_array_elements(coalesce(p->'lines', '[]'::jsonb)) loop
    if exists (select 1 from public.team_members where team_id = tid and profile_id = (ln->>'profile_id')::uuid)
       and exists (select 1 from public.team_stat_sharing where team_id = tid and profile_id = (ln->>'profile_id')::uuid and game = 'ROCKET_LEAGUE') then
      insert into public.team_scrim_lines (scrim_id, profile_id, stats) values (sid, (ln->>'profile_id')::uuid, ln->'stats') on conflict do nothing;
      kept := kept + 1;
    end if;
  end loop;
  return jsonb_build_object('status', 'ok', 'scrim_id', sid, 'lines', kept);
end;
$$;
revoke execute on function public.record_team_scrim(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_team_scrim(uuid, jsonb) to service_role;

-- ------------------------------------------------------------------ events

-- Extra data allowed on an event: source, referral, game. Nothing else.
create function public.event_props_ok(j jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(j) = 'object'
     and not exists (select 1 from jsonb_object_keys(j) k where k not in ('source', 'referral', 'game'))
     and (not j ? 'source' or j->>'source' in ('web', 'discord', 'email', 'google', 'invite'))
     and (not j ? 'referral' or j->>'referral' ~ '^[a-z0-9][a-z0-9_-]{0,31}$')
     and (not j ? 'game' or j->>'game' in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2'));
$$;

create table public.events (
  id bigint generated always as identity primary key,
  name text not null check (name in (
    'registration_completed', 'discord_linked', 'game_identity_linked', 'team_created', 'team_joined',
    'first_scrim_submitted', 'scrim_processing_completed', 'repeat_scrim_submitted')),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  props jsonb not null default '{}'::jsonb check (public.event_props_ok(props)),
  created_at timestamptz not null default now()
);
create unique index events_once on public.events (profile_id, name) where name in ('registration_completed', 'first_scrim_submitted');
create index events_name_created on public.events (name, created_at);
create index events_profile_idx on public.events (profile_id);

alter table public.events enable row level security;  -- no policies: no client access
revoke all on public.events from public, anon, authenticated, service_role;
grant select, delete on public.events to service_role;

-- Records one event. Service role only. A second first_scrim_submitted becomes repeat_scrim_submitted; a second registration_completed
-- is ignored. Invalid extra data records nothing. Returns the name recorded, or null.
create function public.record_event(p_profile uuid, p_name text, p_props jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  nm text := p_name;
  pr jsonb := coalesce(p_props, '{}'::jsonb);
begin
  if p_profile is null or not public.event_props_ok(pr) then return null; end if;
  if nm = 'first_scrim_submitted' and exists (select 1 from public.events where profile_id = p_profile and name = 'first_scrim_submitted') then
    nm := 'repeat_scrim_submitted';
  end if;
  insert into public.events (name, profile_id, props) values (nm, p_profile, pr) on conflict do nothing;
  return nm;
exception when check_violation or foreign_key_violation then
  return null;
end;
$$;
revoke execute on function public.record_event(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_event(uuid, text, jsonb) to service_role;

-- Retention: 12 months (the same rule approved for the earlier funnel events). Not scheduled here.
create function public.purge_events(p_months integer default 12)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare n bigint;
begin
  if p_months is null or p_months < 1 then raise exception 'invalid retention'; end if;
  delete from public.events where created_at < now() - make_interval(months => p_months);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.purge_events(integer) from public, anon, authenticated;
grant execute on function public.purge_events(integer) to service_role;
