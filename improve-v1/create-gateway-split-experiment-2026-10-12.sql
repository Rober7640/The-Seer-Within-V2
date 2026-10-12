-- ============================================================================
-- CREATE the live Stripe-vs-Payments.AI split — v1_gateway_split_2026
-- 2026-10-12 · Lewis: 50/50 on the three landers with live FB traffic (Rubie):
--   /fb · /fb-tarot/c?hook=cards-meant-alone · /fb-tarot/c?hook=cards-come-back
--
--   key            v1_gateway_split_2026
--   variants       stripe w50 (CONTROL, first) / paymentsai w50
--   subject_type   email     ← hashEmail(email), assigned at the CHECKOUT CLICK
--   scope          funnel ["v1-fb","v1-tarot"] + freezeAssignment
--   conversion     gateway_split
--   status         DRAFT  ← inert. Every buyer pays on Stripe exactly as today.
--
-- WHICH LANDERS. scope.funnel is only the outer fence. The real list is the HARD
-- ALLOW-LIST in shared/paymentGateway.ts (PAI_ELIGIBLE_LANDERS): the other tarot
-- hooks on v1-tarot are never even considered, whatever this row says. Adding a
-- lander is a code change, on purpose — each one's lists, tags and bump key must be
-- checked on Payments.AI first.
--
-- PAUSE = EVERYONE ON STRIPE. Draft, paused and out-of-scope all serve arm 0. An
-- order already paid on Payments.AI keeps its upsells there (its card only exists
-- there) — that follows the order id, not this row.
--
-- 🔴 RUN ON DEV FIRST, THEN PROD. The databases are separate, so this row must be
--    created twice. On prod, ALSO run first (in this order):
--      improve-v1/add-payment-gateway-column-2026-09-18.sql   (prod has NOT had it)
--      improve-v1/add-payment-attempts-table-2026-10-12.sql
--    — BEFORE deploying the server that writes them.
--
-- 🔴 /start REFUSES unless this server has PAI_LIVE_ENABLED=1 + PAI_LIVE_API_KEY +
--    PAI_LIVE_ORG_ID (and arms are exactly stripe-first + paymentsai).
--
-- 🔴 DO NOT PRESS START ON PROD until Mike's n8n is registered on the PRODUCTION
--    Payments.AI account — otherwise a Payments.AI buyer pays and gets no PDF.
-- ============================================================================

-- ── 0. PRE-FLIGHT ───────────────────────────────────────────────────────────
-- Expect 0 rows. If a row exists, STOP: the key is taken.
SELECT key, status, scope, variants, started_at
FROM experiments
WHERE key = 'v1_gateway_split_2026';

-- ── 1. CREATE THE DRAFT — inert until it is started. ────────────────────────
BEGIN;

INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
VALUES (
  'v1_gateway_split_2026',
  'Payment gateway — Stripe vs Payments.AI',
  'Which processor takes the payment. stripe = today''s hosted Stripe checkout and '
  '1-click upsells, unchanged. paymentsai = a card form on our page (FramePay) and '
  '1-click upsells on the saved Payments.AI card; a declined upsell gets a card page '
  '(/pai/pay), as a declined Stripe upsell gets a hosted checkout. Assigned at the '
  'checkout click on the hashed email. Only the landers in PAI_ELIGIBLE_LANDERS '
  '(shared/paymentGateway.ts): /fb, /fb-tarot cards-meant-alone, cards-come-back. '
  'Report: revenue per checkout by stage, and approval rate per processor from '
  'payment_attempts. Pause = everyone on Stripe.',
  'draft',
  'email',
  -- 🔴 stripe FIRST — variants[0] is what draft / paused / out-of-scope serve.
  '[
     {"key": "stripe",     "weight": 50, "payload": {}},
     {"key": "paymentsai", "weight": 50, "payload": {}}
   ]'::jsonb,
  '{
     "funnel": ["v1-fb", "v1-tarot"],
     "freezeAssignment": true
   }'::jsonb,
  '{"type": "gateway_split", "windowDays": 7}'::jsonb
);

-- ⛔ Must report exactly 1 row. Anything else → ROLLBACK.
SELECT key, status, subject_type, variants, scope, conversion
FROM experiments
WHERE key = 'v1_gateway_split_2026';

-- Nothing may be enrolled yet — expect 0.
SELECT count(*) AS exposures_should_be_zero
FROM experiment_exposures
WHERE experiment_key = 'v1_gateway_split_2026';

COMMIT;
