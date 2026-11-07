#!/usr/bin/env bash
# Invite lookup server only, on a throwaway LOCAL Postgres (never production or staging):
#   A. all migrations, then supabase/tests/invite_info_server_only.sql and the full privacy suite
#   B. the documented rollback restores the previous grants (anon and signed in can call it again)
#   PGHOST=/var/lib/postgresql PGPORT=5433 PGUSER=postgres supabase/tests/local/run-invite-info.sh
set -u
cd "$(dirname "$0")/../../.."
DB=victress_test; fail=0
fresh() { psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -d postgres >/dev/null 2>&1; psql -v ON_ERROR_STOP=1 -qc "create database $DB" -d postgres >/dev/null && psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/local/00_supabase_stub.sql >/dev/null; }
apply() { psql -v ON_ERROR_STOP=1 -q -d $DB -f "$1" >/dev/null 2>/tmp/ii.err || { echo "MIGRATION FAILED: $1"; cat /tmp/ii.err; exit 1; }; }
rep() { awk '/ERROR:/{f=1; sub(/^.*ERROR:  /,"")} /^CONTEXT:/{f=0} f'; }

echo "##### A. all migrations, then the test file"
fresh; for m in supabase/migrations/*.sql; do apply "$m"; done
out=$(psql -q -d $DB -f supabase/tests/invite_info_server_only.sql 2>&1 | rep); echo "$out"
echo "$out" | grep -q '^FAIL' && fail=1
[ "$(echo "$out" | grep -c '^PASS')" -lt 5 ] && { echo "TOO FEW CHECKS RAN"; fail=1; }
pout=$(psql -q -d $DB -f supabase/tests/privacy.sql 2>&1 | rep)
echo "$pout" | grep -q '^FAIL\|LEAK' && { echo "FAIL the privacy suite reported a failure"; echo "$pout" | grep '^FAIL\|LEAK'; fail=1; } || echo "PASS the privacy suite ($(echo "$pout" | grep -c '^PASS') checks) passes with the new migration"

echo; echo "##### B. the documented rollback"
awk '/^```sql/{f=1; next} /^```/{f=0} f' docs/proposals/invite-lookup-server-only.md | sed -n '/^-- ROLLBACK/,$p' > /tmp/ii-rollback.sql
[ -s /tmp/ii-rollback.sql ] || { echo "FAIL no rollback SQL found in the proposal"; fail=1; }
fresh; for m in supabase/migrations/*.sql; do apply "$m"; done
psql -v ON_ERROR_STOP=1 -q -d $DB -f /tmp/ii-rollback.sql >/dev/null 2>/tmp/ii.err && echo "PASS the rollback SQL ran" || { echo "FAIL rollback errored"; cat /tmp/ii.err; fail=1; }
for role in anon authenticated service_role; do
  [ "$(psql -At -d $DB -c "select has_function_privilege('$role','public.team_invite_info(text)','execute')")" = t ] && echo "PASS after rollback $role can execute team_invite_info" || { echo "FAIL after rollback $role cannot execute"; fail=1; }
done

echo; [ $fail -eq 0 ] && echo "INVITE LOOKUP CHECKS PASSED" || echo "INVITE LOOKUP CHECKS FAILED"
exit $fail
