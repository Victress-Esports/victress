-- SEO: honest <lastmod> for public profile pages, and paginated sitemap queries.
-- Additive only: one column, three triggers, two read-only functions. No data is changed or removed.

alter table public.profiles add column updated_at timestamptz not null default now();
grant select (updated_at) on public.profiles to anon, authenticated;

-- Any edit to the profile row moves updated_at.
create function public.touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.touch_profile_updated_at() from public, anon, authenticated;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_profile_updated_at();

-- Stats and games are shown on the profile page, so changing them moves updated_at too.
create function public.touch_profile_from_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set updated_at = now() where id = coalesce(new.profile_id, old.profile_id);
  return null;
end;
$$;
revoke execute on function public.touch_profile_from_child() from public, anon, authenticated;
create trigger stat_entries_touch_profile after insert or update or delete on public.stat_entries
  for each row execute function public.touch_profile_from_child();
create trigger player_games_touch_profile after insert or update or delete on public.player_games
  for each row execute function public.touch_profile_from_child();

-- Public profile URLs for the sitemap: real handles only (no signup placeholders), never demo players.
-- Stable order so sitemap pages do not shift between requests.
create function public.sitemap_profiles(p_limit int default 5000, p_offset int default 0)
returns table (handle text, updated_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.handle, p.updated_at
  from public.profiles p
  where not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$'
  order by p.created_at, p.handle
  limit least(greatest(coalesce(p_limit, 5000), 1), 50000)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
grant execute on function public.sitemap_profiles(int, int) to anon, authenticated;

create function public.sitemap_profile_count()
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::int from public.profiles p where not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$';
$$;
grant execute on function public.sitemap_profile_count() to anon, authenticated;
