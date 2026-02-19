-- Migration 007: Account Suspension System
-- Adds columns to the users table for suspension/ban tracking

-- Add suspension tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by VARCHAR REFERENCES admin_users(id) ON DELETE SET NULL;

-- Add index on account_status for efficient filtering of suspended/banned users
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- Add composite index for admin dashboard queries (status + date)
CREATE INDEX IF NOT EXISTS idx_users_account_status_suspended_at ON users(account_status, suspended_at)
  WHERE account_status IN ('suspended', 'banned', 'flagged_for_review');
