-- ============================================================================
-- ADD the four V1 order-bump columns to `conversations`
-- 2026-08-04 · prerequisite for the order-bump build.
--
-- 🔴 RUN THIS RATHER THAN `npm run db:push`. Drizzle push diffs the WHOLE schema
--    against the live database and this schema has known drift (server/api/crud.ts
--    references columns that do not exist), so a push could propose changes far
--    beyond these four. Explicit DDL touches exactly what is named here.
--
-- ORDER OF OPERATIONS: run this BEFORE deploying the code. tallyV1Main's revenue
-- expression reads bump_amount_cents, and that query also powers the PRICE TEST
-- and the COMMITMENT GATE results — so code-first would break their results page
-- until the columns landed.
--
-- SAFETY: all four are nullable / default-false additions. Existing rows read
-- exactly as they do today (no bump offered, none bought, no bump revenue), and
-- ADD COLUMN with a non-volatile default does not rewrite the table on PG 11+.
-- IF NOT EXISTS makes the whole thing re-runnable.
-- ============================================================================

-- ── 0. PRE-FLIGHT — expect 0 rows (none of the columns exist yet). ──────────
SELECT column_name FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name LIKE 'bump%';


-- ── 1. THE CHANGE ───────────────────────────────────────────────────────────
BEGIN;

-- Was the offer actually shown to her (the take-rate DENOMINATOR — not "was in
-- the arm", since an arm-B lead who never reaches the pitch never sees it).
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bump_offered boolean DEFAULT false;

-- Did she take it.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bump_purchased boolean DEFAULT false;

-- WHICH second topic was sold (love / money / purpose / someone) — the PAIRED
-- bucket, not her original one.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bump_bucket text;

-- 🔴 The bump's own revenue, kept SEPARATE from main_purchase_amount on purpose.
--    main_purchase_amount stays "the main offer alone" ($35/$45) because the V1
--    price test and /admin/price-test both read it as main-offer revenue — a
--    $47.77 figure there would silently inflate both. The experiment tally adds
--    this column back in explicitly (tallyV1Main, server/lib/experiments.ts).
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bump_amount_cents integer;

-- Expect 4 rows.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name LIKE 'bump%'
ORDER BY column_name;

-- Existing data must be untouched: every historical row reads as "no bump".
-- Expect bumped_rows = 0 and a total matching the table's row count.
SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE bump_offered)    AS offered_rows,
       count(*) FILTER (WHERE bump_purchased)  AS bumped_rows,
       count(*) FILTER (WHERE bump_amount_cents IS NOT NULL) AS with_bump_revenue
FROM conversations;

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. PROVE THE SHARED TALLY STILL READS CORRECTLY ────────────────────────
-- The revenue expression used by the price test, the commitment gate AND the
-- bump test. With every bump_amount_cents NULL this must return EXACTLY what it
-- returned before the columns existed — that is the no-regression check.
SELECT sum(main_purchase_amount) AS old_expression,
       sum(main_purchase_amount + COALESCE(bump_amount_cents, 0)) AS new_expression
FROM conversations
WHERE purchased AND upsell_offered;
-- The two numbers MUST be identical. If they are not, stop and investigate.


-- ============================================================================
-- 🔙 ROLLBACK — only safe while no bump has been sold (dropping these would
--    destroy real revenue records otherwise). Check first:
--      SELECT count(*) FROM conversations WHERE bump_purchased;   -- must be 0
--
-- BEGIN;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS bump_offered;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS bump_purchased;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS bump_bucket;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS bump_amount_cents;
-- COMMIT;
--
-- 🔴 The code must be rolled back FIRST — tallyV1Main references
--    bump_amount_cents, so dropping it under running code breaks the results
--    page for all three v1_main_funnel tests.
-- ============================================================================
