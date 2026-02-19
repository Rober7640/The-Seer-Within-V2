# The Seer Within -- Architecture Overview

## Executive Summary

The Seer Within is a full-stack spiritual guidance platform running **two independent systems** on shared infrastructure: a conversion funnel (no-login, one-time purchase) and a multi-persona chat service (account-based, credit system). Both use the same Express server, PostgreSQL (Supabase), Claude AI, and Stripe, but maintain separate data models and user journeys.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph client [React Client - Vite]
        Landing[LandingPage]
        ChatFunnel[ChatPage]
        Upsell1[UpsellPage]
        Upsell2[Upsell2Page]
        Success[SuccessPage]
        Login[LoginPage]
        Reading[ChatServicePage]
        Personas[PersonasDirectory]
        Credits[CreditsPage]
        Admin[Admin Pages]
    end

    subgraph server [Express Server - Port 5000]
        Routes[routes.ts]
        Health[Health Check]
    end

    subgraph external [External Services]
        Supabase[(Supabase Postgres)]
        Claude[Anthropic Claude]
        Stripe[Stripe]
        AWeber[AWeber]
        Resend[Resend]
        FB[Facebook Conversions API]
    end

    client --> server
    server --> Supabase
    server --> Claude
    server --> Stripe
    server --> AWeber
    server --> Resend
    server --> FB
```

**Stack:**
- **Frontend:** React 19, Vite 7, Wouter (routing), TanStack Query (data fetching), TailwindCSS, Radix UI
- **Backend:** Express 5, TypeScript, Drizzle ORM
- **Database:** PostgreSQL via Supabase
- **AI:** Anthropic Claude (chatEngine, claude.ts, memory summarization)
- **Payments:** Stripe (funnel checkout + credit packages)
- **Email:** AWeber (funnel leads/paid lists), Resend (verification, password reset, follow-ups)
- **Monitoring:** Sentry (error tracking), Winston (structured logging), Prometheus-style metrics at `/api/metrics`
- **Reliability:** Opossum circuit breaker around Claude API calls

---

## 2. Dual-System Architecture

The platform runs two completely independent user journeys side by side on the same codebase:

```mermaid
flowchart LR
    subgraph system1 [System 1 - Evelyn Funnel]
        S1_Landing["/"]
        S1_Chat["/chat"]
        S1_Checkout["$35 Main"]
        S1_Upsell1["/welcome1 - $47"]
        S1_Upsell2["/welcome2 - $47/$30"]
        S1_Success["/success"]
        S1_Landing --> S1_Chat --> S1_Checkout --> S1_Upsell1 --> S1_Upsell2 --> S1_Success
    end

    subgraph system2 [System 2 - Chat Service]
        S2_Login["/login"]
        S2_Personas["/personas"]
        S2_Reading["/reading or /chat/:slug"]
        S2_Credits["/credits"]
        S2_Login --> S2_Personas
        S2_Login --> S2_Reading
        S2_Reading --> S2_Credits
    end

    subgraph shared [Shared Infrastructure]
        DB[(Same Supabase)]
        AI[Same Claude API]
        Payments[Same Stripe]
        Server[Same Express]
    end

    system1 --> shared
    system2 --> shared
