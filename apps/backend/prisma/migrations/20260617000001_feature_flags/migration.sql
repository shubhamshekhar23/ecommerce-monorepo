CREATE TABLE "FeatureFlag" (
  "id"                TEXT NOT NULL,
  "name"              TEXT NOT NULL,
  "enabled"           BOOLEAN NOT NULL DEFAULT false,
  "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
  "description"       TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");
CREATE INDEX "FeatureFlag_name_idx" ON "FeatureFlag"("name");

-- Seed initial flags used across the codebase
INSERT INTO "FeatureFlag" ("id", "name", "enabled", "rolloutPercentage", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'new-checkout-flow',  false, 100, 'Redesigned checkout UI with address autofill', NOW(), NOW()),
  (gen_random_uuid()::text, 'graphql-api',        false, 100, 'GraphQL endpoint alongside REST (gates /graphql route)', NOW(), NOW()),
  (gen_random_uuid()::text, 'sse-order-updates',  false, 100, 'Server-Sent Events for live order status on the order page', NOW(), NOW());
