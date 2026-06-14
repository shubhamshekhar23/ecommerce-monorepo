-- Phase 10: Create replication user for streaming replication
--
-- The replica Postgres container connects to the primary using this user
-- to pull WAL segments. The REPLICATION privilege is a special Postgres
-- privilege — it cannot be granted to regular tables; it is a connection
-- attribute that allows the user to start streaming replication.
--
-- After applying this migration, the postgres container must be restarted
-- with wal_level=replica and max_wal_senders >= 3 for the replica to connect.
-- See docker-compose.replica.yml for the full setup.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator'
    ) THEN
        CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_password';
    END IF;
END
$$;

-- Allow the replicator user to connect to this database.
-- pg_hba.conf inside the Docker container also needs a replication entry,
-- which is handled by POSTGRES_HOST_AUTH_METHOD in docker-compose.replica.yml.
-- Uses current_database() so this migration works in any environment (CI uses
-- test_db, local uses ecommerce_db) without modification.
DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO replicator', current_database());
END
$$;
