-- ============================================================================
-- CREATE the /fb-tarot INHERITED SHADOW experiment — shadow vs natural
-- 2026-08-25 · Phase 5 of fb-tarot/docs/shadow-split-test-checklist.md
--
--   key            v1_tarot_shadow_2026
--   variants       natural w30 (CONTROL, {"method":"natural"})
--                  shadow  w70 ({"method":"shadow"})
--   subject_type   visitor   ← the ab_vid cookie, NOT a hashed email
--   scope          funnel v1-tarot + 37 (hook, deck) landers + freezeAssignment
--   conversion     v1_main_funnel, windowDays 7, targetN ← 🔴 RE-SIZE BEFORE STARTING
--   status         DRAFT  ← inert. Nobody is enrolled, every visitor gets the
--                            natural read, which is byte-identical to today.
--
-- WHAT THIS TEST CHANGES. Only the READ that Version B delivers on 37 landers.
-- natural = the Natural Tarot-Cut in DECKS[deck].reads — what serves today, on
-- every lander. shadow = the Inherited Shadow, six beats that name a cause she did
-- not start, living in its own roster (client/src/content/tarotReadsShadow.ts).
-- 🔴 ARMING DELETES NOTHING. DECKS.reads is never edited, so the 30% arm is the
-- unchanged funnel and a draft/paused/broken test leaves 100% of visitors on it.
--
-- 🔴 THE CODE IS INERT WITHOUT THIS ROW, and inert with it while it says 'draft':
-- resolveTarotMethod() returns 'natural' on every path that is not
-- running + in scope + a valid payload + version 'b'.
--
-- 🔴 ORDER OF OPERATIONS:
--      1. deploy the code (the resolver, the route, the second roster)
--      2. this file           (creates the DRAFT — still inert)
--      3. RE-SIZE targetN     (see §2 — the inherited number is for other hooks)
--      4. press Start in /admin/experiments
--    Seeding before the deploy is harmless but pointless; starting before the
--    deploy would enrol visitors whose build cannot serve the shadow arm, and
--    they would be counted in an arm they saw nothing of.
--
-- WHY natural IS variants[0] EVEN THOUGH IT IS THE SMALLER ARM. variants[0] is
-- what assign() hands back as the control on EVERY not-applicable path — out of
-- scope, paused, no cookie. Listing natural first is what makes all of those
-- render today's read rather than the unproven one. Weight order is irrelevant to
-- that; position is everything. pickVariant walks the list in order, so a ramp of
-- shadow UP still only ever moves subjects control→treatment.
--
-- WHY subject_type = 'visitor'. Same reason as v1_tarot_version_bc_2026: this
-- decides the FIRST message of the chat, so it must be assigned before an email
-- exists. It buckets on the anonymous ab_vid cookie, and conversations.ab_visitor_id
-- carries that id to the purchase. Its denominator is CHATS STARTED, not leads, so
-- its conversion rate is lower by construction and is NOT comparable arm-for-arm
-- with the price test, the commitment gate or the order bump.
--
-- WHY freezeAssignment = true. This method has never served a live visitor and it
-- is going to 70% of most of the tarot traffic. The operator will plausibly want to
-- ramp it or dial it back, and the admin PATCH REFUSES a live weight edit unless
-- this is set — so without it the split is frozen at start and any change needs a
-- brand-new key. With it, a woman who has already read the shadow arm keeps it when
-- the weights move, which is the whole point.
-- ⚠️ If the operator would rather hold 70/30 fixed and never touch it, drop this
--    field. It costs one indexed exposure lookup per chat start.
--
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can
-- only ever host ONE run. Never reuse a concluded key.
--
-- ⚠️ v1_tarot_version_bc_2026 is PAUSED, so there is no overlapping test on this
--    funnel. Do not restart it while this one runs — a different opener plausibly
--    changes how this read lands, and crossing them multiplies the variance.
-- ============================================================================

-- ── 0. PRE-FLIGHT ───────────────────────────────────────────────────────────
-- Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status, scope, variants, started_at
FROM experiments
WHERE key = 'v1_tarot_shadow_2026';

-- The visitor→purchase join column. Expect exactly 1 row, or the results page errors.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name = 'ab_visitor_id';

-- ⚠️ CHECKED 2026-08-25: this is 'done' with winner_variant='B' — NOT 'paused' as
-- the checklist said. That is fine and is in fact what this test needs: a concluded
-- experiment with a declared winner keeps APPLYING that winner, so its four scoped
-- landers resolve to version 'b', and the other 100 fall through to the URL's own
-- version, which is 'b' after the /c→/b redirect. Everyone is on B, which is the
-- only version that can serve either read. If this ever says 'running', STOP.
SELECT key, status, winner_variant FROM experiments WHERE key = 'v1_tarot_version_bc_2026';

