#!/bin/bash
# create-partition.sh
#
# Creates the next quarterly partition for the RequestMetric table.
# Run this at the start of each quarter (or via cron, e.g. on the 25th of the last month
# of each quarter: 25 0 25 3,6,9,12 * bash /app/scripts/create-partition.sh).
#
# Why run this in advance?
#   If no matching partition exists when a row is inserted, Postgres raises:
#     ERROR: no partition of relation "RequestMetric" found for row
#   You want to create the next partition BEFORE the quarter starts, not during it.
#
# Usage:
#   bash scripts/create-partition.sh          # create next quarter from today
#   bash scripts/create-partition.sh list     # list existing partitions instead
#
# The underlying SQL function is: SELECT create_next_quarter_partition();
# It is idempotent — running it when the partition already exists returns a message
# and does nothing.

set -euo pipefail

ACTION="${1:-create}"

DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5434}"
DB_USER="${PGUSER:-ecommerce_user}"
DB_NAME="${PGDATABASE:-ecommerce_db}"
export PGPASSWORD="${PGPASSWORD:-ecommerce_password}"

if [ "${ACTION}" = "list" ]; then
    echo "── RequestMetric partitions ─────────────────────────────────────"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<SQL
SELECT
    child.relname                                            AS partition_name,
    pg_get_expr(child.relpartbound, child.oid)               AS partition_range,
    pg_size_pretty(pg_total_relation_size(child.oid))        AS size
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child  ON pg_inherits.inhrelid  = child.oid
WHERE parent.relname = 'RequestMetric'
ORDER BY child.relname;
SQL
else
    echo "Creating next quarter partition for RequestMetric..."
    RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT create_next_quarter_partition();" | xargs)
    echo "Result: ${RESULT}"
    echo ""
    echo "Tip: run with 'list' to see all partitions."
fi
