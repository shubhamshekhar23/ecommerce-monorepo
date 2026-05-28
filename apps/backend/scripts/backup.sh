#!/usr/bin/env bash
set -euo pipefail
# backup.sh — PostgreSQL logical backup using pg_dump custom format.
#
# ── Why custom format (-Fc) vs plain SQL (-Fp)? ──────────────────────────────
#   Plain SQL (-Fp): human-readable, but large and slow to restore.
#     A 5GB DB → 15GB SQL file → 45 min to restore (serial psql execution).
#
#   Custom format (-Fc): compressed binary, faster to restore in parallel.
#     A 5GB DB → 800MB .dump file → 10 min to restore with -j 4 workers.
#
#   Additional benefits of custom format:
#     - Selective restore: pg_restore -t orders — restore only the orders table
#     - Schema-only: pg_restore -s — restore schema without data (useful for new envs)
#     - Data-only: pg_restore -a — restore data into an existing schema
#
# ── Why NOT rely on this for PITR? ───────────────────────────────────────────
#   pg_dump is a snapshot at a point in time. If something breaks at 3:42pm and
#   your last dump was at 2:00am, you lose 1h 42min of data.
#
#   PITR (Point-In-Time Recovery) requires WAL archiving:
#     pg_basebackup (full snapshot) + continuous WAL shipping to S3.
#   With PITR, you can recover to any point within the retention window (e.g. 7 days).
#   Use pg_dump for weekly full snapshots + PITR for real recovery.
#
# ── The 3-2-1 rule ───────────────────────────────────────────────────────────
#   3 copies of data:  local + S3 + (PITR WAL = 3rd)
#   2 different media: disk + cloud
#   1 offsite:         S3 counts as offsite
#
# ── Usage ─────────────────────────────────────────────────────────────────────
#   DB_PASSWORD=secret bash backup.sh
#   DB_PASSWORD=secret S3_BUCKET=my-backups bash backup.sh

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-ecommerce_user}"
DB_NAME="${DB_NAME:-ecommerce_db}"
PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD env var required}"
export PGPASSWORD

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "→ Backing up $DB_NAME @ $(date -u '+%Y-%m-%dT%H:%M:%SZ')..."

# -Fc: custom format. -Z6: gzip compression level 6 (good speed/size balance).
# -v: verbose — logs each table as it's dumped (useful for progress on large DBs).
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -Fc \
  -Z6 \
  "$DB_NAME" \
  > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✓ Backup saved: $BACKUP_FILE ($SIZE)"

# ── Upload to S3 (optional) ───────────────────────────────────────────────────
# Set S3_BUCKET to enable. Requires AWS CLI configured with appropriate IAM role.
# STANDARD_IA (Infrequent Access) is ~60% cheaper than STANDARD for backups.
if [ -n "${S3_BUCKET:-}" ]; then
  S3_KEY="db-backups/$(basename "$BACKUP_FILE")"
  echo "→ Uploading to s3://$S3_BUCKET/$S3_KEY..."
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/$S3_KEY" --storage-class STANDARD_IA
  echo "✓ Uploaded to S3."
fi

# ── Rotate old local backups ──────────────────────────────────────────────────
# Keep only the last $KEEP_DAYS days locally.
# S3 lifecycle rules handle S3 retention (set them in the bucket policy).
echo "→ Removing backups older than $KEEP_DAYS days from $BACKUP_DIR..."
find "$BACKUP_DIR" -name "*.dump" -mtime +"$KEEP_DAYS" -delete
echo "✓ Rotation done."

echo "✓ Backup complete: $BACKUP_FILE"
