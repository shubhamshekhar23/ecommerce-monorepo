CREATE TABLE "OrderSnapshot" (
  "id"        TEXT NOT NULL,
  "orderId"   TEXT NOT NULL,
  "state"     JSONB NOT NULL DEFAULT '{}',
  "eventSeq"  INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderSnapshot_orderId_key" ON "OrderSnapshot" ("orderId");
