-- Migration 012: Evelyn Lander Sessions
-- Purpose: Track each visit to /evelyn for analytics and post-CTA segment routing.
-- Mirrors aiden_quiz_sessions in shape but the lander flow is a chat, not a quiz.

CREATE TABLE IF NOT EXISTS evelyn_lander_sessions (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token   TEXT NOT NULL UNIQUE,

  -- Resolved segment from URL params + DB lookup
  -- 'v2_active' | 'v2_password' | 'v1_migrated' | 'brand_new' | 'token_magic'
  resolved_segment    TEXT NOT NULL,
  resolved_user_id    VARCHAR REFERENCES users(id) ON DELETE SET NULL,

  -- Inputs (param-derived; email is hashed for analytics, raw value never stored)
  email_param_hash    TEXT,
  bucket              TEXT,
  src                 TEXT,
  campaign            TEXT,
  had_token           BOOLEAN NOT NULL DEFAULT FALSE,

  -- Funnel progress
  turn_count          INTEGER NOT NULL DEFAULT 0,
  cta_clicked         BOOLEAN NOT NULL DEFAULT FALSE,
  cta_action          TEXT,

  -- Fraud / analytics signals (mirrors aiden_quiz_sessions)
  ip_address          TEXT,
  user_agent          TEXT,

  started_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  cta_clicked_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evelyn_lander_user
  ON evelyn_lander_sessions (resolved_user_id);

CREATE INDEX IF NOT EXISTS idx_evelyn_lander_segment
  ON evelyn_lander_sessions (resolved_segment, started_at);
