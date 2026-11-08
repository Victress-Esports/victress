-- Funnel event checks (after all migrations through 20261108000200). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  n int;
begin
  insert into auth.users (id, aud, role, email) values (ua, 'authenticated', 'authenticated', 'a@test.invalid');

  set local role anon;
  begin perform 1 from public.funnel_events; r := array_append(r, 'FAIL anon reads events'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read events'); end;
  begin insert into public.funnel_events (name) values ('registration_started'); r := array_append(r, 'FAIL anon wrote an event'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot write events'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform 1 from public.funnel_events; r := array_append(r, 'FAIL a signed in user reads events'); exception when insufficient_privilege then r := array_append(r, 'PASS a signed in user cannot read events'); end;
  begin insert into public.funnel_events (name, profile_id) values ('profile_completed', ua); r := array_append(r, 'FAIL a signed in user wrote an event'); exception when insufficient_privilege then r := array_append(r, 'PASS a signed in user cannot write events'); end;
  reset role;

  set local role service_role;
  insert into public.funnel_events (name, props) values ('registration_started', '{"method":"email"}');
  insert into public.funnel_events (name, props) values ('registration_started', '{"method":"email"}');
  select count(*) into n from public.funnel_events where name = 'registration_started' and profile_id is null;
  r := array_append(r, case when n = 2 then 'PASS anonymous started events carry no identity and may repeat' else 'FAIL anonymous events' end);
  insert into public.funnel_events (name, profile_id) values ('registration_completed', ua);
  begin insert into public.funnel_events (name, profile_id) values ('registration_completed', ua); r := array_append(r, 'FAIL once event repeated'); exception when unique_violation then r := array_append(r, 'PASS once per player events are recorded once'); end;
  insert into public.funnel_events (name, profile_id) values ('return_visit', ua);
  begin insert into public.funnel_events (name, profile_id) values ('return_visit', ua); r := array_append(r, 'FAIL two return visits in a day'); exception when unique_violation then r := array_append(r, 'PASS one return visit per day'); end;
  insert into public.funnel_events (name, profile_id, day) values ('return_visit', ua, current_date + 1);
  r := array_append(r, 'PASS a return visit on another day is recorded');
  begin insert into public.funnel_events (name) values ('profile_completed'); r := array_append(r, 'FAIL identity free profile event'); exception when check_violation then r := array_append(r, 'PASS only the anonymous event may omit the profile'); end;
  begin insert into public.funnel_events (name, profile_id) values ('page_view', ua); r := array_append(r, 'FAIL unknown event name'); exception when check_violation then r := array_append(r, 'PASS only the six named events are accepted'); end;
  begin insert into public.funnel_events (name, props) values ('registration_started', jsonb_build_object('x', repeat('a', 300))); r := array_append(r, 'FAIL big props'); exception when check_violation then r := array_append(r, 'PASS props are limited in size'); end;
  reset role;
  delete from public.profiles where id = ua;
  select count(*) into n from public.funnel_events where profile_id = ua;
  r := array_append(r, case when n = 0 then 'PASS events are deleted with the profile' else 'FAIL events survived profile deletion' end);
  -- retention: rows older than 12 months are deleted by purge_funnel_events, newer rows stay
  set local role service_role;
  insert into public.funnel_events (name, props, created_at) values ('registration_started', '{}', now() - interval '13 months'), ('registration_started', '{}', now() - interval '11 months'), ('registration_started', '{}', now());
  select public.purge_funnel_events(12) into n;
  r := array_append(r, case when n = 1 then 'PASS purge deletes only rows older than 12 months' else 'FAIL purge deleted ' || n end);
  begin perform public.purge_funnel_events(0); r := array_append(r, 'FAIL zero month retention accepted'); exception when others then r := array_append(r, 'PASS a retention under 1 month is refused'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.purge_funnel_events(12); r := array_append(r, 'FAIL a signed in user can purge'); exception when insufficient_privilege then r := array_append(r, 'PASS a signed in user cannot call purge'); end;
  reset role;
  set local role anon;
  begin perform public.purge_funnel_events(12); r := array_append(r, 'FAIL anon can purge'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot call purge'); end;
  reset role;

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
