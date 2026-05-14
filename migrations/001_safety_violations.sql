-- Migration 001: Safety Violations Table
-- Purpose: Universal safety logging for crisis, inappropriate content, prompt injection, harassment, gibberish

CREATE TABLE IF NOT EXISTS safety_violations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR REFERENCES chat_sessions(id) ON DELETE SET NULL,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  persona_id VARCHAR REFERENCES personas(id) ON DELETE SET NULL,

  violation_type TEXT NOT NULL,
  user_message TEXT NOT NULL,
  system_response TEXT NOT NULL,

  ip_address TEXT,
  user_agent TEXT,

  flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at TIMESTAMP,
  review_notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_safety_violations_user_created ON safety_violations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_safety_violations_type_created ON safety_violations(violation_type, created_at);
CREATE INDEX IF NOT EXISTS idx_safety_violations_flagged ON safety_violations(flagged_for_review, created_at);
