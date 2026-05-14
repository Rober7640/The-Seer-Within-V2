# PRD: Aiden "Verified, Not Purchased" Drip

## Summary
3-email Haiku-generated drip for Aiden users who verified their email, received their free minutes, but haven't purchased credits. Same admin page as the existing unverified drip, split into two tabs.

## Dependency
Ships **after** Robert's 10-free-minutes grant lands. The 1-hour delay on Email 1 only makes sense if users have a real free allowance to try the product first. Holding build until then.

## 1. Trigger & Eligibility

**Row creation:** at email verification (hook into verify-email endpoint). Three rows inserted with `scheduledFor = +1h / +25h / +49h` from verification (i.e., Email 1 at +1h, then Email 2 and Email 3 each 24h apart).

**Send-time checks** (each email, before firing):
- `emailVerified = true`
- `accountStatus = 'active'`
- **No non-refunded Stripe purchase** in `credit_transactions` for this user
- Not unsubscribed (`userFollowUpPreferences`)
- Email unchanged since schedule
- Not stale (>24h late → skip)

## 2. Sequence

| # | Delay | Tone | Angle |
|---|-------|------|-------|
| 1 | +1h from verification | **Observant / fresh read** | "I just finished pulling your chart. Here's what surfaced." |
| 2 | +24h after Email 1 | **Pattern-forward / gentle urgency** | "A number keeps repeating. Timing is narrow." |
| 3 | +24h after Email 2 (= +48h from Email 1) | **Respectful farewell** | "I don't re-run the same chart twice. Door's open." |

All emails from `aiden@theseerwithin.com`. Haiku generates; static fallbacks if Haiku fails.

## 3. Haiku Personalization Inputs

In order of priority:
1. **First name** (always)
2. **Quiz topic** — `life_direction` / `love_relationships` / `career_money` / `something_specific`, mapped via existing `TOPIC_PHRASES`
3. **Recent Aiden chat snippet** — if user started a chat session, pass **last 3 user messages** (cap ~500 chars total) as context. If no chat, skip this field. Aiden may have asked for birthdate in chat — Haiku can pick that up naturally if it's in the messages.

**Not collected:** birth date / Life Path number (quiz doesn't capture, Aiden asks in chat). Haiku has no structured Life Path input — relies on chat snippet if user shared one.

## 4. Admin UI

Existing `/admin/aiden-follow-ups` page → tab split:

```
┌─ Aiden Follow-Ups ──────────────────────────────┐
│  [Unverified]  [Verified — Not Purchased]       │
├──────────────────────────────────────────────────┤
│  Queue / pending / sent stats                    │
│  Per-sequence: sent / opened / clicked / paid    │
│  Manual "Send Now" (testing)                     │
└──────────────────────────────────────────────────┘
```

Unverified tab = current behavior (unchanged). Verified tab = new.

## 5. Stop Conditions

| Condition | Behavior |
|---|---|
| User purchases (non-refunded Stripe) | Cascade-skip all pending, reason `purchased` |
| User unsubscribes | Cascade-skip, reason `unsubscribed` |
| Email changed | Cascade-skip, reason `email_changed` |
| Account suspended | Skip row, reason `account_suspended` |
| Row >24h late | Skip row, reason `stale` |
| User deleted | Skip, reason `user_not_found` |

Cascade-skip = update all pending rows for this user at once (same pattern as existing unverified flow).

## 6. Data Model

Reuse `aiden_followup_emails` with a discriminator column:
```sql
ALTER TABLE aiden_followup_emails
  ADD COLUMN sequence_type TEXT NOT NULL DEFAULT 'unverified';
-- values: 'unverified' | 'verified_nopurchase'
```

Same shape, same cron, same admin queries — processor branches on `sequence_type`.

## 7. Tech Reuse

| Component | Source |
|---|---|
| Processor | Fork of `processAidenFollowupQueue()` in `server/lib/aidenFollowupEmailGenerator.ts` — branch on `sequence_type` |
| Haiku generation | `anthropicFailover` + `getModelForOperation('greeting')`, new prompt for Aiden voice, static fallbacks per sequence |
| Email template | `buildFollowUpHtml` / `buildFollowUpText` (persona-agnostic) |
| Magic link CTA | `generateMagicLinkToken(userId, aidenId, 'aiden-powers')` → `/chat/aiden-powers` |
| Cron | Existing 15-min cron — picks up new rows automatically |
| Unsubscribe | `userFollowUpPreferences` — existing |
| Feature flag | **New:** `ENABLE_AIDEN_VERIFIED_DRIP` (separate from `ENABLE_AIDEN_FOLLOWUPS`) |

## 8. Scheduling Integration

In verify-email endpoint, after existing logic:
1. (Existing) `skipAidenFollowupsForUser(userId, 'user_verified')` — cancels unverified rows
2. **New:** `scheduleAidenVerifiedDrip({ userId, email, firstName, quizTopic, baseTime: new Date() })` — inserts 3 rows with `sequence_type = 'verified_nopurchase'`

Both calls wrapped in try/catch — neither should block verification.

## 9. Purchase Detection
"Purchased" = any row in `credit_transactions` where:
- Linked to this user
- Payment came through Stripe
- Not refunded / not chargebacked

Query pattern on each send (cheap — indexed by `user_id`).

## 10. Metrics

**Per sequence:**
- Sent / delivered / opened / clicked
- **Purchased within 14 days of send** (primary KPI)
- Unsub rate (guardrail: <2% per send)
- Complaint rate (guardrail: <0.1%)

**Overall funnel:**
Verified → Email 1 sent → Email 2 sent → Email 3 sent → Purchased

Kill switch: flag off if weekly unsub >5% OR complaint rate >0.1%.

## 11. Out of Scope
- Cross-sell to existing Evelyn users (separate future project)
- Re-engagement after purchase (separate)
- V1 funnel users → Aiden (separate)
- Modifying existing unverified drip (untouched)

## 12. Effort Estimate
- Schema migration: 0.5d
- Processor branch + Haiku prompt + fallbacks: 1.5d
- Verify-email scheduling hook: 0.5d
- Admin UI tab split + per-type stats: 1d
- QA / smoke test: 0.5d
- **Total: ~4 days** (after free-minutes dependency ships)
