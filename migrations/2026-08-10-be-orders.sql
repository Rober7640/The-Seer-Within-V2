-- Backend deck orders — the one-time backend offers (02 Twin Flame, 03 Judgement Day,
-- and the two that follow). Workflow asset S4.
--
-- 🔴 RUN THIS INSTEAD OF `npm run db:push`.
--    Dev and production SHARE ONE DATABASE. `db:push` diffs the WHOLE schema and applies
--    everything it finds — so any unrelated drift sitting in schema.ts would be pushed to
--    production alongside this table. This file adds ONE new table and touches nothing else.
--
-- Purely additive: creates a table and three indexes. No existing table, column, or row is
-- read or modified. Safe to re-run (IF NOT EXISTS throughout).

CREATE TABLE IF NOT EXISTS be_orders (
  id                        VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe is the source of truth for money. UNIQUE so the webhook can upsert
  -- idempotently — Stripe retries checkout.session.completed, and the thank-you page
  -- reads the same session as a backstop. Neither may create a duplicate row.
  stripe_session_id         TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id  TEXT,

  -- Which offer, in the deck's own vocabulary (shared/backendOffers.ts).
  offer                     TEXT NOT NULL,          -- twin-flame | judgement-day
  offer_number              TEXT NOT NULL,          -- 02 | 03
  -- Which booking treatment sold it. The page and the chat are an A/B on mechanism,
  -- and without this column that test has no readout.
  treatment                 TEXT,                   -- page | chat

  -- The money, split so pay-what-you-want stays analysable: reading_cents is what she
  -- chose to give (or the fixed price); amount_cents is what Stripe actually took.
  -- They differ by the bump, and only by the bump.
  reading_cents             INTEGER NOT NULL,
  bump_purchased            BOOLEAN NOT NULL DEFAULT false,
  bump_cents                INTEGER NOT NULL DEFAULT 0,
  -- ⛔ n8n exact-matches this to decide what to fulfil. Never rename a key.
  bump_product_key          TEXT,
  amount_cents              INTEGER NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'usd',

  -- first_name comes down the chain from the AWeber letter's ?fn=, through Stripe
  -- metadata. It is the difference between "Thank you, Sarah" and "Thank you, Friend".
  email                     TEXT,
  first_name                TEXT,

  status                    TEXT NOT NULL DEFAULT 'paid',   -- paid | refunded | cancelled

  -- 🔴 The AWeber write IS the thank-you send (an AWeber Campaign triggered by the offer
  -- tag). A failed write is a woman who paid and got nothing; these two columns are how
  -- anybody finds her afterwards.
  customer_list_written_at  TIMESTAMP,
  customer_list_error       TEXT,

  -- Fulfilment. reading_body stores what was ACTUALLY sent, so a re-send is identical
  -- and support can read what she got.
  reading_body              TEXT,
  reading_url               TEXT,
  delivered_at              TIMESTAMP,

  created_at                TIMESTAMP NOT NULL DEFAULT now(),
  updated_at                TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_be_orders_offer        ON be_orders (offer, created_at);
CREATE INDEX IF NOT EXISTS idx_be_orders_email        ON be_orders (email);
CREATE INDEX IF NOT EXISTS idx_be_orders_list_written ON be_orders (customer_list_written_at);

-- Verify:
--   SELECT offer, amount_cents/100.0 AS dollars, bump_purchased, email, treatment,
--          customer_list_written_at, created_at
--   FROM be_orders
--   ORDER BY created_at DESC
--   LIMIT 20;
--
-- The query that finds a broken thank-you send — paid, but never reached AWeber:
--   SELECT stripe_session_id, offer, email, customer_list_error, created_at
--   FROM be_orders
--   WHERE customer_list_written_at IS NULL
--   ORDER BY created_at DESC;
