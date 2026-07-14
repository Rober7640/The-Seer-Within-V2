-- Bracelet orders — the Facebook-compliance storefront (/products/:slug).
--
-- 🔴 RUN THIS INSTEAD OF `npm run db:push`.
--    Dev and production SHARE ONE DATABASE. `db:push` diffs the WHOLE schema and applies
--    everything it finds — so any unrelated drift sitting in schema.ts would be pushed to
--    production alongside this table. This file adds ONE new table and touches nothing else.
--
-- Purely additive: creates a table, two indexes. No existing table, column, or row is
-- read or modified. Safe to re-run (IF NOT EXISTS throughout).

CREATE TABLE IF NOT EXISTS bracelet_orders (
  id                        VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe is the source of truth for money. UNIQUE so the webhook can upsert
  -- idempotently — Stripe retries checkout.session.completed, and the thank-you page
  -- reads the same session. Neither may create a duplicate row.
  stripe_session_id         TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id  TEXT,

  product_slug              TEXT NOT NULL,
  product_name              TEXT NOT NULL,
  quantity                  INTEGER NOT NULL DEFAULT 1,
  amount_cents              INTEGER NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'usd',

  email                     TEXT,
  customer_name             TEXT,
  phone                     TEXT,

  shipping_name             TEXT,
  shipping_line1            TEXT,
  shipping_line2            TEXT,
  shipping_city             TEXT,
  shipping_state            TEXT,
  shipping_postal           TEXT,
  shipping_country          TEXT,

  -- An operator flips this once the parcel is posted.
  status                    TEXT NOT NULL DEFAULT 'paid',   -- paid | shipped | refunded | cancelled
  shipped_at                TIMESTAMP,
  tracking_number           TEXT,

  confirmation_email_sent_at TIMESTAMP,

  created_at                TIMESTAMP NOT NULL DEFAULT now(),
  updated_at                TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bracelet_orders_status ON bracelet_orders (status, created_at);
CREATE INDEX IF NOT EXISTS idx_bracelet_orders_email  ON bracelet_orders (email);

-- Verify:
--   SELECT product_name, quantity, amount_cents/100.0 AS dollars, email, shipping_city,
--          status, created_at
--   FROM bracelet_orders
--   ORDER BY created_at DESC
--   LIMIT 20;