```

| Aspect | System 1: Funnel | System 2: Chat Service |
|--------|------------------|------------------------|
| **Access** | No login required | JWT auth required |
| **Personas** | Evelyn only | Evelyn + Marcus (expandable) |
| **Pricing** | One-time $35 + upsells ($47 + $47/$30) | 3 free mins, then purchase credit packages |
| **Data Storage** | `conversations` table | `users`, `chat_sessions`, `chat_messages`, `user_memory` |
| **Memory** | Session-only | Cross-session, per-persona persistent |
| **Entry Point** | `/` landing page | `/login` |
| **Goal** | Immediate conversion | Long-term relationship / recurring revenue |

---

## 3. System 1 -- Funnel Flow

The funnel is a high-conversion sales flow: landing page, AI chat with Evelyn (state-machine driven), Stripe checkout for a $35 reading, then two upsell pages for physical products.

```mermaid
sequenceDiagram
    participant User
    participant Landing
    participant ChatPage
    participant API as Express API
    participant Claude
    participant DB as conversations table
    participant Stripe
    participant AWeber

    User->>Landing: Visit /
    User->>ChatPage: Navigate to /chat
    ChatPage->>API: POST /api/lead (email, firstName)
    API->>DB: saveConversation
    API->>AWeber: addSubscriberToList (non-blocking)

    loop State machine chat phases
        ChatPage->>API: POST /api/chat (action, userData, input)
        API->>Claude: generateReading1, crisisReveal, etc.
        Claude-->>API: messages[]
        API-->>ChatPage: response
    end

    ChatPage->>API: POST /api/save-progress
    ChatPage->>API: POST /api/checkout (email, firstName, bucket)
    API->>DB: markPurchased, updateStripeData
    API->>Stripe: checkout.sessions.create ($35)
    Stripe-->>User: Redirect to payment page

    User->>API: GET /api/upsell/user-data?session_id=...
    API->>DB: getConversationByStripeSession, markUpsellOffered
    API->>AWeber: addPaidSubscriber (non-blocking)

    Note over User, Stripe: Upsell 1: 1-click charge (off_session) or fallback checkout
    User->>API: POST /api/upsell/charge
    API->>Stripe: paymentIntents.create ($47, off_session)
    API->>DB: markUpsellPurchased

    Note over User, Stripe: Upsell 2: Same pattern, full ($47) or downsell ($30)
    User->>API: POST /api/upsell2/charge
    API->>Stripe: paymentIntents.create
    API->>DB: markUpsell2Purchased
```

### Chat State Machine Actions

The funnel chat uses a state machine where the frontend sends an `action` string to `/api/chat`:

| Action | Purpose |
|--------|---------|
| `reading1` | First reading round |
| `reading2` | Second reading round (deepening) |
| `futureValidation` | Future validation phase |
| `crisisReveal` | Crisis/reveal phase |
| `crisisCost` | Cost of inaction |
| `crisisUrgency` | Urgency building |
| `shadowSummary` | Shadow summary |
| `valueExplain` | Value explanation |
| `objection` | Handle purchase objection |

### Key Files

| File | Purpose |
|------|---------|
| `client/src/pages/LandingPage.tsx` | Evelyn homepage with trust badges and scarcity |
| `client/src/pages/ChatPage.tsx` | State-machine chat interface |
| `client/src/pages/UpsellPage.tsx` | Upsell 1: Protection Ritual + Lava Stone ($47) |
| `client/src/pages/Upsell2Page.tsx` | Upsell 2: Manifestation Bracelet ($47/$30) |
| `client/src/pages/SuccessPage.tsx` | Purchase confirmation |
| `server/routes.ts` | All funnel API endpoints (inline) |
| `server/lib/claude.ts` | Claude prompt functions for each chat action |
| `server/lib/db.ts` | Conversation CRUD, Stripe data, upsell tracking |
| `server/lib/facebook.ts` | Facebook Conversions API (server-side events) |

---

## 4. System 2 -- Chat Service Flow

The chat service is an account-based platform where users register, get 3 free minutes, and can chat with multiple spiritual advisor personas. Each message flows through a rich pipeline of safety checks, intent detection, memory loading, and response validation.

```mermaid
flowchart TB
    subgraph auth [Auth Layer - server/routes/auth.ts]
        Register["POST /api/auth/register"]
        Login["POST /api/auth/login"]
        JWT["JWT requireAuth middleware"]
        Fraud["fraudDetection module"]
    end

    subgraph chatFlow [Chat API - server/routes/chatService.ts]
        StartSession["POST /api/chat-service/session/start"]
        SendMsg["POST /api/chat-service/session/:id/message"]
        EndSession["POST /api/chat-service/session/:id/end"]

        StartSession --> initSession["chatEngine.initSession"]
        SendMsg --> sendMessage["chatEngine.sendMessage"]
        EndSession --> endChatSessionFn["creditTracking.endChatSession"]
    end

    subgraph engine [chatEngine.ts - Message Pipeline]
        loadPersona["loadPersonaConfig"]
        loadMem["memoryManager.loadUserContext"]
        crossMem["memoryTransfer.loadCrossPersonaMemories"]
        loadIntent["personaIntent.detectIntent"]
        buildCtx["buildMessageContext"]
        safetyCheck["universalSafety.checkAndLogSafety"]
        callClaude["Anthropic Claude via circuitBreaker"]
        validateResp["personaIntent.validateResponse"]
    end

    subgraph credit [creditTracking.ts]
        startSession["startChatSession"]
        checkpoint["checkpointSession"]
        deduct["endChatSession - deduct credits"]
    end

    auth --> chatFlow
    initSession --> startSession
    initSession --> loadPersona
    sendMessage --> safetyCheck
    sendMessage --> loadIntent
    sendMessage --> loadMem
    sendMessage --> crossMem
    sendMessage --> buildCtx
    sendMessage --> callClaude
    sendMessage --> checkpoint
    sendMessage --> validateResp
