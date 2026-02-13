# End-to-End Testing Guide
## Multi-Persona Psychic Consultant Platform

This document outlines the comprehensive testing procedure for the complete platform with all 3 phases implemented.

## Prerequisites

### 1. Database Setup

**Option A: Replit (Recommended)**
1. Open project in Replit
2. DATABASE_URL is auto-injected by postgresql-16 module
3. Run `npm run db:push` to create schema

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL 16
# Create database
createdb seer_within

# Set environment variable
DATABASE_URL=postgresql://localhost/seer_within
```

**Option C: Cloud Database (Neon, Supabase, etc.)**
1. Create PostgreSQL database
2. Copy connection string to .env

### 2. Environment Variables

Create `.env` file (see `.env.example`):
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NODE_ENV=development
PORT=5000
```

### 3. Initialize Database

```bash
# Push schema to database
npm run db:push

# Seed default persona (Evelyn Cross)
npm run seed
# OR run migration script
tsx server/lib/migration.ts
```

## Test Plan Overview

### Phase 1: Core Authentication & Credits
- [x] Code implemented by backend-core
- [ ] User registration
- [ ] User login & JWT tokens
- [ ] Credit balance tracking
- [ ] Time-based credit deduction
- [ ] Credit purchase flow

### Phase 2: Multi-Persona System
- [x] Code implemented by backend-personas & frontend-engineer
- [ ] Persona directory
- [ ] Persona selection
- [ ] Per-persona pricing
- [ ] Per-persona memory
- [ ] Admin persona management
- [ ] Prompt versioning & A/B testing

### Phase 3: Advanced Features
- [x] Code implemented by advanced-features
- [ ] Cross-persona memory transfer
- [ ] Panel readings
- [ ] Proactive outreach
- [ ] Marketplace system
- [ ] Persona training

---

## Detailed Test Cases

### Test 1: User Registration & Authentication

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "email": "test@example.com",
  "password": "SecurePass123!",
  "firstName": "Test User"
}
```

**Expected:**
- 201 Created
- Returns JWT token
- User created with 3 free minutes (default from Evelyn Cross persona)
- `creditMinutes: 3`, `totalMinutesUsed: 0`

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

**Expected:**
- 200 OK
- Returns JWT token
- Updates `lastLoginAt` timestamp

**Verification:**
```sql
SELECT email, firstName, creditMinutes, totalMinutesUsed, lastLoginAt
FROM users
WHERE email = 'test@example.com';
```

---

### Test 2: Persona Directory

**Endpoint:** `GET /api/personas/directory`

**Expected Response:**
```json
{
  "personas": [
    {
      "id": "uuid",
      "slug": "evelyn-cross",
      "displayName": "Evelyn Cross",
      "tagline": "Your Spiritual Guide",
      "description": "Expert in love, money, and purpose...",
      "avatarUrl": "/avatars/evelyn.jpg",
      "categories": ["love", "money", "purpose"],
      "pricing": {
        "freeMinutes": 3,
        "packages": [
          { "type": "15min", "minutes": 15, "priceUsd": 1500, "label": "15 Minutes - $15" },
          { "type": "30min", "minutes": 30, "priceUsd": 2500, "label": "30 Minutes - $25" }
        ]
      },
      "isActive": true
    }
  ]
}
```

**Expected:**
- Only active personas returned
- Sorted by `sortOrder`
- Pricing parsed from JSON

---

### Test 3: Start Chat Session (Evelyn Cross)

**Endpoint:** `POST /api/chat-service/session/start`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "personaId": "<evelyn-uuid>"
}
```

**Expected Response:**
```json
{
  "sessionId": "uuid",
  "personaName": "Evelyn Cross",
  "remainingMinutes": 3,
  "startedAt": "2026-02-14T..."
}
```

**Backend Actions:**
1. Check user has `creditMinutes > 0`
2. Create `chatSessions` record with `status: 'active'`
3. Start in-memory timer (Map entry)
4. Load user memory for Evelyn persona
5. Return sessionId

