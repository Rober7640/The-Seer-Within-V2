-- ============================================================================
-- /fb ORDER BUMP TEST — plain $35 vs $35 + $12.77 Double-Strength Clearing, 50/50
-- 2026-10-13 · Joel's ask (call 13 Oct), built by Lewis's side. Creates a DRAFT.
--
-- Draft = inert: resolveV1Bump returns bump:false for /fb until this row is
-- STARTED from /admin/experiments. Run on DEV first, then PROD, each BEFORE
-- pressing Start there (the code is harmless without the row, and vice versa).
--
-- Arms (same payload shapes as the live bump tests — nothing new):
--   A = {}                          → no bump, today's /fb checkout (control)
--   B = {"bump":true,"copy":"A"}    → the bump with the EXACT copy /fb-tarot serves
--       today: v1_bump_copy_2026 concluded winner B = payload copy "A" =
--       "+ Double-Strength Clearing" (shared/orderBump.ts bumpCopy('A')).
--       Mike 13 Oct: nothing is fulfilled for it ⇒ no n8n change.
--
-- Prerequisite: /fb price split stopped (45_fb weight 0) — done on PROD 13 Oct
-- 03:57 UTC, so every /fb main order is $35 and arm B tops out at $47.77.
-- ============================================================================

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
SELECT
  'v1_fb_order_bump_2026',
  'V1 /fb Order Bump — none vs Double-Strength Clearing ($12.77)',
  'Joel 13 Oct: /fb only, 50/50. A = no bump (today''s /fb checkout). B = the $12.77 bump with the exact copy /fb-tarot serves today ("+ Double-Strength Clearing", copy arm A — the winner of v1_bump_copy_2026). Own key so palm/tarot/read keep their concluded bump untouched.',
  'draft',
  'email',
  '[{"key":"A","weight":50,"payload":{}},{"key":"B","weight":50,"payload":{"bump":true,"copy":"A"}}]'::jsonb,
  '{"funnel":["v1-fb"],"freezeAssignment":true}'::jsonb,
  '{"type":"v1_main_funnel","targetN":1200,"windowDays":7}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM experiments WHERE key = 'v1_fb_order_bump_2026');
-- EXPECT: INSERT 0 1 (or INSERT 0 0 if it already exists — then inspect, don't re-run blindly)

SELECT key, status, variants::text, scope::text, conversion::text
FROM experiments WHERE key = 'v1_fb_order_bump_2026';
-- EXPECT: 1 row, status draft, scope funnel ["v1-fb"] only.
