-- Down migration 016: drop the generalized persona lander sessions table.
DROP INDEX IF EXISTS idx_persona_lander_segment;
DROP INDEX IF EXISTS idx_persona_lander_persona;
DROP INDEX IF EXISTS idx_persona_lander_user;
DROP TABLE IF EXISTS persona_lander_sessions;
