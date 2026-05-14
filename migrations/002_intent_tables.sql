-- Migration 002: Persona Intent Configs & Conversation States Tables
-- Purpose: Per-persona intent system with conversation bucket tracking

-- Persona Intent Configs
CREATE TABLE IF NOT EXISTS persona_intent_configs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id VARCHAR NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,

  conversation_buckets TEXT NOT NULL,
  intents TEXT NOT NULL,
  character_rules TEXT NOT NULL,

  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persona_intent_configs_persona ON persona_intent_configs(persona_id, is_active, version);

-- Conversation States
CREATE TABLE IF NOT EXISTS conversation_states (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  persona_id VARCHAR NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  current_bucket TEXT,
  turn_count INTEGER NOT NULL DEFAULT 0,
  detected_intents TEXT,

  user_engagement TEXT NOT NULL DEFAULT 'medium',
  last_intent_confidence REAL NOT NULL DEFAULT 0.5,

  bucket_transitions TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_states_session ON conversation_states(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_states_user_persona ON conversation_states(user_id, persona_id, created_at);
