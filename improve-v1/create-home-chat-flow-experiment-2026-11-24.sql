-- ============================================================================
-- CREATE the HOME (base V1) CHAT FLOW experiment: today's interview vs the reading flow
-- 2026-11-24 · Spec + copy: docs/superpowers/specs/2026-11-24-v1-home-chat-flow-2026.md
--
--   key            v1_home_chat_flow_2026
--   variants       A w50 (CONTROL, {}) / B w50 ({"flow":"b"})
--   subject_type   visitor   ← the ab_vid cookie, assigned at CHAT START
--   scope          funnel ["v1-home"]   (base V1 / "/" + "/chat" only)
--   conversion     v1_main_funnel, windowDays 7, targetN 9600
--   status         DRAFT  ← inert. Nobody is enrolled; every woman gets today's chat.
--
-- This is the /fb reading (v1_fb_chat_flow_2026) run as its OWN test on the base V1
-- storefront. Arm B reuses /fb's reading copy VERBATIM — the candle + name-number opener,
-- the three reading steps (fbB1/fbB2/fbB3) and the diagnosis. The opening greeting is
-- identical in both arms; only the step right after her NAME forks.
--
-- WHAT B CHANGES (chat only, never a price, line item or CTA):
--   · after her name: the candle bends and smokes + her name's number, instead of
--     "It's lovely to meet you"
--   · topic lines pick up the smoke instead of "a flicker of shadow"
--   · after the email: three reading steps that each TELL her something from her own
--     words before asking, instead of seven questions; no "not enough" pushbacks; one
--     yes, not two
--   · a diagnosis that closes the smoke loop and never asks a question
--   · the pitch, the downsell and the upsells are unchanged
--
-- WHY A SEPARATE KEY FROM /fb. Exposures are unique(experiment_key, subject_id). A
-- separate key gives the home test its own exposure rows and its own read, so /fb and
-- home never share a subject row and can run side by side. Never reuse a concluded key.
--
-- WHY VISITOR-KEYED. B changes the step right after her NAME, before any email exists,
-- so this cannot bucket on the email hash. The denominator is chats started, not leads,
-- and the tally reaches the purchase through conversations.ab_visitor_id
-- (tallyV1MainByVisitor). It is NOT arm-for-arm comparable with email-keyed tests.
--
-- WHY funnel ["v1-home"]. The base V1 funnel has no URL prefix, so it has no FunnelParam
-- of its own (currentFunnel() is undefined for it). The server tags its chat-flow context
-- with the label 'v1-home' purely so this experiment's scope can match it — it is NEVER a
-- Stripe product suffix or an AWeber funnel id. The client gates the /api/home/chat-flow
-- call on getPostHogFunnel() === 'v1', so /fb2 and /gdn never enrol.
--
-- WHY targetN 9600. Same power math as /fb: ~1,600 leads per arm detects a ~30% lift in
-- buyers at today's ~11% buy rate; counted in chat starts at the ~33% chat→email rate,
-- that is ~4,800 chats per arm. 🔴 RE-CHECK on day 3 with the real base-V1 email rate and
-- reset targetN = 2 × 1,600 ÷ that rate (the home funnel's chat→email rate may differ
-- from /fb's).
--
-- 🔴 ORDER OF OPERATIONS:
--      1. merge + deploy the code (inert without this row: /api/home/chat-flow answers
--         'a' for everyone)
--      2. walk B on the live site with the preview link /chat?chatflow=b (forces B,
--         never logged, never counted)
--      3. this file (creates the DRAFT, still inert)
--      4. press Start in /admin/experiments
--
-- WHY A IS variants[0]. The control arm must be first: pickVariant walks the list in
-- listed order, so ramping B up only ever moves visitors A→B.
-- ============================================================================

-- ── 0. PRE-FLIGHT ───────────────────────────────────────────────────────────
-- Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status FROM experiments WHERE key = 'v1_home_chat_flow_2026';

-- What else is running (a chat-copy test on the base funnel must not already exist).
SELECT key, status, subject_type, scope->>'funnel' AS funnel
FROM experiments WHERE status = 'running' ORDER BY key;

-- ── 1. CREATE THE DRAFT ─────────────────────────────────────────────────────
BEGIN;
INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_home_chat_flow_2026',
  'Home chat: interview (A) vs reading (B)',
  'Which base V1 (home) chat sells more. A (control) is today''s home chat: seven '
  'questions after the email before the offer. B is the reading flow (the same one as '
  '/fb''s v1_fb_chat_flow_2026): a candle-and-name-number reading after her name, then '
  'three reading steps that each tell her something from her own words before asking, one '
  'yes instead of two, and a diagnosis that closes the candle loop. Pitch, downsell and '
  'upsells unchanged. Assigned at chat start on the ab_vid cookie, so the denominator is '
  'chats started.',
  'draft',
  'visitor',
  -- 🔴 A FIRST. variants[0] is the control arm.
  '[
     {"key": "A", "weight": 50, "payload": {}},
     {"key": "B", "weight": 50, "payload": {"flow": "b"}}
   ]'::jsonb,
  '{"funnel": ["v1-home"]}'::jsonb,
  '{"type": "v1_main_funnel", "windowDays": 7, "targetN": 9600}'::jsonb
);
COMMIT;

-- ── 2. VERIFY ───────────────────────────────────────────────────────────────
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments WHERE key = 'v1_home_chat_flow_2026';
