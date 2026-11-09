-- Partner account checks (after all migrations through 20261109000100). Rolls itself back; results are in the error message.
do $$
declare
  r text[] := '{}';
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  uc uuid := gen_random_uuid();   -- a player with no organization
  oa uuid; ob uuid;
  opp_a uuid; opp_draft uuid; opp_b uuid;
  j jsonb; t text; n int; i int;
  v text;
  pu uuid;
begin
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'a@test.invalid'),
    (ub, 'authenticated', 'authenticated', 'b@test.invalid'),
    (uc, 'authenticated', 'authenticated', 'c@test.invalid');

  r := array_append(r, case when not public.handle_is_allowed('partner') and public.handle_is_allowed('partner_one') then 'PASS "partner" is a reserved handle (it is a route)' else 'FAIL partner handle reservation' end);

  -- ------------------------------------------------------------ anon gets nothing
  set local role anon;
  begin perform 1 from public.partner_organizations; r := array_append(r, 'FAIL anon reads organizations');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read organizations'); end;
  begin perform 1 from public.partner_members; r := array_append(r, 'FAIL anon reads members');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read members'); end;
  begin perform 1 from public.partner_participation; r := array_append(r, 'FAIL anon reads participation');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read participation'); end;
  begin perform 1 from public.partner_opportunities; r := array_append(r, 'FAIL anon reads opportunities');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read opportunities'); end;
  begin perform 1 from public.partner_support_offers; r := array_append(r, 'FAIL anon reads offers');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read support offers'); end;
  begin perform 1 from public.partner_impact_records; r := array_append(r, 'FAIL anon reads impact');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read impact records'); end;
  begin perform 1 from public.partner_findings; r := array_append(r, 'FAIL anon reads findings');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read findings'); end;
  begin perform public.create_partner_org('Anon Org', 'company', null, 'v1', true); r := array_append(r, 'FAIL anon created an organization');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot create an organization'); end;
  begin perform public.partner_ecosystem_summary(); r := array_append(r, 'FAIL anon read the ecosystem summary');
  exception when insufficient_privilege then r := array_append(r, 'PASS anon cannot read the ecosystem summary'); end;
  reset role;

  -- ------------------------------------------------------------ a signed in player with no organization
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when public.partner_org_id() is null then 'PASS non partner has no organization' else 'FAIL non partner has an organization' end);
  r := array_append(r, case when public.partner_ecosystem_summary() is null then 'PASS non partner gets no ecosystem summary' else 'FAIL non partner got the summary' end);
  select count(*) into n from public.partner_findings; r := array_append(r, case when n = 0 then 'PASS non partner sees no findings' else 'FAIL non partner sees findings' end);
  select count(*) into n from public.partner_opportunities; r := array_append(r, case when n = 0 then 'PASS non partner sees no opportunities' else 'FAIL non partner sees opportunities' end);
  begin insert into public.partner_organizations (name, org_type, terms_version, terms_accepted_at, created_by) values ('Sneaky', 'company', 'v1', now(), uc);
    r := array_append(r, 'FAIL direct organization insert allowed');
  exception when insufficient_privilege then r := array_append(r, 'PASS organizations cannot be inserted directly (create_partner_org only)'); end;
  begin insert into public.partner_members (profile_id, org_id) values (uc, gen_random_uuid()); r := array_append(r, 'FAIL direct membership insert allowed');
  exception when insufficient_privilege then r := array_append(r, 'PASS memberships cannot be inserted directly'); end;
  begin insert into public.partner_participation (org_id, way, title, description) values (gen_random_uuid(), 'resources', 'Title', 'A long enough description');
    r := array_append(r, 'FAIL non partner submitted participation');
  exception when insufficient_privilege or foreign_key_violation or sqlstate '42501' then r := array_append(r, 'PASS non partner cannot submit participation'); end;
  j := public.create_partner_org('Test Org', 'company', null, 'v1', false);
  r := array_append(r, case when j ->> 'status' = 'terms_required' then 'PASS authorization and terms are required' else 'FAIL terms not required: ' || coalesce(j::text, 'null') end);
  j := public.create_partner_org('Test Org', 'company', null, '', true);
  r := array_append(r, case when j ->> 'status' = 'terms_required' then 'PASS a terms version is required' else 'FAIL no terms version accepted' end);
  j := public.create_partner_org('Test Org', 'bank', null, 'v1', true);
  r := array_append(r, case when j ->> 'status' = 'invalid_type' then 'PASS organization type is checked' else 'FAIL type not checked' end);
  j := public.create_partner_org('X', 'company', null, 'v1', true);
  r := array_append(r, case when j ->> 'status' = 'invalid_name' then 'PASS short name refused' else 'FAIL short name accepted' end);
  j := public.create_partner_org('Test Org', 'company', 'javascript:alert(1)', 'v1', true);
  r := array_append(r, case when j ->> 'status' = 'invalid_website' then 'PASS website must be http or https' else 'FAIL bad website accepted' end);
  select count(*) into n from public.partner_members; r := array_append(r, case when n = 0 then 'PASS failed attempts created nothing' else 'FAIL failed attempt created a row' end);
  reset role;

  -- ------------------------------------------------------------ A creates an organization
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.create_partner_org('Alpha University', 'university', 'https://alpha.example.edu', 'terms-2026-11-07', true);
  r := array_append(r, case when j ->> 'status' = 'ok' then 'PASS organization created' else 'FAIL create: ' || coalesce(j::text, 'null') end);
  oa := (j ->> 'org_id')::uuid;
  j := public.create_partner_org('Second Org', 'company', null, 'terms-2026-11-07', true);
  r := array_append(r, case when j ->> 'status' = 'already_member' then 'PASS one organization per account' else 'FAIL second organization allowed' end);
  r := array_append(r, case when public.partner_org_id() = oa then 'PASS partner_org_id returns own organization' else 'FAIL partner_org_id' end);
  r := array_append(r, case when public.partner_is_owner(oa) then 'PASS creator is owner' else 'FAIL creator not owner' end);
  r := array_append(r, case when not public.partner_is_paid(oa) then 'PASS new organization is not paid' else 'FAIL new organization is paid' end);
  select plan into t from public.partner_organizations where id = oa; r := array_append(r, case when t = 'community' then 'PASS starts on Community' else 'FAIL starts on ' || t end);
  select terms_version into t from public.partner_organizations where id = oa; r := array_append(r, case when t = 'terms-2026-11-07' then 'PASS terms version stored' else 'FAIL terms version' end);
  select count(*) into n from public.partner_organizations where terms_accepted_at is not null and terms_accepted_at > now() - interval '1 minute';
  r := array_append(r, case when n = 1 then 'PASS terms timestamp stored' else 'FAIL terms timestamp' end);
  begin perform stripe_customer_id from public.partner_organizations; r := array_append(r, 'FAIL partner reads Stripe ids');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot read Stripe ids'); end;
  begin update public.partner_organizations set plan = 'anchor' where id = oa; r := array_append(r, 'FAIL partner set own plan');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot set plan'); end;
  begin update public.partner_organizations set verified = true where id = oa; r := array_append(r, 'FAIL partner set verified');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot set verified'); end;
  begin update public.partner_organizations set subscription_status = 'active' where id = oa; r := array_append(r, 'FAIL partner set subscription status');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot set subscription status'); end;
  update public.partner_organizations set name = 'Alpha University Esports' where id = oa;
  select name into t from public.partner_organizations where id = oa; r := array_append(r, case when t = 'Alpha University Esports' then 'PASS owner edits the name' else 'FAIL owner edit' end);
  reset role;

  -- ------------------------------------------------------------ B creates an organization
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.create_partner_org('Beta Studios', 'company', null, 'terms-2026-11-07', true);
  ob := (j ->> 'org_id')::uuid;
  select count(*) into n from public.partner_organizations; r := array_append(r, case when n = 1 then 'PASS partner sees only their own organization' else 'FAIL partner sees ' || n || ' organizations' end);
  update public.partner_organizations set name = 'Hijack' where id = oa; get diagnostics n = row_count;
  r := array_append(r, case when n = 0 then 'PASS partner cannot edit another organization' else 'FAIL edited another organization' end);
  select count(*) into n from public.partner_members; r := array_append(r, case when n = 1 then 'PASS partner sees only their own membership' else 'FAIL members visible: ' || n end);
  reset role;

  -- verification is cleared when the name changes (a user edit), not by a table editor edit
  perform set_config('request.jwt.claims', '', true);  -- no end user session, like the table editor
  update public.partner_organizations set verified = true, verified_at = now() where id = oa;
  update public.partner_organizations set name = 'Alpha University Esports Club' where id = oa;
  select verified::text into t from public.partner_organizations where id = oa; r := array_append(r, case when t = 'true' then 'PASS table editor edits keep verified' else 'FAIL table editor edit cleared verified' end);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.partner_organizations set website = 'https://alpha-esports.example.edu' where id = oa;
  reset role;
  select verified::text into t from public.partner_organizations where id = oa; r := array_append(r, case when t = 'false' then 'PASS verified clears when the owner changes the website' else 'FAIL verified survived an identity edit' end);

  -- ------------------------------------------------------------ participation
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.partner_participation (org_id, way, title, description) values (oa, 'resources', 'Tournament entry fees', 'We can cover entry fees for collegiate events.');
  select status into t from public.partner_participation where org_id = oa; r := array_append(r, case when t = 'submitted' then 'PASS participation starts as submitted' else 'FAIL status ' || t end);
  begin insert into public.partner_participation (org_id, way, title, description, status) values (oa, 'resources', 'Title', 'A long enough description', 'accepted');
    r := array_append(r, 'FAIL partner set a participation status');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot set participation status'); end;
  begin insert into public.partner_participation (org_id, way, title, description) values (ob, 'resources', 'Title', 'A long enough description');
    r := array_append(r, 'FAIL submitted for another organization');
  exception when insufficient_privilege or sqlstate '42501' then r := array_append(r, 'PASS cannot submit for another organization'); end;
  begin insert into public.partner_participation (org_id, way, title, description) values (oa, 'sponsorship', 'Title', 'A long enough description');
    r := array_append(r, 'FAIL unknown way accepted');
  exception when check_violation then r := array_append(r, 'PASS only the four ways to participate are accepted'); end;
  begin update public.partner_participation set status = 'accepted'; r := array_append(r, 'FAIL partner updated participation');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot update participation'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_participation; r := array_append(r, case when n = 0 then 'PASS another partner cannot see participation' else 'FAIL participation leaked' end);
  reset role;

  -- ------------------------------------------------------------ opportunities
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.partner_opportunities (org_id, type, title, purpose, support_needed) values (oa, 'tournament_support', 'Collegiate open', 'A free open for women competitors.', 'Prize pool and a broadcast crew.');
  select status || '/' || organization_name into t from public.partner_opportunities where org_id = oa;
  r := array_append(r, case when t = 'in_review/Alpha University Esports Club' then 'PASS opportunity starts in review under the organization name' else 'FAIL opportunity default: ' || coalesce(t, 'null') end);
  begin insert into public.partner_opportunities (org_id, type, title, purpose, support_needed, status) values (oa, 'tournament_support', 'Title', 'A long enough purpose.', 'Support needed.', 'published');
    r := array_append(r, 'FAIL partner published an opportunity');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot set opportunity status'); end;
  begin insert into public.partner_opportunities (org_id, type, title, purpose, support_needed, organization_name) values (oa, 'tournament_support', 'Title', 'A long enough purpose.', 'Support needed.', 'Someone Else');
    r := array_append(r, 'FAIL partner set the organization name');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot set the displayed organization name'); end;
  select id into opp_a from public.partner_opportunities where org_id = oa;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_opportunities; r := array_append(r, case when n = 0 then 'PASS an unpublished opportunity is hidden from other partners' else 'FAIL unpublished opportunity visible' end);
  insert into public.partner_opportunities (org_id, type, title, purpose, support_needed) values (ob, 'scholarships', 'Beta scholarship', 'Scholarships for collegiate players.', 'Administration support.');
  select id into opp_b from public.partner_opportunities where org_id = ob;
  reset role;
  -- Victress reviews and publishes (service role)
  set local role service_role;
  update public.partner_opportunities set status = 'published', published_at = now() where id in (opp_a, opp_b);
  insert into public.partner_opportunities (org_id, organization_name, type, title, purpose, support_needed) values (oa, 'Alpha', 'community_initiatives', 'Draft only', 'Not published yet at all.', 'Volunteers needed.') returning id into opp_draft;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_opportunities where id = opp_a; r := array_append(r, case when n = 1 then 'PASS partners see published opportunities of others' else 'FAIL published opportunity hidden' end);
  select count(*) into n from public.partner_opportunities where id = opp_draft; r := array_append(r, case when n = 0 then 'PASS in review opportunities of others stay hidden' else 'FAIL in review opportunity visible' end);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_opportunities; r := array_append(r, case when n = 0 then 'PASS non partner sees no opportunities even when published' else 'FAIL non partner sees published opportunities' end);
  reset role;

  -- ------------------------------------------------------------ support offers
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.partner_support_offers (org_id, opportunity_id, support_type, message) values (ob, opp_a, 'resources', 'We would like to support this.');
    r := array_append(r, 'FAIL a Community partner offered support');
  exception when insufficient_privilege or sqlstate '42501' then r := array_append(r, 'PASS a Community partner cannot offer support'); end;
  reset role;

  -- B upgrades (what the webhook does)
  set local role service_role;
  t := public.partner_apply_billing(ob, 'supporting', 'monthly', 'active', 'cus_B', 'sub_B1', false, now() - interval '10 minutes');
  reset role;
  r := array_append(r, case when t = 'applied' then 'PASS billing event applied' else 'FAIL billing: ' || t end);
  begin set local role authenticated; perform public.partner_apply_billing(ob, 'anchor', 'annual', 'active', 'cus_B', 'sub_B1', false, now());
    r := array_append(r, 'FAIL a partner called partner_apply_billing');
  exception when insufficient_privilege then r := array_append(r, 'PASS partners cannot call partner_apply_billing'); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when public.partner_is_paid(ob) then 'PASS Supporting plan is paid' else 'FAIL Supporting plan not paid' end);
  r := array_append(r, case when not public.partner_is_paid(oa) then 'PASS partner_is_paid is false for another organization' else 'FAIL partner_is_paid leaked another plan' end);
  insert into public.partner_support_offers (org_id, opportunity_id, support_type, message) values (ob, opp_a, 'resources', 'We would like to support this.');
  r := array_append(r, 'PASS a Supporting partner offers support on another organization''s published opportunity');
  begin insert into public.partner_support_offers (org_id, opportunity_id, support_type, message) values (ob, opp_a, 'expertise_mentorship', 'A second offer on the same one.');
    r := array_append(r, 'FAIL duplicate offer accepted');
  exception when unique_violation then r := array_append(r, 'PASS one offer per opportunity'); end;
  begin insert into public.partner_support_offers (org_id, opportunity_id, support_type, message) values (ob, opp_b, 'resources', 'Supporting my own opportunity.');
    r := array_append(r, 'FAIL offered on own opportunity');
  exception when insufficient_privilege or sqlstate '42501' then r := array_append(r, 'PASS cannot offer on own opportunity'); end;
  begin insert into public.partner_support_offers (org_id, opportunity_id, support_type, message) values (ob, opp_draft, 'resources', 'An offer on an unpublished one.');
    r := array_append(r, 'FAIL offered on an unpublished opportunity');
  exception when insufficient_privilege or sqlstate '42501' then r := array_append(r, 'PASS cannot offer on an unpublished opportunity'); end;
  begin insert into public.partner_support_offers (org_id, opportunity_id, support_type, message, status) values (ob, opp_draft, 'resources', 'Setting my own status.', 'accepted');
    r := array_append(r, 'FAIL partner set an offer status');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot set an offer status'); end;
  begin insert into public.partner_support_offers (org_id, opportunity_id, support_type, message) values (oa, opp_b, 'resources', 'Offering for another organization.');
    r := array_append(r, 'FAIL offered as another organization');
  exception when insufficient_privilege or sqlstate '42501' then r := array_append(r, 'PASS cannot offer as another organization'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_support_offers; r := array_append(r, case when n = 0 then 'PASS offers are visible only to the offering organization' else 'FAIL offers leaked' end);
  reset role;

  -- billing events: order, ownership, end of subscription
  set local role service_role;
  t := public.partner_apply_billing(ob, 'anchor', 'annual', 'active', 'cus_B', 'sub_B1', false, now() - interval '20 minutes');
  r := array_append(r, case when t = 'stale' then 'PASS an older billing event is ignored' else 'FAIL stale event: ' || t end);
  t := public.partner_apply_billing(ob, 'anchor', 'annual', 'active', 'cus_OTHER', 'sub_X', false, now());
  r := array_append(r, case when t = 'customer_mismatch' then 'PASS a different Stripe customer cannot take over an organization' else 'FAIL customer mismatch: ' || t end);
  t := public.partner_apply_billing(ob, null, null, 'canceled', 'cus_B', 'sub_OLD', true, now());
  r := array_append(r, case when t = 'other_subscription' then 'PASS an old subscription ending does not downgrade the current one' else 'FAIL other subscription: ' || t end);
  begin perform public.partner_apply_billing(ob, 'anchor', 'monthly', 'active', 'cus_B', 'sub_B1', false, now());
    r := array_append(r, 'FAIL anchor monthly accepted');
  exception when check_violation then r := array_append(r, 'PASS Anchor is annual only'); end;
  begin perform public.partner_apply_billing(ob, 'enterprise', 'annual', 'active', 'cus_B', 'sub_B1', false, now());
    r := array_append(r, 'FAIL unknown plan accepted');
  exception when others then r := array_append(r, 'PASS unknown plan refused'); end;
  t := public.partner_apply_billing(gen_random_uuid(), 'supporting', 'monthly', 'active', 'cus_Z', 'sub_Z', false, now());
  r := array_append(r, case when t = 'not_found' then 'PASS unknown organization reported' else 'FAIL not_found: ' || t end);
  t := public.partner_apply_billing(ob, 'supporting', 'monthly', 'past_due', 'cus_B', 'sub_B1', false, now() + interval '1 minute');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := array_append(r, case when not public.partner_is_paid(ob) then 'PASS a past due subscription is not active' else 'FAIL past due still paid' end);
  begin insert into public.partner_support_offers (org_id, opportunity_id, support_type, message) values (ob, opp_a, 'resources', 'Offer while past due.');
    r := array_append(r, 'FAIL offered while past due');
  exception when insufficient_privilege or sqlstate '42501' or unique_violation then r := array_append(r, 'PASS cannot offer while the subscription is not active'); end;
  reset role;
  set local role service_role;
  t := public.partner_apply_billing(ob, null, null, 'canceled', 'cus_B', 'sub_B1', true, now() + interval '2 minutes');
  reset role;
  select plan || '/' || coalesce(billing_interval, 'none') into t from public.partner_organizations where id = ob;
  r := array_append(r, case when t = 'community/none' then 'PASS an ended subscription returns the organization to Community' else 'FAIL after end: ' || t end);
  select count(*) into n from public.partner_support_offers where org_id = ob; r := array_append(r, case when n = 1 then 'PASS existing offers are kept after a downgrade' else 'FAIL offers lost' end);

  -- ------------------------------------------------------------ impact records and findings
  set local role service_role;
  insert into public.partner_impact_records (org_id, category, title, summary, quantity, unit) values (oa, 'resources_provided', 'Entry fees covered', 'Entry fees were covered for one event.', 12, 'teams');
  insert into public.partner_findings (area, title, summary, source, published_at) values ('safety', 'Reporting findings', 'A published, documented finding.', 'Community listening session', now());
  insert into public.partner_findings (area, title, summary, source) values ('safety', 'Unpublished finding', 'This one is still a draft.', 'Draft notes');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_impact_records; r := array_append(r, case when n = 1 then 'PASS partner reads their impact records' else 'FAIL impact count ' || n end);
  begin insert into public.partner_impact_records (org_id, category, title, summary) values (oa, 'teams_supported', 'Self written', 'A partner wrote this one.'); r := array_append(r, 'FAIL partner wrote an impact record');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot write impact records'); end;
  begin update public.partner_impact_records set quantity = 9999; r := array_append(r, 'FAIL partner edited an impact record');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot edit impact records'); end;
  begin delete from public.partner_impact_records; r := array_append(r, 'FAIL partner deleted an impact record');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot delete impact records'); end;
  select count(*) into n from public.partner_findings; r := array_append(r, case when n = 1 then 'PASS partners see published findings only' else 'FAIL findings visible: ' || n end);
  begin insert into public.partner_findings (area, title, summary, source) values ('safety', 'Mine', 'A partner wrote a finding.', 'me'); r := array_append(r, 'FAIL partner wrote a finding');
  exception when insufficient_privilege then r := array_append(r, 'PASS partner cannot write findings'); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_impact_records; r := array_append(r, case when n = 0 then 'PASS another partner sees none of those impact records' else 'FAIL impact leaked' end);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.partner_findings; r := array_append(r, case when n = 0 then 'PASS non partner sees no findings even when published' else 'FAIL findings leaked to non partner' end);
  reset role;

  -- ------------------------------------------------------------ partners never reach player data
  update public.profiles set handle = 'alpha_player' where id = ua;
  insert into public.scrim_matches (profile_id, game, played_on, result) values (uc, 'CS2', current_date, 'win');
  insert into public.scrim_uploads (profile_id, game, storage_path, original_name, size_bytes) values (uc, 'CS2', uc || '/f1.dem', 'f1.dem', 1000);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.scrim_matches; r := array_append(r, case when n = 0 then 'PASS a partner cannot read scrims' else 'FAIL partner reads scrims' end);
  select count(*) into n from public.scrim_uploads; r := array_append(r, case when n = 0 then 'PASS a partner cannot read scrim uploads' else 'FAIL partner reads uploads' end);
  select count(*) into n from public.profiles where id = uc; r := array_append(r, case when n = 0 then 'PASS a partner cannot read another player''s profile row' else 'FAIL partner reads another profile' end);
  select count(*) into n from public.player_games where profile_id = uc; r := array_append(r, case when n = 0 then 'PASS a partner cannot read another player''s games' else 'FAIL partner reads games' end);
  reset role;

  -- ------------------------------------------------------------ ecosystem summary: counts only, small groups left out
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.partner_ecosystem_summary();
  r := array_append(r, case when j -> 'players' = 'null'::jsonb then 'PASS a total under 5 is suppressed' else 'FAIL small total shown: ' || (j ->> 'players') end);
  reset role;
  for i in 1..5 loop
    pu := gen_random_uuid();
    insert into auth.users (id, aud, role, email) values (pu, 'authenticated', 'authenticated', 'p' || i || '@test.invalid');
    update public.profiles set handle = 'summary_p' || i where id = pu;
    insert into public.player_games (profile_id, game) values (pu, 'CS2');
  end loop;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  j := public.partner_ecosystem_summary();
  r := array_append(r, case when (j ->> 'players')::int = 6 then 'PASS the summary counts onboarded players' else 'FAIL player count ' || coalesce(j ->> 'players', 'null') end);
  r := array_append(r, case when (j -> 'games' -> 0 ->> 'game') = 'CS2' and (j -> 'games' -> 0 ->> 'players')::int = 5 then 'PASS a group of 5 is shown by game' else 'FAIL games ' || (j -> 'games')::text end);
  r := array_append(r, case when j::text !~* '(handle|email|display_name|profile_id|"id")' then 'PASS the summary has no identifiers' else 'FAIL identifier in summary' end);
  reset role;

  -- ------------------------------------------------------------ caps
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    for i in 1..60 loop insert into public.partner_participation (org_id, way, title, description) values (oa, 'infrastructure', 'Venue ' || i, 'A venue we can offer to the community.'); end loop;
    r := array_append(r, 'FAIL participation cap not enforced');
  exception when sqlstate 'P0001' then r := array_append(r, 'PASS participation cap enforced (50)'); end;
  reset role;

  raise exception E'RESULTS\n%', array_to_string(r, E'\n');
end $$;
