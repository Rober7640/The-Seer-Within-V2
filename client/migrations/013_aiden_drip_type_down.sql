-- Down migration for 013_aiden_drip_type.sql
-- Removes the sequence_type discriminator and its index.

DROP INDEX IF EXISTS "idx_aiden_followup_type_status_scheduled";

ALTER TABLE "aiden_followup_emails"
  DROP COLUMN IF EXISTS "sequence_type";
