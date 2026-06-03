-- Phase 10: Enable pg_stat_statements
--
-- pg_stat_statements tracks cumulative execution statistics for every unique
-- SQL query the database has run. It is the standard tool for production
-- query analysis:
--
--   SELECT query, calls, mean_exec_time, total_exec_time
--   FROM pg_stat_statements
--   ORDER BY total_exec_time DESC LIMIT 10;
--
-- IMPORTANT: the extension also requires shared_preload_libraries to include
-- 'pg_stat_statements'. This is set via the postgres container startup command
-- in docker-compose.yml:
--   command: postgres -c shared_preload_libraries=pg_stat_statements -c pg_stat_statements.track=all
--
-- Without shared_preload_libraries the CREATE EXTENSION succeeds but the view
-- always returns empty. Restart postgres after changing that flag.

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
