-- Player billing: Stripe customers, subscriptions and webhook events (Pro monthly and annual, Team monthly, Scout monthly).
-- ADDITIVE. NOT applied anywhere yet. Test on the throwaway local Postgres first; staging only after the founder approves and the Partner staging tests are done.
-- Basis: docs/proposals/stripe-billing.md (section 1A) as updated 2026-11-10: annual Pro and Scout are offered at checkout.
-- Players can READ their own rows (no Stripe ids, no card data ever). Only the service role writes, through the functions below,
-- which the verified webhook calls. Nothing here is reachable by anon. The feature stays behind NEXT_PUBLIC_BILLING_ENABLED.

create table public.billing_customers (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  stripe_subscription_id text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('pro', 'team', 'scout')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  status text not null,
  stripe_price_id text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_paid_at timestamptz,
  -- First failed payment of the current problem. The 7 day grace period counts from here. Cleared when the subscription is paid again.
  payment_failed_at timestamptz,
  last_event_at timestamptz not null,
  updated_at timestamptz not null default now(),
  -- Pro is monthly or annual. Team and Scout are monthly.
  constraint subscriptions_plan_interval check (plan = 'pro' or billing_interval = 'month')
);
create index subscriptions_profile_idx on public.subscriptions (profile_id);

create table public.stripe_events (
  event_id text primary key,
  type text not null,
  livemode boolean not null,
  received_at timestamptz not null default now(),
  outcome text not null default 'received' check (outcome in ('received', 'applied', 'ignored', 'failed'))
);

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

create policy "players read their own billing customer" on public.billing_customers for select to authenticated using (profile_id = (select auth.uid()));
create policy "players read their own subscriptions" on public.subscriptions for select to authenticated using (profile_id = (select auth.uid()));

revoke all on public.billing_customers, public.subscriptions, public.stripe_events from anon, authenticated;
-- Column lists keep Stripe ids away from the browser.
grant select (profile_id, created_at) on public.billing_customers to authenticated;
grant select (profile_id, plan, billing_interval, status, current_period_end, cancel_at_period_end, last_paid_at, payment_failed_at, updated_at)
  on public.subscriptions to authenticated;
grant all on public.billing_customers, public.subscriptions, public.stripe_events to service_role;

-- ---------------------------------------------------------------- webhook functions (service role only)

-- Records an event id. True when the event should be processed: it is new, or an earlier attempt did not finish (outcome received or failed), so Stripe's
-- retries work. False for a replay of an event that was already applied or ignored (the caller then returns 200 without acting).
create function public.billing_record_event(p_id text, p_type text, p_livemode boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.stripe_events (event_id, type, livemode) values (p_id, p_type, p_livemode) on conflict (event_id) do nothing;
  if found then return true; end if;
  return exists (select 1 from public.stripe_events where event_id = p_id and outcome in ('received', 'failed'));
end;
$$;

create function public.billing_finish_event(p_id text, p_outcome text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.stripe_events set outcome = p_outcome where event_id = p_id
$$;

-- Links a Stripe customer to a player. 'ok', 'not_found' (no such profile) or 'customer_mismatch' (the player already has another customer).
create function public.billing_link_customer(p_profile uuid, p_customer text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing text;
begin
  if not exists (select 1 from public.profiles where id = p_profile) then return 'not_found'; end if;
  select stripe_customer_id into existing from public.billing_customers where profile_id = p_profile;
  if existing is not null and existing <> p_customer then return 'customer_mismatch'; end if;
  if existing is null then
    begin
      insert into public.billing_customers (profile_id, stripe_customer_id) values (p_profile, p_customer);
    exception when unique_violation then return 'customer_mismatch';
    end;
  end if;
  return 'ok';
end;
$$;

-- Applies one subscription snapshot, in order: an older event than the last one applied is ignored. 'applied', 'stale', 'not_found' or 'customer_mismatch'.
create function public.billing_apply_subscription(
  p_profile uuid, p_sub text, p_customer text, p_plan text, p_interval text, p_status text, p_price text,
  p_period_end timestamptz, p_cancel boolean, p_event_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.subscriptions;
  linked text;
begin
  if p_customer is not null then
    linked := public.billing_link_customer(p_profile, p_customer);
    if linked <> 'ok' then return linked; end if;
  elsif not exists (select 1 from public.profiles where id = p_profile) then
    return 'not_found';
  end if;

  select * into s from public.subscriptions where stripe_subscription_id = p_sub for update;
  if found then
    if s.profile_id <> p_profile then return 'customer_mismatch'; end if;
    if p_event_at < s.last_event_at then return 'stale'; end if;
    update public.subscriptions
      set plan = p_plan, billing_interval = p_interval, status = p_status, stripe_price_id = p_price,
          current_period_end = p_period_end, cancel_at_period_end = coalesce(p_cancel, false), last_event_at = p_event_at, updated_at = now(),
          payment_failed_at = case when p_status in ('active', 'trialing') then null else s.payment_failed_at end
      where stripe_subscription_id = p_sub;
  else
    insert into public.subscriptions (stripe_subscription_id, profile_id, plan, billing_interval, status, stripe_price_id, current_period_end, cancel_at_period_end, last_event_at)
      values (p_sub, p_profile, p_plan, p_interval, p_status, p_price, p_period_end, coalesce(p_cancel, false), p_event_at);
  end if;
  return 'applied';
end;
$$;

-- invoice.paid / invoice.payment_failed. 'paid' stamps last_paid_at and clears the failure. 'failed' keeps the FIRST failure time, which starts the grace period.
-- 'applied' or 'not_found' (the subscription is not known yet: the caller returns 500 so Stripe retries after subscription.created).
create function public.billing_payment_event(p_sub text, p_kind text, p_at timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind not in ('paid', 'failed') then raise exception 'invalid kind'; end if;
  if p_kind = 'paid' then
    update public.subscriptions set last_paid_at = p_at, payment_failed_at = null, updated_at = now() where stripe_subscription_id = p_sub;
  else
    update public.subscriptions set payment_failed_at = coalesce(payment_failed_at, p_at), updated_at = now() where stripe_subscription_id = p_sub;
  end if;
  return case when found then 'applied' else 'not_found' end;
end;
$$;

revoke execute on function
  public.billing_record_event(text, text, boolean), public.billing_finish_event(text, text), public.billing_link_customer(uuid, text),
  public.billing_apply_subscription(uuid, text, text, text, text, text, text, timestamptz, boolean, timestamptz),
  public.billing_payment_event(text, text, timestamptz)
from public, anon, authenticated;
grant execute on function
  public.billing_record_event(text, text, boolean), public.billing_finish_event(text, text), public.billing_link_customer(uuid, text),
  public.billing_apply_subscription(uuid, text, text, text, text, text, text, timestamptz, boolean, timestamptz),
  public.billing_payment_event(text, text, timestamptz)
to service_role;
