-- ============================================================================
-- CREATE the V1 CLOSE-DEPTH experiment — today's 8-message close vs 26
-- 2026-08-16 · Build spec: docs/superpowers/specs/2026-08-16-v1-close-depth-2026.md
--
--   key            v1_close_depth_2026
--   variants       A w50 (CONTROL, {}) / B w50 ({"close":"deep"})
--   subject_type   email     ← the hashed email, like the gate and the order bump
--   scope          funnel ["v1-tarot"] + freezeAssignment
--   conversion     v1_main_funnel, windowDays 7, targetN 7200
--   status         DRAFT  ← inert. Nobody is enrolled, every woman gets today's close.
--
-- WHAT ARM B CHANGES. Only the chat bubbles at the pitch. Five blocks the close
-- has never had: mechanism (why naming a pattern loosens it), a longer ritual, a
-- page-by-page deliverable, a plain price justification, one line of small
-- believable proof, and the two objections she actually raises. 8 messages / 132
-- words → 26 messages / 448 words. No price, line item, CTA or server prompt
-- moves, which is why this can be resolved for returning visitors too.
--
-- WHY. 47–52% of non-buyers stop at PITCH — 2,942 women a month reach the offer
-- and never click, the single biggest in-funnel leak, worth ~$8,117/30d at 25%
-- recovery.
--
-- 🔴 IT IS A HYPOTHESIS, NOT A PROVEN FIX. Buyers and non-buyers show the SAME
--    80:20 reading-to-offer ratio today. The data says the offer is thin and the
--    leak sits where a thin offer would hurt. It does not say a thicker close
--    converts better — a longer close may equally tire her.
--
-- 🔴 RUN ON DEV FIRST, THEN PROD. The databases were separated on 2026-08-05, so
--    this row must be created twice. A "0 rows" surprise usually means the wrong DB.
--
-- 🔴 ORDER OF OPERATIONS:
--      1. deploy the code   (inert without this row — resolveV1CloseDepth returns
--                            deep:false for everyone, so the close is byte-identical)
--      2. this file         (creates the DRAFT — still inert)
--      3. re-check targetN against the live baseline on the day it starts, then
--         press Start in /admin/experiments
--
-- WHY A IS variants[0]. The control arm must be first: pickVariant walks the list
-- in listed order, so ramping the treatment UP only ever moves subjects
-- control→treatment. A is also what runs today, which is what makes the draft
-- state byte-identical to production.
--
-- WHY subject_type = 'email'. Same as the commitment gate and the order bump: the
-- arm is decided at lead capture, after the email exists, and bucketing on its hash
-- re-splits RETURNING visitors across both arms instead of parking them all in
-- control (they are a small share of sessions but a large share of buys). The
-- exposure's conversationId is what tallyV1Main joins on to reach the purchase.
--
-- WHY freezeAssignment = true. Buckets are permanently sticky but the
-- bucket→variant MAP moves with the weights, so without this pin a re-weight would
-- reassign women who had already read the other close. resolveV1CloseDepth passes
-- hashEmail(email) as the subject precisely so this freeze can find the exposure
-- row — every other email-keyed V1 test passes the raw address and would miss.
--
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can
-- only ever host ONE run. Never reuse a concluded key.
-- ============================================================================

-- ── 0. PRE-FLIGHT ───────────────────────────────────────────────────────────
-- Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status, scope, variants, started_at
FROM experiments
WHERE key = 'v1_close_depth_2026';

-- Nothing running may own the price or objection beats. Expect the four V1 tests
-- you already know about and no second close-copy test.
SELECT key, status, scope->'funnel' AS funnel
FROM experiments
WHERE status = 'running'
ORDER BY key;


-- ── 1. CREATE THE DRAFT — inert until it is started. ────────────────────────
BEGIN;

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_close_depth_2026',
  'Close depth — 8-message close vs 26',
  'Chat COPY only, at the pitch. A = today''s close (8 messages, 132 words). '
  'B = the same offer with the five blocks the close has never had: mechanism, a '
  'longer ritual, a page-by-page deliverable, a plain price justification, one '
  'line of small believable proof, and the two objections non-buyers actually '
  'raise (money 23-32%, "let me think" 3-8%) — 26 messages, 448 words. No price, '
  'line item, CTA or prompt changes on either arm. Assigned at lead capture on '
  'the hashed email, so returning visitors are re-split across both arms. '
  'fb-tarot only: root V1 is ~10 pitch-arrivals/day at 4.4% against tarot''s ~180 '
  'at 9.6%, so including it would add ~5% sample while mixing two baselines. '
  'Preview arm B without enrolling: append ?close_depth=deep to any /fb-tarot '
  'chat URL. To start, set status=running.',
  'draft',
  'email',
  -- 🔴 A FIRST. variants[0] is the control arm.
  --
  -- 50/50, set once and held. An uneven split bets that one arm is better before
  -- there is evidence, and power is maximised at equal arms (queue doc, rule 2).
  '[
     {"key": "A", "weight": 50, "payload": {}},
     {"key": "B", "weight": 50, "payload": {"close": "deep"}}
   ]'::jsonb,
  -- ARRAY form even for one funnel: matchesFunnelScope accepts both, and the array
  -- is what a second funnel would be appended to without changing the SHAPE of
  -- scope (frozen once a test starts).
  --
  -- No scope.landers: this runs across all 13 live tarot landers, unlike
  -- v1_tarot_version_bc_2026 which is pinned to four ad URLs. The per-lander
  -- breakdown still arrives free — the exposure records deck/hook/facing/angle.
  '{
     "funnel": ["v1-tarot"],
     "freezeAssignment": true
   }'::jsonb,
  -- targetN = the pre-registered per-arm EXPOSURE count. It gates the verdict and
  -- the declare-winner button (fixed horizon, no peeking).
  --
  -- 7200 is SIZED FROM LIVE TRAFFIC (read-only, 2026-08-16, plan-live.mjs --size
  -- --effect 30 --metric pitch-paid):
  --   baseline pitch→paid, fb-tarot, last 7d = 123/1258 = 9.8%
  --   +30% relative (9.8% → 12.7%), 80% power, alpha 0.05
  --   → 1,821 per arm AT THE PITCH · 3,642 total
  --   → the pitch is 50.6% of leads, so 7,200 exposures ≈ 21 days at 355 leads/day
  --
  -- 🔴 A +20% EFFECT WILL NOT BE VISIBLE. It needs 15,600 exposures (~44 days);
  --    +15% needs 27,200 (~77 days). This test can only see a large effect. Say so
  --    before starting it, not in week six.
  --
  -- 🔴 RE-CHECK ON THE DAY IT STARTS. This number moved 6,800 → 7,300 → 7,200 in
  --    two days as traffic shifted. Freely editable while draft; FROZEN at start.
  '{"type": "v1_main_funnel", "windowDays": 7, "targetN": 7200}'::jsonb
);

