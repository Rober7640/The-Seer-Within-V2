-- Migration 005: Fraud Detection & Device Tracking
-- Purpose: Add IP, fingerprint, user agent tracking to users table for fraud detection

-- Add fraud tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_user_agent TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_flags TEXT; -- JSON array: ["ip_flagged", "manual_review", etc.]

-- Indexes for fraud detection queries
CREATE INDEX IF NOT EXISTS idx_users_registration_ip ON users(registration_ip);
CREATE INDEX IF NOT EXISTS idx_users_device_fingerprint ON users(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_users_account_flags ON users(account_flags) WHERE account_flags IS NOT NULL AND account_flags != '[]';
CREATE INDEX IF NOT EXISTS idx_users_registration_ip_created ON users(registration_ip, created_at);
