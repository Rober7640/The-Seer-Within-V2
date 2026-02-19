-- Rollback Migration 003: Follow-Up Emails & User Follow-Up Preferences Tables

DROP INDEX IF EXISTS idx_user_follow_up_prefs_enabled;
DROP TABLE IF EXISTS user_follow_up_preferences;

DROP INDEX IF EXISTS idx_follow_up_emails_status;
DROP INDEX IF EXISTS idx_follow_up_emails_user_persona;
DROP TABLE IF EXISTS follow_up_emails;
