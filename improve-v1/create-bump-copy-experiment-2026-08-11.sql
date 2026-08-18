-- ============================================================================
-- V1 ORDER BUMP — COPY TEST.  key: v1_bump_copy_2026
--
-- Spec: docs/superpowers/specs/2026-08-11-order-bump-copy-test.md
-- Rev:  2026-08-12 — verification queries corrected (they joined a column that
--       does not exist and would have errored; see the note in step 0).
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
--
-- 🔴 RUN THE NUMBERED BLOCKS ONE AT A TIME, NOT AS ONE PASTE. The Supabase SQL
--    editor only displays the LAST result set, so the verification SELECTs in a
--    single paste would be invisible — which is the whole point of running them.
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
-- Run this against the PRODUCTION database to get the real ratio before step 1.
--
-- 🔴 HOW THE EXPOSURE JOINS TO THE PURCHASE. NOT on the email:
--    experiment_exposures has no `subject` column, and its `subject_id` is
--    hashEmail() = a sha256 hex digest (server/lib/experiments.ts:817), so no
--    plaintext email will ever match it — a join on email either errors or
--    returns silently empty. The link is the conversation id stamped on the
--    exposure at lead capture (server/lib/priceVariant.ts:354), which is exactly
--    what the dashboard's own tallyV1Main joins on (experiments.ts:1002).
--
-- 🔴 AND WHY `main_paid_at >= e.created_at`. That is the dashboard's buyer
--    definition (V1_IN_TEST_PURCHASE, experiments.ts:945). Without the second
--    half it also counts people who had already paid BEFORE they were exposed,
--    which overstates the rate and therefore UNDER-sizes targetN. Pre-exposure
--    purchases + abandoned carts are the pair that reversed the original
--    order-bump read in 2026-08.

SELECT e.variant,
       count(*)                                                AS exposures_leads,
       count(*) FILTER (WHERE c.bump_offered)                  AS offered,
       count(*) FILTER (WHERE c.bump_offered
                          AND c.main_paid_at IS NOT NULL
                          AND c.main_paid_at >= e.created_at)  AS offered_and_paid,
       round(100.0 * count(*) FILTER (WHERE c.bump_offered
                          AND c.main_paid_at IS NOT NULL
                          AND c.main_paid_at >= e.created_at)
             / NULLIF(count(*), 0), 2)                         AS pct_leads_to_buyers
FROM experiment_exposures e
-- LEFT, not inner: an inner join silently drops exposures whose conversation row
-- is missing, which shrinks the denominator you are sizing on.
LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
WHERE e.experiment_key = 'v1_order_bump_2026'
GROUP BY 1
ORDER BY 1;
-- Take `pct_leads_to_buyers` from the BUMP arm (B) — arm A was never offered a
-- bump, so its rate answers a different question.
--     targetN = ceil(353 / (pct / 100))
-- e.g. 8% -> targetN 4413.   3% -> targetN 11767.   Put that number in step 1.


