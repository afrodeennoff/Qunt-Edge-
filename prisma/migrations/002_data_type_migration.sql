-- Migration: Data Type Optimization
-- Date: 2025-01-31
-- Description: Migrate string dates to proper DateTime types

-- Note: This migration requires careful execution due to existing data
-- It should be run during a maintenance window

-- ============================================
-- ADD NEW COLUMNS WITH PROPER TYPES
-- ============================================

-- Trade table: Convert date strings to DateTime
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "entryDateDateTime" TIMESTAMP(3);
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "closeDateDateTime" TIMESTAMP(3);

-- Trade table: Convert decimal strings to proper Decimal type
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "entryPriceDecimal" DECIMAL(20, 8);
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "closePriceDecimal" DECIMAL(20, 8);
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "pnlDecimal" DECIMAL(20, 8);
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "commissionDecimal" DECIMAL(20, 8);

-- Trade table: Convert float time to integer milliseconds
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "timeInPositionMs" INTEGER;

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================

-- Migrate entry dates (assuming ISO 8601 format)
UPDATE "Trade"
SET "entryDateDateTime" = CASE
  WHEN "entryDate" ~ '^\d{4}-\d{2}-\d{2}' THEN CAST("entryDate" AS TIMESTAMP)
  WHEN "entryDate" ~ '^\d{2}/\d{2}/\d{4}' THEN TO_TIMESTAMP("entryDate", 'MM/DD/YYYY')
  ELSE NULL
END
WHERE "entryDateDateTime" IS NULL AND "entryDate" IS NOT NULL;

-- Migrate close dates
UPDATE "Trade"
SET "closeDateDateTime" = CASE
  WHEN "closeDate" ~ '^\d{4}-\d{2}-\d{2}' THEN CAST("closeDate" AS TIMESTAMP)
  WHEN "closeDate" ~ '^\d{2}/\d{2}/\d{4}' THEN TO_TIMESTAMP("closeDate", 'MM/DD/YYYY')
  ELSE NULL
END
WHERE "closeDateDateTime" IS NULL AND "closeDate" IS NOT NULL;

-- Migrate prices to decimal
UPDATE "Trade"
SET "entryPriceDecimal" = CAST("entryPrice" AS DECIMAL(20, 8))
WHERE "entryPriceDecimal" IS NULL AND "entryPrice" IS NOT NULL;

UPDATE "Trade"
SET "closePriceDecimal" = CAST("closePrice" AS DECIMAL(20, 8))
WHERE "closePriceDecimal" IS NULL AND "closePrice" IS NOT NULL;

-- Migrate PnL to decimal
UPDATE "Trade"
SET "pnlDecimal" = CAST("pnl" AS DECIMAL(20, 8))
WHERE "pnlDecimal" IS NULL AND "pnl" IS NOT NULL;

-- Migrate commission to decimal
UPDATE "Trade"
SET "commissionDecimal" = CAST("commission" AS DECIMAL(20, 8))
WHERE "commissionDecimal" IS NULL AND "commission" IS NOT NULL;

-- Migrate time in position to milliseconds
UPDATE "Trade"
SET "timeInPositionMs" = CAST("timeInPosition" * 1000 AS INTEGER)
WHERE "timeInPositionMs" IS NULL AND "timeInPosition" IS NOT NULL;

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Check for any failed conversions
SELECT
  COUNT(*) as total_trades,
  COUNT("entryDateDateTime") as migrated_entry_dates,
  COUNT("closeDateDateTime") as migrated_close_dates,
  COUNT("entryPriceDecimal") as migrated_entry_prices,
  COUNT("pnlDecimal") as migrated_pnl
FROM "Trade";

-- Find trades with null dates after migration (for manual review)
SELECT id, "entryDate", "closeDate"
FROM "Trade"
WHERE "entryDateDateTime" IS NULL OR "closeDateDateTime" IS NULL
LIMIT 10;

-- ============================================
-- BACKUP OLD COLUMNS (RENAME)
-- ============================================

-- Only run this after validation is successful
-- ALTER TABLE "Trade" RENAME COLUMN "entryDate" TO "entryDateOld";
-- ALTER TABLE "Trade" RENAME COLUMN "closeDate" TO "closeDateOld";
-- ALTER TABLE "Trade" RENAME COLUMN "entryPrice" TO "entryPriceOld";
-- ALTER TABLE "Trade" RENAME COLUMN "closePrice" TO "closePriceOld";
-- ALTER TABLE "Trade" RENAME COLUMN "pnl" TO "pnlOld";
-- ALTER TABLE "Trade" RENAME COLUMN "commission" TO "commissionOld";
-- ALTER TABLE "Trade" RENAME COLUMN "timeInPosition" TO "timeInPositionOld";

-- ============================================
-- RENAME NEW COLUMNS TO STANDARD NAMES
-- ============================================

-- Only run this after validation is successful
-- ALTER TABLE "Trade" RENAME COLUMN "entryDateDateTime" TO "entryDate";
-- ALTER TABLE "Trade" RENAME COLUMN "closeDateDateTime" TO "closeDate";
-- ALTER TABLE "Trade" RENAME COLUMN "entryPriceDecimal" TO "entryPrice";
-- ALTER TABLE "Trade" RENAME COLUMN "closePriceDecimal" TO "closePrice";
-- ALTER TABLE "Trade" RENAME COLUMN "pnlDecimal" TO "pnl";
-- ALTER TABLE "Trade" RENAME COLUMN "commissionDecimal" TO "commission";
-- ALTER TABLE "Trade" RENAME COLUMN "timeInPositionMs" TO "timeInPosition";

-- ============================================
-- ADD CONSTRAINTS FOR DATA INTEGRITY
-- ============================================

-- Add check constraints (run after column rename)
-- ALTER TABLE "Trade" ADD CONSTRAINT "entryDate_not_null" CHECK ("entryDate" IS NOT NULL);
-- ALTER TABLE "Trade" ADD CONSTRAINT "pnl_reasonable_range" CHECK ("pnl" > -1000000 AND "pnl" < 1000000);
-- ALTER TABLE "Trade" ADD CONSTRAINT "quantity_positive" CHECK ("quantity" > 0);

-- ============================================
-- UPDATE STATISTICS
-- ============================================

ANALYZE "Trade";
