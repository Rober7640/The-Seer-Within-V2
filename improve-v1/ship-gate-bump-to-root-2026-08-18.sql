-- ============================================================================
-- SHIP the commitment gate + order bump to ROOT V1
-- 2026-08-18 · spec: docs/superpowers/specs/2026-08-18-root-gate-bump-port-design.md
--
-- WHAT THIS DOES. For each of the two rows: widens scope.funnel to include the
-- new 'v1-root' sentinel, then marks the test `done` with its winning arm.
-- assign()'s status='done' branch (server/lib/experiments.ts:397) applies that
-- winner's payload to EVERYONE in scope with enrolled:false — so root gets the
-- treatment permanently and no new exposures accumulate anywhere.
--
-- 🔴 DEPLOY THE CODE FIRST. Without experimentFunnel() in the four resolvers,
--    root still resolves as `undefined` and this scope entry matches nothing.
--
-- 🔴 RUN IT TWICE — once on DEV, once on PROD. The two databases were separated
--    on 2026-08-05.
--
-- 🔴 THIS ENDS BOTH TESTS FOR PALM AND TAROT TOO. Marking a row `done` stops
--    enrolment everywhere, not only on root. Step 0 exists so you see the live
--    status before you decide. If either row is still `running` and you are not
--    ready to call it, STOP and run only the half you are ready for.
--
-- WHY RAW SQL AND NOT THE ADMIN UI: PATCH /api/admin/experiments/:key refuses a
-- scope edit on a non-draft row (the assignment freeze,
-- server/routes/admin/experiments.ts). That guard is correct in general — scope
-- changes usually re-partition enrolled subjects. It does not here: the bucket is
-- sha256(subject_id + key) % 100 and does not read `scope` at all, so no enrolled
-- palm or tarot subject is re-bucketed or moved between arms. Same deliberate
-- override as improve-v1/extend-gate-to-tarot-2026-07-31.sql.
-- ============================================================================

-- ── 0. PRE-FLIGHT. Run alone first and READ IT. ─────────────────────────────
-- Expect 2 rows. Note each one's `status` and, for the gate, which variant key
-- carries "gate": true — that key is what step 2 sets as the winner.
SELECT key, status, winner_variant, scope, variants, started_at
FROM experiments
WHERE key IN ('v1_palm_commitment_gate_2026', 'v1_bump_copy_2026');

-- ── 1. THE COMMITMENT GATE ──────────────────────────────────────────────────
-- 🔴 Replace 'B' below with the arm key whose payload is {"gate": true}, read
--    from step 0. This row was never seeded from a file in this repo — it was
--    created by a transactional write replicating /start on 2026-07-28 — so the
--    repo cannot tell you the key. Do not guess.
BEGIN;

UPDATE experiments
SET scope = jsonb_set(scope, '{funnel}', '["v1-palm","v1-tarot","v1-root"]'::jsonb),
    status = 'done',
    winner_variant = 'B',           -- ← the {"gate": true} arm, from step 0
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
WHERE key = 'v1_palm_commitment_gate_2026';

-- Expect exactly 1 row, scope.funnel with three entries, status done.
SELECT key, status, winner_variant, scope->'funnel' AS funnels
FROM experiments WHERE key = 'v1_palm_commitment_gate_2026';

COMMIT;

-- ── 2. THE ORDER BUMP + ITS WINNING COPY ────────────────────────────────────
-- One row, not two. V1_BUMP_EXPERIMENT_KEY resolves to the default
-- 'v1_bump_copy_2026' (shared/orderBump.ts:312) and the env override is set on no
-- environment, so this is the row the resolver actually reads. BOTH its arms
-- carry payload.bump = true, so declaring B the winner hands root the bump AND
-- the winning "double-strength clearing" copy in one move. B won on 2026-08-16:
-- take-rate 37.8% -> 54.5%, p=0.034.
BEGIN;

UPDATE experiments
SET scope = jsonb_set(scope, '{funnel}', '["v1-palm","v1-tarot","v1-root"]'::jsonb),
    status = 'done',
    winner_variant = 'B',
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
WHERE key = 'v1_bump_copy_2026';

SELECT key, status, winner_variant, scope->'funnel' AS funnels
FROM experiments WHERE key = 'v1_bump_copy_2026';

COMMIT;

-- ── 3. POST-FLIGHT, after the first real root lead ──────────────────────────
-- Root exposures stop accumulating (status done ⇒ enrolled:false), so the check
-- is on the CONVERSATION side: a root buyer with a bump line.
SELECT id, email, funnel, bump_offered, bump_purchased, bump_amount_cents, created_at
FROM conversations
WHERE funnel IS NULL AND bump_offered = true
ORDER BY created_at DESC
LIMIT 20;

-- ── 4. ROLLBACK ─────────────────────────────────────────────────────────────
-- Clearing the winner is enough: assign() then falls through to the normal
-- status check, and a non-running test yields control for everyone.
--
-- UPDATE experiments SET winner_variant = NULL, status = 'paused', updated_at = now()
-- WHERE key IN ('v1_palm_commitment_gate_2026', 'v1_bump_copy_2026');
