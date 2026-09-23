-- conversations.phone — the buyer's phone from Stripe Checkout, ROOT FUNNEL ONLY.
--
-- WHY. Boss asked (2026-09-23) for a compulsory phone field at checkout, starting
-- with the root funnel (theseerwithin.com). /api/checkout turns on Stripe's
-- phone_number_collection only when no funnel is set; the purchase webhook and
-- /api/upsell/user-data copy customer_details.phone onto the row.
--
-- SAFETY. ADD COLUMN of a NULLABLE text column with no DEFAULT is a catalogue-only
-- change in Postgres: no table rewrite, no backfill, no long lock. Existing code
-- that doesn't know about the column is unaffected by it.
--
-- 🔴 ORDER OF OPERATIONS — run this BEFORE deploying the server that has
-- `phone` in shared/schema.ts. Drizzle names every schema column in its SELECTs,
-- so that code against a database without this column fails EVERY conversations
-- read (chat, checkout, upsells) — not just the phone write.
--   1. run this SQL
--   2. deploy the server

BEGIN;

-- Safe to re-run: a no-op if the column is already there.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS phone text;

COMMIT;

-- ── Verification (expect phone, text, YES) ─────────────────────────────────────
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'conversations'
--      AND column_name = 'phone';
--
-- No backfill: only root-funnel purchases from this change onward have a phone.
