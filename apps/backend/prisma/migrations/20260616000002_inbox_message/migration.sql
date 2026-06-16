-- CreateTable
CREATE TABLE "InboxMessage" (
    "messageId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE INDEX "InboxMessage_processedAt_idx" ON "InboxMessage"("processedAt");
