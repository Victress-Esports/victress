-- STAGING ONLY: project cmvifuayvqhbfkeskoqi ("victress-staging"). NEVER run this on production (pmamceqshyfptvjgimsf).
-- Removes the four temporary test accounts created for staging verification (all @test.invalid), and the one waitlist row.
-- Run the three parts below ONE AT A TIME in the Supabase SQL Editor, in order. Part 2 is atomic: if any guard fails, it raises an
-- error and changes nothing.

-- ============================================================================================================================
-- PART 1 (read only): what is about to be removed. Review the output before running Part 2.
-- ============================================================================================================================
select 'target user' as what, u.email as detail, p.handle as handle
from auth.users u left join public.profiles p on p.id = u.id
where u.email in ('stg-fresh@test.invalid','stg-owner@test.invalid','stg-member@test.invalid','stg-solo@test.invalid')
union all select 'count: auth users',          count(*)::text, null from auth.users where email in ('stg-fresh@test.invalid','stg-owner@test.invalid','stg-member@test.invalid','stg-solo@test.invalid')
union all select 'count: profiles',            count(*)::text, null from public.profiles where handle in ('stg_fresh','stg_owner','stg_member','stg_solo')
union all select 'count: teams owned',         count(*)::text, string_agg(slug, ', ' order by slug) from public.teams where slug in ('stg-squad','stg-solo')
union all select 'count: team members',        count(*)::text, null from public.team_members where team_id in (select id from public.teams where slug in ('stg-squad','stg-solo'))
union all select 'count: age confirmations',   count(*)::text, null from public.age_confirmations where profile_id in (select id from auth.users where email like 'stg-%@test.invalid')
union all select 'count: legal acceptances',   count(*)::text, null from public.legal_acceptances where profile_id in (select id from auth.users where email like 'stg-%@test.invalid')
union all select 'count: highlights',          count(*)::text, null from public.highlights where profile_id in (select id from auth.users where email like 'stg-%@test.invalid')
union all select 'count: player games',        count(*)::text, null from public.player_games where profile_id in (select id from auth.users where email like 'stg-%@test.invalid')
union all select 'count: waitlist rows',       count(*)::text, string_agg(email, ', ') from public.waitlist where email like '%@test.invalid'
union all select 'count: storage objects',     count(*)::text, null from storage.objects where owner in (select id from auth.users where email like 'stg-%@test.invalid')
union all select 'looks like staging (partner tables exist)', (to_regclass('public.partner_organizations') is not null)::text, null
union all select 'service_role may delete waitlist rows',     has_table_privilege('service_role','public.waitlist','delete')::text, null
union all select 'total auth users in this project',          count(*)::text, null from auth.users;

-- ============================================================================================================================
-- PART 2 (the deletion): atomic. Aborts with "ABORT: ..." and changes nothing if any expectation fails.
-- The Supabase SQL Editor will show a warning for a destructive query: read it, then choose "Run this query".
-- ============================================================================================================================
do $$
declare
  emails constant text[] := array['stg-fresh@test.invalid','stg-owner@test.invalid','stg-member@test.invalid','stg-solo@test.invalid'];
  uids uuid[];
  n int;
