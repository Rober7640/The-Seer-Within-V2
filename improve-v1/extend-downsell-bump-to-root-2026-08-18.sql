-- ============================================================================
-- Widen the DOWNSELL BUMP PRICE test to ROOT V1
-- 2026-08-18 · specs: 2026-08-18-root-gate-bump-port-design.md §5
--                     2026-08-16-v1-downsell-bump.md
--
-- Root joins the EXISTING tarot row rather than getting one of its own. Root
-- produces ~2 downsell buyers/month; a root-only split is one buyer per arm per
-- month, which is not a weak test but an unreadable one. Root's downsell is $25
-- like tarot's, so the proportional-parity argument ($9.77 = 39.1% of $25 against
-- $12.77's 51.1%) carries over unchanged.
--
-- ⚠ THIS CHANGES NOTHING TODAY. The row is `draft`, and a draft yields control
--   for everyone. It stays draft after this file runs.
--
-- 🔴 DO NOT START THIS ROW. Not on root, not on tarot. Known billing bug, found
--    2026-08-17 and browser-verified: arm A would SHOW her $9.77 and CHARGE her
--    $12.77. /api/checkout resolves the real arm (routes.ts:826-831) but
--    /api/lead never sends `bumpCentsDownsell` (absent from the response built at
--    routes.ts:1355-1371), so BumpOfferCard is pinned to the $9.77 fallback. The
--    two agree only while the row is draft and both sides fall back to $9.77.
--    Starting the row is what breaks them apart.
--
--    The fix is the shape bumpCopy already uses: resolve the arm at lead capture,
--    return it on /api/lead, capture it client-side. Fix that, then start this.
--    Note resolveV1DownsellBumpPrice logs NO exposure today
--    (experiments.ts:1547-1558), so the row has no denominator until the same fix
--    supplies one.
--
-- 🔴 RUN IT TWICE — once on DEV, once on PROD.
-- ============================================================================

-- ── 0. PRE-FLIGHT — expect 1 row, status 'draft', scope.funnel ["v1-tarot"]. ─
SELECT key, status, scope, variants, conversion
FROM experiments
WHERE key = 'v1_downsell_bump_price_2026';

-- ── 1. WIDEN THE SCOPE. Status untouched. ───────────────────────────────────
BEGIN;

UPDATE experiments
SET scope = jsonb_set(scope, '{funnel}', '["v1-tarot","v1-root"]'::jsonb),
    updated_at = now()
WHERE key = 'v1_downsell_bump_price_2026'
  AND status = 'draft';   -- refuses to touch a row someone has already started

-- Expect 1 row: status STILL 'draft', two funnels.
SELECT key, status, scope->'funnel' AS funnels
FROM experiments WHERE key = 'v1_downsell_bump_price_2026';

COMMIT;

-- ── 2. ROLLBACK ─────────────────────────────────────────────────────────────
-- UPDATE experiments SET scope = jsonb_set(scope, '{funnel}', '["v1-tarot"]'::jsonb),
--        updated_at = now()
-- WHERE key = 'v1_downsell_bump_price_2026';
