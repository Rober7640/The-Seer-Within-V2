-- Migration 013: Evelyn Follow-Up Emails
-- Purpose: Two-track nurture drips for /evelyn lander signups.
--   Track 1 'unverified'         : +10m / +24h / +48h from lander signup
--   Track 2 'verified_nopurchase': +1h  / +25h / +49h from verification
-- Mirrors the aiden_followup_emails table in shape but is independent
-- (different persona, different scheduling triggers, different env-flag gates).

CREATE TABLE IF NOT EXISTS evelyn_followup_emails (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  sequence_type   TEXT NOT NULL DEFAULT 'unverified',
  sequence_number INTEGER NOT NULL,
  scheduled_for   TIMESTAMP NOT NULL,

  recipient_email TEXT NOT NULL,
  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,
  body_text       TEXT NOT NULL,

  status          TEXT NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMP,
  resend_email_id TEXT,

  attempt_count   INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,

  opened_at       TIMESTAMP,
  clicked_at      TIMESTAMP,

  unsubscribe_token TEXT UNIQUE,

  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evelyn_followup_user_seq
  ON evelyn_followup_emails (user_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_evelyn_followup_status_scheduled
  ON evelyn_followup_emails (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_evelyn_followup_type_status_scheduled
  ON evelyn_followup_emails (sequence_type, status, scheduled_for);
