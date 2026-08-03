-- ⚠⚠⚠ SUPERSEDED 2026-07-26 — DO NOT RUN THIS FILE ⚠⚠⚠
-- This migration is RETIRED. Running it now would silently revert the live
-- pool: it deletes the 35_palm_gate commitment-gate variant and restores
-- 55-35_palm to weight 1. The current migration is:
--     improve-v1/go-live-palm-gate-config.sql
-- This file is kept only as a historical record of the sliding-close go-live.
--

-- Sliding-scale close ($55 anchor / $35 grace) GO-LIVE — fb-palm THUMB ads, 50/50.
--
-- ⚠ SUPERSEDES the original 3d9a812 version of this file, which put the test on the
--   ROOT funnel AND on EVERY fb-palm sign. Both were changed on 2026-07-14:
--     • Joel (call, 7/14): "we should never put new tests onto a new lander… the one
--       that is getting the most traffic is still the thumb. The test should go on to
--       thumb, and then once Ruby has confirmed hand size or the decode-him or finger
--       shape is working, then we will make sure the test also goes to those."
--     • Lewis (7/14): root stays out of the test (~15 visitors/day → can never reach
--       significance, and it adds a second moving part during the palm run).
--
-- ⚠ RUN ONLY AFTER the sign-scoping build is deployed to production. The close copy,
--   the choice card, AND `signs` support must all be live before any visitor can be
--   assigned a 55-35 variant. If this SQL runs first:
--     • a build without the close shows anyone on 55-35 the CLASSIC close at $55 —
--       a flat $55 pitch with no grace option and no choice card; and
--     • a build without `signs` support ignores the key entirely and puts the test on
--       EVERY palm sign — exactly what the business said not to do.
--
-- ── What this does ─────────────────────────────────────────────────────────────
--   • PALM:  NEW '55-35_palm' w1 with "signs":["thumb"], alongside '35_palm_u47' w1.
--            → THUMB ads: 50/50 control vs sliding close.
--            → every other sign (hand-size, finger-shape, palms, …): 100% control —
--              a variant that declares `signs` is eligible ONLY for those signs, and
--              the unscoped control always stays in the pool.
--            Upsell 1 held at $47 on BOTH arms so it is not a second variable.
--
--   • ROOT:  NOT in the test. '55-35' is seeded at weight 0 so the arm exists and can
--            be switched on later with a weight flip alone.
--            Root IS cleaned up: '45' w1→w0, '35' w0→w1. Root has been serving
--            $35/$25 while LABELLED '45' ever since its "down  sellCents" key was
--            corrupted (the old validator let it through, NULL landed on the row, and
--            getVariantForEmail fell back to $35/$25 — the root $45 test has been dead
--            for two weeks and its data is polluted).
--            ⚠ This is NOT a price change for real root visitors — they are already
--              paying $35/$25. It only stops the data being a lie.
--
--   • '45_fb2': corrupted "upsell1Ce  nts" key fixed (no behaviour change — the broken
--            key already fell back to the same $47 default).
--
--   • fb / fb2 / gdn pools: untouched.
--
-- ── Extending the test to another sign (no code, no deploy) ────────────────────
-- Once Ruby confirms a lander converts, append it to the array:
--     "signs":["thumb","hand-size"]
-- New traffic on that sign joins the 50/50 within 60s (config cache TTL). Already-
-- assigned visitors keep their sticky price.
--
-- ── Rollback ──────────────────────────────────────────────────────────────────
-- Set the '55-35_palm' weight to 0. New traffic reverts within 60s; already-assigned
-- buyers keep the price they were quoted (sticky by design — a visitor's price must
-- never flip mid-funnel).
--
-- ── Verify, immediately after running ─────────────────────────────────────────
--   1. Railway PROD logs → `priceVariant: assigned`. Every hit with
--      variant=55-35_palm MUST carry sign=thumb. Any other sign = contamination.
--   2. /admin/price-test must report variantsSource: "db" (NOT "env" — "env" would
--      mean the dev override is switched on in production).
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
  {"id":"35_palm_u47","funnel":"v1-palm","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":4700},
  {"id":"45_palm","funnel":"v1-palm","weight":0,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"55-35_palm","funnel":"v1-palm","weight":1,"priceCents":5500,"downsellCents":3500,"upsell1Cents":4700,"signs":["thumb"]}
]}',
    updated_at = now()
WHERE config_key = 'v1_price_variants';


-- ── VERIFY (run a few minutes after the flip) ─────────────────────────────────
-- Expect a ~50/50 between 35_palm_u47 and 55-35_palm. The sign cannot be checked from
-- this table (there is no sign column) — use the Railway logs for that, per the header.
--
-- SELECT price_variant,
--        count(*)                          AS assigned,
--        min(price_amount_cents)           AS main_cents,
--        min(downsell_amount_cents)        AS grace_cents,
--        count(*) FILTER (WHERE purchased) AS buyers
-- FROM conversations
-- WHERE created_at > now() - interval '2 hours'
--   AND price_variant IN ('35_palm_u47', '55-35_palm')
-- GROUP BY 1
-- ORDER BY 1;
--
-- 🔴 A NULL grace_cents on 55-35_palm means the config key is corrupted and the $35
--    grace charge is broken. Roll back immediately (weight → 0).
