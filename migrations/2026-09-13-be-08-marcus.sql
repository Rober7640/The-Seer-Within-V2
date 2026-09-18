-- 08 · Marcus Stone's personal tarot reading — the intake and order columns, the per-order
-- draw, and the send-attempt log.
--
-- 🔴 RUN THIS INSTEAD OF `npm run db:push`.
--    Dev and production SHARE ONE DATABASE. `db:push` diffs the WHOLE schema and applies
--    everything it finds, so unrelated drift in schema.ts would reach production with it.
--
-- ⛔ DRAFT (T3, PARALLEL-PLAN.md §2). Not applied anywhere. Wave 2 (T9) applies it to a
--    disposable Supabase branch first, never straight to the shared database.
--
-- Purely additive: eleven nullable columns (one with a default), two new tables, five
-- indexes. No existing column is altered, no row is read or modified. Safe to re-run
-- (IF NOT EXISTS throughout). ⛔ Touches nothing 07 owns — be_07_draws and
-- be_07_reading_grades are not named here.

-- ── 1 · What she typed BEFORE Stripe (be_order_intake). 🔴 A row here is NOT a sale. ──
-- Same rule as 07: the intake lands here keyed on the Checkout session, and the PAID
-- webhook copies it onto be_orders. All six are NULL on every non-08 row.
-- The edition is the spread she booked from, pinned by id + version so a re-cut edition
-- never changes a reading already paid for.
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS edition_id         TEXT;
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS edition_version    INTEGER;
-- What Marcus calls her. The birth name is what the numerology is cut from (D1: full
-- birth name + date of birth, decided 2026-09-13). ⚠ PII — never echo full_birth_name or
-- date_of_birth into a log line or a URL.
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS display_first_name TEXT;
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS full_birth_name    TEXT;
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS date_of_birth      DATE;     -- nullable (D1)
-- Took the "+ 12-hour delivery" bump at booking. Mirrors be_orders.bump_purchased once
-- paid; kept on the intake so the booking page can restore her choice on a Stripe cancel.
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS speed_bump         BOOLEAN NOT NULL DEFAULT false;

-- ── 2 · What SHE bought (be_orders). NULL on every non-08 order. ──────────────────────
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS edition_id          TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS edition_version     INTEGER;
-- paid_at + 24h, or + 12h when bump_product_key = 'marcus_speed'. Stamped by the webhook
-- (T9). The SLA clock, in one place, so support and n8n read the same deadline.
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS due_at              TIMESTAMPTZ;
-- The lens: the one card her name + birth date resolve to, and which version of the
-- method cut it. Pinned so a later change to the lens rules cannot re-read an old order.
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS lens_card           TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS lens_method_version TEXT;

-- ── 3 · The draw (be_08_draws). ONE PER ORDER — see the unique index. ─────────────────
-- 07 draws once per (spread, day) for the whole list; 08 draws once per ORDER, for one
-- woman. The unique index is the product promise: a webhook retry, a re-run, or a
-- second fulfilment pass must find the cards already dealt, never deal again.
-- ⛔ A row is NEVER updated after it is written. A re-dealt draw is a different reading
--    from the one she is about to be sent.
CREATE TABLE IF NOT EXISTS be_08_draws (
  id                   VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The order it was dealt for. Same reference shape as be_07_reading_grades.order_id.
  order_id             VARCHAR NOT NULL REFERENCES be_orders(id) ON DELETE CASCADE,
  -- The full dealt spread: positions, cards, reversals, free/paid flags — the shape is
  -- local/08-marcus/contracts.ts's, and it is one JSONB so a change there costs no migration.
  draw_json            JSONB NOT NULL,
  -- Which version of draw.ts dealt it. A reading is only reproducible against its method.
  draw_method_version  TEXT,
  -- Hash of the inputs (edition id + version, birth name, DOB, lens) the draw was seeded
  -- from. Lets fulfilment prove the stored draw matches the order without re-reading PII.
  context_hash         TEXT,
  created_at           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_be_08_draws_order ON be_08_draws (order_id);

-- ── 4 · Every transactional send, once (be_send_attempts). ────────────────────────────
-- No BE offer has ever recorded a send: the AWeber tag write IS the thank-you, and a
-- failed write is a woman who paid and got nothing. 08 sends four messages per order
-- through a provider with a message id (D4 recommends Resend), and this is the record.
--
-- 🔴 UNIQUE (stripe_session_id, message_type): one row per message per order. A retry
--    UPDATES that row (status / error / provider_message_id / attempted_at); it never
--    inserts a second. That constraint is what stops a webhook replay sending her the
--    same confirmation twice. Offer-generic on purpose — 02/03/06 can use it later.
CREATE TABLE IF NOT EXISTS be_send_attempts (
  id                   VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  offer                TEXT NOT NULL,          -- 'marcus-reading' (shared/backendOffers.ts key)
  stripe_session_id    TEXT NOT NULL,          -- the booking Checkout session = the order
  -- order_confirmation | audio_confirmation | written_delivery | audio_delivery
  message_type         TEXT NOT NULL,
  provider             TEXT NOT NULL,          -- 'resend' | 'aweber' | …
  provider_message_id  TEXT,                   -- what the provider returned; NULL on failure
  status               TEXT NOT NULL,          -- 'sent' | 'failed' | 'skipped'
  error                TEXT,                   -- the provider's own words on failure
  attempted_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_be_send_attempts_session_type
  ON be_send_attempts (stripe_session_id, message_type);
-- The "who paid and was never emailed" query, by offer and outcome.
CREATE INDEX IF NOT EXISTS idx_be_send_attempts_offer_status
  ON be_send_attempts (offer, status, attempted_at);

-- Verify:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'be_orders' AND column_name IN ('edition_id','due_at','lens_card');
--
-- The query this table exists for — every 08 order whose reading is overdue:
--   SELECT o.stripe_session_id, o.email, o.due_at, o.delivered_at
--   FROM be_orders o WHERE o.offer = 'marcus-reading'
--     AND o.delivered_at IS NULL AND o.due_at < now() ORDER BY o.due_at;
--
-- And every 08 message that failed to send:
--   SELECT stripe_session_id, message_type, provider, error, attempted_at
--   FROM be_send_attempts WHERE status = 'failed' ORDER BY attempted_at DESC;
