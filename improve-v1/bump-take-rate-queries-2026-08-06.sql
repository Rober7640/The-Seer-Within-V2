-- ============================================================================
-- ORDER BUMP — the numbers for Joel.  v1_order_bump_2026
-- 2026-08-06 · READ-ONLY. Every query is a SELECT; paste into the Supabase SQL
-- editor and run. Nothing here writes.
--
-- Each query is SELF-CONTAINED: the cohort anchor (experiments.started_at) is
-- looked up inside the query, so there is nothing to fill in by hand.
--
-- 🔑 WHY THE JOIN THROUGH experiment_exposures IS LOAD-BEARING
-- Dev and prod share ONE database, and V1_BUMP_QA_EMAILS testers get bump:true
-- with enrolled:false — meaning their `conversations` row has bump_offered=true
-- but NO exposure row. A naive `WHERE bump_offered = true` therefore counts your
-- own test purchases as customer take-up. Joining through exposures excludes
-- them; query 3 counts them so you can see the exclusion working.
--
-- 🔑 TWO DIFFERENT "TOOK THE BUMP" NUMBERS
-- bump_offered / bump_purchased are written when the Stripe SESSION is created
-- (server/routes.ts:862) — BEFORE payment. The confirmed-payment signal is
-- `purchased AND upsell_offered` (purchased alone is set optimistically at
-- checkout). So:
--   said_yes       = clicked [Yes, double it]           → INTENT
--   paid_with_bump = clicked yes AND the payment cleared → MONEY
-- Only paid_with_bump is revenue. Report both; never quote intent as revenue.
-- ============================================================================


-- ── 0. Is it actually running, and since when? ──────────────────────────────
SELECT key, status, started_at,
       (EXTRACT(EPOCH FROM (now() - started_at)) / 3600)::int AS hours_live
FROM experiments
WHERE key = 'v1_order_bump_2026';
-- Expect status='running'. 🔴 Trust THIS, not the admin badge — a force-run dev
-- service renders "running" while the DB row is still draft.


-- ── 1. HEADLINE A/B — the number that decides the test. ─────────────────────
-- Identical logic to tallyV1Main (server/lib/experiments.ts:810), so these
-- figures match /admin/experiments exactly.
WITH anchor AS (
  SELECT COALESCE(
           (SELECT started_at FROM experiments
             WHERE key = 'v1_order_bump_2026'),
           (SELECT min(created_at) FROM experiment_exposures
             WHERE experiment_key = 'v1_order_bump_2026')
         ) AS start_at
)
SELECT e.variant,
       count(*)                                                     AS visitors,
       count(*) FILTER (WHERE c.purchased AND c.upsell_offered)     AS buyers,
       round(100.0 * count(*) FILTER (WHERE c.purchased AND c.upsell_offered)
             / NULLIF(count(*), 0), 2)                              AS cr_pct,
       COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents, 0))
                FILTER (WHERE c.purchased AND c.upsell_offered), 0) AS revenue_cents,
       round(COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents, 0))
                      FILTER (WHERE c.purchased AND c.upsell_offered), 0)
             / 100.0 / NULLIF(count(*), 0), 4)                      AS revenue_per_visitor
FROM experiment_exposures e
LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
WHERE e.experiment_key = 'v1_order_bump_2026'
  AND e.created_at >= (SELECT start_at FROM anchor)
GROUP BY e.variant
ORDER BY e.variant;
-- A = control (no bump), B = bump offered.
-- ⭐ revenue_per_visitor is THE metric. A $35 no-bump sale counts the same in
--    both arms, so it cannot tilt the comparison — B only wins on bump revenue,
--    and only if the extra step didn't cost it buyers.
-- ⓘ Don't call a winner before the smaller arm hits 1200 visitors (pre-registered).


-- ── 2. TAKE RATE — arm B only, split palm vs tarot. ─────────────────────────
WITH anchor AS (
  SELECT COALESCE(
           (SELECT started_at FROM experiments
             WHERE key = 'v1_order_bump_2026'),
           (SELECT min(created_at) FROM experiment_exposures
             WHERE experiment_key = 'v1_order_bump_2026')
         ) AS start_at
)
SELECT COALESCE(e.context->>'funnel', '(unrecorded)')                 AS funnel,
       count(*) FILTER (WHERE c.bump_offered)                         AS offered,
       count(*) FILTER (WHERE c.bump_purchased)                       AS said_yes,
       round(100.0 * count(*) FILTER (WHERE c.bump_purchased)
             / NULLIF(count(*) FILTER (WHERE c.bump_offered), 0), 1)  AS intent_pct,
       count(*) FILTER (WHERE c.bump_offered AND c.purchased
                              AND c.upsell_offered)                   AS offered_and_paid,
       count(*) FILTER (WHERE c.bump_purchased AND c.purchased
                              AND c.upsell_offered)                   AS paid_with_bump,
       round(100.0 * count(*) FILTER (WHERE c.bump_purchased AND c.purchased
                                            AND c.upsell_offered)
             / NULLIF(count(*) FILTER (WHERE c.bump_offered AND c.purchased
                                             AND c.upsell_offered), 0), 1)
                                                                      AS paid_take_rate_pct,
       COALESCE(sum(c.bump_amount_cents) FILTER (WHERE c.bump_purchased
                AND c.purchased AND c.upsell_offered), 0)             AS bump_revenue_cents
FROM experiment_exposures e
JOIN conversations c ON c.id = e.context->>'conversationId'
WHERE e.experiment_key = 'v1_order_bump_2026'
  AND e.created_at >= (SELECT start_at FROM anchor)
  AND e.variant = 'B'
GROUP BY 1
ORDER BY 1;
-- ⚠ DENOMINATOR CAVEAT: bump_offered is only written once she reaches checkout.
--   Someone who saw the offer turn and left the page entirely is NOT in it, so
--   take rate reads slightly HIGH. Those visitors ARE counted in query 1, which
--   is the number that decides the test.


-- ── 3. Bump rows OUTSIDE the cohort — your QA testers / dev walks. ──────────
-- Should be small and should equal your own test buys. Confirms queries 1 and 2
-- are excluding them.
SELECT count(*)                                        AS rows_outside_cohort,
       count(*) FILTER (WHERE bump_purchased)          AS said_yes,
       COALESCE(sum(bump_amount_cents) FILTER (WHERE bump_purchased
                AND purchased AND upsell_offered), 0)  AS revenue_cents
FROM conversations c
WHERE c.bump_offered = true
  AND NOT EXISTS (
    SELECT 1 FROM experiment_exposures e
     WHERE e.experiment_key = 'v1_order_bump_2026'
       AND e.context->>'conversationId' = c.id
  );
