-- ============================================================================
-- ADD `ab_visitor_id` to `conversations`
-- 2026-08-10 · prerequisite for the /fb-tarot Version B-vs-C split test.
--
-- 🔴 RUN THIS RATHER THAN `npm run db:push`. Drizzle push diffs the WHOLE schema
--    against the live database and this schema has known drift, so a push could
--    propose changes far beyond this one column. Explicit DDL touches exactly
--    what is named here.
--
-- 🔴 RUN IT TWICE — once on DEV, once on PROD. The two databases were separated
--    on 2026-08-05; they no longer share a schema, so a migration applied to one
--    has NOT been applied to the other.
--
-- WHAT IT IS FOR. Every other V1 experiment (price, commitment gate, order bump)
-- assigns at LEAD CAPTURE on the email hash, and its exposure row carries
-- `conversationId` — so tallyV1Main joins exposure→conversation directly and needs
-- nothing here. The tarot VERSION test cannot work that way: it changes the very
-- FIRST chat message, so it is assigned as the chat opens, before an email exists,
-- on the anonymous `ab_vid` visitor cookie. That leaves the exposure keyed on a
-- visitor id and the purchase keyed on an email with nothing joining them. This
-- column is that join, written once at lead capture.
--
-- Why not put the visitor id in the exposure context instead: exposures are
-- unique(experiment_key, subject_id) and written exactly once, as the chat opens,
-- when no conversation row exists yet to point at.
--
-- ORDER OF OPERATIONS: run this BEFORE deploying the code. tallyV1MainByVisitor
-- reads ab_visitor_id, so code-first would break the results page for the new
-- test until the column landed. (The other three v1_main_funnel tests are
-- unaffected either way — they never touch this column.)
--
-- SAFETY: one nullable column, no default, no back-fill. Every existing row reads
-- exactly as it does today, and ADD COLUMN with no default does not rewrite the
-- table. IF NOT EXISTS makes the whole thing re-runnable.
-- ============================================================================

-- ── 0. PRE-FLIGHT — expect 0 rows (the column does not exist yet). ──────────
SELECT column_name FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name = 'ab_visitor_id';

-- Record the row count so step 2 can prove nothing was rewritten.
SELECT count(*) AS rows_before FROM conversations;


-- ── 1. THE CHANGE ───────────────────────────────────────────────────────────
BEGIN;

-- The `ab_vid` cookie value the lander saw. Nullable: NULL on every historical
-- row and on every funnel that does not run a lander-time experiment, which is
-- all of them except /fb-tarot today.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ab_visitor_id text;

-- Expect exactly 1 row: ab_visitor_id | text | YES | (null default).
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name = 'ab_visitor_id';

-- Existing data untouched: with_visitor_id MUST be 0 and total_rows MUST equal
-- rows_before from step 0.
SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE ab_visitor_id IS NOT NULL) AS with_visitor_id
FROM conversations;

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. THE INDEX ────────────────────────────────────────────────────────────
-- Outside the transaction on purpose: CREATE INDEX CONCURRENTLY cannot run
-- inside a BEGIN/COMMIT block. CONCURRENTLY so the build takes no write lock on
-- a live table taking real traffic.
--
-- Partial (WHERE NOT NULL) because the column is NULL on every historical row and
-- on every non-tarot funnel forever — indexing those would be pure waste. The
-- tally only ever looks up non-NULL values.
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_ab_visitor_id_idx
  ON conversations (ab_visitor_id)
  WHERE ab_visitor_id IS NOT NULL;

-- Expect 1 row, and indisvalid = true. A CONCURRENTLY build that fails leaves an
-- INVALID index behind that is silently never used — check, do not assume.
SELECT i.relname AS index_name, x.indisvalid
FROM pg_class i
JOIN pg_index x ON x.indexrelid = i.oid
WHERE i.relname = 'conversations_ab_visitor_id_idx';
-- If indisvalid = false:  DROP INDEX conversations_ab_visitor_id_idx;  and retry.


-- ── 3. PROVE THE SHARED TALLY IS UNAFFECTED ────────────────────────────────
-- The revenue expression used by the price test, the commitment gate AND the
-- order bump. This column is not in it, so the number must be byte-identical to
-- what it returned before. This is the no-regression check.
SELECT sum(main_purchase_amount + COALESCE(bump_amount_cents, 0)) AS revenue_cents,
       count(*) AS buyers
FROM conversations
WHERE main_paid_at IS NOT NULL;
-- Compare against the same query run before this migration. MUST be identical.


-- ============================================================================
-- 🔙 ROLLBACK — safe at any time. The column is write-only until the experiment
--    is STARTED, and nothing outside the new tarot version test reads it, so
--    dropping it destroys no revenue record and breaks no other results page.
--
-- BEGIN;
-- DROP INDEX CONCURRENTLY IF EXISTS conversations_ab_visitor_id_idx;  -- (run outside BEGIN)
-- ALTER TABLE conversations DROP COLUMN IF EXISTS ab_visitor_id;
-- COMMIT;
--
-- 🔴 Roll the CODE back first — tallyV1MainByVisitor references this column, so
--    dropping it under running code breaks the new test's results page. The
--    other three v1_main_funnel tests keep working either way.
-- ============================================================================
