-- Receipt guard — the database-level fix for the wallet-drain family (2026-08).
--
-- THE RULE: the receipt of an ACTIVE session must never go down.
--
-- Billing charges the DIFFERENCE against chat_sessions.coins_charged
-- (creditTracking.ts:202-203), so anything that lowers that column on an active
-- session makes every later checkpoint re-bill the erased amount — up to 897
-- coins/30s until the wallet is empty. That is exactly what a stale pre-flip
-- process did in August 2026: `coins_charged = LEAST(coins_charged, 1800)`
-- while the session stayed active. See docs/root-cause-1800-wallet-drain-2026-08-04.md.
--
-- Every LEGITIMATE lowering path (endChatSession dead-air refund, inactive-session
-- cleanup) sets status = 'ended' in the SAME update statement — verified 2026-08-05
-- against creditTracking.ts:495-515 and :723-733. So the guard only bites when the
-- row REMAINS active, which today is only ever the corruption path.
--
-- Blocks: stale-build writers, manual SQL accidents on live sessions, anon-key
-- writes — regardless of what code or credential the writer uses.
--
-- ⚠️ Before shipping d355f0f: its cap-refund block lowers coins_charged while the
--    session stays active (creditTracking.ts:363-370) and would be rejected by this
--    guard. Amend it to end the session in the same statement, or accept the error
--    (it only fires on receipts already corrupted above the 8,970 ceiling).
--
-- Apply:    run this file (idempotent — safe to re-run).
-- Rollback: DROP TRIGGER trg_chat_sessions_receipt_guard ON chat_sessions;
--           DROP FUNCTION chat_sessions_receipt_guard();
--
-- Tested LOCAL 2026-08-05. NOT applied to development or production.

CREATE OR REPLACE FUNCTION chat_sessions_receipt_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.coins_charged < OLD.coins_charged THEN
    RAISE EXCEPTION
      'receipt guard: coins_charged of ACTIVE session % may not decrease (% -> %). '
      'Lowering an active receipt makes billing re-charge the difference (the 2026-08 '
      'wallet drain). End the session in the same UPDATE, or refund via endChatSession.',
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
