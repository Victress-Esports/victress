-- Partner account (additive). Run after 20261107000620. NOT APPLIED to production.
-- Partner is an account type for organizations (universities, companies, esports organizations, leagues, community groups,
-- nonprofits). It is Creating Shared Value applied: the same platform, with organizations taking part in addressing the barriers
-- that women competitors face, and seeing what happened.
--
-- What a partner can NEVER reach: player profiles, scrims, resumes, contact details. The only player information is
-- partner_ecosystem_summary(), which returns aggregate counts with small groups suppressed and no identifiers.
--
-- Who writes what:
--   partners (authenticated members of an organization): create their organization (through create_partner_org only), edit name,
--     type and website (owner), submit participation, submit opportunities, offer support (paid plan only).
--   service role only: plan, billing fields, verified, participation / opportunity / offer status, impact records, findings.
--     Victress edits these in the Supabase table editor (no admin UI yet); the Stripe webhook uses partner_apply_billing.
-- anon: nothing at all.

-- ---------------------------------------------------------------- reserved name
-- /partner is now a route on victress.gg, and every top level path is also a player handle, so "partner" can no longer be claimed.
-- Same body as 20261106000300 with one name added (keep in sync with lib/handles.ts). An existing "partner" handle, if any, is not
-- changed by this; check before applying (docs/proposals/partner-account.md).
create or replace function public.handle_is_allowed(h text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select h ~ '^[a-z0-9_]{3,20}$'
    and h <> all (array[
      'admin','api','login','app','www','support','victress',
      'dashboard','onboarding','join','settings','pricing','teams','team','about','privacy','terms',
      'staff','help','mod','moderator','official','root','null','undefined','auth',
      'leaderboard','leaderboards','games','stats','profile','profiles','signup','logout',
      'partner'
    ])
    and not exists (
      select 1
      from unnest(array[
        'fuck','shit','bitch','cunt','nigg','fagg','retard','rapist','nazi','hitler','slut','whore'
      ]) as f
      where replace(h, '_', '') like '%' || f || '%'
    );
$$;

-- ---------------------------------------------------------------- tables

create table public.partner_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  org_type text not null check (org_type in ('university', 'company', 'esports_organization', 'league', 'community_group', 'nonprofit')),
  website text check (website is null or (website ~* '^https?://[^[:space:]]+$' and char_length(website) <= 200)),
  plan text not null default 'community' check (plan in ('community', 'supporting', 'anchor')),
  billing_interval text check (billing_interval in ('monthly', 'annual')),
  verified boolean not null default false,
  verified_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  billing_event_at timestamptz,
  terms_version text not null check (char_length(terms_version) between 1 and 40),
  terms_accepted_at timestamptz not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Community has no interval. Supporting is monthly or annual. Anchor is annual.
  constraint partner_plan_interval check (
    (plan = 'community' and billing_interval is null)
    or (plan = 'supporting' and billing_interval in ('monthly', 'annual'))
    or (plan = 'anchor' and billing_interval = 'annual')
  )
);
create unique index partner_organizations_customer_idx on public.partner_organizations (stripe_customer_id) where stripe_customer_id is not null;

-- One organization per account: profile_id is the primary key.
create table public.partner_members (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  org_id uuid not null references public.partner_organizations (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);
create index partner_members_org_idx on public.partner_members (org_id);

create table public.partner_participation (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.partner_organizations (id) on delete cascade,
  way text not null check (way in ('resources', 'expertise_mentorship', 'infrastructure', 'opportunities')),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 10 and 1000),
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'accepted', 'declined')),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index partner_participation_org_idx on public.partner_participation (org_id, created_at desc);

create table public.partner_opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.partner_organizations (id) on delete cascade,
  -- Copied from the organization when the row is created (trigger), so a partner cannot publish under another name.
  organization_name text not null,
  type text not null check (type in ('team_development', 'tournament_support', 'collegiate_programs', 'scholarships', 'mentorship_programs', 'community_initiatives', 'career_opportunities')),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  purpose text not null check (char_length(btrim(purpose)) between 10 and 1000),
  support_needed text not null check (char_length(btrim(support_needed)) between 5 and 1000),
  -- A partner's own submission stays in_review until Victress publishes it.
  status text not null default 'in_review' check (status in ('in_review', 'published', 'closed')),
  published_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index partner_opportunities_status_idx on public.partner_opportunities (status, published_at desc);
