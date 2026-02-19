-- Migration 006: Session Recovery - Persist credit tracking state in database
-- Purpose: Prevent revenue loss from server restarts by moving credit tracking
-- from in-memory to database persistence.

-- Add lastHeartbeatAt column to chat_sessions for tracking session activity
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP;

-- Backfill existing active sessions with updated_at as their last heartbeat
UPDATE chat_sessions
SET last_heartbeat_at = updated_at
WHERE status = 'active' AND ended_at IS NULL AND last_heartbeat_at IS NULL;

-- Index for efficiently finding active sessions and stale sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active_heartbeat
ON chat_sessions(status, last_heartbeat_at)
WHERE status = 'active' AND ended_at IS NULL;
