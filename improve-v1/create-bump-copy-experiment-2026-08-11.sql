-- ============================================================================
-- V1 ORDER BUMP — COPY TEST.  key: v1_bump_copy_2026
--
-- Spec: docs/superpowers/specs/2026-08-11-order-bump-copy-test.md
--
--   A (control)  today's copy — "I'm also sensing something blocking your Money
--                path… $12.77 more for the double reading."  This is the copy
--                the live 30%+ take rate was measured on.
--   B (treatment) "double-strength ritual" — sells a STRONGER CLEARING instead
--                of a second reading. Six hours instead of three, no topic.
--
-- ⚠️ THE ARM LETTERS AND THE COPY LETTERS ARE DIFFERENT NAMESPACES.
--    Arm B carries payload {"copy": "A"}. "Variation A" in the spec = the ritual
--    copy = ARM B here. Arm letters are A/B because tally() defaults to
--    controlKey='A' / treatmentKey='B' and the dashboard relies on it.
--    Variation B (the "channel is already open" rewording) is BUILT but PARKED —
--    it is not in this test. A later run gets its own key.
--
-- WHY A NEW KEY. v1_order_bump_2026's control arm is `{}` — NO bump. That is the
-- wrong control for a copy test, where every arm must show a bump. Reusing the
-- key is also ruled out by experiments.ts:557 ("a second run under the same key
-- with a later start would drop returning subjects. A new test = a new key").
-- ============================================================================


-- ── 0. SIZE IT FIRST — targetN is in LEADS, the power calc is in BUYERS. ─────
--
-- To detect 30% -> 40% bump take-rate at 80% power / p<0.05 you need ~353 buyers
-- per arm who were OFFERED the bump. targetN gates on EXPOSURES, and an exposure
-- here is a lead (resolveV1Bump runs at lead capture). So:
--
--     targetN = 353 / (share of leads that become main buyers)
--
-- v1_order_bump_2026 used targetN 1200, which was sized for a different question.
-- Run this against the LIVE experiment to get the real ratio before choosing:

SELECT e.variant,
       count(*)                                              AS exposures_leads,
       count(*) FILTER (WHERE c.bump_offered)                AS offered,
       count(*) FILTER (WHERE c.bump_offered AND c.main_paid_at IS NOT NULL)
                                                             AS offered_and_paid,
       round(100.0 * count(*) FILTER (WHERE c.bump_offered AND c.main_paid_at IS NOT NULL)
             / NULLIF(count(*), 0), 2)                       AS pct_leads_to_buyers
FROM experiment_exposures e
JOIN conversations c ON lower(trim(c.email)) = e.subject
WHERE e.experiment_key = 'v1_order_bump_2026'
GROUP BY 1
ORDER BY 1;
-- Take `pct_leads_to_buyers` from the BUMP arm (B). targetN = ceil(353 / (pct/100)).
-- e.g. 8% -> targetN 4413.   3% -> targetN 11767.   Put that number in step 1.


-- ── 1. CREATE THE DRAFT — inert until step 3. ───────────────────────────────
BEGIN;

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_bump_copy_2026',
  'V1 Order Bump — Copy Test (control vs double-strength ritual)',
  'Both arms are OFFERED the $12.77 bump; only the wording differs. A = today''s '
  '"double your reading" copy on a paired topic. B = "double-strength ritual": '
  'sells a deeper clearing of the ONE block already found, names no topic, and '
  'bills a different Stripe line ("+ Double-Strength Clearing"). B also drops '
  'the second written reading, so fulfilment differs. Pooled across fb-palm and '
  'fb-tarot, same as the bump test it follows.',
  'draft',
  'email',
  '[
     {"key": "A", "weight": 50, "payload": {"bump": true}},
     {"key": "B", "weight": 50, "payload": {"bump": true, "copy": "A"}}
   ]'::jsonb,
  -- Same pooled scope as v1_order_bump_2026. Frozen at start.
  '{"funnel": ["v1-palm", "v1-tarot"]}'::jsonb,
  -- 🔴 REPLACE 9999 with the number from step 0 before running this.
  '{"type": "v1_main_funnel", "windowDays": 7, "targetN": 9999}'::jsonb
);

