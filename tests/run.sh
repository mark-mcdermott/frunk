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
LOG="${TEST_LOG:-/tmp/frunk-test-server.log}"

# `--e2e` runs the Playwright journeys instead of the Vitest API suite, against the
# same freshly built server and database. Everything else about the run is identical.
RUNNER="vitest"
if [ "${1:-}" = "--e2e" ]; then RUNNER="playwright"; shift; fi

# `.env.local` (gitignored; written by `vercel env pull`) carries BLOB_READ_WRITE_TOKEN.
# Exporting it lets the upload journeys run locally against the real store; without
# it they skip, which is what happens in CI on purpose — no store token lives there.
if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi

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

# Exported rather than passed, so the reaper test can present the same secret.
export CRON_SECRET="test-only-cron-secret"

DATABASE_URL="${TEST_DATABASE_URL:-postgresql://localhost/${DB}}" \
BETTER_AUTH_SECRET="test-only-secret-at-least-32-characters-long" \
NODE_ENV=development \
  "$ASTRO" dev --port "$PORT" --background >"$LOG" 2>&1

for _ in $(seq 1 120); do
  if curl -sf -o /dev/null "${BASE}/api/auth/ok"; then break; fi
  sleep 0.5
done

curl -sf -o /dev/null "${BASE}/api/auth/ok" || { echo "server never became ready on ${BASE}"; exit 1; }

if [ "$RUNNER" = "playwright" ]; then
  TEST_BASE="$BASE" TEST_DB="$DB" npx playwright test "$@"
else
  TEST_BASE="$BASE" TEST_DB="$DB" npx vitest run "$@"
fi
