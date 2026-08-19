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
  -- Lander context the legacy ?bucket=&src= query string used to carry; the
  -- short link has no room for it, so /e/:code rebuilds the query string from
  -- these. bucket is load-bearing (it selects Drip 1's bucket-specific phrase),
  -- not just analytics.
  bucket text,
  src text,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Columns added after the first draft of this migration; guarded so an
-- environment that already ran the original version picks them up.
ALTER TABLE email_link_codes ADD COLUMN IF NOT EXISTS bucket text;
ALTER TABLE email_link_codes ADD COLUMN IF NOT EXISTS src text;

CREATE INDEX IF NOT EXISTS idx_email_link_codes_campaign ON email_link_codes (campaign);

-- One live code per (persona, campaign). render-aweber.mjs is read-then-write
-- on this pair so a re-render reuses the code already inside a scheduled
-- broadcast instead of minting a second one; this makes the database enforce
-- that invariant rather than leaving it to the pipeline.
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_link_codes_persona_campaign
  ON email_link_codes (persona_slug, campaign);

ALTER TABLE evelyn_lander_sessions ADD COLUMN IF NOT EXISTS pending_reply text;
