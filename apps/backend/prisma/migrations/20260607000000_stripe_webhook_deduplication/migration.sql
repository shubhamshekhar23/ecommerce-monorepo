-- Deduplication log for Stripe webhook events.
-- Stripe retries delivery for up to 72 hours, so the same event ID can arrive multiple times.
-- ON CONFLICT DO NOTHING is the atomic check-and-insert: whichever concurrent request wins the
-- INSERT owns processing; all others get 0 rows affected and skip.
CREATE TABLE "StripeWebhookEvent" (
  "id"          TEXT        NOT NULL,
  "type"        TEXT        NOT NULL,
  "processedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StripeWebhookEvent_processedAt_idx" ON "StripeWebhookEvent"("processedAt");
