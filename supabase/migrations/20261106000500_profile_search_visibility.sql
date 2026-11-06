-- Search visibility: public profiles are NOT indexed by search engines unless the player turns it on.
-- Additive only. Profiles stay viewable by direct link either way; this only controls indexing and the sitemap.

alter table public.profiles add column search_indexable boolean not null default false;

-- The profile page reads it (anon) to decide between indexable and noindex output; the owner can change it.
grant select (search_indexable) on public.profiles to anon, authenticated;
grant update (search_indexable) on public.profiles to authenticated;

-- The public view gains the flag (appended, so existing columns keep their positions).
create or replace view public.public_profiles
with (security_invoker = true) as
select
  p.id, p.handle, p.display_name, p.avatar_url, p.game, p.role, p.rank, p.bio, p.created_at,
  t.name as team_name, t.slug as team_slug,
  p.is_demo,
  p.search_indexable
from public.profiles p
left join public.teams t on t.id = p.team_id;

-- Sitemap: only profiles that opted in (and never demo players or signup placeholders).
create or replace function public.sitemap_profiles(p_limit int default 5000, p_offset int default 0)
returns table (handle text, updated_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.handle, p.updated_at
  from public.profiles p
  where p.search_indexable and not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$'
  order by p.created_at, p.handle
  limit least(greatest(coalesce(p_limit, 5000), 1), 50000)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.sitemap_profile_count()
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::int
  from public.profiles p
  where p.search_indexable and not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$';
$$;
