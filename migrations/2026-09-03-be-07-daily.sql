-- 07 · Marcus Daily Tarot — the draw record, the order's intake columns, the grade log.
--
-- 🔴 RUN THIS INSTEAD OF `npm run db:push`.
--    Dev and production SHARE ONE DATABASE. `db:push` diffs the WHOLE schema and applies
--    everything it finds, so unrelated drift in schema.ts would reach production with it.
--
-- Purely additive: seven nullable columns, two new tables, four indexes. No existing
-- column is altered, no row is read or modified. Safe to re-run (IF NOT EXISTS throughout).

-- ── 1 · What SHE bought. NULL on every non-07 order. ────────────────────────────────
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS spread_key TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS draw_date  TEXT;   -- 'YYYY-MM-DD'
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS tier       TEXT;   -- spread | pattern | table
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS topic      TEXT;   -- love | money
-- ⛔ Her words, any length. Stripe metadata caps values at 500 chars and would truncate.
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS question   TEXT;
-- ⭐ 07-C5: the rung is how many of her questions get answered. Box 2 is required at
-- 'pattern' and 'table', box 3 at 'table'. Both are typed BEFORE Stripe.
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS question_2 TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS question_3 TEXT;

-- ── 2 · The day's cut. ONE per (spread_key, draw_date) — see the unique index. ──────
-- That constraint is the product promise: the email names the free cards to the whole
-- list, so every buyer that day must be dealt the same cards.
CREATE TABLE IF NOT EXISTS be_07_draws (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_key       TEXT NOT NULL,          -- 'the-two-doors'
  spread_name      TEXT NOT NULL,          -- 'The Two Doors'
  draw_date        TEXT NOT NULL,          -- 'YYYY-MM-DD', text on purpose
  -- { "day":[…], "open":[…] }. A day position is
  -- { number, name, job, card_name, reversed, free } and `job` goes verbatim into the prompt.
  -- ⛔ An open card is { number, card_name, reversed } and NOTHING else — its position is
  -- decided by what she asked and is written by n8n, in the order it came off the cut.
  blocks           JSONB NOT NULL,
  -- ⭐ What the daily email already said about the free cards, so the paid reading does
  -- not say it back to her.
  email_free_read  TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_be_07_draws_spread_date
  ON be_07_draws (spread_key, draw_date);
CREATE INDEX IF NOT EXISTS idx_be_07_draws_date ON be_07_draws (draw_date);

-- ── 3 · The grade log. 🔴 The ONLY record that a failed reading was sent anyway. ────
CREATE TABLE IF NOT EXISTS be_07_reading_grades (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    VARCHAR NOT NULL REFERENCES be_orders(id) ON DELETE CASCADE,
  attempt     INTEGER NOT NULL,           -- 1, or 2 for the one regeneration
  pass        BOOLEAN NOT NULL,
  failed      JSONB   NOT NULL DEFAULT '[]'::jsonb,   -- rubric lines, e.g. [3,6,8]
  why         TEXT,
  reading     TEXT,                        -- the graded prose, so a bad send can be READ
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_be_07_grades_order_attempt
  ON be_07_reading_grades (order_id, attempt);
CREATE INDEX IF NOT EXISTS idx_be_07_grades_pass
  ON be_07_reading_grades (pass, created_at);

-- ── 4 · What she typed BEFORE Stripe. 🔴 A row here is NOT a sale. ─────────────────
-- be_orders has one invariant everything leans on: a row means she PAID. Writing her
-- intake there at checkout time would make an abandoned checkout render a thank-you page
-- and start a fulfilment (07-server-spec.md §6.3, option C — the dangerous one). So it
-- lands here, keyed on the Checkout session, and the PAID webhook copies it across.
-- ⛔ Nothing bills, emails or fulfils from this table. Most rows are abandoned checkouts.
CREATE TABLE IF NOT EXISTS be_order_intake (
  stripe_session_id TEXT PRIMARY KEY,
  offer             TEXT NOT NULL,
  spread_key        TEXT,
  draw_date         TEXT,          -- 'YYYY-MM-DD'
  tier              TEXT,          -- spread | pattern | table
  topic             TEXT,          -- love | money
  question          TEXT,          -- ⛔ her words, any length
  question_2        TEXT,
  question_3        TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- ⚠ This table grows forever on its own — an abandoned checkout leaves a row and nothing
--   removes it. The sweep, when somebody writes it:
--   DELETE FROM be_order_intake WHERE created_at < now() - interval '30 days'
--     AND stripe_session_id NOT IN (SELECT stripe_session_id FROM be_orders);
CREATE INDEX IF NOT EXISTS idx_be_order_intake_created ON be_order_intake (created_at);

-- Verify:
--   SELECT spread_key, draw_date, jsonb_object_keys(blocks) FROM be_07_draws;
--
-- 🔴 THE QUERY THIS WHOLE MIGRATION EXISTS FOR — every reading that failed its rubric
--    and was sent anyway. Read it DAILY for the first fortnight:
--   SELECT g.created_at, g.attempt, g.failed, g.why, o.email, o.tier, o.delivered_at
--   FROM be_07_reading_grades g JOIN be_orders o ON o.id = g.order_id
--   WHERE g.pass = false ORDER BY g.created_at DESC;
