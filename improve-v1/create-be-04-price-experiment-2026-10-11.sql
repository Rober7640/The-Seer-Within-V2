-- ============================================================================
-- CREATE the BE-04 PRICE SPLIT TEST — The Turn at $35 (A) vs $45 (B)
-- 2026-10-11 · Backend offer 04 (The Turn, tea-leaf reading). Record:
-- improve-v1/v1-one-time-BEs/docs/04/HANDOVER.md → "The price test".
--
--   key            be_04_price_2026
--   variants       A w50 (CONTROL = $35, {"priceCents":3500}) /
--                  B w50 ($45,            {"priceCents":4500})
--   subject_type   visitor   ← the per-browser id (client/src/lib/backendVisitor.ts). At the
--                              booking screen there is no email yet. The id is assigned when
--                              the page asks for its price, re-resolved at checkout, and
--                              threaded through Stripe metadata (expSubject) so the booking
--                              AND every upsell attribute back to the arm she was shown.
--   scope          {"freezeAssignment": true} — a visitor keeps the arm on her first exposure,
--                  even if the weights are edited later. No funnel/sign scope: BE is not a V1
--                  funnel, and 04 is the only traffic on this key.
--   conversion     event, name be_04_purchased, windowDays 7
--   status         DRAFT  ← inert. resolveBe04Price charges $35 (arm A) for everyone until
--                            this row exists AND is started.
--
-- Operator decision 2026-10-11: NO PRICE HIKE. The day ladder ($35/$47/$57/$67 by day since
-- the letter) is gone; one fixed price, split-tested. Same reading, same bump ($12.77 Double
-- Turning), same upsells — only the reading's price differs.
--
-- HOW IT IS SCORED. tallyEvent (server/lib/experiments.ts) counts, per arm: viewers =
-- exposures; buyers = visitors with ANY conversion row; revenue = the SUM of every row's value.
-- 04 writes one row for the booking and one per upsell payment, so revenue is per visitor and
-- includes the bump and both upsells — the number to read is "revenue per viewer":
--   event 'be_04_booking_purchased'                        value = amount_total (reading + bump)
--   event 'be_04_upsell_purchased:be_protection_ritual'    value = that upsell's charge
--   event 'be_04_upsell_purchased:be_bracelet'             value = that upsell's charge
-- (conversion.name below is a label only — tallyEvent does not filter on it.) Each row is
-- written once per (visitor, event), so Stripe retries and the thank-you page's re-record are
-- no-ops. A buyer with no exposure (a preview URL, or before the start) writes nothing.
--
-- 🔴 RUN THIS ONCE. Per the operator (2026-10-11) dev and prod share ONE database, so the row
--    is created once for both. (If your setup has two databases, run it on each — the
--    pre-flight below stops a second run on the same one.)
--
-- 🔴 ORDER OF OPERATIONS:
--      1. deploy the code   (inert without this row — everyone sees and pays $35)
--      2. this file         (creates the DRAFT — still inert, still $35 for everyone)
--      3. press Start in /admin/experiments when you want the split to begin
--
-- 🧪 DEV/QA: EXPERIMENT_FORCE_RUNNING=be_04_price_2026 force-runs this draft on a deployment
--    that sets it (prod never does). ⚠ With one shared database those exposures are REAL rows:
--    clear them (step 4) before pressing Start, or the frozen dev visitors join the cohort.
--
-- WHY A IS variants[0]. pickVariant walks the list in order, so the control must be first —
-- and every fallback in resolveBe04Price (draft, paused, DB error, a payload outside
-- {3500, 4500}) reports arm A at $35, which is what the control charges.
--
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can only ever host
-- ONE run. Never reuse a concluded key.
-- ============================================================================

-- ── 0. PRE-FLIGHT ───────────────────────────────────────────────────────────
-- Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status, scope, variants, started_at
FROM experiments
WHERE key = 'be_04_price_2026';


