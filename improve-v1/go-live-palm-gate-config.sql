-- fb-palm commitment-gate A/B test GO-LIVE — every fb-palm sign, 70/30.
--
-- ⚠ SUPERSEDES improve-v1/go-live-55-35-config.sql for the palm portion of the
--   pool. The $55/$35 sliding close ('55-35_palm') is RETIRED (parked at
--   weight 0, not deleted — same convention as the root '45'/'59'/'55-35'
--   rows) and replaced by a new checkbox commitment-gate arm ('35_palm_gate').
--
-- ── What this does ─────────────────────────────────────────────────────────
--   • PALM: '55-35_palm' w1→w0 (retired). '35_palm_u47' w1→w70. NEW
--     '35_palm_gate' w30, SAME economics as the control ($35/$25/$47 U1), no
--     `signs` scoping — unlike the old sliding close, this runs on EVERY
--     fb-palm sign, including thumb-angle (which is mid-way through its own,
--     separate $55/$35 test via the newer experiment framework — the overlap
--     is an accepted operator decision, 2026-07-26, not an oversight).
--     → EVERY palm sign: 70% control / 30% commitment-gate.
--     Upsell 1 held at $47 on both arms so it is not a second variable.
--
--   • Already-assigned visitors are unaffected: getVariantForEmail reads the
--     price/variant already persisted on their conversation row, never the
--     live pool — so this flip cannot change anyone's price mid-funnel.
--
--   • root / fb / fb2 / gdn pools: untouched.
--
-- ── Rollback ──────────────────────────────────────────────────────────────
-- Set '35_palm_gate' weight to 0. New traffic reverts to 100% control within
-- 60s (config cache TTL); already-assigned buyers keep the price/UI they were
-- shown (sticky by design).
--
-- ── Verify, immediately after running ──────────────────────────────────────
--   1. Railway PROD logs → `priceVariant: assigned`. Confirm both
--      35_palm_u47 and 35_palm_gate appear across multiple signs, not just
--      thumb.
--   2. /admin/price-test must report variantsSource: "db" (NOT "env").
--   3. The split query at the bottom of this file.

UPDATE system_config
SET config_value = '{"variants":[
  {"id":"35","weight":1,"priceCents":3500,"downsellCents":2500},
  {"id":"45","weight":0,"priceCents":4500,"downsellCents":3200},
  {"id":"59","weight":0,"priceCents":5900,"downsellCents":4200},
  {"id":"55-35","weight":0,"priceCents":5500,"downsellCents":3500},
  {"id":"45_fb","funnel":"v1-fb","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_fb","funnel":"v1-fb","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"35_fb2","funnel":"v1-fb2","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"45_fb2","funnel":"v1-fb2","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_gdn","funnel":"v1-gdn","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"45_gdn","funnel":"v1-gdn","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_palm","funnel":"v1-palm","weight":0,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"35_palm_u47","funnel":"v1-palm","weight":70,"priceCents":3500,"downsellCents":2500,"upsell1Cents":4700},
  {"id":"45_palm","funnel":"v1-palm","weight":0,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"55-35_palm","funnel":"v1-palm","weight":0,"priceCents":5500,"downsellCents":3500,"upsell1Cents":4700,"signs":["thumb"]},
  {"id":"35_palm_gate","funnel":"v1-palm","weight":30,"priceCents":3500,"downsellCents":2500,"upsell1Cents":4700}
]}',
    updated_at = now()
WHERE config_key = 'v1_price_variants';


-- ── VERIFY (run a few minutes after the flip) ─────────────────────────────
-- Expect a ~70/30 between 35_palm_u47 and 35_palm_gate, across every sign.
--
-- SELECT price_variant,
--        count(*)                          AS assigned,
--        min(price_amount_cents)           AS main_cents,
--        min(downsell_amount_cents)        AS downsell_cents,
--        count(*) FILTER (WHERE purchased) AS buyers
-- FROM conversations
-- WHERE created_at > now() - interval '2 hours'
--   AND price_variant IN ('35_palm_u47', '35_palm_gate')
-- GROUP BY 1
-- ORDER BY 1;
