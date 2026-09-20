#!/usr/bin/env bash
#
# Runs the API integration suite against a real server and a throwaway database.
#
# The server is managed here rather than in Vitest's globalSetup, deliberately. Astro's
# dev server does not survive being started from inside a Vitest worker — it either
# daemonizes and is orphaned when the wrapper exits, or refuses to start at all under
# NODE_ENV=test. Driving it from a shell sidesteps that interaction entirely and makes
# the failure modes visible, which matters more for a test harness than elegance does.
set -euo pipefail

PORT="${TEST_PORT:-4455}"
DB="${TEST_DB:-frunk_test}"
BASE="http://localhost:${PORT}"

# CI points PG* at a service container; locally these are unset and psql uses the
# current user against a local socket, which is why nothing here hardcodes a host.
export PGHOST="${PGHOST:-}" PGUSER="${PGUSER:-}" PGPASSWORD="${PGPASSWORD:-}"
if [ -n "${PGHOST}" ]; then
  TEST_DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:5432/${DB}"
fi
ASTRO="node_modules/.bin/astro"

cleanup() {
  "$ASTRO" dev stop >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
dropdb --if-exists "$DB"
createdb "$DB"
psql "$DB" -q -f drizzle/bootstrap.sql >/dev/null

# POST /api/demo clones the Creed template, so the demo isolation test needs it.
DATABASE_URL="${TEST_DATABASE_URL:-postgresql://localhost/${DB}}" npx tsx scripts/seed-office.ts >/dev/null

DATABASE_URL="${TEST_DATABASE_URL:-postgresql://localhost/${DB}}" \
BETTER_AUTH_SECRET="test-only-secret-at-least-32-characters-long" \
NODE_ENV=development \
  "$ASTRO" dev --port "$PORT" --background >/dev/null

for _ in $(seq 1 120); do
  if curl -sf -o /dev/null "${BASE}/api/auth/ok"; then break; fi
  sleep 0.5
done

curl -sf -o /dev/null "${BASE}/api/auth/ok" || { echo "server never became ready on ${BASE}"; exit 1; }

TEST_BASE="$BASE" TEST_DB="$DB" npx vitest run "$@"
