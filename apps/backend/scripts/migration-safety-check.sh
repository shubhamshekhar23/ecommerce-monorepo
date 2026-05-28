#!/usr/bin/env bash
set -euo pipefail
# migration-safety-check.sh
#
# Validates that every new migration is backward-compatible with the currently-running
# app version. This is required for zero-downtime deploys.
#
# The problem:
#   In a blue-green deploy, the sequence is:
#     1. Run migration (new schema is live)
#     2. Start new containers (app N+1 is starting)
#     3. Switch traffic (app N+1 goes live)
#     4. Stop old containers (app N is stopped)
#
#   Between steps 1 and 3, app N is still serving traffic on the NEW schema.
#   Any migration that breaks app N will cause errors for every request in that window.
#
# Unsafe patterns:
#   DROP TABLE/COLUMN — app N tries to SELECT/INSERT a column → error
#   RENAME TABLE/COLUMN — app N uses the old name → query error
#   ADD COLUMN NOT NULL (no DEFAULT) — app N inserts without the new column → constraint fail
#
# The fix (Expand/Contract pattern):
#   Release N:   ADD COLUMN new_col NULLABLE — safe, app N ignores it
#   Release N+1: backfill + make NOT NULL — app N+1 supplies the value; app N is gone
#   Release N+2: DROP COLUMN old_col — app N is long gone

# ── Determine base for comparison ────────────────────────────────────────────
# In CI (PR): compare against the PR base branch
# In CI (push): compare HEAD against parent commit
# Locally: compare HEAD against HEAD~1
if [ -n "${GITHUB_BASE_REF:-}" ]; then
  BASE="origin/$GITHUB_BASE_REF"
elif [ -n "${GITHUB_SHA:-}" ]; then
  BASE="HEAD~1"
else
  BASE="HEAD~1"
fi

# ── Find new migration files ──────────────────────────────────────────────────
NEW_MIGRATIONS=$(git diff --name-only --diff-filter=A "$BASE"...HEAD \
  -- 'apps/backend/prisma/migrations/**/*.sql' 2>/dev/null || \
  git diff --name-only --diff-filter=A HEAD~1 HEAD \
  -- 'apps/backend/prisma/migrations/**/*.sql' 2>/dev/null || true)

if [ -z "$NEW_MIGRATIONS" ]; then
  echo "No new migration files detected. Skipping safety check."
  exit 0
fi

echo "Migration safety check — comparing against: $BASE"
echo ""
FAILED=0

for FILE in $NEW_MIGRATIONS; do
  echo "Checking: $FILE"
  FILE_FAILED=0

  # DROP TABLE / DROP COLUMN
  # Old code still queries the old schema for ~30s after migration.
  # A dropped column/table = every query that touches it fails immediately.
  if grep -qiE 'DROP\s+(TABLE|COLUMN)\b' "$FILE"; then
    echo "  [FAIL] DROP TABLE or DROP COLUMN detected."
    echo "         Old app version reads this column/table for ~30s after migration."
    echo "         Fix: use Expand/Contract — keep old column, add new one, drop in N+2."
    FAILED=1
    FILE_FAILED=1
  fi

  # RENAME TABLE / RENAME COLUMN / RENAME TO
  # Same breakage as DROP — old code uses the original name for selects and inserts.
  if grep -qiE '\bRENAME\s+(TABLE|COLUMN)\b|\bRENAME\s+TO\b' "$FILE"; then
    echo "  [FAIL] RENAME TABLE or RENAME COLUMN detected."
    echo "         Old app version references the original name → query error."
    echo "         Fix: add new column, dual-write in app N+1, drop old in app N+2."
    FAILED=1
    FILE_FAILED=1
  fi

  # ADD COLUMN NOT NULL without DEFAULT on an existing table
  # Old app code doesn't know about this column → INSERT omits it → constraint violation.
  # Safe alternatives: nullable first, or add DEFAULT (even if you later drop it).
  if grep -qiE '\bADD\s+COLUMN\b.*\bNOT\s+NULL\b' "$FILE" && ! grep -qiE '\bDEFAULT\b' "$FILE"; then
    echo "  [WARN] ADD COLUMN NOT NULL without DEFAULT."
    echo "         Old code inserts without this column → constraint violation."
    echo "         Fix: make nullable first, or add DEFAULT, tighten in next release."
    # WARN only — could be a new table where NOT NULL is always fine
  fi

  [ "$FILE_FAILED" -eq 0 ] && echo "  [PASS]"
  echo ""
done

if [ "$FAILED" -eq 1 ]; then
  echo "Migration safety check FAILED. Fix the issues above before merging."
  exit 1
fi

echo "Migration safety check PASSED."
