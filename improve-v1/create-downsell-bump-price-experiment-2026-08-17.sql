-- ============================================================================
-- CREATE the V1 DOWNSELL BUMP PRICE experiment — $12.77 vs $9.77 on the $25 path
-- 2026-08-17 · Build spec: docs/superpowers/specs/2026-08-16-v1-downsell-bump.md
--
--   key            v1_downsell_bump_price_2026
--   variants       A w50 ({"bumpCents":1277}) / B w50 ({"bumpCents":977})
--   subject_type   email     ← the raw address, like the gate and the order bump
--   scope          funnel ["v1-tarot"]
--   conversion     v1_main_funnel   ← REQUIRED, and NOT null. A null conversion is
--                  not "no dashboard": the results endpoint defaults it to
--                  credit_purchase, the V2 CHAT conversion, and renders zeros
--                  counted from chat-minute purchases. (Set 2026-08-25.)
--   status         DRAFT  ← inert. Absent arm ⇒ resolveBumpCents falls back to 977.
--
-- WHAT CHANGED IN CODE (already deployed, and NOT gated on this row):
--   The downsell now carries a bump AT ALL. It never did before — startPurchase
--   sent `type !== 'main'` straight through, on the reasoning that the downsell
--   "is already the cheaper branch". That reasoning is sound and this reverses it
--   knowingly: she reaches the downsell by saying $35 was too much, and a third
--   ask is how the sliding-scale arm died on 2026-07-22.
--
--   With this row absent, every downsell bump is offered at the DEFAULT $9.77.
--   Creating and starting this row is what splits it 50/50 against $12.77.
--
-- WHY $9.77 IS THE DEFAULT AND THE CHALLENGER. Match the ratio, not the absolute:
--   $12.77 on $35 = 36.5% of her order
--   $12.77 on $25 = 51.1%   ← the same money is a much bigger ask
--   $9.77  on $25 = 39.1%   ← near-parity (exact parity would be $9.12)
--
-- 🔴 THIS TEST CANNOT REACH SIGNIFICANCE. THAT IS THE DESIGN, NOT A FAULT.
--    ~60 downsell buyers/month against the ~590 offers the breakeven lift needs
--    is roughly 10 MONTHS. So:
--      · STOP DATE 2026-11-17 — a date, not a p-value.
--      · Take whichever arm has higher REVENUE PER DOWNSELL BUYER. Ship it.
--      · DO NOT EXTEND IT when it is not significant on that date. It never will be.
--    Defensible only because the whole item is worth ~$130/month, so a wrong call
--    costs ~$65/month — cheaper than seven further months of indecision. On
--    anything larger, run it properly.
--
-- 🔴 JUDGE ON REVENUE PER BUYER, NEVER TAKE-RATE. $9.77 will win take almost by
--    definition. At a 37% baseline it must reach 48.6% just to draw level, because
--    a 23% price cut needs a 31% lift in take to break even. Reading the take-rate
--    is how you ship the arm that earns less.
--
-- 🔴 THE GUARDRAIL IS DOWNSELL COMPLETION, NOT BUMP TAKE, and it applies to BOTH
--    arms — the risk is adding a third ask at all, not which price it carries. At
--    ~38-60 downsell buyers/month a 10% drop is ~4-6 buyers, below the noise floor
--    for weeks, so this is a monthly eyeball and CANNOT be an automated stopping
--    rule. If downsell buyers visibly fall: revert first, investigate after.
--    Reverting is one constant (V1_BUMP_CENTS_DOWNSELL) or pausing this row.
--
-- 🔴 RUN ON DEV FIRST, THEN PROD. The databases were separated on 2026-08-05, so
--    this row must be created twice. A "0 rows" surprise usually means the wrong DB.
--
-- ============================================================================
-- ⛔ DO NOT START THIS EXPERIMENT YET — ARM A WOULD BILL THE WRONG PRICE.
--    Found 2026-08-17 by .claude/skills/v1-funnel-audit/scripts/audit-downsell-bump.mjs
--    plus a direct arm probe. Reproduced: 3 of 8 sample emails drew arm A and every
--    one of them would be SHOWN $9.77 and CHARGED $12.77.
--
--    WHY. The price reaches the Stripe line and the offer card by two different
--    routes, and only one of them exists:
--      · CHARGE  server/routes.ts:809-815 — /api/checkout calls
--                resolveV1DownsellBumpPrice() and charges the real arm. ✅ works
--      · CARD    client reads userData.bumpCentsDownsell (chat.ts:141-145), which
--                is documented as "Sent by /api/lead". IT IS NOT. /api/lead
--                (routes.ts:1316-1343) sends commitmentGate/orderBump/bumpCopy/
--                closeDepth and never this field, and useConversation.ts:967-982
--                never captures it. So it is permanently undefined and
--                resolveBumpCents(undefined,'downsell') pins the card at $9.77.
--
--    HARMLESS ONLY WHILE THIS ROW IS DRAFT: with no arm assigned both sides fall
--    back to $9.77 and agree — which is exactly why the browser audit passes 13/13
--    today. Pressing Start is what breaks them apart.
--
--    THE FIX is to send the arm at lead capture and capture it client-side, the
--    same shape bumpCopy already uses. ⚠ Note the trade-off before doing it:
--    resolving in /api/lead ENROLLS every tarot lead, not just the ~3% who reach
--    the downsell, so the "exposed" column in §3 stops meaning "was offered the
--    bump". The verdict metric (revenue per downsell BUYER) is unaffected.
-- ============================================================================
--
-- 🔴 ORDER OF OPERATIONS:
--      1. deploy the code   (downsell bumps begin at the default $9.77 — this is
--                            already a live change, independent of this row)
--      2. this file         (creates the DRAFT — still no split)
--      3. press Start in /admin/experiments when you want the $12.77 arm running
--
-- WHY A IS variants[0]. The control arm must be first: pickVariant walks the list
-- in listed order. A = $12.77 = the price the MAIN path charges, so A is the
-- "no proportional adjustment" arm and B is the change under test.
--
-- WHY subject_type = 'email'. Same as the order bump: the bump arm is already
-- resolved per email, and bucketing the price on the same subject keeps one woman
-- on one price across a session and any return visit.
--
-- WHY NO freezeAssignment. Unlike close depth, nothing here is remembered between
-- sessions — she sees the price at the moment of checkout and either pays it or
-- does not. There is no half-read close to protect from a re-weight. Deliberate,
-- not an omission.
--
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can
-- only ever host ONE run. Never reuse a concluded key.
--
-- ⚠ MAY COLLIDE WITH hours-55-35_tarot LATER. That test moves the bump row inside
--   its new offer card. Before starting 55/35 while this is live, verify the
--   DOWNSELL render is genuinely separate. Believed separate; not confirmed.
--
-- ============================================================================
-- ✅ THE CARD/CHARGE BLOCKER IS FIXED (2026-08-25). This test is safe to start.
--
--    WHAT IT WAS. The price reached the Stripe line and the offer card by two
--    different routes and only one of them existed:
--      · CHARGE  /api/checkout called resolveV1DownsellBumpPrice() and charged the
--                real arm. ✅ always worked
--      · CARD    the client read userData.bumpCentsDownsell, documented as "Sent by
--                /api/lead". IT WAS NOT. So it was permanently undefined and
--                resolveBumpCents(undefined,'downsell') pinned every card at $9.77
--                while arm A billed $12.77.
--    Reproduced against a real server + real Stripe test sessions on 2026-08-25:
--    7 of 16 sampled emails drew arm A and every one of them was shown $9.77.
--
--    THE FIX. assignVariantIfMissing now resolves the arm at lead capture, /api/lead
--    and the resume endpoint send `bumpCentsDownsell`, and the client captures it
--    through the same closed-set validation (977|1277) it already uses for bumpCopy.
--    Both sides resolve the SAME arm from the SAME subject. Re-verified 16/16.
--
--    ⚠️ ONE WINDOW REMAINS, BY DESIGN: this row carries no scope.freezeAssignment, so
--    a WEIGHT EDIT landing between her offer and her click can still move her arm
--    between the card and the charge. Do not re-weight this test while it runs.
--
-- ── EXPOSURES ARE LOGGED AT THE OFFER, NOT AT LEAD CAPTURE ───────────────────
--    This test shipped with NO exposure logging at all, so /admin/experiments had no
--    denominator. It now writes one from /api/checkout, surface
--    'downsell_bump_assigned', carrying the conversationId the §3 query joins on.
--
--    🔴 SO ITS "exposed" COLUMN MEANS SOMETHING DIFFERENT FROM EVERY OTHER V1 TEST.
--    The others enrol every LEAD. This one enrols only women actually OFFERED the
--    downsell bump — ~3% as many rows, and a conversion rate an order of magnitude
--    higher. Do NOT compare it arm-for-arm against the gate, the order bump or close
--    depth. Its two arms are comparable with each other; that is all.
--
--    Deliberate, for two reasons. Enrolling every tarot lead would (a) make "exposed"
--    mean "was a tarot lead" on a test about a $9.77 line, and (b) fill the bump
--    take-rate block with MAIN-path bumps, because tallyV1BumpTakeRate counts
--    conversations.bump_offered, which the main bump sets too.
--
--    It misses only women who abandon on the offer card itself — declining routes
--    straight on to the same /api/checkout call, so decliners ARE counted.
-- ============================================================================