**Verification:**
```sql
SELECT * FROM chat_sessions WHERE user_id = '<user-uuid>' ORDER BY created_at DESC LIMIT 1;
```

---

### Test 4: Send Message to Evelyn

**Endpoint:** `POST /api/chat-service/session/:sessionId/message`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "content": "I'm struggling with a career decision. Should I take this new job offer?"
}
```

**Expected Response:**
```json
{
  "reply": "Ah, a career crossroads... Let me tune into your energy...",
  "remainingMinutes": 2.5,
  "tokensUsed": {
    "input": 1200,
    "output": 850
  }
}
```

**Backend Actions:**
1. Verify session is active
2. Load user memory context for Evelyn
3. Build prompt with:
   - Evelyn's system prompt from `personaPrompts`
   - User memory context
   - Conversation history
4. Call Claude API
5. Save user message & assistant reply to `chatMessages`
6. Update session `lastTopic`, `lastBucket`
7. Checkpoint timer (update `durationSeconds`)

**Verification:**
```sql
SELECT role, content, input_tokens, output_tokens, sent_at
FROM chat_messages
WHERE session_id = '<session-uuid>'
ORDER BY sent_at;
```

---

### Test 5: Time-Based Credit Deduction

**Wait 1 minute, then send another message**

**Expected:**
- After ~1 minute active session time, credits should deduct
- `remainingMinutes` decreases: 3 → 2 → 1 → 0
- Heartbeat (30-second intervals) checkpoints session

**Endpoint:** `GET /api/credits/balance`

**Expected Response:**
```json
{
  "creditMinutes": 1,
  "totalMinutesUsed": 2
}
```

**Verification:**
```sql
-- Check users table
SELECT credit_minutes, total_minutes_used FROM users WHERE id = '<user-uuid>';

-- Check session duration
SELECT duration_seconds, minutes_charged, status
FROM chat_sessions
WHERE id = '<session-uuid>';
```

---

### Test 6: Out of Credits

**Use all 3 free minutes, then try to continue**

**Endpoint:** `POST /api/chat-service/session/start` (after credits exhausted)

**Expected Response:**
```json
{
  "error": "OUT_OF_CREDITS",
  "message": "You have no remaining credits. Please purchase more to continue.",
  "pricing": { ... }
}
```

**Or if session already active:**

**Endpoint:** `POST /api/chat-service/session/:sessionId/message`

**Expected:**
- Session status set to `out_of_credits`
- Message rejected with purchase prompt

---

### Test 7: Purchase Credits

**Endpoint:** `POST /api/credits/checkout`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "personaId": "<evelyn-uuid>",
  "packageType": "15min"
}
```

**Expected Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

**Backend Actions:**
1. Get pricing from persona's `customPricing` JSON
2. Create Stripe Checkout Session (15 min / $15)
3. Store `creditPurchases` record with `status: 'pending'`
4. Return checkout URL

**User completes payment in Stripe**

**Webhook:** `POST /api/credits/webhook`

**Expected Actions:**
1. Verify Stripe signature
2. Update `creditPurchases` status to `completed`
3. Add 15 minutes to user's `creditMinutes`
4. Record `stripePaymentIntentId`

**Verification:**
```sql
-- Check credit purchase
SELECT package_type, minutes_purchased, price_usd, status, stripe_payment_intent_id
FROM credit_purchases
WHERE user_id = '<user-uuid>'
ORDER BY created_at DESC;

-- Check updated balance
SELECT credit_minutes, total_minutes_used
FROM users
WHERE id = '<user-uuid>';
```

---

### Test 8: End Session & Memory Summarization

**Endpoint:** `POST /api/chat-service/session/:sessionId/end`

**Expected Response:**
```json
{
  "summary": "Session ended",
  "totalMinutesCharged": 3,
  "remainingCredits": 15
}
```

