# Session churn diagnosis — why 57 of 128 sessions re-opened within 5 minutes

2026-07-14 · Step 5 of the dead-air plan · from `improve-v2/daily/2026-07-14-buyer-audit-72h.md` §4.6

**STATUS UPDATE (later 2026-07-14): fix directions 1–3 below are IMPLEMENTED (local,
not pushed).** Server: `initSession` reattaches to a live same-persona session inside
its idle window instead of forking (chatEngine.ts); "Continue Reading" context copies
are flagged `is_context_copy` (schema + `migrations/2026-07-14-chat-message-context-copy.sql`
— additive, safe pre-deploy, run once on the shared DB). Client: the live session
persists in localStorage and a reload/phone-unlock rejoins it (validated against the
server) with the conversation restored on screen. Tested:
`improve-v2/playwright/session-churn.spec.ts` — 4 specs incl. a real-browser reload;
full suite 26/26.

## The mechanism (three doors into a new session, one shared amplifier)

**Door 1 — page reload / phone unlock (the big one).**
The client keeps the active session only in React state (`ChatServicePage.tsx` — nothing
in localStorage). Any reload — pull-to-refresh, mobile browser evicting the background
tab, webview restart — wipes it. The next message the user sends hits
`if (!activeSession)` (`ChatServicePage.tsx:1375`) and **starts a brand-new session**.
Mobile browsers evict backgrounded tabs constantly, so a customer who locks their phone
mid-reading and comes back is a new session almost every time. 13-sessions-in-64-minutes
(01-JR) is this loop running on a phone.

**Door 2 — the server ended it while they were away.**
If the server has since ended the session (cleanup, out-of-credits, beacon), the send
returns 404/410, the client clears state and shows the "reading ended" divider
(`ChatServicePage.tsx:1567`) → the user taps Continue → new session.

**Door 3 — "Continue Reading" / resume-after-purchase (the replay).**
`startContinuationSession` (`ChatServicePage.tsx:1117`) sends the **last 4 messages** to
`/session/start`; `initSession` (`chatEngine.ts:1119-1128`) **inserts them as brand-new
`chat_messages` rows** in a tight loop — that is exactly the audit's "replays the prior
tail verbatim with identical millisecond timestamps." It corrupts transcript analytics,
inflates message counts, and double-feeds memory extraction. (It exists so Claude has
context, but it does it by forging ledger rows.)

**The amplifier — every new start force-closes the old session.**
`startChatSession` (`creditTracking.ts:84-99`) ends ALL of the user's active sessions
when a new one starts. So the *old* session's `ended_at` is stamped **at the moment of
the re-open** — which is why the audit sees "re-opened within 5 minutes of the last one
dying": the death and the birth are the same event. Each new session then gets its own
fresh billable idle window (the per-session ~190s tail, now ~2 min and refunded).

## Effect of today's timeout change (30 → 2 min)

Churn **count** may go UP: cleanup now auto-ends sessions idle >5 min, so returning
users hit Door 2 more often. But each churn event is now cheap (≤ ~2 min tail, refunded
once the code deploys) instead of feeding a 30-minute meter. Churn becomes a UX/data
problem, not a money problem.

## Fix directions (for approval — NOT implemented)

1. **Reattach instead of recreate** (server, ~20 lines): `/session/start` returns the
   user's existing active session for the same persona instead of force-closing it and
   opening a new row. Kills Door 1's billing/data impact outright.
2. **Persist the session id client-side** (localStorage with staleness check) so a
   reload rejoins rather than restarts. Complements 1.
3. **Stop forging replay rows** (Door 3): pass continuation context to the model
   in-prompt (or flag the copied rows `is_context_copy`) so `chat_messages` stays an
   honest ledger and analytics/memory stop double-counting.
4. Measure after 1-3: the `ends-on-?` telemetry and message counts become trustworthy
   again, which the paywall work (audit issue #2 / Step 7) depends on.
