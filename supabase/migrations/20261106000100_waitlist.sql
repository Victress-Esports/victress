-- Waitlist for features that are not live yet. NOT yet applied to the remote project (applied with M2).
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254),
  interest text not null check (interest in ('pro', 'team', 'scout', 'scrims')),
  created_at timestamptz not null default now(),
  unique (email, interest)
);

-- RLS on with no policies: anon and authenticated users cannot read or write.
-- Only the server (service role, which bypasses RLS) inserts rows via /api/waitlist.
alter table public.waitlist enable row level security;
