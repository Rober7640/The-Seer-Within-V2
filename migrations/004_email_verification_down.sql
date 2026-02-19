-- Rollback Migration 004: Email Verification

DROP INDEX IF EXISTS idx_users_verification_token;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS verification_token;
ALTER TABLE users DROP COLUMN IF EXISTS verification_token_expiry;
