-- ============================================================================
-- ADD `lane` to `conversations`
-- 2026-11-18 · prerequisite for belief lanes on /fb (/fb?lane=<id>).
--
-- WHAT IT IS FOR. A lane is a version of /fb for every ad that speaks one belief
-- (lane 1 = manifest). It is measured against plain /fb by revenue per 1,000 chats:
-- front end + bump + both upsells. All of those already live on the conversation
-- row, but nothing on it says which lane the lead came through. No existing column
-- fits: there is no source / lander / hook column on `conversations` (the tarot
-- lander identity has the same gap, noted in useConversation.ts). Stripe metadata
-- and PostHog carry the lane too, but only this column covers Payments.AI orders
-- and the upsells in one place.
--
-- Written once at /api/lead (server/lib/db.ts saveConversation), FIRST NON-NULL
-- WRITE WINS via COALESCE — the same rule as ab_visitor_id, for the same reason:
-- a returning buyer is never moved between lanes by a later visit.
--
-- 🔴 RUN THIS RATHER THAN `npm run db:push`. Drizzle push diffs the WHOLE schema
--    against the database and this schema has known drift. Explicit DDL touches
--    exactly what is named here.
--
-- 🔴 RUN IT ON EVERY DATABASE THE CODE WILL REACH — dev and prod are separate
--    databases (since 2026-08-05); applying it to one has not applied it to the other.
--
-- 🔴 ORDER OF OPERATIONS — run this BEFORE deploying the server that has `lane` in
--    shared/schema.ts. Drizzle names every schema column in its SELECTs and INSERTs,
--    so that code against a database without this column fails EVERY conversations
--    read and write (chat, lead, checkout, upsells) — not just the lane write.
--      1. run this SQL
--      2. deploy the server
--
-- SAFETY. ADD COLUMN of a NULLABLE text column with no DEFAULT is a catalogue-only
-- change in Postgres: no table rewrite, no backfill, no long lock. Existing code
-- that does not know about the column is unaffected by it. IF NOT EXISTS makes it
-- re-runnable.
--
-- NOT APPLIED ANYWHERE as of 2026-11-18. Written in the ~/tsw-lanes build clone.
-- ============================================================================

-- ── 0. PRE-FLIGHT — expect 0 rows (the column does not exist yet). ──────────
SELECT column_name FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name = 'lane';

SELECT count(*) AS rows_before FROM conversations;


-- ── 1. THE CHANGE ───────────────────────────────────────────────────────────
BEGIN;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lane text;

-- Expect exactly 1 row: lane | text | YES | (null default).
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name = 'lane';

-- Existing data untouched: with_lane MUST be 0 and total_rows MUST equal
-- rows_before from step 0.
SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE lane IS NOT NULL) AS with_lane
FROM conversations;

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)

-- No index: the lane report groups a few thousand rows by a low-cardinality value.
-- Add a partial index (WHERE lane IS NOT NULL, CONCURRENTLY, outside BEGIN) only if
-- a query ever needs it.


-- ── 2. A FIRST READ, once lane traffic exists ───────────────────────────────
-- SELECT COALESCE(lane, '(plain /fb)') AS lane,
--        count(*) AS leads,
--        count(*) FILTER (WHERE main_paid_at IS NOT NULL) AS buyers,
--        sum(COALESCE(main_purchase_amount, 0) + COALESCE(bump_amount_cents, 0)
--            + COALESCE(upsell_amount, 0) + COALESCE(upsell2_amount, 0)) AS revenue_cents
--   FROM conversations
--  WHERE created_at >= '<lane go-live date>'
--    -- AND <v1-fb leads only>: map price_variant with funnelParamFromPriceVariant
--    --     (shared/funnelConfig.ts), which checks "_fb2" before "_fb".
--  GROUP BY 1;


-- ============================================================================
-- 🔙 ROLLBACK — roll the CODE back first (Drizzle selects every schema column, so
--    dropping the column under running code breaks every conversations read), then:
--
-- BEGIN;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS lane;
-- COMMIT;
-- ============================================================================
