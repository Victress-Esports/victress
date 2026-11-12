-- Partner: Category Exclusivity (Anchor Partner with Category Exclusivity, $85,000 per year).
-- ADDITIVE. Test on the throwaway local Postgres first (supabase/tests/local/run-partner.sh), then victress-staging. Not production.
-- Basis: docs/partner/partner-build-brief.md. An Anchor Partner requests a category and duration inside the dashboard. Victress approves
-- the category in the admin queue, so the same category is never sold twice. Payment is a Stripe hosted invoice (or card or ACH) and
-- exclusivity activates on confirmed payment (the invoice.paid webhook). There is no email step and no person grants it by hand.
--
-- Who can write what:
--   an owner of a paid, active Anchor organization: insert a request (category, duration, note) while the category is free.
--   service role only: status, approval, invoice, activation, end dates. Approve in the Supabase table editor by setting status = 'approved'.
-- partner_organizations.plan is NOT changed: the plan stays 'anchor' (its subscription is unchanged). Exclusivity is a separate record,
-- and the plan the person sees ("Anchor Partner with Category Exclusivity") is derived from an active record.

create table public.partner_exclusivity (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.partner_organizations (id) on delete cascade,
  category text not null check (char_length(btrim(category)) between 3 and 80),
  -- Case and spacing insensitive, so "Gaming Peripherals" and " gaming  peripherals" are the same category.
  category_key text generated always as (lower(regexp_replace(btrim(category), '\s+', ' ', 'g'))) stored,
  duration_months int not null check (duration_months in (12, 24, 36, 48, 60)),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'requested' check (status in ('requested', 'approved', 'declined', 'withdrawn', 'active', 'ended')),
  stripe_customer_id text,
  stripe_invoice_id text,
  invoice_url text,
  invoice_status text check (invoice_status in ('open', 'paid', 'payment_failed', 'void')),
  approved_at timestamptz,
  activated_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- The same category is never held twice: only one approved or active record per category.
create unique index partner_exclusivity_category_once on public.partner_exclusivity (category_key) where status in ('approved', 'active');
-- One open request per organization.
create unique index partner_exclusivity_one_open on public.partner_exclusivity (org_id) where status in ('requested', 'approved', 'active');
create unique index partner_exclusivity_invoice_idx on public.partner_exclusivity (stripe_invoice_id) where stripe_invoice_id is not null;
create index partner_exclusivity_org_idx on public.partner_exclusivity (org_id);

-- Per organization cap, like the other Partner tables. The earlier function is replaced with the same body plus this table.
create or replace function public.partner_caps()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n int;
  cap int := case tg_table_name when 'partner_participation' then 50 when 'partner_opportunities' then 25 when 'partner_exclusivity' then 10 else 100 end;
begin
  execute format('select count(*) from public.%I where org_id = $1', tg_table_name) into n using new.org_id;
  if n >= cap then raise exception 'partner_limit' using errcode = 'P0001'; end if;
  return new;
end;
$$;
create trigger partner_exclusivity_caps before insert on public.partner_exclusivity for each row execute function public.partner_caps();

create function public.partner_exclusivity_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'approved' and old.status is distinct from 'approved' and new.approved_at is null then new.approved_at := now(); end if;
  return new;
end;
$$;
create trigger partner_exclusivity_touch before update on public.partner_exclusivity for each row execute function public.partner_exclusivity_touch();
revoke execute on function public.partner_exclusivity_touch() from public, anon, authenticated;

-- ---------------------------------------------------------------- helpers (security definer, same pattern as the others)

-- True when the caller owns p_org, the plan is Anchor, and the subscription is active or trialing. Only that account may request exclusivity.
create function public.partner_is_anchor_owner(p_org uuid)
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
    where m.profile_id = (select auth.uid()) and m.role = 'owner' and o.id = p_org
      and o.plan = 'anchor' and o.subscription_status in ('active', 'trialing')
  )
$$;

-- True when an approved or active record already holds the category (case and spacing insensitive).
create function public.partner_category_taken(p_category text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.partner_exclusivity e
    where e.category_key = lower(regexp_replace(btrim(coalesce(p_category, '')), '\s+', ' ', 'g')) and e.status in ('approved', 'active')
  )
$$;

-- True when the caller's organization holds an active exclusivity that has not ended.
create function public.partner_exclusivity_active(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partner_members m
    join public.partner_exclusivity e on e.org_id = m.org_id
    join public.partner_organizations o on o.id = m.org_id
    where m.profile_id = (select auth.uid()) and e.org_id = p_org and e.status = 'active'
      and (e.ends_at is null or e.ends_at > now())
      and o.plan = 'anchor' and o.subscription_status in ('active', 'trialing')
  )
$$;

-- ---------------------------------------------------------------- service role only: invoice and activation

