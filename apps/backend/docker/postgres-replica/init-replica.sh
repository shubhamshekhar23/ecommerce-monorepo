#!/bin/bash
# Runs as the ENTRYPOINT of the replica container on first start.
# Uses pg_basebackup to take a full binary copy of the primary, then starts
# postgres in standby mode.
#
# Why pg_basebackup (not just mounting a volume)?
#   The replica needs an exact byte-for-byte copy of the primary's data directory
#   at a consistent point in time. pg_basebackup does this over the replication
#   protocol — it requests a checkpoint on the primary, copies all data files,
#   and records the WAL position to start streaming from.
#
# Standby signals (PostgreSQL 12+):
#   - standby.signal: presence of this file tells postgres to start in standby mode
#   - primary_conninfo: in postgresql.auto.conf, tells standby where to stream from
#
# Hot standby: with hot_standby=on (passed via postgres command), the replica
# accepts read queries while replaying WAL. Write attempts are rejected with:
#   "ERROR: cannot execute ... in a read-only transaction"

set -e

# Wait for the primary to be accepting connections
until pg_isready -h postgres -p 5432 -U "$PGUSER"; do
    echo "Replica init: waiting for primary to be ready..."
    sleep 2
done

# Only take the base backup if this is a fresh container (data dir is empty)
if [ -z "$(ls -A "$PGDATA")" ]; then
    echo "Replica init: running pg_basebackup from primary..."
    PGPASSWORD="$REPLICATION_PASSWORD" pg_basebackup \
        -h postgres \
        -p 5432 \
        -U replicator \
        -D "$PGDATA" \
        -Fp \
        -Xs \
        -R \
        -P

    # -Fp: plain format (file-by-file copy)
    # -Xs: stream WAL during backup (no gap between backup and streaming start)
    # -R: write standby.signal and primary_conninfo automatically
    # -P: show progress

    echo "Replica init: base backup complete. Starting in standby mode."
else
    echo "Replica init: data directory not empty, skipping base backup."
fi

# Hand off to the standard postgres entrypoint
exec docker-entrypoint.sh postgres "$@"