**Backend Actions:**
1. Final checkpoint (calculate exact time used)
2. Deduct credits from user
3. Mark session `status: 'ended'`, set `endedAt`
4. **AI Summarization:**
   - Fetch all messages from session
   - Build transcript
   - Call Claude to summarize:
     - Key topics
     - User concerns
     - Important details (names, emotions, dates)
     - Overall summary
     - Next session context
5. Store in `userMemory` table:
   - `memoryType: 'session_summary'`
   - `personaId: <evelyn-uuid>`
   - `importance: 7` (default for session summaries)
   - `lastAccessedAt: now()`
6. Remove from in-memory `activeSessions` Map

**Verification:**
```sql
-- Check session ended
SELECT status, ended_at, duration_seconds, minutes_charged
FROM chat_sessions
WHERE id = '<session-uuid>';

-- Check memory created
SELECT memory_type, summary, importance, category, last_accessed_at
FROM user_memory
WHERE user_id = '<user-uuid>' AND persona_id = '<evelyn-uuid>'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Test 9: Return User - Memory Continuity

**Start a new session with Evelyn (next day)**

**Endpoint:** `POST /api/chat-service/session/start`

**Request:**
```json
{
  "personaId": "<evelyn-uuid>"
}
```

**Backend Actions:**
1. Load top 5 memories for user + Evelyn
   - Ordered by `importance` DESC, `lastAccessedAt` DESC
   - Only memories where `expiresAt` is null or future
2. Update user's `lastLoginAt` (keeps memory alive)
3. Update memory `lastAccessedAt` for loaded memories
4. Build context string for Claude

**First message:**

**Request:**
```json
{
  "content": "Hi Evelyn, what do you remember about our last conversation?"
}
```

**Expected Reply:**
```
"Hello again, dear one! Of course I remember our talk about your career decision.
Last time you were considering a new job offer and feeling uncertain about the path ahead.
Have you had any new insights since then?"
```

**Verification:**
- Evelyn recalls previous conversation details
- Context is relevant and accurate
- No hallucinated details

---

### Test 10: Switch Personas (Marcus Stone - Tarot Master)

**Create Marcus Stone persona via Admin (or use seeded data)**

**Endpoint:** `POST /api/chat-service/session/start`

**Request:**
```json
{
  "personaId": "<marcus-uuid>"
}
```

**Expected:**
- New session created
- Marcus's prompt loaded (different personality)
- Marcus has separate memory context (empty for first session)
- Evelyn's memories are NOT loaded

**Send message:**

**Request:**
```json
{
  "content": "Can you read my tarot cards for guidance?"
}
```

**Expected Reply:**
```
"Ah, a seeker of the cards. Let me shuffle the deck and see what the universe reveals for you today..."
```

**Verification:**
- Different personality/tone than Evelyn
- Marcus doesn't know about Evelyn conversations
- Separate memory context maintained

---

### Test 11: Admin - View User Profile

**Endpoint:** `GET /api/admin/users/<user-uuid>`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "Test User",
    "creditMinutes": 12,
    "totalMinutesUsed": 6,
    "accountStatus": "active",
    "createdAt": "2026-02-14T...",
    "lastLoginAt": "2026-02-14T..."
  },
  "personaStats": [
    {
      "personaId": "evelyn-uuid",
      "personaName": "Evelyn Cross",
      "sessionsCount": 2,
      "totalMinutesUsed": 4,
      "lastSessionAt": "2026-02-14T..."
    },
    {
      "personaId": "marcus-uuid",
      "personaName": "Marcus Stone",
      "sessionsCount": 1,
      "totalMinutesUsed": 2,
      "lastSessionAt": "2026-02-14T..."
    }
  ],
  "memories": [
    {
      "id": "uuid",
      "personaName": "Evelyn Cross",
      "memoryType": "session_summary",
      "summary": "User discussed career decision...",
      "importance": 7,
      "category": "purpose",
      "lastAccessedAt": "2026-02-14T..."
    }
  ],
  "recentSessions": [
    {
      "id": "uuid",
      "personaName": "Marcus Stone",
      "startedAt": "2026-02-14T10:00:00",
      "minutesCharged": 2,
      "status": "ended"
    }
  ]
}
```

