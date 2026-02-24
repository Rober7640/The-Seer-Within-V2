# Platform Flowchart

ASCII diagrams showing how each part of the system connects.

---

## System 1: Conversion Funnel

```
[Visitor arrives at /]
         |
         v
  Landing Page (Evelyn Cross)
  "Get Your Reading" button
         |
         v
  /chat — Evelyn Cross Reading
  ┌─────────────────────────────────────────┐
  │  Conversation phases (state machine):   │
  │  1. Greeting + name capture             │
  │  2. Bucket selection                    │
  │     (love / money / purpose / person)   │
  │  3. Deepening (2-3 rounds)              │
  │  4. Crisis/Pitch — reveal blocks,       │
  │     build urgency                       │
  │  5. Checkout offer appears ($35)        │
  └─────────────────────────────────────────┘
         |
         | User clicks "Get Reading Now"
         v
  Stripe Checkout ($35 full / $25 downsell)
         |
         | Stripe sends webhook to /api/webhooks/stripe
         v
  /welcome1 — Upsell 1
  Protection Ritual + Lava Stone ($47)
         |
    .----+----.
    |         |
  [Buy]     [Skip]
    |         |
    v         v
  1-click   navigate
  charge    to next
    |         |
    '----+----'
         |
         v
  /welcome2 — Upsell 2
  Manifestation Bracelet ($47 / $30 downsell)
         |
    .----+----.
    |         |
  [Buy]     [Skip]
    |         |
    '----+----'
         |
         v
  /success — Order Confirmation
  (Email capture → AWeber list)
```

---

## System 2: Multi-Persona Chat Service

```
[Visitor arrives at /personas]
  (Public page — no login required)
         |
         v
  Personas Directory
  Browse guides, read profiles
  See ratings, specialties, coin rates
         |
         | Visitor clicks "Start Chat" on a guide
         v
    .----+------------------------.
    |                             |
  [Not logged in]            [Already logged in]
    |                             |
    v                             v
  Auth Modal pops up        Navigate directly to
  on /personas page         /reading?persona=slug
    |
    | User fills in name, email, password
    v
  POST /api/auth/register
    |
    v
  Verification email sent (via Resend)
    |
    | User clicks link in email
    v
  Email verified → 180 coins granted
  Redirect to /login?verified=success
    |
    | User logs in
    v
    |
    '----> /reading or /chat/:personaSlug
         |
         v
  Pre-Reading Screen
  ┌─────────────────────────────────────────┐
  │  Guide avatar, tagline, status          │
  │  Suggested opening questions            │
  │  Greeting message loads (FREE)          │
  │  "Timer starts when you send your       │
  │   first message" shown to user          │
  └─────────────────────────────────────────┘
         |
         | User sends first message
         v
  Session Created (chat_sessions table)
  Billing starts NOW
  ┌─────────────────────────────────────────┐
  │  Active Chat Session                    │
  │  • AI guide responds                    │
  │  • Every 30 seconds: heartbeat runs,    │
  │    coins deducted from user balance     │
  │  • 2-minute idle: warning shown         │
  │  • Refill banner: when coins running low│
  └─────────────────────────────────────────┘
         |
    .----+------------------------.
    |                             |
  [Coins reach 0]          [User clicks "End Reading"]
    |                             |
    v                             v
  OutOfCredits Modal         Confirm dialog
  30-second countdown        "End this reading?"
    |                             |
    v                             |
  /credits page             Session ends
  (buy more coins)          Coins finalized
    |                        Feedback modal shown
    v                        (if session ≥ 5 min)
  Purchase credits               |
  Return to reading              v
                            Reading history stays
                            visible on screen
```

---

## Credit / Billing Flow

```
User's coin balance (coinBalance column in users table)
         |
  How users get coins:
  ┌──────────────────────────────────────────────┐
  │  Signup bonus: 180 coins = 3 free minutes    │
  │                                              │
  │  Buy via Stripe:                             │
  │  POST /api/credits/checkout                  │
  │  → Stripe Checkout page                      │
  │  → Stripe webhook fires                      │
  │  → Coins added to user balance               │
  │                                              │
  │  Buy via PayPal:                             │
  │  PayPal button on /credits page              │
  │  → POST /api/credits/create-order            │
  │  → POST /api/credits/capture-order           │
  │  → Coins added to user balance               │
  └──────────────────────────────────────────────┘
         |
  How coins are spent during a session:
         |
         v
  Heartbeat every 30 seconds:
  deduct (coinsPerMinute / 2) from balance
  e.g. 60 coins/min → deduct 30 coins every 30s
         |
    .----+------------------------.
    |                             |
  [balance > threshold]    [balance reaches 0]
    |                             |
    v                             v
  Continue chatting          Session force-ended
                             OutOfCredits modal shown

  Note: Balance never goes below 0.
  Coins per minute is set per guide in admin panel.
  Default: 60 coins/min.
```

