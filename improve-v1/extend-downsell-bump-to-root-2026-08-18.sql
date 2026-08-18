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

-- jsonb_set on a NULL scope returns NULL (it is strict), which would silently
-- turn this row global instead of tarot+root-scoped — coalesce guards that.
-- Not reachable today (create-downsell-bump-price-experiment-2026-08-17.sql
-- inserts a genuine non-null scope), but if `scope` were ever cleared
-- out-of-band, a NULL write here would make matchesFunnelScope
-- (server/lib/experiments.ts:272) read it as "matches everyone" — priming the
-- row to enrol every funnel for whoever starts it later. Same guard as
-- ship-gate-bump-to-root-2026-08-18.sql.
UPDATE experiments
SET scope = jsonb_set(coalesce(scope, '{}'::jsonb), '{funnel}',
                       '["v1-tarot","v1-root"]'::jsonb, true),
    updated_at = now()
WHERE key = 'v1_downsell_bump_price_2026'
  AND status = 'draft';   -- refuses to touch a row someone has already started

-- ⛔ STOP AND READ: this must report exactly 1 row — status STILL 'draft',
--    scope.funnel = ["v1-tarot","v1-root"].
--    0 rows  = the guard above did not match: status was not 'draft', which
--              means someone already started this row (or it doesn't exist).
--              ROLLBACK and go find out who/why before deciding whether to
--              proceed. Do NOT relax the guard, and do NOT read "0 rows,
--              COMMIT ran fine" as success — it isn't.
--    >1 rows = impossible (key is unique) → ROLLBACK immediately.
SELECT key, status, scope->'funnel' AS funnels
FROM experiments WHERE key = 'v1_downsell_bump_price_2026';

COMMIT;

-- ── 2. ROLLBACK ─────────────────────────────────────────────────────────────
-- BEGIN;
-- UPDATE experiments
-- SET scope      = jsonb_set(coalesce(scope, '{}'::jsonb), '{funnel}',
--                             '["v1-tarot"]'::jsonb, true),
--     updated_at = now()
-- WHERE key    = 'v1_downsell_bump_price_2026'
--   AND status = 'draft';
-- SELECT key, status, scope->'funnel' AS funnels
-- FROM experiments WHERE key = 'v1_downsell_bump_price_2026';
-- COMMIT;
