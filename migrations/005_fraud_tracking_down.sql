-- Rollback Migration 005: Fraud Detection & Device Tracking

DROP INDEX IF EXISTS idx_users_registration_ip;
DROP INDEX IF EXISTS idx_users_device_fingerprint;
DROP INDEX IF EXISTS idx_users_account_flags;
DROP INDEX IF EXISTS idx_users_registration_ip_created;

ALTER TABLE users DROP COLUMN IF EXISTS registration_ip;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_ip;
ALTER TABLE users DROP COLUMN IF EXISTS registration_user_agent;
ALTER TABLE users DROP COLUMN IF EXISTS device_fingerprint;
ALTER TABLE users DROP COLUMN IF EXISTS account_flags;
