-- ============================================================================
-- CREATE the /fb CHAT FLOW experiment: today's interview vs the reading flow
-- 2026-11-21 · Spec + copy: docs/superpowers/specs/2026-11-21-v1-fb-chat-flow-2026.md
--
--   key            v1_fb_chat_flow_2026
--   variants       A w50 (CONTROL, {}) / B w50 ({"flow":"b"})
--   subject_type   visitor   ← the ab_vid cookie, assigned at CHAT START
--   scope          funnel ["v1-fb"]   (/fb only; lanes never ask, see the client)
--   conversion     v1_main_funnel, windowDays 7, targetN 4800 (PER ARM, see below)
--   status         DRAFT  ← inert. Nobody is enrolled; every woman gets today's chat.
--
-- WHAT B CHANGES (chat only, never a price, line item or CTA):
--   · after her name: the candle bends and smokes + her name's number, instead of
--     "It's lovely to meet you"
--   · topic lines pick up the smoke instead of "a flicker of shadow"
--   · after the email: three reading steps that each TELL her something from her own
--     words before asking (what's happening / what's in the way / where it comes from),
--     instead of seven questions; no "not enough" pushbacks; one yes, not two
--   · a diagnosis that closes the smoke loop and never asks a question
--   · the pitch, the downsell and the upsells are unchanged
--
-- WHY VISITOR-KEYED. B changes the step right after her NAME, before any email exists,
-- so this cannot bucket on the email hash. The denominator is chats started, not
-- leads, and the tally reaches the purchase through conversations.ab_visitor_id
-- (tallyV1MainByVisitor). It is NOT arm-for-arm comparable with email-keyed tests.
--
-- WHY targetN 4800. targetN is the PER-ARM exposure count (the gate compares the SMALLEST
-- arm to it). ~1,600 leads per arm detects a ~30% lift in buyers at today's
-- ~11% buy rate. Counted in chat starts, at the ~33% chat-start → email rate measured
-- on the tarot chat-start test (v1_tarot_version_bc_2026), that is ~4,800 chats per
-- arm. /fb gives ~100 leads/day ≈ 300 chat starts/day, so ~5 weeks. 🔴 RE-CHECK on
-- day 3 with the arm read (~/tsw-convo-flow/scripts/fb-flow-stats.mjs): set
-- targetN = 1,600 ÷ /fb's real email rate (per arm). The live row was first created with
-- 9600 (a total, by mistake). A started test's conversion is locked, so it stays 9600;
-- the real stopping point is 4,800 per arm, declared via the API with force:true.
--
-- 🔴 ORDER OF OPERATIONS:
--      1. merge + deploy the code (inert without this row: /api/fb/chat-flow answers
--         'a' for everyone)
--      2. walk B on the live site with the preview link /fb/chat?chatflow=b (forces B,
--         never logged, never counted)
--      3. this file (creates the DRAFT, still inert)
--      4. press Start in /admin/experiments
--
-- WHY A IS variants[0]. The control arm must be first: pickVariant walks the list in
-- listed order, so ramping B up only ever moves visitors A→B.
-- WHY A NEW KEY: exposures are unique(experiment_key, subject_id), so a key can only
-- ever host ONE run. Never reuse a concluded key.
-- ============================================================================

-- ── 0. PRE-FLIGHT ───────────────────────────────────────────────────────────
-- Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status FROM experiments WHERE key = 'v1_fb_chat_flow_2026';

-- What else is running on /fb (a chat-copy test on /fb must not already exist).
SELECT key, status, subject_type, scope->>'funnel' AS funnel
FROM experiments WHERE status = 'running' ORDER BY key;

-- ── 1. CREATE THE DRAFT ─────────────────────────────────────────────────────
BEGIN;
INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_fb_chat_flow_2026',
  '/fb chat: interview (A) vs reading (B)',
  'Which /fb chat sells more. A (control) is today''s chat: seven questions after the '
  'email before the offer. B is the reading flow: a candle-and-name-number reading '
  'after her name, then three reading steps that each tell her something from her own '
  'words before asking, one yes instead of two, and a diagnosis that closes the candle '
  'loop. Pitch, downsell and upsells unchanged. Assigned at chat start on the ab_vid '
  'cookie, so the denominator is chats started.',
  'draft',
  'visitor',
  -- 🔴 A FIRST. variants[0] is the control arm.
  '[
     {"key": "A", "weight": 50, "payload": {}},
     {"key": "B", "weight": 50, "payload": {"flow": "b"}}
   ]'::jsonb,
  '{"funnel": ["v1-fb"]}'::jsonb,
  '{"type": "v1_main_funnel", "windowDays": 7, "targetN": 4800}'::jsonb
);
COMMIT;

-- ── 2. VERIFY ───────────────────────────────────────────────────────────────
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments WHERE key = 'v1_fb_chat_flow_2026';
