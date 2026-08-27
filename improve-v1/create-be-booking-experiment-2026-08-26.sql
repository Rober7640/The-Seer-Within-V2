-- ============================================================================
-- CREATE the BE-02 BOOKING-TREATMENT experiment — form PAGE vs Evelyn CHAT
-- 2026-08-26 · Backend offer 02 (Twin Flame). Spec: docs/BE-offer-02-aweber-lists-spec.md
--
--   key            be_02_booking_treatment_2026
--   variants       A w50 (CONTROL = page, {"treatment":"page"}) /
--                  B w50 (chat, {"treatment":"chat"})
--   subject_type   visitor   ← a per-browser id; at the booking screen there is no
--                              email yet, so we cannot key on the hashed email like
--                              the V1 tests do. The id is threaded through checkout
--                              so the purchase attributes back to the arm she saw.
--   scope          none (global) — BE is not a V1 funnel, so no funnel/sign scope.
--   conversion     event, name be_02_booking_purchased, windowDays 7
--   status         DRAFT  ← inert. resolveBeBookingTreatment returns 'page' for
--                            everyone until this row exists AND is started.
--
-- Run both booking screens AS BUILT and keep the winner (operator decision,
-- 2026-08-26). The page has 6 agreement checkboxes, the chat 3 — so a win tells
-- us which whole experience sells, not whether the format or the checkbox count
-- did it. That trade-off was accepted deliberately.
--
-- 🔴 RUN ON DEV FIRST, THEN PROD. The databases were separated on 2026-08-05, so
--    this row must be created twice. A "0 rows" surprise usually means the wrong DB.
--
-- 🔴 ORDER OF OPERATIONS:
--      1. deploy the code   (inert without this row — the booking root shows the
--                            page for everyone, byte-identical to a page-only launch)
--      2. this file         (creates the DRAFT — still inert)
--      3. press Start in /admin/experiments when you want the split to begin
--
-- 🧪 DEV/QA: to exercise the split WITHOUT starting it, run the app with
--    EXPERIMENT_FORCE_RUNNING=be_02_booking_treatment_2026 — assign() force-runs a
--    listed draft key on a dev deployment only (prod never sets the env var).
--
-- WHY A IS variants[0]. pickVariant walks the list in order, so the control must
-- be first. A = the page, which is also what the root shows when the test is off,
-- making the draft state identical to a page-only launch.
--
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can
-- only ever host ONE run. Never reuse a concluded key.
-- ============================================================================

-- ── 0. PRE-FLIGHT ───────────────────────────────────────────────────────────
-- Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status, scope, variants, started_at
FROM experiments
WHERE key = 'be_02_booking_treatment_2026';


-- ── 1. CREATE THE DRAFT — inert until it is started. ────────────────────────
BEGIN;

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'be_02_booking_treatment_2026',
  'BE-02 booking — form page vs Evelyn chat',
  'Backend offer 02 (Twin Flame) booking screen, run as a straight A/B. A = the '
  'form-style page (6 agreement checkboxes, bump inline). B = the Evelyn chat (3 '
  'agreements, bump as its own turn). Same $35 + $12.77 bump, same product — only '
  'the presentation differs. Assigned on a per-browser visitor id and threaded '
  'through checkout, so a backend purchase (be_orders, an event conversion) '
  'attributes back to the arm she saw. To start, set status=running.',
  'draft',
  'visitor',
  -- 🔴 A FIRST. variants[0] is the control arm (the page).
  '[
     {"key": "A", "weight": 50, "payload": {"treatment": "page"}},
     {"key": "B", "weight": 50, "payload": {"treatment": "chat"}}
   ]'::jsonb,
  -- No scope: BE is not a V1 funnel, and this is the only backend traffic on
  -- this key, so there is nothing to fence it off from.
  NULL,
  -- event conversion: a backend sale lands in be_orders, not conversations /
  -- credit_purchases, so it is logged as a generic experiment_conversions row
  -- keyed on the same visitor subject_id. tallyEvent joins the two.
  '{"type": "event", "name": "be_02_booking_purchased", "windowDays": 7}'::jsonb
);

-- ⛔ Must report exactly 1 row. Anything else → ROLLBACK.
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments
WHERE key = 'be_02_booking_treatment_2026';
-- Expect status=draft, subject_type=visitor, A w50 FIRST then B w50,
-- scope NULL, conversion.type=event.

-- Nothing may be enrolled yet — expect 0.
SELECT count(*) AS exposures_should_be_zero
FROM experiment_exposures
WHERE experiment_key = 'be_02_booking_treatment_2026';

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. START IT — in /admin/experiments, NOT here. ──────────────────────────
-- The admin /start endpoint runs guards this file cannot and stamps started_at,
-- the cohort anchor every tally reads.


-- ── 3. POST-START CHECK — within ~30s of real traffic (CACHE_TTL_MS). ───────
SELECT variant, count(*) AS viewers
FROM experiment_exposures
WHERE experiment_key = 'be_02_booking_treatment_2026'
GROUP BY variant
ORDER BY variant;
-- Expect ~50/50 across A and B, and nothing before started_at.

-- End-to-end: exposures matched to purchases, per arm.
SELECT e.variant,
       count(*)                                         AS viewers,
       count(*) FILTER (WHERE c.subject_id IS NOT NULL) AS buyers
FROM experiment_exposures e
LEFT JOIN (
  SELECT subject_id FROM experiment_conversions
  WHERE experiment_key = 'be_02_booking_treatment_2026'
  GROUP BY subject_id
) c ON c.subject_id = e.subject_id
WHERE e.experiment_key = 'be_02_booking_treatment_2026'
GROUP BY e.variant
ORDER BY e.variant;


-- ============================================================================
-- 🔙 KILL SWITCH — set status → 'paused' in /admin/experiments. Reverts every
--    visitor to the page within <=30s. Collected exposures stay (they are real).
-- 🔙 FULL REMOVAL (only while still draft / never started):
--    DELETE FROM experiments WHERE key = 'be_02_booking_treatment_2026' AND status = 'draft';
-- ============================================================================
