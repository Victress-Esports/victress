#!/usr/bin/env bash
# Runs the migrations and SQL tests against a throwaway LOCAL Postgres. Never touches production.
#   PGHOST=/var/lib/postgresql PGPORT=5433 PGUSER=postgres supabase/tests/local/run.sh [test.sql ...]
# Creates a fresh database, applies supabase/tests/local/00_supabase_stub.sql and every migration in order, then runs
# each test file (default: all of supabase/tests/*.sql). The tests roll themselves back and report in an error message.
set -u
cd "$(dirname "$0")/../../.."
DB=victress_test
psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -d postgres >/dev/null
psql -v ON_ERROR_STOP=1 -qc "create database $DB" -d postgres >/dev/null
psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/local/00_supabase_stub.sql >/dev/null || exit 1
for m in supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -q -d $DB -f "$m" >/dev/null 2>/tmp/mig.err || { echo "MIGRATION FAILED: $m"; cat /tmp/mig.err; exit 1; }
  echo "applied $(basename "$m")"
done
tests=("$@"); [ ${#tests[@]} -eq 0 ] && tests=(supabase/tests/*.sql)
for t in "${tests[@]}"; do
  echo "=== $t"
  # The tests end by raising an exception whose message holds the results; print from the error to its CONTEXT line.
  psql -q -d $DB -f "$t" 2>&1 | awk '/ERROR:/{f=1; sub(/^.*ERROR:  /,"")} /^CONTEXT:/{f=0} f' | head -120
done