-- ── 0. PRE-FLIGHT ───────────────────────────────────────────────────────────
-- Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status, scope, variants, started_at
FROM experiments
WHERE key = 'v1_downsell_bump_price_2026';

-- Nothing running may own the bump row. Expect v1_bump_copy_2026 (which prices
-- nothing — it is copy-only) and no second bump-PRICE test.
SELECT key, status, scope->'funnel' AS funnel
FROM experiments
WHERE status = 'running'
ORDER BY key;

-- Baseline, so the stop-date read has something to compare against. Expect a
-- small number — that is the entire point of the date-based rule.
SELECT count(*) FILTER (WHERE main_paid_at IS NOT NULL)                        AS buyers_30d,
       count(*) FILTER (WHERE main_paid_at IS NOT NULL
                          AND main_purchase_amount = 2500)                     AS downsell_buyers_30d
FROM conversations
WHERE created_at > now() - interval '30 days'
  AND price_variant ILIKE '%tarot%';


-- ── 1. CREATE THE DRAFT — inert until it is started. ────────────────────────
BEGIN;

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_downsell_bump_price_2026',
  'Downsell bump price — $12.77 vs $9.77',
  'PRICE only, on the $25 downsell checkout. The downsell now carries an order '
  'bump for the first time (deployed 2026-08-17); this splits what it costs. '
  'A = $12.77, the same absolute price the main path charges. B = $9.77, which is '
  'proportionally equivalent: $12.77 is 36.5%% of a $35 order but 51.1%% of a $25 '
  'one, and she reaches the downsell by saying $35 was too much. With this test '
  'absent or draft, every downsell bump is offered at $9.77. '
  'CANNOT REACH SIGNIFICANCE: ~60 downsell buyers/month vs the ~590 offers needed, '
  'i.e. ~10 months. STOPS ON A DATE, 2026-11-17 — take the higher revenue per '
  'downsell buyer and ship it; do not extend it. Judge on revenue per buyer, never '
  'take-rate: a 23%% price cut needs a 31%% lift in take just to break even. '
  'Guardrail is DOWNSELL COMPLETION on both arms, not bump take. To start, set '
  'status=running.',
  'draft',
  'email',
  -- 🔴 A FIRST. variants[0] is the control arm: $12.77, the main-path price.
  --
  -- 50/50, set once and held. An uneven split bets that one arm is better before
  -- there is evidence, and power is maximised at equal arms (queue doc, rule 2) —
  -- which matters more here than anywhere, since this test is short of power by
  -- design and cannot afford to waste any.
  '[
     {"key": "A", "weight": 50, "payload": {"bumpCents": 1277}},
     {"key": "B", "weight": 50, "payload": {"bumpCents": 977}}
   ]'::jsonb,
  -- ARRAY form even for one funnel, matching every other V1 test: matchesFunnelScope
  -- accepts both, and the array is what a second funnel would be appended to without
  -- changing the SHAPE of scope.
  --
  -- fb-tarot only because it is the only funnel with traffic — palm spend was cut
  -- deliberately on ~2026-08-08 and has been zero since.
  '{
     "funnel": ["v1-tarot"]
   }'::jsonb,
  -- 🔴 v1_main_funnel, NOT NULL. A null conversion is not "no dashboard" — the
  -- results endpoint defaults it to credit_purchase (the V2 CHAT conversion) and
  -- renders zeros counted from chat-minute purchases, which reads as a result. The
  -- key is allowlisted for this type in server/routes/admin/experiments.ts
  -- (V1_MAIN_FUNNEL_KEYS); without BOTH halves the page shows nothing useful.
  --
  -- No targetN. This test does NOT stop on a sample size, because it cannot reach
  -- one that matters: it stops on 2026-11-17 by human decision. Leaving targetN
  -- null is deliberate — a number here would imply a fixed horizon this test does
  -- not have, and would light a "ready to declare" state that must never be trusted.
  '{"type": "v1_main_funnel"}'::jsonb
);

