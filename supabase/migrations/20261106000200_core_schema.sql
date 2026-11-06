-- Core schema: profiles, teams, team_members, stat_entries, handle rules, public view, avatar storage.
-- Design notes:
--  * RLS is enabled on every table.
--  * Public reads go through column-level grants (only safe columns) and the public_profiles view
--    (security_invoker, so it can never expose more than the caller is allowed to read).
--  * Handles can only be changed through claim_handle(), which enforces the reserved/offensive rules.

-- ---------------------------------------------------------------------------
-- Handle rules. Keep the lists in sync with lib/handles.ts.
-- ---------------------------------------------------------------------------
create function public.handle_is_allowed(h text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select h ~ '^[a-z0-9_]{3,20}$'
    and h <> all (array[
      'admin','api','login','app','www','support','victress',
      'dashboard','onboarding','join','settings','pricing','teams','team','about','privacy','terms',
      'staff','help','mod','moderator','official','root','null','undefined','auth'
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
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique
    check (handle = lower(handle) and public.handle_is_allowed(handle)),
  display_name text check (char_length(display_name) <= 40),
  avatar_url text check (char_length(avatar_url) <= 500 and avatar_url ~ '^https://'),
  game text check (game in ('VALORANT', 'CS2')),
  role text check (char_length(role) <= 40),
  rank text check (char_length(rank) <= 40),
  team_id uuid,
  bio text check (char_length(bio) <= 280),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,50}$'),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_team_id_fkey foreign key (team_id) references public.teams (id) on delete set null;

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'player' check (role in ('owner', 'coach', 'player')),
  joined_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);
create index team_members_profile_idx on public.team_members (profile_id);

create table public.stat_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2')),
  season text not null check (char_length(season) between 1 and 40),
  metrics jsonb not null
    check (jsonb_typeof(metrics) = 'object' and pg_column_size(metrics) < 4096),
  source text not null default 'manual' check (source = 'manual'),
  created_at timestamptz not null default now()
);
create index stat_entries_profile_idx on public.stat_entries (profile_id, game, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper used by RLS (security definer avoids policy recursion on team_members)
-- ---------------------------------------------------------------------------
create function public.is_team_member(_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = _team_id and profile_id = auth.uid()
  );
$$;
revoke execute on function public.is_team_member(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.stat_entries enable row level security;

-- profiles: rows are public (only safe columns are granted below); users edit only their own row.
create policy "profiles are publicly readable" on public.profiles
  for select to anon, authenticated using (true);

create policy "users update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (
      team_id is null
      or exists (
        select 1 from public.team_members tm
        where tm.profile_id = (select auth.uid()) and tm.team_id = profiles.team_id
      )
    )
  );

-- teams: names are public; invite_code and writes are not (handled by functions in a later migration).
create policy "teams are publicly readable" on public.teams
  for select to anon, authenticated using (true);

-- team_members: visible to the member and their teammates; members can leave.
create policy "members see their team" on public.team_members
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_team_member(team_id));

create policy "members can leave" on public.team_members
  for delete to authenticated using (profile_id = (select auth.uid()));

-- stat_entries: public to read (shown on profiles and leaderboards); owners write their own.
create policy "stats are publicly readable" on public.stat_entries
  for select to anon, authenticated using (true);

create policy "users add their own stats" on public.stat_entries
  for insert to authenticated with check (profile_id = (select auth.uid()));

create policy "users edit their own stats" on public.stat_entries
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "users delete their own stats" on public.stat_entries
  for delete to authenticated using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Privileges: column-level, least privilege
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.teams, public.team_members, public.stat_entries from anon, authenticated;

grant select (id, handle, display_name, avatar_url, game, role, rank, team_id, bio, created_at)
  on public.profiles to anon, authenticated;
-- handle is intentionally NOT updatable here: use claim_handle().
grant update (display_name, avatar_url, game, role, rank, team_id, bio)
  on public.profiles to authenticated;

-- invite_code is intentionally not readable here.
grant select (id, name, slug, owner_id, created_at) on public.teams to anon, authenticated;

grant select, delete on public.team_members to authenticated;

grant select on public.stat_entries to anon, authenticated;
grant insert (profile_id, game, season, metrics) on public.stat_entries to authenticated;
grant update (season, metrics) on public.stat_entries to authenticated;
grant delete on public.stat_entries to authenticated;

-- ---------------------------------------------------------------------------
-- Public view: only safe fields. security_invoker means RLS and grants still apply to the caller.
-- ---------------------------------------------------------------------------
create view public.public_profiles
with (security_invoker = true) as
select
  p.id,
  p.handle,
  p.display_name,
  p.avatar_url,
  p.game,
  p.role,
  p.rank,
  p.bio,
  p.created_at,
  t.name as team_name,
  t.slug as team_slug
from public.profiles p
left join public.teams t on t.id = p.team_id;

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- New user -> profile with a placeholder handle (the real handle is applied with claim_handle()).
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    'p' || substr(replace(new.id::text, '-', ''), 1, 12),
    nullif(left(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'user_name',
      ''
    ), 40), ''),
    case
      when coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '') ~ '^https://'
      then left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), 500)
    end
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- claim_handle: the only way to set or change a handle.
-- Returns 'ok' | 'invalid' | 'reserved' | 'taken' | 'unauthorized'.
-- ---------------------------------------------------------------------------
create function public.claim_handle(p_handle text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  h text := lower(btrim(coalesce(p_handle, '')));
begin
  if auth.uid() is null then
    return 'unauthorized';
  end if;
  if h !~ '^[a-z0-9_]{3,20}$' then
    return 'invalid';
  end if;
  if not public.handle_is_allowed(h) then
    return 'reserved';
  end if;
  begin
    update public.profiles set handle = h where id = auth.uid();
  exception when unique_violation then
    return 'taken';
  end;
  if not found then
    return 'unauthorized';
  end if;
  return 'ok';
end;
$$;
revoke execute on function public.claim_handle(text) from public, anon;
grant execute on function public.claim_handle(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Avatar storage: public read by URL, each user writes only inside their own folder (<uid>/...).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "users read their own avatar files" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users upload to their own avatar folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users update their own avatar files" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete their own avatar files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
