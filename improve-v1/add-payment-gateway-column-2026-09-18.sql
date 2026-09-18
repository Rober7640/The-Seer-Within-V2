-- conversations.payment_gateway — the Stripe vs Payments.AI discriminator.
--
-- WHY. Both processors write the SAME id columns: Payments.AI has no session
-- object, so its txn_… lands in stripe_session_id, its cus_… in stripe_customer_id
-- and its inst_… in stripe_payment_method_id. Nothing is lost, but the processors
-- cannot be told apart from those values — Payments.AI customer ids are ALSO
-- `cus_`-prefixed. Without this column the 50/50 gateway test can only be read by
-- guessing at id prefixes.
--
-- SAFETY. ADD COLUMN of a NULLABLE text column with no DEFAULT is a catalogue-only
-- change in Postgres: no table rewrite, no backfill, no long lock. It is additive —
-- nothing reads this column until the application code that writes it is deployed.
--
-- ORDER OF OPERATIONS (server before client, per the deploy recipe):
--   1. run this SQL
--   2. deploy the server that writes the column
-- Doing it the other way round makes every write fail on an unknown column.

BEGIN;

-- Guard: refuse to run twice. If the column is already there, this is a no-op
-- rather than an error, so the script is safe to re-run.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS payment_gateway text;

COMMIT;

-- ── Verification (run after, expect payment_gateway to appear, data_type text,
--    is_nullable YES) ──────────────────────────────────────────────────────────
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'conversations'
--      AND column_name = 'payment_gateway';
--
-- ── NO BACKFILL, DELIBERATELY ────────────────────────────────────────────────
-- Every pre-existing row is a Stripe row, so a backfill would be correct — but it
-- is an UPDATE over the whole table for no benefit. The 50/50 test only reads rows
-- created after the split starts, and both write paths stamp the column from day
-- one. Read NULL as "written before 2026-09-18, assume Stripe", never as
-- Payments.AI. This matches how stripe_account already treats its legacy NULLs.
--
-- If a backfill is ever wanted, it must be scoped and guarded — check the count
-- FIRST and only touch rows that actually have a Stripe id:
--
--   SELECT count(*) FROM conversations
--    WHERE payment_gateway IS NULL AND stripe_session_id LIKE 'cs_%';
--   -- then, only if that number is what you expect:
--   UPDATE conversations SET payment_gateway = 'stripe'
--    WHERE payment_gateway IS NULL AND stripe_session_id LIKE 'cs_%';
