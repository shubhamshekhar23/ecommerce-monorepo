-- @db.no-transaction
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- Apply this migration with the --no-transaction flag:
--   prisma migrate deploy --no-transaction
-- or execute the SQL directly on the database.
--
-- Why CONCURRENTLY?
-- A standard CREATE INDEX holds an ACCESS EXCLUSIVE lock that blocks all reads
-- and writes on "ProductDetail" until the index build completes. CONCURRENTLY
-- builds the index in multiple passes and only holds brief row-level locks,
-- so the table remains fully usable throughout.
--
-- When to use this pattern:
--   - Any new index on a table with more than ~100k rows in production
--   - Any index added during a live deployment (not a maintenance window)
--   - Any index on a table that receives continuous writes

-- Enable trigram extension for ILIKE / similarity searches.
-- Required by ProductsService: description: { contains: text, mode: 'insensitive' }
-- which generates a LIKE '%term%' query. Without this index Postgres does a full
-- sequential scan of "ProductDetail" for every search request.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY "ProductDetail_description_trgm_idx"
  ON "ProductDetail"
  USING GIN (description gin_trgm_ops);
