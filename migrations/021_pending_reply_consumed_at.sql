-- Migration 021: The Live Thread — pending_reply_consumed_at marker.
-- Purpose: record that a reader's parked lander reply (evelyn_lander_sessions.
--   pending_reply, added in 020) has already been replayed as the first user
--   message of a real chat session, so a re-clicked verification/magic link can
--   never replay it twice.
--
-- Deliberately a SEPARATE column rather than nulling pending_reply: that text is
--   also the evidence behind the 10-minute Live Thread welcome grant, which is
--   re-derived at verification time and on every /api/evelyn-lander/check-email
--   resend. Clearing it would silently drop those readers back to 5 minutes with
--   no error anywhere. See server/lib/liveThreadEngagement.ts's header.
--
-- Additive only: one new nullable column, no rewrite of existing rows. Every
--   pre-existing row reads as "not yet consumed", which is correct — nothing has
--   replayed one before this migration.

ALTER TABLE evelyn_lander_sessions ADD COLUMN IF NOT EXISTS pending_reply_consumed_at timestamp;
