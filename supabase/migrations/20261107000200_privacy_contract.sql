-- Privacy and access foundation, step 2 of 2 (CONTRACT). Run only after the application reads exclusively through the
-- server only functions from step 1 (20261107000100_privacy_expand.sql). Until the application is switched, running this
-- breaks the public pages.
--
-- This closes anonymous reads: after it, the `anon` role has no access to profile, stat, game or team data, and a
-- signed in user can read only their own rows. Everything else goes through service_role only functions, which return
-- only what a player consented to.
--
-- NOT APPLIED to production. Each production step needs its own explicit authorization and a rollback plan
-- (rollback for this step: docs/proposals/privacy-rollout.md).

-- Safeguard (decision 4): if any profile exists, stop and prepare a reviewed plan.
do $$
begin
  if exists (select 1 from public.profiles) then
    raise exception 'STOP (decision 4): profiles exist. Prepare a specific migration plan and owner communication plan for the founder''s review before running this step.';
  end if;
end $$;

-- The public view and the old anonymous read functions are replaced by the server only functions.
drop view public.public_profiles;
drop function public.leaderboard(text, text, int, boolean);
drop function public.leaderboard_player_count(text, boolean);
drop function public.sitemap_profiles(int, int);
drop function public.sitemap_profile_count();

-- Policies that made rows readable by everyone, including anonymous visitors.
drop policy "profiles are publicly readable" on public.profiles;
drop policy "player games are publicly readable" on public.player_games;
drop policy "stats are publicly readable" on public.stat_entries;
drop policy "teams are publicly readable" on public.teams;

-- A signed in user reads their own rows. Team members read their team. Teammates see each other through team_roster().
create policy "owners read their profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "owners read their games" on public.player_games
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners read their stats" on public.stat_entries
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "members read their team" on public.teams
  for select to authenticated using (public.is_team_member(id));

-- No anonymous access to any of these tables, at table or column level.
revoke all on public.profiles, public.player_games, public.stat_entries, public.teams from anon;
