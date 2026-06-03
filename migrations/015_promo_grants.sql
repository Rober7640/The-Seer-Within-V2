-- Migration 015: Promo Grants (per-persona promotional coin wallets)
-- Purpose: Support campaign promos like the 6/6 launch ("6 free minutes with every
-- guide"). Each grant is a separate pot, scoped to one persona, that the billing path
-- spends BEFORE users.coin_balance and that expires after the campaign window.
-- Real balances are never touched. Reusable across campaigns via campaign_tag.

CREATE TABLE IF NOT EXISTS promo_grants (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id       VARCHAR NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  campaign_tag     TEXT NOT NULL,            -- e.g. 'promo-6-6'

  coins_granted    INTEGER NOT NULL,         -- original grant (360 = 6 min)
  coins_remaining  INTEGER NOT NULL,         -- spent down by the billing path
  coins_spent      INTEGER NOT NULL DEFAULT 0,

  expires_at       TIMESTAMP NOT NULL,       -- use-it-or-lose-it window
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Spend lookup: WHERE user_id=? AND persona_id=? AND expires_at>now AND coins_remaining>0
CREATE INDEX IF NOT EXISTS idx_promo_grants_user_persona
  ON promo_grants (user_id, persona_id);

-- No-double-grant safeguard so the one-time seeding script can use
-- INSERT ... ON CONFLICT DO NOTHING and be safely re-runnable.
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_grants_unique
  ON promo_grants (user_id, persona_id, campaign_tag);

-- Per-session promo tracking: how much of coins_charged came from a promo grant.
-- Lets endChatSession refund over-billing back to the correct source.
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS promo_coins_charged INTEGER NOT NULL DEFAULT 0;
