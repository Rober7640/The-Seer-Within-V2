-- Down migration 020: drop the email link codes table and the pending_reply column.
ALTER TABLE evelyn_lander_sessions DROP COLUMN IF EXISTS pending_reply;

DROP INDEX IF EXISTS uq_email_link_codes_persona_campaign;

DROP INDEX IF EXISTS idx_email_link_codes_campaign;

DROP TABLE IF EXISTS email_link_codes;
