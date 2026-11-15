-- November 15 Privacy Policy: renewed acceptance, records and the Discord check (after all migrations). Rolls itself back; results are
-- in the error message. Mirrors what production users have today (Terms and Privacy of 2026-11-10).
do $$
declare
  r text[] := '{}';
  u uuid := gen_random_uuid();
  t0 timestamptz; n int; row_time timestamptz;
begin
  insert into auth.users (id, aud, role, email) values (u, 'authenticated', 'authenticated', 'n15@test.invalid');
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.age_confirmations (profile_id, birth_date) values (u, '2000-01-01');
  insert into public.legal_acceptances (profile_id, document, version) values (u, 'terms', '2026-11-10'), (u, 'privacy', '2026-11-10');
  reset role;
  select accepted_at into t0 from public.legal_acceptances where profile_id = u and document = 'privacy' and version = '2026-11-10';

  if not public.discord_consent_current(u, '2026-11-10', '2026-11-15') then r := array_append(r, 'PASS Discord: a player on the November 10 Privacy Policy is refused until they accept November 15');
  else r := array_append(r, 'FAIL Discord passes on the old version'); end if;

  set local role authenticated;
  -- the player cannot backdate or forge the time
  begin insert into public.legal_acceptances (profile_id, document, version, accepted_at) values (u, 'privacy', '2026-11-15', '2020-01-01');
    r := array_append(r, 'FAIL player set accepted_at');
  exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot set the acceptance time'); end;
  insert into public.legal_acceptances (profile_id, document, version) values (u, 'privacy', '2026-11-15');
  begin insert into public.legal_acceptances (profile_id, document, version) values (u, 'privacy', '2026-11-15'); r := array_append(r, 'FAIL duplicate acceptance');
  exception when unique_violation then r := array_append(r, 'PASS one row per document version'); end;
  begin update public.legal_acceptances set version = '2026-11-15' where profile_id = u and version = '2026-11-10'; r := array_append(r, 'FAIL player rewrote history');
  exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot rewrite an earlier acceptance'); end;
  begin delete from public.legal_acceptances where profile_id = u; r := array_append(r, 'FAIL player deleted acceptances');
  exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot delete acceptances'); end;
  begin insert into public.legal_acceptances (profile_id, document, version) values (u, 'privacy', 'Nov 15'); r := array_append(r, 'FAIL malformed version');
  exception when check_violation then r := array_append(r, 'PASS a version must be a date (YYYY-MM-DD)'); end;
  reset role;

  select count(*) into n from public.legal_acceptances where profile_id = u;
  select accepted_at into row_time from public.legal_acceptances where profile_id = u and document = 'privacy' and version = '2026-11-15';
  if n = 3 and row_time is not null and row_time >= t0 then r := array_append(r, 'PASS the November 15 row has the database time; the November 10 rows are kept (3 rows)');
  else r := array_append(r, 'FAIL rows ' || n); end if;
  if (select accepted_at from public.legal_acceptances where profile_id = u and document = 'privacy' and version = '2026-11-10') = t0 then r := array_append(r, 'PASS the earlier acceptance time is unchanged');
  else r := array_append(r, 'FAIL earlier time changed'); end if;
  if public.discord_consent_current(u, '2026-11-10', '2026-11-15') then r := array_append(r, 'PASS Discord: after accepting November 15 the player passes');
  else r := array_append(r, 'FAIL Discord still refuses'); end if;
  if not public.discord_consent_current(u, '2026-11-20', '2026-11-15') then r := array_append(r, 'PASS Discord: a newer Terms version would refuse again');
  else r := array_append(r, 'FAIL terms'); end if;

  delete from auth.users where id = u;
  if not exists (select 1 from public.legal_acceptances where profile_id = u) then r := array_append(r, 'PASS deleting the account deletes its acceptance records');
  else r := array_append(r, 'FAIL cascade'); end if;
  raise exception E'\n%', array_to_string(r, E'\n');
end;
$$;
