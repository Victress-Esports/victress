#!/usr/bin/env bash
# Dashboard foundation checks on a throwaway LOCAL Postgres (never production): all migrations, then supabase/tests/dashboard.sql.
#   PGHOST=/var/lib/postgresql PGPORT=5433 PGUSER=postgres supabase/tests/local/run-dashboard.sh
set -u
cd "$(dirname "$0")/../../.."
DB=victress_test
psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -d postgres >/dev/null 2>&1
psql -v ON_ERROR_STOP=1 -qc "create database $DB" -d postgres >/dev/null && psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/local/00_supabase_stub.sql >/dev/null
for m in supabase/migrations/20261106*.sql supabase/migrations/20261107*.sql supabase/migrations/20261108*.sql; do
  psql -v ON_ERROR_STOP=1 -q -d $DB -f "$m" >/dev/null 2>/tmp/mig.err || { echo "MIGRATION FAILED: $m"; cat /tmp/mig.err; exit 1; }
  echo "applied $(basename "$m")"
done
out=$(for f in supabase/tests/dashboard.sql supabase/tests/upload_allowlist.sql supabase/tests/scrim_matches.sql supabase/tests/game_imports.sql; do psql -q -d $DB -f $f 2>&1 | awk '/ERROR:/{f=1; sub(/^.*ERROR:  /,"")} /^CONTEXT:/{f=0} f'; done)
echo "$out"
echo "$out" | grep -q '^FAIL' && { echo "DASHBOARD DATABASE CHECKS FAILED"; exit 1; }
[ "$(echo "$out" | grep -c '^PASS')" -lt 60 ] && { echo "TOO FEW CHECKS RAN"; exit 1; }
echo "ALL DASHBOARD DATABASE CHECKS PASSED"
