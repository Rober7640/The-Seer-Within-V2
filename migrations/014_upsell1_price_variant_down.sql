-- Down migration 014: drop Upsell 1 price-per-variant column.

ALTER TABLE conversations DROP COLUMN IF EXISTS upsell1_amount_cents;