COMMIT;


-- ── 2. VERIFY ───────────────────────────────────────────────────────────────
-- Expect exactly one row, status = draft, A first, conversion v1_main_funnel.
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments
WHERE key = 'v1_downsell_bump_price_2026';

-- Expect 0. Nothing is enrolled until it is started.
SELECT count(*) AS exposures
FROM experiment_exposures
WHERE experiment_key = 'v1_downsell_bump_price_2026';


-- ── 3. READ IT (on or after 2026-11-17, and not before) ─────────────────────
-- Revenue per downsell buyer, per arm. THIS is the verdict metric.
--
-- Take-rate is included only so the two can be seen to disagree — expect B to win
-- take and expect that to be irrelevant unless it also wins the money column.
--
-- SELECT e.variant,
--        count(*)                                                    AS exposed,
--        count(*) FILTER (WHERE c.main_paid_at IS NOT NULL
--                           AND c.main_purchase_amount = 2500)       AS downsell_buyers,
--        count(*) FILTER (WHERE c.bump_purchased)                    AS bump_takers,
--        round(
--          COALESCE(SUM(c.main_purchase_amount + COALESCE(c.bump_amount_cents,0))
--                   FILTER (WHERE c.main_paid_at IS NOT NULL
--                             AND c.main_purchase_amount = 2500), 0)::numeric
--          / NULLIF(count(*) FILTER (WHERE c.main_paid_at IS NOT NULL
--                                      AND c.main_purchase_amount = 2500), 0)
--        , 0)                                                        AS cents_per_downsell_buyer
-- FROM experiment_exposures e
-- LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
-- WHERE e.experiment_key = 'v1_downsell_bump_price_2026'
-- GROUP BY 1 ORDER BY 1;
--
-- GUARDRAIL — downsell completion, both arms pooled against the pre-launch rate.
-- A visible fall means the third ask is costing $25 sales worth twice the bump.
--
-- SELECT date_trunc('week', created_at)::date       AS wk,
--        count(*) FILTER (WHERE main_paid_at IS NOT NULL)                  AS buyers,
--        count(*) FILTER (WHERE main_paid_at IS NOT NULL
--                           AND main_purchase_amount = 2500)               AS downsell_buyers
-- FROM conversations
-- WHERE created_at > now() - interval '16 weeks' AND price_variant ILIKE '%tarot%'
-- GROUP BY 1 ORDER BY 1;
