#!/usr/bin/env bash
# Longer invite codes on a throwaway LOCAL Postgres (never production):
#   A. all migrations on an empty database, then supabase/tests/invite_codes.sql
#   B. a database that already has a team with a legacy 12 character code: the migration must keep it working,
#      skip the strength constraint (with a notice), and give new teams the long code
#   PGHOST=/var/lib/postgresql PGPORT=5433 PGUSER=postgres supabase/tests/local/run-invite-codes.sh
set -u
cd "$(dirname "$0")/../../.."
DB=victress_test; fail=0
fresh() { psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -d postgres >/dev/null 2>&1; psql -v ON_ERROR_STOP=1 -qc "create database $DB" -d postgres >/dev/null && psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/local/00_supabase_stub.sql >/dev/null; }
apply() { psql -v ON_ERROR_STOP=1 -q -d $DB -f "$1" >/dev/null 2>/tmp/ic.err || { echo "MIGRATION FAILED: $1"; cat /tmp/ic.err; exit 1; }; }
q() { psql -At -d $DB -c "$1"; }
NEW=supabase/migrations/20261107000500_longer_invite_codes.sql

echo "##### A. empty database, all migrations, then the test file"
fresh; for m in supabase/migrations/*.sql; do apply "$m"; done
out=$(psql -q -d $DB -f supabase/tests/invite_codes.sql 2>&1 | awk '/ERROR:/{f=1; sub(/^.*ERROR:  /,"")} /^CONTEXT:/{f=0} f'); echo "$out"
echo "$out" | grep -q '^FAIL' && fail=1
echo "(and the full privacy suite on top of the new migration)"
pout=$(psql -q -d $DB -f supabase/tests/privacy.sql 2>&1 | awk '/ERROR:/{f=1; sub(/^.*ERROR:  /,"")} /^CONTEXT:/{f=0} f')
echo "$pout" | grep -q '^FAIL\|LEAK' && { echo "FAIL the privacy suite reported a failure"; echo "$pout" | grep '^FAIL\|LEAK'; fail=1; } || echo "PASS the privacy suite ($(echo "$pout" | grep -c '^PASS') checks) still passes with the new migration"
[ "$(echo "$out" | grep -c '^PASS')" -lt 20 ] && { echo "TOO FEW CHECKS RAN"; fail=1; }

echo; echo "##### B. a legacy team exists before the migration"
# The privacy contract refuses to run once a profile exists, so this scenario stops before it: base migrations only, then the new one.
fresh; for m in supabase/migrations/2026110600*.sql; do apply "$m"; done
psql -q -d $DB -c "insert into auth.users (id, aud, role, email) values ('00000000-0000-4000-8000-0000000000a1','authenticated','authenticated','legacy@test.invalid')" >/dev/null
psql -q -d $DB -c "insert into public.teams (name, slug, owner_id) values ('Legacy Team', 'legacy-team-aaaaaa', '00000000-0000-4000-8000-0000000000a1')" >/dev/null
legacy=$(q "select invite_code from public.teams where slug='legacy-team-aaaaaa'")
[ "${#legacy}" = 12 ] && echo "PASS the legacy team has a 12 character code ($legacy is 48 bits)" || { echo "FAIL legacy code length ${#legacy}"; fail=1; }
msg=$(psql -v ON_ERROR_STOP=1 -q -d $DB -f $NEW 2>&1 >/dev/null)
echo "$msg" | grep -q 'teams_invite_code_strength not added' && echo "PASS the migration noticed the legacy code and skipped the strength constraint" || { echo "FAIL expected the skip notice, got: $msg"; fail=1; }
[ "$(q "select invite_code from public.teams where slug='legacy-team-aaaaaa'")" = "$legacy" ] && echo "PASS the legacy code was not changed" || { echo "FAIL the legacy code changed"; fail=1; }
[ "$(q "select (public.team_invite_info('$legacy') ->> 'name')")" = "Legacy Team" ] && echo "PASS the legacy code still resolves" || { echo "FAIL legacy code no longer resolves"; fail=1; }
[ "$(q "select count(*) from pg_constraint where conname='teams_invite_code_strength'")" = 0 ] && echo "PASS no strength constraint while legacy codes exist" || { echo "FAIL constraint present"; fail=1; }
psql -v ON_ERROR_STOP=1 -q -d $DB -c "insert into public.teams (name, slug, owner_id) values ('New Team', 'new-team-bbbbbb', '00000000-0000-4000-8000-0000000000a1')" >/dev/null
newc=$(q "select invite_code from public.teams where slug='new-team-bbbbbb'")
echo "$newc" | grep -Eq '^[a-z2-7]{26}$' && echo "PASS a team created after the migration gets the 26 character code" || { echo "FAIL new team code: $newc"; fail=1; }

echo; echo "##### C. the documented rollback"
awk '/^```sql/{f=1; next} /^```/{f=0} f' docs/proposals/team-invite-rate-limiting.md > /tmp/invite-rollback.sql
fresh; for m in supabase/migrations/*.sql; do apply "$m"; done
psql -v ON_ERROR_STOP=1 -q -d $DB -f /tmp/invite-rollback.sql >/dev/null 2>/tmp/ic.err && echo "PASS the rollback SQL ran" || { echo "FAIL rollback SQL errored"; cat /tmp/ic.err; fail=1; }
[ "$(q "select pg_get_expr(adbin, adrelid) from pg_attrdef where adrelid='public.teams'::regclass and adnum=(select attnum from pg_attribute where attrelid='public.teams'::regclass and attname='invite_code')")" = "substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 12)" ] && echo "PASS the old default is back" || { echo "FAIL default not restored"; fail=1; }
[ "$(q "select count(*) from pg_proc where proname='new_invite_code'")" = 0 ] && echo "PASS new_invite_code is gone" || { echo "FAIL new_invite_code remains"; fail=1; }
[ "$(q "select count(*) from pg_constraint where conname='teams_invite_code_strength'")" = 0 ] && echo "PASS the strength constraint is gone" || { echo "FAIL constraint remains"; fail=1; }
[ "$(q "select position('new_invite_code' in prosrc) = 0 from pg_proc where oid='public.regenerate_invite_code()'::regprocedure")" = t ] && echo "PASS regenerate_invite_code is back to the old body" || { echo "FAIL regenerate body"; fail=1; }

echo; [ $fail -eq 0 ] && echo "INVITE CODE CHECKS PASSED" || echo "INVITE CODE CHECKS FAILED"
exit $fail
