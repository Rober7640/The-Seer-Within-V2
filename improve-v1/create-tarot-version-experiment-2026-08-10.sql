-- ============================================================================
-- CREATE the /fb-tarot VERSION experiment — B (smart template) vs C (LLM)
-- 2026-08-10 · Lewis: "version c - 70% / version B - 30%", C is control, B is the
-- variation, on the four clean ad URLs only. Face-up (&deck=) URLs excluded.
--
--   key            v1_tarot_version_bc_2026
--   variants       C w70 (CONTROL, {"version":"c"}) / B w30 ({"version":"b"})
--   subject_type   visitor   ← the ab_vid cookie, NOT a hashed email
--   scope          funnel v1-tarot + 4 (hook, deck) landers + freezeAssignment
--   conversion     v1_main_funnel, windowDays 7, targetN ← SET BEFORE STARTING
--   status         DRAFT  ← inert. Nobody is enrolled, every visitor gets C.
--
-- 🔴 RUN ON DEV FIRST, THEN PROD. The databases were separated on 2026-08-05, so
--    this row must be created twice. A "0 rows" surprise usually means the wrong DB.
--
-- 🔴 ORDER OF OPERATIONS:
--      1. add-ab-visitor-id-2026-08-10.sql   (the column the tally joins on)
--      2. deploy the code
--      3. this file                          (creates the DRAFT — still inert)
--      4. set targetN, then press Start in /admin/experiments
--    The code is inert without this row: resolveTarotVersion() returns whatever
--    version the URL named, which is exactly today's funnel.
--
-- WHY C IS variants[0]. The control arm must be first: pickVariant walks the list
-- in order, and ramping a treatment UP then only ever moves subjects control→
-- treatment. C is also the incumbent — every tarot lander since `reunion` ships
-- Version C only — so "control" and "what runs today" agree, which is what makes
-- the draft state byte-identical to production.
--
-- WHY subject_type = 'visitor' (this test differs from every other V1 test).
-- The price test, the commitment gate and the order bump all bucket on the hashed
-- EMAIL at lead capture. This one cannot: it decides the FIRST message of the chat,
-- so it must be assigned before an email exists. It buckets on the anonymous ab_vid
-- cookie, and conversations.ab_visitor_id carries that id to the purchase.
-- Consequence: its denominator is CHATS STARTED, not leads, so its conversion rate
-- is lower by construction and is NOT comparable to the other three tests.
-- (Chat arrival rather than lander view is also the tighter measurement: the lander
-- is identical in both arms, so a lander-view denominator would only add noise.)
--
-- WHY freezeAssignment = true. Weights are meant to be edited from the dashboard
-- here. Buckets are permanently sticky but the bucket→variant MAP moves with the
-- weights, so without this pin a re-weight would reassign visitors who had already
-- seen the other arm. The admin PATCH refuses a live weight edit unless it is set.
--
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can
-- only ever host ONE run. Never reuse a concluded key.
-- ============================================================================

-- ── 0. PRE-FLIGHT ───────────────────────────────────────────────────────────
-- Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status, scope, variants, started_at
FROM experiments
WHERE key = 'v1_tarot_version_bc_2026';

-- The column migration must have landed first, or the results page will error.
-- Expect exactly 1 row.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name = 'ab_visitor_id';


