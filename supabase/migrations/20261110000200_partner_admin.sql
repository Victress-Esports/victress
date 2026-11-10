-- Partner admin console: who may use it, and a log of what they did.
-- ADDITIVE. Test on the throwaway local Postgres first, then victress-staging. Not production.
-- partner_admins is managed by the founder in the Supabase table editor (service role): add a row with the person's profile id.
-- The console itself reads and writes with the service role only after the server confirms partner_is_admin() with the person's own session.
-- Being an admin gives NO extra access through the normal app roles: row level security on every Partner table is unchanged.
-- Every console action writes a row to partner_admin_log (administrative overrides must be logged: Partner Experience, section 14).

create table public.partner_admins (
  profile_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.partner_admins enable row level security;
create policy "admins read their own row" on public.partner_admins for select to authenticated using (profile_id = (select auth.uid()));
revoke all on public.partner_admins from anon, authenticated;
grant select on public.partner_admins to authenticated;
grant all on public.partner_admins to service_role;

create function public.partner_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.partner_admins a where a.profile_id = (select auth.uid()))
$$;
revoke execute on function public.partner_is_admin() from public, anon, authenticated;
grant execute on function public.partner_is_admin() to authenticated;

create table public.partner_admin_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id),
  action text not null check (char_length(action) between 3 and 60),
  target_table text not null,
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index partner_admin_log_created_idx on public.partner_admin_log (created_at desc);
alter table public.partner_admin_log enable row level security;
revoke all on public.partner_admin_log from anon, authenticated;
grant all on public.partner_admin_log to service_role;
