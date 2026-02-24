# Database Schema

All tables are in a Supabase (PostgreSQL) database. Managed via Drizzle ORM (defined in `shared/schema.ts`).

The app uses **UUID primary keys** everywhere (not auto-increment integers). All timestamps are stored as `timestamp with time zone`.

---

## Quick reference: which tables belong to which system

| System | Tables |
|--------|--------|
| System 1 (funnel) | `conversations` |
| System 2 (chat service) | `users`, `personas`, `persona_prompts`, `persona_reviews`, `persona_intent_configs`, `chat_sessions`, `chat_messages`, `saved_messages`, `user_memory`, `credit_purchases`, `conversation_states` |
| Emails | `follow_up_emails`, `user_follow_up_preferences`, `topup_emails`, `magic_link_tokens` |
| Feedback | `session_feedback` |
| Safety | `safety_violations` |
| Admin | `admin_users`, `system_config` |

---

## Table-by-table reference

---

### `conversations`
**System 1 only.** One row per conversation in the original Evelyn Cross funnel.

Key columns:
```
id                  UUID, primary key
sessionId           UUID, unique — browser session identifier
email               TEXT — captured during chat
name                TEXT — user's first name
bucket              TEXT — what they asked about (love/money/purpose/someone)
phase               TEXT — where in the conversation they are
offerPresented      BOOLEAN — has the $35 offer been shown?
checkoutSessionId   TEXT — Stripe checkout session ID
paymentStatus       TEXT — pending / paid / failed
upsell1Status       TEXT — pending / bought / skipped
upsell2Status       TEXT — pending / bought / skipped
shippingAddress     JSONB — shipping info collected during upsell
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

---

### `users`
One row per registered user of System 2.

Key columns:
```
id                  UUID, primary key
email               TEXT, unique
passwordHash        TEXT — bcrypt hash, never store plaintext
firstName           TEXT
emailVerified       BOOLEAN — must be true before user can chat
coinBalance         INTEGER — current credit balance (180 = 3 minutes)
totalCoinsUsed      INTEGER — lifetime coins spent (used to detect returning users)
accountStatus       TEXT — active / suspended / banned
lastLoginAt         TIMESTAMP
defaultPersonaId    UUID → references personas(id)
passwordResetToken  TEXT — temporary token for password reset
deviceFingerprint   TEXT — browser fingerprint for fraud detection
accountFlags        JSONB — fraud detection flags
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

Note: Coin balance math — 60 coins = 1 minute. 180 coins = 3 free minutes.

---

### `personas`
One row per AI guide/advisor.