-- ── 1. CREATE THE DRAFT — inert until step 3. ───────────────────────────────
BEGIN;

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_tarot_version_bc_2026',
  'fb-tarot Version B (smart template) vs C (LLM)',
  'Which opener /fb-tarot serves. Version C (control, incumbent) shows the card '
  'line plus one open question and reads her answer with Claude. Version B '
  'delivers the full pre-written read as chat messages and goes straight to name '
  'capture, with no model call. Assigned at the lander on the ab_vid cookie, so '
  'the denominator is landers rather than leads. Four clean ad URLs only.',
  'draft',
  'visitor',
  -- 🔴 C FIRST. variants[0] is the control arm.
  '[
     {"key": "C", "weight": 70, "payload": {"version": "c"}},
     {"key": "B", "weight": 30, "payload": {"version": "b"}}
   ]'::jsonb,
  -- funnel scope is belt-and-braces: the landers list already restricts this to
  -- /fb-tarot, but resolveTarotVersion is the only caller and it always passes
  -- funnel='v1-tarot', so an accidental future caller on another funnel cannot
  -- enrol either.
  --
  -- 🔴 LANDERS ARE (hook, deck) PAIRS, NOT BARE HOOKS. cards-return and
  --    cards-who-he-is EACH run on a second live ad URL (&deck=arcana-mfh) showing
  --    FACE-UP cards. Those are different landers and the operator excluded them
  --    (2026-08-10: "for now, we can ignore face up cards"). A bare hook list would
  --    have silently enrolled them. 'return-mhf' is DEFAULT_DECK — what a clean URL
  --    with no &deck= actually serves.
  --
  -- To add a lander later: /admin/experiments → edit → paste the ad URL into the
  -- "ad URLs" box → save. Appending is allowed on a running test; removing is not.
  '{
     "funnel": "v1-tarot",
     "freezeAssignment": true,
     "landers": [
       {"hook": "cards-will-commit", "deck": "return-mhf"},
       {"hook": "cards-return",      "deck": "return-mhf"},
       {"hook": "cards-who-he-is",   "deck": "return-mhf"},
       {"hook": "cards-feels",       "deck": "return-mhf"}
     ]
   }'::jsonb,
  -- targetN = the pre-registered per-arm exposure count. It gates the verdict and the
  -- declare-winner button (fixed horizon, no peeking). The SMALLER arm governs, and
  -- here that is B at 30% — so B reaching N is the real horizon.
  --
  -- 11,000 is SIZED FROM REAL PRODUCTION TRAFFIC (read-only query, 2026-08-10):
  --   baseline lead→purchase on these 4 hooks = 264 buyers / 5,376 leads = 4.91%
  --   80% power, alpha 0.05, adjusted for the 70/30 imbalance
  --   → 5,533 B-arm LEADS to detect a 20% relative lift (4.91% → 5.89%)
  --   → at a ~50% chat→email capture rate, ≈11,000 B-arm CHATS
  --   → ≈3 weeks at the recent ~900–1,200 leads/day across the four hooks
  --
  -- ⚠️ The CHAT figure depends on the chat→email capture rate, which lives in
  -- PostHog, not here. The CALENDAR estimate does not: targetN and the arrival rate
  -- both scale by that same rate, so "about three weeks" holds either way. Only the
  -- number in this field moves.
  --
  -- 🔴 DO NOT carry over the 1200 the gate and the order bump used. Those count
  -- LEADS; this counts CHATS, which arrive more often and convert less. 1200 would
  -- unlock the verdict after roughly two days of B traffic, when the test can only
  -- see a ~45% swing — a coin flip dressed as a result.
  --
  -- Freely editable while draft; FROZEN the moment the test starts.
  '{"type": "v1_main_funnel", "windowDays": 7, "targetN": 11000}'::jsonb
);

-- ⛔ Must report exactly 1 row. Anything else → ROLLBACK.

SELECT key, status, subject_type, variants, scope, conversion
FROM experiments
WHERE key = 'v1_tarot_version_bc_2026';
-- Expect status=draft, subject_type=visitor, C w70 FIRST then B w30,
-- scope.freezeAssignment=true, and exactly 4 landers all on deck return-mhf.

-- Nothing may be enrolled yet — expect 0.
SELECT count(*) AS exposures_should_be_zero
FROM experiment_exposures
WHERE experiment_key = 'v1_tarot_version_bc_2026';

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. SIZE THE TEST — run BEFORE starting, then set targetN. ───────────────
-- Baseline: how many /fb-tarot main purchases these four hooks actually produce.
-- This is the number that decides how long the test has to run; guessing it is how
-- a test gets called on noise.
SELECT count(*)                                   AS conversations,
       count(*) FILTER (WHERE main_paid_at IS NOT NULL) AS buyers,
       round(100.0 * count(*) FILTER (WHERE main_paid_at IS NOT NULL)
             / NULLIF(count(*), 0), 2)            AS cr_pct
