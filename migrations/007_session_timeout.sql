-- Migration 007: Per-Persona Session Timeout
-- Purpose: Add configurable session timeout per persona/advisor.
-- Sessions that exceed the timeout without activity are auto-ended.

-- Add sessionTimeoutMinutes column to personas (default 30 minutes)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER NOT NULL DEFAULT 30;