-- 🔴 THE CROSSED FACTOR, FOUND BY THIS PRE-FLIGHT. v1_close_depth_2026 is RUNNING,
-- scoped to funnel v1-tarot, started 2026-08-20, and at 946 exposures of its 7,200
-- per-arm target — roughly 6% through. It changes the CLOSE; this test changes the
-- OPENING READ. They are crossed factors on one funnel, not competing surfaces.
--
-- ✅ OPERATOR DECISION, 2026-08-25: "the overlap is fine." Both run together. The
--    crossed design is ACCEPTED, which makes the stratified readout in §5 mandatory
--    rather than optional — a headline read result that silently averages over two
--    different closes is the one thing this decision rules out.
SELECT key, status, started_at::date, scope->>'funnel' AS funnel
FROM experiments WHERE status = 'running' ORDER BY key;


-- ── 1. CREATE THE DRAFT — inert until step 4. ───────────────────────────────
BEGIN;

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_tarot_shadow_2026',
  'fb-tarot Inherited Shadow vs the Natural Tarot-Cut',
  'Which READ /fb-tarot Version B delivers on 37 landers. natural (control, the '
  'incumbent) is the Natural Tarot-Cut: the read ANSWERS her ad question. shadow '
  'is the Inherited Shadow: six beats that name a cause she did not start, with a '
  'mandatory origin finding at beat 5, handing into chat on an open loop. Assigned '
  'at the chat opener on the ab_vid cookie, so the denominator is chats started '
  'rather than leads. Version B only — A and C cannot serve a pre-written read.',
  'draft',
  'visitor',
  -- 🔴 natural FIRST. variants[0] is the control arm, whatever its weight.
  '[
     {"key": "natural", "weight": 30, "payload": {"method": "natural"}},
     {"key": "shadow",  "weight": 70, "payload": {"method": "shadow"}}
   ]'::jsonb,
  -- funnel scope is belt-and-braces: the landers list already restricts this to
  -- /fb-tarot, but resolveTarotMethod always passes funnel='v1-tarot', so an
  -- accidental future caller on another funnel cannot enrol either.
  --
  -- 🔴 THE 37 LANDERS ARE (hook, deck) PAIRS, GENERATED FROM THE ROSTER, not typed
  --    by hand. They are exactly the hooks with an approved shadow read. That is
  --    what keeps assignment and content in step: a lander with no shadow read
  --    renders the natural one anyway (readsForMethod falls back), so enrolling it
  --    would put a visitor in the shadow arm who read the control copy.
  --
  -- 🔴 cards-feels and cards-return are ABSENT and must stay absent — protected
  --    controls, never rewritten and never armed (invariant 4). cards-return alone
  --    carries most of the tarot traffic; arming it would leave nothing unchanged
  --    to compare against. scripts/lander-registry.mts exits 1 if either is armed.
  --
  -- ⚠️ All 37 are on return-mhf, the face-down deck every live ad points at. The
  --    face-up decks (&deck=arcana-mfh / arcana-eef) are different landers and have
  --    no shadow read — a bare hook list would have silently enrolled them.
  --
  -- To add a lander later: /admin/experiments → edit → paste the ad URL into the
  -- "ad URLs" box → save. Appending is allowed on a running test; removing is not.
  '{
     "funnel": "v1-tarot",
     "freezeAssignment": true,
     "landers": [
       {"hook": "cards-after-marriage"    , "deck": "return-mhf"},
       {"hook": "cards-allowed-to-want"   , "deck": "return-mhf"},
       {"hook": "cards-best-years"        , "deck": "return-mhf"},
       {"hook": "cards-blocked-before"    , "deck": "return-mhf"},
       {"hook": "cards-blocked-retiring"  , "deck": "return-mhf"},
       {"hook": "cards-blocking-soulmate" , "deck": "return-mhf"},
       {"hook": "cards-choosing-wrong"    , "deck": "return-mhf"},
       {"hook": "cards-energy-away"       , "deck": "return-mhf"},
       {"hook": "cards-energy-how-long"   , "deck": "return-mhf"},
       {"hook": "cards-energy-soulmate"   , "deck": "return-mhf"},
       {"hook": "cards-found-me-yet"      , "deck": "return-mhf"},
       {"hook": "cards-heal-first"        , "deck": "return-mhf"},
       {"hook": "cards-how-much-longer"   , "deck": "return-mhf"},
       {"hook": "cards-keeps-waiting"     , "deck": "return-mhf"},
       {"hook": "cards-longer-to-wait"    , "deck": "return-mhf"},
       {"hook": "cards-missed-chance"     , "deck": "return-mhf"},
       {"hook": "cards-money-wont-stay"   , "deck": "return-mhf"},
       {"hook": "cards-my-energy"         , "deck": "return-mhf"},
       {"hook": "cards-nest-egg"          , "deck": "return-mhf"},
       {"hook": "cards-new-soulmate"      , "deck": "return-mhf"},
       {"hook": "cards-not-found-yet"     , "deck": "return-mhf"},
       {"hook": "cards-out-of-time"       , "deck": "return-mhf"},
       {"hook": "cards-prayed-years"      , "deck": "return-mhf"},
       {"hook": "cards-prayers-unanswered", "deck": "return-mhf"},
       {"hook": "cards-ready-commit"      , "deck": "return-mhf"},
       {"hook": "cards-ready-to-love"     , "deck": "return-mhf"},
       {"hook": "cards-second-time"       , "deck": "return-mhf"},
       {"hook": "cards-slipping-past"     , "deck": "return-mhf"},
       {"hook": "cards-soulmate-closer"   , "deck": "return-mhf"},
       {"hook": "cards-soulmate-out-there", "deck": "return-mhf"},
       {"hook": "cards-still-working"     , "deck": "return-mhf"},
       {"hook": "cards-too-late"          , "deck": "return-mhf"},
       {"hook": "cards-too-late-love"     , "deck": "return-mhf"},
       {"hook": "cards-waiting-to-heal"   , "deck": "return-mhf"},
       {"hook": "cards-where-soulmate"    , "deck": "return-mhf"},
       {"hook": "cards-will-commit"       , "deck": "return-mhf"},
       {"hook": "cards-wont-commit"       , "deck": "return-mhf"}
     ]
   }'::jsonb,
  -- targetN = the pre-registered per-arm exposure count. It gates the verdict and
  -- the declare-winner button (fixed horizon, no peeking). The SMALLER arm governs,
  -- and here that is NATURAL at 30% — so natural reaching N is the real horizon.
  --
  -- SIZED FROM THIS FUNNEL'S OWN BASELINE (read-only §2 query against production,
  -- 2026-08-25): 510 buyers / 9,609 tarot leads over 30 days = 5.31% lead→purchase.
  --   n = 16 * p * (1-p) / delta^2, p = 0.0531, delta = a 20% RELATIVE lift
  --   → 7,136 leads/arm balanced
  --   → 5,097 leads on the CONTROL arm once adjusted for the 70/30 imbalance
  --   → ≈10,200 control-arm CHATS at a ~50% chat→email capture rate
  -- 🔴 THE SMALLER ARM GOVERNS, and here that is NATURAL at 30%. The horizon is
  -- natural reaching N, not shadow.
  -- (The inherited 11,000 from v1_tarot_version_bc_2026 turned out to be close, but
  -- it was sized on four decode-him hooks at a 4.91% baseline. This is these hooks.)
  --
  -- ⚠️ MOVE THIS IF YOU WANT A DIFFERENT BAR: a 25% MDE needs ~6,500 control chats,
  --    a 15% MDE needs ~18,100. 20% is the version test's bar, carried on purpose.
  -- Freely editable while draft; FROZEN the moment the test starts.
  '{"type": "v1_main_funnel", "windowDays": 7, "targetN": 10200}'::jsonb
);

