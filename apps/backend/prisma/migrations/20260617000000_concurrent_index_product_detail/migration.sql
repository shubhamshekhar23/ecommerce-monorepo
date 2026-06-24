-- Enable trigram extension for ILIKE / similarity searches on ProductDetail.description.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Standard CREATE INDEX (not CONCURRENTLY) so this runs inside Prisma's transaction.
-- In a high-traffic production environment with an existing large ProductDetail table,
-- run this index creation manually outside a migration using CREATE INDEX CONCURRENTLY
-- to avoid the ACCESS EXCLUSIVE lock. For this project that is not necessary.
CREATE INDEX "ProductDetail_description_trgm_idx"
  ON "ProductDetail"
  USING GIN (description gin_trgm_ops);
