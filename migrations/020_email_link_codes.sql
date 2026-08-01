-- Migration 020: The Live Thread — email_link_codes table + pendingReply column.
-- Purpose: back the opaque short link (/e/:code) sent in marketing emails with a
--   content snapshot (which persona, which campaign, the recap/open-loop/seed
--   text) so the lander can continue the specific reading the reader clicked
--   from instead of greeting them as a stranger. pending_reply on
--   evelyn_lander_sessions holds a reader's typed reply before they have an
--   account. Additive only: new table + new nullable column, no rewrite of
--   existing rows.

CREATE TABLE IF NOT EXISTS email_link_codes (
  code varchar PRIMARY KEY,
  persona_slug text NOT NULL,
  campaign text NOT NULL,
  reading_recap text,
  open_loop text,
  continue_seed text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_link_codes_campaign ON email_link_codes (campaign);

ALTER TABLE evelyn_lander_sessions ADD COLUMN IF NOT EXISTS pending_reply text;