Key columns:
```
id                  UUID, primary key
slug                TEXT, unique — URL identifier (e.g. "evelyn-cross")
displayName         TEXT — shown to users (e.g. "Evelyn Cross")
tagline             TEXT — one-line description
description         TEXT — longer bio shown on profile
avatarUrl           TEXT — image URL
isActive            BOOLEAN — hide/show guide
isFeatured          BOOLEAN — show in featured section
coinsPerMinute      INTEGER — how many coins per minute this guide costs
freeCoins           INTEGER — free coins granted to new users for this guide
sessionTimeoutMinutes INTEGER — idle timeout before session auto-ends
fromEmail           TEXT — email address for follow-up emails
fromName            TEXT — sender name for follow-up emails
yearsExperience     INTEGER — displayed on profile card
readingsCount       INTEGER — displayed on profile card
overallRating       DECIMAL — displayed as star rating
baseSystemPrompt    TEXT — core AI instructions for this guide
customPricing       JSONB — custom credit packages for this guide
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

---

### `persona_prompts`
A/B test variants of prompts for each guide. The system picks a variant based on trafficPercent.

Key columns:
```
id                  UUID, primary key
personaId           UUID → references personas(id)
promptType          TEXT — greeting / system / crisis / etc.
promptContent       TEXT — the actual prompt text
version             INTEGER
variantLabel        TEXT — e.g. "control", "variant-a"
trafficPercent      INTEGER — 0-100, what % of users see this variant
isActive            BOOLEAN
createdAt           TIMESTAMP
```

---

### `persona_reviews`
Reviews displayed on guide profiles. Admin-managed (not user-submitted — use session_feedback for that).

Key columns:
```
id                  UUID, primary key
personaId           UUID → references personas(id)
reviewerName        TEXT
rating              INTEGER — 1-5
reviewText          TEXT
isDisplayed         BOOLEAN
displayOrder        INTEGER
createdAt           TIMESTAMP
```

---

### `persona_intent_configs`
Controls how each guide's AI handles conversation — what buckets/topics it steers toward, what questions it asks.

Key columns:
```
id                  UUID, primary key
personaId           UUID → references personas(id)
specialty           TEXT — main area of focus
conversationBuckets JSONB — list of topic buckets (love, money, etc.)
intents             JSONB — intent detection rules
characterRules      JSONB — personality/behavior rules
version             INTEGER
isActive            BOOLEAN
createdAt           TIMESTAMP
```

---

### `chat_sessions`
One row per conversation session between a user and a guide.

Key columns:
```
id                  UUID, primary key
userId              UUID → references users(id)
personaId           UUID → references personas(id)
startedAt           TIMESTAMP — when user sent first message
endedAt             TIMESTAMP — null while session is active
durationSeconds     INTEGER — total session length
coinsCharged        INTEGER — how many coins were deducted for this session
status              TEXT — active / ended / out_of_credits / timeout
lastTopic           TEXT — last conversation topic
lastBucket          TEXT — last bucket (love/money/etc.)
lastHeartbeatAt     TIMESTAMP — last 30-second ping (for idle detection)
lastMessageAt       TIMESTAMP — last time user or guide sent a message
pricingApplied      JSONB — snapshot of pricing at session start
createdAt           TIMESTAMP
```

---

### `chat_messages`
Every message sent in System 2, both user and guide.

Key columns:
```
id                  UUID, primary key
sessionId           UUID → references chat_sessions(id)
userId              UUID → references users(id)
role                TEXT — "user" or "assistant"
content             TEXT — the message text
inputTokens         INTEGER — Claude API tokens used (for cost tracking)
outputTokens        INTEGER — Claude API tokens used (for cost tracking)
sentAt              TIMESTAMP
```

---

### `saved_messages`
Messages the user has bookmarked/saved.

Key columns:
```
id                  UUID, primary key
userId              UUID → references users(id)
messageId           UUID → references chat_messages(id)
createdAt           TIMESTAMP
```

---

### `user_memory`
Persistent facts/context remembered about a user across multiple sessions with a guide. Claude reads these at the start of each session to personalise the conversation.

Key columns:
```
id                  UUID, primary key
userId              UUID → references users(id)
personaId           UUID → references personas(id)
memoryType          TEXT — fact / preference / relationship / etc.
summary             TEXT — short version (injected into prompts)
fullContext         TEXT — longer version
sourceSessionId     UUID → references chat_sessions(id)
importance          INTEGER — 1-5, higher = more likely to be used
category            TEXT — love / family / work / etc.
expiresAt           TIMESTAMP — null = never expires
lastAccessedAt      TIMESTAMP
createdAt           TIMESTAMP
```

---

### `credit_purchases`
Every time a user buys coins. One row per transaction.

Key columns:
```
id                  UUID, primary key
userId              UUID → references users(id)
personaId           UUID — which guide's page they were on when they bought
packageType         TEXT — starter / popular / best_value
coinsPurchased      INTEGER
bonusCoins          INTEGER
priceUsd            DECIMAL
stripeSessionId     TEXT — Stripe checkout session ID
paypalOrderId       TEXT — PayPal order ID
status              TEXT — pending / completed / refunded / failed
createdAt           TIMESTAMP
```

---

### `conversation_states`
Per-session tracking of where the conversation is in its arc. Used by the chat engine to decide what to say next.

Key columns:
```
id                  UUID, primary key
sessionId           UUID → references chat_sessions(id)
currentBucket       TEXT — current topic (love/money/etc.)
turnCount           INTEGER
detectedIntents     JSONB — recent intents detected
userEngagement      TEXT — high/medium/low
lastIntentConfidence DECIMAL
bucketTransitions   JSONB — history of topic changes
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

---

### `follow_up_emails`
Records of every re-engagement email sent. Prevents duplicate sends and tracks opens/clicks.

Key columns:
```
id                  UUID, primary key
userId              UUID → references users(id)
personaId           UUID → references personas(id)
recipientEmail      TEXT
subject             TEXT
bodyHtml            TEXT
status              TEXT — pending / sent / failed / bounced
sentAt              TIMESTAMP
opened              BOOLEAN — set by Resend webhook
clicked             BOOLEAN — set by Resend webhook
sequenceNumber      INTEGER — 1, 2, or 3
unsubscribeToken    TEXT — unique token for one-click unsubscribe
createdAt           TIMESTAMP
```

---

### `user_follow_up_preferences`
Per-user opt-in/out settings for re-engagement emails.

