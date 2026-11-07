-- Privacy and access foundation, step 1 of 2 (EXPAND). Additive: the current application keeps working after this runs.
-- Step 2 (20261107000200_privacy_contract.sql) closes anonymous reads once the application reads only through the
-- functions below. Design: docs/proposals/privacy-safety-architecture.md; conditions: docs/proposals/decision-register.md.
--
-- NOT APPLIED to production. Each production step needs its own explicit authorization.

-- ---------------------------------------------------------------------------
-- Safeguard (decision 4): if any profile exists, stop. A reviewed migration and owner communication plan is needed first.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from public.profiles) then
    raise exception 'STOP (decision 4): profiles exist. Prepare a specific migration plan and owner communication plan for the founder''s review before running this step.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Consent settings. Everything is off by default: a new profile is private.
-- ---------------------------------------------------------------------------
create function public.share_fields_valid(f jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(f) <> 'object' then false
    else not exists (
      select 1 from jsonb_each(f) e
      where e.key not in ('display_name', 'avatar', 'bio', 'team', 'stats', 'rank_role')
         or jsonb_typeof(e.value) <> 'boolean'
    )
  end;
$$;

alter table public.profiles
  add column directory_listed boolean not null default false,
  add column show_on_leaderboards boolean not null default false,
  add column scoutable boolean not null default false,
  add column public_fields jsonb not null
    default '{"display_name":false,"avatar":false,"bio":false,"team":false,"stats":false,"rank_role":false}'::jsonb
    check (public.share_fields_valid(public_fields));

-- Search engines may only index a profile that is also in the public directory.
alter table public.profiles
  add constraint profiles_search_needs_directory check (not search_indexable or directory_listed);

create function public.profiles_privacy_consistency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.directory_listed then
    new.search_indexable := false; -- leaving the directory also leaves search
  end if;
  return new;
end;
$$;
revoke execute on function public.profiles_privacy_consistency() from public, anon, authenticated;
create trigger profiles_privacy_consistency
  before insert or update on public.profiles
  for each row execute function public.profiles_privacy_consistency();

-- Players may change their own consents. `scoutable` has no player control yet: no recruiter access exists, and
-- decision 7 and the minors restriction keep it that way, so only server code can write it.
grant select (directory_listed, show_on_leaderboards, scoutable, public_fields) on public.profiles to authenticated;
grant update (directory_listed, show_on_leaderboards, public_fields) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Sign up no longer copies the provider's real name or picture, and the placeholder handle is random
-- (it used to be the first 12 hex characters of the user id).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle)
  values (new.id, 'p' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Resume sharing links. The token itself never reaches the database: the application server creates it, stores only
-- its SHA-256 hash here, and resolves links by hash through a server only function.
-- ---------------------------------------------------------------------------
create table public.profile_share_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  label text not null default '' check (char_length(label) <= 60),
  fields jsonb not null check (public.share_fields_valid(fields)),
  created_at timestamptz not null default now(),
  expires_at timestamptz check (expires_at is null or expires_at > created_at),
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  view_count int not null default 0
);
create index profile_share_links_profile_idx on public.profile_share_links (profile_id);

alter table public.profile_share_links enable row level security;
create policy "owners read their links" on public.profile_share_links
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners create their links" on public.profile_share_links
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "owners update their links" on public.profile_share_links
  for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "owners delete their links" on public.profile_share_links
  for delete to authenticated using (profile_id = (select auth.uid()));

revoke all on public.profile_share_links from anon, authenticated;
-- token_hash is deliberately not readable, even by the owner.
grant select (id, profile_id, label, fields, created_at, expires_at, revoked_at, last_viewed_at, view_count)
  on public.profile_share_links to authenticated;
grant insert (profile_id, token_hash, label, fields, expires_at) on public.profile_share_links to authenticated;
grant update (label, fields, expires_at, revoked_at) on public.profile_share_links to authenticated;
grant delete on public.profile_share_links to authenticated;

-- At most 20 active links per player.
create function public.share_links_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.profile_share_links l
    where l.profile_id = new.profile_id and l.revoked_at is null and (l.expires_at is null or l.expires_at > now())
  ) >= 20 then
    raise exception 'share_link_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.share_links_limit() from public, anon, authenticated;
create trigger share_links_limit before insert on public.profile_share_links
  for each row execute function public.share_links_limit();

-- ---------------------------------------------------------------------------
-- Server only read functions. They return only what the player consented to. No role other than service_role can run
-- them, so the database's own public API cannot be used to resolve links or scrape profiles.
-- ---------------------------------------------------------------------------
-- Builds the public view of a profile, honoring one set of field flags. Internal: nobody calls it directly.
create function public.profile_payload(p_profile uuid, p_fields jsonb)
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
    -- stat_entries.source is 'manual' today, which is the Self-reported provenance.
    'metrics', case when (p_fields ->> 'stats')::boolean then (
      select s.metrics from public.stat_entries s where s.profile_id = p.id and s.game = p.game order by s.created_at desc limit 1
    ) end,
    'metrics_source', case when (p_fields ->> 'stats')::boolean then 'self_reported' end,
    'is_demo', p.is_demo,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  from public.profiles p
  left join public.teams t on t.id = p.team_id
  where p.id = p_profile;
$$;
revoke execute on function public.profile_payload(uuid, jsonb) from public, anon, authenticated;

