-- Down migration 017: drop the generalized persona follow-up emails table.
DROP INDEX IF EXISTS idx_persona_followup_persona_status_scheduled;
DROP INDEX IF EXISTS idx_persona_followup_status_scheduled;
DROP INDEX IF EXISTS idx_persona_followup_user_seq;
DROP TABLE IF EXISTS persona_followup_emails;
