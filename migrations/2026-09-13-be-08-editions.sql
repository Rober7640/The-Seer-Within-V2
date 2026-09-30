-- 08 · Marcus Stone's personal tarot reading — the EDITIONS table and the order's
-- fulfilment note. Second, additive 08 migration (T9); run AFTER 2026-09-13-be-08-marcus.sql.
--
-- 🔴 RUN THIS INSTEAD OF `npm run db:push`.
--    Dev and production SHARE ONE DATABASE. `db:push` diffs the WHOLE schema and applies
--    everything it finds, so unrelated drift in schema.ts would reach production with it.
--
-- ⛔ Apply to a disposable Supabase branch first (PARALLEL-PLAN.md §wave 2, T9), never
--    straight to the shared database.
--
-- Purely additive: one new table, one index, one nullable column. No existing column is
-- altered, no row is read or modified. Safe to re-run (IF NOT EXISTS throughout).
-- ⛔ Touches nothing 07 owns.

-- ── 1 · The editions (be_08_editions). ────────────────────────────────────────────────
-- An edition is one named spread Marcus reads against: its question, theme, the positions,
-- and the face-up cards the daily email already showed her. She books an EDITION; the paid
-- webhook deals her paid positions from it (server/lib/be08Draw.ts).
--
-- 🔴 PRIMARY KEY (id, version). A re-cut edition is a NEW version, never an UPDATE — every
--    be_orders row pins (edition_id, edition_version), so a reading already paid for keeps
--    the exact positions she was sold.
-- `record` is the whole edition object from local/08-marcus/editions.json, verbatim
-- (shape: server/lib/be08Editions.ts `Be08Edition`), so a field added there costs no
-- migration. The typed columns beside it exist for the lookup and the admin eye.
-- Written only by scripts/publish-08-editions.ts (guarded by BE_08_ALLOW_PUBLISH=1).
CREATE TABLE IF NOT EXISTS be_08_editions (
  id            TEXT        NOT NULL,                 -- 'blind-spots-v1'
  version       INTEGER     NOT NULL,
  slug          TEXT        NOT NULL,                 -- 'what-are-my-blind-spots'
  question      TEXT        NOT NULL,
  status        TEXT        NOT NULL,                 -- published | draft | retired
  record        JSONB       NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version)
);

CREATE INDEX IF NOT EXISTS idx_be_08_editions_status ON be_08_editions (status);

-- ── 2 · Why fulfilment could not finish (be_orders.fulfilment_note). ──────────────────
-- The paid webhook must NEVER fail a paid order over a bad birth date, a missing edition
-- or a name the lens cannot read (D5/D7). It records the order, puts her on the customer
-- list, and writes the reason HERE for support: short codes joined by '; ', e.g.
--   'EDITION_NOT_FOUND', 'LENS_UNSUPPORTED_NAME', 'DOB_UNPARSEABLE(raw=31.02.1970)'.
-- NULL = the draw was dealt and nothing needs a human. A retry that succeeds clears it.
-- ⛔ Not customer_list_error (that means "her thank-you email did not go") and not
--    be_send_attempts (that means a message). NULL on every non-08 order.
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS fulfilment_note TEXT;

-- Verify:
--   SELECT id, version, slug, status FROM be_08_editions ORDER BY id, version;
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'be_orders' AND column_name = 'fulfilment_note';
--
-- The support query this column exists for — every 08 order a human has to look at:
--   SELECT stripe_session_id, email, fulfilment_note, due_at
--   FROM be_orders WHERE offer = 'marcus-reading' AND fulfilment_note IS NOT NULL
--   ORDER BY due_at;
