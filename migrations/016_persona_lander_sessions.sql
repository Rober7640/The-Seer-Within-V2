-- Migration 016: Persona Lander Sessions (generalized)
-- Purpose: ONE shared table backing the chat landers for every additional persona
-- (Marcus, Luna, Nova, Maren, ...). Same shape as evelyn_lander_sessions plus a
-- persona_slug discriminator, so a single engine/route/admin view serves them all.
-- Evelyn and Aiden keep their own dedicated tables untouched.

CREATE TABLE IF NOT EXISTS persona_lander_sessions (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token   TEXT NOT NULL UNIQUE,

  -- Which persona's lander this visit belongs to (personas.slug)
  persona_slug        TEXT NOT NULL,

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

  -- Fraud / analytics signals
  ip_address          TEXT,
  user_agent          TEXT,

  started_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  cta_clicked_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_persona_lander_user
  ON persona_lander_sessions (resolved_user_id);

CREATE INDEX IF NOT EXISTS idx_persona_lander_persona
  ON persona_lander_sessions (persona_slug, started_at);

CREATE INDEX IF NOT EXISTS idx_persona_lander_segment
  ON persona_lander_sessions (resolved_segment, started_at);