-- Records the hosted invoice on an APPROVED request. Returns 'ok', 'not_found', 'not_approved' or 'invoice_exists'.
create function public.partner_exclusivity_attach_invoice(p_request uuid, p_customer text, p_invoice text, p_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.partner_exclusivity;
begin
  select * into e from public.partner_exclusivity where id = p_request for update;
  if not found then return 'not_found'; end if;
  if e.status <> 'approved' then return 'not_approved'; end if;
  if e.stripe_invoice_id is not null then return 'invoice_exists'; end if;
  update public.partner_exclusivity
    set stripe_customer_id = p_customer, stripe_invoice_id = p_invoice, invoice_url = p_url, invoice_status = 'open'
    where id = p_request;
  return 'ok';
end;
$$;

-- Applies one invoice event. The request is found by its invoice id, never by a client supplied value.
-- paid:   an approved request whose invoice matches becomes active; the term starts at the payment time. The organization must still be on a paid Anchor plan.
-- failed: only recorded (invoice_status), nothing is granted and nothing is taken away.
-- void:   an unpaid invoice is voided; the approval stays and a new invoice can be created.
-- Returns 'activated', 'already_active', 'recorded', 'not_found', 'not_approved', 'not_anchor' or 'stale'.
create function public.partner_exclusivity_apply_invoice(p_invoice text, p_event text, p_paid_at timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.partner_exclusivity;
  o public.partner_organizations;
begin
  select * into e from public.partner_exclusivity where stripe_invoice_id = p_invoice for update;
  if not found then return 'not_found'; end if;

  if p_event = 'payment_failed' then
    if e.status = 'approved' then update public.partner_exclusivity set invoice_status = 'payment_failed' where id = e.id; return 'recorded'; end if;
    return 'stale';
  end if;
  if p_event = 'void' then
    if e.status = 'approved' then
      update public.partner_exclusivity set invoice_status = 'void', stripe_invoice_id = null, invoice_url = null where id = e.id;
      return 'recorded';
    end if;
    return 'stale';
  end if;
  if p_event <> 'paid' then raise exception 'invalid event'; end if;

  if e.status = 'active' then return 'already_active'; end if;
  if e.status <> 'approved' then return 'not_approved'; end if;
  select * into o from public.partner_organizations where id = e.org_id;
  if o.plan <> 'anchor' or o.subscription_status not in ('active', 'trialing') then return 'not_anchor'; end if;
  update public.partner_exclusivity
    set status = 'active', invoice_status = 'paid', activated_at = coalesce(p_paid_at, now()),
        ends_at = coalesce(p_paid_at, now()) + make_interval(months => duration_months)
    where id = e.id;
  return 'activated';
end;
$$;

-- Owner withdraws a request that is not active yet. Called by the server after it checks ownership with the caller's own session.
create function public.partner_exclusivity_withdraw(p_request uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.partner_exclusivity;
begin
  select * into e from public.partner_exclusivity where id = p_request for update;
  if not found then return 'not_found'; end if;
  if not exists (select 1 from public.partner_members m where m.profile_id = (select auth.uid()) and m.org_id = e.org_id and m.role = 'owner') then return 'not_owner'; end if;
  if e.status not in ('requested', 'approved') then return 'not_open'; end if;
  if e.invoice_status = 'paid' then return 'not_open'; end if;
  update public.partner_exclusivity set status = 'withdrawn' where id = p_request;
  return 'ok';
end;
$$;

-- partner_apply_billing (earlier migration) is replaced so an ended Anchor subscription also ends exclusivity: it needs an active Anchor plan.
-- Same body as before plus the update of partner_exclusivity in the ended branch.
create or replace function public.partner_apply_billing(
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
    -- Exclusivity needs an Anchor plan. An approved or active record ends with it, which frees the category.
    update public.partner_exclusivity set status = 'ended' where org_id = p_org and status in ('approved', 'active');
    return 'applied';
  end if;

  if p_plan not in ('supporting', 'anchor') then raise exception 'invalid plan'; end if;
  update public.partner_organizations
    set plan = p_plan, billing_interval = p_interval, subscription_status = p_status,
        stripe_customer_id = coalesce(p_customer, stripe_customer_id), stripe_subscription_id = p_subscription,
        billing_event_at = p_event_at, updated_at = now()
    where id = p_org;
  -- A move away from Anchor (a plan change) also ends exclusivity.
  if p_plan <> 'anchor' then update public.partner_exclusivity set status = 'ended' where org_id = p_org and status in ('approved', 'active'); end if;
  return 'applied';
end;
$$;

-- ---------------------------------------------------------------- row level security and grants

alter table public.partner_exclusivity enable row level security;

create policy "members read their exclusivity" on public.partner_exclusivity
  for select to authenticated using (org_id = (select public.partner_org_id()));
-- Owner of a paid, active Anchor organization, status left to its default ('requested' is the only value the column grant lets through),
-- and only for a category nobody holds.
create policy "anchor owners request exclusivity" on public.partner_exclusivity
  for insert to authenticated
  with check (
    org_id = (select public.partner_org_id())
    and (select public.partner_is_anchor_owner(org_id))
    and not (select public.partner_category_taken(category))
  );

revoke all on public.partner_exclusivity from anon, authenticated;
-- Column lists keep status, invoice, approval and dates service role only.
grant select (id, org_id, category, duration_months, note, status, invoice_url, invoice_status, approved_at, activated_at, ends_at, created_at, updated_at)
  on public.partner_exclusivity to authenticated;
grant insert (org_id, category, duration_months, note) on public.partner_exclusivity to authenticated;
grant all on public.partner_exclusivity to service_role;

revoke execute on function
  public.partner_is_anchor_owner(uuid), public.partner_category_taken(text), public.partner_exclusivity_active(uuid),
  public.partner_exclusivity_attach_invoice(uuid, text, text, text), public.partner_exclusivity_apply_invoice(text, text, timestamptz),
  public.partner_exclusivity_withdraw(uuid)
from public, anon, authenticated;
grant execute on function public.partner_is_anchor_owner(uuid), public.partner_category_taken(text), public.partner_exclusivity_active(uuid),
  public.partner_exclusivity_withdraw(uuid) to authenticated;
grant execute on function public.partner_exclusivity_attach_invoice(uuid, text, text, text), public.partner_exclusivity_apply_invoice(text, text, timestamptz) to service_role;
-- partner_apply_billing keeps its earlier grants (service role only); create or replace does not change them.
