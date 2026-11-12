-- Player billing checks (after all migrations through 20261111000300). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  t text; n int; b boolean; ts timestamptz := '2026-12-01 12:00+00';
begin
  insert into auth.users (id, aud, role, email) values (ua, 'authenticated', 'authenticated', 'a@test.invalid'), (ub, 'authenticated', 'authenticated', 'b@test.invalid');

  -- webhook functions work and are idempotent (run as the service role / postgres)
  b := public.billing_record_event('evt_1', 'customer.subscription.created', false); r := array_append(r, case when b then 'PASS a new event is recorded' else 'FAIL new event not recorded' end);
  b := public.billing_record_event('evt_1', 'customer.subscription.created', false); r := array_append(r, case when b then 'PASS an event that did not finish is processed again (Stripe retry)' else 'FAIL retry blocked' end);
  perform public.billing_finish_event('evt_1', 'applied');
  b := public.billing_record_event('evt_1', 'customer.subscription.created', false); r := array_append(r, case when not b then 'PASS a replay of an applied event is detected' else 'FAIL replay not detected' end);
  r := array_append(r, case when exists (select 1 from public.stripe_events where event_id = 'evt_1' and outcome = 'applied') then 'PASS an event outcome is stored' else 'FAIL outcome' end);

  t := public.billing_apply_subscription(gen_random_uuid(), 'sub_x', 'cus_x', 'pro', 'month', 'active', 'price_pm', ts + interval '30 days', false, ts); r := array_append(r, case when t = 'not_found' then 'PASS an unknown profile is refused' else 'FAIL unknown profile: ' || t end);
  t := public.billing_apply_subscription(ua, 'sub_a', 'cus_a', 'pro', 'month', 'active', 'price_pm', ts + interval '30 days', false, ts); r := array_append(r, case when t = 'applied' then 'PASS Pro monthly applied' else 'FAIL pro monthly: ' || t end);
  t := public.billing_apply_subscription(ua, 'sub_a', 'cus_a', 'pro', 'year', 'active', 'price_py', ts + interval '365 days', false, ts + interval '1 hour'); r := array_append(r, case when t = 'applied' and exists (select 1 from public.subscriptions where stripe_subscription_id = 'sub_a' and billing_interval = 'year') then 'PASS Pro annual applied (a change from monthly)' else 'FAIL pro annual: ' || t end);
  t := public.billing_apply_subscription(ua, 'sub_a', 'cus_a', 'pro', 'month', 'canceled', 'price_pm', null, false, ts - interval '1 day'); r := array_append(r, case when t = 'stale' then 'PASS an older event is ignored' else 'FAIL stale: ' || t end);
  begin perform public.billing_apply_subscription(ub, 'sub_t', 'cus_t', 'team', 'year', 'active', 'price_tm', null, false, ts); r := array_append(r, 'FAIL team annual accepted'); exception when check_violation then r := array_append(r, 'PASS Team is monthly only'); end;
  begin perform public.billing_apply_subscription(ub, 'sub_s', 'cus_s', 'scout', 'year', 'active', 'price_sm', null, false, ts); r := array_append(r, 'FAIL scout annual accepted'); exception when check_violation then r := array_append(r, 'PASS Scout is monthly only'); end;
  begin perform public.billing_apply_subscription(ub, 'sub_e', 'cus_e', 'enterprise', 'month', 'active', 'price_e', null, false, ts); r := array_append(r, 'FAIL unknown plan accepted'); exception when check_violation then r := array_append(r, 'PASS an unknown plan is refused'); end;
  t := public.billing_apply_subscription(ub, 'sub_b', 'cus_a', 'team', 'month', 'active', 'price_tm', null, false, ts); r := array_append(r, case when t = 'customer_mismatch' then 'PASS one Stripe customer cannot serve two players' else 'FAIL shared customer: ' || t end);
  t := public.billing_apply_subscription(ub, 'sub_b', 'cus_b', 'team', 'month', 'active', 'price_tm', null, false, ts); r := array_append(r, case when t = 'applied' then 'PASS Team monthly applied' else 'FAIL team: ' || t end);
  t := public.billing_apply_subscription(ub, 'sub_a', 'cus_b', 'pro', 'month', 'active', 'price_pm', null, false, ts + interval '2 hours'); r := array_append(r, case when t = 'customer_mismatch' then 'PASS a subscription cannot move to another player' else 'FAIL moved subscription: ' || t end);

  -- failed payment and grace bookkeeping
  t := public.billing_payment_event('sub_b', 'failed', ts + interval '1 day'); r := array_append(r, case when t = 'applied' then 'PASS a failed payment is recorded' else 'FAIL failed: ' || t end);
  t := public.billing_payment_event('sub_b', 'failed', ts + interval '3 days');
  r := array_append(r, case when exists (select 1 from public.subscriptions where stripe_subscription_id = 'sub_b' and payment_failed_at = ts + interval '1 day') then 'PASS the first failure time is kept (the grace period counts from it)' else 'FAIL first failure overwritten' end);
  t := public.billing_payment_event('sub_none', 'failed', ts); r := array_append(r, case when t = 'not_found' then 'PASS an unknown subscription is reported so the webhook can retry' else 'FAIL unknown sub: ' || t end);
  t := public.billing_apply_subscription(ub, 'sub_b', 'cus_b', 'team', 'month', 'past_due', 'price_tm', null, false, ts + interval '4 days');
  r := array_append(r, case when exists (select 1 from public.subscriptions where stripe_subscription_id = 'sub_b' and status = 'past_due' and payment_failed_at is not null) then 'PASS past_due keeps the failure time' else 'FAIL past_due' end);
  t := public.billing_payment_event('sub_b', 'paid', ts + interval '5 days');
  r := array_append(r, case when exists (select 1 from public.subscriptions where stripe_subscription_id = 'sub_b' and payment_failed_at is null and last_paid_at = ts + interval '5 days') then 'PASS a paid invoice clears the failure' else 'FAIL paid' end);
  begin perform public.billing_payment_event('sub_b', 'refunded', ts); r := array_append(r, 'FAIL unknown kind accepted'); exception when others then r := array_append(r, 'PASS an unknown payment kind is refused'); end;

  -- anon
  set local role anon;
  begin perform 1 from public.subscriptions; r := array_append(r, 'FAIL anon reads subscriptions'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read subscriptions'); end;
  begin perform 1 from public.billing_customers; r := array_append(r, 'FAIL anon reads customers'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read billing customers'); end;
  begin perform 1 from public.stripe_events; r := array_append(r, 'FAIL anon reads events'); exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read events'); end;
  reset role;

  -- an owner reads only their own rows, never Stripe ids, and writes nothing
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.subscriptions; r := array_append(r, case when n = 1 then 'PASS a player sees only their own subscription' else 'FAIL subscriptions visible: ' || n end);
  select count(*) into n from public.subscriptions where profile_id = ua; r := array_append(r, case when n = 0 then 'PASS another player''s subscription is invisible' else 'FAIL stranger visible' end);
  begin perform stripe_subscription_id from public.subscriptions; r := array_append(r, 'FAIL stripe subscription id readable'); exception when insufficient_privilege then r := array_append(r, 'PASS Stripe subscription ids are not readable'); end;
  begin perform stripe_customer_id from public.billing_customers; r := array_append(r, 'FAIL stripe customer id readable'); exception when insufficient_privilege then r := array_append(r, 'PASS Stripe customer ids are not readable'); end;
  begin perform 1 from public.stripe_events; r := array_append(r, 'FAIL events readable'); exception when insufficient_privilege then r := array_append(r, 'PASS webhook events are not readable'); end;
  begin update public.subscriptions set plan = 'scout' where profile_id = ub; r := array_append(r, 'FAIL a player edited their plan'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot edit their plan'); end;
  begin insert into public.subscriptions (stripe_subscription_id, profile_id, plan, billing_interval, status, stripe_price_id, last_event_at) values ('sub_self', ub, 'scout', 'month', 'active', 'p', now()); r := array_append(r, 'FAIL a player created a subscription'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot create a subscription'); end;
  begin delete from public.subscriptions where profile_id = ub; r := array_append(r, 'FAIL a player deleted a subscription'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot delete a subscription'); end;
  begin perform public.billing_apply_subscription(ub, 'sub_z', 'cus_z', 'scout', 'month', 'active', 'p', null, false, now()); r := array_append(r, 'FAIL a player called billing_apply_subscription'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot call the webhook functions'); end;
  begin perform public.billing_record_event('evt_x', 't', false); r := array_append(r, 'FAIL a player recorded an event'); exception when insufficient_privilege then r := array_append(r, 'PASS a player cannot record events'); end;
  reset role;

  -- deleting the profile removes billing rows
  delete from public.profiles where id = ub;
  select count(*) into n from public.subscriptions where profile_id = ub; r := array_append(r, case when n = 0 then 'PASS billing rows follow the profile' else 'FAIL orphan rows' end);

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
