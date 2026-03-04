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
id                  VARCHAR, primary key (UUID)
email               TEXT — captured during chat
firstName           TEXT — user's first name (column: first_name)
location            TEXT — user's location
timeOfDay           TEXT
bucket              TEXT — love / money / purpose / someone
subBucket           TEXT
personName          TEXT — name of person mentioned by user
concern             TEXT
deeperResponse      TEXT
vision              TEXT
emotionalResponse   TEXT
blockSource         TEXT
commitmentResponse  TEXT
purchased           BOOLEAN — has the main offer been paid?
purchaseType        TEXT
objectionCount      INTEGER
conversationState   TEXT — current state machine phase
messages            TEXT — serialised message history

stripeSessionId     TEXT — Stripe checkout session ID
stripeCustomerId    TEXT
stripePaymentMethodId TEXT
mainPurchaseAmount  INTEGER — amount in cents

upsellOffered       BOOLEAN
upsellPurchased     BOOLEAN
upsellPaymentId     TEXT
upsellAmount        INTEGER

upsell2Offered      BOOLEAN
upsell2Purchased    BOOLEAN
upsell2PaymentId    TEXT
upsell2Amount       INTEGER
upsell2Type         TEXT

shippingName        TEXT
shippingLine1       TEXT
shippingLine2       TEXT
shippingCity        TEXT
shippingState       TEXT
shippingPostal      TEXT
shippingCountry     TEXT

shipping2Name       TEXT  (upsell 2 shipping, if different)
shipping2Line1      TEXT
shipping2Line2      TEXT
shipping2City       TEXT
shipping2State      TEXT
shipping2Postal     TEXT
shipping2Country    TEXT

createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

Note: Shipping is stored as individual text columns, not a JSONB blob.

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
id                  VARCHAR, primary key (UUID)
slug                TEXT, unique — URL identifier (e.g. "evelyn-cross")
displayName         TEXT — shown to users (e.g. "Evelyn Cross")
tagline             TEXT — one-line description
description         TEXT — longer bio shown on profile
avatarUrl           TEXT — image URL
baseSystemPrompt    TEXT — core AI instructions for this guide
personality         TEXT — JSON: tone, style, specialties
categories          TEXT — JSON array e.g. ["love", "money", "purpose"]
isActive            BOOLEAN — hide/show guide
isDefault           BOOLEAN — the default guide new users land on
isFeatured          BOOLEAN — show in featured section
sortOrder           INTEGER — display order on the directory
accuracyRank        INTEGER — null = unranked; 1 = top of "Voted Most Accurate"
coinsPerMinute      INTEGER — how many coins per minute this guide costs
freeCoins           INTEGER — free coins granted to new users
customPricing       TEXT — JSON array of PricingTier objects
sessionTimeoutMinutes INTEGER — idle timeout (default 30 minutes)
fromEmail           TEXT — email address for follow-up emails
fromName            TEXT — sender name for follow-up emails
yearsExperience     INTEGER — displayed on profile card
readingsCount       INTEGER — displayed on profile card
overallRating       REAL — displayed as star rating (admin-set)
availabilitySchedule TEXT — JSON: timezone + time windows when guide is online
onlineOverride      TEXT — null | 'online' | 'offline' (manual admin override)
overrideExpiresAt   TIMESTAMP — optional expiry for manual override
cyclicBreakSchedule TEXT — JSON: { enabled, availableMinutes, breakMinutes }
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
id                  VARCHAR, primary key (UUID)
personaId           VARCHAR → references personas(id)
reviewerName        TEXT
starRating          INTEGER — 1-5
reviewText          TEXT — optional
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
importance          INTEGER — 1-10, higher = more likely to be used
category            TEXT — love / family / work / etc.
expiresAt           TIMESTAMP — deprecated; retention is now activity-based (inactive users 6+ months)
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
priceUsd            INTEGER — price in cents (e.g. 999 = $9.99)
stripeSessionId     TEXT — Stripe checkout session ID
stripePaymentIntentId TEXT
paypalOrderId       TEXT — PayPal order ID (max 64 chars)
paypalCaptureId     TEXT — PayPal capture ID
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
id                  VARCHAR, primary key (UUID)
userId              VARCHAR → references users(id)
personaId           VARCHAR → references personas(id)
lastSessionId       VARCHAR → references chat_sessions(id) — null ok
recipientEmail      TEXT
subject             TEXT
bodyHtml            TEXT
bodyText            TEXT — plain text version
status              TEXT — pending / sent / failed / bounced
sentAt              TIMESTAMP
deliveryStatus      TEXT — Resend delivery status
resendEmailId       TEXT — ID returned by Resend API
opened              BOOLEAN
clicked             BOOLEAN
openedAt            TIMESTAMP
clickedAt           TIMESTAMP
sequenceNumber      INTEGER — 1=day2, 2=day5, 3=day7
generatedBy         TEXT — default "claude-haiku"
generationTokens    INTEGER — tokens used to generate this email
daysSinceLastSession INTEGER
unsubscribeToken    TEXT, unique — for one-click unsubscribe
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

---

### `user_follow_up_preferences`
Per-user opt-in/out settings for re-engagement emails. One row per user.

Key columns:
```
id                        VARCHAR, primary key (UUID)
userId                    VARCHAR, unique → references users(id)
enableFollowUps           BOOLEAN — default true
followUpDays              INTEGER — delay before first follow-up (default 2)
maxFollowUpsPerMonth      INTEGER — default 4
followUpsSentThisMonth    INTEGER — rolling monthly counter
lastFollowUpSentAt        TIMESTAMP
unsubscribedAt            TIMESTAMP — null = still subscribed
unsubscribeReason         TEXT
createdAt                 TIMESTAMP
updatedAt                 TIMESTAMP
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
id                  VARCHAR, primary key (UUID)
userId              VARCHAR → references users(id)
personaId           VARCHAR → references personas(id) — last persona used (null ok)
segment             TEXT — free_tier_dropoff / empty_tank / loyal_refill / dormant_low_balance
recipientEmail      TEXT
subject             TEXT
bodyHtml            TEXT
bodyText            TEXT — plain text version
coinBalanceAtSend   INTEGER — snapshot of balance when email was sent
status              TEXT — pending / sent / failed
sentAt              TIMESTAMP
resendEmailId       TEXT — ID returned by Resend API
generatedBy         TEXT — default "claude-haiku"
generationTokens    INTEGER
unsubscribeToken    TEXT, unique
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
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
