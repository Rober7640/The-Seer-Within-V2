-- ============================================================================
-- CREATE the /fb UPSELL 2 COPY experiment: today's script vs "the bracelet is a magnet"
-- 2026-11-27 · Spec: docs/superpowers/specs/2026-11-27-v1-fb-u2-copy-2026.md
--
--   key            v1_fb_u2_copy_2026
--   variants       A w50 (CONTROL, {}) / B w50 ({"copy":"magnet"})
--   subject_type   email   ← the normalised email, same as v1_fb_u1_copy_2026
--   scope          funnel ["v1-fb"]
--   conversion     upsell2_funnel (tallyUpsell2: reached Upsell 2 → bought → revenue,
--                  $47 vs $30, split by path A / B)
--   status         DRAFT  ← inert. Nobody is enrolled; every buyer gets today's script.
--
-- WHAT B CHANGES (Upsell 2 chat copy only, never the price, the charge or the stages):
--   · the whole Upsell 2 script, "hook M": the clearing takes out what's in her way; the
--     bracelet works like a magnet, its eight stones set tonight to what she asked for,
--     each drawing one thing to her. Lines swap by topic (OTHER TOPICS in the script);
--     RITUAL_INSTRUCTION bubble 2 names the candle only for a buyer who saw it in /fb
--     chat B, else "on my altar"
--   · its own Q1 / Q2 / Q3, buttons and typed-answer matching (script NOTES FOR BUILD)
--   · the two AI beats (reveal, stone personalisation) use their own prompts with the
--     script's bans; any failure, or a reply that breaks a ban, plays the script's own
--     fallback line, never the generic "energy" lines
--   · accept button "Yes, set my bracelet tonight" (A: "Yes, send me the Manifestation
--     Bracelet"); a $47 buyer gets one extra SUCCESS bubble ("I'll set it tonight,
--     during your clearing."), a $30 downsell buyer does not
--   · same stage order, same bracelet photo, same $47 / $30, same 1-click charge, same
--     shipping form, same success page
--
-- WHO IS IN — read off the ORDER ROW by the server, never the client:
--   · /fb (conversations.price_variant carries the `_fb` token; check 0c below). This also
--     keeps out every /fb-tarot retarget order (v1-tarot, or no price variant).
--   · no belief lane (conversations.lane IS NULL)
--   · a known topic (love / money / purpose / someone)
--   · BOTH paths: A bought Upsell 1 (has an address), B declined it
--   · both arms of v1_fb_chat_flow_2026, and both arms of v1_fb_u1_copy_2026
--   · NO price rule: Upsell 2 is $47 / $30 at every V1 charge site; no experiment or
--     price variant moves it (only backend offers' be_bracelet differs, and those pages
--     never ask for this test)
--
-- WHEN. Assigned + logged in ONE call when the Upsell 2 chat starts, before the first
-- bubble (GET /api/fb/u2-copy, surface 'upsell2_chat_start'). The exposure context
-- carries conversationId (what tallyUpsell2 joins on), path ('A' / 'B'), topic and
-- candle. Any failure, or the client not hearing back within 2s, shows A.
--
-- targetN: 300 per arm (the operator's number). Read 0d below for the real /fb Upsell 2
-- take rate before pressing Start. Rule of thumb for 80% power, two-sided 5%:
-- n ≈ 16 · p(1−p) / Δ²; at p = 20% that is a ~9-point lift (20% → 29%) at 300 per arm,
-- at p = 30% a ~10.6-point lift. /fb sells ~16 a day and every buyer reaches Upsell 2,
-- so 600 exposures is roughly 40 days.
--
-- RUNS NEXT TO v1_fb_u1_copy_2026. Both assign on the same email hash with their own
-- key, so the two splits are independent. Path (A / B here) is DOWNSTREAM of the Upsell 1
-- test: if Upsell 1's B sells more rituals, more Upsell 2 buyers open on path A in BOTH
-- arms. The pooled tally still compares like with like; read the per-path rows as slices.
--
-- 🔴 ORDER OF OPERATIONS:
--      1. merge + deploy the code (inert without this row: /api/fb/u2-copy answers
--         'today' for everyone)
--      2. walk B on the live site with the preview link
--         /fb/welcome2?demo=true&u2copy=magnet            (altar line)
--         /fb/welcome2?demo=true&u2copy=magnet&chatflow=b (candle line)
--         (forces B, never logged, never counted; the AI beats are written live)
--      3. this file (creates the DRAFT, still inert)
--      4. press Start in /admin/experiments
--
-- WHY A IS variants[0]. The control arm must be first: pickVariant walks the list in
-- listed order, so ramping B up only ever moves buyers A→B.
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can only
-- ever host ONE run. Never reuse a concluded key.
-- KNOWN EDGE (same as Upsell 1): conversations are reused per email and the upsell2
-- flags are never reset, so a returning buyer who bought the bracelet on an EARLIER
-- order reads as a buyer. Roughly symmetric across arms; 0e counts how often.
-- ============================================================================

-- ── 0. PRE-FLIGHT (read-only) ───────────────────────────────────────────────
-- 0a. Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status FROM experiments WHERE key = 'v1_fb_u2_copy_2026';

-- 0b. What else is running (an Upsell 2 copy test on /fb must not already exist).
SELECT key, status, subject_type, scope->>'funnel' AS funnel, conversion->>'type' AS conversion
FROM experiments WHERE status = 'running' ORDER BY key;

-- 0c. /fb buyers in the last 7 days, by what decides eligibility. Expect /fb's
--     price_variant to read like 35_fb / 45_fb (the `_fb` token is how the server tells
--     /fb apart). Eligible rows: lane = false AND a known bucket.
SELECT price_variant, (lane IS NOT NULL) AS lane, bucket, upsell_purchased AS path_a, count(*) AS buyers
FROM conversations
WHERE main_paid_at > now() - interval '7 days'
  AND price_variant LIKE '%\_fb%' ESCAPE '\'
  AND price_variant NOT LIKE '%\_fb2%' ESCAPE '\'
GROUP BY 1, 2, 3, 4
ORDER BY buyers DESC;

-- 0d. Today's Upsell 2 take rate on plain /fb, last 30 days, by path. This is the base
--     rate targetN is sized against. upsell2_offered is set when the Upsell 2 page loads.
SELECT CASE WHEN upsell_purchased THEN 'A' ELSE 'B' END AS path,
       count(*) FILTER (WHERE upsell2_offered)                                   AS reached_u2,
       count(*) FILTER (WHERE upsell2_offered AND upsell2_purchased)             AS bought,
       round(100.0 * count(*) FILTER (WHERE upsell2_offered AND upsell2_purchased)
             / NULLIF(count(*) FILTER (WHERE upsell2_offered), 0), 1)            AS take_pct,
       count(*) FILTER (WHERE upsell2_purchased
                          AND (upsell2_type = 'downsell' OR upsell2_amount = 3000)) AS at_30,
       COALESCE(sum(upsell2_amount) FILTER (WHERE upsell2_purchased), 0) / 100.0 AS revenue_usd
FROM conversations
WHERE main_paid_at > now() - interval '30 days'
  AND price_variant LIKE '%\_fb%' ESCAPE '\'
  AND price_variant NOT LIKE '%\_fb2%' ESCAPE '\'
  AND lane IS NULL
  AND bucket IN ('love', 'money', 'purpose', 'someone')
GROUP BY 1 ORDER BY 1;

-- 0e. Every Upsell 2 price actually charged on plain /fb in the last 30 days. Expect
--     only 4700 and 3000 (the test has no price rule; anything else needs a look).
SELECT upsell2_amount, upsell2_type, count(*) AS buyers
FROM conversations
WHERE main_paid_at > now() - interval '30 days'
  AND upsell2_purchased
  AND price_variant LIKE '%\_fb%' ESCAPE '\'
  AND price_variant NOT LIKE '%\_fb2%' ESCAPE '\'
GROUP BY 1, 2 ORDER BY buyers DESC;

-- ── 1. CREATE THE DRAFT ─────────────────────────────────────────────────────
BEGIN;
INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_fb_u2_copy_2026',
  '/fb Upsell 2 copy: today (A) vs the bracelet is a magnet (B)',
  'Which Upsell 2 script sells more Manifestation Bracelets on /fb. A (control) is '
  'today''s script. B is "hook M": the clearing takes out what is in her way, and the '
  'bracelet works like a magnet, its eight stones set tonight to what she asked for. '
  'Copy only: same $47 / $30, charge, stages and shipping. Plain /fb (no lane) buyers '
  'with a known topic, both paths (bought or declined Upsell 1), both chat-flow arms. '
  'Assigned on the normalised email when the Upsell 2 chat starts; scored by '
  'tallyUpsell2.',
  'draft',
  'email',
  -- 🔴 A FIRST. variants[0] is the control arm.
  '[
     {"key": "A", "weight": 50, "payload": {}},
     {"key": "B", "weight": 50, "payload": {"copy": "magnet"}}
   ]'::jsonb,
  '{"funnel": ["v1-fb"]}'::jsonb,
  '{"type": "upsell2_funnel", "targetN": 300}'::jsonb
);
COMMIT;

-- ── 2. VERIFY ───────────────────────────────────────────────────────────────
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments WHERE key = 'v1_fb_u2_copy_2026';

-- ── 3. ONCE RUNNING: exposures by arm and path, and how many bought ─────────
-- SELECT e.variant, e.context->>'path' AS path, (e.context->>'candle')::boolean AS candle,
--        count(*) AS exposed,
--        count(*) FILTER (WHERE c.upsell2_purchased) AS bought,
--        COALESCE(sum(c.upsell2_amount) FILTER (WHERE c.upsell2_purchased), 0) / 100.0 AS revenue_usd
-- FROM experiment_exposures e
-- LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
-- WHERE e.experiment_key = 'v1_fb_u2_copy_2026'
-- GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
