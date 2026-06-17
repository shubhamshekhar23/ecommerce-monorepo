-- Add soft delete support to Category (Product and User already have deletedAt)
ALTER TABLE "Category" ADD COLUMN "deletedAt" TIMESTAMP(3);
