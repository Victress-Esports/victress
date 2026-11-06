-- =====================================================================================================
-- DEMO SEED: 25 clearly fake players. Development and preview databases ONLY. NEVER run in production.
--
--   1. Use a separate (staging / dev) Supabase project, never the production one.
--   2. Unlock it on purpose, in the same SQL session:   set app.allow_demo_seed = 'yes';
--   3. Run this file.
--   4. Remove everything later with supabase/seed/delete-demo.sql (a single query).
--
-- Demo rows are flagged profiles.is_demo = true and auth.users.raw_user_meta_data.is_demo = 'true',
-- appear labeled "Demo" in the UI, and only show on a leaderboard where LEADERBOARD_INCLUDE_DEMO=true.
-- Player counts are chosen so VALORANT, CS2 and Rocket League boards open (10+) while
-- League of Legends, Apex Legends and Overwatch 2 stay below the gate, so you can see both states.
-- =====================================================================================================
do $$
declare
  cfg jsonb := $json$
  {
    "VALORANT": {
      "roles": ["Duelist", "Initiator", "Controller", "Sentinel"],
      "ranks": ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
      "stats": [["kd", 0.6, 1.8, 2], ["acs", 140, 320, 0], ["hs_pct", 10, 35, 0], ["win_rate", 40, 65, 0], ["matches", 20, 300, 0]]
    },
    "CS2": {
      "roles": ["Entry", "AWPer", "Support", "Lurker", "In-game leader"],
      "ranks": ["Silver", "Gold Nova", "Master Guardian", "Legendary Eagle", "Supreme", "Global Elite"],
      "stats": [["premier_rating", 4000, 24000, 0], ["kd", 0.7, 1.7, 2], ["adr", 55, 100, 0], ["hs_pct", 25, 60, 0], ["win_rate", 40, 65, 0], ["matches", 20, 300, 0]]
    },
    "ROCKET_LEAGUE": {
      "roles": [],
      "ranks": ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Grand Champion"],
      "stats": [["goals_pg", 0.3, 1.2, 2], ["assists_pg", 0.2, 0.9, 2], ["saves_pg", 0.4, 1.6, 2], ["shooting_pct", 25, 55, 0], ["win_rate", 40, 65, 0], ["matches", 30, 400, 0]]
    },
    "LOL": {
      "roles": ["Top", "Jungle", "Mid", "Bot", "Support"],
      "ranks": ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master"],
      "stats": [["kda", 1.5, 4.5, 2], ["cs_per_min", 4, 9, 1], ["vision_per_min", 0.6, 2.5, 1], ["kill_participation", 40, 75, 0], ["win_rate", 40, 62, 0], ["matches", 30, 400, 0]]
    },
    "APEX": {
      "roles": ["Assault", "Skirmisher", "Recon", "Controller", "Support"],
      "ranks": ["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master"],
      "stats": [["avg_damage", 250, 900, 0], ["kd", 0.6, 3.0, 2], ["kills_per_game", 0.6, 3.5, 1], ["win_rate", 3, 20, 0], ["matches", 30, 500, 0]]
    },
    "OVERWATCH2": {
      "roles": ["Tank", "Damage", "Support"],
      "ranks": ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"],
      "stats": [["elims_10", 12, 28, 1], ["deaths_10", 5, 9, 1], ["damage_10", 5000, 11000, 0], ["healing_10", 0, 10000, 0], ["win_rate", 40, 62, 0], ["matches", 30, 400, 0]]
    }
  }
  $json$::jsonb;
  g text;
  i int;
  uid uuid;
  conf jsonb;
  s jsonb;
  m jsonb;
  role_v text;
  rank_v text;
  n_roles int;
  n_ranks int;
  played boolean;
  age_days int;
begin
  if coalesce(current_setting('app.allow_demo_seed', true), '') <> 'yes' then
    raise exception 'Refusing to seed. Demo data is for dev/preview databases only. If this is NOT production, run:  set app.allow_demo_seed = ''yes'';  and try again.';
  end if;

  for i in 1..25 loop
    uid := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (
      uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      format('demo%s@demo.victress.invalid', lpad(i::text, 2, '0')),
      jsonb_build_object('is_demo', 'true', 'full_name', 'Demo Player ' || lpad(i::text, 2, '0')),
      now(), now()
    );
    -- handle_new_user() created the profile; make it a labeled demo profile.
    update public.profiles
      set handle = 'demo_player_' || lpad(i::text, 2, '0'),
          display_name = 'Demo Player ' || lpad(i::text, 2, '0'),
          bio = 'Demo profile. Not a real player.',
          is_demo = true
      where id = uid;

    foreach g in array array['VALORANT', 'CS2', 'ROCKET_LEAGUE', 'LOL', 'APEX', 'OVERWATCH2'] loop
      played := case g
        when 'VALORANT' then i <= 14
        when 'CS2' then i >= 10
        when 'ROCKET_LEAGUE' then i % 2 = 0
        when 'LOL' then i % 3 = 0
        when 'APEX' then i % 4 = 0
        else i % 5 = 0
      end;
      continue when not played;

      conf := cfg -> g;
      n_roles := jsonb_array_length(conf -> 'roles');
      n_ranks := jsonb_array_length(conf -> 'ranks');
      role_v := case when n_roles > 0 then conf -> 'roles' ->> floor(random() * n_roles)::int end;
      rank_v := conf -> 'ranks' ->> floor(random() * n_ranks)::int;

      insert into public.player_games (profile_id, game, role, rank) values (uid, g, role_v, rank_v);

      -- An older entry and a newer one, so "latest entry wins" is visible.
      foreach age_days in array array[14, 0] loop
        m := '{}'::jsonb;
        for s in select * from jsonb_array_elements(conf -> 'stats') loop
          m := m || jsonb_build_object(
            s ->> 0,
            round(((s ->> 1)::numeric + random()::numeric * ((s ->> 2)::numeric - (s ->> 1)::numeric)), (s ->> 3)::int)
          );
        end loop;
        insert into public.stat_entries (profile_id, game, season, metrics, created_at)
        values (uid, g, case when age_days = 0 then 'Current' else 'Previous' end, m, now() - make_interval(days => age_days));
      end loop;
    end loop;
  end loop;
end $$;
