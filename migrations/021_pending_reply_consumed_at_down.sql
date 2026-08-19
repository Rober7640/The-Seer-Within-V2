-- Down migration 021: drop the pending_reply_consumed_at marker.
-- Safe to reverse: pending_reply itself is untouched by 021, so rolling back only
-- loses the "already replayed" knowledge. A reader whose reply was replayed before
-- the rollback could have it replayed a second time afterwards.
ALTER TABLE evelyn_lander_sessions DROP COLUMN IF EXISTS pending_reply_consumed_at;