-- ⛔ Must report exactly 1 row. Anything else → ROLLBACK.

SELECT key, status, subject_type, variants, conversion,
       jsonb_array_length(scope->'landers') AS lander_count,
       scope->>'funnel' AS funnel, scope->>'freezeAssignment' AS freeze
FROM experiments
WHERE key = 'v1_tarot_shadow_2026';
-- Expect status=draft, subject_type=visitor, natural w30 FIRST then shadow w70,
-- lander_count=37, funnel=v1-tarot, freeze=true.

-- The two protected controls must NOT be in scope. Expect 0 rows.
SELECT l->>'hook' AS armed_protected_hook
FROM experiments e, jsonb_array_elements(e.scope->'landers') l
WHERE e.key = 'v1_tarot_shadow_2026'
  AND l->>'hook' IN ('cards-feels', 'cards-return');

-- Every lander must be on the face-down deck. Expect one row: return-mhf, 37.
SELECT l->>'deck' AS deck, count(*)
FROM experiments e, jsonb_array_elements(e.scope->'landers') l
WHERE e.key = 'v1_tarot_shadow_2026'
GROUP BY 1;

-- Nothing may be enrolled yet — expect 0.
SELECT count(*) AS exposures_should_be_zero
FROM experiment_exposures
WHERE experiment_key = 'v1_tarot_shadow_2026';

