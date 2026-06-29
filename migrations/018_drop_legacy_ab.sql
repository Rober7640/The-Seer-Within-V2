-- Migration 018: drop the legacy A/B split-testing tables (Phase 5).
-- All A/B tests now run on experiments / experiment_exposures / experiment_conversions.
-- ab_events has an FK to ab_tests, so drop it first.
-- (paywall_views is intentionally NOT dropped — still used by tallyPaywall + a test.)
DROP TABLE IF EXISTS ab_events;
DROP TABLE IF EXISTS ab_tests;
