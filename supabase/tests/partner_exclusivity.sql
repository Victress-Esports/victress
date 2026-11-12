-- Partner Category Exclusivity checks (after all migrations through 20261111000100). Rolls itself back; results are in the error message.
-- Covers the four plans' database side: Community, Supporting, Anchor, and Anchor with Category Exclusivity (a request, an approval,
-- a Stripe invoice and a confirmed payment; never granted by checkout, never by the person asking).
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();  -- owner, Anchor, active
  ub uuid := gen_random_uuid();  -- owner, Supporting, active
  uc uuid := gen_random_uuid();  -- owner, Community
  ud uuid := gen_random_uuid();  -- no organization
  ue uuid := gen_random_uuid();  -- owner, Anchor, active (a second Anchor organization)
  uf uuid := gen_random_uuid();  -- owner, Anchor, past_due
  ug uuid := gen_random_uuid();  -- member (not owner) of a third Anchor organization
  uh uuid := gen_random_uuid();  -- owner of that third Anchor organization
  oa uuid; ob uuid; oc uuid; oe uuid; of_ uuid; oh uuid;
  ea uuid; ee uuid; eh uuid; ex uuid;
  j jsonb; t text; n int; i int;
begin
  insert into auth.users (id, aud, role, email) select u, 'authenticated', 'authenticated', substr(u::text, 1, 8) || '@test.invalid'
    from unnest(array[ua, ub, uc, ud, ue, uf, ug, uh]) u;

  -- organizations (created the way a person creates them: always on Community)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated; j := public.create_partner_org('Org A', 'company', null, 'v1', true); reset role; oa := (j ->> 'org_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated; j := public.create_partner_org('Org B', 'company', null, 'v1', true); reset role; ob := (j ->> 'org_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated; j := public.create_partner_org('Org C', 'nonprofit', null, 'v1', true); reset role; oc := (j ->> 'org_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
  set local role authenticated; j := public.create_partner_org('Org E', 'university', null, 'v1', true); reset role; oe := (j ->> 'org_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', uf, 'role', 'authenticated')::text, true);
  set local role authenticated; j := public.create_partner_org('Org F', 'league', null, 'v1', true); reset role; of_ := (j ->> 'org_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', uh, 'role', 'authenticated')::text, true);
  set local role authenticated; j := public.create_partner_org('Org H', 'company', null, 'v1', true); reset role; oh := (j ->> 'org_id')::uuid;
  insert into public.partner_members (profile_id, org_id, role) values (ug, oh, 'member');

  -- billing as the webhook applies it (service role / postgres)
  t := public.partner_apply_billing(oa, 'anchor', 'annual', 'active', 'cus_A', 'sub_A', false, now() - interval '1 hour');
  t := public.partner_apply_billing(ob, 'supporting', 'annual', 'active', 'cus_B', 'sub_B', false, now() - interval '1 hour');
  t := public.partner_apply_billing(oe, 'anchor', 'annual', 'active', 'cus_E', 'sub_E', false, now() - interval '1 hour');
  t := public.partner_apply_billing(of_, 'anchor', 'annual', 'past_due', 'cus_F', 'sub_F', false, now() - interval '1 hour');
  t := public.partner_apply_billing(oh, 'anchor', 'annual', 'active', 'cus_H', 'sub_H', false, now() - interval '1 hour');

  -- ------------------------------------------------------------ anon
  set local role anon;
  begin perform 1 from public.partner_exclusivity; r := array_append(r, 'FAIL anon reads exclusivity');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read exclusivity'); end;
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (oa, 'Anything', 12); r := array_append(r, 'FAIL anon requested exclusivity');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot request exclusivity'); end;
  begin perform public.partner_category_taken('x'); r := array_append(r, 'FAIL anon called partner_category_taken');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot call partner_category_taken'); end;
  reset role;

  -- ------------------------------------------------------------ a signed in account with no organization
  perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_exclusivity; r := array_append(r, case when n = 0 then 'PASS non partner sees no exclusivity records' else 'FAIL non partner sees records' end);
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (oa, 'Peripherals', 12); r := array_append(r, 'FAIL non partner requested exclusivity for another organization');
  exception when insufficient_privilege then r := array_append(r, 'PASS non partner cannot request exclusivity'); end;
  reset role;

  -- ------------------------------------------------------------ plans that cannot request
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (oc, 'Peripherals', 12); r := array_append(r, 'FAIL Community requested exclusivity');
  exception when insufficient_privilege then r := array_append(r, 'PASS a Community Partner cannot request exclusivity'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (ob, 'Peripherals', 12); r := array_append(r, 'FAIL Supporting requested exclusivity');
  exception when insufficient_privilege then r := array_append(r, 'PASS a Supporting Partner cannot request exclusivity'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uf, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (of_, 'Peripherals', 12); r := array_append(r, 'FAIL past_due Anchor requested exclusivity');
  exception when insufficient_privilege then r := array_append(r, 'PASS an Anchor Partner whose subscription is not active cannot request exclusivity'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ug, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (oh, 'Peripherals', 12); r := array_append(r, 'FAIL a non owner member requested exclusivity');
  exception when insufficient_privilege then r := array_append(r, 'PASS only the owner can request exclusivity'); end;
  reset role;

  -- ------------------------------------------------------------ an active Anchor owner requests
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (oa, 'Gaming Peripherals', 6); r := array_append(r, 'FAIL 6 month duration accepted');
  exception when check_violation then r := array_append(r, 'PASS durations are whole years only'); end;
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (oa, 'ab', 12); r := array_append(r, 'FAIL 2 character category accepted');
  exception when check_violation then r := array_append(r, 'PASS a category needs 3 to 80 characters'); end;
  begin insert into public.partner_exclusivity (org_id, category, duration_months, status) values (oa, 'Gaming Peripherals', 12, 'active'); r := array_append(r, 'FAIL a partner set its own status');
  exception when insufficient_privilege then r := array_append(r, 'PASS a partner cannot set status on a request'); end;
  begin insert into public.partner_exclusivity (org_id, category, duration_months, stripe_invoice_id, invoice_status) values (oa, 'Gaming Peripherals', 12, 'in_fake', 'paid'); r := array_append(r, 'FAIL a partner set its own invoice');
  exception when insufficient_privilege then r := array_append(r, 'PASS a partner cannot set an invoice or payment status'); end;
  begin insert into public.partner_exclusivity (org_id, category, duration_months, ends_at) values (oa, 'Gaming Peripherals', 12, now() + interval '5 years'); r := array_append(r, 'FAIL a partner set its own end date');
  exception when insufficient_privilege then r := array_append(r, 'PASS a partner cannot set dates'); end;
  insert into public.partner_exclusivity (org_id, category, duration_months, note) values (oa, 'Gaming Peripherals', 12, 'Peripherals for collegiate programs.') returning id into ea;
  select status into t from public.partner_exclusivity where id = ea; r := array_append(r, case when t = 'requested' then 'PASS a request starts as requested' else 'FAIL status ' || t end);
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (oa, 'Energy Drinks', 12); r := array_append(r, 'FAIL second open request accepted');
  exception when unique_violation then r := array_append(r, 'PASS one open request per organization'); end;
  begin update public.partner_exclusivity set status = 'approved' where id = ea; r := array_append(r, 'FAIL a partner approved its own request');
  exception when insufficient_privilege then r := array_append(r, 'PASS a partner cannot approve its own request'); end;
  begin delete from public.partner_exclusivity where id = ea; r := array_append(r, 'FAIL a partner deleted a request');
  exception when insufficient_privilege then r := array_append(r, 'PASS a partner cannot delete a request'); end;
  r := array_append(r, case when public.partner_exclusivity_active(oa) = false then 'PASS a request alone is not active exclusivity' else 'FAIL request counted as active' end);
  reset role;

  -- another organization never sees it
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_exclusivity; r := array_append(r, case when n = 0 then 'PASS another organization cannot see a request' else 'FAIL request visible to another organization' end);
  reset role;

  -- ------------------------------------------------------------ the same category, requested twice, approved once
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.partner_exclusivity (org_id, category, duration_months) values (oe, '  gaming   PERIPHERALS ', 24) returning id into ee;
  r := array_append(r, 'PASS two organizations can both ask for a category that nobody holds yet');
  reset role;

  update public.partner_exclusivity set status = 'approved' where id = ea;
  r := array_append(r, case when exists (select 1 from public.partner_exclusivity where id = ea and approved_at is not null) then 'PASS approval stamps approved_at' else 'FAIL approved_at not set' end);
  begin update public.partner_exclusivity set status = 'approved' where id = ee; r := array_append(r, 'FAIL the same category was approved twice');
  exception when unique_violation then r := array_append(r, 'PASS the same category cannot be approved twice (case and spacing ignored)'); end;

  -- once held, nobody else can even request it
  update public.partner_exclusivity set status = 'withdrawn' where id = ee;
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when public.partner_category_taken('GAMING PERIPHERALS') then 'PASS an approved category reports as taken' else 'FAIL taken category not reported' end);
  begin insert into public.partner_exclusivity (org_id, category, duration_months) values (oe, 'Gaming Peripherals', 12); r := array_append(r, 'FAIL requested a category that is held');
  exception when insufficient_privilege then r := array_append(r, 'PASS a held category cannot be requested again'); end;
  reset role;

  -- ------------------------------------------------------------ invoice and payment (service role only)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.partner_exclusivity_attach_invoice(ea, 'cus_A', 'in_1', 'https://invoice.invalid/1'); r := array_append(r, 'FAIL a partner attached an invoice');
  exception when insufficient_privilege then r := array_append(r, 'PASS partners cannot attach an invoice'); end;
  begin perform public.partner_exclusivity_apply_invoice('in_1', 'paid', now()); r := array_append(r, 'FAIL a partner marked an invoice paid');
  exception when insufficient_privilege then r := array_append(r, 'PASS partners cannot mark an invoice paid'); end;
  reset role;

  t := public.partner_exclusivity_attach_invoice(gen_random_uuid(), 'cus_A', 'in_x', 'https://invoice.invalid/x'); r := array_append(r, case when t = 'not_found' then 'PASS attach: unknown request' else 'FAIL attach unknown: ' || t end);
  -- a request that is not approved cannot be invoiced
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
  t := public.partner_exclusivity_attach_invoice(ee, 'cus_E', 'in_e', 'https://invoice.invalid/e'); r := array_append(r, case when t = 'not_approved' then 'PASS only an approved request can be invoiced' else 'FAIL invoiced a withdrawn request: ' || t end);
  t := public.partner_exclusivity_attach_invoice(ea, 'cus_A', 'in_1', 'https://invoice.invalid/1'); r := array_append(r, case when t = 'ok' then 'PASS invoice attached to the approved request' else 'FAIL attach: ' || t end);
  t := public.partner_exclusivity_attach_invoice(ea, 'cus_A', 'in_2', 'https://invoice.invalid/2'); r := array_append(r, case when t = 'invoice_exists' then 'PASS a second invoice is refused' else 'FAIL second invoice: ' || t end);

  t := public.partner_exclusivity_apply_invoice('in_unknown', 'paid', now()); r := array_append(r, case when t = 'not_found' then 'PASS an unknown invoice grants nothing' else 'FAIL unknown invoice: ' || t end);
  t := public.partner_exclusivity_apply_invoice('in_1', 'payment_failed', now()); r := array_append(r, case when t = 'recorded' then 'PASS a failed payment is recorded' else 'FAIL failed: ' || t end);
  select status into t from public.partner_exclusivity where id = ea; r := array_append(r, case when t = 'approved' then 'PASS a failed payment grants nothing' else 'FAIL status after failure ' || t end);
  begin perform public.partner_exclusivity_apply_invoice('in_1', 'refunded', now()); r := array_append(r, 'FAIL unknown event accepted');
  exception when others then r := array_append(r, 'PASS an unknown invoice event is refused'); end;

  t := public.partner_exclusivity_apply_invoice('in_1', 'paid', '2026-12-01 12:00+00'); r := array_append(r, case when t = 'activated' then 'PASS confirmed payment activates exclusivity' else 'FAIL paid: ' || t end);
  r := array_append(r, case when exists (select 1 from public.partner_exclusivity where id = ea and status = 'active' and ends_at = '2027-12-01 12:00+00'::timestamptz and invoice_status = 'paid') then 'PASS the term runs from the payment for the requested duration' else 'FAIL term' end);
  t := public.partner_exclusivity_apply_invoice('in_1', 'paid', now()); r := array_append(r, case when t = 'already_active' then 'PASS a repeated paid event changes nothing' else 'FAIL repeat: ' || t end);
  r := array_append(r, case when exists (select 1 from public.partner_organizations where id = oa and plan = 'anchor' and billing_interval = 'annual') then 'PASS the stored plan stays Anchor; exclusivity is its own record' else 'FAIL plan changed' end);

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when public.partner_exclusivity_active(oa) then 'PASS the owner sees active exclusivity' else 'FAIL not active for the owner' end);
  begin update public.partner_exclusivity set ends_at = now() + interval '50 years' where id = ea; r := array_append(r, 'FAIL a partner extended its own term');
  exception when insufficient_privilege then r := array_append(r, 'PASS a partner cannot extend its own term'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when not public.partner_exclusivity_active(oa) then 'PASS another organization is not reported as exclusive' else 'FAIL active leaked to another organization' end);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when not public.partner_exclusivity_active(oa) then 'PASS a non partner is not reported as exclusive' else 'FAIL active leaked to a non partner' end);
  reset role;

  -- an active term that has run out stops counting
  update public.partner_exclusivity set ends_at = now() - interval '1 day' where id = ea;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when not public.partner_exclusivity_active(oa) then 'PASS an expired term no longer counts' else 'FAIL expired term counts' end);
  reset role;
  update public.partner_exclusivity set ends_at = now() + interval '300 days' where id = ea;

  -- ------------------------------------------------------------ withdraw
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := public.partner_exclusivity_withdraw(ea); r := array_append(r, case when t = 'not_open' then 'PASS an active exclusivity cannot be withdrawn here' else 'FAIL withdrew active: ' || t end);
  reset role;

  -- ------------------------------------------------------------ void, then a new invoice; unpaid Anchor cannot be activated by a late payment
  perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.partner_exclusivity (org_id, category, duration_months) values (oe, 'Energy Drinks', 12) returning id into ex;
  t := public.partner_exclusivity_withdraw(ex); r := array_append(r, case when t = 'ok' then 'PASS the owner withdraws an open request' else 'FAIL withdraw: ' || t end);
  insert into public.partner_exclusivity (org_id, category, duration_months) values (oe, 'Energy Drinks', 12) returning id into ee;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := public.partner_exclusivity_withdraw(ee); r := array_append(r, case when t = 'not_owner' then 'PASS another organization cannot withdraw it' else 'FAIL foreign withdraw: ' || t end);
  reset role;
  update public.partner_exclusivity set status = 'approved' where id = ee;
  t := public.partner_exclusivity_attach_invoice(ee, 'cus_E', 'in_e1', 'https://invoice.invalid/e1');
  t := public.partner_exclusivity_apply_invoice('in_e1', 'void', now()); r := array_append(r, case when t = 'recorded' then 'PASS a voided invoice is released' else 'FAIL void: ' || t end);
  t := public.partner_exclusivity_attach_invoice(ee, 'cus_E', 'in_e2', 'https://invoice.invalid/e2'); r := array_append(r, case when t = 'ok' then 'PASS a new invoice can follow a void' else 'FAIL new invoice: ' || t end);
  t := public.partner_apply_billing(oe, 'anchor', 'annual', 'past_due', 'cus_E', 'sub_E', false, now() - interval '30 minutes');
  t := public.partner_exclusivity_apply_invoice('in_e2', 'paid', now()); r := array_append(r, case when t = 'not_anchor' then 'PASS payment does not activate exclusivity on an Anchor plan that is not active' else 'FAIL paid on past_due: ' || t end);

  -- ------------------------------------------------------------ the Anchor subscription ends: exclusivity ends and the category is free
  t := public.partner_apply_billing(oa, null, null, 'canceled', 'cus_A', 'sub_A', true, now());
  select status into t from public.partner_exclusivity where id = ea; r := array_append(r, case when t = 'ended' then 'PASS ending the Anchor subscription ends exclusivity' else 'FAIL status ' || t end);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when not public.partner_exclusivity_active(oa) then 'PASS no exclusivity after the plan ends' else 'FAIL still exclusive' end);
  r := array_append(r, case when not public.partner_category_taken('Gaming Peripherals') then 'PASS the category is free again' else 'FAIL category still held' end);
  reset role;
  t := public.partner_apply_billing(oe, 'supporting', 'annual', 'active', 'cus_E', 'sub_E', false, now() + interval '1 minute');
  select status into t from public.partner_exclusivity where id = ee; r := array_append(r, case when t = 'ended' then 'PASS moving off Anchor ends an approved request' else 'FAIL status ' || t end);

  -- ------------------------------------------------------------ cap
  begin
    for i in 1..12 loop insert into public.partner_exclusivity (org_id, category, duration_months, status) values (oh, 'Capped ' || i, 12, 'withdrawn'); end loop;
    r := array_append(r, 'FAIL exclusivity cap not enforced');
  exception when sqlstate 'P0001' then r := array_append(r, 'PASS exclusivity requests are capped at 10 per organization'); end;

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
