-- ============================================================================
-- ADD `weights_changed_at` to `experiments`
-- 2026-08-14 · fixes the permanent false-positive SRM banner after a live reweight.
--
-- 🔴 RUN THIS RATHER THAN `npm run db:push`. Drizzle push diffs the WHOLE schema
--    against the live database and this schema has known drift, so a push could
--    propose changes far beyond this one column. Explicit DDL touches exactly
--    what is named here.
--
-- 🔴 RUN IT TWICE — once on DEV, once on PROD. The two databases were separated
--    on 2026-08-05; a migration applied to one has NOT been applied to the other.
--
-- WHAT IT IS FOR. `augmentSrm()` grades the observed A/B split against the
-- CONFIGURED weights with a chi-square test, and it reads every exposure since the
-- cohort started. Nothing recorded WHEN the weights last moved, so after any live
-- reweight the old era is graded against the new ratio and the red "Sample-ratio
-- mismatch" banner fires by construction.
--
-- It also never clears. New traffic adds to BOTH arms, so the imbalance the old era
-- baked in never shrinks — only the denominator grows. For the live tarot test
-- (C=2,362 / B=1,048 when measured 2026-08-14) chi2 bottoms out around 308 against
-- a 10.83 threshold and then RISES again. The banner would stay red for the rest of
-- the run, hiding any GENUINE randomisation failure behind a warning everyone has
-- learned to ignore. That is the actual bug being fixed here; the cosmetics are
-- secondary.
--
-- ORDER OF OPERATIONS: run this BEFORE deploying the code. The results route selects
-- the whole `experiments` row, so code-first would 500 every experiment's results
-- page until the column landed.
--
-- SAFETY: one nullable timestamp, no default, no back-fill in this step. Every
-- existing row keeps `weights_changed_at = NULL`, and augmentSrm treats NULL as
-- "never reweighted" and behaves EXACTLY as it does today — so this migration alone
-- changes nothing anyone can see. ADD COLUMN with no default does not rewrite the
-- table. IF NOT EXISTS makes the whole thing re-runnable.
-- ============================================================================

-- ── 0. PRE-FLIGHT — expect 0 rows (the column does not exist yet). ──────────
SELECT column_name FROM information_schema.columns
WHERE table_name = 'experiments' AND column_name = 'weights_changed_at';

-- Record the row count so step 2 can prove nothing was rewritten.
SELECT count(*) AS rows_before FROM experiments;


-- ── 1. THE CHANGE ───────────────────────────────────────────────────────────
BEGIN;

ALTER TABLE experiments ADD COLUMN IF NOT EXISTS weights_changed_at timestamp;

-- Expect exactly 1 row: weights_changed_at | timestamp without time zone | YES | null.
-- 🔴 `timestamp` (naive), NOT `timestamptz` — every other timestamp on this table is
--    naive and holds UTC. Mixing the two is how the 5.5h clock trap keeps recurring.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'experiments' AND column_name = 'weights_changed_at';

-- Existing data untouched: with_stamp MUST be 0 and total_rows MUST equal
-- rows_before from step 0.
SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE weights_changed_at IS NOT NULL) AS with_stamp
FROM experiments;

COMMIT;
-- (ROLLBACK; instead if either check above disagrees.)


-- ── 2. BACK-FILL — PROD ONLY, and ONLY for the one test already reweighted. ─
-- 🔴🔴 SEPARATE DECISION. Everything above is inert; THIS is the statement that
--      actually clears the red banner, because the tarot reweight happened on
--      2026-08-14, BEFORE this column existed, so its stamp would otherwise stay
--      NULL and the banner would stay red even after the fix ships.
--
-- 🔴🔴 THE VALUE IS THE STORED, NAIVE-UTC `updated_at`, READ AS ::text.
--      Do NOT copy a timestamp printed by a raw `pg` script: those scripts lack the
--      OID-1114 parser override server/lib/db.ts installs and render this column
--      5h30m BEHIND the stored value. Using the printed 2026-08-13 20:00:57 instead
--      of the stored 2026-08-14 01:30:57 would put ~65 exposures in the wrong era.
--
-- CONFIRM THE VALUE FIRST — read it as text, do not trust a client's rendering:
SELECT key,
       updated_at::text        AS updated_at_stored,
       started_at::text        AS started_at_stored,
       variants::text          AS variants_now
FROM experiments
WHERE key = 'v1_tarot_version_bc_2026';
-- Expect: variants = C w50 / B w50, and updated_at_stored = '2026-08-14 01:30:57.572'.
-- ⛔ If updated_at_stored is NOT that value, the row has been edited again since
--    2026-08-14 and `updated_at` no longer marks the reweight. STOP and find the real
--    instant before writing anything — updated_at moves on ANY edit (name,
--    description, appending scope.landers), which is exactly why this column exists.

-- Guarded to the one key, and to the one value we verified. Expect UPDATE 1.
BEGIN;

UPDATE experiments
   SET weights_changed_at = '2026-08-14 01:30:57.572'
 WHERE key = 'v1_tarot_version_bc_2026'
   AND weights_changed_at IS NULL
   AND updated_at = '2026-08-14 01:30:57.572';

-- ⛔ Must report exactly 1 row. 0 rows means the guard rejected it — do NOT loosen
--    the guard, go back and re-read updated_at::text above.
SELECT key, weights_changed_at::text AS weights_changed_at_stored
FROM experiments WHERE key = 'v1_tarot_version_bc_2026';

-- Sanity: how the two eras actually split. Expect roughly 30% B before and ~50% B
-- after; if "after" is tiny the banner will simply read "collecting", not red.
SELECT CASE WHEN created_at < '2026-08-14 01:30:57.572' THEN 'before' ELSE 'after' END AS era,
       count(*) FILTER (WHERE variant = 'C') AS c_exposures,
       count(*) FILTER (WHERE variant = 'B') AS b_exposures,
       round(100.0 * count(*) FILTER (WHERE variant = 'B') / NULLIF(count(*), 0), 1) AS b_share_pct
FROM experiment_exposures
WHERE experiment_key = 'v1_tarot_version_bc_2026'
GROUP BY 1 ORDER BY 1 DESC;

COMMIT;
-- (ROLLBACK; instead if the UPDATE did not report exactly 1 row.)


-- ============================================================================
-- 🔙 UNDO
--    Back-fill only:  UPDATE experiments SET weights_changed_at = NULL
--                      WHERE key = 'v1_tarot_version_bc_2026';
--                     (⇒ the banner returns to its current red state; nothing else.)
--    Whole column:    ALTER TABLE experiments DROP COLUMN IF EXISTS weights_changed_at;
--                     🔴 Only safe once the code that reads it is rolled back too.
-- ============================================================================
