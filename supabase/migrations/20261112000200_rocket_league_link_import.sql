-- Rocket League replay link import (additive; relaxes a few Riot specific rules on the tables from 20261108000100). NOT APPLIED anywhere.
-- Run after 20261108000100_game_api_imports.sql. Test on the throwaway local Postgres first (supabase/tests/rocket_league_import.sql).
--
-- What this is: a player submits a Ballchasing replay link; the server reads the replay through the Ballchasing API and stores the
-- player's own numbers in game_matches (source 'api', source_detail 'ballchasing_replay'). No new match or player tables.
--  * game_accounts also holds a Rocket League identity: a platform and the player id, entered by the player and NOT verified. The platform
--    is the name Ballchasing reports in replays (seen in real replays: steam, epic, ps4, psynet, xbox; also switch), stored as 1 to 16
--    lower case letters or digits instead of a fixed list, so a platform Victress has not seen yet needs no migration. Matching is exact:
--    nothing is treated as equal across platforms (ps4 and psynet are different identities). It is used only to find the submitter's own slot in a replay. Other players are never identified.
--  * import_jobs also records Ballchasing submissions: which replay, whether it came from the web or Discord, and the time the player
--    confirmed they may submit it and agreed to the processing (required by the database for Ballchasing jobs).
--  * Clients still cannot write any of these tables (owner read and delete only). The server writes with the service role.
--
-- Rollback (nothing else depends on these changes):
--   alter table public.game_matches drop constraint game_matches_detail_fits, drop column source_detail;
--   alter table public.import_jobs drop constraint import_jobs_ballchasing_consent, drop column consent_at, drop column submitted_via, drop column external_ref;
--   delete from public.import_jobs where provider = 'ballchasing'; (and Rocket League game_accounts rows)
--   then restore import_jobs_provider_check to ('riot') and the game_accounts constraints as in 20261108000100.

-- game_accounts: a Rocket League identity next to the Riot one.
alter table public.game_accounts drop constraint game_accounts_provider_check;
alter table public.game_accounts add constraint game_accounts_provider_check check (provider in ('riot', 'rocket_league'));
alter table public.game_accounts add column platform text check (platform is null or platform ~ '^[a-z0-9]{2,16}$');
alter table public.game_accounts alter column display_name drop not null;
alter table public.game_accounts alter column tag drop not null;
alter table public.game_accounts alter column region drop not null;
alter table public.game_accounts drop constraint game_accounts_external_id_check;
alter table public.game_accounts add constraint game_accounts_external_id_check check (char_length(external_id) between 1 and 100);
alter table public.game_accounts add constraint game_accounts_provider_fields check (
  (provider = 'riot' and game = 'LOL' and display_name is not null and tag is not null and region is not null and platform is null)
  or (provider = 'rocket_league' and game = 'ROCKET_LEAGUE' and platform is not null and display_name is null and tag is null and region is null)
);

-- import_jobs: Ballchasing submissions, with the player's confirmation recorded.
alter table public.import_jobs drop constraint import_jobs_provider_check;
alter table public.import_jobs add constraint import_jobs_provider_check check (provider in ('riot', 'ballchasing'));
alter table public.import_jobs add column external_ref text check (external_ref is null or char_length(external_ref) <= 80);
alter table public.import_jobs add column submitted_via text not null default 'web' check (submitted_via in ('web', 'discord'));
alter table public.import_jobs add column consent_at timestamptz;
alter table public.import_jobs add constraint import_jobs_ballchasing_consent check (provider <> 'ballchasing' or consent_at is not null);
create index import_jobs_provider_created_idx on public.import_jobs (provider, created_at desc);

-- game_matches: where a row's data came from, shown to the player as its data label.
alter table public.game_matches add column source_detail text check (source_detail is null or source_detail in ('riot_api', 'ballchasing_replay'));
alter table public.game_matches add constraint game_matches_detail_fits check (
  source_detail is null
  or (source_detail = 'riot_api' and game = 'LOL')
  or (source_detail = 'ballchasing_replay' and game = 'ROCKET_LEAGUE' and source = 'api')
);