-- ── 1. CREATE THE DRAFT — inert until step 3. Run this block on its own. ─────
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
  --
  -- freezeAssignment: pins each subject to the arm on their FIRST logged exposure.
  -- Set here rather than left off (as v1_order_bump_2026 was) so the traffic split
  -- is editable from /admin/experiments while the test runs: the PATCH route 409s a
  -- weight change on a test that does not pin assignments, because the email bucket
  -- is sticky but the bucket→variant MAP is not — re-weighting an unpinned test moves
  -- visitors who have already seen the other arm. With the pin on, a weight change
  -- only affects NEW subjects, so Joel can rebalance without a deploy or a new key.
  -- It costs one extra DB read per assign() (i.e. per lead capture). Can be switched
  -- ON later from the dashboard, never off — but starting with it on avoids the
  -- window where the weight fields are locked.
  '{"funnel": ["v1-palm", "v1-tarot"], "freezeAssignment": true}'::jsonb,
  -- targetN 3400, from step 0 run against PRODUCTION on 2026-08-12.
  --
  -- THE DECISION METRIC IS THE OFFER-ACCEPTANCE RATE — step 6's take_rate_pct,
  -- accepted/offered. That is the only thing the wording can move; what happens
  -- afterwards on the Stripe page is identical in both arms (same price, same
  -- checkout), so both shed the same share of people and the comparison holds.
  --
  --   arm B: 384 of 3,656 leads reached the offer = 10.5%
  --   ~356 offered per arm for 30% -> 40% at 80% power / p<0.05
  --   ceil(356 / 0.105) = 3,391, rounded up to 3,400.
  --
  -- At the old test's rate (~822 leads/day across both arms) a 50/50 split puts
  -- ~411/day on each, so the gate unlocks in ROUGHLY 8 DAYS. Pre-registered: do
  -- not read the verdict before then.
  --
  -- ⚠️ BEFORE SHIPPING THE WINNER, CHECK THE MONEY TOO. bump_offered and
  --    bump_purchased are both stamped when the Stripe SESSION IS CREATED, not
  --    when payment lands, so take_rate_pct counts abandoned carts. That is fair
  --    between arms but it is not revenue. Cross-check the dashboard's revenue
  --    row (tallyV1Main counts only main_paid_at >= exposure, and adds
  --    bump_amount_cents). If B wins on taps but not on revenue, do NOT ship it —
  --    that means the copy earns a yes and then loses her at the payment page.
  --
  -- ⚠️ The slower, conservative alternative was targetN 8300: decide instead on
  --    "offered AND paid" (156/3,656 = 4.27% of leads, ~20 days). Rejected
  --    because three weeks on this funnel collects three weeks of unrelated
  --    lander/price changes. Switch BEFORE starting; this freezes on start.
  '{"type": "v1_main_funnel", "windowDays": 7, "targetN": 3400}'::jsonb
);

COMMIT;
-- (If anything above errors, the transaction is already aborted — just fix and
--  re-run. To undo a committed draft, see FULL REMOVAL at the bottom.)


-- ── 2. VERIFY THE DRAFT — run this block on its own, after the COMMIT. ──────
-- ⛔ READ THIS ROW BEFORE PRESSING START. Expect EXACTLY ONE row:
--      status         = draft
--      subject_type   = email
--      weights        = 50 / 50
--      BOTH payloads  carrying "bump": true   (if arm A lost it, the test is
--                     measuring bump-vs-no-bump again instead of copy-vs-copy)
--      conversion     = {"type":"v1_main_funnel","windowDays":7,"targetN":3400}
--
-- 🔴 targetN is the ONLY value here that can never be corrected later — it
--    freezes the moment the test starts. Check it reads 3400 (or 8300 if you
--    switched to the paid basis) and not a typo, because a wrong one means
--    abandoning this key and starting a new test.
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments
WHERE key = 'v1_bump_copy_2026';

-- Nothing may be enrolled yet — expect 0.
SELECT count(*) AS exposures_should_be_zero
FROM experiment_exposures
WHERE experiment_key = 'v1_bump_copy_2026';


-- ── 3. START IT — in /admin/experiments, NOT here. ──────────────────────────
-- The admin /start endpoint runs guards this file cannot, and stamps started_at,
-- which is the cohort anchor every tally reads.
--
-- 🔴 START IT **BEFORE** STEP 4. resolveV1Bump returns bump:false when a key
--    resolves to no RUNNING experiment. Deploying the code while this row is
--    still draft turns the bump off for every buyer.


-- ── 4. DEPLOY THE CODE. That is the whole cutover. ──────────────────────────
--
-- shared/orderBump.ts hardcodes V1_BUMP_EXPERIMENT_KEY_DEFAULT = the key above,
-- the same way v1_order_bump_2026 shipped. NO environment variable is set on any
-- environment. (V1_BUMP_EXPERIMENT_KEY still exists as a local/QA escape hatch;
-- it is not part of this procedure.)
--
-- 🔴 THE COMMIT IS NOT ON Production YET. `54fdcfa` sits on development /
--    rober/development only, so this deploy means merging development into
--    Production — which also carries everything else that has landed on
--    development (the twin-flame tarot landers, etc.). Check that diff before
--    merging; it is a bigger release than this one test.
--
-- 🔴 ORDER MATTERS, AND IT IS THE ONLY THING THAT MAKES THIS SAFE. Seed+start
--    (steps 1-3) FIRST, deploy SECOND. The row is inert until the code ships —
--    nothing reads the key before then — so there is no window either way round.
--    Deploy first and every checkout loses its bump until step 3 lands.
--
-- 🔴 EACH ENVIRONMENT NEEDS ITS OWN ROW. Development and Production are separate
--    databases now (they shared one until 2026-08), so seeding on dev does NOT
--    carry to prod. Steps 0-3 must be run again against the production DB.