COMMIT;
-- (ROLLBACK; instead if ANY check above disagrees.)


-- ── 2. SIZE THE TEST — run BEFORE starting, then replace targetN. ───────────
-- The baseline these 37 landers actually produce. Guessing this is how a test gets
-- called on noise, and the inherited 11000 IS a guess for this hook set.
-- ⚠️ `conversations` HAS NO `funnel` COLUMN. The tarot funnel is identified by its
-- FIXED price variant, '35_tarot' (server/lib/priceVariant.ts FIXED_FUNNEL_PRICES).
-- v1_tarot_version_bc_2026's own sizing query filtered on nothing at all and so
-- counted every funnel's conversations; do not copy that.
SELECT count(*)                                          AS leads,
       count(*) FILTER (WHERE main_paid_at IS NOT NULL)  AS buyers,
       round(100.0 * count(*) FILTER (WHERE main_paid_at IS NOT NULL)
             / NULLIF(count(*), 0), 2)                   AS cr_pct
FROM conversations
WHERE created_at >= now() - interval '30 days'
  AND price_variant = '35_tarot';

-- 🔴 THAT IS A LEAD RATE, AND THIS TEST'S DENOMINATOR IS CHATS. A row only gets a
-- price_variant once /api/lead fires, i.e. once she leaves an email — but the arms
-- diverge at the OPENER, several steps earlier. So convert before using it:
--     targetN_chats = targetN_leads / (chat→email capture rate)
-- That capture rate lives in PostHog, not here. The CALENDAR estimate is unaffected
-- (targetN and the arrival rate scale by the same factor); only this field moves.
-- Then: per-arm N for a two-proportion test at 80% power / alpha 0.05 is roughly
--   n = 16 * p * (1 - p) / (delta ^ 2)
-- with p = the baseline above and delta = the smallest lift worth shipping.
-- Put THAT number in conversion.targetN:
--   UPDATE experiments SET conversion = jsonb_set(conversion, '{targetN}', 'NNNN')
--   WHERE key = 'v1_tarot_shadow_2026' AND status = 'draft';
--
-- ⚠️ Remember the 30/70 split: the NATURAL arm accrues at 3/7 the rate of shadow,
--    so the calendar time to reach N is driven entirely by natural.


-- ── 3. START IT — do this in /admin/experiments, NOT here. ──────────────────
-- The admin /start endpoint runs guards this file cannot (>=2 arms with positive
-- weight, conversion type <-> key, the scope.funnel requirement, and the
-- subject_type='visitor' requirement for visitor-keyed v1_main_funnel keys) and
-- stamps started_at, which is the cohort anchor every tally reads.
--
-- 🔴 Anchor the reporting window to started_at, never to "all time".
-- 🔴 All 37 landers enter on the SAME DAY. A staggered start means comparing arms
--    that began in different weeks.


-- ── 4. POST-START CHECK — within ~30s of real traffic (CACHE_TTL_MS). ───────
SELECT context->>'hook' AS hook, variant, count(*) AS chats_started
FROM experiment_exposures
WHERE experiment_key = 'v1_tarot_shadow_2026'
GROUP BY 1, 2
ORDER BY 1, 2;
-- Expect ONLY the 37 scoped hooks, splitting ~70 shadow / 30 natural.
-- 🔴 A row for cards-return or cards-feels means the lander scope is not doing its
--    job — pause the test and check scope.landers before reading any numbers.
-- 🔴 A row with deck=arcana-mfh / arcana-eef means the same thing.

-- 🔴 THE GUARDRAIL, AND IT IS READ FIRST. Revenue per 1,000 chats, per arm. A read
-- that wins replies and loses sales is a LOSS, and at 70/30 that lands on most of
-- the traffic. Buy-rate hides it, so do not read buy-rate first.
SELECT e.variant,
       count(*)                                  AS chats_started,
       count(*) FILTER (WHERE p.purchases > 0)   AS buyers,
       COALESCE(sum(p.revenue), 0)               AS revenue_cents,
       round(1000.0 * COALESCE(sum(p.revenue), 0) / NULLIF(count(*), 0))
                                                 AS revenue_cents_per_1000_chats
