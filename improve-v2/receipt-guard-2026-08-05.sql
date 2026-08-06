-- Receipt guard — the database-level fix for the wallet-drain family (2026-08).
--
-- THE RULE: the receipt of an ACTIVE session must never go down unless the money
--           is going back at the same time.
--
-- Billing charges the DIFFERENCE against chat_sessions.coins_charged
-- (creditTracking.ts:202-203), so anything that lowers that column on an active
-- session makes every later checkpoint re-bill the erased amount — up to 897
-- coins/30s until the wallet is empty. That is exactly what a stale pre-flip
-- process did in August 2026: `coins_charged = LEAST(coins_charged, 1800)`
-- while the session stayed active. See docs/root-cause-1800-wallet-drain-2026-08-04.md.
--
-- Blocks: stale-build writers, manual SQL accidents on live sessions, anon-key
-- writes — regardless of what code or credential the writer uses.
--
-- ---------------------------------------------------------------------------
-- AMENDED 2026-08-06 — status was the WRONG discriminator. Read this before
-- reverting to the simpler predicate.
-- ---------------------------------------------------------------------------
-- The first cut rejected EVERY lowering of an active receipt, on the recorded
-- belief that "every legitimate lowering path sets status='ended' in the same
-- UPDATE". That was verified against endChatSession (:494) and the inactive
-- cleanup (:724) — and MISSED a third path:
--
--   creditTracking.ts:254-277 — the dead-air refund INSIDE checkpointSession.
--   When the idle guard re-bases billing from wall-clock onto last_message_at it
--   refunds the difference and writes a LOWER receipt, while the customer is
--   still in the chat so the row correctly stays 'active'. (This is the
--   2026-07-14 fairness fix for the "1-second session, 1,455 coins" rows.)
--
-- Ending that session to satisfy the guard would be wrong — the customer has not
-- left. So the discriminator is INTENT, not status: a transaction that is
-- genuinely handing the coins back declares itself with
--
--     SET LOCAL app.receipt_refund = 'on'
--
-- SET LOCAL is transaction-scoped, so the permission cannot outlive the
-- transaction that granted it (proved by test 6). A stale build, a forgotten
-- Railway service, an anon-key write and a manual psql accident never set it —
-- so the drain is still blocked exactly as before.
--
-- Callers that must set the flag (both refund first, then lower):
--   • creditTracking.ts:254-277  dead-air refund in checkpointSession
--   • creditTracking.ts:333-370  post-commit safety-cap refund (was d355f0f)
--
-- Matrix: improve-v2/receipt-guard.test.ts — 7/7, incl. the attack, the two
-- status='ended' paths, the declared refund, flag non-leakage, and the REAL
-- checkpointSession dead-air path end-to-end.
--
-- Apply:    run this file (idempotent — safe to re-run).
-- Rollback: DROP TRIGGER trg_chat_sessions_receipt_guard ON chat_sessions;
--           DROP FUNCTION chat_sessions_receipt_guard();
--
-- Tested LOCAL 2026-08-06. NOT applied to development or production.

CREATE OR REPLACE FUNCTION chat_sessions_receipt_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'active'
     AND NEW.coins_charged < OLD.coins_charged
     -- missing_ok = true: unset is the normal case and must not raise.
     AND COALESCE(current_setting('app.receipt_refund', true), '') <> 'on'
  THEN
    RAISE EXCEPTION
      'receipt guard: coins_charged of ACTIVE session % may not decrease (% -> %). '
      'Lowering an active receipt makes billing re-charge the difference (the 2026-08 '
      'wallet drain). If you are refunding the coins in this same transaction, declare it '
      'with: SET LOCAL app.receipt_refund = ''on''. Otherwise end the session in the same '
      'UPDATE, or refund via endChatSession.',
      OLD.id, OLD.coins_charged, NEW.coins_charged
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_sessions_receipt_guard ON chat_sessions;
CREATE TRIGGER trg_chat_sessions_receipt_guard
  BEFORE UPDATE OF coins_charged ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION chat_sessions_receipt_guard();