create index partner_opportunities_org_idx on public.partner_opportunities (org_id, created_at desc);

create table public.partner_support_offers (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.partner_opportunities (id) on delete cascade,
  org_id uuid not null references public.partner_organizations (id) on delete cascade,
  support_type text not null check (support_type in ('resources', 'expertise_mentorship', 'infrastructure', 'opportunities')),
  message text not null check (char_length(btrim(message)) between 10 and 1000),
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'accepted', 'declined')),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  unique (opportunity_id, org_id)
);
create index partner_support_offers_org_idx on public.partner_support_offers (org_id, created_at desc);

-- Written by Victress. A record says what happened. It never says the partner caused the outcome.
create table public.partner_impact_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.partner_organizations (id) on delete cascade,
  category text not null check (category in ('resources_provided', 'teams_supported', 'player_development', 'mentorship_education', 'competitive_opportunities', 'career_progression', 'community_participation')),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  summary text not null check (char_length(btrim(summary)) between 5 and 1000),
  quantity numeric check (quantity is null or quantity >= 0),
  unit text check (unit is null or char_length(btrim(unit)) between 1 and 40),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index partner_impact_records_org_idx on public.partner_impact_records (org_id, occurred_on desc);

-- Published by Victress: documented findings on the six challenge areas. No player identifiers. Draft until published_at is set.
create table public.partner_findings (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('participation', 'development', 'representation', 'resources', 'safety', 'competitive_pathways')),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  summary text not null check (char_length(btrim(summary)) between 10 and 2000),
  source text not null check (char_length(btrim(source)) between 2 and 300),
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index partner_findings_area_idx on public.partner_findings (area, published_at desc);

-- ---------------------------------------------------------------- functions

-- The caller's organization, or null. Security definer so policies can use it without recursing into partner_members.
create function public.partner_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id from public.partner_members m where m.profile_id = (select auth.uid())
$$;

-- True only when the caller is a member of p_org and its plan is paid with an active (or trialing) subscription.
create function public.partner_is_paid(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partner_members m
    join public.partner_organizations o on o.id = m.org_id
    where m.profile_id = (select auth.uid())
      and o.id = p_org
      and o.plan in ('supporting', 'anchor')
      and o.subscription_status in ('active', 'trialing')
  )
$$;

create function public.partner_is_owner(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.partner_members m
    where m.profile_id = (select auth.uid()) and m.org_id = p_org and m.role = 'owner'
  )
$$;

