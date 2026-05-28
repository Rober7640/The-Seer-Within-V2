-- Migration 014: Upsell 1 price per variant (FB price split test)
-- Purpose: Let the V1 price split test vary the Upsell 1 (Protection Ritual)
-- price per assigned variant instead of the hardcoded 4700 cents.
-- The column is assigned at lead capture alongside price_variant /
-- price_amount_cents; nullable so existing rows fall back to 4700.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS upsell1_amount_cents integer;