**Verification:**
- Multi-persona stats aggregated correctly
- Memories shown per persona
- Session history accurate

---

### Test 12: Admin - Edit Persona Prompt

**Endpoint:** `GET /api/admin/personas/<evelyn-uuid>`

**Expected:**
- Current prompt content
- Prompt version history
- Active A/B tests

**Endpoint:** `PATCH /api/admin/prompts/<evelyn-uuid>`

**Request:**
```json
{
  "promptType": "system",
  "promptContent": "You are Evelyn Cross, updated prompt with new instructions...",
  "variantLabel": "B",
  "trafficPercent": 50
}
```

**Expected Actions:**
1. Create new version (increment `version`)
2. Mark old version as inactive (if replacing)
3. Create A/B test variant (50% traffic to variant B)

**Verification:**
```sql
SELECT prompt_type, version, is_active, variant_label, traffic_percent, created_at
FROM persona_prompts
WHERE persona_id = '<evelyn-uuid>' AND prompt_type = 'system'
ORDER BY created_at DESC;
```

**Test A/B split:**
- Start multiple sessions
- ~50% should receive variant A, ~50% variant B
- Session records should have `promptVariantId` set

---

### Test 13: Admin - Adjust User Credits

**Endpoint:** `PATCH /api/admin/users/<user-uuid>/credits`

**Request:**
```json
{
  "creditMinutes": 100,
  "reason": "Compensation for service issue"
}
```

**Expected:**
- User's `creditMinutes` set to 100
- Action logged

**Verification:**
```sql
SELECT credit_minutes FROM users WHERE id = '<user-uuid>';
```

---

### Test 14: Admin - Edit Persona Pricing

**Endpoint:** `PATCH /api/admin/personas/<evelyn-uuid>/pricing`

**Request:**
```json
{
  "freeMinutes": 5,
  "customPricing": [
    { "packageType": "10min", "minutes": 10, "priceUsd": 1000, "label": "10 Minutes - $10" },
    { "packageType": "20min", "minutes": 20, "priceUsd": 1800, "label": "20 Minutes - $18" },
    { "packageType": "60min", "minutes": 60, "priceUsd": 5000, "label": "1 Hour - $50" }
  ]
}
```

**Expected:**
- Persona's `freeMinutes` and `customPricing` JSON updated
- NO code deployment needed
- New users registering via Evelyn get 5 free minutes

**Verification:**
1. Register new user → should receive 5 free minutes
2. Existing users keep their current balance
3. Credit purchase endpoint returns new pricing options

---

### Test 15: Analytics Dashboard

**Endpoint:** `GET /api/admin/analytics/overview`

**Expected Response:**
```json
{
  "totalUsers": 150,
  "activeUsers": 45,
  "totalRevenue": 125000,
  "totalMinutesUsed": 8450,
  "avgSessionLength": 12.5,
  "conversionRate": 0.32
}
```

**Endpoint:** `GET /api/admin/analytics/personas`

**Expected Response:**
```json
{
  "personas": [
    {
      "id": "evelyn-uuid",
      "displayName": "Evelyn Cross",
      "totalSessions": 450,
      "totalRevenue": 98000,
      "avgRating": 4.8,
      "topCategories": ["love", "purpose"]
    },
    {
      "id": "marcus-uuid",
      "displayName": "Marcus Stone",
      "totalSessions": 120,
      "totalRevenue": 27000,
      "avgRating": 4.6,
      "topCategories": ["tarot", "divination"]
    }
  ]
}
```

---

### Test 16: Cross-Persona Memory Transfer

**Endpoint:** `POST /api/memory/transfer`

