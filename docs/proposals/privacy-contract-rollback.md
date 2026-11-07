# Rollback for the privacy CONTRACT migration (`20261107000200_privacy_contract.sql`)

> **Note 2026-11-07 (evening):** production now has one real account (the founder's test account). This rollback was written and tested for an empty database. Before using it, take an export and decide what happens to that account's profile data; the SQL below is not data safe.

**Do not run this unless the contract step has been applied and anonymous reads have to be restored.** It is a prepared rollback, not part of any migration. Nothing here has been applied. Running it needs its own explicit authorization.

Production is on the Supabase Free plan, which has **no backups and no point in time recovery** (accepted by the founder for the empty database only, 2026-11-07; see `pilot-readiness-checklist.md`). The contract step was dry run on production inside a transaction that was rolled back, and this rollback is tested on a throwaway local Postgres (`supabase/tests/local/run-contract-rollback.sh`).

## What contract does, and what this restores
Contract drops objects and revokes access; it holds no data. The rollback recreates exactly what was dropped, **as it exists in production on 2026-11-07** (read only, from `pg_get_viewdef`, `pg_get_functiondef`, `pg_policies`, `pg_class.relacl` and `pg_attribute.attacl`):

| Contract does | Rollback restores |
|---|---|
| drops view `public_profiles` (`security_invoker = true`, 13 columns) | recreates it with the same definition and the same privileges (anon and authenticated: select, truncate, references, trigger, maintain; service_role: truncate, references, trigger, maintain) |
| drops functions `leaderboard`, `leaderboard_player_count`, `sitemap_profiles`, `sitemap_profile_count` (plain SQL, `STABLE`, not security definer, `search_path = ''`) | recreates them verbatim; execute for PUBLIC, anon and authenticated (same as production) |
| drops policies "profiles are publicly readable", "player games are publicly readable", "stats are publicly readable", "teams are publicly readable" (`for select to anon, authenticated using (true)`) | recreates all four |
| creates policies "owners read their profile", "owners read their games", "owners read their stats", "members read their team" | drops them |
| `revoke all ... from anon` on `profiles`, `player_games`, `stat_entries`, `teams` | re-grants exactly what anon had: `select` on `player_games` and `stat_entries` (table level); `select` on 13 columns of `profiles` and 5 columns of `teams` (column level) |

Nothing else changes. The new server only functions from the expand step are not touched, so the application that reads through them keeps working before, during and after the rollback. Re-opening anonymous reads re-exposes whatever those tables hold at that moment, so decide first whether that is acceptable with real users present.

## The SQL
```sql
begin;

-- 1. Remove the policies contract created.
drop policy "owners read their profile" on public.profiles;
drop policy "owners read their games" on public.player_games;
drop policy "owners read their stats" on public.stat_entries;
drop policy "members read their team" on public.teams;

-- 2. Recreate the four public-read policies (production definition: permissive select for anon and authenticated, using true).
create policy "profiles are publicly readable" on public.profiles
  as permissive for select to anon, authenticated using (true);
create policy "player games are publicly readable" on public.player_games
  as permissive for select to anon, authenticated using (true);
create policy "stats are publicly readable" on public.stat_entries
  as permissive for select to anon, authenticated using (true);
create policy "teams are publicly readable" on public.teams
  as permissive for select to anon, authenticated using (true);

-- 3. Restore what anon could read (production state before contract).
grant select on public.player_games to anon;
grant select on public.stat_entries to anon;
grant select (avatar_url, bio, created_at, display_name, game, handle, id, is_demo, rank, role, search_indexable, team_id, updated_at)
  on public.profiles to anon;
grant select (created_at, id, name, owner_id, slug) on public.teams to anon;

-- 4. Recreate the view (production definition, security_invoker on).
create view public.public_profiles with (security_invoker = true) as
 select p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.game,
    p.role,
    p.rank,
    p.bio,
    p.created_at,
    t.name as team_name,
    t.slug as team_slug,
    p.is_demo,
    p.search_indexable
   from public.profiles p
     left join public.teams t on t.id = p.team_id;
-- Privileges exactly as in production: anon and authenticated rDxtm, service_role Dxtm (no insert, update, delete; service_role has no select).
-- MAINTAIN exists from Postgres 17 (production runs 17.11); older servers (the local test database) skip it.
revoke all on public.public_profiles from public, anon, authenticated, service_role;
grant select, truncate, references, trigger on public.public_profiles to anon, authenticated;
grant truncate, references, trigger on public.public_profiles to service_role;
do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'grant maintain on public.public_profiles to anon, authenticated, service_role';
  end if;
end $$;

-- 5. Recreate the four functions verbatim from production, with their production execute privileges.
CREATE OR REPLACE FUNCTION public.leaderboard(p_game text, p_metric text, p_limit integer DEFAULT 50, p_include_demo boolean DEFAULT false)
 RETURNS TABLE(place bigint, handle text, display_name text, avatar_url text, role text, rank text, value numeric, matches numeric, is_demo boolean, season text, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.leaderboard_player_count(p_game text, p_include_demo boolean DEFAULT false)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select count(distinct s.profile_id)::int
  from public.stat_entries s
  join public.profiles p on p.id = s.profile_id
  where s.game = p_game and (p_include_demo or not p.is_demo);
$function$;

CREATE OR REPLACE FUNCTION public.sitemap_profile_count()
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select count(*)::int
  from public.profiles p
  where p.search_indexable and not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$';
$function$;

CREATE OR REPLACE FUNCTION public.sitemap_profiles(p_limit integer DEFAULT 5000, p_offset integer DEFAULT 0)
 RETURNS TABLE(handle text, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select p.handle, p.updated_at
  from public.profiles p
  where p.search_indexable and not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$'
  order by p.created_at, p.handle
  limit least(greatest(coalesce(p_limit, 5000), 1), 50000)
  offset greatest(coalesce(p_offset, 0), 0);
$function$;

revoke all on function public.leaderboard(text, text, int, boolean) from public, anon, authenticated, service_role;
revoke all on function public.leaderboard_player_count(text, boolean) from public, anon, authenticated, service_role;
revoke all on function public.sitemap_profile_count() from public, anon, authenticated, service_role;
revoke all on function public.sitemap_profiles(int, int) from public, anon, authenticated, service_role;
grant execute on function public.leaderboard(text, text, int, boolean) to public, anon, authenticated;
grant execute on function public.leaderboard_player_count(text, boolean) to public, anon, authenticated;
grant execute on function public.sitemap_profile_count() to public, anon, authenticated;
grant execute on function public.sitemap_profiles(int, int) to public, anon, authenticated;

commit;
```

## After running it
Read only check that the view, the four policies and the four old functions exist again, the four owner/member policies are gone, and anon has column privileges on `profiles` (13 columns) and `teams` (5 columns) and select on `player_games` and `stat_entries`. Compare ACLs to the production values recorded in `supabase/tests/local/run-contract-rollback.sh`.
