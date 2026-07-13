-- Sliding-scale close ($55 anchor / $35 grace) GO-LIVE — root + fb-palm, 50/50.
-- ⚠ RUN ONLY AFTER commit 36bb08f is deployed to production (the close copy +
-- choice card must be live before any visitor is assigned a 55-35 variant).
--
-- Changes vs the row as of 2026-07-13 (updated_at 2026-06-30):
--   • ROOT: '35' w0→w1 (control), NEW '55-35' w1 → 50/50. '45' stays w0 and its
--     CORRUPTED "down  sellCents" key is fixed (that corruption silently killed
--     the root $45 test — assignments fell back to $35/$25 while being labeled
--     '45', so the root price-test data since 6/30 is polluted).
--   • PALM: NEW '55-35_palm' w1 alongside '35_palm_u47' w1 → 50/50 (U1 held at
--     $47 on both arms).
--   • '45_fb2': corrupted "upsell1Ce  nts" key fixed (no behavior change — the
--     broken key already fell back to the same $47 default).
--   • fb / fb2 / gdn pools untouched.
--
-- Rollback: set the two 55-35 weights to 0 (new traffic reverts instantly;
-- already-assigned emails keep their sticky price). Config cache TTL is 60s.

UPDATE system_config
SET config_value = '{"variants":[
  {"id":"35","weight":1,"priceCents":3500,"downsellCents":2500},
  {"id":"45","weight":0,"priceCents":4500,"downsellCents":3200},
  {"id":"59","weight":0,"priceCents":5900,"downsellCents":4200},
  {"id":"55-35","weight":1,"priceCents":5500,"downsellCents":3500},
  {"id":"45_fb","funnel":"v1-fb","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_fb","funnel":"v1-fb","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"35_fb2","funnel":"v1-fb2","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"45_fb2","funnel":"v1-fb2","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_gdn","funnel":"v1-gdn","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"45_gdn","funnel":"v1-gdn","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_palm","funnel":"v1-palm","weight":0,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"35_palm_u47","funnel":"v1-palm","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":4700},
  {"id":"45_palm","funnel":"v1-palm","weight":0,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"55-35_palm","funnel":"v1-palm","weight":1,"priceCents":5500,"downsellCents":3500,"upsell1Cents":4700}
]}',
    updated_at = now()
WHERE config_key = 'v1_price_variants';