**Request:**
```json
{
  "userId": "<user-uuid>",
  "fromPersonaId": "<evelyn-uuid>",
  "toPersonaId": "<marcus-uuid>",
  "memoryIds": ["<memory-uuid-1>", "<memory-uuid-2>"],
  "transferType": "copy"
}
```

**Expected Actions:**
1. Duplicate memory records
2. Change `personaId` to Marcus
3. Marcus can now access Evelyn's context

**Verification:**
```sql
SELECT persona_id, summary, memory_type
FROM user_memory
WHERE user_id = '<user-uuid>' AND persona_id = '<marcus-uuid>';
```

**Test continuity:**
- Start session with Marcus
- Marcus should reference transferred context: "Evelyn mentioned you were considering a new job..."

---

### Test 17: Panel Reading (Multi-Persona)

**Endpoint:** `POST /api/panel/create`

**Request:**
```json
{
  "userId": "<user-uuid>",
  "personaIds": ["<evelyn-uuid>", "<marcus-uuid>"],
  "topic": "Life path guidance"
}
```

**Expected Response:**
```json
{
  "panelId": "uuid",
  "personas": [
    { "id": "evelyn-uuid", "name": "Evelyn Cross" },
    { "id": "marcus-uuid", "name": "Marcus Stone" }
  ],
  "status": "active"
}
```

**Endpoint:** `POST /api/panel/:panelId/message`

**Request:**
```json
{
  "content": "I'm at a crossroads in my career and love life. Can you both guide me?"
}
```

**Expected Response:**
```json
{
  "responses": [
    {
      "personaName": "Evelyn Cross",
      "content": "Ah, my dear, I sense a strong energy around transformation in your career..."
    },
    {
      "personaName": "Marcus Stone",
      "content": "Let me draw the cards. The Tower and The Star... a necessary ending leading to hope..."
    }
  ],
  "remainingMinutes": 10
}
```

**Backend Actions:**
1. Call both personas' prompts with panel context
2. Each persona generates independent response
3. Charge credits: 2x rate (2 personas × time)
4. Store panel messages with all responses

---

### Test 18: Proactive Outreach

**Endpoint:** `POST /api/outreach/schedule`

**Request:**
```json
{
  "userId": "<user-uuid>",
  "personaId": "<evelyn-uuid>",
  "trigger": "inactivity",
  "daysAfterLastSession": 7
}
```

**Expected Actions:**
1. System tracks user's `lastLoginAt`
2. After 7 days inactive, AI generates personalized message
3. Email/notification sent to user

**AI-Generated Message Example:**
```
Subject: Evelyn Cross Senses Your Energy

"Dear [FirstName],

It's been a week since we last connected, and I've been feeling your energy in my thoughts.
I sense you may still be wrestling with that career decision we discussed.

The universe has been sending me signs that now may be the perfect time for clarity.
Would you like to reconnect?

With light and guidance,
Evelyn Cross

P.S. I've set aside 5 free minutes for you to use this week."
```

**Verification:**
- Check `outreach_log` table (if implemented)
- User receives personalized, contextual outreach
- Bonus credits offered (configurable)

---

### Test 19: Marketplace - Create Vendor Account

**Endpoint:** `POST /api/marketplace/vendor/register`

**Request:**
```json
{
  "businessName": "Luna's Mystical Readings",
  "email": "luna@example.com",
  "description": "Expert in dream interpretation and lunar cycles",
  "commissionRate": 0.30
}
```

**Expected Actions:**
1. Create Stripe Connect account
2. Store vendor in database
3. Link to marketplace

**Endpoint:** `POST /api/marketplace/vendor/personas`

**Request:**
```json
{
  "vendorId": "<vendor-uuid>",
  "personaData": {
    "slug": "luna-dream",
    "displayName": "Luna Dream",
    "baseSystemPrompt": "You are Luna Dream, expert in dreams...",
    "customPricing": [...]
  }
}
```

**Expected:**
- Persona created under vendor account
- Revenue split: 70% vendor, 30% platform
- Persona visible in directory with "Verified Vendor" badge

