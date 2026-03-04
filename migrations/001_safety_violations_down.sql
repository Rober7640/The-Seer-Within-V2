-- Rollback Migration 001: Safety Violations Table

DROP INDEX IF EXISTS idx_safety_violations_flagged;
DROP INDEX IF EXISTS idx_safety_violations_type_created;
DROP INDEX IF EXISTS idx_safety_violations_user_created;
DROP TABLE IF EXISTS safety_violations;
