-- Migration 004: Email Verification
-- Purpose: Prevent unlimited free account creation by requiring email verification
-- before granting free credits. Adds verification token tracking to users table.

-- Add email verification columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMP;

-- Set existing users as verified (they registered before this feature)
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

-- New users default to 0 credits; credits are granted upon email verification.
-- Existing users already have their credits and are marked verified above.

-- Index for fast token lookup during verification
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
