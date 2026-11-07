# Rollback for the privacy EXPAND migration (`20261107000100_privacy_expand.sql`)

> **Note 2026-11-07 (evening):** production now has one real account (the founder's test account). This rollback was written and tested for an empty database. Before using it, take an export and decide what happens to that account's profile data; the SQL below is not data safe.

**Do not run this unless the expand step has been applied and has to be undone.** It is a prepared rollback, not part of any migration, and nothing here has been applied. Running it needs its own explicit authorization.

Context: production is on the Supabase Free plan, which has **no backups and no point in time recovery** (founder accepted this risk on 2026-11-07; see `pilot-readiness-checklist.md`). The expand migration was dry run on production inside a transaction that was rolled back, and this rollback is tested on a throwaway local Postgres (`supabase/tests/local/run-rollback.sh`), so these two are the safety net.

## What it undoes
Expand adds only new objects and replaces one function, so the rollback is exactly the reverse:

| Expand added or changed | Rollback |
|---|---|
| `profiles.directory_listed`, `show_on_leaderboards`, `scoutable`, `public_fields` (with their check) | dropped |
| constraint `profiles_search_needs_directory` | dropped |
| trigger and function `profiles_privacy_consistency` | dropped |
| table `profile_share_links` (policies, index, trigger `share_links_limit` go with it) and function `share_links_limit` | dropped |
| functions `share_fields_valid`, `profile_payload`, `shared_profile`, `directory_profile`, `board_entries`, `board_player_count`, `sitemap_directory_profiles`, `sitemap_directory_count`, `handle_available`, `team_roster` | dropped |
| `handle_new_user()` replaced (no provider name or picture, random placeholder handle) | the previous body is restored exactly as read from production on 2026-11-07 |

The old objects (view `public_profiles`, the four public read policies, `leaderboard`, `leaderboard_player_count`, `sitemap_profiles`, `sitemap_profile_count`) are never touched by expand, so the current application keeps working before, during and after the rollback.

## Data loss guard
Dropping the new columns and table loses any consent choices or sharing links people made after expand. The SQL stops if any exist. If it stops, do not force it: prepare a plan for the founder's review.

## The SQL
```sql
begin;

do $$
begin
  if exists (select 1 from public.profile_share_links) then
    raise exception 'STOP: sharing links exist. Rolling back would delete them. Prepare a plan for the founder''s review.';
  end if;
  if exists (
    select 1 from public.profiles
    where directory_listed or show_on_leaderboards or scoutable
       or public_fields <> '{"bio": false, "team": false, "stats": false, "avatar": false, "rank_role": false, "display_name": false}'::jsonb
  ) then
    raise exception 'STOP: consent choices exist. Rolling back would delete them. Prepare a plan for the founder''s review.';
  end if;
end $$;

-- 1. Restore the previous sign up function (exactly as it was in production before expand).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
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
$function$;

-- 2. Server only functions and the sharing table.
drop function public.team_roster();
drop function public.handle_available(text);
drop function public.sitemap_directory_count();
drop function public.sitemap_directory_profiles(int, int);
drop function public.board_player_count(text, boolean);
drop function public.board_entries(text, text, int, boolean);
drop function public.directory_profile(text);
drop function public.shared_profile(text);
drop function public.profile_payload(uuid, jsonb);
drop table public.profile_share_links;
drop function public.share_links_limit();

-- 3. Consent settings on profiles.
drop trigger profiles_privacy_consistency on public.profiles;
drop function public.profiles_privacy_consistency();
alter table public.profiles drop constraint profiles_search_needs_directory;
alter table public.profiles
  drop column directory_listed,
  drop column show_on_leaderboards,
  drop column scoutable,
  drop column public_fields;
drop function public.share_fields_valid(jsonb);

commit;
```

## After running it
Read only check that the new objects are gone and that the old sign up function is back: the columns, table and functions above no longer exist, `handle_new_user()` mentions `raw_user_meta_data`, and the old view, policies and functions are still there.
