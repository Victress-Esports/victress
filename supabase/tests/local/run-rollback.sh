#!/usr/bin/env bash
# Tests the prepared expand rollback (docs/proposals/privacy-expand-rollback.md) on a throwaway LOCAL Postgres (never production):
# base migrations, expand, the rollback SQL taken from the document, then checks that the schema is back to the pre expand state.
#   PGHOST=/var/lib/postgresql PGPORT=5433 PGUSER=postgres supabase/tests/local/run-rollback.sh
set -u
cd "$(dirname "$0")/../../.."
DB=victress_test; fail=0
psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -d postgres >/dev/null 2>&1
psql -v ON_ERROR_STOP=1 -qc "create database $DB" -d postgres >/dev/null && psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/local/00_supabase_stub.sql >/dev/null
for m in supabase/migrations/2026110600*.sql; do psql -v ON_ERROR_STOP=1 -q -d $DB -f "$m" >/dev/null || { echo "MIGRATION FAILED $m"; exit 1; }; done
q() { psql -At -d $DB -c "$1"; }
before_cols=$(q "select string_agg(column_name, ',' order by column_name) from information_schema.columns where table_schema='public' and table_name='profiles'")
before_fns=$(q "select string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'")
before_def=$(q "select md5(pg_get_functiondef('public.handle_new_user'::regproc))")
psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/migrations/20261107000100_privacy_expand.sql >/dev/null || { echo "EXPAND FAILED"; exit 1; }
mid_cols=$(q "select count(*) from information_schema.columns where table_name='profiles' and column_name='directory_listed'")
[ "$mid_cols" = 1 ] && echo "PASS expand applied" || { echo "FAIL expand not applied"; fail=1; }
# extract the SQL block from the document
awk '/^```sql/{f=1; next} /^```/{f=0} f' docs/proposals/privacy-expand-rollback.md > /tmp/rollback.sql
psql -v ON_ERROR_STOP=1 -q -d $DB -f /tmp/rollback.sql >/dev/null 2>/tmp/rb.err || { echo "FAIL rollback SQL errored"; cat /tmp/rb.err; exit 1; }
echo "PASS rollback SQL ran"
[ "$(q "select string_agg(column_name, ',' order by column_name) from information_schema.columns where table_schema='public' and table_name='profiles'")" = "$before_cols" ] && echo "PASS profiles columns match the pre expand schema" || { echo "FAIL profiles columns differ"; fail=1; }
[ "$(q "select string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'")" = "$before_fns" ] && echo "PASS public functions match the pre expand set" || { echo "FAIL functions differ"; fail=1; }
[ "$(q "select count(*) from information_schema.tables where table_name='profile_share_links'")" = 0 ] && echo "PASS sharing table is gone" || { echo "FAIL sharing table remains"; fail=1; }
[ "$(q "select count(*) from pg_constraint where conname='profiles_search_needs_directory'")" = 0 ] && echo "PASS new constraint is gone" || { echo "FAIL constraint remains"; fail=1; }
[ "$(q "select position('raw_user_meta_data' in pg_get_functiondef('public.handle_new_user'::regproc)) > 0")" = t ] && echo "PASS the old handle_new_user is back" || { echo "FAIL handle_new_user not restored"; fail=1; }
[ "$(q "select to_regclass('public.public_profiles') is not null and (select count(*) from pg_policies where policyname like '%publicly readable') = 4")" = t ] && echo "PASS the old view and public read policies are untouched" || { echo "FAIL old objects changed"; fail=1; }
# the data loss guard: with a consent choice present, the rollback must refuse and change nothing
psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/migrations/20261107000100_privacy_expand.sql >/dev/null 2>&1 || { echo "FAIL could not re-apply expand for the guard test"; exit 1; }
psql -q -d $DB -c "insert into auth.users (id, aud, role, email) values (gen_random_uuid(), 'authenticated', 'authenticated', 'x@test.invalid')" >/dev/null 2>&1
psql -q -d $DB -c "update public.profiles set directory_listed = true" >/dev/null 2>&1
if psql -v ON_ERROR_STOP=1 -q -d $DB -f /tmp/rollback.sql 2>&1 | grep -q 'STOP: consent choices exist'; then echo "PASS the rollback refuses when a consent choice exists"; else echo "FAIL the rollback ran over a consent choice"; fail=1; fi
[ "$(q "select count(*) from information_schema.columns where table_name='profiles' and column_name='directory_listed'")" = 1 ] && echo "PASS the refused rollback changed nothing" || { echo "FAIL the refused rollback changed things"; fail=1; }
echo; [ $fail -eq 0 ] && echo "ROLLBACK CHECKS PASSED" || echo "ROLLBACK CHECKS FAILED"
exit $fail
