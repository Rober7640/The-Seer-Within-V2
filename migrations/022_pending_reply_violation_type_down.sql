-- Down migration 022: drop the parked-reply safety verdict.
-- Reverses 022 and nothing else. pending_reply and pending_reply_consumed_at are
-- untouched. Rolling back loses the verdicts, so a flagged reply that had been
-- withheld would become replayable again — re-run 022 before relying on the filter.
ALTER TABLE evelyn_lander_sessions DROP COLUMN IF EXISTS pending_reply_violation_type;
