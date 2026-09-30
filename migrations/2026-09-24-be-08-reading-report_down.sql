-- Rollback for 2026-09-24-be-08-reading-report.sql. Drops the single additive column.
-- Safe to re-run (IF EXISTS). ⛔ Destroys any saved structured reports in the column.
ALTER TABLE be_orders DROP COLUMN IF EXISTS reading_report;
