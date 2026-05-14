-- Down migration for aiden_followup_emails

DROP INDEX IF EXISTS "idx_aiden_followup_status_scheduled";
DROP INDEX IF EXISTS "idx_aiden_followup_user_seq";
DROP TABLE IF EXISTS "aiden_followup_emails";
