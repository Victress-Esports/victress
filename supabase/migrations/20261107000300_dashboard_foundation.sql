-- Dashboard foundation (additive): resume sections and the private scrim file store.
-- Run after the privacy contract step (20261107000200). NOT APPLIED to production. Owner only: no anonymous access,
-- and nothing here is readable by other users or by any public function. Tournament history and highlights stay
-- private until the sharing fields are extended in a later, separately approved step.
--
-- Scrim files: a private Storage bucket, each user writes only inside their own folder. Files are stored, not analyzed.
-- Nothing here parses a file or produces stats; automated analysis is Coming soon and needs a validated parser.

create table public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  placement text check (placement is null or char_length(placement) <= 40),
  team_name text check (team_name is null or char_length(team_name) <= 60),
  played_on date check (played_on is null or played_on between date '2000-01-01' and current_date + 366),
  created_at timestamptz not null default now()
);
create index tournament_entries_profile_idx on public.tournament_entries (profile_id, played_on desc nulls last, created_at desc);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  url text not null check (url ~ '^https://[^\s]{4,255}$'),
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index highlights_profile_idx on public.highlights (profile_id, created_at desc);

create table public.scrim_uploads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2')),
  storage_path text not null unique check (storage_path like profile_id::text || '/%' and char_length(storage_path) <= 200),
  original_name text not null check (char_length(btrim(original_name)) between 1 and 120),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 209715200),
  -- 'stored' is the only state today. Later states (queued, parsed, failed) arrive with a validated parser.
  status text not null default 'stored' check (status = 'stored'),
  created_at timestamptz not null default now()
);
create index scrim_uploads_profile_idx on public.scrim_uploads (profile_id, created_at desc);

-- Per player caps keep storage and abuse bounded.
create function public.dashboard_caps()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n int;
  cap int := case tg_table_name when 'tournament_entries' then 50 when 'highlights' then 20 else 25 end;
begin
  execute format('select count(*) from public.%I where profile_id = $1', tg_table_name) into n using new.profile_id;
  if n >= cap then
    raise exception 'dashboard_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.dashboard_caps() from public, anon, authenticated;
create trigger tournament_entries_cap before insert on public.tournament_entries for each row execute function public.dashboard_caps();
create trigger highlights_cap before insert on public.highlights for each row execute function public.dashboard_caps();
create trigger scrim_uploads_cap before insert on public.scrim_uploads for each row execute function public.dashboard_caps();

alter table public.tournament_entries enable row level security;
alter table public.highlights enable row level security;
alter table public.scrim_uploads enable row level security;

create policy "owners manage their tournaments" on public.tournament_entries
  for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "owners manage their highlights" on public.highlights
  for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "owners read their uploads" on public.scrim_uploads
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners record their uploads" on public.scrim_uploads
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "owners delete their uploads" on public.scrim_uploads
  for delete to authenticated using (profile_id = (select auth.uid()));

revoke all on public.tournament_entries, public.highlights, public.scrim_uploads from anon, authenticated;
grant select, delete on public.tournament_entries, public.highlights to authenticated;
grant insert (profile_id, game, name, placement, team_name, played_on) on public.tournament_entries to authenticated;
grant update (game, name, placement, team_name, played_on) on public.tournament_entries to authenticated;
grant insert (profile_id, game, title, url, note) on public.highlights to authenticated;
grant update (game, title, url, note) on public.highlights to authenticated;
grant select, delete on public.scrim_uploads to authenticated;
grant insert (profile_id, game, storage_path, original_name, size_bytes) on public.scrim_uploads to authenticated;

-- Private bucket for practice files. 200 MB per file at most (the project level upload limit also applies).
insert into storage.buckets (id, name, public, file_size_limit)
values ('scrim-uploads', 'scrim-uploads', false, 209715200)
on conflict (id) do nothing;

create policy "users read their own scrim files" on storage.objects
  for select to authenticated
  using (bucket_id = 'scrim-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users upload to their own scrim folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scrim-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete their own scrim files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'scrim-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