-- ⛔ Must report exactly 1 row. Anything else → ROLLBACK.
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments
WHERE key = 'v1_bump_copy_2026';
-- Expect status=draft, weights 50/50, BOTH payloads carrying "bump": true.

-- Nothing may be enrolled yet — expect 0.
SELECT count(*) AS exposures_should_be_zero
FROM experiment_exposures
WHERE experiment_key = 'v1_bump_copy_2026';

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. START IT — in /admin/experiments, NOT here. ──────────────────────────
-- The admin /start endpoint runs guards this file cannot, and stamps started_at,
-- which is the cohort anchor every tally reads.
--
-- 🔴 START IT **BEFORE** STEP 3. resolveV1Bump returns bump:false when a key
--    resolves to no RUNNING experiment. Flipping the env var while this row is
--    still draft turns the bump off for every buyer.


-- ── 3. CUT OVER — set the env var, then restart. ────────────────────────────
--
--     V1_BUMP_EXPERIMENT_KEY=v1_bump_copy_2026
--
-- No deploy needed: shared/orderBump.ts resolveBumpExperimentKey() reads it, and
-- unset ⇒ the old key. This is also the rollback — unset it and restart.
--
-- 🔴 ORDER MATTERS. Seed+start (steps 1-2) FIRST, env var SECOND. The other way
--    round leaves a window with no bump on any checkout.


-- ── 4. WHAT TO DO WITH THE OLD TEST ─────────────────────────────────────────
-- Once traffic is on the new key, v1_order_bump_2026 is collecting nothing. Do
-- NOT conclude it with a declared winner while it is still the live key —
-- assign()'s status='done' branch KEEPS APPLYING the winner's payload. After the
-- cutover it no longer matters which way it is closed.


-- ── 5. POST-CUTOVER CHECK — within ~30s of real traffic (CACHE_TTL_MS). ─────
SELECT context->>'funnel' AS funnel, variant, count(*) AS exposures
FROM experiment_exposures
WHERE experiment_key = 'v1_bump_copy_2026'
GROUP BY 1, 2
ORDER BY 1, 2;
-- Expect v1-palm and v1-tarot rows, each splitting roughly 50/50.

-- ⛔ THE ONE THAT MATTERS: both arms must be OFFERED the bump. If arm A shows
--    zero offered, its payload lost "bump": true and the test is measuring
--    bump-vs-no-bump again instead of copy-vs-copy.
SELECT e.variant,
       count(*)                                       AS exposed,
       count(*) FILTER (WHERE c.bump_offered)         AS offered,
       count(*) FILTER (WHERE c.bump_purchased)       AS took_it,
       round(100.0 * count(*) FILTER (WHERE c.bump_purchased)
             / NULLIF(count(*) FILTER (WHERE c.bump_offered), 0), 1) AS take_rate_pct
FROM experiment_exposures e
JOIN conversations c ON lower(trim(c.email)) = e.subject
WHERE e.experiment_key = 'v1_bump_copy_2026'
GROUP BY 1
ORDER BY 1;
-- Both arms must have offered > 0. take_rate_pct is the decision metric.

-- Sanity: arm B's Stripe line must read "+ Double-Strength Clearing - PALM/TAROT"
-- and carry NO topic. Check one real bump order in the Stripe dashboard before
-- letting this run unattended — the line item is customer-facing and on receipts.


-- ============================================================================
-- 🔙 KILL SWITCH — two of them, in order of preference:
--
--    1. UNSET V1_BUMP_EXPERIMENT_KEY and restart. Reverts to the old test, so
--       the bump keeps running on today's copy. Nothing is lost.
--    2. Set status → 'paused' in /admin/experiments. Reverts everyone to NO
--       bump within ≤30s — this stops the copy test AND the bump revenue.
--
-- 🔴 Do NOT kill with 'done' + a winner. A concluded test with a declared winner
--    KEEPS APPLYING that winner's payload — declaring B would ship the ritual
--    copy to 100% of traffic, which is how you SHIP it, not how you stop it.
--
-- 🔙 FULL REMOVAL (only while still draft / never started):
--    DELETE FROM experiments WHERE key = 'v1_bump_copy_2026' AND status = 'draft';
-- ============================================================================
