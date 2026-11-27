-- ============================================================================
-- CREATE the /fb UPSELL 1 COPY experiment: today's script vs "the stone is a filter"
-- 2026-11-27 · Spec: docs/superpowers/specs/2026-11-27-v1-fb-u1-copy-2026.md
--
--   key            v1_fb_u1_copy_2026
--   variants       A w50 (CONTROL, {}) / B w50 ({"copy":"filter"})
--   subject_type   email   ← the normalised email, same as u1_price_2026
--   scope          funnel ["v1-fb"]
--   conversion     upsell1_funnel (tallyUpsell1: offered → bought → revenue)
--   status         DRAFT  ← inert. Nobody is enrolled; every buyer gets today's script.
--
-- WHAT B CHANGES (Upsell 1 chat copy only, never the price, the charge or the stages):
--   · the whole Upsell 1 script, "hook 6": the clearing takes out what's in her; the
--     Protection Ritual sorts what comes at her next, and lava stone is the filter
--     (pond-filter mechanism). Three spots change by topic; RITUAL bubble 2 names the
--     candle only for a buyer who saw it in /fb chat B, else "on my altar"
--   · accept button "Yes, set my stone tonight" (A: "Yes, protect what we clear")
--   · same stage order, same three questions, same stone photo, same $47, same 1-click
--     charge, same shipping form, same Upsell 2
--
-- WHO IS IN — read off the ORDER ROW by the server, never the client:
--   · /fb (conversations.price_variant carries the `_fb` token; check 0c below)
--   · no belief lane (conversations.lane IS NULL)
--   · Upsell 1 price exactly $47 (conversations.upsell1_amount_cents = 4700). The operator
--     is stopping u1_price_2026 (2026-11-27) to focus on $47: stopped, or concluded with A,
--     every /fb lead falls back to DEFAULT_UPSELL1_CENTS = 4700, so everyone is in. Never
--     conclude it with B ($39) or C ($35): those buyers would all be out of this test.
--   · a known topic (love / money / purpose / someone)
--   · both arms of v1_fb_chat_flow_2026
--
-- WHEN. Assigned + logged in ONE call when the Upsell 1 chat starts, before the first
-- bubble (GET /api/fb/u1-copy, surface 'upsell1_chat_start'). The exposure context
-- carries conversationId, which is what tallyUpsell1 joins on. Any failure, or the client
-- not hearing back within 2s, shows A.
--
-- targetN: 300 per arm. Live read 2026-11-27 (plain /fb, no lane, $47): 191 of 813
-- offered bought Upsell 1 in 30 days (23.5%), 40 of 160 in 14 days (25%). Rule of thumb
-- for 80% power, two-sided 5%: n ≈ 16 · p(1−p) / Δ² = 16 · 0.24 · 0.76 / 0.10² ≈ 292,
-- i.e. a 10-point lift (24% → 34%). /fb sells ~16 a day (14 days to 2026-11-27, any
-- price, ~1 a day via a lane), so 600 exposures is ~40 days once everyone is at $47.
--
-- 🔴 ORDER OF OPERATIONS:
--      1. merge + deploy the code (inert without this row: /api/fb/u1-copy answers
--         'today' for everyone)
--      2. walk B on the live site with the preview link
--         /fb/welcome1?demo=true&u1copy=filter            (altar line)
--         /fb/welcome1?demo=true&u1copy=filter&chatflow=b (candle line)
--         (forces B, never logged, never counted)
--      3. this file (creates the DRAFT, still inert)
--      4. check u1_price_2026 is stopped (or concluded A), then press Start in
--         /admin/experiments
--
-- WHY A IS variants[0]. The control arm must be first: pickVariant walks the list in
-- listed order, so ramping B up only ever moves buyers A→B.
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can only
-- ever host ONE run. Never reuse a concluded key.
-- ============================================================================

-- ── 0. PRE-FLIGHT (read-only) ───────────────────────────────────────────────
-- 0a. Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status FROM experiments WHERE key = 'v1_fb_u1_copy_2026';

-- 0b. What else is running (an Upsell 1 copy test on /fb must not already exist).
SELECT key, status, subject_type, scope->>'funnel' AS funnel, conversion->>'type' AS conversion
FROM experiments WHERE status = 'running' ORDER BY key;

-- 0c. /fb buyers in the last 7 days, by what decides eligibility. Expect /fb's
--     price_variant to read like 35_fb / 45_fb (the `_fb` token is how the server tells
--     /fb apart). Eligible rows: upsell1_amount_cents = 4700 AND lane = false.
SELECT price_variant, upsell1_amount_cents, (lane IS NOT NULL) AS lane, bucket, count(*) AS buyers
FROM conversations
WHERE main_paid_at > now() - interval '7 days'
  AND price_variant LIKE '%\_fb%' ESCAPE '\'
  AND price_variant NOT LIKE '%\_fb2%' ESCAPE '\'
GROUP BY 1, 2, 3, 4
ORDER BY buyers DESC;

-- ── 1. CREATE THE DRAFT ─────────────────────────────────────────────────────
BEGIN;
INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_fb_u1_copy_2026',
  '/fb Upsell 1 copy: today (A) vs the stone is a filter (B)',
  'Which Upsell 1 script sells more Protection Rituals on /fb at $47. A (control) is '
  'today''s script. B is "hook 6": the clearing takes out what is in her, the ritual '
  'sorts what comes at her next, and lava stone is the filter. Copy only: same price, '
  'charge, stages and Upsell 2. Plain /fb (no lane) buyers whose Upsell 1 price is $47, '
  'from both chat-flow arms. Assigned on the normalised email when the Upsell 1 chat '
  'starts; scored by tallyUpsell1.',
  'draft',
  'email',
  -- 🔴 A FIRST. variants[0] is the control arm.
  '[
     {"key": "A", "weight": 50, "payload": {}},
     {"key": "B", "weight": 50, "payload": {"copy": "filter"}}
   ]'::jsonb,
  '{"funnel": ["v1-fb"]}'::jsonb,
  '{"type": "upsell1_funnel", "targetN": 300}'::jsonb
);
COMMIT;

-- ── 2. VERIFY ───────────────────────────────────────────────────────────────
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments WHERE key = 'v1_fb_u1_copy_2026';

-- ── 3. ONCE RUNNING: exposures by arm, and how many reached a purchase row ──
-- SELECT e.variant, count(*) AS exposed,
--        count(*) FILTER (WHERE c.upsell_purchased) AS bought,
--        COALESCE(sum(c.upsell_amount) FILTER (WHERE c.upsell_purchased), 0) / 100.0 AS revenue_usd
-- FROM experiment_exposures e
-- LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
-- WHERE e.experiment_key = 'v1_fb_u1_copy_2026'
-- GROUP BY 1 ORDER BY 1;
