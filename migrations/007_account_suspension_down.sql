-- Migration 007 DOWN: Remove Account Suspension columns

DROP INDEX IF EXISTS idx_users_account_status_suspended_at;
DROP INDEX IF EXISTS idx_users_account_status;

ALTER TABLE users DROP COLUMN IF EXISTS suspended_by;
ALTER TABLE users DROP COLUMN IF EXISTS suspended_at;
ALTER TABLE users DROP COLUMN IF EXISTS suspension_reason;

-- Reset any non-active statuses back to active
UPDATE users SET account_status = 'active' WHERE account_status IN ('suspended', 'banned', 'flagged_for_review');
