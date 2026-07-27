-- Migration 019: Reliable server-side "front-end payment completed" signal.
-- Purpose: the /admin/price-test dashboard counts a front-end sale via
--   purchased = true AND upsell_offered = true
-- but upsell_offered only flips when the buyer's BROWSER reaches /welcome1 after
-- paying. Buyers who pay then close the tab (common on mobile FB traffic) are
-- real Stripe revenue that never gets flagged, so the dashboard under-counts the
-- main line by ~30% vs Stripe. This column is stamped by the
-- checkout.session.completed webhook (server-side, browser-independent) so the
-- paid count matches Stripe. Nullable/additive: existing rows keep the legacy
-- signal until a one-time backfill; no table rewrite, no lock, no backfill here.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS main_paid_at timestamp;
