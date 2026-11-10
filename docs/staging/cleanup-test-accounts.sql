-- STAGING ONLY: project cmvifuayvqhbfkeskoqi ("victress-staging"). NEVER run this on production (pmamceqshyfptvjgimsf).
-- Removes the temporary staging test accounts (all @test.invalid) and the one waitlist row, nothing else.
-- Deletion targets, and the only ones:
--   Auth users (exact emails): stg-fresh@, stg-owner@, stg-member@, stg-solo@ (all @test.invalid)
--   Teams (exact slugs, removed by cascade from their owners): stg-squad, stg-solo
--   Waitlist row (exact email): stg-solo@test.invalid
-- State when reviewed (2026-11-10): stg-solo and its team were already removed earlier by a cascade test, so 3 users and 1 team
-- remain; the script accepts either 3 users (fresh, owner, member) or all 4. The waitlist row still exists.
-- Run the three parts ONE AT A TIME in the Supabase SQL Editor, in order. Part 2 is atomic (one DO block = one transaction):
-- if any guard or step fails it raises an error and changes nothing, including the waitlist deletion.

-- ============================================================================================================================
-- PART 1 (read only): what is about to be removed. Review before running Part 2.
-- ============================================================================================================================
with t as (
  select id, email from auth.users
  where email in ('stg-fresh@test.invalid','stg-owner@test.invalid','stg-member@test.invalid','stg-solo@test.invalid')
)
select 'target user' as what, t.email as detail, p.handle as handle from t left join public.profiles p on p.id = t.id
union all select 'count: auth users',          count(*)::text, null from t
union all select 'count: profiles',            count(*)::text, null from public.profiles where id in (select id from t)
union all select 'count: teams owned',         count(*)::text, string_agg(slug, ', ' order by slug) from public.teams where owner_id in (select id from t)
union all select 'count: team members',        count(*)::text, null from public.team_members where team_id in (select id from public.teams where owner_id in (select id from t))
union all select 'count: age confirmations',   count(*)::text, null from public.age_confirmations where profile_id in (select id from t)
union all select 'count: legal acceptances',   count(*)::text, null from public.legal_acceptances where profile_id in (select id from t)
union all select 'count: highlights',          count(*)::text, null from public.highlights where profile_id in (select id from t)
union all select 'count: player games',        count(*)::text, null from public.player_games where profile_id in (select id from t)
union all select 'count: waitlist rows (@test.invalid)', count(*)::text, string_agg(email, ', ') from public.waitlist where email like '%@test.invalid'
union all select 'count: storage objects',     count(*)::text, null from storage.objects
         where owner in (select id from t) or owner_id in (select id::text from t) or split_part(name, '/', 1) in (select id::text from t)
union all select 'looks like staging (Partner tables exist)', (to_regclass('public.partner_organizations') is not null)::text, null
union all select 'service_role may delete waitlist rows',     has_table_privilege('service_role','public.waitlist','delete')::text, null
union all select 'foreign keys to users/profiles/teams: total / composite / not on id / blocking in auth',
         count(*)::text || ' / ' || count(*) filter (where cardinality(c.conkey) <> 1)::text || ' / '
         || count(*) filter (where (select string_agg(a.attname, ',' order by k.ord) from unnest(c.confkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) <> 'id')::text || ' / '
         || count(*) filter (where n.nspname = 'auth' and c.confdeltype not in ('c','n'))::text,
         'expected at review: 35 / 0 / 0 / 0'
         from pg_constraint c join pg_class cl on cl.oid = c.conrelid join pg_namespace n on n.oid = cl.relnamespace
         where c.contype = 'f' and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass, 'public.teams'::regclass)
union all select 'total auth users in this project',          count(*)::text, null from auth.users;

-- ============================================================================================================================
-- PART 2 (the deletion): atomic. Aborts with "ABORT: ..." and changes nothing if any expectation fails.
-- The Supabase SQL Editor will warn that the query is destructive: read it, then choose "Run this query".
-- ============================================================================================================================
do $$
declare
  emails constant text[] := array['stg-fresh@test.invalid','stg-owner@test.invalid','stg-member@test.invalid','stg-solo@test.invalid'];
  must   constant text[] := array['stg-fresh@test.invalid','stg-owner@test.invalid','stg-member@test.invalid'];
  slugs  constant text[] := array['stg-squad','stg-solo'];
  uids uuid[];
  team_ids uuid[];
  n int;
  r record;
