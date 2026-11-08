-- First party funnel events (additive). Run after 20261108000100. NOT APPLIED to production. Staging first.
-- A short list of product events kept in our own database: no third party, no cookies, no IP address, no user agent, no
-- referrer, no page URLs. Anonymous events (registration_started) carry no identity at all. Events for a signed in player
-- carry the profile id and are deleted with the profile. Nobody but the server can read or write this table.
--
-- Events: registration_started (anonymous, method), registration_completed, profile_completed, first_import_started,
--         first_analysis_viewed, return_visit (at most one per player per UTC day, never on the day of registration).

create table public.funnel_events (
  id bigint generated always as identity primary key,
  name text not null check (name in ('registration_started', 'registration_completed', 'profile_completed', 'first_import_started', 'first_analysis_viewed', 'return_visit')),
  profile_id uuid references public.profiles (id) on delete cascade,
  day date not null default ((now() at time zone 'utc')::date),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (pg_column_size(props) < 200),
  -- Only the anonymous event may omit the profile.
  check (profile_id is not null or name = 'registration_started')
);
-- Once per player events.
create unique index funnel_events_once on public.funnel_events (profile_id, name)
  where name in ('registration_completed', 'profile_completed', 'first_import_started', 'first_analysis_viewed');
-- Return visits: one per player per day.
create unique index funnel_events_return_day on public.funnel_events (profile_id, day) where name = 'return_visit';
create index funnel_events_name_day on public.funnel_events (name, day);

alter table public.funnel_events enable row level security;  -- no policies: no client access

revoke all on public.funnel_events from public, anon, authenticated, service_role;
grant select, insert, delete on public.funnel_events to service_role;
