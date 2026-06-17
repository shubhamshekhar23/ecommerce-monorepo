CREATE TABLE "PromotionRule" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "condition"    JSONB NOT NULL DEFAULT '{}',
  "conditionDsl" TEXT,
  "action"       JSONB NOT NULL DEFAULT '{}',
  "priority"     INTEGER NOT NULL DEFAULT 0,
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "stackable"    BOOLEAN NOT NULL DEFAULT true,
  "startsAt"     TIMESTAMP(3),
  "expiresAt"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromotionRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PromotionRule_active_priority_idx" ON "PromotionRule" ("active", "priority");

-- Seed three example rules covering common e-commerce promotions
INSERT INTO "PromotionRule" ("id","name","description","condition","action","priority","active","stackable","updatedAt")
VALUES
  ('promo-gold-100', 'GOLD member over $100', '15% off for GOLD tier customers spending over $100',
   '{"minOrderValue":100,"customerTier":"GOLD"}',
   '{"type":"percentage_discount","value":15}',
   10, true, true, NOW()),
  ('promo-first-order', 'First-order discount', '10% off for new customers',
   '{"isFirstOrder":true}',
   '{"type":"percentage_discount","value":10}',
   5, true, true, NOW()),
  ('promo-free-shipping-50', 'Free shipping over $50', 'Free shipping on orders over $50',
   '{"minOrderValue":50}',
   '{"type":"free_shipping"}',
   1, true, true, NOW());
