-- Migration 017: Persona Follow-Up Emails (generalized verified-not-purchased drip)
-- Purpose: ONE shared table backing the 10-email nurture drip for every additional
-- persona (Marcus, Luna, Nova, Maren, ...), discriminated by persona_slug. Same shape
-- as evelyn_followup_emails so the admin view + processor stay uniform.
-- Evelyn and Aiden keep their own dedicated tables untouched.

CREATE TABLE IF NOT EXISTS persona_followup_emails (
  id                VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Which persona this nurture row belongs to (personas.slug)
  persona_slug      TEXT NOT NULL,

  -- Drip track discriminator (parity with evelyn/aiden tables)
  sequence_type     TEXT NOT NULL DEFAULT 'verified_nopurchase',

  sequence_number   INTEGER NOT NULL,            -- 1..10
  scheduled_for     TIMESTAMP NOT NULL,

  recipient_email   TEXT NOT NULL,
  subject           TEXT NOT NULL,
  body_html         TEXT NOT NULL,
  body_text         TEXT NOT NULL,

  status            TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, failed, skipped
  sent_at           TIMESTAMP,
  resend_email_id   TEXT,

  attempt_count     INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,

  opened_at         TIMESTAMP,
  clicked_at        TIMESTAMP,

  unsubscribe_token TEXT UNIQUE,

  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persona_followup_user_seq
  ON persona_followup_emails (user_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_persona_followup_status_scheduled
  ON persona_followup_emails (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_persona_followup_persona_status_scheduled
  ON persona_followup_emails (persona_slug, status, scheduled_for);
