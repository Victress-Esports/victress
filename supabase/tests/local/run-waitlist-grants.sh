#!/usr/bin/env bash
# Waitlist grants on a throwaway LOCAL Postgres (never production or staging).
# The local stub grants every privilege to the API roles; real Supabase projects do not. So the test first removes the
# row privileges the way a real project has them (no DML for anon, authenticated or service_role on a migration-created table).
#   PGHOST=/var/lib/postgresql PGPORT=5433 PGUSER=postgres supabase/tests/local/run-waitlist-grants.sh
set -u
cd "$(dirname "$0")/../../.."
DB=victress_test; fail=0
NEW=supabase/migrations/20261107000620_waitlist_service_role_grants.sql
fresh() { psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -d postgres >/dev/null 2>&1; psql -v ON_ERROR_STOP=1 -qc "create database $DB" -d postgres >/dev/null && psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/local/00_supabase_stub.sql >/dev/null; }
q() { psql -At -d $DB -c "$1"; }
chk() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1 (got '$2', wanted '$3')"; fail=1; fi; }
# Tries an insert as a role; prints allowed / denied / other.
try_insert() { psql -At -d $DB <<SQL 2>&1
begin;
set local role $1;
do \$t\$ begin
  insert into public.waitlist (email, interest) values ('probe@test.invalid', 'pro');
  raise exception 'RESULT:allowed';
exception when insufficient_privilege then raise exception 'RESULT:denied';
end \$t\$;
rollback;
SQL
}
res() { try_insert "$1" | grep -o 'RESULT:[a-z]*' | cut -d: -f2; }

fresh; for m in supabase/migrations/*.sql; do [ "$m" = "$NEW" ] && continue; psql -v ON_ERROR_STOP=1 -q -d $DB -f "$m" >/dev/null 2>/tmp/wl.err || { echo "MIGRATION FAILED: $m"; cat /tmp/wl.err; exit 1; }; done
psql -q -d $DB -c "revoke select, insert, update, delete on public.waitlist from anon, authenticated, service_role" >/dev/null

echo "##### A. before: the state a real project has"
chk "service_role cannot INSERT into waitlist (the live bug)" "$(res service_role)" denied
chk "anon has TRUNCATE on waitlist" "$(q "select has_table_privilege('anon','public.waitlist','truncate')")" t

echo; echo "##### B. after the migration"
psql -v ON_ERROR_STOP=1 -q -d $DB -f $NEW >/dev/null 2>/tmp/wl.err && echo "PASS migration ran" || { echo "FAIL migration errored"; cat /tmp/wl.err; fail=1; }
chk "service_role can INSERT into waitlist" "$(res service_role)" allowed
chk "anon cannot INSERT into waitlist" "$(res anon)" denied
chk "authenticated cannot INSERT into waitlist" "$(res authenticated)" denied
for p in select update delete truncate references trigger; do
  chk "anon has no $p on waitlist" "$(q "select has_table_privilege('anon','public.waitlist','$p')")" f
  chk "authenticated has no $p on waitlist" "$(q "select has_table_privilege('authenticated','public.waitlist','$p')")" f
done
chk "service_role cannot SELECT waitlist (insert only)" "$(q "select has_table_privilege('service_role','public.waitlist','select')")" f
chk "row level security is still on" "$(q "select relrowsecurity from pg_class where oid='public.waitlist'::regclass")" t
chk "the unique (email, interest) constraint is untouched" "$(q "select count(*) from pg_constraint where conrelid='public.waitlist'::regclass and contype='u'")" 1

echo; echo "##### C. the documented rollback"
awk '/^```sql/{f=1; next} /^```/{f=0} f' docs/proposals/waitlist-grants.md | sed -n '/^-- ROLLBACK/,$p' | grep -v maintain > /tmp/wl-rollback.sql
[ -s /tmp/wl-rollback.sql ] || { echo "FAIL no rollback SQL found"; fail=1; }
psql -v ON_ERROR_STOP=1 -q -d $DB -f /tmp/wl-rollback.sql >/dev/null 2>/tmp/wl.err && echo "PASS rollback ran" || { echo "FAIL rollback errored"; cat /tmp/wl.err; fail=1; }
chk "after rollback service_role cannot INSERT again" "$(res service_role)" denied
chk "after rollback anon has TRUNCATE again (previous state)" "$(q "select has_table_privilege('anon','public.waitlist','truncate')")" t

echo; [ $fail -eq 0 ] && echo "WAITLIST GRANT CHECKS PASSED" || echo "WAITLIST GRANT CHECKS FAILED"
exit $fail
