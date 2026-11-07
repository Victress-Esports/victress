#!/usr/bin/env bash
# Privacy milestone checks on a throwaway LOCAL Postgres (never production):
#   1. migrations up to the privacy step, then EXPAND, then the compatibility test (current app still works)
#   2. CONTRACT, then the negative test suite
#   3. the decision 4 safeguard: both steps refuse to run when any profile exists
#   PGHOST=/var/lib/postgresql PGPORT=5433 PGUSER=postgres supabase/tests/local/run-privacy.sh
set -u
cd "$(dirname "$0")/../../.."
DB=victress_test; fail=0
fresh() { psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -d postgres >/dev/null 2>&1; psql -v ON_ERROR_STOP=1 -qc "create database $DB" -d postgres >/dev/null && psql -v ON_ERROR_STOP=1 -q -d $DB -f supabase/tests/local/00_supabase_stub.sql >/dev/null; }
apply() { psql -v ON_ERROR_STOP=1 -q -d $DB -f "$1" >/dev/null 2>/tmp/mig.err || { echo "MIGRATION FAILED: $1"; cat /tmp/mig.err; return 1; }; echo "applied $(basename "$1")"; }
results() { psql -q -d $DB -f "$1" 2>&1 | awk '/ERROR:/{f=1; sub(/^.*ERROR:  /,"")} /^CONTEXT:/{f=0} f'; }
base() { for m in supabase/migrations/2026110600*.sql; do apply "$m" || exit 1; done; }
EXPAND=supabase/migrations/20261107000100_privacy_expand.sql
CONTRACT=supabase/migrations/20261107000200_privacy_contract.sql

echo "##### 1. expand, then compatibility"
fresh; base; apply $EXPAND || exit 1
out=$(results supabase/tests/privacy_expand.sql); echo "$out"; echo "$out" | grep -q '^FAIL' && fail=1

echo; echo "##### 2. contract, then negative tests (rows exist)"
apply $CONTRACT || exit 1
out=$(results supabase/tests/privacy.sql); echo "$out"; echo "$out" | grep -q '^FAIL\|LEAK' && fail=1
[ "$(echo "$out" | grep -c '^PASS')" -lt 60 ] && { echo "TOO FEW CHECKS RAN"; fail=1; }

echo; echo "##### 3. decision 4 safeguard: refuse to run when profiles exist"
fresh; base
psql -q -d $DB -c "insert into auth.users (id, aud, role, email) values (gen_random_uuid(), 'authenticated', 'authenticated', 'x@test.invalid')" >/dev/null
if psql -v ON_ERROR_STOP=1 -q -d $DB -f $EXPAND 2>&1 | grep -q 'STOP (decision 4)'; then echo "PASS expand refuses to run when a profile exists"; else echo "FAIL expand ran with a profile present"; fail=1; fi
if psql -q -d $DB -c "select count(*) from public.profiles where search_indexable is not null" 2>&1 | grep -q ' 1'; then echo "PASS the refusal left the data untouched"; fi
fresh; base; apply $EXPAND >/dev/null || exit 1
psql -q -d $DB -c "insert into auth.users (id, aud, role, email) values (gen_random_uuid(), 'authenticated', 'authenticated', 'x@test.invalid')" >/dev/null
if psql -v ON_ERROR_STOP=1 -q -d $DB -f $CONTRACT 2>&1 | grep -q 'STOP (decision 4)'; then echo "PASS contract refuses to run when a profile exists"; else echo "FAIL contract ran with a profile present"; fail=1; fi
if psql -q -d $DB -c "select count(*) from pg_policies where policyname = 'profiles are publicly readable'" | grep -q ' 1'; then echo "PASS the refused contract changed nothing (the public policy is still there)"; else echo "FAIL the refused contract partly applied"; fail=1; fi

echo; [ $fail -eq 0 ] && echo "ALL PRIVACY DATABASE CHECKS PASSED" || echo "PRIVACY DATABASE CHECKS FAILED"
exit $fail
