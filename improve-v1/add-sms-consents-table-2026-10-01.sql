-- sms_consents — one row per paid V1 order that was SHOWN the optional
-- "Can we text you?" question at Stripe Checkout (server/lib/smsConsent.ts).
--
-- WHY. Marketing texts need recorded express consent (Twilio approval + US TCPA).
-- Joel's plan: "Build a consent table: number, timestamp, the exact consent text
-- shown, IP, and chat ID." Plus opted_out_at for STOP.
--
-- SAFETY. CREATE TABLE IF NOT EXISTS — a brand-new table, nothing existing is
-- altered, no lock on any live table. Safe to re-run.
--
-- ORDER. Run this BEFORE turning SMS_CONSENT_FUNNELS on for a server. (If it is
-- missing, the webhook's consent insert fails and logs an error — non-blocking,
-- the purchase is unaffected — but that buyer's answer is then only on Stripe.)
--
-- 🔴 DEV ONLY for now (1 Oct 2026). Not for production until go-live is approved.

BEGIN;

CREATE TABLE IF NOT EXISTS sms_consents (
  id                varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL,
  conversation_id   varchar,
  email             text,
  phone             text NOT NULL,
  consented         boolean NOT NULL,
  consent_text      text NOT NULL,
  consent_version   text NOT NULL,
  ip                text,
  funnel            text,
  source            text NOT NULL DEFAULT 'stripe_checkout',
  consented_at      timestamptz NOT NULL,
  opted_out_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_consents_stripe_session
  ON sms_consents (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_sms_consents_phone
  ON sms_consents (phone);

-- Phone numbers + consent: keep them off Supabase's public REST API. With RLS on
-- and NO policies, the anon/authenticated API roles see nothing. Our server
-- connects as the table OWNER (postgres), which RLS does not apply to, so the
-- webhook insert is unaffected.
ALTER TABLE sms_consents ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ── Verification (expect 14 columns, and relrowsecurity = true) ───────────────────────────────────────────
--   SELECT count(*) FROM information_schema.columns WHERE table_name = 'sms_consents';
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'sms_consents';
