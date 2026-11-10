#!/usr/bin/env bash
# Partner account checks on a throwaway LOCAL Postgres (never production): all migrations, then supabase/tests/partner.sql.
#   PGHOST=/var/run/postgresql PGUSER=postgres supabase/tests/local/run-partner.sh
set -u
cd "$(dirname "$0")/../../.."
DB=victress_test
psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -d postgres >/dev/null 2>&1
psql -v ON_ERROR_STOP=1 -qc "create database $DB" -d postgres >/dev/null && psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/local/00_supabase_stub.sql >/dev/null
for m in supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -q -d $DB -f "$m" >/dev/null 2>/tmp/mig.err || { echo "MIGRATION FAILED: $m"; cat /tmp/mig.err; exit 1; }
  echo "applied $(basename "$m")"
done
run_test() { # file, minimum number of PASS lines
  out=$(psql -q -d $DB -f "$1" 2>&1 | awk '/ERROR:/{f=1; sub(/^.*ERROR:  /,"")} /^CONTEXT:/{f=0} f')
  echo "$out"
  echo "$out" | grep -q '^FAIL' && { echo "PARTNER DATABASE CHECKS FAILED in $1"; exit 1; }
  echo "$out" | grep -q '^RESULTS' || { echo "PARTNER TEST DID NOT REPORT in $1 (error above)"; exit 1; }
  [ "$(echo "$out" | grep -c '^PASS')" -lt "$2" ] && { echo "TOO FEW CHECKS RAN in $1"; exit 1; }
  return 0
}
run_test supabase/tests/partner.sql 90
run_test supabase/tests/partner_exclusivity.sql 50
run_test supabase/tests/partner_admin.sql 10
run_test supabase/tests/player_billing.sql 25
echo "ALL PARTNER DATABASE CHECKS PASSED"