begin
  -- Guard 1: this must be the staging project (production has no Partner tables).
  if to_regclass('public.partner_organizations') is null then
    raise exception 'ABORT: this does not look like the staging project (no Partner tables). Nothing was changed.';
  end if;

  -- Guard 2: exactly the four expected users, matched by full email (no wildcards).
  select array_agg(id) into uids from auth.users where email = any(emails);
  if coalesce(cardinality(uids), 0) <> 4 then
    raise exception 'ABORT: expected exactly 4 target users, found %. Nothing was changed.', coalesce(cardinality(uids), 0);
  end if;

  -- Guard 3: their profiles carry the expected test handles.
  select count(*) into n from public.profiles where id = any(uids) and handle in ('stg_fresh','stg_owner','stg_member','stg_solo');
  if n <> 4 then raise exception 'ABORT: expected 4 profiles with stg_ handles, found %. Nothing was changed.', n; end if;

  -- Guard 4: the only teams they own are the two test teams, and nobody outside the four accounts is on them.
  select count(*) into n from public.teams where owner_id = any(uids);
  if n <> 2 or exists (select 1 from public.teams where owner_id = any(uids) and slug not in ('stg-squad','stg-solo')) then
    raise exception 'ABORT: the target users own teams other than the two test teams. Nothing was changed.';
  end if;
  if exists (
    select 1 from public.team_members tm join public.teams t on t.id = tm.team_id
    where t.owner_id = any(uids) and tm.profile_id <> all(uids)
  ) then
    raise exception 'ABORT: a test team has a member who is not one of the four test accounts. Nothing was changed.';
  end if;

  -- Guard 5: the waitlist holds exactly the one expected test row and no other test.invalid rows.
  select count(*) into n from public.waitlist where email = 'stg-solo@test.invalid';
  if n <> 1 then raise exception 'ABORT: expected 1 waitlist row for stg-solo@test.invalid, found %. Nothing was changed.', n; end if;
  select count(*) into n from public.waitlist where email like '%@test.invalid' and email <> 'stg-solo@test.invalid';
  if n <> 0 then raise exception 'ABORT: other @test.invalid waitlist rows exist. Nothing was changed.'; end if;

  -- Guard 6: no Storage files belong to them (SQL does not remove Storage files; remove those through the Storage API first).
  select count(*) into n from storage.objects where owner = any(uids) or split_part(name, '/', 1) = any (array(select u::text from unnest(uids) u));
  if n <> 0 then raise exception 'ABORT: % Storage object(s) belong to the test accounts; remove them via the Storage API first. Nothing was changed.', n; end if;

  -- Guard 7: sanity ceiling on dependent rows (the real number is about 20).
  select (select count(*) from public.age_confirmations where profile_id = any(uids))
       + (select count(*) from public.legal_acceptances where profile_id = any(uids))
       + (select count(*) from public.highlights where profile_id = any(uids))
       + (select count(*) from public.player_games where profile_id = any(uids)) into n;
  if n > 60 then raise exception 'ABORT: % dependent rows is far more than expected. Nothing was changed.', n; end if;

  -- Guard 8: the waitlist deletion runs as the server-only service role, so it must hold the grant from migration 20261110000200.
  if not has_table_privilege('service_role', 'public.waitlist', 'delete')
     or not has_column_privilege('service_role', 'public.waitlist', 'email', 'select') then
    raise exception 'ABORT: service_role lacks the waitlist delete grant on this project. Nothing was changed.';
  end if;

  -- Action 1: delete the waitlist row AS service_role (the same role the app uses).
  set local role service_role;
  delete from public.waitlist where email = 'stg-solo@test.invalid';
  get diagnostics n = row_count;
  reset role;
  if n <> 1 then raise exception 'ABORT: deleted % waitlist rows as service_role, expected 1. Rolled back.', n; end if;

  -- Action 2: delete the four Auth users. The existing cascades remove their profiles, the two test teams, memberships,
  -- consent records, highlights and games (and Auth identities and sessions).
  delete from auth.users where id = any(uids);
  get diagnostics n = row_count;
  if n <> 4 then raise exception 'ABORT: deleted % users, expected 4. Rolled back.', n; end if;

  -- Post-check inside the same transaction: anything left means roll everything back.
  if exists (select 1 from auth.users where id = any(uids))
     or exists (select 1 from public.profiles where id = any(uids))
     or exists (select 1 from public.teams where slug in ('stg-squad','stg-solo'))
     or exists (select 1 from public.waitlist where email = 'stg-solo@test.invalid') then
    raise exception 'ABORT: records remained after deletion. Rolled back.';
  end if;
end $$;

-- ============================================================================================================================
-- PART 3 (read only): verify. Every "test_" value must be 0.
-- ============================================================================================================================
select
  (select count(*) from auth.users      where email like 'stg-%@test.invalid')               as test_users,
  (select count(*) from auth.identities where email like 'stg-%@test.invalid')               as test_identities,
  (select count(*) from public.profiles where handle like 'stg\_%')                          as test_profiles,
  (select count(*) from public.teams    where slug in ('stg-squad','stg-solo'))              as test_teams,
  (select count(*) from public.waitlist where email like '%@test.invalid')                   as test_waitlist,
  (select count(*) from public.team_members)                                                 as team_members_total,
  (select count(*) from public.age_confirmations)                                            as age_rows_total,
  (select count(*) from public.legal_acceptances)                                            as acceptance_rows_total,
  (select count(*) from public.highlights)                                                   as highlights_total,
  (select count(*) from public.player_games)                                                 as games_total,
  (select count(*) from auth.users)                                                          as users_total;