FROM experiment_exposures e
LEFT JOIN LATERAL (
  SELECT count(*) AS purchases,
         COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents, 0)), 0) AS revenue
  FROM conversations c
  WHERE c.ab_visitor_id = e.subject_id
    AND c.main_paid_at IS NOT NULL
    AND c.main_paid_at >= e.created_at
) p ON true
WHERE e.experiment_key = 'v1_tarot_shadow_2026'
GROUP BY e.variant
ORDER BY e.variant;

-- The join that makes the above work. Must be non-zero once buys exist, or the
-- tally shows chats but no buyers and reads as "both arms converted 0%".
SELECT count(*) AS conversations_with_visitor_id
FROM conversations
WHERE ab_visitor_id IS NOT NULL
  AND created_at >= now() - interval '2 days';


-- ── 5. THE STRATIFIED READOUT — required, because the design is crossed. ───
-- 🔴 THE DASHBOARD CANNOT DO THIS. Every tally in server/lib/experiments.ts filters
-- `WHERE e.experiment_key = <one key>`; nothing in the codebase crosses two keys. So
-- /admin/experiments will only ever show the POOLED read result, averaged over both
-- close arms — exactly the number the crossing makes untrustworthy on its own. Read
-- the pooled row for the headline, then read THIS before believing it.
--
-- The join needs no email hashing: close-depth writes context->>'conversationId' on
-- 100% of its exposures (checked 2026-08-25), and conversations.ab_visitor_id carries
-- this test's visitor id. So shadow exposure → conversation → close-depth exposure.
--
-- 🔴 THE '(no close arm)' BUCKET WILL BE LARGE, AND IT IS NOT AN ERROR. Close-depth
-- is EMAIL-keyed and assigned at LEAD CAPTURE; this test is VISITOR-keyed and
-- assigned at the OPENER, several steps earlier. Every woman who read the opener and
-- never left an email has a read arm and no close arm. She is real data for THIS
-- test — never drop her — but she cannot be stratified. Stratification therefore
-- covers only the sub-population that reached lead capture; report the bucket sizes
-- alongside the rates so it is obvious how much of the test the cross actually sees.
SELECT s.variant                                     AS read_arm,
       COALESCE(x.close_arm, '(no close arm)')       AS close_arm,
       count(*)                                      AS chats_started,
       count(*) FILTER (WHERE x.purchases > 0)       AS buyers,
       COALESCE(sum(x.revenue), 0)                   AS revenue_cents,
       round(1000.0 * COALESCE(sum(x.revenue), 0) / NULLIF(count(*), 0))
                                                     AS revenue_cents_per_1000_chats
FROM experiment_exposures s
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE c.main_paid_at IS NOT NULL) AS purchases,
         COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents, 0))
                  FILTER (WHERE c.main_paid_at IS NOT NULL), 0) AS revenue,
         -- max() rather than a bare column: one visitor can hold more than one
         -- conversation. It picks deterministically instead of fanning the row out
         -- and double-counting her in chats_started.
         max(cd.variant) AS close_arm
  FROM conversations c
  LEFT JOIN experiment_exposures cd
         ON cd.experiment_key = 'v1_close_depth_2026'
        AND cd.context->>'conversationId' = c.id
  WHERE c.ab_visitor_id = s.subject_id
    AND c.created_at >= s.created_at
) x ON true
WHERE s.experiment_key = 'v1_tarot_shadow_2026'
  AND s.created_at >= (SELECT started_at FROM experiments WHERE key = 'v1_tarot_shadow_2026')
GROUP BY 1, 2
ORDER BY 1, 2;
-- Returns 0 rows until the test is started (started_at is NULL while draft) — that
-- is the anchor working, not a broken query.
--
-- 🔴 HOW TO READ IT: compare shadow vs natural WITHIN each close arm, then check the
-- two comparisons agree in direction. If shadow wins under close A and loses under
-- close B, there is an interaction and neither the pooled number nor either half is
-- a verdict — say so rather than picking the flattering half.


-- ============================================================================
-- 🔙 KILL SWITCH — set status → 'paused' in /admin/experiments.
--    Reverts every visitor to the natural read within <=30s. Already-collected
--    exposures stay (they are real).
--
-- 🔴 Do NOT kill with 'done' + a winner. A concluded test with a declared winner
--    KEEPS APPLYING that winner's payload (assign(), status='done' branch), so
--    declaring shadow would ship the Inherited Shadow to 100% of the 37 landers —
--    which is how you SHIP it, not how you stop it.
--
-- 🔙 FULL REMOVAL (only while still draft / never started):
--    DELETE FROM experiments WHERE key = 'v1_tarot_shadow_2026' AND status = 'draft';
-- ============================================================================
