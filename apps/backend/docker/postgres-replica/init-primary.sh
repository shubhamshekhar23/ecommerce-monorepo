#!/bin/bash
# Runs inside the PRIMARY postgres container on first start.
# Configures WAL settings required for streaming replication.
#
# Why these settings?
#   - wal_level=replica: writes enough WAL for streaming. Default is 'minimal'
#     which only records what is needed for crash recovery — not enough for replication.
#   - max_wal_senders=3: allows up to 3 replica connections simultaneously.
#   - wal_keep_size=64: keeps at least 64MB of WAL files on primary so a slow
#     replica that falls behind can still catch up without needing a base backup.
#   - hot_standby=on: allows read queries on the replica (not just replication lag monitoring).
#
# These settings live in postgresql.conf. In the compose file we pass them as
# -c flags to the postgres startup command instead of mounting a conf file —
# simpler for development.

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create the replication user if not already created by the migration
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
            CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_password';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO replicator;
EOSQL

echo "Primary replication setup complete."
