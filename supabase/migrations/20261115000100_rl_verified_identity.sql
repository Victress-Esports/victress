-- Rocket League identity verified by signing in with Epic (additive). Run after 20261112000200_rocket_league_link_import.sql.
-- Test on the throwaway local Postgres first (supabase/tests/rl_verified_identity.sql).
--
-- What this is: a player may prove that an Epic Games account is theirs by signing in with Epic (OAuth authorization code flow, server
-- side). The server stores the Epic Account ID that Epic returns as the player's Rocket League identity (platform 'epic') and marks it
-- verified. Replays are then matched to the player exactly as before: platform and id, exact, never by name.
--  * Verification proves control of the Epic account. It says nothing about ability (CLAUDE.md, provenance).
--  * Only the server writes these columns (clients keep select and delete only on game_accounts).
--  * One Epic account can be verified on one Victress account at a time. Unverified identities are unchanged (two accounts may still
--    type the same id; each gets separate private rows).
--  * Steam needs nothing from this migration: an unverified Steam identity works exactly as before.
--
-- Rollback (nothing else depends on these columns):
--   drop index public.game_accounts_one_verified_identity;
--   alter table public.game_accounts drop constraint game_accounts_verification_fits, drop column verified_at, drop column verified_via;

alter table public.game_accounts add column verified_via text check (verified_via is null or verified_via = 'epic_oauth');
alter table public.game_accounts add column verified_at timestamptz;
alter table public.game_accounts add constraint game_accounts_verification_fits check (
  ((verified_via is null) = (verified_at is null))
  and (verified_via is null or (provider = 'rocket_league' and platform = 'epic' and external_id ~ '^[0-9a-f]{32}$' and ownership_verified))
  and (provider <> 'rocket_league' or ownership_verified = (verified_via is not null))
);
create unique index game_accounts_one_verified_identity on public.game_accounts (game, platform, external_id) where verified_via is not null;
