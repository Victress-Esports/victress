#!/usr/bin/env bash
# Rollback of the dashboard migrations (000300, 000310, 000400) on a throwaway LOCAL Postgres (never production or staging).
#   A. all migrations, then ROLLBACK_ALL: the schema must equal a database built without those three migrations
#   B. all migrations, then ROLLBACK_400_ONLY: the schema must equal a database built without 000400
#   C. the rollback refuses to run when a table holds data
# "Equal" = the same fingerprint (columns, defaults, constraints, indexes, policies, functions, triggers, tables, buckets).
# Privilege categories are skipped: the local stub's default grants differ from a real Supabase project.
#   PGHOST=/var/lib/postgresql PGPORT=5433 PGUSER=postgres supabase/tests/local/run-dashboard-rollback.sh
set -u
cd "$(dirname "$0")/../../.."
fail=0; DOC=docs/proposals/dashboard-migrations-production-plan.md
build() { # name, migrations to skip (glob words)
  local db=$1; shift
  psql -v ON_ERROR_STOP=1 -qc "drop database if exists $db" -d postgres >/dev/null 2>&1; psql -v ON_ERROR_STOP=1 -qc "create database $db" -d postgres >/dev/null
  psql -v ON_ERROR_STOP=1 -q -d $db -f supabase/tests/local/00_supabase_stub.sql >/dev/null
  for m in supabase/migrations/*.sql; do
    skip=0; for s in "$@"; do case $m in *$s*) skip=1;; esac; done
    [ $skip = 1 ] && continue
    psql -v ON_ERROR_STOP=1 -q -d $db -f "$m" >/dev/null 2>/tmp/dr.err || { echo "MIGRATION FAILED: $m"; cat /tmp/dr.err; exit 1; }
  done
}
fp() { psql -At -F' | ' -d "$1" -f supabase/tests/local/schema-fingerprint.sql | grep -v privileges; }
block() { awk -v tag="$1" '/^```sql/{f=1; buf=""; next} /^```/{if(f && buf ~ ("-- " tag)) printf "%s", buf; f=0} f{buf=buf $0 "\n"}' $DOC; }
block ROLLBACK_ALL > /tmp/dr-all.sql; block ROLLBACK_400_ONLY > /tmp/dr-400.sql
[ -s /tmp/dr-all.sql ] && [ -s /tmp/dr-400.sql ] || { echo "FAIL could not extract the rollback blocks from $DOC"; exit 1; }
cmp() { if [ "$(fp "$1")" = "$(fp "$2")" ]; then echo "PASS $3"; else echo "FAIL $3"; diff <(fp "$1") <(fp "$2"); fail=1; fi; }

echo "##### A. full rollback"
build dr_ref 000300_dashboard 000310_upload 000400_scrim
build dr_a
psql -v ON_ERROR_STOP=1 -q -d dr_a -f /tmp/dr-all.sql >/dev/null 2>/tmp/dr.err && echo "PASS ROLLBACK_ALL ran" || { echo "FAIL ROLLBACK_ALL errored"; cat /tmp/dr.err; fail=1; }
cmp dr_a dr_ref "after ROLLBACK_ALL the schema equals a database built without the three migrations"

echo; echo "##### B. rollback of 000400 only"
build dr_c 000400_scrim
build dr_b
psql -v ON_ERROR_STOP=1 -q -d dr_b -f /tmp/dr-400.sql >/dev/null 2>/tmp/dr.err && echo "PASS ROLLBACK_400_ONLY ran" || { echo "FAIL ROLLBACK_400_ONLY errored"; cat /tmp/dr.err; fail=1; }
cmp dr_b dr_c "after ROLLBACK_400_ONLY the schema equals a database built without 000400"

echo; echo "##### C. data guard"
build dr_d
psql -q -d dr_d -c "insert into auth.users (id, aud, role, email) values ('00000000-0000-4000-8000-0000000000d1','authenticated','authenticated','guard@test.invalid')" >/dev/null
psql -q -d dr_d -c "insert into public.tournament_entries (profile_id, game, name) values ('00000000-0000-4000-8000-0000000000d1','CS2','Guard Cup')" >/dev/null
out=$(psql -v ON_ERROR_STOP=1 -q -d dr_d -f /tmp/dr-all.sql 2>&1)
echo "$out" | grep -q "STOP: the dashboard tables" && echo "PASS the rollback refuses to run while a table holds data" || { echo "FAIL the guard did not stop it: $out"; fail=1; }
[ "$(psql -At -d dr_d -c "select count(*) from public.tournament_entries")" = 1 ] && echo "PASS the row is still there" || { echo "FAIL data lost"; fail=1; }

echo; [ $fail -eq 0 ] && echo "DASHBOARD ROLLBACK CHECKS PASSED" || echo "DASHBOARD ROLLBACK CHECKS FAILED"
exit $fail
