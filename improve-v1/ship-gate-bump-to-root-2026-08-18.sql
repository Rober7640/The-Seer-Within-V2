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
-- Expect 2 rows, both status='running', both scope.funnel = ["v1-palm","v1-tarot"].
-- For the gate row, eyeball `variants` for the arm carrying "gate": true — step 1
-- below finds that arm itself, but if its assertion raises, this is what you
-- come back to and read to see why.
SELECT key, status, winner_variant, scope, variants, started_at
FROM experiments
WHERE key IN ('v1_palm_commitment_gate_2026', 'v1_bump_copy_2026');

-- ── 1. THE COMMITMENT GATE ──────────────────────────────────────────────────
-- The winner is NOT hand-typed here. This row was never seeded from a file in
-- this repo — it was created by a transactional write replicating /start on
-- 2026-07-28 — so the repo cannot tell a human which arm key carries the gate.
-- Rather than ask an operator to read it off a screen and retype it (one typo
-- and the WRONG payload ships to root, palm and tarot at once, silently), the
-- UPDATE below DERIVES winner_variant: it is, by definition, whichever arm in
-- this row's own `variants` has payload->>'gate' = 'true'. The DO block just
-- above it asserts exactly one such arm exists and raises loudly otherwise —
-- zero matches or more than one both abort the transaction before anything is
-- written.
BEGIN;

DO $$
DECLARE
  gate_arms text[];
BEGIN
  SELECT array_agg(arm->>'key' ORDER BY arm->>'key')
    INTO gate_arms
  FROM experiments, jsonb_array_elements(variants) AS arm
  WHERE key = 'v1_palm_commitment_gate_2026'
    AND arm->'payload'->>'gate' = 'true';

  IF gate_arms IS NULL OR array_length(gate_arms, 1) <> 1 THEN
    RAISE EXCEPTION
      'v1_palm_commitment_gate_2026: expected exactly 1 arm with payload.gate = '
      'true, found % (%). Refusing to guess — inspect variants (step 0) and fix '
      'the data before re-running.',
      COALESCE(array_length(gate_arms, 1), 0),
      COALESCE(array_to_string(gate_arms, ', '), 'none');
  END IF;
END $$;

-- jsonb_set on a NULL scope returns NULL (it is strict), which would silently
-- turn this row global instead of three-funnel-scoped — coalesce guards that.
-- The WHERE clause ties this to the exact state step 0 should have shown: still
-- running, still scoped to exactly the two funnels the tarot extension set. If
-- that has changed (already applied, or something else moved it), 0 rows update
-- and nothing is written — that is the idempotency signal, not a bug.
UPDATE experiments
SET scope          = jsonb_set(coalesce(scope, '{}'::jsonb), '{funnel}',
                                '["v1-palm","v1-tarot","v1-root"]'::jsonb, true),
    status         = 'done',
    winner_variant = (
      SELECT arm->>'key' FROM jsonb_array_elements(variants) AS arm
      WHERE arm->'payload'->>'gate' = 'true'
    ),
    ended_at       = COALESCE(ended_at, now()),
    updated_at     = now()
WHERE key    = 'v1_palm_commitment_gate_2026'
  AND status = 'running'
  AND scope->'funnel' = '["v1-palm","v1-tarot"]'::jsonb;

-- ⛔ STOP AND READ: this must report exactly 1 row — status done, winner_variant
--    equal to the arm you saw carrying "gate": true in step 0, scope.funnel with
--    three entries ending in v1-root.
--    0 rows  = a guard failed (already applied? status wasn't running? scope
--              wasn't the expected two-funnel array?) → ROLLBACK and re-run
--              step 0 to see why. Do NOT relax the guards or hand-type a winner.
--    >1 rows = impossible (key is unique) → ROLLBACK immediately.
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
--
-- Unlike the gate row, 'B' is NOT derived here — it can't be: both arms carry
-- payload.bump = true, so "the arm with the treatment payload" does not pick
-- out a unique winner the way it does for the gate. 'B' is a documented value
-- (improve-v1/create-bump-copy-experiment-2026-08-11.sql:98, where arm B is
-- defined), not a guess. The DO block below still asserts an arm literally
-- keyed 'B' exists in THIS row's variants before the UPDATE sets it, so a
-- typo'd key or a row that drifted still fails loudly instead of writing.
BEGIN;

DO $$
DECLARE
  arm_b_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM experiments, jsonb_array_elements(variants) AS arm
    WHERE key = 'v1_bump_copy_2026' AND arm->>'key' = 'B'
  ) INTO arm_b_exists;

  IF NOT arm_b_exists THEN
    RAISE EXCEPTION
      'v1_bump_copy_2026: no arm keyed ''B'' found in variants. winner_variant '
      '''B'' below is the documented winner from '
      'create-bump-copy-experiment-2026-08-11.sql:98 — refusing to set a winner '
      'key that does not exist in this row''s current variants.';
  END IF;
END $$;

UPDATE experiments
SET scope          = jsonb_set(coalesce(scope, '{}'::jsonb), '{funnel}',
                                '["v1-palm","v1-tarot","v1-root"]'::jsonb, true),
    status         = 'done',
    winner_variant = 'B',
    ended_at       = COALESCE(ended_at, now()),
    updated_at     = now()
WHERE key    = 'v1_bump_copy_2026'
  AND status = 'running'
  AND scope->'funnel' = '["v1-palm","v1-tarot"]'::jsonb;

-- ⛔ STOP AND READ: this must report exactly 1 row — status done, winner_variant
--    'B', scope.funnel with three entries ending in v1-root.
--    0 rows  = a guard failed (already applied? status wasn't running? scope
--              wasn't the expected two-funnel array?) → ROLLBACK and re-run
--              step 0 to see why. Do NOT relax the guards.
--    >1 rows = impossible (key is unique) → ROLLBACK immediately.
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
-- Two different things — do not conflate them.
--
-- (a) STOP THE PAYLOAD FROM APPLYING, right now, everywhere it is currently
--     scoped (root + palm + tarot together — there is no root-only stop, see
--     the 🔴 at the top). assign()'s 'done' branch only fires when
--     status='done' AND winner_variant is set (server/lib/experiments.ts:418);
--     clearing either one alone is enough to send every scoped funnel to
--     control. This does NOT touch `scope`, so it is a pure kill switch, not a
--     restore — re-running this file afterwards is still a no-op, because
--     status is no longer 'running'.
--
--       UPDATE experiments SET winner_variant = NULL, status = 'paused', updated_at = now()
--       WHERE key IN ('v1_palm_commitment_gate_2026', 'v1_bump_copy_2026');
--
-- (b) RESTORE the pre-ship state exactly (scope back to the two-funnel array,
--     status back to running, winner cleared). This is the one that un-does
--     what this file did — including for palm and tarot, which this file also
--     concluded. Only run it if you actually want their tests to resume; if you
--     only meant to stop root, use (a) instead.
--
--       BEGIN;
--       UPDATE experiments
--       SET scope          = jsonb_set(scope, '{funnel}', '["v1-palm","v1-tarot"]'::jsonb, true),
--           status         = 'running',
--           winner_variant = NULL,
--           ended_at       = NULL,
--           updated_at     = now()
--       WHERE key    IN ('v1_palm_commitment_gate_2026', 'v1_bump_copy_2026')
--         AND status = 'done';
--       -- Expect 2 rows, each scope.funnel back to the two-funnel array.
--       SELECT key, status, winner_variant, scope->'funnel' AS funnels
--       FROM experiments WHERE key IN ('v1_palm_commitment_gate_2026', 'v1_bump_copy_2026');
--       COMMIT;