-- True when p_opp is published and belongs to a different organization than the caller's.
create function public.partner_can_offer_on(p_opp uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.partner_opportunities o
    where o.id = p_opp and o.status = 'published' and o.org_id <> coalesce(public.partner_org_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
$$;

-- Creates the organization (always on Community) and its owner together. Never accepts a plan, billing or verified value.
create function public.create_partner_org(p_name text, p_type text, p_website text, p_terms_version text, p_authorized boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n text := btrim(coalesce(p_name, ''));
  w text := nullif(btrim(coalesce(p_website, '')), '');
  tv text := btrim(coalesce(p_terms_version, ''));
  oid uuid;
begin
  if uid is null then return jsonb_build_object('status', 'unauthorized'); end if;
  if not exists (select 1 from public.profiles where id = uid) then return jsonb_build_object('status', 'unauthorized'); end if;
  if char_length(n) < 2 or char_length(n) > 80 then return jsonb_build_object('status', 'invalid_name'); end if;
  if p_type is null or p_type not in ('university', 'company', 'esports_organization', 'league', 'community_group', 'nonprofit') then
    return jsonb_build_object('status', 'invalid_type');
  end if;
  if w is not null and (w !~* '^https?://[^[:space:]]+$' or char_length(w) > 200) then return jsonb_build_object('status', 'invalid_website'); end if;
  if p_authorized is distinct from true or char_length(tv) < 1 or char_length(tv) > 40 then return jsonb_build_object('status', 'terms_required'); end if;
  if exists (select 1 from public.partner_members where profile_id = uid) then return jsonb_build_object('status', 'already_member'); end if;

  insert into public.partner_organizations (name, org_type, website, terms_version, terms_accepted_at, created_by)
  values (n, p_type, w, tv, now(), uid)
  returning id into oid;
  insert into public.partner_members (profile_id, org_id, role) values (uid, oid, 'owner');
  return jsonb_build_object('status', 'ok', 'org_id', oid);
exception when unique_violation then
  return jsonb_build_object('status', 'already_member');
end;
$$;

-- Aggregate platform totals for the Challenges section. Partners only. No identifiers: counts only, and any group smaller than
-- 5 is left out rather than shown. Demo profiles and accounts that have not finished onboarding are not counted.
create function public.partner_ecosystem_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  players int;
  teams int;
  games jsonb;
begin
  if public.partner_org_id() is null then return null; end if;
  select count(*) into players from public.profiles p where not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$';
  select count(*) into teams from public.teams;
  select coalesce(jsonb_agg(jsonb_build_object('game', g.game, 'players', g.n) order by g.n desc, g.game), '[]'::jsonb)
    into games
    from (
      select pg.game, count(distinct pg.profile_id) as n
      from public.player_games pg
      join public.profiles p on p.id = pg.profile_id and not p.is_demo and p.handle !~ '^p[0-9a-f]{12}$'
      group by pg.game
      having count(distinct pg.profile_id) >= 5
    ) g;
  return jsonb_build_object(
    'players', case when players >= 5 then players else null end,
    'teams', case when teams >= 5 then teams else null end,
    'games', games,
    'minimum_group', 5
  );
end;
$$;

-- Used by the Stripe webhook (service role only). Applies one billing event to an organization, atomically and in order:
-- an event older than the last one applied is ignored, and a subscription that is not the organization's current one cannot
-- end it. Returns 'applied', 'stale', 'not_found', 'customer_mismatch' or 'other_subscription'.
create function public.partner_apply_billing(
  p_org uuid, p_plan text, p_interval text, p_status text, p_customer text, p_subscription text, p_ended boolean, p_event_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.partner_organizations;
begin
  select * into o from public.partner_organizations where id = p_org for update;
  if not found then return 'not_found'; end if;
  if o.billing_event_at is not null and p_event_at < o.billing_event_at then return 'stale'; end if;
  if o.stripe_customer_id is not null and p_customer is not null and o.stripe_customer_id <> p_customer then return 'customer_mismatch'; end if;

  if p_ended then
    -- Only the subscription we are tracking can return the organization to Community.
    if o.stripe_subscription_id is not null and p_subscription is not null and o.stripe_subscription_id <> p_subscription then return 'other_subscription'; end if;
    update public.partner_organizations
      set plan = 'community', billing_interval = null, subscription_status = coalesce(p_status, 'canceled'),
          stripe_subscription_id = null, billing_event_at = p_event_at, updated_at = now()
      where id = p_org;
    return 'applied';
  end if;

  if p_plan not in ('supporting', 'anchor') then raise exception 'invalid plan'; end if;
  update public.partner_organizations
    set plan = p_plan, billing_interval = p_interval, subscription_status = p_status,
        stripe_customer_id = coalesce(p_customer, stripe_customer_id), stripe_subscription_id = p_subscription,
        billing_event_at = p_event_at, updated_at = now()
    where id = p_org;
  return 'applied';
end;
$$;

-- Per organization caps, so one account cannot fill the tables.
create function public.partner_caps()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n int;
  cap int := case tg_table_name when 'partner_participation' then 50 when 'partner_opportunities' then 25 else 100 end;
begin
  execute format('select count(*) from public.%I where org_id = $1', tg_table_name) into n using new.org_id;
  if n >= cap then raise exception 'partner_limit' using errcode = 'P0001'; end if;
  return new;
end;
$$;
revoke execute on function public.partner_caps() from public, anon, authenticated;
create trigger partner_participation_cap before insert on public.partner_participation for each row execute function public.partner_caps();
create trigger partner_opportunities_cap before insert on public.partner_opportunities for each row execute function public.partner_caps();
create trigger partner_support_offers_cap before insert on public.partner_support_offers for each row execute function public.partner_caps();

create function public.partner_opportunity_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.organization_name := (select o.name from public.partner_organizations o where o.id = new.org_id);
  return new;
end;
$$;
revoke execute on function public.partner_opportunity_defaults() from public, anon, authenticated;
create trigger partner_opportunities_defaults before insert on public.partner_opportunities for each row execute function public.partner_opportunity_defaults();

-- When a signed in user changes the organization's name or website, verification no longer describes what is on file, so it
-- is cleared and must be checked again. Edits made in the table editor (no end user session) are left alone.
create function public.partner_org_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and (new.name is distinct from old.name or new.website is distinct from old.website) then
    new.verified := false;
    new.verified_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.partner_org_touch() from public, anon, authenticated;
create trigger partner_organizations_touch before update on public.partner_organizations for each row execute function public.partner_org_touch();

-- ---------------------------------------------------------------- row level security and grants

alter table public.partner_organizations enable row level security;
alter table public.partner_members enable row level security;
alter table public.partner_participation enable row level security;
alter table public.partner_opportunities enable row level security;
alter table public.partner_support_offers enable row level security;
alter table public.partner_impact_records enable row level security;
alter table public.partner_findings enable row level security;

create policy "members read their organization" on public.partner_organizations
  for select to authenticated using (id = (select public.partner_org_id()));
create policy "owners edit their organization" on public.partner_organizations
  for update to authenticated using ((select public.partner_is_owner(id))) with check ((select public.partner_is_owner(id)));

create policy "members read their own membership" on public.partner_members
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "members read their participation" on public.partner_participation
  for select to authenticated using (org_id = (select public.partner_org_id()));
create policy "members submit participation" on public.partner_participation
  for insert to authenticated with check (org_id = (select public.partner_org_id()));

create policy "members read published and own opportunities" on public.partner_opportunities
  for select to authenticated
  using (org_id = (select public.partner_org_id()) or (status = 'published' and (select public.partner_org_id()) is not null));
create policy "members submit opportunities" on public.partner_opportunities
  for insert to authenticated with check (org_id = (select public.partner_org_id()));

create policy "members read their support offers" on public.partner_support_offers
  for select to authenticated using (org_id = (select public.partner_org_id()));
-- Paid and active plan, and only on another organization's published opportunity.
create policy "paid members offer support" on public.partner_support_offers
  for insert to authenticated
  with check (org_id = (select public.partner_org_id()) and (select public.partner_is_paid(org_id)) and (select public.partner_can_offer_on(opportunity_id)));

create policy "members read their impact records" on public.partner_impact_records
  for select to authenticated using (org_id = (select public.partner_org_id()));

create policy "members read published findings" on public.partner_findings
  for select to authenticated using (published_at is not null and (select public.partner_org_id()) is not null);

revoke all on public.partner_organizations, public.partner_members, public.partner_participation, public.partner_opportunities,
  public.partner_support_offers, public.partner_impact_records, public.partner_findings from anon, authenticated;

-- Column lists keep plan, billing, Stripe ids, verified and every status service role only.
grant select (id, name, org_type, website, plan, billing_interval, verified, verified_at, subscription_status, terms_version, terms_accepted_at, created_at, updated_at)
  on public.partner_organizations to authenticated;
grant update (name, org_type, website) on public.partner_organizations to authenticated;
grant select on public.partner_members to authenticated;
grant select on public.partner_participation to authenticated;
grant insert (org_id, way, title, description) on public.partner_participation to authenticated;
grant select on public.partner_opportunities to authenticated;
grant insert (org_id, type, title, purpose, support_needed) on public.partner_opportunities to authenticated;
grant select on public.partner_support_offers to authenticated;
grant insert (org_id, opportunity_id, support_type, message) on public.partner_support_offers to authenticated;
grant select on public.partner_impact_records to authenticated;
grant select on public.partner_findings to authenticated;

grant all on public.partner_organizations, public.partner_members, public.partner_participation, public.partner_opportunities,
  public.partner_support_offers, public.partner_impact_records, public.partner_findings to service_role;

revoke execute on function
  public.partner_org_id(), public.partner_is_paid(uuid), public.partner_is_owner(uuid), public.partner_can_offer_on(uuid),
  public.create_partner_org(text, text, text, text, boolean), public.partner_ecosystem_summary(),
  public.partner_apply_billing(uuid, text, text, text, text, text, boolean, timestamptz)
from public, anon, authenticated;
grant execute on function
  public.partner_org_id(), public.partner_is_paid(uuid), public.partner_is_owner(uuid), public.partner_can_offer_on(uuid),
  public.create_partner_org(text, text, text, text, boolean), public.partner_ecosystem_summary()
to authenticated;
grant execute on function public.partner_apply_billing(uuid, text, text, text, text, text, boolean, timestamptz) to service_role;
