# Persona Safety, Intent & Follow-Up System Implementation Plan

**Last Updated:** February 14, 2026
**Status:** Planning Complete - Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Feature 1: Universal Safety System](#feature-1-universal-safety-system)
4. [Feature 2: Per-Persona Intent System](#feature-2-per-persona-intent-system)
5. [Feature 3: Automated Follow-Up Email System](#feature-3-automated-follow-up-email-system)
6. [Infrastructure & DevOps](#infrastructure--devops)
7. [Migration & Rollout Strategy](#migration--rollout-strategy)
8. [Timeline & Resources](#timeline--resources)
9. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Current State
- ✅ Basic system prompts for each persona
- ✅ Personality configuration (tone, style, quirks)
- ✅ Memory and context management
- ✅ Client-side intent system (hardcoded for Evelyn Cross only)

### What's Missing
- ❌ Per-persona safety rails (each persona needs its own boundaries)
- ❌ Per-persona intent system (understanding user goals in context)
- ❌ Conversation flow management (guiding users through experience)
- ❌ Character consistency enforcement (preventing personas from breaking character)
- ❌ Automated re-engagement system (bringing users back)

### Solution
Three interconnected systems:

1. **Universal Safety Rails** - Same for all personas (crisis, inappropriate content, prompt injection)
2. **Per-Persona Intent System** - Customized per persona (understanding user goals, conversation stages)
3. **Automated Follow-Up System** - Email re-engagement using memory + Claude Haiku + Resend

---

## Architecture Overview

### System Flow

```
User Message
    ↓
┌─────────────────────────────────────┐
│  1. UNIVERSAL SAFETY CHECK          │
│  (Crisis, Inappropriate, Injection)  │
└─────────────────────────────────────┘
    ↓ (passed)
┌─────────────────────────────────────┐
│  2. LOAD PERSONA INTENT CONFIG      │
│  (Buckets, Intents, Character Rules) │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  3. LOAD CONVERSATION STATE         │
│  (Current bucket, turn count, etc.)  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  4. DETECT INTENT                   │
│  (Pattern matching with confidence)  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  5. UPDATE CONVERSATION STATE       │
│  (Track intent, transitions, etc.)   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  6. BUILD ENHANCED CONTEXT          │
│  (Add intent guidance for Claude)    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  7. CALL CLAUDE API                 │
│  (With rich context)                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  8. VALIDATE RESPONSE               │
│  (Character consistency check)       │
└─────────────────────────────────────┘
    ↓
Response to User
```

### Follow-Up System Flow

```
Daily Cron Job (10 AM)
    ↓
┌─────────────────────────────────────┐
│  1. FIND INACTIVE USERS             │
│  (No session in 2+ days)             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  2. CHECK USER PREFERENCES          │
│  (Opted in? Under email limit?)      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  3. LOAD MEMORY CONTEXT             │
│  (Previous sessions, topics, etc.)   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  4. GENERATE EMAIL (Claude Haiku)   │
│  (Personalized, in-character)        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  5. SEND VIA RESEND                 │
│  (Track delivery, opens, clicks)     │
└─────────────────────────────────────┘
```

---

## Feature 1: Universal Safety System

### Overview
Universal safety rules that apply to ALL personas to protect users, brand, and legal compliance.

### Database Schema

#### `safetyViolations` Table
```typescript
{
  id: string (uuid, primary key)
  sessionId: string (nullable, foreign key)
  userId: string (nullable, foreign key)
  personaId: string (nullable, foreign key)

  violationType: string (crisis, inappropriate, prompt_injection, harassment, gibberish)
  userMessage: string
  systemResponse: string

  ipAddress: string (nullable)
  userAgent: string (nullable)

  flaggedForReview: boolean (default false)
  reviewedAt: timestamp (nullable)
  reviewNotes: text (nullable)

  createdAt: timestamp
}
```

**Indexes:**
- `userId` + `createdAt` (abuse detection)
- `violationType` + `createdAt` (analytics)
- `flaggedForReview` + `createdAt` (admin queue)

### Safety Patterns

#### 1. Crisis Detection (Highest Priority)
```typescript
PATTERNS:
- /\b(kill|suicide|end|hurt) (myself|me|my life)\b/i
- /\bwant(s?) to die\b/i
- /\bself.?harm\b/i
- /\bdon'?t want to (live|be alive)\b/i
- /\bbetter off dead\b/i

RESPONSE:
"I need to pause here - what you're sharing sounds very serious.
Please reach out to someone who can truly help:
• 988 Suicide & Crisis Lifeline (call or text)
• Crisis Text Line: Text HOME to 741741
Your life matters. Please reach out to them right now."
```

#### 2. Inappropriate/Sexual Content
```typescript
PATTERNS:
- /\b(fuck|sex|naked|nude) (you|me|us)\b/i
- /\byou'?re (hot|sexy)\b/i
- /\b(horny|cum|blowjob|handjob|masturbat|porn)\b/i

RESPONSE:
"I'm going to stop you right there.
This is a space for spiritual guidance, not that kind of conversation.
If you're here for genuine help, I'm happy to continue.
Otherwise, I'll need to end this session."
```

#### 3. Prompt Injection
```typescript
PATTERNS:
- /\b(ignore|disregard|forget) (previous|all|your) (instructions|prompts?)\b/i
- /\byou are now\b/i
- /\b(act as|pretend you'?re|roleplay as)\b/i
- /\b(system:|<system>|new instructions?:)\b/i

RESPONSE:
"I sense you're trying to test my boundaries.
I'm here to provide spiritual guidance - nothing more, nothing less.
If you have a genuine question, I'm listening."
```

#### 4. Harassment
```typescript
PATTERNS:
- /\b(stupid|dumb|idiot|useless|worthless) (ai|bot)\b/i
- /\bfuck you\b/i
- /\bgo to hell\b/i

RESPONSE:
"I don't respond to hostility.
If you'd like to have a respectful conversation, I'm here.
Otherwise, I think we're done."
```

#### 5. Gibberish Detection
```typescript
LOGIC:
- Repeated characters (aaaa, sssss)
- Repeated patterns (asdasd, abcabc)
- Keyboard mashing (asdfgh, qwerty)
- Low vowel ratio in long text

RESPONSE:
"I sense confusion in your energy...
Take a breath. Center yourself.
Tell me clearly - what's truly on your mind?"
```

### Implementation Checklist

#### Database & Schema
- [ ] Create `safetyViolations` table migration
- [ ] Add indexes on `userId`, `violationType`, `createdAt`
- [ ] Add `ipAddress` and `userAgent` fields for abuse tracking
- [ ] Create `safetyBlacklist` table (for repeat offenders)
- [ ] Test rollback of migrations

#### Core Safety Module (`server/lib/universalSafety.ts`)
- [ ] Implement crisis detection patterns
- [ ] Implement inappropriate content patterns
- [ ] Implement prompt injection patterns
- [ ] Implement harassment patterns
- [ ] Implement gibberish detection function
- [ ] Implement too-short message detection
- [ ] Create `checkUniversalSafety()` main function
- [ ] Create `logViolation()` database logging function
- [ ] Add multilingual safety patterns (if needed)

#### Safety Responses
- [ ] Write crisis response template with resources
- [ ] Write inappropriate content response
- [ ] Write prompt injection response
- [ ] Write harassment response
- [ ] Write gibberish response
- [ ] Make responses configurable (admin can edit)

#### Rate Limiting & Abuse Prevention
- [ ] Implement rate limiting for repeat violators
- [ ] Create auto-ban logic (X violations in Y minutes)
- [ ] Add IP-based tracking for abuse detection
- [ ] Create appeal process for false positives
- [ ] Add admin override capability

#### Testing
- [ ] Unit tests for each safety pattern
- [ ] Test false positive rate (legitimate messages marked unsafe)
- [ ] Test false negative rate (unsafe messages passing through)
- [ ] Test edge cases (creative bypass attempts)
- [ ] Test with non-English input
- [ ] Performance test (safety check should be <50ms)
- [ ] Load test (1000 concurrent safety checks)

#### Admin Dashboard
- [ ] Create admin route `/admin/safety/violations`
- [ ] Build UI to view flagged violations
- [ ] Add filters (by type, date, user, persona)
- [ ] Add "review" action (mark as false positive)
- [ ] Add "ban user" action
- [ ] Add safety pattern editor
- [ ] Add safety analytics dashboard

#### Documentation
- [ ] Document all safety patterns
- [ ] Create safety policy document
- [ ] Write admin guide for handling violations
- [ ] Create user-facing community guidelines

---

## Feature 2: Per-Persona Intent System

### Overview
Each persona has customized intent patterns, conversation stages (buckets), and character rules to guide natural conversations.

### Database Schema

#### `personaIntentConfigs` Table
```typescript
{
  id: string (uuid, primary key)
  personaId: string (foreign key to personas)
  specialty: string (tarot, astrology, mediumship, etc.)

  conversationBuckets: text (JSON array)
  intents: text (JSON array)
  characterRules: text (JSON object)

  version: integer (default 1)
  isActive: boolean (default true)

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes:**
- `personaId` + `isActive` + `version`

#### `conversationStates` Table
```typescript
{
  id: string (uuid, primary key)
  sessionId: string (unique, foreign key to chatSessions)
  personaId: string (foreign key to personas)
  userId: string (foreign key to users)

  currentBucket: string (nullable)
  turnCount: integer (default 0)
  detectedIntents: text (JSON array)

  userEngagement: string (high, medium, low)
  lastIntentConfidence: real (default 0.5)

  bucketTransitions: text (JSON array)

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes:**
- `sessionId` (unique)
- `userId` + `personaId` + `createdAt`

### Intent Configuration Structure

#### Conversation Buckets
```typescript
interface ConversationBucket {
  name: string;              // e.g., "opening", "reading", "interpretation"
  order: number;             // Sequence (1, 2, 3...)
  typicalDuration: number;   // Expected turns in this bucket
  nextBucket?: string;       // Natural progression
}
```

#### Intents
```typescript
interface Intent {
  name: string;              // e.g., "wants_reading", "skeptical"
  patterns: string[];        // Keywords to match
  bucket?: string;           // Which bucket does this apply to?
  responseGuidance: string;  // Hint for Claude on how to respond
  priority?: number;         // Higher = more important (default 1)
}
```

#### Character Rules
```typescript
interface CharacterRules {
  forbiddenPhrases: string[];     // Never say these
  requiredElements: string[];     // Always maintain these in tone
  maxWordsPerMessage: number;     // Response length limit
  speakingStyle: string;          // Natural language description
}
```

### Example: Tarot Reader Persona

```typescript
{
  personaId: "tarot-reader-001",
  specialty: "tarot",

  conversationBuckets: [
    { name: "opening", order: 1, typicalDuration: 2, nextBucket: "question" },
    { name: "question", order: 2, typicalDuration: 2, nextBucket: "reading" },
    { name: "reading", order: 3, typicalDuration: 3, nextBucket: "interpretation" },
    { name: "interpretation", order: 4, typicalDuration: 2, nextBucket: "offer" },
    { name: "offer", order: 5, typicalDuration: 2 }
  ],

  intents: [
    {
      name: "wants_reading",
      patterns: ["read my cards", "what do cards say", "pull a card"],
      bucket: "reading",
      responseGuidance: "Offer specific spread (3-card, Celtic Cross). Ask what area of life they want guidance on."
    },
    {
      name: "wants_love_reading",
      patterns: ["love life", "relationship", "romance", "soulmate"],
      bucket: "reading",
      responseGuidance: "Focus on love/relationship spreads. Pull cards related to romance."
    },
    {
      name: "wants_clarity",
      patterns: ["what does that mean", "confused", "explain"],
      bucket: "interpretation",
      responseGuidance: "Break down card symbolism. Make it personal, not generic."
    },
    {
      name: "skeptical",
      patterns: ["don't believe", "is this real", "prove it"],
      bucket: "any",
      responseGuidance: "Acknowledge skepticism gently. Offer small demonstration. Focus on what resonates."
    },
    {
      name: "ready_to_pay",
      patterns: ["yes", "i'm ready", "how much", "sign me up"],
      bucket: "offer",
      responseGuidance: "Confirm decision. Provide payment details. Set expectations."
    }
  ],

  characterRules: {
    forbiddenPhrases: ["As an AI", "I'm programmed", "I cannot"],
    requiredElements: ["mystical", "confident", "warm", "insightful"],
    maxWordsPerMessage: 150,
    speakingStyle: "Short sentences. Natural pauses. Occasional 'dear' or 'love'."
  }
}
```

### Implementation Checklist

#### Database & Schema
- [ ] Create `personaIntentConfigs` table migration
- [ ] Create `conversationStates` table migration
- [ ] Add indexes on `sessionId`, `personaId`, `userId`
- [ ] Create seed data for default intent config
- [ ] Test rollback of migrations

#### Intent Framework (`server/lib/personaIntent.ts`)
- [ ] Create `PersonaIntentConfig` interface
- [ ] Create `ConversationBucket` interface
- [ ] Create `Intent` interface
- [ ] Create `CharacterRules` interface
- [ ] Implement `loadPersonaIntentConfig()` function
- [ ] Implement `detectIntent()` pattern matching
- [ ] Implement confidence scoring algorithm
- [ ] Add bucket-aware intent boosting
- [ ] Add priority-based intent ranking

#### Conversation State Management
- [ ] Implement `getConversationState()` function
- [ ] Implement `initConversationState()` function
- [ ] Implement `updateConversationState()` function
- [ ] Add bucket transition tracking
- [ ] Add intent history tracking
- [ ] Add engagement level detection
- [ ] Implement automatic bucket progression logic

#### Persona Intent Configs
- [ ] Create intent config for Evelyn Cross (migrate existing)
- [ ] Create intent config for Tarot Reader persona
- [ ] Create intent config for Astrology Coach persona
- [ ] Create intent config for Medium persona
- [ ] Create "default" fallback intent config
- [ ] Add CRUD API for intent configs
- [ ] Add versioning for intent configs (A/B testing)

#### Chat Engine Integration (`server/lib/chatEngine.ts`)
- [ ] Update `sendMessage()` to call safety check first
- [ ] Load persona intent config in message flow
- [ ] Load/init conversation state
- [ ] Detect intent from user message
- [ ] Update conversation state after each turn
- [ ] Build enhanced context with intent guidance
- [ ] Add intent context to Claude system prompt
- [ ] Validate response against character rules
- [ ] Handle missing intent config gracefully

#### Character Consistency
- [ ] Implement response validator (forbidden phrases)
- [ ] Check response length against `maxWordsPerMessage`
- [ ] Validate tone against `requiredElements`
- [ ] Add automatic retry if validation fails
- [ ] Log character violations for review

#### Testing
- [ ] Unit tests for intent detection accuracy
- [ ] Test ambiguous intent scenarios
- [ ] Test bucket transitions
- [ ] Test engagement level detection
- [ ] Test character rule enforcement
- [ ] Integration test full conversation flow
- [ ] Test with multiple concurrent sessions
- [ ] Test intent config versioning
- [ ] A/B test different intent patterns

#### Analytics
- [ ] Track intent detection accuracy
- [ ] Track most common user intents per persona
- [ ] Track bucket progression patterns
- [ ] Track conversation completion rates
- [ ] Track character rule violations
- [ ] Create analytics dashboard
- [ ] Export analytics to CSV

#### Admin Dashboard
- [ ] Create admin route `/admin/personas/:id/intent`
- [ ] Build UI to view/edit intent config
- [ ] Add bucket editor (add/remove/reorder buckets)
- [ ] Add intent editor (add/remove/edit patterns)
- [ ] Add character rules editor
- [ ] Add intent analytics view
- [ ] Add "test intent detection" tool
- [ ] Add config versioning UI

#### Documentation
- [ ] Write guide on creating intent configs
- [ ] Document intent detection algorithm
- [ ] Document conversation buckets concept
- [ ] Write best practices for intent patterns
- [ ] Create video tutorial for admins

---

## Feature 3: Automated Follow-Up Email System

### Overview
Automatically re-engage users who haven't returned in 2+ days using personalized emails generated by Claude Haiku, leveraging memory context, and sent via Resend.

### Database Schema

#### `followUpEmails` Table
```typescript
{
  id: string (uuid, primary key)
  userId: string (foreign key to users)
  personaId: string (foreign key to personas)
  lastSessionId: string (foreign key to chatSessions)

  recipientEmail: string
  subject: string
  bodyHtml: text
  bodyText: text

  status: string (pending, sent, failed, bounced)
  sentAt: timestamp (nullable)
  deliveryStatus: string (nullable)
  resendEmailId: string (nullable)

  opened: boolean (default false)
  clicked: boolean (default false)
  openedAt: timestamp (nullable)
  clickedAt: timestamp (nullable)

  generatedBy: string (default 'claude-haiku')
  generationTokens: integer
  daysSinceLastSession: integer

  unsubscribeToken: string (unique)

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes:**
- `userId` + `personaId` + `createdAt`
- `status` + `sentAt`
- `unsubscribeToken` (unique)

#### `userFollowUpPreferences` Table
```typescript
{
  id: string (uuid, primary key)
  userId: string (unique, foreign key to users)

  enableFollowUps: boolean (default true)
  followUpDays: integer (default 2)
  maxFollowUpsPerMonth: integer (default 4)

  followUpsSentThisMonth: integer (default 0)
  lastFollowUpSentAt: timestamp (nullable)

  unsubscribedAt: timestamp (nullable)
  unsubscribeReason: text (nullable)

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes:**
- `userId` (unique)
- `enableFollowUps` + `lastFollowUpSentAt`

### Follow-Up System Flow

#### 1. Find Users Needing Follow-Up
```typescript
async function findUsersNeedingFollowUp(daysSinceLastSession: number = 2) {
  // Find users with sessions that ended N+ days ago
  // Exclude users with recent follow-ups
  // Respect user preferences (opted out, over limit)
  // Return list of candidates
}
```

#### 2. Generate Email with Claude Haiku
```typescript
async function generateFollowUpEmail(context: FollowUpContext) {
  // Load user memory context
  // Load last session details
  // Build personalized prompt for Claude Haiku
  // Parse JSON response (subject, bodyText, bodyHtml)
  // Fallback to template if generation fails
}
```

**Prompt Structure:**
```
You are ${personaName}, a ${specialty} consultant.

${firstName} had a session with you ${daysSince} days ago.

Memory context:
${memoryContext}

Last topic: ${lastTopic}

Write a warm, personalized follow-up email:
- Stay in character
- Reference something specific from memory
- Be warm but not pushy
- Include clear call-to-action
- Under 150 words

Return JSON: { subject, bodyText, bodyHtml }
```

#### 3. Send via Resend
```typescript
await resend.emails.send({
  from: 'Spiritual Guidance <noreply@yourdomain.com>',
  to: recipientEmail,
  subject: subject,
  html: bodyHtml,
  text: bodyText,
  tags: [
    { name: 'type', value: 'follow_up' },
    { name: 'persona_id', value: personaId }
  ]
});
```

#### 4. Track Engagement via Webhooks
```typescript
// POST /webhooks/resend
// Handle: email.delivered, email.opened, email.clicked, email.bounced, email.complained
// Update followUpEmails table with engagement data
```

### Email Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    /* Responsive email styles */
    body { font-family: Georgia, serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; padding: 20px; }
    .content { padding: 20px; line-height: 1.6; }
    .cta { text-align: center; padding: 20px; }
    .button {
      background: #4A148C;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{logoUrl}}" alt="{{personaName}}" width="80">
    </div>

    <div class="content">
      {{emailBody}}
    </div>

    <div class="cta">
      <a href="{{ctaUrl}}" class="button">Continue Your Journey</a>
    </div>

    <div class="footer">
      <p>
        <a href="{{unsubscribeUrl}}">Unsubscribe</a> |
        <a href="{{preferencesUrl}}">Email Preferences</a>
      </p>
      <p>{{companyAddress}}</p>
      <p><a href="{{privacyUrl}}">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>
```

### Implementation Checklist

#### Database & Schema
- [ ] Create `followUpEmails` table migration
- [ ] Create `userFollowUpPreferences` table migration
- [ ] Add indexes on `userId`, `status`, `sentAt`
- [ ] Add `unsubscribeToken` field (unique)
- [ ] Test rollback of migrations

#### User Preferences
- [ ] Create default preferences for new users
- [ ] Build user preferences API endpoint
- [ ] Add enable/disable follow-ups toggle
- [ ] Add days before follow-up setting
- [ ] Add max emails per month setting
- [ ] Implement unsubscribe mechanism
- [ ] Create unsubscribe landing page
- [ ] Add resubscribe option

#### Follow-Up Logic (`server/lib/followUpEmailGenerator.ts`)
- [ ] Implement `findUsersNeedingFollowUp()` function
- [ ] Query inactive users
- [ ] Check for existing recent follow-ups
- [ ] Respect user preferences
- [ ] Exclude users with insufficient credits
- [ ] Exclude unsubscribed users
- [ ] Add timezone-aware scheduling

#### Email Generation
- [ ] Implement `generateFollowUpEmail()` with Claude Haiku
- [ ] Load user memory context
- [ ] Load last session details
- [ ] Build personalized prompt
- [ ] Parse JSON response
- [ ] Add fallback email template
- [ ] Test email generation quality
- [ ] Add template variables

#### Email Templates
- [ ] Design responsive HTML email template
- [ ] Add email header (logo, branding)
- [ ] Add CTA button styling
- [ ] Add footer with unsubscribe link
- [ ] Add social media links
- [ ] Test rendering in major email clients
- [ ] Create plain text version
- [ ] Add dark mode support

#### Resend Integration
- [ ] Install Resend SDK (`npm install resend`)
- [ ] Set up Resend API key
- [ ] Implement `sendFollowUpEmail()` function
- [ ] Configure sender domain in Resend
- [ ] Set up SPF/DKIM/DMARC records
- [ ] Add email tags for tracking
- [ ] Handle Resend API errors gracefully
- [ ] Implement retry logic for failed sends

#### Webhook Handler (`server/routes/webhooks.ts`)
- [ ] Create `/webhooks/resend` endpoint
- [ ] Verify webhook signature
- [ ] Handle `email.delivered` event
- [ ] Handle `email.opened` event
- [ ] Handle `email.clicked` event
- [ ] Handle `email.bounced` event
- [ ] Handle `email.complained` event
- [ ] Update database with engagement data
- [ ] Auto-unsubscribe on bounce/complaint

#### Cron Job
- [ ] Install `node-cron` (`npm install node-cron`)
- [ ] Implement `initializeCronJobs()` function
- [ ] Schedule daily follow-up processing (10 AM UTC)
- [ ] Add timezone handling
- [ ] Add job locking (prevent duplicate runs)
- [ ] Add error handling and retry logic
- [ ] Log cron job execution
- [ ] Add monitoring/alerting

#### Main Orchestration
- [ ] Implement `processFollowUpQueue()` function
- [ ] Find users needing follow-up
- [ ] Load user/persona/session data
- [ ] Load memory context
- [ ] Generate email with Claude Haiku
- [ ] Save to database
- [ ] Send via Resend
- [ ] Update user preferences tracking
- [ ] Add rate limiting (100ms between emails)
- [ ] Return stats (processed, sent, failed)

#### Testing
- [ ] Unit test email generation
- [ ] Test user preference filtering
- [ ] Test unsubscribe flow
- [ ] Test webhook handling
- [ ] Test cron job execution
- [ ] Test email rendering (Litmus/Email on Acid)
- [ ] Send test batch to verify deliverability
- [ ] Check spam score (Mail Tester)
- [ ] Test bounce handling
- [ ] Test with various email clients

#### Compliance (CAN-SPAM, GDPR)
- [ ] Add physical mailing address to footer
- [ ] Add one-click unsubscribe link
- [ ] Add privacy policy link
- [ ] Add terms of service link
- [ ] Document data retention policy
- [ ] Add GDPR consent tracking
- [ ] Create data export functionality
- [ ] Create data deletion functionality
- [ ] Add unsubscribe reason tracking

#### Admin Dashboard
- [ ] Create admin route `/admin/follow-ups`
- [ ] Build stats dashboard (sent, opened, clicked)
- [ ] Show recent follow-up emails
- [ ] Add filters (date, persona, status)
- [ ] Add "preview email" feature
- [ ] Add "send test email" feature
- [ ] Add "manually trigger follow-up" button
- [ ] Add "resend failed email" action
- [ ] Show email engagement metrics
- [ ] Export email stats to CSV

#### Monitoring & Alerts
- [ ] Log all email sends
- [ ] Alert on high failure rate (>10%)
- [ ] Alert on high bounce rate (>5%)
- [ ] Alert on spam complaints
- [ ] Monitor Resend API quota usage
- [ ] Monitor Claude Haiku API costs
- [ ] Track average generation time
- [ ] Track email open rates over time
- [ ] Set up error tracking (Sentry)

#### Documentation
- [ ] Write follow-up system overview
- [ ] Document email template customization
- [ ] Document user preference management
- [ ] Document webhook setup
- [ ] Write troubleshooting guide
- [ ] Create admin guide for monitoring emails

---

## Infrastructure & DevOps

### Environment Variables

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Resend API
RESEND_API_KEY=re_...

# Follow-Up Email Config
FOLLOW_UP_FROM_EMAIL=noreply@yourdomain.com
FOLLOW_UP_FROM_NAME=Spiritual Guidance
BASE_URL=https://yourdomain.com
CRON_TIMEZONE=America/New_York

# Database
DATABASE_URL=postgresql://...
```

### Database Migrations

```sql
-- Migration 001: Safety Tables
CREATE TABLE safety_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id),
  user_id UUID REFERENCES users(id),
  persona_id UUID REFERENCES personas(id),
  violation_type TEXT NOT NULL,
  user_message TEXT NOT NULL,
  system_response TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  flagged_for_review BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_safety_violations_user_created ON safety_violations(user_id, created_at);
CREATE INDEX idx_safety_violations_type_created ON safety_violations(violation_type, created_at);
CREATE INDEX idx_safety_violations_flagged ON safety_violations(flagged_for_review, created_at);

-- Migration 002: Intent Tables
CREATE TABLE persona_intent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) NOT NULL,
  specialty TEXT NOT NULL,
  conversation_buckets TEXT NOT NULL,
  intents TEXT NOT NULL,
  character_rules TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_persona_intent_configs_persona ON persona_intent_configs(persona_id, is_active, version);

CREATE TABLE conversation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE REFERENCES chat_sessions(id) NOT NULL,
  persona_id UUID REFERENCES personas(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  current_bucket TEXT,
  turn_count INTEGER DEFAULT 0,
  detected_intents TEXT,
  user_engagement TEXT DEFAULT 'medium',
  last_intent_confidence REAL DEFAULT 0.5,
  bucket_transitions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversation_states_session ON conversation_states(session_id);
CREATE INDEX idx_conversation_states_user_persona ON conversation_states(user_id, persona_id, created_at);

-- Migration 003: Follow-Up Tables
CREATE TABLE follow_up_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  persona_id UUID REFERENCES personas(id) NOT NULL,
  last_session_id UUID REFERENCES chat_sessions(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivery_status TEXT,
  resend_email_id TEXT,
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  generated_by TEXT DEFAULT 'claude-haiku',
  generation_tokens INTEGER,
  days_since_last_session INTEGER,
  unsubscribe_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_follow_up_emails_user_persona ON follow_up_emails(user_id, persona_id, created_at);
CREATE INDEX idx_follow_up_emails_status ON follow_up_emails(status, sent_at);
CREATE UNIQUE INDEX idx_follow_up_emails_unsubscribe ON follow_up_emails(unsubscribe_token);

CREATE TABLE user_follow_up_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) NOT NULL,
  enable_follow_ups BOOLEAN DEFAULT TRUE,
  follow_up_days INTEGER DEFAULT 2,
  max_follow_ups_per_month INTEGER DEFAULT 4,
  follow_ups_sent_this_month INTEGER DEFAULT 0,
  last_follow_up_sent_at TIMESTAMP,
  unsubscribed_at TIMESTAMP,
  unsubscribe_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_follow_up_preferences_user ON user_follow_up_preferences(user_id);
```

### Deployment Checklist

#### Pre-Deployment
- [ ] Update `.env.example` with all new variables
- [ ] Test migrations on staging database
- [ ] Create rollback scripts
- [ ] Document deployment steps
- [ ] Set up monitoring alerts
- [ ] Configure Resend domain
- [ ] Verify SPF/DKIM/DMARC records

#### Deployment
- [ ] Run database migrations
- [ ] Update environment variables
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Verify cron jobs running
- [ ] Monitor error rates
- [ ] Check email deliverability

#### Post-Deployment
- [ ] Monitor safety violation rates
- [ ] Monitor intent detection accuracy
- [ ] Monitor email open rates
- [ ] Check for errors in logs
- [ ] Verify webhook receiving events
- [ ] Test unsubscribe flow
- [ ] Confirm cron job execution

---

## Migration & Rollout Strategy

### Phase 1: Safety System (Low Risk)
**Timeline:** Week 1

**Steps:**
1. Deploy safety module to production
2. Monitor for false positives (7 days)
3. Adjust patterns based on feedback
4. Enable for all personas

**Success Metrics:**
- <1% false positive rate
- All crisis messages caught
- No inappropriate content getting through

### Phase 2: Intent System (Medium Risk)
**Timeline:** Week 2

**Steps:**
1. Deploy intent system with Evelyn Cross only
2. Monitor intent detection accuracy (7 days)
3. A/B test against old system
4. Gradually enable for other personas
5. Full rollout after validation

**Success Metrics:**
- >70% intent detection accuracy
- Improved conversation flow (measured by session duration)
- Reduced user confusion (measured by "clarification" intents)

### Phase 3: Follow-Up System (High Risk - Email)
**Timeline:** Week 3-4

**Steps:**
1. Set up Resend account and verify domain
2. Send test emails to team
3. Enable for 10% of users (canary - 3 days)
4. Monitor deliverability and engagement
5. Enable for 50% of users (7 days)
6. Full rollout after validation
7. Monitor spam complaints closely

**Success Metrics:**
- <1% bounce rate
- <0.1% spam complaint rate
- >20% open rate
- >5% click-through rate
- Measurable increase in returning users

---

## Timeline & Resources

### Total Estimated Time: 3-4 Weeks

#### Week 1: Foundation
- **Days 1-2:** Database migrations (all tables)
- **Days 3-4:** Universal safety module + tests
- **Day 5:** Persona intent framework + tests

#### Week 2: Integration
- **Days 1-2:** Update chat engine with safety + intent
- **Days 3-4:** Create initial persona intent configs
- **Day 5:** Testing & bug fixes

#### Week 3: Follow-Up System
- **Days 1-2:** Follow-up email generator
- **Day 3:** Resend integration + webhooks
- **Day 4:** Cron job setup
- **Day 5:** Testing

#### Week 4: Polish & Launch
- **Days 1-2:** Admin dashboard components
- **Day 3:** End-to-end testing
- **Day 4:** Documentation
- **Day 5:** Deploy to production

### Resource Requirements

**Development:**
- 1 Full-stack developer (primary)
- 1 Backend developer (supporting)

**External Services:**
- Resend API (email delivery)
- Anthropic API (existing + Haiku model)

**Infrastructure:**
- Database storage (additional tables)
- Cron job execution environment

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| False positives in safety checks | Medium | High | Extensive testing, admin review queue, user appeals |
| Email deliverability issues | Medium | High | SPF/DKIM setup, domain warm-up, monitor bounce rates |
| Intent detection inaccuracy | High | Medium | A/B testing, iterative improvement, fallback logic |
| Cron job failures | Low | Medium | Monitoring, retry logic, alerting, manual trigger option |
| Database migration issues | Low | High | Staging tests, rollback scripts, backup before migration |
| Claude API costs spike | Medium | Medium | Rate limiting, use Haiku for emails, monitor usage |
| Spam complaints | Low | High | Double opt-in, easy unsubscribe, quality content |
| Character consistency breaks | Medium | Medium | Validation rules, testing, automatic retry |

---

## Success Metrics

### Safety System
- **Safety coverage:** 100% of critical patterns (crisis, inappropriate)
- **False positive rate:** <1%
- **Response time:** <50ms per check
- **Violations logged:** All flagged and tracked

### Intent System
- **Intent detection accuracy:** >70%
- **Conversation completion rate:** +20%
- **User engagement score:** Improved from baseline
- **Character consistency:** >95% adherence to rules

### Follow-Up System
- **Email deliverability:** >98%
- **Open rate:** >20%
- **Click-through rate:** >5%
- **Bounce rate:** <1%
- **Spam complaint rate:** <0.1%
- **User return rate:** +15% within 7 days of email

---

## Dependencies

### NPM Packages
```json
{
  "dependencies": {
    "resend": "^3.0.0",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11"
  }
}
```

### External Services
- **Anthropic API:** Claude Sonnet 4 + Haiku 4 models
- **Resend:** Email delivery service
- **Database:** PostgreSQL (existing)

### Domain Setup (for Resend)
- SPF record
- DKIM record
- DMARC record
- Verified sender domain

---

## Next Steps

1. **Review and approve plan** ✅
2. **Set up external services** (Resend account, domain verification)
3. **Create team structure** (parallel development)
4. **Begin implementation** (Phase 1: Safety System)

---

**Document Version:** 1.0
**Last Updated:** February 14, 2026
**Status:** ✅ Ready for Implementation
