-- ============================================================================
-- /fb chat-flow (v1_fb_chat_flow_2026) — PLAIN vs LANE breakdown.
-- Read-only. Answers "how many plain /fb vs /fb-with-a-lane, per arm, and how each
-- does", which the /admin/experiments pooled results do NOT separate.
--
--   psql "$DATABASE_URL" -f improve-v1/fb-chat-flow-lane-stats.sql
--
-- 🔴 FORWARD-ONLY. The lane is written onto the exposure at chat start only since the
-- "tag the chat-flow exposure with the belief lane" change deployed — exposures logged
-- before it have no lane and show as "(plain /fb)". Real lane rows need live ad traffic
-- on /fb?lane=…; until then expect mostly "(plain /fb)".
--
-- Buyer/revenue definition is IDENTICAL to tallyV1MainByVisitor (the admin results):
-- a conversation on the same ab_visitor_id with main_paid_at set at/after the exposure.
-- Denominator = chats started (exposures), the experiment's own denominator.
--
-- ⚠️ Per-lane rows are DIAGNOSTIC, not a decision metric — same multiple-comparisons
-- caveat as the per-sign / per-lander splits. Judge the test on the pooled admin row;
-- read these for "where is the volume, and does a lane look different".
-- ============================================================================

-- ── 1. Per lane × arm ────────────────────────────────────────────────────────
SELECT
  COALESCE(e.context->>'lane', '(plain /fb)')                                   AS lane,
  e.variant                                                                     AS arm,
  count(*)                                                                      AS chats_started,
  count(*) FILTER (WHERE p.purchases > 0)                                       AS buyers,
  round(100.0 * count(*) FILTER (WHERE p.purchases > 0) / NULLIF(count(*), 0), 2) AS buy_rate_pct,
  COALESCE(sum(p.revenue), 0)                                                   AS revenue_cents
FROM experiment_exposures e
LEFT JOIN LATERAL (
  SELECT count(*)                                                                 AS purchases,
         COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents, 0)), 0) AS revenue
  FROM conversations c
  WHERE c.ab_visitor_id = e.subject_id
    AND c.main_paid_at IS NOT NULL
    AND c.main_paid_at >= e.created_at
) p ON true
WHERE e.experiment_key = 'v1_fb_chat_flow_2026'
GROUP BY lane, e.variant
ORDER BY lane, e.variant;

-- ── 2. Rollup: plain /fb vs ANY lane, per arm (the headline split) ────────────
SELECT
  CASE WHEN e.context->>'lane' IS NULL THEN 'plain /fb' ELSE 'lane' END         AS segment,
  e.variant                                                                     AS arm,
  count(*)                                                                      AS chats_started,
  count(*) FILTER (WHERE p.purchases > 0)                                       AS buyers,
  round(100.0 * count(*) FILTER (WHERE p.purchases > 0) / NULLIF(count(*), 0), 2) AS buy_rate_pct,
  COALESCE(sum(p.revenue), 0)                                                   AS revenue_cents
FROM experiment_exposures e
LEFT JOIN LATERAL (
  SELECT count(*)                                                                 AS purchases,
         COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents, 0)), 0) AS revenue
  FROM conversations c
  WHERE c.ab_visitor_id = e.subject_id
    AND c.main_paid_at IS NOT NULL
    AND c.main_paid_at >= e.created_at
) p ON true
WHERE e.experiment_key = 'v1_fb_chat_flow_2026'
GROUP BY segment, e.variant
ORDER BY segment, e.variant;