-- ── 5. WHAT TO DO WITH THE OLD TEST ─────────────────────────────────────────
-- Once traffic is on the new key, v1_order_bump_2026 is collecting nothing. Do
-- NOT conclude it with a declared winner while it is still the live key —
-- assign()'s status='done' branch KEEPS APPLYING the winner's payload. After the
-- cutover it no longer matters which way it is closed.
--
-- ⚠️ Tidy it BEFORE the deploy if you want to tidy it from the dashboard at all:
--    V1_MAIN_FUNNEL_KEYS is built from the CURRENT bump key, so once the new code
--    ships, PATCHing the old row 400s ("conversion type 'v1_main_funnel' is only
--    supported for: ..."). Pause and declare-winner still work; edits do not.


-- ── 6. POST-CUTOVER CHECK — within ~30s of real traffic (CACHE_TTL_MS). ─────
SELECT context->>'funnel' AS funnel, variant, count(*) AS exposures
FROM experiment_exposures
WHERE experiment_key = 'v1_bump_copy_2026'
GROUP BY 1, 2
ORDER BY 1, 2;
-- Expect v1-palm and v1-tarot rows, each splitting roughly 50/50.

-- ⛔ THE ONE THAT MATTERS: both arms must be OFFERED the bump. If arm A shows
--    zero offered, its payload lost "bump": true and the test is measuring
--    bump-vs-no-bump again instead of copy-vs-copy.
--    Same join as step 0, and for the same reasons — conversationId, LEFT.
SELECT e.variant,
       count(*)                                       AS exposed,
       count(*) FILTER (WHERE c.bump_offered)         AS offered,
       count(*) FILTER (WHERE c.bump_purchased)       AS took_it,
       round(100.0 * count(*) FILTER (WHERE c.bump_purchased)
             / NULLIF(count(*) FILTER (WHERE c.bump_offered), 0), 1) AS take_rate_pct
FROM experiment_exposures e
LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
WHERE e.experiment_key = 'v1_bump_copy_2026'
GROUP BY 1
ORDER BY 1;
-- Both arms must have offered > 0. take_rate_pct is the decision metric.
-- Read it on the pooled row, at the pre-registered stopping point (100 total
-- bump purchases across both arms) — not on whichever lander looks best today.

-- Sanity: arm B's Stripe line must read "+ Double-Strength Clearing - PALM/TAROT"
-- and carry NO topic. Check one real bump order in the Stripe dashboard before
-- letting this run unattended — the line item is customer-facing and on receipts.
--
-- ⚠️ STILL OPEN AT CUTOVER: arm B sends metadata bumpProduct = 'double_reading'
--    (the value Mike's n8n exact-matches), so an arm-B buyer who was sold "a
--    deeper clearing, no second reading" is still sent the second-reading PDF.
--    Decide what arm B actually delivers before real traffic hits it.


-- ============================================================================
-- 🔙 KILL SWITCH — set arm B's WEIGHT to 0 in /admin/experiments.
--
--    Everyone then draws arm A, whose payload is {"bump": true} with no "copy"
--    key — i.e. today's shipped wording. The bump keeps earning, the variation
--    stops, no deploy and no DB surgery. Takes effect within ≤30s (CACHE_TTL_MS).
--    This works because scope.freezeAssignment is set: the PATCH route refuses a
--    weight edit on a test that does not pin assignments.
--
-- 🔴 Do NOT kill with 'paused'. A paused key resolves to no running experiment,
--    so resolveV1Bump returns bump:false and the order bump disappears from the
--    funnel entirely — that stops the bump revenue, not just the test. Pause is
--    the intuitive button and it is the wrong one here.
--
-- 🔴 Do NOT kill with 'done' + a winner. A concluded test with a declared winner
--    KEEPS APPLYING that winner's payload — declaring B would ship the ritual
--    copy to 100% of traffic, which is how you SHIP it, not how you stop it.
--
-- 🔙 FULL REMOVAL (only while still draft / never started):
--    DELETE FROM experiments WHERE key = 'v1_bump_copy_2026' AND status = 'draft';
-- ============================================================================
