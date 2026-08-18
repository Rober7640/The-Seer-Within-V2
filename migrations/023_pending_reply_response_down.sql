-- Down migration 023: drop the pre-session answer to the parked reply.
-- Reverses 023 and nothing else. pending_reply, pending_reply_consumed_at and
-- pending_reply_violation_type are untouched, so the reply itself, its consumption
-- marker and its safety verdict all survive a rollback.
--
-- Rolling back loses any generated-but-not-yet-replayed answers. The consequence is
-- benign and self-healing: a reader whose answer is dropped sees it regenerated on
-- their next /reading load (the endpoint treats NULL as "not generated yet"), and the
-- replay falls back to inserting the reply alone — the pre-023 behaviour.
ALTER TABLE evelyn_lander_sessions DROP COLUMN IF EXISTS pending_reply_response;
