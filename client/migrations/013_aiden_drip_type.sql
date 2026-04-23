-- Add sequence_type discriminator to aiden_followup_emails so the same table
-- can hold both the existing unverified drip (+10m/+24h/+48h) and the new
-- "verified, not purchased" drip (+1h/+25h/+49h).
--
-- Default 'unverified' preserves behavior for all existing rows.
-- The new verified_nopurchase drip is flag-gated behind ENABLE_AIDEN_VERIFIED_DRIP.

ALTER TABLE "aiden_followup_emails"
  ADD COLUMN IF NOT EXISTS "sequence_type" TEXT NOT NULL DEFAULT 'unverified';

-- Queries filter by (sequence_type, status, scheduled_for) when picking ripe rows.
CREATE INDEX IF NOT EXISTS "idx_aiden_followup_type_status_scheduled"
  ON "aiden_followup_emails" ("sequence_type", "status", "scheduled_for");
