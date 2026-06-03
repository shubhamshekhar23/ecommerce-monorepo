#!/bin/bash
# analyze-slow-queries.sh
#
# Connects to the local dev Postgres and shows the top 10 most expensive queries
# using pg_stat_statements.
#
# Prerequisite: postgres must have been started with
#   -c shared_preload_libraries=pg_stat_statements
# This is already set in docker-compose.yml (Phase 10).
#
# Usage:
#   bash scripts/analyze-slow-queries.sh
#   bash scripts/analyze-slow-queries.sh 20        # show top 20
#   bash scripts/analyze-slow-queries.sh 10 reset  # show top 10, then reset stats
#
# In production point to your DATABASE_URL:
#   PGPASSWORD=prod_pass psql -h prod-host -U ecommerce_user -d ecommerce_db -f /dev/stdin < <(...)
#
# Understanding the output:
#   total_exec_time — the bottleneck metric. Sort by this to find what hurts most.
#   mean_exec_ms    — average duration per call. A high mean with low calls = sporadic slow query.
#   calls           — how often it runs. Low mean × high calls = O(N) query pattern (N+1).
#   stddev_exec_ms  — high stddev = caching or locking effect (sometimes fast, sometimes slow).

set -euo pipefail

LIMIT="${1:-10}"
RESET="${2:-}"

DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5434}"
DB_USER="${PGUSER:-ecommerce_user}"
DB_NAME="${PGDATABASE:-ecommerce_db}"
export PGPASSWORD="${PGPASSWORD:-ecommerce_password}"

echo "────────────────────────────────────────────────────────────────"
echo "  Top ${LIMIT} queries by total execution time"
echo "  Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
echo "────────────────────────────────────────────────────────────────"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<SQL
SELECT
    left(query, 120)                                     AS query,
    calls,
    round(total_exec_time::numeric, 2)                   AS total_exec_ms,
    round(mean_exec_time::numeric, 2)                    AS mean_exec_ms,
    round(stddev_exec_time::numeric, 2)                  AS stddev_exec_ms,
    rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY total_exec_time DESC
LIMIT ${LIMIT};
SQL

if [ "${RESET}" = "reset" ]; then
    echo ""
    echo "Resetting pg_stat_statements counters..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "SELECT pg_stat_statements_reset();" -q
    echo "Stats reset. Run this script again after load testing to see fresh data."
fi