begin
  -- Guard 1: this must be the staging project (production has no Partner tables).
  if to_regclass('public.partner_organizations') is null then
    raise exception 'ABORT: this does not look like the staging project (no Partner tables). Nothing was changed.';
  end if;

  -- Guard 2: the users found are only from the four exact emails, and fresh, owner and member are all present
  -- (stg-solo may already be gone). Matched by full email, no wildcards.
  select array_agg(id) into uids from auth.users where email = any(emails);
  select count(*) into n from auth.users where email = any(must);
  if n <> 3 or cardinality(uids) not between 3 and 4 then
    raise exception 'ABORT: expected stg-fresh, stg-owner and stg-member (and optionally stg-solo); found % of the required 3 and % of 4. Nothing was changed.', n, coalesce(cardinality(uids), 0);
  end if;

  -- Guard 3: every one of those users has a profile with the expected test handle.
  select count(*) into n from public.profiles where id = any(uids) and handle in ('stg_fresh','stg_owner','stg_member','stg_solo');
  if n <> cardinality(uids) then raise exception 'ABORT: expected % profiles with stg_ handles, found %. Nothing was changed.', cardinality(uids), n; end if;

  -- Guard 4: the only teams they own are the test teams (stg-squad required, stg-solo optional); only the test
  -- accounts are on them; no other profile points at them.
  select array_agg(id) into team_ids from public.teams where owner_id = any(uids);
  if team_ids is null or exists (select 1 from public.teams where owner_id = any(uids) and slug <> all(slugs)) then
    raise exception 'ABORT: the test users own no teams, or teams other than stg-squad and stg-solo. Nothing was changed.';
  end if;
  if not exists (select 1 from public.teams where slug = 'stg-squad' and owner_id = any(uids)) then
    raise exception 'ABORT: team stg-squad is missing or not owned by a test account. Nothing was changed.';
  end if;
  if exists (select 1 from public.team_members where team_id = any(team_ids) and profile_id <> all(uids))
     or exists (select 1 from public.profiles where team_id = any(team_ids) and id <> all(uids)) then
    raise exception 'ABORT: someone who is not a test account is on a test team. Nothing was changed.';
  end if;

  -- Guard 5: the waitlist holds exactly the one expected row, and no other @test.invalid rows.
  select count(*) into n from public.waitlist where email = 'stg-solo@test.invalid';
  if n <> 1 then raise exception 'ABORT: expected 1 waitlist row for stg-solo@test.invalid, found %. Nothing was changed.', n; end if;
  select count(*) into n from public.waitlist where email like '%@test.invalid' and email <> 'stg-solo@test.invalid';
  if n <> 0 then raise exception 'ABORT: other @test.invalid waitlist rows exist. Nothing was changed.'; end if;

  -- Guard 6: no Storage files belong to them. Real column types: storage.objects.owner is uuid, owner_id is text.
  -- SQL does not remove Storage files; remove any through the Storage API first.
  select count(*) into n from storage.objects
   where owner = any(uids)
      or owner_id = any (array(select u::text from unnest(uids) u))
      or split_part(name, '/', 1) = any (array(select u::text from unnest(uids) u));
  if n <> 0 then raise exception 'ABORT: % Storage object(s) belong to the test accounts; remove them via the Storage API first. Nothing was changed.', n; end if;

  -- Guard 7: account for EVERY foreign key that references auth.users, public.profiles or public.teams. Nothing is skipped:
  --   * a composite key, or a key that does not point at the referenced table's "id", aborts (this script only counts single
  --     column keys on id, so anything else needs a human);
  --   * the seven expected public tables are allowed (their rows are the ones this cleanup removes);
  --   * Auth's own tables (schema auth) are allowed when they cascade or set null, and abort if a key would block the delete
  --     and has rows;
  --   * every other table, in any schema, must hold no rows that reference the test accounts or teams. This covers all other
  --     cascading tables and the Partner tables whose NO ACTION keys would block the delete.
  for r in
    select c.conrelid as relid, n.nspname as sch, cl.relname as tbl, c.confrelid as refid, c.confdeltype as del,
           cardinality(c.conkey) as ncols,
           (select string_agg(a.attname, ',' order by k.ord) from unnest(c.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols,
           (select string_agg(a.attname, ',' order by k.ord) from unnest(c.confkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) as refcols
    from pg_constraint c join pg_class cl on cl.oid = c.conrelid join pg_namespace n on n.oid = cl.relnamespace
    where c.contype = 'f' and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass, 'public.teams'::regclass)
    order by n.nspname, cl.relname, c.conname
  loop
    if r.ncols <> 1 then
      raise exception 'ABORT: composite foreign key found on %.% (% -> %); this script does not handle composite keys. Nothing was changed.', r.sch, r.tbl, r.cols, r.refcols;
    end if;
    if r.refcols <> 'id' then
      raise exception 'ABORT: foreign key %.%(%) references a column other than id (%). Nothing was changed.', r.sch, r.tbl, r.cols, r.refcols;
    end if;
    if r.sch = 'public' and r.tbl in ('profiles','teams','team_members','age_confirmations','legal_acceptances','highlights','player_games') then
      continue;  -- expected: removed by the cascades, and checked again after deletion
    end if;
    if r.sch = 'auth' and r.del in ('c','n') then
      continue;  -- Auth-owned (sessions, identities and so on): removed or nulled by Auth's own cascades
    end if;
    -- anything else (including an Auth table whose key would block the delete): it must hold no rows for these accounts
    execute format('select count(*) from %I.%I where %I = any($1)', r.sch, r.tbl, r.cols) into n
      using (case when r.refid = 'public.teams'::regclass then team_ids else uids end);
    if n > 0 then
      raise exception 'ABORT: % row(s) in %.% reference the test accounts and are not part of the expected cleanup. Nothing was changed.', n, r.sch, r.tbl;
    end if;
  end loop;

  -- Guard 8: the waitlist deletion runs as the server-only service role, so it must hold the grants from migration 20261110000200.
  if not has_table_privilege('service_role', 'public.waitlist', 'delete')
     or not has_column_privilege('service_role', 'public.waitlist', 'email', 'select') then
    raise exception 'ABORT: service_role lacks the waitlist delete grant on this project. Nothing was changed.';
  end if;

  -- Action 1: delete the waitlist row AS service_role (the role the app uses).
  set local role service_role;
  delete from public.waitlist where email = 'stg-solo@test.invalid';
  get diagnostics n = row_count;
  reset role;
  if n <> 1 then raise exception 'ABORT: deleted % waitlist rows as service_role, expected 1. Rolled back.', n; end if;

  -- Action 2: delete the Auth users. The existing cascades remove their profiles, the test teams, memberships, consent
  -- records, highlights, games, Auth identities and sessions.
  delete from auth.users where id = any(uids);
  get diagnostics n = row_count;
  if n <> cardinality(uids) then raise exception 'ABORT: deleted % users, expected %. Rolled back.', n, cardinality(uids); end if;

  -- Post-check inside the same transaction: anything left rolls everything back, including the waitlist deletion.
  if exists (select 1 from auth.users where id = any(uids))
     or exists (select 1 from public.profiles where id = any(uids))
     or exists (select 1 from public.teams where id = any(team_ids))
     or exists (select 1 from public.team_members where team_id = any(team_ids))
     or exists (select 1 from public.age_confirmations where profile_id = any(uids))
     or exists (select 1 from public.legal_acceptances where profile_id = any(uids))
     or exists (select 1 from public.highlights where profile_id = any(uids))
     or exists (select 1 from public.player_games where profile_id = any(uids))
     or exists (select 1 from public.waitlist where email = 'stg-solo@test.invalid') then
    raise exception 'ABORT: records remained after deletion. Rolled back.';
  end if;
end $$;

-- ============================================================================================================================
-- PART 3 (read only): verify. Every "test_" value must be 0.
-- ============================================================================================================================
select
  (select count(*) from auth.users      where email in ('stg-fresh@test.invalid','stg-owner@test.invalid','stg-member@test.invalid','stg-solo@test.invalid')) as test_users,
  (select count(*) from auth.identities where email in ('stg-fresh@test.invalid','stg-owner@test.invalid','stg-member@test.invalid','stg-solo@test.invalid')) as test_identities,
  (select count(*) from public.profiles where handle in ('stg_fresh','stg_owner','stg_member','stg_solo'))  as test_profiles,
  (select count(*) from public.teams    where slug in ('stg-squad','stg-solo'))                              as test_teams,
  (select count(*) from public.waitlist where email like '%@test.invalid')                                   as test_waitlist,
  (select count(*) from public.team_members)      as team_members_total,
  (select count(*) from public.age_confirmations) as age_rows_total,
  (select count(*) from public.legal_acceptances) as acceptance_rows_total,
  (select count(*) from public.highlights)        as highlights_total,
  (select count(*) from public.player_games)      as games_total,
  (select count(*) from auth.users)               as users_total;
