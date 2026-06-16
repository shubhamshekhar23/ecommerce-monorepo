-- Add categoryName snapshot column to OrderItem.
-- Nullable so existing rows are not blocked; backfill fills historical data.
ALTER TABLE "OrderItem" ADD COLUMN "categoryName" TEXT;

-- Backfill existing rows using ID-range batching (O(n), not O(n²) like NOT IN).
-- Each chunk of 500 rows is resolved in one UPDATE; 50 ms sleep between batches
-- keeps I/O pressure low on a live database.
DO $$
DECLARE
  last_id TEXT := '';
  batch_max TEXT;
BEGIN
  LOOP
    SELECT MAX(oi.id) INTO batch_max
    FROM (
      SELECT id FROM "OrderItem"
      WHERE id > last_id
      ORDER BY id
      LIMIT 500
    ) oi;

    EXIT WHEN batch_max IS NULL;

    UPDATE "OrderItem" oi
    SET "categoryName" = c.name
    FROM "Product" p
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE oi."productId" = p.id
      AND oi.id > last_id
      AND oi.id <= batch_max;

    last_id := batch_max;
    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;
