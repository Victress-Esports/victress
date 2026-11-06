-- Removes ALL demo data in one query. Deleting the auth user cascades to its profile, games, stats and team rows.
delete from auth.users where raw_user_meta_data ->> 'is_demo' = 'true';
