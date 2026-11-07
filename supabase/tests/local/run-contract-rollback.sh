#!/usr/bin/env bash
# Tests the prepared CONTRACT rollback (docs/proposals/privacy-contract-rollback.md) on a throwaway LOCAL Postgres (never production):
# base migrations, expand, snapshot, contract, the rollback SQL taken from the document, snapshot, compare.
#   PGHOST=/var/lib/postgresql PGPORT=5433 PGUSER=postgres supabase/tests/local/run-contract-rollback.sh
set -u
cd "$(dirname "$0")/../../.."
DB=victress_test; fail=0
psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -d postgres >/dev/null 2>&1
psql -v ON_ERROR_STOP=1 -qc "create database $DB" -d postgres >/dev/null && psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/local/00_supabase_stub.sql >/dev/null
for m in supabase/migrations/2026110600*.sql supabase/migrations/20261107000100_privacy_expand.sql; do psql -v ON_ERROR_STOP=1 -q -d $DB -f "$m" >/dev/null || { echo "MIGRATION FAILED $m"; exit 1; }; done
q() { psql -At -d $DB -c "$1"; }
ok() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1"; echo "   expected: $3"; echo "   got:      $2"; fail=1; fi; }

snap() {
  q "select 'policy|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||roles::text||'|'||coalesce(qual,'')||'|'||coalesce(with_check,'') from pg_policies where schemaname='public' and tablename in ('profiles','player_games','stat_entries','teams') order by 1"
  q "select 'view|'||md5(pg_get_viewdef('public.public_profiles'::regclass, true))||'|'||coalesce(c.reloptions::text,'') from pg_class c where c.oid = to_regclass('public.public_profiles')"
  q "select 'function|'||p.oid::regprocedure::text||'|'||md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('leaderboard','leaderboard_player_count','sitemap_profiles','sitemap_profile_count') order by 1"
}
snap > /tmp/pre.snap
[ "$(wc -l < /tmp/pre.snap)" -ge 10 ] && echo "PASS captured the pre contract state ($(wc -l < /tmp/pre.snap) items)" || { echo "FAIL snapshot too small"; fail=1; }
# what anon can read before contract
anon_cols() { q "select table_name||'.'||column_name||':'||privilege_type from information_schema.column_privileges where table_schema='public' and table_name in ('profiles','teams','player_games','stat_entries') and grantee='anon' order by 1"; }
anon_cols > /tmp/pre.anon
anon_tbls() { q "select table_name||':'||privilege_type from information_schema.table_privileges where table_schema='public' and table_name in ('profiles','teams','player_games','stat_entries','public_profiles') and grantee='anon' order by 1"; }
anon_tbls > /tmp/pre.anontbl

psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/migrations/20261107000200_privacy_contract.sql >/dev/null || { echo "CONTRACT FAILED"; exit 1; }
ok "contract removed the view" "$(q "select to_regclass('public.public_profiles') is null")" "t"
ok "contract removed the four public read policies" "$(q "select count(*) from pg_policies where policyname like '%publicly readable'")" "0"
ok "contract removed the four old functions" "$(q "select count(*) from pg_proc where proname in ('leaderboard','leaderboard_player_count','sitemap_profiles','sitemap_profile_count')")" "0"
ok "contract removed all anon access to the four tables" "$(anon_cols | wc -l)" "0"

awk '/^```sql/{f=1; next} /^```/{f=0} f' docs/proposals/privacy-contract-rollback.md > /tmp/contract-rollback.sql
psql -v ON_ERROR_STOP=1 -q -d $DB -f /tmp/contract-rollback.sql >/dev/null 2>/tmp/crb.err || { echo "FAIL rollback SQL errored"; cat /tmp/crb.err; exit 1; }
echo "PASS rollback SQL ran"

snap > /tmp/post.snap
if diff -q /tmp/pre.snap /tmp/post.snap >/dev/null; then echo "PASS policies, view definition and function definitions are identical to the pre contract state"; else echo "FAIL schema differs from the pre contract state"; diff /tmp/pre.snap /tmp/post.snap; fail=1; fi
ok "the four owner and member read policies from contract are gone" "$(q "select count(*) from pg_policies where policyname in ('owners read their profile','owners read their games','owners read their stats','members read their team')")" "0"

# Privileges: compare with what production had on 2026-11-07 (read from pg_class.relacl and pg_attribute.attacl), not with the local stub
ok "anon column grants on profiles (13 columns) and teams (5 columns) match production" \
  "$(q "select string_agg(table_name||'.'||column_name, ',' order by table_name, column_name) from information_schema.column_privileges where table_schema='public' and table_name in ('profiles','teams') and grantee='anon' and privilege_type='SELECT'")" \
  "profiles.avatar_url,profiles.bio,profiles.created_at,profiles.display_name,profiles.game,profiles.handle,profiles.id,profiles.is_demo,profiles.rank,profiles.role,profiles.search_indexable,profiles.team_id,profiles.updated_at,teams.created_at,teams.id,teams.name,teams.owner_id,teams.slug"
ok "anon table level select on player_games and stat_entries only (as in production)" \
  "$(q "select string_agg(c.relname||'='||a.privilege_type, ',' order by c.relname) from pg_class c, lateral (select privilege_type from information_schema.table_privileges t where t.table_name=c.relname and t.table_schema='public' and t.grantee='anon') a where c.oid in ('public.player_games'::regclass,'public.stat_entries'::regclass,'public.profiles'::regclass,'public.teams'::regclass)")" \
  "player_games=SELECT,stat_entries=SELECT"
exp_view_anon="rDxtm"; exp_view_svc="Dxtm"
if [ "$(q "select current_setting('server_version_num')::int >= 170000")" = f ]; then exp_view_anon="rDxt"; exp_view_svc="Dxt"; fi
acl=$(q "select relacl::text from pg_class where oid='public.public_profiles'::regclass")
echo "$acl" | grep -q "anon=$exp_view_anon/postgres" && echo "$acl" | grep -q "authenticated=$exp_view_anon/postgres" && echo "$acl" | grep -q "service_role=$exp_view_svc/postgres" && ! echo "$acl" | grep -q "anon=[a-zA-Z]*[awd]" && echo "PASS the view privileges match production (anon and authenticated $exp_view_anon, service_role $exp_view_svc)" || { echo "FAIL view privileges: $acl"; fail=1; }
for f in "leaderboard(text,text,integer,boolean)" "leaderboard_player_count(text,boolean)" "sitemap_profile_count()" "sitemap_profiles(integer,integer)"; do
  a=$(q "select (select string_agg(x, ',' order by x) from unnest(proacl::text[]) x) from pg_proc where oid='public.$f'::regprocedure")
  ok "execute privileges on $f match production (PUBLIC, owner, anon, authenticated)" "$a" "=X/postgres,anon=X/postgres,authenticated=X/postgres,postgres=X/postgres"
done

echo; [ $fail -eq 0 ] && echo "CONTRACT ROLLBACK CHECKS PASSED" || echo "CONTRACT ROLLBACK CHECKS FAILED"
exit $fail
