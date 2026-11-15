-- Claimable Rocket League snapshots for the submitter's own side, and Steam as a second verified identity (additive). Run after
-- 20261115000100_rl_verified_identity.sql. Test on the throwaway local Postgres first (supabase/tests/rl_snapshots.sql).
--
-- What this is:
--  * When a player adds a replay to their team's scrims, each OTHER player on the submitter's own side who has a platform id in the
--    replay gets a snapshot: that player's five numbers (score, goals, assists, saves, shots) and the match facts. Opponents get nothing.
--    No name and no platform id is stored: the snapshot is keyed by identity_key, an HMAC SHA-256 of "platform:id" made by the server
--    with a secret (VICTRESS_CLAIM_KEY) that the database never sees. Without the secret the key cannot be turned back into an id.
--  * A player can claim a snapshot only after verifying a game account (Epic sign in, or Steam sign in): the server computes the HMAC of
--    the VERIFIED platform and id and claims rows with exactly that key. Typed (unverified) ids can never claim.
--  * Nobody can read an unclaimed snapshot. A claimed snapshot is readable and deletable only by the player who claimed it.
--  * Unclaimed snapshots are deleted after 90 days, and at once when their team scrim is removed. Claimed ones stay until the player
--    deletes them, deletes their Rocket League data, or deletes their account.
--
-- Rollback (nothing else depends on these):
--   drop function public.claim_rl_snapshots(uuid, text);
--   drop function public.record_rl_snapshots(uuid, uuid, jsonb); drop function public.purge_rl_snapshots(integer);
--   drop trigger team_scrims_drop_unclaimed on public.team_scrims; drop function public.team_scrims_drop_unclaimed();
--   drop table public.rl_snapshots;
--   alter table public.game_accounts drop constraint game_accounts_verification_fits, drop constraint game_accounts_verified_via_check;
--   then restore both constraints exactly as in 20261115000100 (no steam_openid rows may exist first).

-- 1. Steam as a verified identity (Steam OpenID sign in). Epic rules unchanged.
alter table public.game_accounts drop constraint game_accounts_verified_via_check;
alter table public.game_accounts add constraint game_accounts_verified_via_check check (verified_via is null or verified_via in ('epic_oauth', 'steam_openid'));
alter table public.game_accounts drop constraint game_accounts_verification_fits;
alter table public.game_accounts add constraint game_accounts_verification_fits check (
  ((verified_via is null) = (verified_at is null))
  and (verified_via is null
       or (verified_via = 'epic_oauth' and provider = 'rocket_league' and platform = 'epic' and external_id ~ '^[0-9a-f]{32}$' and ownership_verified)
       or (verified_via = 'steam_openid' and provider = 'rocket_league' and platform = 'steam' and external_id ~ '^[0-9]{17}$' and ownership_verified))
  and (provider <> 'rocket_league' or ownership_verified = (verified_via is not null))
);

-- 2. Snapshots
create table public.rl_snapshots (
  id uuid primary key default gen_random_uuid(),
  team_scrim_id uuid references public.team_scrims (id) on delete set null,
  replay_id text not null check (replay_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  identity_key text not null check (identity_key ~ '^[0-9a-f]{64}$'),
  played_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds between 0 and 20000),
  queue_kind text not null check (queue_kind in ('ranked', 'normal', 'custom', 'other')),
  result text not null check (result in ('win', 'loss', 'no_result')),
  goals_for integer not null check (goals_for between 0 and 99),
  goals_against integer not null check (goals_against between 0 and 99),
  overtime boolean not null default false,
  stats jsonb not null check (public.rl_numbers_ok(stats)),
  claimed_by uuid references public.profiles (id) on delete cascade,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (replay_id, identity_key),
  check ((claimed_by is null) = (claimed_at is null))
);
create index rl_snapshots_key_idx on public.rl_snapshots (identity_key) where claimed_by is null;
create index rl_snapshots_claimed_idx on public.rl_snapshots (claimed_by, played_at desc) where claimed_by is not null;
create index rl_snapshots_created_idx on public.rl_snapshots (created_at) where claimed_by is null;

alter table public.rl_snapshots enable row level security;
create policy "claimers read their snapshots" on public.rl_snapshots for select to authenticated using (claimed_by = (select auth.uid()));
create policy "claimers delete their snapshots" on public.rl_snapshots for delete to authenticated using (claimed_by = (select auth.uid()));
revoke all on public.rl_snapshots from public, anon, authenticated, service_role;
grant select (id, replay_id, played_at, duration_seconds, queue_kind, result, goals_for, goals_against, overtime, stats, claimed_at) on public.rl_snapshots to authenticated;
grant delete on public.rl_snapshots to authenticated;
grant select, delete on public.rl_snapshots to service_role;

-- Removing a team scrim removes its unclaimed snapshots (claimed ones belong to the player who claimed them).
create function public.team_scrims_drop_unclaimed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.rl_snapshots where team_scrim_id = old.id and claimed_by is null;
  return old;
end;
$$;
revoke execute on function public.team_scrims_drop_unclaimed() from public, anon, authenticated;
create trigger team_scrims_drop_unclaimed before delete on public.team_scrims for each row execute function public.team_scrims_drop_unclaimed();

-- Server only: store snapshots for a team scrim this submitter just created. Facts are copied from the scrim (the submitter's side).
-- p = [{"key": "<64 hex>", "stats": {...}}], at most 7 (a side has at most 8 players, minus the submitter).
create function public.record_rl_snapshots(p_scrim uuid, p_submitter uuid, p jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare s record; e jsonb; n int := 0; k int;
begin
  select * into s from public.team_scrims where id = p_scrim and submitted_by = p_submitter;
  if not found or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 7 then return 0; end if;
  for e in select * from jsonb_array_elements(p) loop
    insert into public.rl_snapshots (team_scrim_id, replay_id, identity_key, played_at, duration_seconds, queue_kind, result, goals_for, goals_against, overtime, stats)
    values (s.id, s.replay_id, e->>'key', s.played_at, s.duration_seconds, s.queue_kind, s.result, s.goals_for, s.goals_against, s.overtime, e->'stats')
    on conflict (replay_id, identity_key) do nothing;
    get diagnostics k = row_count;
    n := n + k;
  end loop;
  return n;
end;
$$;
revoke execute on function public.record_rl_snapshots(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_rl_snapshots(uuid, uuid, jsonb) to service_role;

-- Server only: claim every unclaimed snapshot with this key for a player who has a VERIFIED Rocket League identity. The server derives
-- the key from that verified identity; this function refuses players without one.
create function public.claim_rl_snapshots(p_profile uuid, p_key text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  if p_key !~ '^[0-9a-f]{64}$' then return 0; end if;
  if not exists (select 1 from public.game_accounts where profile_id = p_profile and game = 'ROCKET_LEAGUE' and ownership_verified and verified_via is not null) then
    return 0;
  end if;
  update public.rl_snapshots set claimed_by = p_profile, claimed_at = now() where identity_key = p_key and claimed_by is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.claim_rl_snapshots(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_rl_snapshots(uuid, text) to service_role;

-- Housekeeping: unclaimed snapshots older than p_days, or whose scrim is gone, are deleted.
create function public.purge_rl_snapshots(p_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  if p_days is null or p_days < 1 then raise exception 'invalid retention'; end if;
  delete from public.rl_snapshots where claimed_by is null and (created_at < now() - make_interval(days => p_days) or team_scrim_id is null);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.purge_rl_snapshots(integer) from public, anon, authenticated;
grant execute on function public.purge_rl_snapshots(integer) to service_role;
