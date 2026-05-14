-- Down migration for 014_email_suppression.sql

DROP INDEX IF EXISTS "idx_email_suppression_suppressed_at";

DROP TABLE IF EXISTS "email_suppression";