```

### sendMessage Pipeline (step by step)

1. **Load session** -- verify it exists, is active, and belongs to the user
2. **Check credits** -- ensure user has remaining minutes
3. **Universal Safety** (`universalSafety.ts`) -- scan user message for crisis signals, inappropriate content, prompt injection, harassment, gibberish. Logs violations to `safety_violations` table.
4. **Persona Intent** (`personaIntent.ts`) -- detect conversation bucket (love, money, purpose, etc.) and user intent. Update `conversation_states` table.
5. **Memory Manager** (`memoryManager.ts`) -- load prior session summaries and long-term context for this user+persona pair
6. **Memory Transfer** (`memoryTransfer.ts`) -- load relevant memories from *other* personas the user has talked to
7. **Build prompt** -- assemble system prompt + memory context + intent context + last 20 messages
8. **Call Claude** -- via Opossum circuit breaker (`circuitBreaker.ts`) for fault tolerance
9. **Validate response** (`personaIntent.ts`) -- check response against character rules and persona consistency
10. **Save message** -- persist to `chat_messages` table with token counts
11. **Checkpoint session** -- update elapsed time, heartbeat timestamp

### Key Files

| File | Purpose |
|------|---------|
| `server/routes/auth.ts` | Register, login, verify email, password reset, change password |
| `server/routes/chatService.ts` | Session start, message, end, history |
| `server/routes/credits.ts` | Credit checkout, webhook, balance |
| `server/routes/personas.ts` | List and detail personas |
| `server/lib/chatEngine.ts` | Core message pipeline (described above) |
| `server/lib/memoryManager.ts` | Session summarization, context loading |
| `server/lib/memoryTransfer.ts` | Cross-persona memory sharing |
| `server/lib/creditTracking.ts` | Session lifecycle, heartbeat, credit deduction |
| `server/lib/universalSafety.ts` | Safety classification and violation logging |
| `server/lib/personaIntent.ts` | Intent detection, conversation state, response validation |
| `server/lib/circuitBreaker.ts` | Opossum circuit breaker for Claude API |
| `server/lib/fraudDetection.ts` | Registration fraud signals (IP, user agent, fingerprint) |
| `server/lib/rateLimiter.ts` | Express rate limiting for auth, chat, admin |
| `server/lib/auth.ts` | Password hashing (bcrypt), JWT sign/verify, requireAuth middleware |

---

## 5. Database Schema

All tables are defined in `shared/schema.ts` using Drizzle ORM with Zod validation.

```mermaid
erDiagram
    conversations ||--o| conversations : "System 1 only"

    personas ||--o{ personaPrompts : has
    personas ||--o{ personaIntentConfigs : has
    personas ||--o{ chatSessions : "used in"

    users ||--o{ chatSessions : has
    users ||--o{ chatMessages : owns
    users ||--o{ userMemory : has
    users ||--o{ creditPurchases : makes
    users ||--o| userFollowUpPreferences : has

    chatSessions ||--o{ chatMessages : contains
    chatSessions ||--o| conversationStates : has
    chatSessions ||--o{ safetyViolations : "may have"

    adminUsers ||--o{ systemConfig : edits

    conversations {
        varchar id PK
        text email
        text firstName
        text bucket
        text stripeSessionId
        boolean purchased
        boolean upsellPurchased
        boolean upsell2Purchased
        text shippingLine1
        text shipping2Line1
    }

    personas {
        varchar id PK
        text slug UK
        text displayName
        text baseSystemPrompt
        text personality
        text categories
        int freeMinutes
        text customPricing
        int sessionTimeoutMinutes
    }

    users {
        varchar id PK
        text email UK
        text passwordHash
        text firstName
        int creditMinutes
        int totalMinutesUsed
        text accountStatus
        boolean emailVerified
    }

    chatSessions {
        varchar id PK
        varchar userId FK
        varchar personaId FK
        text status
        int durationSeconds
        int minutesCharged
        timestamp lastHeartbeatAt
    }

    chatMessages {
        varchar id PK
        varchar sessionId FK
        varchar userId FK
        text role
        text content
        int inputTokens
        int outputTokens
    }

    userMemory {
        varchar id PK
        varchar userId FK
        varchar personaId FK
        text memoryType
        text summary
        int importance
    }

    creditPurchases {
        varchar id PK
        varchar userId FK
        text packageType
        int minutesPurchased
        int priceUsd
        text stripeSessionId
    }

    personaPrompts {
        varchar id PK
        varchar personaId FK
        text promptType
        text promptContent
        int version
        text variantLabel
        int trafficPercent
    }

    personaIntentConfigs {
        varchar id PK
        varchar personaId FK
        text specialty
        text conversationBuckets
        text intents
        text characterRules
    }

    conversationStates {
        varchar id PK
        varchar sessionId FK
        text currentBucket
        int turnCount
        text detectedIntents
    }

    safetyViolations {
        varchar id PK
        varchar sessionId FK
        varchar userId FK
        text violationType
        text userMessage
        text systemResponse
    }

    followUpEmails {
        varchar id PK
        varchar userId FK
        varchar personaId FK
        text recipientEmail
        text subject
        text status
        boolean opened
        boolean clicked
    }

    adminUsers {
        varchar id PK
        text email UK
        text role
        text displayName
    }

    systemConfig {
        varchar id PK
        text configKey UK
        text configValue
        text configType
    }
```

### Table Groups

**System 1 (Funnel):** `conversations` -- stores lead data, conversation state, purchase tracking, Stripe session IDs, shipping addresses for both upsells.

**System 2 (Chat Service):**
- `users` -- accounts with credit balance and verification status
- `personas` -- advisor profiles with system prompts, pricing, timeout config
- `personaPrompts` -- versioned prompts with A/B testing support (variant labels, traffic %)
- `chatSessions` -- session lifecycle with heartbeat and pricing snapshots
- `chatMessages` -- individual messages with token counts
- `userMemory` -- session summaries and long-term context (per-persona)
- `creditPurchases` -- transaction log for credit purchases
- `personaIntentConfigs` -- per-persona bucket/intent/character-rules config
- `conversationStates` -- per-session tracking of bucket, turn count, detected intents
- `safetyViolations` -- logged safety events (crisis, inappropriate, injection)
- `followUpEmails` -- re-engagement email tracking with open/click analytics
- `userFollowUpPreferences` -- per-user email preferences and rate limits

**Admin:** `adminUsers`, `systemConfig`

---

## 6. API Route Map

```mermaid
flowchart LR
    subgraph routers [Modular Express Routers]
        AuthR["/api/auth"]
        ChatSvcR["/api/chat-service"]
        CreditsR["/api/credits"]
        AdminR["/api/admin"]
        PersonasR["/api/personas"]
        WebhooksR["/api/webhooks"]
        UserR["/api/user"]
        MigrateR["/api/migrate"]
        CrudR["/api/v1"]
    end

    subgraph inline [Inline in routes.ts]
        Chat["/api/chat"]
        Lead["/api/lead"]
        Checkout["/api/checkout"]
        SaveProgress["/api/save-progress"]
        ConvoRestore["/api/conversation/:email"]
        Location["/api/location"]
        UpsellEndpoints["/api/upsell/*"]
        Upsell2Endpoints["/api/upsell2/*"]
        Shipping["/api/shipping/save"]
        FBEvent["/api/fb-event"]
    end

    subgraph health [Health and Monitoring]
        HealthCheck["/api/health-check"]
        HealthFull["/api/health"]
        Ready["/api/ready"]
        Metrics["/api/metrics"]
    end
```

### Endpoint Summary

**Funnel (inline in `server/routes.ts`):**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/chat` | AI chat with action-based state machine |
| POST | `/api/lead` | Email/name capture, save to DB + AWeber |
| POST | `/api/checkout` | Create Stripe Checkout session ($35/$25) |
| POST | `/api/save-progress` | Persist conversation state |
| GET | `/api/conversation/:email` | Restore conversation cross-device |
| GET | `/api/location` | IP geolocation |
| GET | `/api/upsell/user-data` | Load user data for upsell page |
| POST | `/api/upsell/charge` | 1-click upsell charge (off_session) |
| POST | `/api/upsell/fallback-checkout` | Fallback Stripe Checkout for upsell |
| POST | `/api/upsell/confirm-fallback` | Server-side verification of fallback |
| POST | `/api/shipping/save` | Save upsell shipping address |
| GET/POST | `/api/upsell2/*` | Same pattern for upsell 2 |
| POST | `/api/fb-event` | Server-side Facebook Conversions API |

**Chat Service (modular routers):**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Create account (+ fraud check) |
| POST | `/api/auth/login` | JWT login |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/auth/verify-email` | Email verification |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/chat-service/session/start` | Start chat session with persona |
| POST | `/api/chat-service/session/:id/message` | Send message (full pipeline) |
| POST | `/api/chat-service/session/:id/end` | End session, deduct credits |
| GET | `/api/chat-service/sessions` | Session history |
| GET | `/api/chat-service/sessions/:id/messages` | Message history |
| POST | `/api/credits/checkout` | Purchase credit package |
| POST | `/api/credits/webhook` | Stripe webhook for credits |
| GET | `/api/personas` | List active personas |

**Admin (all behind `requireAdmin` middleware + rate limiting):**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/login` | Admin JWT login |
| GET | `/api/admin/me` | Current admin info |
| * | `/api/admin/personas/*` | CRUD personas |
| * | `/api/admin/prompts/*` | Manage prompts with A/B variants |
| * | `/api/admin/users/*` | View/manage users, grant credits |
| * | `/api/admin/analytics/*` | Platform metrics |
| * | `/api/admin/safety/*` | Safety violation dashboard |
| * | `/api/admin/intent-configs/*` | Persona intent/bucket config |
| * | `/api/admin/follow-ups/*` | Follow-up email management |
| * | `/api/admin/fraud/*` | Fraud detection data |
| * | `/api/admin/pricing/*` | Per-persona pricing |

---

## 7. Background Processes

Several background processes run alongside the HTTP server to manage session lifecycle and re-engagement:

```mermaid
flowchart TB
    subgraph serverBoot [Server Boot - index.ts]
        Recover["recoverActiveSessions()"]
        Heartbeat["startHeartbeat()"]
        Cleanup["startInactiveSessionCleanup()"]
        Cron["initializeCronJobs()"]
    end

    subgraph creditTracking [creditTracking.ts]
        HBTimer["Every 30s: checkpoint all active sessions"]
        IdleTimer["Every 5min: end sessions idle 30+ min"]
        TimeoutEmail["Send session-timeout email via Resend"]
    end

    subgraph cronJobs [cronJobs.ts]
        FollowUp["Follow-up email generation via Claude Haiku"]
        MonthlyReset["Monthly follow-up counter reset"]
    end

    serverBoot --> Recover
    serverBoot --> Heartbeat
    serverBoot --> Cleanup
    serverBoot --> Cron

    Recover -->|"On startup: re-load active sessions from DB"| HBTimer
    Heartbeat --> HBTimer
    Cleanup --> IdleTimer
    IdleTimer --> TimeoutEmail
    Cron --> FollowUp
    Cron --> MonthlyReset
```

| Process | Frequency | Source | Purpose |
|---------|-----------|--------|---------|
| **Session recovery** | Once on boot | `creditTracking.ts` | Re-load active sessions after server restart |
| **Heartbeat** | Every 30 seconds | `creditTracking.ts` | Checkpoint active sessions (update elapsed time) |
| **Inactive cleanup** | Every 5 minutes | `creditTracking.ts` | End sessions idle for 30+ minutes, deduct credits |
| **Session timeout email** | On idle end | `sessionTimeoutEmail.ts` | Notify user their session timed out |
| **Follow-up emails** | Cron schedule | `cronJobs.ts` | Generate re-engagement emails for inactive users |
| **Monthly reset** | Monthly | `cronJobs.ts` | Reset follow-up email counters |

---

## 8. Payment Flows

### System 1 -- Funnel Payments

```mermaid
flowchart LR
    Main["$35 Main Purchase"] --> StripeCheckout["Stripe Checkout Session"]
    StripeCheckout --> Welcome1["/welcome1?session_id=..."]
    Welcome1 --> OneClick1["1-click: paymentIntents.create $47 off_session"]
    Welcome1 --> Fallback1["Fallback: new Stripe Checkout $47"]
    OneClick1 --> Welcome2["/welcome2"]
    Fallback1 --> Welcome2
    Welcome2 --> OneClick2["1-click: $47 or $30 off_session"]
    Welcome2 --> Fallback2["Fallback: new Stripe Checkout"]
    OneClick2 --> SuccessPage["/success"]
    Fallback2 --> SuccessPage
```

- **Main purchase:** Stripe Checkout ($35 or $25 downsell)
- **Upsell 1:** Protection Ritual + Lava Stone ($47). Tries 1-click off-session charge using saved payment method; falls back to full Stripe Checkout if card requires authentication.
- **Upsell 2:** Manifestation Bracelet ($47 full / $30 downsell). Same 1-click + fallback pattern.
- Both upsells collect shipping addresses, saved to DB and synced to Stripe metadata + AWeber.

### System 2 -- Credit Payments

```mermaid
flowchart LR
    UserBuys["User clicks Buy Credits"] --> CreditCheckout["POST /api/credits/checkout"]
    CreditCheckout --> StripeSession["Stripe Checkout (metadata: userId, packageType)"]
    StripeSession --> StripeRedirect["User pays on Stripe"]
    StripeRedirect --> Webhook["POST /api/credits/webhook"]
    Webhook --> AddCredits["Add minutes to user.creditMinutes"]
    Webhook --> LogPurchase["Create creditPurchases record"]
```

- Credit packages are configurable per-persona via `customPricing` JSON in the `personas` table
- Webhook uses raw body buffer for Stripe signature verification (`STRIPE_CREDITS_WEBHOOK_SECRET`)
- Free minutes (default 3) are granted on email verification

---

## 9. Admin Dashboard

The admin system at `/admin/*` provides full control over the platform:

```mermaid
flowchart TB
    AdminLogin["/admin/login"] --> AdminAuth["JWT + requireAdmin middleware"]
    AdminAuth --> PersonasMgmt["Personas Management"]
    AdminAuth --> PromptsMgmt["Prompts Editor with A/B Testing"]
    AdminAuth --> UsersMgmt["Users List + Detail"]
    AdminAuth --> Analytics["Analytics Dashboard"]
    AdminAuth --> Safety["Safety Violations Dashboard"]
    AdminAuth --> IntentConfig["Intent Config Editor"]
    AdminAuth --> FollowUps["Follow-Ups Dashboard"]
    AdminAuth --> FraudView["Fraud Detection"]
    AdminAuth --> Pricing["Per-Persona Pricing"]
```

| Feature | Route | Admin Router File |
|---------|-------|-------------------|
| Persona CRUD | `/admin/personas` | `server/routes/admin/personas.ts` |
| Prompt management | `/admin/prompts` | `server/routes/admin/prompts.ts` |
| User management | `/admin/users` | `server/routes/admin/users.ts` |
| Analytics | `/admin/analytics` | `server/routes/admin/analytics.ts` |
| Safety review | `/admin/safety` | `server/routes/admin/safety.ts` |
| Intent configs | `/admin/intent-configs` | `server/routes/admin/intentConfigs.ts` |
| Follow-up emails | `/admin/follow-ups` | `server/routes/admin/followUps.ts` |
| Fraud signals | `/admin/fraud` | `server/routes/admin/fraud.ts` |
| Pricing | `/admin/pricing` | `server/routes/admin/pricing.ts` |

---

## 10. Frontend Architecture

```mermaid
flowchart TB
    subgraph eager [Eagerly Loaded - Funnel]
        LP[LandingPage]
        CP[ChatPage]
        UP1[UpsellPage]
        UP2[Upsell2Page]
        SP[SuccessPage]
        Privacy[PrivacyPage]
        Terms[TermsPage]
        Refund[RefundPage]
    end

    subgraph lazy [Lazy Loaded - Chat Service]
        LoginP[LoginPage]
        ChatSvcP[ChatServicePage]
        CreditsP[CreditsPage]
        PersonasP[PersonasDirectory]
        DashP[Dashboard]
        WelcomeP[WelcomeChatPage]
        ForgotP[ForgotPasswordPage]
        ResetP[ResetPasswordPage]
    end

    subgraph lazyAdmin [Lazy Loaded - Admin]
        AdminLoginP[AdminLogin]
        PersonasDash[PersonasDashboard]
        PersonaEdit[PersonaEditor]
        PromptsEdit[PromptsEditor]
        AnalyticsP[AnalyticsDashboard]
        UsersListP[UsersList]
        UserDetailP[UserDetail]
        SafetyP[SafetyDashboard]
        IntentP[IntentConfigEditor]
        FollowUpsP[FollowUpsDashboard]
    end
```

- **Routing:** Wouter (lightweight, ~1.5KB)
- **Data fetching:** TanStack Query with a shared `queryClient`
- **UI components:** Radix UI primitives + shadcn/ui patterns
- **Auth state:** `useAuth` hook (JWT in localStorage, `/api/auth/me` validation)
- **Admin state:** `useAdmin` hook (separate JWT flow)
- **Error boundary:** Sentry `ErrorBoundary` wrapping the entire app
- **Page tracking:** Facebook Pixel `trackPageView` on every route change
- **Code splitting:** Funnel pages are eagerly loaded (critical path); chat service and admin pages are lazy-loaded with `React.lazy()`

---

## 11. Key File Reference

| Purpose | File |
|---------|------|
| Server entry point | `server/index.ts` |
| All funnel routes (inline) | `server/routes.ts` |
| Chat engine (message pipeline) | `server/lib/chatEngine.ts` |
| Claude prompt functions (funnel) | `server/lib/claude.ts` |
| Memory manager (summarize + load) | `server/lib/memoryManager.ts` |
| Cross-persona memory transfer | `server/lib/memoryTransfer.ts` |
| Credit tracking (sessions) | `server/lib/creditTracking.ts` |
| Persona intent detection | `server/lib/personaIntent.ts` |
| Universal safety checks | `server/lib/universalSafety.ts` |
| Circuit breaker (Claude) | `server/lib/circuitBreaker.ts` |
| Auth (bcrypt, JWT, middleware) | `server/lib/auth.ts` |
| Auth routes (register, login, etc.) | `server/routes/auth.ts` |
| Chat service API routes | `server/routes/chatService.ts` |
| Credits routes + webhook | `server/routes/credits.ts` |
| Admin route index | `server/routes/admin/index.ts` |
| Fraud detection | `server/lib/fraudDetection.ts` |
| Rate limiter | `server/lib/rateLimiter.ts` |
| Health check + metrics | `server/lib/healthCheck.ts` |
| Structured logger (Winston) | `server/lib/logger.ts` |
| Model config (Claude models) | `server/lib/modelConfig.ts` |
| Cron jobs (follow-ups, resets) | `server/lib/cronJobs.ts` |
| Follow-up email generator | `server/lib/followUpEmailGenerator.ts` |
| Database connection (Drizzle) | `server/lib/db.ts` |
| Supabase client | `server/lib/supabase.ts` |
| Full schema (all tables) | `shared/schema.ts` |
| Shared types | `shared/types.ts` |
| Client routing | `client/src/App.tsx` |
| Auth hook | `client/src/hooks/useAuth.ts` |

---

## 12. Summary

The architecture cleanly separates two business models on one stack:

- **System 1** targets immediate conversion with a state-machine chat and one-time Stripe purchases plus two upsell flows with 1-click charging.
- **System 2** supports ongoing relationships with user accounts, multiple AI personas, persistent memory (per-persona and cross-persona), a credit-based billing system, and automated follow-up re-engagement.

Shared infrastructure (PostgreSQL, Claude, Stripe, Express on port 5000) keeps operational complexity low. Background jobs (heartbeat every 30s, idle cleanup every 5min, cron-based follow-ups) handle session lifecycle and re-engagement without blocking HTTP requests. Safety, intent detection, and circuit breakers ensure reliability and responsible AI usage.
