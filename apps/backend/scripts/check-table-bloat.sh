#!/bin/bash
# check-table-bloat.sh
#
# Reports dead tuple counts and table sizes for all user tables.
# Use this to know when to run manual VACUUM or tune autovacuum settings.
#
# What are dead tuples?
#   PostgreSQL MVCC never updates rows in-place. An UPDATE writes a new version
#   and marks the old one "dead". DELETE marks rows dead. Dead rows are invisible
#   to new transactions but still take up disk space until VACUUM reclaims them.
#
# When to worry:
#   dead_pct > 20% on a frequently-written table (orders, outbox_events, audit_log)
#   means autovacuum is falling behind. Manual VACUUM is the short-term fix;
#   tuning autovacuum_vacuum_scale_factor is the long-term fix.
#
# Usage:
#   bash scripts/check-table-bloat.sh
#   bash scripts/check-table-bloat.sh vacuum    # show bloat, then VACUUM tables > 20% dead
#
# Note: VACUUM FULL is NOT run here — it acquires an exclusive lock for minutes.
#       Use pg_repack if you need to reclaim bloat on live tables.

set -euo pipefail

VACUUM_HIGH="${1:-}"
BLOAT_THRESHOLD=20

DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5434}"
DB_USER="${PGUSER:-ecommerce_user}"
DB_NAME="${PGDATABASE:-ecommerce_db}"
export PGPASSWORD="${PGPASSWORD:-ecommerce_password}"

echo "────────────────────────────────────────────────────────────────"
echo "  Table bloat report — ${DB_NAME}"
echo "  dead_pct > ${BLOAT_THRESHOLD}% = needs VACUUM"
echo "────────────────────────────────────────────────────────────────"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<SQL
SELECT
    relname                                              AS table_name,
    n_live_tup                                           AS live_tuples,
    n_dead_tup                                           AS dead_tuples,
    CASE WHEN n_live_tup + n_dead_tup > 0
         THEN round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 1)
         ELSE 0
    END                                                  AS dead_pct,
    pg_size_pretty(pg_total_relation_size(relid))        AS total_size,
    to_char(last_autovacuum, 'YYYY-MM-DD HH24:MI')       AS last_autovacuum,
    to_char(last_autoanalyze, 'YYYY-MM-DD HH24:MI')      AS last_autoanalyze,
    n_mod_since_analyze                                  AS mods_since_analyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
SQL

if [ "${VACUUM_HIGH}" = "vacuum" ]; then
    echo ""
    echo "Running VACUUM on tables with dead_pct > ${BLOAT_THRESHOLD}%..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<SQL
DO \$\$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT relname FROM pg_stat_user_tables
        WHERE n_live_tup + n_dead_tup > 100
          AND 100.0 * n_dead_tup / (n_live_tup + n_dead_tup) > ${BLOAT_THRESHOLD}
    LOOP
        RAISE NOTICE 'VACUUM %', tbl;
        EXECUTE 'VACUUM ' || quote_ident(tbl);
    END LOOP;
END
\$\$;
SQL
    echo "VACUUM complete. Re-run this script to see updated dead tuple counts."
fi
