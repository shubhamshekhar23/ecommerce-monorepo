-- Add PII fields to User (stored as AES-256-GCM ciphertext, never searchable).
-- All are optional — existing rows get NULL by default.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone"       TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "taxId"       TEXT;
