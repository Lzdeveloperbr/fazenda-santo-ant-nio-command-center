#!/usr/bin/env bash
# Applies every migration to a throwaway local database and runs the SQL tests.
# Usage: PGHOST=/path/to/socket PGPORT=5432 PGUSER=postgres tests/db/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="fsa_test_$$"
psql -X -q -d postgres -c "create database $DB" >/dev/null
trap 'psql -X -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
run() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1" >/dev/null; }
run tests/db/supabase_stub.sql
for f in drizzle/migrations/*.sql; do run "$f"; echo "applied $(basename "$f")"; done
for t in tests/db/*.test.sql; do psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$t" >/dev/null; echo "passed $(basename "$t")"; done
