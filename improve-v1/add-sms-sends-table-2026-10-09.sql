-- sms_sends — one row per text the SMS sender has sent or tried to send
-- (server/lib/smsSender.ts). Written BEFORE the Twilio call; (phone, step) is
-- unique, so no number can ever get the same text twice.
--
-- SAFETY. CREATE TABLE IF NOT EXISTS — a brand-new table, nothing existing is
-- altered, no lock on any live table. Safe to re-run.
--
-- ORDER. Run this BEFORE turning SMS_SENDING_ENABLED on for a server. (If it is
-- missing, the sender logs an error each tick and sends nothing.)
--
-- 🔴 DEV ONLY for now (9 Oct 2026). Not for production until go-live is approved.

BEGIN;

CREATE TABLE IF NOT EXISTS sms_sends (
  id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id  varchar NOT NULL,
  phone       text NOT NULL,
  step        integer NOT NULL,
  status      text NOT NULL,
  body        text,
  twilio_sid  text,
  error_code  text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_sends_phone_step
  ON sms_sends (phone, step);
CREATE INDEX IF NOT EXISTS idx_sms_sends_consent
  ON sms_sends (consent_id);

-- Phone numbers: keep them off Supabase's public REST API (same as sms_consents).
ALTER TABLE sms_sends ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ── Verification (expect 11 columns, and relrowsecurity = true) ───────────────
--   SELECT count(*) FROM information_schema.columns WHERE table_name = 'sms_sends';
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'sms_sends';
