-- Create ProductDetail table (productId as PK — 1:1 with Product)
CREATE TABLE "ProductDetail" (
  "productId" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "ProductDetail_pkey" PRIMARY KEY ("productId")
);

ALTER TABLE "ProductDetail" ADD CONSTRAINT "ProductDetail_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ID-range batch copy: O(n) cursor pattern avoids NOT IN full-scan
DO $$
DECLARE
  last_id  TEXT := '';
  batch_max TEXT;
BEGIN
  LOOP
    SELECT MAX(p.id) INTO batch_max
    FROM (
      SELECT id FROM "Product" WHERE id > last_id ORDER BY id LIMIT 500
    ) p;

    EXIT WHEN batch_max IS NULL;

    INSERT INTO "ProductDetail" ("productId", "description")
    SELECT id, description
    FROM "Product"
    WHERE id > last_id AND id <= batch_max;

    last_id := batch_max;
    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;

-- Drop searchVector first — it is a GENERATED column that depends on description.
-- Recreated below without description (which has moved to ProductDetail).
ALTER TABLE "Product" DROP COLUMN "searchVector";
DROP INDEX IF EXISTS "products_search_vector_idx";

-- Drop cold column from Product — all reads now go through ProductDetail
ALTER TABLE "Product" DROP COLUMN "description";

-- Recreate searchVector using only name (description is now in ProductDetail)
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', "name"), 'A')
    ) STORED;

CREATE INDEX "products_search_vector_idx" ON "Product" USING GIN("searchVector");
