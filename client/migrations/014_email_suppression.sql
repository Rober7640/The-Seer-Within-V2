-- Central email suppression list — single source of truth for every email that
-- has opted out, regardless of source (our own token-click unsubs, Resend
-- bounces, Resend spam complaints, public partner unsubs at /unsubscribe).
--
-- Used for CAN-SPAM compliance exports to partners (GPBL / Jade) and kept
-- independent of our per-user userFollowUpPreferences flag so we can suppress
-- emails that don't map to any Seer Within user account.

CREATE TABLE IF NOT EXISTS "email_suppression" (
  "id"             VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"          TEXT NOT NULL UNIQUE,
  "reason"         TEXT NOT NULL,
  "source"         TEXT NOT NULL,
  "user_id"        VARCHAR REFERENCES "users"("id") ON DELETE SET NULL,
  "suppressed_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_email_suppression_suppressed_at"
  ON "email_suppression" ("suppressed_at");