-- ⛔ Must report exactly 1 row. Anything else → ROLLBACK.

SELECT key, status, subject_type, variants, scope, conversion
FROM experiments
WHERE key = 'v1_close_depth_2026';
-- Expect status=draft, subject_type=email, A w50 FIRST then B w50,
-- scope.funnel=["v1-tarot"], scope.freezeAssignment=true, targetN=7200.

-- Nothing may be enrolled yet — expect 0.
SELECT count(*) AS exposures_should_be_zero
FROM experiment_exposures
WHERE experiment_key = 'v1_close_depth_2026';

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. START IT — do this in /admin/experiments, NOT here. ──────────────────
-- The admin /start endpoint runs guards this file cannot (>=2 arms with positive
-- weight, conversion type <-> key, the scope.funnel requirement) and stamps
-- started_at, which is the cohort anchor every tally reads.
--
-- 🔴 Anchor the reporting window to started_at, never to "all time".
--
-- 🔴 TWO LOOKS, PRE-REGISTERED — at 3,600 and 7,200 exposures. No others. Every
--    extra peek inflates the false-positive rate (1 look 5%, 4 looks 13%, 10 looks
--    19%). `diagnose-live.mjs --live --tally` numbers each look and records it.
--
-- 🔴 STOP EARLY IF: upsell-1 take drops >20% relative in arm B. A longer close
--    must not buy the front end at the back end's cost.


-- ── 3. POST-START CHECK — within ~30s of real traffic (CACHE_TTL_MS). ───────
SELECT variant, count(*) AS leads
FROM experiment_exposures
WHERE experiment_key = 'v1_close_depth_2026'
GROUP BY variant
ORDER BY variant;
-- Expect ~50/50 across A and B, and NOTHING before started_at.

-- Funnel scope doing its job: every row must be v1-tarot. A palm or root row means
-- the scope is not holding — stop the test before reading any numbers.
SELECT context->>'funnel' AS funnel, count(*)
FROM experiment_exposures
WHERE experiment_key = 'v1_close_depth_2026'
GROUP BY 1;

-- The join that makes the results work: every exposure must carry a conversationId,
-- or the tally shows leads against zero buyers in both arms — a failure that reads
-- exactly like "neither close converts".
SELECT count(*) FILTER (WHERE context->>'conversationId' IS NULL) AS missing_conversation_id,
       count(*)                                                    AS total
FROM experiment_exposures
WHERE experiment_key = 'v1_close_depth_2026';

-- End-to-end: exposures matched to purchases, per arm. The results page's pooled
-- row computed by hand — if the two disagree, trust neither until resolved.
SELECT e.variant,
       count(*)                                        AS leads,
       count(*) FILTER (WHERE p.purchases > 0)         AS buyers,
       COALESCE(sum(p.revenue), 0)                     AS revenue_cents
FROM experiment_exposures e
LEFT JOIN LATERAL (
  SELECT count(*) AS purchases,
         COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents, 0)), 0) AS revenue
  FROM conversations c
  WHERE c.id = e.context->>'conversationId'
    AND c.main_paid_at IS NOT NULL
    AND c.main_paid_at >= e.created_at
) p ON true
WHERE e.experiment_key = 'v1_close_depth_2026'
GROUP BY e.variant
ORDER BY e.variant;


-- ============================================================================
-- 🔙 KILL SWITCH — set status → 'paused' in /admin/experiments.
--    Reverts every woman to today's close within <=30s. Already-collected
--    exposures stay (they are real).
--
-- 🔴 Do NOT kill with 'done' + a winner. A concluded test with a declared winner
--    KEEPS APPLYING that winner's payload (assign(), status='done' branch), so
--    declaring B would ship the deep close to 100% of fb-tarot — which is how you
--    SHIP it, not how you stop it.
--
-- 🔴 IF B WINS AND SHIPS FUNNEL-WIDE, one proof line breaks off the love bucket
--    (root is only 45% love): "Not reaching for the phone." → "A morning that
--    starts without the same weight on it." See the spec's §8.
--
-- 🔙 FULL REMOVAL (only while still draft / never started):
--    DELETE FROM experiments WHERE key = 'v1_close_depth_2026' AND status = 'draft';
-- ============================================================================
