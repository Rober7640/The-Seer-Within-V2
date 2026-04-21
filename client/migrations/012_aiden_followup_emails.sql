-- Aiden Follow-Up Emails — nurture sequence for unverified /aiden signups
-- +10min / +24h / +48h. Flag-gated behind ENABLE_AIDEN_FOLLOWUPS.
-- Rows are inserted at /magic-register time. Cron processes ripe rows.
-- Sending is suppressed if the user verifies, unsubscribes, or the window passes stale.

CREATE TABLE IF NOT EXISTS "aiden_followup_emails" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

  "sequence_number" integer NOT NULL,                       -- 1, 2, or 3
  "scheduled_for" timestamp NOT NULL,

  "recipient_email" text NOT NULL,
  "subject" text NOT NULL,
  "body_html" text NOT NULL,
  "body_text" text NOT NULL,

  "status" text NOT NULL DEFAULT 'pending',                 -- pending | sent | failed | skipped
  "sent_at" timestamp,
  "resend_email_id" text,

  "attempt_count" integer NOT NULL DEFAULT 0,
  "error_message" text,

  "opened_at" timestamp,
  "clicked_at" timestamp,

  "unsubscribe_token" text UNIQUE,

  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_aiden_followup_user_seq"
  ON "aiden_followup_emails" ("user_id", "sequence_number");

CREATE INDEX IF NOT EXISTS "idx_aiden_followup_status_scheduled"
  ON "aiden_followup_emails" ("status", "scheduled_for");
