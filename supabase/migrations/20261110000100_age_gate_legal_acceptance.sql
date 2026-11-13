-- Age gate and Terms/Privacy acceptance records (additive). NOT APPLIED to production; needs separate founder approval.
-- age_confirmations: the date of birth a player gave when they first signed in. One row per account, written once and never
--   edited by the player. Owner only (never part of any public view, share link or directory). Under 13 is refused by the
--   database itself, so the rule holds even if the app is bypassed. Self declared: it establishes nothing about verification.
-- legal_acceptances: one row per document version a player accepted, with the time. Append only (no update, no delete by the
--   player). When the app raises a document's version, the missing row is what makes the app ask for acceptance again.
-- Both cascade when the account is deleted.

create table public.age_confirmations (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null check (birth_date between date '1900-01-01' and current_date),
  confirmed_at timestamptz not null default now()
);

create or replace function public.age_confirmations_minimum()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date > (current_date - interval '13 years')::date then
    raise exception 'under_minimum_age' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.age_confirmations_minimum() from public, anon, authenticated;
create trigger age_confirmations_minimum before insert on public.age_confirmations
  for each row execute function public.age_confirmations_minimum();

alter table public.age_confirmations enable row level security;
create policy "owners read their age confirmation" on public.age_confirmations
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners add their age confirmation" on public.age_confirmations
  for insert to authenticated with check (profile_id = (select auth.uid()));
revoke all on public.age_confirmations from anon, authenticated;
grant select on public.age_confirmations to authenticated;
grant insert (profile_id, birth_date) on public.age_confirmations to authenticated;

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  document text not null check (document in ('terms', 'privacy')),
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  accepted_at timestamptz not null default now(),
  unique (profile_id, document, version)
);
create index legal_acceptances_profile_idx on public.legal_acceptances (profile_id, document, accepted_at desc);

-- An acceptance is only recorded after the age confirmation exists.
create or replace function public.legal_acceptances_needs_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.age_confirmations where profile_id = new.profile_id) then
    raise exception 'age_confirmation_required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.legal_acceptances_needs_age() from public, anon, authenticated;
create trigger legal_acceptances_needs_age before insert on public.legal_acceptances
  for each row execute function public.legal_acceptances_needs_age();

alter table public.legal_acceptances enable row level security;
create policy "owners read their acceptances" on public.legal_acceptances
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners record their acceptances" on public.legal_acceptances
  for insert to authenticated with check (profile_id = (select auth.uid()));
revoke all on public.legal_acceptances from anon, authenticated;
grant select on public.legal_acceptances to authenticated;
grant insert (profile_id, document, version) on public.legal_acceptances to authenticated;