-- ── 1. CREATE THE DRAFT — inert until it is started. ────────────────────────
BEGIN;

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'be_04_price_2026',
  'BE-04 price — $35 vs $45',
  'Backend offer 04 (The Turn) reading price, run as a straight 50/50 split. A = $35 (control), '
  'B = $45. Same reading, same $12.77 Double Turning bump, same upsells — only the reading''s '
  'price differs. No price hike: the old day ladder is retired (operator 2026-10-11). Assigned '
  'on a per-browser visitor id when the booking screen asks for its price, re-resolved at '
  'checkout (which charges the server''s arm and answers 409 to a page that printed another), '
  'and carried through Stripe so the booking (amount_total, bump included) and each upsell '
  'payment log an event conversion for the arm. Read revenue per viewer. To start, press Start.',
  'draft',
  'visitor',
  -- 🔴 A FIRST. variants[0] is the control arm ($35). resolveBe04Price accepts only 3500 / 4500.
  '[
     {"key": "A", "weight": 50, "payload": {"priceCents": 3500}},
     {"key": "B", "weight": 50, "payload": {"priceCents": 4500}}
   ]'::jsonb,
  -- Freeze each visitor to the arm on her first exposure, so a later weight edit can never
  -- move someone who has already been shown a price.
  '{"freezeAssignment": true}'::jsonb,
  -- event conversion: a backend sale lands in be_orders, not conversations / credit_purchases,
  -- so it is logged as experiment_conversions rows keyed on the same visitor subject_id.
  -- tallyEvent joins the two.
  '{"type": "event", "name": "be_04_purchased", "windowDays": 7}'::jsonb
);

-- ⛔ Must report exactly 1 row. Anything else → ROLLBACK.
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments
WHERE key = 'be_04_price_2026';
-- Expect status=draft, subject_type=visitor, A w50 {"priceCents":3500} FIRST then
-- B w50 {"priceCents":4500}, scope {"freezeAssignment":true}, conversion.type=event.

-- Nothing may be enrolled yet — expect 0.
SELECT count(*) AS exposures_should_be_zero
FROM experiment_exposures
WHERE experiment_key = 'be_04_price_2026';

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. START IT — in /admin/experiments, NOT here. ──────────────────────────
-- The admin /start endpoint runs guards this file cannot and stamps started_at, the cohort
-- anchor every tally reads. Results: /admin/experiments → be_04_price_2026 (revenue per viewer).


-- ── 3. POST-START CHECKS — within ~30s of real traffic (CACHE_TTL_MS). ──────
SELECT variant, count(*) AS viewers
FROM experiment_exposures
WHERE experiment_key = 'be_04_price_2026'
GROUP BY variant
ORDER BY variant;
-- Expect ~50/50 across A and B, and nothing before started_at.

-- Every paid 04 order is charged one of the two prices — expect only 3500 and 4500 here
-- (reading_cents excludes the bump). Stripe metadata `priceArm` says which arm each one was.
SELECT reading_cents, count(*) AS orders
FROM be_orders
WHERE offer = 'tea-reading'
GROUP BY reading_cents
ORDER BY reading_cents;

-- End-to-end: exposures matched to conversions, per arm — the same numbers tallyEvent shows.
SELECT e.variant,
       count(*)                                         AS viewers,
       count(*) FILTER (WHERE c.subject_id IS NOT NULL) AS buyers,
       COALESCE(sum(c.total_value), 0)                  AS revenue_cents
FROM experiment_exposures e
LEFT JOIN (
  SELECT subject_id, sum(value) AS total_value FROM experiment_conversions
  WHERE experiment_key = 'be_04_price_2026'
  GROUP BY subject_id
) c ON c.subject_id = e.subject_id
WHERE e.experiment_key = 'be_04_price_2026'
GROUP BY e.variant
ORDER BY e.variant;

-- What the revenue is made of, per arm and event (booking vs each upsell).
SELECT variant, event, count(*) AS rows, sum(value) AS cents
FROM experiment_conversions
WHERE experiment_key = 'be_04_price_2026'
GROUP BY variant, event
ORDER BY variant, event;


-- ── 4. DEV FORCE-RUN CLEAN-UP — only if EXPERIMENT_FORCE_RUNNING enrolled anyone. ──
-- Run BEFORE pressing Start, while the row is still draft. Look first:
--   SELECT count(*) FROM experiment_exposures   WHERE experiment_key = 'be_04_price_2026';
--   SELECT count(*) FROM experiment_conversions WHERE experiment_key = 'be_04_price_2026';
-- then, only if every one of them is a dev/QA visit:
--   DELETE FROM experiment_conversions WHERE experiment_key = 'be_04_price_2026';
--   DELETE FROM experiment_exposures   WHERE experiment_key = 'be_04_price_2026';


-- ============================================================================
-- 🔙 KILL SWITCH — set status → 'paused' in /admin/experiments. Every visitor is back on
--    $35 within <=30s; a page that printed $45 gets a 409 with $35 on its next press, never
--    a silent charge. Collected exposures and conversions stay (they are real).
-- 🔙 FULL REMOVAL (only while still draft / never started):
--    DELETE FROM experiments WHERE key = 'be_04_price_2026' AND status = 'draft';
-- ============================================================================