-- Resolve a sharing link by the hash of its token. Invalid, malformed, unknown, revoked and expired all return null.
create function public.shared_profile(p_hash text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l public.profile_share_links%rowtype;
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into l from public.profile_share_links k
  where k.token_hash = p_hash and k.revoked_at is null and (k.expires_at is null or k.expires_at > now());
  if not found then
    return null;
  end if;
  update public.profile_share_links set view_count = view_count + 1, last_viewed_at = now() where id = l.id;
  return public.profile_payload(l.profile_id, l.fields);
end;
$$;
revoke execute on function public.shared_profile(text) from public, anon, authenticated;
grant execute on function public.shared_profile(text) to service_role;

-- A profile that opted into the public directory, by handle. Anything else (private, link only, unknown) is null,
-- so a private profile cannot be told apart from a handle that does not exist.
create function public.directory_profile(p_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.profile_payload(p.id, p.public_fields) || jsonb_build_object('search_indexable', p.search_indexable)
  from public.profiles p
  where p.handle = lower(btrim(coalesce(p_handle, ''))) and p.directory_listed;
$$;
revoke execute on function public.directory_profile(text) from public, anon, authenticated;
grant execute on function public.directory_profile(text) to service_role;

-- Leaderboards: only players who opted in. Names and pictures only if the player also allowed them.
create function public.board_entries(
  p_game text,
  p_metric text,
  p_limit int default 50,
  p_include_demo boolean default false
)
returns table (
  place bigint, handle text, display_name text, avatar_url text, role text, rank text,
  value numeric, matches numeric, is_demo boolean, season text, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select distinct on (s.profile_id) s.profile_id, s.metrics, s.season, s.created_at
    from public.stat_entries s
    join public.profiles p on p.id = s.profile_id
    where s.game = p_game and p.show_on_leaderboards and (p_include_demo or not p.is_demo)
    order by s.profile_id, s.created_at desc
  ),
  scored as (
    select l.*, (l.metrics ->> p_metric)::numeric as v
    from latest l
    where p_metric ~ '^[a-z0-9_]{1,30}$' and jsonb_typeof(l.metrics -> p_metric) = 'number'
  )
  select
    rank() over (order by sc.v desc) as place,
    p.handle,
    case when (p.public_fields ->> 'display_name')::boolean then p.display_name end,
    case when (p.public_fields ->> 'avatar')::boolean then p.avatar_url end,
    case when (p.public_fields ->> 'rank_role')::boolean then pg.role end,
    case when (p.public_fields ->> 'rank_role')::boolean then pg.rank end,
    sc.v as value,
    case when jsonb_typeof(sc.metrics -> 'matches') = 'number' then (sc.metrics ->> 'matches')::numeric end as matches,
    p.is_demo, sc.season, sc.created_at as updated_at
  from scored sc
  join public.profiles p on p.id = sc.profile_id
  left join public.player_games pg on pg.profile_id = sc.profile_id and pg.game = p_game
  order by sc.v desc, p.handle
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;
revoke execute on function public.board_entries(text, text, int, boolean) from public, anon, authenticated;
grant execute on function public.board_entries(text, text, int, boolean) to service_role;

create function public.board_player_count(p_game text, p_include_demo boolean default false)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct s.profile_id)::int
  from public.stat_entries s
  join public.profiles p on p.id = s.profile_id
  where s.game = p_game and p.show_on_leaderboards and (p_include_demo or not p.is_demo);
$$;
revoke execute on function public.board_player_count(text, boolean) from public, anon, authenticated;
grant execute on function public.board_player_count(text, boolean) to service_role;

-- Sitemap: only profiles that are in the directory AND opted into search engines (never demo players or placeholders).
create function public.sitemap_directory_profiles(p_limit int default 5000, p_offset int default 0)
returns table (handle text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.handle, p.updated_at
  from public.profiles p
  where p.directory_listed and p.search_indexable and not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$'
  order by p.created_at, p.handle
  limit least(greatest(coalesce(p_limit, 5000), 1), 50000)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke execute on function public.sitemap_directory_profiles(int, int) from public, anon, authenticated;
grant execute on function public.sitemap_directory_profiles(int, int) to service_role;

create function public.sitemap_directory_count()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.profiles p
  where p.directory_listed and p.search_indexable and not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$';
$$;
revoke execute on function public.sitemap_directory_count() from public, anon, authenticated;
grant execute on function public.sitemap_directory_count() to service_role;

-- Handle availability for the anonymous availability check. One answer for taken, reserved and placeholder handles.
create function public.handle_available(p_handle text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  h text := lower(btrim(coalesce(p_handle, '')));
begin
  if h !~ '^[a-z0-9_]{3,20}$' or h ~ '^p[0-9a-f]{12}$' or not public.handle_is_allowed(h) then
    return false;
  end if;
  return not exists (select 1 from public.profiles where handle = h);
end;
$$;
revoke execute on function public.handle_available(text) from public, anon, authenticated;
grant execute on function public.handle_available(text) to service_role;

-- Teammates see each other through this function (limited columns), not through direct table reads.
create function public.team_roster()
returns table (
  profile_id uuid, team_role text, handle text, display_name text, avatar_url text, game text, rank text, joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select tm.profile_id, tm.role, p.handle, p.display_name, p.avatar_url, p.game, p.rank, tm.joined_at
  from public.team_members tm
  join public.profiles p on p.id = tm.profile_id
  where auth.uid() is not null
    and tm.team_id = (select me.team_id from public.profiles me where me.id = auth.uid())
  order by tm.joined_at, p.handle;
$$;
revoke execute on function public.team_roster() from public, anon;
grant execute on function public.team_roster() to authenticated;
