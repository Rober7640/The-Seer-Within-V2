-- ============================================================================
-- CREATE the V1 ORDER BUMP experiment — "double reading" ($12.77)
-- 2026-08-04 · Lewis: 50/50, "50% without order bump and another 50% to order
-- bump", pooled across ALL fb-palm and fb-tarot landers "just like the
-- commitment gate".
--
-- ⛔ DO NOT RUN THIS UNTIL THE BOSS HAS APPROVED THE MOCKUP.
--    The code ships dark on its own: with no row here at all, resolveV1Bump()
--    returns control for everyone and the funnel behaves exactly as it does
--    today. This file is the ON switch (well — the arming switch; see step 2).
--
-- 🔴 DEPLOY THE CODE FIRST. Without it, `bump_amount_cents` does not exist and
--    tallyV1Main's revenue expression fails, breaking the results page for the
--    PRICE TEST and the COMMITMENT GATE too — they share that query.
--
--   key            v1_order_bump_2026
--   variants       A w50 (control, no bump) / B w50 (payload {"bump": true})
--   scope          {"funnel": ["v1-palm", "v1-tarot"]}
--   conversion     v1_main_funnel, windowDays 7, targetN 1200 per arm
--   status         DRAFT  ← inert. Nobody is enrolled, nothing is charged.
--
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can
-- only ever host ONE run. Never reuse a concluded key.
--
-- WHY 'email' SUBJECT TYPE: the arm is bucketed on sha256(normalised email), the
-- same as the price test and the gate — which is what lets a RETURNING visitor be
-- re-split into both arms instead of being stuck in control (they are 23% of palm
-- sessions but 57% of its main buys, so the alternative biases the test badly).
-- ============================================================================

-- ── 0. PRE-FLIGHT — expect 0 rows. If a row exists, STOP: the key is taken. ──
SELECT key, status, scope, variants, started_at
FROM experiments
WHERE key = 'v1_order_bump_2026';

-- Sanity: the migration must have landed, or the tally will error later.
-- Expect 4 rows (bump_offered, bump_purchased, bump_bucket, bump_amount_cents).
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name LIKE 'bump%'
ORDER BY column_name;


-- ── 1. CREATE THE DRAFT — inert until step 2. ───────────────────────────────
BEGIN;

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_order_bump_2026',
  'V1 Order Bump — Double Reading ($12.77)',
  'One extra chat turn between the buy CTA and the Stripe redirect offering a '
  'second reading on a paired topic for $12.77, as a second line item on the '
  'same checkout session. A = no bump (today''s behaviour), B = bump offered. '
  'Pooled across fb-palm and fb-tarot.',
  'draft',
  'email',
  '[
     {"key": "A", "weight": 50, "payload": {}},
     {"key": "B", "weight": 50, "payload": {"bump": true}}
   ]'::jsonb,
  -- Array scope = one pooled test across both funnels, exactly as the commitment
  -- gate ran. Every palm sign and every tarot lander is in scope; the per-sign
  -- and per-lander breakdown tables come from the exposure context, not scope.
  '{"funnel": ["v1-palm", "v1-tarot"]}'::jsonb,
  -- targetN is the pre-registered per-arm exposure count. The verdict and the
  -- declare-winner button stay LOCKED until the smaller arm reaches it — that is
  -- the no-peeking gate. 1200 matches the commitment gate's pre-registration.
  -- Editable freely while the row is still draft; NOT after it starts.
  '{"type": "v1_main_funnel", "windowDays": 7, "targetN": 1200}'::jsonb
);

-- ⛔ Must report exactly 1 row. Anything else → ROLLBACK.

SELECT key, status, subject_type, variants, scope, conversion
FROM experiments
WHERE key = 'v1_order_bump_2026';
-- Expect status=draft, weights 50/50, scope.funnel = ["v1-palm","v1-tarot"].

-- Nothing may be enrolled yet — expect 0.
SELECT count(*) AS exposures_should_be_zero
FROM experiment_exposures
WHERE experiment_key = 'v1_order_bump_2026';

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. START IT — do this in /admin/experiments, NOT here. ──────────────────
-- The admin /start endpoint runs guards this file cannot (≥2 arms with positive
-- weight, conversion type ↔ key, and the scope.funnel requirement) and stamps
-- started_at, which is the cohort anchor every tally reads.
--
-- 🔴 Anchor the reporting window to started_at, never to "all time" — a window
--    that predates the flip mixes in traffic that was never in the test.
--
-- 🔴 SCOPE IS FROZEN AT START. The assignment freeze 409s any scope edit on a
--    non-draft row. So decide palm-only vs palm+tarot BEFORE pressing start; to
--    change it afterwards you need a deliberate guarded SQL override (see
--    extend-gate-to-tarot-2026-07-31.sql) or a brand-new key.


-- ── 3. POST-START CHECK — within ~30s of real traffic (CACHE_TTL_MS). ───────
SELECT context->>'funnel' AS funnel, variant, count(*) AS exposures
FROM experiment_exposures
WHERE experiment_key = 'v1_order_bump_2026'
GROUP BY 1, 2
ORDER BY 1, 2;
-- Expect v1-palm and v1-tarot rows, each splitting roughly 50/50.

-- Per-hook split (the label this test records that the gate did not).
SELECT context->>'sign' AS sign, context->>'hook' AS hook, variant, count(*)
FROM experiment_exposures
WHERE experiment_key = 'v1_order_bump_2026' AND context->>'funnel' = 'v1-palm'
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
-- soulmate-timing on sign palm-signs is the lander Lewis named on 2026-08-04.

-- Take-rate, once buys exist. Denominator = actually saw the offer.
SELECT count(*) FILTER (WHERE bump_offered)   AS offered,
       count(*) FILTER (WHERE bump_purchased) AS took_it,
       round(100.0 * count(*) FILTER (WHERE bump_purchased)
             / NULLIF(count(*) FILTER (WHERE bump_offered), 0), 1) AS take_rate_pct,
       sum(bump_amount_cents) FILTER (WHERE bump_purchased) AS bump_revenue_cents
FROM conversations
WHERE bump_offered = true;


-- ============================================================================
-- 🔙 KILL SWITCH — set status → 'paused' in /admin/experiments.
--    Reverts everyone to control within ≤30s: no offer turn, no second line
--    item, no bump metadata. Already-collected exposures stay (they are real).
--
-- 🔴 Do NOT kill with 'done' + a winner. A concluded test with a declared
--    winner KEEPS APPLYING that winner's payload (assign(), status='done'
--    branch) — declaring B would leave the bump running on 100% of traffic,
--    which is how you SHIP it, not how you stop it.
--
-- 🔙 FULL REMOVAL (only while still draft / never started):
--    DELETE FROM experiments WHERE key = 'v1_order_bump_2026' AND status = 'draft';
-- ============================================================================