---

### Test 20: Migration - Funnel Users to Chat Service

**Run Migration Script:**

```bash
tsx server/lib/migration.ts
```

**Expected Actions:**
1. Query all unique emails from `conversations` table
2. For each email:
   - Create `users` record
   - Generate temporary password
   - Award bonus credits:
     - 10 minutes if `purchased = true`
     - 5 minutes if lead only
   - Seed initial memory from funnel data:
     - `concern`, `personName`, `bucket` → user_memory
   - Send welcome email with temp password

**Verification:**
```sql
-- Check migrated users
SELECT email, first_name, credit_minutes, migrated_from_conversation_id
FROM users
WHERE migrated_from_conversation_id IS NOT NULL;

-- Check seeded memories
SELECT u.email, um.summary, um.category, um.importance
FROM user_memory um
JOIN users u ON um.user_id = u.id
WHERE u.migrated_from_conversation_id IS NOT NULL;
```

**Test migrated user login:**
1. Use temp password to login
2. Start session with Evelyn
3. Evelyn should reference funnel reading: "I remember from your initial reading that you were concerned about..."

---

## Performance Testing

### Load Test: Credit Tracking

**Simulate 100 concurrent sessions:**
- All sessions active for 2 minutes
- Heartbeat checkpoints every 30 seconds
- Verify all credits deducted correctly

**Expected:**
- No race conditions
- Accurate time tracking (±5 seconds tolerance)
- Database remains responsive

### Load Test: Memory Summarization

**End 50 sessions simultaneously:**
- Each session has 20-30 messages
- AI summarization triggered for all

**Expected:**
- Summaries complete within 2 minutes
- No duplicate summaries
- All memories stored correctly

---

## Security Testing

### Auth Tests

1. **JWT Expiration:**
   - Token expires after 7 days
   - Expired tokens rejected

2. **Password Security:**
   - bcrypt with 10 rounds
   - Passwords never returned in responses

3. **Authorization:**
   - Users can only access own sessions/memories
   - Admin routes require admin JWT

### Stripe Webhook Security

1. **Signature Verification:**
   - Invalid signatures rejected (403)
   - Replay attacks prevented

2. **Idempotency:**
   - Duplicate webhook events handled gracefully
   - Credits not added twice

---

## Bug Tracking

Document any issues found:

| Test # | Issue | Severity | Status |
|--------|-------|----------|--------|
| 3 | Session timer drift after 10+ minutes | Medium | Open |
| 7 | Stripe webhook 401 on localhost | Low | Expected (tunneling needed) |
| ... | ... | ... | ... |

---

## Success Criteria

**Phase 1:**
- ✅ User registration & login working
- ✅ Credit tracking accurate within 5 seconds
- ✅ Stripe integration functional
- ✅ Memory system persists across sessions

**Phase 2:**
- ✅ Multiple personas selectable
- ✅ Per-persona pricing enforced
- ✅ Admin can edit all configs without code changes
- ✅ A/B testing tracks variants correctly

**Phase 3:**
- ✅ Memory transfer works between personas
- ✅ Panel readings charge 2x rate
- ✅ Proactive outreach sends personalized messages
- ✅ Marketplace vendors can create personas

**Migration:**
- ✅ All funnel users migrated
- ✅ Bonus credits awarded
- ✅ Initial memories seeded
- ✅ Welcome emails sent

---

## Next Steps After Testing

1. **Production Deployment:**
   - Set up production database
   - Configure production Stripe keys
   - Set strong JWT_SECRET
   - Enable SSL/HTTPS

2. **Monitoring:**
   - Set up error tracking (Sentry)
   - Monitor credit accuracy
   - Track API performance
   - Alert on failed payments

3. **User Communication:**
   - Send migration emails to funnel users
   - Create onboarding flow
   - Document password reset process

4. **Iteration:**
   - Gather user feedback
   - A/B test prompts
   - Optimize pricing
   - Add new personas based on demand
