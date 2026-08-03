-- ============================================================================
-- Extend the fb-palm COMMITMENT GATE experiment to the /fb-tarot funnel
-- 2026-07-31 · operator instruction (Joel): "extend the commitment gate test to
-- the Tarot funnel as well" — ONE pooled test, not a second key.
--
-- WHAT THIS DOES: widens scope.funnel on the ALREADY-RUNNING experiment from the
-- string 'v1-palm' to the array ['v1-palm','v1-tarot']. Nothing else changes.
--
--   key            v1_palm_commitment_gate_2026   UNCHANGED (renaming a key would
--                                                 reset the test — a second run
--                                                 under a new key drops every
--                                                 already-enrolled subject)
--   variants       A w70 / B w30                  UNCHANGED
--   conversion     v1_main_funnel, targetN 1200   UNCHANGED
--   status         running                        UNCHANGED
--   started_at     2026-07-28 08:17:49            UNCHANGED (palm cohort start)
--
-- WHY THIS IS SAFE FOR THE PALM DATA ALREADY COLLECTED:
--   The bucket is sha256(subject_id + key) % 100 — it does not read `scope` at
--   all. So no already-enrolled palm subject is re-bucketed or moved between
--   arms; palm exposures keep their arm, their timestamp and their conversion.
--   Widening scope only makes a NEW population eligible from this moment on.
--
-- WHAT IT DOES CHANGE (accepted by the operator, 2026-07-31):
--   The tested population changes mid-flight: palm-only from 07-28, palm+tarot
--   from today. Both arms receive the tarot traffic in the same 70/30 proportion
--   (email-hash bucketing is independent of funnel), so the A-vs-B COMPARISON —
--   the decision number — stays unbiased. What shifts is the pooled baseline
--   conversion rate, because it now blends two funnels.
--
-- 🔴 WHY THIS IS RAW SQL AND NOT THE ADMIN UI:
--   PATCH /api/admin/experiments/:key refuses it — the ASSIGNMENT FREEZE
--   (server/routes/admin/experiments.ts, "cannot change scope once a test has
--   started") 409s any scope edit on a non-draft row and tells you to create a
--   new experiment. That guard is correct in general: scope changes usually DO
--   re-partition enrolled subjects. It does not here, for the reason above, so
--   this is a deliberate one-off override — the same pattern used to start this
--   experiment on 2026-07-28 (a transactional write replicating /start).
--
-- REQUIRES the code change that teaches assign() an array scope
-- (matchesFunnelScope, server/lib/experiments.ts). Run this BEFORE that code is
-- live and the old single-string check `context.funnel !== scope.funnel` compares
-- a string to an array, never matches, and the gate silently STOPS enrolling
-- fb-palm too — i.e. it would pause the live test. DEPLOY THE CODE FIRST.
-- ============================================================================

-- ── 0. PRE-FLIGHT — snapshot. Run alone first and eyeball the output. ────────
-- Expect exactly 1 row: status=running, scope {"funnel": "v1-palm"},
-- started_at 2026-07-28 08:17:49.
SELECT key, status, scope, conversion, variants, started_at, updated_at
FROM experiments
WHERE key = 'v1_palm_commitment_gate_2026';

-- Exposure counts before the change, so the after-check can prove nothing moved.
SELECT variant, count(*) AS exposures
FROM experiment_exposures
WHERE experiment_key = 'v1_palm_commitment_gate_2026'
GROUP BY variant
ORDER BY variant;


-- ── 1. THE CHANGE — transactional, guarded, idempotent. ─────────────────────
BEGIN;

-- jsonb_set (not a wholesale replace) so any other key in `scope` survives.
-- The WHERE clause is the guard: it only fires on the running row that still
-- carries the OLD value, so re-running this is a no-op rather than a surprise.
UPDATE experiments
SET scope      = jsonb_set(coalesce(scope, '{}'::jsonb), '{funnel}',
                           '["v1-palm","v1-tarot"]'::jsonb, true),
    updated_at = now()
WHERE key      = 'v1_palm_commitment_gate_2026'
  AND status   = 'running'
  AND scope->>'funnel' = 'v1-palm';

-- ⛔ STOP AND READ: this must report exactly 1 row.
--    0 rows  = a guard failed (already applied? status not running?) → ROLLBACK
--              and re-run step 0 to see why. Do NOT relax the guards.
--    >1 rows = impossible (key is unique) → ROLLBACK immediately.

-- Verify the new value before committing.
SELECT key, status, scope, started_at
FROM experiments
WHERE key = 'v1_palm_commitment_gate_2026';
-- Expect scope = {"funnel": ["v1-palm", "v1-tarot"]}

-- Verify NO other experiment row was touched (expect 0).
SELECT count(*) AS other_rows_updated_just_now
FROM experiments
WHERE key <> 'v1_palm_commitment_gate_2026'
  AND updated_at > now() - interval '1 minute';

-- Verify no exposure row moved (expect the same counts as step 0).
SELECT variant, count(*) AS exposures
FROM experiment_exposures
WHERE experiment_key = 'v1_palm_commitment_gate_2026'
GROUP BY variant
ORDER BY variant;

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. POST-DEPLOY CHECK — after ≤30s cache TTL (experiments.ts CACHE_TTL_MS) ─
-- Tarot exposures should start appearing within minutes of real tarot traffic.
-- `funnel` in the context is the new capture added alongside this change.
SELECT context->>'funnel' AS funnel, variant, count(*) AS exposures
FROM experiment_exposures
WHERE experiment_key = 'v1_palm_commitment_gate_2026'
GROUP BY 1, 2
ORDER BY 1, 2;
-- Expect: v1-palm rows (pre-existing, funnel NULL on rows written before this
-- change shipped) + NEW v1-tarot rows split roughly 70/30.


-- ============================================================================
-- 🔙 ROLLBACK — reverts tarot enrolment, leaves every exposure in place.
--    Palm keeps running exactly as before. Tarot subjects already enrolled stay
--    in the exposures table (they are real exposures and their conversions are
--    real); they simply stop being added to. Filter them out at analysis time
--    with context->>'funnel' = 'v1-palm' if you want the palm-only read back.
-- ============================================================================
-- BEGIN;
-- UPDATE experiments
-- SET scope      = jsonb_set(scope, '{funnel}', '"v1-palm"'::jsonb, true),
--     updated_at = now()
-- WHERE key = 'v1_palm_commitment_gate_2026';
-- SELECT key, status, scope FROM experiments WHERE key = 'v1_palm_commitment_gate_2026';
-- COMMIT;
--
-- 🔴 FULL KILL SWITCH (both funnels, reverts everyone to control in ≤30s):
--    set status → 'paused' in /admin/experiments.
--    Do NOT use 'done' + a winner — a concluded test with a declared winner KEEPS
--    applying that winner's payload (assign(), status==='done' branch).
-- ============================================================================
