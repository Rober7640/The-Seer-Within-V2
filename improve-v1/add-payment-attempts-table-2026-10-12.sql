-- payment_attempts — one row per charge attempt, approved OR declined, both processors.
--
-- WHY. The Stripe-vs-Payments.AI split exists to answer "which processor approves
-- more of our charges" (above all the 1-click upsells). A declined charge has never
-- left a row in our database, so that question could only be answered from two
-- vendor dashboards. See shared/schema.ts `paymentAttempts`.
--
-- SAFETY. CREATE TABLE IF NOT EXISTS of a brand-new table: no existing table, row or
-- query is touched, no lock on anything live. The app writes to it fire-and-forget,
-- so even a missing table would only log an error — never fail a charge.
--
-- ORDER OF OPERATIONS: run this (and add-payment-gateway-column-2026-09-18.sql, which
-- production has NOT had yet) BEFORE deploying the server that writes them.

BEGIN;

CREATE TABLE IF NOT EXISTS payment_attempts (
  id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway         text NOT NULL,
  step            text NOT NULL,
  initiator       text NOT NULL,
  result          text NOT NULL,
  amount_cents    integer NOT NULL,
  processor_ref   text,
  order_ref       text,
  decline_reason  text,
  email           text,
  funnel          text,
  hook            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_created ON payment_attempts (created_at);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order   ON payment_attempts (order_ref);

COMMIT;

-- ── Verification ──────────────────────────────────────────────────────────────
--   SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'payment_attempts' ORDER BY ordinal_position;   -- 13 rows
--
-- ── The report it exists for ──────────────────────────────────────────────────
--   SELECT gateway, step, initiator,
--          count(*)                                        AS attempts,
--          count(*) FILTER (WHERE result = 'approved')     AS approved,
--          round(100.0 * count(*) FILTER (WHERE result = 'approved') / count(*), 1) AS approval_pct
--     FROM payment_attempts
--    WHERE created_at >= '<split start>'
--    GROUP BY 1, 2, 3 ORDER BY 2, 1;
