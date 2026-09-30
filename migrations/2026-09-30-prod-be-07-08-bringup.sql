-- ============================================================================
-- PRODUCTION BRING-UP for Marcus-08 (offer `marcus-reading`)
--
-- 🔴 RUN THIS ON THE **PRODUCTION** SUPABASE, *BEFORE* deploying the be-08 code.
--    Prod and dev are SEPARATE databases (the "dev and production SHARE ONE
--    DATABASE" note in the per-feature migration files is STALE — ignore it).
--
-- WHY BEFORE THE DEPLOY: the merged code's always-on `getBeOrderBySession` runs a
-- drizzle `.select()` that names EVERY be_orders column, and beOrders.ts reads/writes
-- be_order_intake. Production skipped offer 07 and is behind, so it lacks those
-- columns and tables. Deploying the code first would 500 the order-lookup / thank-you
-- path for the LIVE offers (twin-flame, judgement-day, heart-cleanser). Run this first.
--
-- This is the union of, IN DEPENDENCY ORDER:
--   migrations/2026-09-03-be-07-daily.sql        (be_order_intake + be_07_* + be_orders cols)
--   migrations/2026-09-13-be-08-marcus.sql       (be_order_intake/be_orders 08 cols, be_08_draws, be_send_attempts)
--   migrations/2026-09-13-be-08-editions.sql     (be_08_editions, be_orders.fulfilment_note)
--   migrations/2026-09-24-be-08-reading-report.sql (be_orders.reading_report)
--
-- Purely additive. Every statement is IF NOT EXISTS — safe to re-run, and safe to run
-- BEFORE the deploy (old code never references these).
-- ============================================================================

-- ── be_orders columns (offer 07) ────────────────────────────────────────────
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS spread_key TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS draw_date  TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS tier       TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS topic      TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS question   TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS question_2 TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS question_3 TEXT;

-- ── be_07_draws ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS be_07_draws (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_key       TEXT NOT NULL,
  spread_name      TEXT NOT NULL,
  draw_date        TEXT NOT NULL,
  blocks           JSONB NOT NULL,
  email_free_read  TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_be_07_draws_spread_date ON be_07_draws (spread_key, draw_date);
CREATE INDEX IF NOT EXISTS idx_be_07_draws_date ON be_07_draws (draw_date);

-- ── be_07_reading_grades (offer-agnostic grade log; used by 08 fulfilment too) ─
CREATE TABLE IF NOT EXISTS be_07_reading_grades (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    VARCHAR NOT NULL REFERENCES be_orders(id) ON DELETE CASCADE,
  attempt     INTEGER NOT NULL,
  pass        BOOLEAN NOT NULL,
  failed      JSONB   NOT NULL DEFAULT '[]'::jsonb,
  why         TEXT,
  reading     TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_be_07_grades_order_attempt ON be_07_reading_grades (order_id, attempt);
CREATE INDEX IF NOT EXISTS idx_be_07_grades_pass ON be_07_reading_grades (pass, created_at);

-- ── be_order_intake (created by 07; 08 adds columns below) ───────────────────
CREATE TABLE IF NOT EXISTS be_order_intake (
  stripe_session_id TEXT PRIMARY KEY,
  offer             TEXT NOT NULL,
  spread_key        TEXT,
  draw_date         TEXT,
  tier              TEXT,
  topic             TEXT,
  question          TEXT,
  question_2        TEXT,
  question_3        TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_be_order_intake_created ON be_order_intake (created_at);

-- ── be_order_intake columns (offer 08) ──────────────────────────────────────
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS edition_id         TEXT;
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS edition_version    INTEGER;
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS display_first_name TEXT;
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS full_birth_name    TEXT;
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS date_of_birth      DATE;
ALTER TABLE be_order_intake ADD COLUMN IF NOT EXISTS speed_bump         BOOLEAN NOT NULL DEFAULT false;

-- ── be_orders columns (offer 08) ────────────────────────────────────────────
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS edition_id          TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS edition_version     INTEGER;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS due_at              TIMESTAMPTZ;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS lens_card           TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS lens_method_version TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS fulfilment_note     TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS reading_report      JSONB;

-- ── be_08_draws (one per order) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS be_08_draws (
  id                   VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             VARCHAR NOT NULL REFERENCES be_orders(id) ON DELETE CASCADE,
  draw_json            JSONB NOT NULL,
  draw_method_version  TEXT,
  context_hash         TEXT,
  created_at           TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_be_08_draws_order ON be_08_draws (order_id);

-- ── be_send_attempts (transactional send log; offer-generic) ─────────────────
CREATE TABLE IF NOT EXISTS be_send_attempts (
  id                   VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  offer                TEXT NOT NULL,
  stripe_session_id    TEXT NOT NULL,
  message_type         TEXT NOT NULL,
  provider             TEXT NOT NULL,
  provider_message_id  TEXT,
  status               TEXT NOT NULL,
  error                TEXT,
  attempted_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_be_send_attempts_session_type ON be_send_attempts (stripe_session_id, message_type);
CREATE INDEX IF NOT EXISTS idx_be_send_attempts_offer_status ON be_send_attempts (offer, status, attempted_at);

-- ── be_08_editions (the bookable spreads) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS be_08_editions (
  id            TEXT        NOT NULL,
  version       INTEGER     NOT NULL,
  slug          TEXT        NOT NULL,
  question      TEXT        NOT NULL,
  status        TEXT        NOT NULL,
  record        JSONB       NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version)
);
CREATE INDEX IF NOT EXISTS idx_be_08_editions_status ON be_08_editions (status);

-- ── Verify (should list the new columns / tables) ───────────────────────────
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'be_orders'
--     AND column_name IN ('edition_id','due_at','lens_card','fulfilment_note','reading_report','tier');
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('be_order_intake','be_08_editions','be_08_draws','be_send_attempts',
--                        'be_07_draws','be_07_reading_grades');
--
-- ⚠️ AFTER this succeeds on prod: the be_08_editions table is EMPTY. The 12 published
--    editions must be seeded on prod too (scripts/publish-08-editions.ts with
--    BE_08_ALLOW_PUBLISH=1, pointed at the prod DB) — otherwise a booking has no edition.