FROM conversations
WHERE created_at >= now() - interval '30 days';
-- Then: per-arm N for a two-proportion test at 80% power / alpha 0.05 is roughly
--   n = 16 * p * (1 - p) / (delta ^ 2)
-- with p = the baseline rate above and delta = the smallest lift worth shipping.
-- Put THAT number in conversion.targetN (UPDATE ... WHERE status = 'draft').
--
-- ⚠️ Remember the 30/70 split: arm B accrues at 3/7 the rate of arm C, so the
--    calendar time to reach N is driven entirely by B.


-- ── 3. START IT — do this in /admin/experiments, NOT here. ──────────────────
-- The admin /start endpoint runs guards this file cannot (>=2 arms with positive
-- weight, conversion type <-> key, the scope.funnel requirement) and stamps
-- started_at, which is the cohort anchor every tally reads.
--
-- 🔴 Anchor the reporting window to started_at, never to "all time".
--
-- WHAT STAYS EDITABLE AFTER START (deliberately, this test only):
--    · variant WEIGHTS — because scope.freezeAssignment is set
--    · scope.landers   — APPEND only
-- Everything else (arm keys, order, payloads, conversion, funnel) is frozen and
-- needs a new key.


-- ── 4. POST-START CHECK — within ~30s of real traffic (CACHE_TTL_MS). ───────
SELECT context->>'hook' AS hook, context->>'deck' AS deck, variant, count(*) AS chats_started
FROM experiment_exposures
WHERE experiment_key = 'v1_tarot_version_bc_2026'
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
-- Expect ONLY the four scoped hooks, all deck=return-mhf, splitting ~70 C / 30 B.
-- 🔴 A row with deck=arcana-mfh means the lander scope is not doing its job — stop
--    the test and check scope.landers before reading any numbers.

-- The join that makes the results work. Once buys exist this must be non-zero, or
-- the tally will show landers but no buyers and read as "both arms converted 0%".
SELECT count(*) AS conversations_with_visitor_id
FROM conversations
WHERE ab_visitor_id IS NOT NULL;

-- End-to-end: exposures matched to purchases, per arm. This is the results page's
-- pooled row computed by hand — if the two disagree, trust neither until resolved.
SELECT e.variant,
       count(*)                                        AS chats_started,
       count(*) FILTER (WHERE p.purchases > 0)         AS buyers,
       COALESCE(sum(p.revenue), 0)                     AS revenue_cents
FROM experiment_exposures e
LEFT JOIN LATERAL (
  SELECT count(*) AS purchases,
         COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents, 0)), 0) AS revenue
  FROM conversations c
  WHERE c.ab_visitor_id = e.subject_id
    AND c.main_paid_at IS NOT NULL
    AND c.main_paid_at >= e.created_at
) p ON true
WHERE e.experiment_key = 'v1_tarot_version_bc_2026'
GROUP BY e.variant
ORDER BY e.variant;


-- ============================================================================
-- 🔙 KILL SWITCH — set status → 'paused' in /admin/experiments.
--    Reverts every visitor to Version C within <=30s. Already-collected exposures
--    stay (they are real).
--
-- 🔴 Do NOT kill with 'done' + a winner. A concluded test with a declared winner
--    KEEPS APPLYING that winner's payload (assign(), status='done' branch), so
--    declaring B would ship Version B to 100% of the scoped landers — which is how
--    you SHIP it, not how you stop it.
--
-- 🔙 FULL REMOVAL (only while still draft / never started):
--    DELETE FROM experiments WHERE key = 'v1_tarot_version_bc_2026' AND status = 'draft';
-- ============================================================================