---

## Email Re-Engagement System

```
  User ends a session (or stops visiting)
         |
         v
  Cron job runs daily (configured in cronJobs.ts)
         |
  ┌──────────────────────────────────────────────┐
  │  FOLLOW-UP EMAIL SEQUENCE                    │
  │                                              │
  │  Day +2: Email from guide ("I felt our       │
  │           connection was strong...")         │
  │                                              │
  │  Day +5: Email from guide (different angle)  │
  │                                              │
  │  Day +7: Final follow-up                     │
  │                                              │
  │  Each email:                                 │
  │  • Written by Claude Haiku (AI)              │
  │  • References user's actual chat memories   │
  │  • Contains a magic link (one-click login)  │
  │  • From address: guide's persona email       │
  └──────────────────────────────────────────────┘
         |
  ┌──────────────────────────────────────────────┐
  │  TOP-UP EMAILS (behavior-triggered)          │
  │                                              │
  │  Segments detected daily:                    │
  │  • free_tier_dropoff — used free trial,      │
  │    never bought credits                      │
  │  • empty_tank — bought and used all coins,   │
  │    hasn't returned                           │
  │  • loyal_refill — regular buyer, running low │
  │  • dormant_low_balance — inactive 30+ days   │
  │                                              │
  │  7-day cooldown between sends per user       │
  └──────────────────────────────────────────────┘
         |
         | User clicks magic link in email
         v
  /magic-auth?t=TOKEN
  Token verified (30-day expiry)
  JWT issued → user auto-logged in
  Redirect to /chat/:personaSlug
  (No password required)
```

---

## Admin Dashboard Flow

```
  /admin/login (separate from user auth)
         |
         v
  ┌──────────────────────────────────────────────┐
  │  /admin/personas                             │
  │  • Create / edit / delete guides             │
  │  • Set name, avatar, tagline, system prompt  │
  │  • Set coin rate per minute                  │
  │  • A/B test different prompt variants        │
  │  • Moderate user feedback & reviews          │
  │  • Edit intent configs (conversation rules)  │
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │  /admin/users                                │
  │  • View all user accounts + coin balances    │
  │  • Grant coins manually                      │
  │  • Suspend or ban accounts                   │
  │  • View each user's session history          │
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │  /admin/analytics                            │
  │  • Platform metrics (sessions, revenue)      │
  │  • Low credit user alerts                    │
  │  • Per-guide performance                     │
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │  /admin/follow-ups                           │
  │  • View sent re-engagement emails            │
  │  • Manually trigger follow-up queue          │
  │  • Export to CSV                             │
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │  /admin/safety                               │
  │  • Review flagged safety violations          │
  │  • Hard crisis: blocked + 988 shown          │
  │  • Soft crisis: noted + reading continues    │
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │  /admin/marketplace                          │
  │  • Drag-and-drop guide ranking               │
  │  • Set "Guide of the Day" featured pick      │
  └──────────────────────────────────────────────┘
```

---

## How a Message Gets Processed (Backend)

```
  User types message → clicks Send
         |
         v
  POST /api/chat-service/session/:id/message
  (server/routes/chatService.ts)
         |
         v
  1. Auth check — is user logged in?
  2. Session check — is session active?
  3. Credit check — does user have coins?
  4. Safety check — universalSafety.ts
     • Hard crisis? Block + return 988 message
     • Soft crisis? Prepend note, continue
  5. Memory loaded — user's past sessions
     with this guide (memoryManager.ts)
  6. System prompt assembled — persona
     instructions + memory + conversation
     history (prompts.ts)
  7. Send to Claude API (Anthropic)
     • claude-haiku for greetings/summaries
     • claude-sonnet for conversations
  8. Response streamed back to user
  9. Message saved to chat_messages table
  10. Memory updated if significant info shared
```
