-- ============================================================================
--  STEP 1 of the dead-air billing fix — session timeout 30 → 3 minutes
--  2026-07-14 · from improve-v2/daily/2026-07-14-buyer-audit-72h.md §4.1
--
--  WHY: personas.session_timeout_minutes = 30 makes BOTH billing guards inert
--  (the idle guard and the 1800s safety cap trip at the same 30-minute mark).
--  26.3% of all coins billed over the 72h window were charged after the user's
--  last message (~$402). Dropping the timeout to 2 minutes stops the meter
--  ~2 minutes after the customer's last message instead of 30.
--
--  WHY 2 (decision Joel + boss, 2026-07-14): the BROWSER's own idle protection
--  warns at 2 min and auto-ends the session at ~3 min ("Are you still there?").
--  The server threshold must sit BELOW that 3-minute close for the idle tail to
--  be forgiven (idle 3min > timeout 2min → bill/refund down to last message).
--  At 3 it is a race (180s vs 180s) and the ~190s dead-air charge survives.
--  This does NOT cut live sessions short: this value only decides how much
--  trailing silence is billable — a reader who pauses and comes back keeps
--  their session; the browser banner still governs the actual ending.
--
--  This is a config-only change — safe to run BEFORE the code deploy.
--  The code change (refund-on-correction, Step 2) is separate; without it, the
--  timeout alone still caps dead air at ~3 min instead of 30.
--
--  NO app restart needed: getPersonaConfig reads the row on every checkpoint.
-- ============================================================================

-- 1. BEFORE — snapshot current values (save the output).
SELECT id, slug, display_name, session_timeout_minutes, coins_per_minute
FROM personas
ORDER BY slug;

-- 2. THE CHANGE — every persona currently on the broken 30-minute value.
UPDATE personas
SET session_timeout_minutes = 2,
    updated_at = NOW()
WHERE session_timeout_minutes = 30;

-- 3. VERIFY — expect every row at 2 (or its deliberate non-30 value, if any).
SELECT slug, session_timeout_minutes FROM personas ORDER BY slug;

-- ── Rollback ────────────────────────────────────────────────────────────────
-- UPDATE personas SET session_timeout_minutes = 30, updated_at = NOW()
-- WHERE session_timeout_minutes = 2;

-- ── Watch after the flip (Railway logs) ─────────────────────────────────────
--  • "checkpointSession"     with idleCapped: true — the guard now firing
--  • after code deploy: "refunded dead-air over-billing" — Step 2 working
--  • "BILLING_INVARIANT_VIOLATION" — must NEVER appear once Step 2 is live
--
-- ── Side effect to know about ───────────────────────────────────────────────
--  cleanupInactiveSessions auto-ends sessions idle >5 min and sends the
--  session-timeout email. With the 3-min timeout, EVERY abandoned session now
--  gets that email (~5-10 min after last message) instead of only 30-min-idle
--  ones. Volume goes up; it doubles as a come-back nudge. If unwanted, the
--  email send is a separate switch we can discuss.
