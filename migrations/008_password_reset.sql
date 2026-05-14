-- Migration 008: Password Reset
-- Purpose: Add password reset flow columns to users table.
-- Allows users who are locked out to recover their account via email.

-- Add password reset columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Index for fast token lookup during password reset
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
