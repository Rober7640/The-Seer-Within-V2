-- Rollback Migration 002: Persona Intent Configs & Conversation States Tables

DROP INDEX IF EXISTS idx_conversation_states_user_persona;
DROP INDEX IF EXISTS idx_conversation_states_session;
DROP TABLE IF EXISTS conversation_states;

DROP INDEX IF EXISTS idx_persona_intent_configs_persona;
DROP TABLE IF EXISTS persona_intent_configs;