Key columns:
```
id                  UUID, primary key
userId              UUID → references users(id)
enableFollowUps     BOOLEAN — default true
maxFollowUpsPerMonth INTEGER
unsubscribedAt      TIMESTAMP — null = still subscribed
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

---

### `magic_link_tokens`
One-time tokens embedded in emails. User clicks link → auto-logged in without password.

Key columns:
```
id                  UUID, primary key
userId              UUID → references users(id)
personaId           UUID → references personas(id)
personaSlug         TEXT
token               TEXT, unique — 64-character random hex string
expiresAt           TIMESTAMP — 30 days after generation
usedAt              TIMESTAMP — null = not yet used
createdAt           TIMESTAMP
```

---

### `topup_emails`
Records of credit nudge emails sent to users with low/no coins.

Key columns:
```
id                  UUID, primary key
userId              UUID → references users(id)
personaId           UUID → references personas(id)
segment             TEXT — free_tier_dropoff / empty_tank / loyal_refill / dormant_low_balance
recipientEmail      TEXT
subject             TEXT
bodyHtml            TEXT
coinBalanceAtSend   INTEGER — snapshot of balance when email was sent
status              TEXT — pending / sent / failed
sentAt              TIMESTAMP
unsubscribeToken    TEXT
createdAt           TIMESTAMP
```

---

### `session_feedback`
Star ratings and written reviews submitted by users after sessions (≥ 5 minutes).

Key columns:
```
id                  UUID, primary key
sessionId           UUID → references chat_sessions(id)
userId              UUID → references users(id)
personaId           UUID → references personas(id)
starRating          INTEGER — 1-5
feedbackText        TEXT — optional written review
approved            BOOLEAN — admin approves before public display
displayName         TEXT — optional, shown if user opts in
createdAt           TIMESTAMP
```

---

### `safety_violations`
Logs every time the safety system detected a crisis or blocked message.

Key columns:
```
id                  UUID, primary key
sessionId           UUID → references chat_sessions(id)
userId              UUID → references users(id)
personaId           UUID → references personas(id)
violationType       TEXT — hard_crisis / soft_crisis / prompt_injection
userMessage         TEXT — the message that triggered the flag
systemResponse      TEXT — what the system said back
flaggedForReview    BOOLEAN
reviewedAt          TIMESTAMP
createdAt           TIMESTAMP
```

---

### `admin_users`
Separate admin accounts. Not linked to regular `users` table.

Key columns:
```
id                  UUID, primary key
email               TEXT, unique
passwordHash        TEXT
role                TEXT — super_admin / admin
displayName         TEXT
createdAt           TIMESTAMP
```

---

### `system_config`
Key-value store for platform-wide settings editable from the admin panel.

Key columns:
```
id                  UUID, primary key
configKey           TEXT, unique — e.g. "free_trial_coins"
configValue         TEXT
configType          TEXT — string / number / boolean / json
description         TEXT
lastEditedBy        UUID → references admin_users(id)
updatedAt           TIMESTAMP
```

---

## Key relationships (foreign keys)

```
users
  └── chat_sessions (userId)
       └── chat_messages (sessionId)
       └── conversation_states (sessionId)
       └── session_feedback (sessionId)

users
  └── user_memory (userId, personaId)
  └── credit_purchases (userId)
  └── follow_up_emails (userId)
  └── topup_emails (userId)
  └── magic_link_tokens (userId)
  └── saved_messages (userId)

personas
  └── persona_prompts (personaId)
  └── persona_reviews (personaId)
  └── persona_intent_configs (personaId)
  └── chat_sessions (personaId)
  └── user_memory (personaId)
```

---

## Useful SQL queries

Get all active users with their coin balance:
```sql
SELECT id, email, "firstName", "coinBalance", "totalCoinsUsed", "accountStatus"
FROM users
WHERE "accountStatus" = 'active'
ORDER BY "coinBalance" DESC;
```

Get all sessions for a user:
```sql
SELECT cs.id, p."displayName", cs."startedAt", cs."endedAt",
       cs."coinsCharged", cs.status
FROM chat_sessions cs
JOIN personas p ON cs."personaId" = p.id
WHERE cs."userId" = 'USER_UUID_HERE'
ORDER BY cs."startedAt" DESC;
```

Get users with zero coins (potential top-up targets):
```sql
SELECT id, email, "firstName", "coinBalance", "totalCoinsUsed"
FROM users
WHERE "coinBalance" = 0
  AND "accountStatus" = 'active'
ORDER BY "totalCoinsUsed" DESC;
```

Get unread safety violations:
```sql
SELECT sv.*, u.email
FROM safety_violations sv
JOIN users u ON sv."userId" = u.id
WHERE sv."flaggedForReview" = true
  AND sv."reviewedAt" IS NULL
ORDER BY sv."createdAt" DESC;
```
