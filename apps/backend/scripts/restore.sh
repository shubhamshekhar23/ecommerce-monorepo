#!/usr/bin/env bash
set -euo pipefail
# restore.sh — Restore PostgreSQL from a pg_dump custom-format backup.
#
# ── Restore flow ─────────────────────────────────────────────────────────────
#   1. Create a safety backup of the current DB (in case restore goes wrong)
#   2. Terminate all active connections to the DB
#   3. Drop and recreate the database (clean slate)
#   4. pg_restore -j N — parallel restore with N workers
#   5. Remind you to run prisma migrate deploy to sync Prisma's _prisma_migrations table
#
# ── Why parallel restore (-j N)? ─────────────────────────────────────────────
#   pg_restore -j 4 uses 4 OS processes, each restoring one table at a time.
#   On a 4-core server: 1GB dump restores in ~45s instead of ~4 min.
#   Each worker needs its own connection, so MAX_CONNECTIONS must be > N.
#   (Our PgBouncer default pool is 20, so -j 4 is safe.)
#
# ── Restore from S3 ──────────────────────────────────────────────────────────
#   To restore from S3:
#     aws s3 cp s3://bucket/db-backups/ecommerce_db_20260528_020000.dump /tmp/restore.dump
#     BACKUP_FILE=/tmp/restore.dump DB_PASSWORD=secret bash restore.sh
#
# ── Usage ─────────────────────────────────────────────────────────────────────
#   BACKUP_FILE=/backups/ecommerce_db_20260528_020000.dump \
#   DB_PASSWORD=secret \
#   bash restore.sh

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-ecommerce_user}"
DB_NAME="${DB_NAME:-ecommerce_db}"
PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD env var required}"
export PGPASSWORD

BACKUP_FILE="${BACKUP_FILE:?BACKUP_FILE env var required — path to .dump file}"
PARALLEL_JOBS="${RESTORE_JOBS:-4}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "⚠  This will DROP and recreate '$DB_NAME'. All current data will be lost."
echo "   Backup file: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"
printf "   Continue? [y/N] "
read -r CONFIRM
[ "${CONFIRM:-N}" != "y" ] && echo "Aborted." && exit 0

# ── Step 1: Safety backup ─────────────────────────────────────────────────────
# Never destroy data without capturing the current state first.
# If the restore fails halfway, you can restore from this safety backup.
SAFETY_FILE="/tmp/${DB_NAME}_before_restore_$(date +%Y%m%d_%H%M%S).dump"
echo "→ Creating safety backup at $SAFETY_FILE..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -Fc -Z6 "$DB_NAME" > "$SAFETY_FILE"
echo "  ✓ Safety backup saved ($( du -sh "$SAFETY_FILE" | cut -f1 ))."

# ── Step 2: Terminate connections ─────────────────────────────────────────────
# You can't drop a DB with active connections. Terminate them gracefully.
echo "→ Terminating active connections to $DB_NAME..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -q -c \
  "SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
echo "  ✓ Connections terminated."

# ── Step 3: Drop and recreate ─────────────────────────────────────────────────
echo "→ Dropping $DB_NAME..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -q \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" \
  -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"
echo "  ✓ Database recreated."

# ── Step 4: Restore ───────────────────────────────────────────────────────────
# --no-owner: don't restore original object ownership (fine if restoring to same user)
# --no-acl:   don't restore GRANTs (avoids permission errors in different envs)
# -j N:       parallel workers (each restores one table simultaneously)
echo "→ Restoring from $BACKUP_FILE with $PARALLEL_JOBS parallel workers..."
pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -j "$PARALLEL_JOBS" \
  --no-owner \
  --no-acl \
  --verbose \
  "$BACKUP_FILE"
echo "  ✓ Restore complete."

echo ""
echo "✓ Database $DB_NAME restored from $BACKUP_FILE"
echo ""
echo "Next steps:"
echo "  1. Run 'npx prisma migrate deploy' to sync Prisma's _prisma_migrations table."
echo "  2. Verify: docker exec ecommerce_app npx prisma migrate status"
echo "  3. Safety backup is at $SAFETY_FILE — delete when confirmed OK."
