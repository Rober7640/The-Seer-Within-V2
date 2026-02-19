-- Migration 003: Follow-Up Emails & User Follow-Up Preferences Tables
-- Purpose: Automated re-engagement email system with tracking and user preferences

-- Follow-Up Emails
CREATE TABLE IF NOT EXISTS follow_up_emails (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id VARCHAR NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  last_session_id VARCHAR REFERENCES chat_sessions(id) ON DELETE SET NULL,

  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivery_status TEXT,
  resend_email_id TEXT,

  opened BOOLEAN NOT NULL DEFAULT FALSE,
  clicked BOOLEAN NOT NULL DEFAULT FALSE,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,

  generated_by TEXT NOT NULL DEFAULT 'claude-haiku',
  generation_tokens INTEGER,
  days_since_last_session INTEGER,

  unsubscribe_token TEXT NOT NULL UNIQUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_emails_user_persona ON follow_up_emails(user_id, persona_id, created_at);
CREATE INDEX IF NOT EXISTS idx_follow_up_emails_status ON follow_up_emails(status, sent_at);

-- User Follow-Up Preferences
CREATE TABLE IF NOT EXISTS user_follow_up_preferences (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  enable_follow_ups BOOLEAN NOT NULL DEFAULT TRUE,
  follow_up_days INTEGER NOT NULL DEFAULT 2,
  max_follow_ups_per_month INTEGER NOT NULL DEFAULT 4,

  follow_ups_sent_this_month INTEGER NOT NULL DEFAULT 0,
  last_follow_up_sent_at TIMESTAMP,

  unsubscribed_at TIMESTAMP,
  unsubscribe_reason TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_follow_up_prefs_enabled ON user_follow_up_preferences(enable_follow_ups, last_follow_up_sent_at);
