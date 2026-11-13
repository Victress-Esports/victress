-- Age gate and legal acceptance checks (after all migrations through 20261110000100). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  n int;
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid'), (ub, 'authenticated', 'authenticated', 'b@test.invalid');

  set local role anon;
  begin perform 1 from public.age_confirmations; r := array_append(r, 'FAIL anon reads ages');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read age confirmations'); end;
  begin perform 1 from public.legal_acceptances; r := array_append(r, 'FAIL anon reads acceptances');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read acceptances'); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin insert into public.legal_acceptances (profile_id, document, version) values (ua, 'terms', '2026-11-07'); r := array_append(r, 'FAIL accepted before age confirmation');
  exception when others then r := array_append(r, case when sqlerrm = 'age_confirmation_required' then 'PASS acceptance needs an age confirmation first' else 'FAIL wrong error ' || sqlerrm end); end;

  begin insert into public.age_confirmations (profile_id, birth_date) values (ua, (current_date - interval '12 years 364 days')::date); r := array_append(r, 'FAIL under 13 accepted');
  exception when others then r := array_append(r, case when sqlerrm = 'under_minimum_age' then 'PASS under 13 refused by the database' else 'FAIL wrong error ' || sqlerrm end); end;
  begin insert into public.age_confirmations (profile_id, birth_date) values (ua, current_date + 1); r := array_append(r, 'FAIL future birth date accepted');
  exception when others then r := array_append(r, 'PASS future birth date refused'); end;
  begin insert into public.age_confirmations (profile_id, birth_date) values (ub, date '2000-01-01'); r := array_append(r, 'FAIL wrote someone else''s age');
  exception when insufficient_privilege then r := array_append(r, 'PASS cannot confirm age for another account'); end;

  insert into public.age_confirmations (profile_id, birth_date) values (ua, (current_date - interval '13 years')::date);
  r := array_append(r, 'PASS exactly 13 today is accepted');
  begin insert into public.age_confirmations (profile_id, birth_date) values (ua, date '1999-01-01'); r := array_append(r, 'FAIL second age row');
  exception when unique_violation then r := array_append(r, 'PASS only one age confirmation per account'); end;
  begin update public.age_confirmations set birth_date = date '1990-01-01' where profile_id = ua; r := array_append(r, 'FAIL age edited');
  exception when insufficient_privilege then r := array_append(r, 'PASS player cannot edit the age confirmation'); end;
  begin delete from public.age_confirmations where profile_id = ua; r := array_append(r, 'FAIL age deleted');
  exception when insufficient_privilege then r := array_append(r, 'PASS player cannot delete the age confirmation'); end;

  insert into public.legal_acceptances (profile_id, document, version) values (ua, 'terms', '2026-11-07'), (ua, 'privacy', '2026-11-07');
  select count(*) into n from public.legal_acceptances; r := array_append(r, case when n = 2 then 'PASS acceptances recorded with version' else 'FAIL count ' || n end);
  select count(*) into n from public.legal_acceptances where accepted_at is not null and accepted_at > now() - interval '1 minute'; r := array_append(r, case when n = 2 then 'PASS acceptance time recorded' else 'FAIL time' end);
  insert into public.legal_acceptances (profile_id, document, version) values (ua, 'terms', '2026-12-01');
  select count(*) into n from public.legal_acceptances where document = 'terms'; r := array_append(r, case when n = 2 then 'PASS a new terms version adds a row; the old row stays' else 'FAIL history' end);
  begin insert into public.legal_acceptances (profile_id, document, version) values (ua, 'terms', '2026-11-07'); r := array_append(r, 'FAIL duplicate acceptance');
  exception when unique_violation then r := array_append(r, 'PASS the same version is recorded once'); end;
  begin insert into public.legal_acceptances (profile_id, document, version) values (ua, 'cookies', '2026-11-07'); r := array_append(r, 'FAIL unknown document');
  exception when check_violation then r := array_append(r, 'PASS only terms and privacy'); end;
  begin insert into public.legal_acceptances (profile_id, document, version) values (ua, 'terms', 'latest'); r := array_append(r, 'FAIL free text version');
  exception when check_violation then r := array_append(r, 'PASS version must be a date'); end;
  begin update public.legal_acceptances set version = '2026-01-01'; r := array_append(r, 'FAIL acceptance edited');
  exception when insufficient_privilege then r := array_append(r, 'PASS acceptances cannot be edited'); end;
  begin delete from public.legal_acceptances; r := array_append(r, 'FAIL acceptance deleted');
  exception when insufficient_privilege then r := array_append(r, 'PASS acceptances cannot be deleted'); end;
  begin insert into public.legal_acceptances (profile_id, document, version) values (ub, 'terms', '2026-11-07'); r := array_append(r, 'FAIL accepted for another account');
  exception when others then r := array_append(r, 'PASS cannot accept for another account'); end;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  select count(*) into n from public.age_confirmations; r := array_append(r, case when n = 0 then 'PASS another account sees no age confirmations' else 'FAIL age leak' end);
  select count(*) into n from public.legal_acceptances; r := array_append(r, case when n = 0 then 'PASS another account sees no acceptances' else 'FAIL acceptance leak' end);
  reset role;

  delete from auth.users where id = ua;
  select count(*) into n from public.age_confirmations where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS deleting the account removes the age confirmation' else 'FAIL age orphan' end);
  select count(*) into n from public.legal_acceptances where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS deleting the account removes acceptances' else 'FAIL acceptance orphan' end);

  raise exception E'\n%', array_to_string(r, E'\n');
end $$;
