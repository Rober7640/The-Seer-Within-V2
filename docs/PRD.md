# Product Requirements Document (PRD)
# The Seer Within - Psychic Chat Funnel

## 1. Executive Summary

**Product Name:** The Seer Within  
**Operated By:** Cosmo Numerology Pte Ltd  
**Domain:** theseerwithin.com  
**Product Type:** AI-Powered Psychic Reading Sales Funnel

### Overview
A conversational AI sales/coaching application featuring "Evelyn Cross," a warm, maternal psychic persona. Users receive AI-powered personalized readings through an interactive chat interface, with a conversion flow leading to paid readings and physical product upsells via Stripe checkout.

### Core Value Proposition
- Personalized AI-generated psychic readings using Claude AI
- Interactive chat-based engagement with cold-reading techniques
- Seamless payment flow with 1-click upsell capability
- Physical product fulfillment (Protection Stones)

---

## 2. User Journey & Conversion Funnel

### Stage 1: Landing Page
- User arrives at theseerwithin.com
- Sees mystical/cosmic themed landing page
- CTA: "Begin Your Free Reading"

### Stage 2: Chat Experience
1. **Greeting Phase** - Evelyn introduces herself warmly
2. **Name Capture** - Collects user's first name
3. **Bucket Selection** - User chooses reading topic:
   - Love & Relationships
   - Money & Career
   - Life Purpose
   - Someone Specific (person on their mind)
4. **Deepening Phase** - Multiple rounds of personalized reading with follow-up questions
5. **Email Capture** - Collect email for full reading delivery

### Stage 3: Crisis & Pitch
- Reveal "energy blocks" detected in reading
- Build urgency around clearing blocks
- Present paid reading offer ($35)

### Stage 4: Checkout
- Stripe checkout with shipping collection
- Purchase: "Sacred Clearing Ritual" - $35 (or $25 downsell after 3 objections)

### Stage 5: Upsell Page
- Post-purchase upsell offer
- Product: "Volcanic Stone (aka Black Lava)" - $47
- **1-Click Purchase** (uses saved payment method)
- **Fallback Checkout** (new Stripe session if 1-click fails)

### Stage 6: Success/Confirmation
- Order confirmation
- Delivery expectations
- Email follow-up sequence trigger

---

## 3. Technical Architecture

### Frontend Stack
| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Build Tool | Vite |
| Routing | Wouter |
| State Management | TanStack React Query |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (New York style) |
| Fonts | Inter (body), Playfair Display (headings) |

### Backend Stack
| Component | Technology |
|-----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL (Neon-backed) |
| ORM | Drizzle ORM |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Payments | Stripe |
| Email Marketing | AWeber |
| Analytics | Facebook Pixel + Conversions API |

---

## 4. Database Schema

### Conversations Table
```sql
conversations (
  id: serial PRIMARY KEY,
  session_id: text UNIQUE NOT NULL,
  user_name: text,
  email: text,
  bucket: text,  -- 'love' | 'money' | 'purpose' | 'someone'
  phase: text,   -- Current conversation phase
  messages: jsonb,  -- Array of chat messages
  
  -- Purchase tracking
  purchased: boolean DEFAULT false,
  stripe_session_id: text,
  stripe_payment_intent: text,
  amount_paid: integer,
  
  -- Upsell tracking
  upsell_purchased: boolean DEFAULT false,
  upsell_stripe_id: text,
  upsell_amount: integer,
  
  -- Shipping information
  shipping_name: text,
  shipping_line1: text,
  shipping_line2: text,
  shipping_city: text,
  shipping_state: text,
  shipping_postal: text,
  shipping_country: text,
  
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
)
```

---

## 5. API Endpoints

### Chat & Conversation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send message, receive AI response |
| `/api/conversation` | GET | Get conversation by session ID |
| `/api/conversation` | POST | Create new conversation |

### Payments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create-checkout-session` | POST | Create Stripe checkout for $35 reading |
| `/api/upsell/one-click` | POST | Process 1-click upsell charge |
| `/api/upsell/fallback-checkout` | POST | Create fallback Stripe session |
| `/api/upsell/confirm-fallback` | POST | Confirm fallback purchase |
| `/api/webhook` | POST | Stripe webhook handler |

### Lead Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/lead` | POST | Capture email lead, add to AWeber |
| `/api/shipping` | POST | Save shipping address |

### Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fb-event` | POST | Server-side Facebook event |

---

## 6. Third-Party Integrations

### Anthropic Claude AI
- **Model:** claude-sonnet-4-20250514
- **Purpose:** Generate personalized psychic reading responses
- **Prompt Engineering:** Uses Barnum statements, cold-reading techniques
- **Environment Variable:** `ANTHROPIC_API_KEY`

### Stripe Payments
- **Products:**
  - Sacred Clearing Ritual (main): $35.00
  - Sacred Clearing Ritual (downsell): $25.00 - offered after 3 objections
  - Volcanic Stone (aka Black Lava): $47.00 - upsell product
- **Features:**
  - Checkout sessions with shipping collection
  - 1-click upsell using saved payment methods
  - Webhook handling for purchase confirmation
  - Downsell flow triggers after user declines main offer 3 times
- **Environment Variable:** `STRIPE_SECRET_KEY`

### AWeber Email Marketing
- **Lists:**
  - Lead capture list (bucket-tagged)
  - Paid customer list
  - Upsell purchaser list
- **Custom Fields:** Shipping address fields
- **Tags:** bucket type + 'seer-within', 'seer-within-upsell'
- **Environment Variables:**
  - `AWEBER_ACCESS_TOKEN`
  - `AWEBER_REFRESH_TOKEN`
  - `AWEBER_CLIENT_ID`
  - `AWEBER_CLIENT_SECRET`
  - `AWEBER_ACCOUNT_ID`
  - `AWEBER_LIST_ID`

### Facebook Tracking
- **Dual Tracking:** Client-side Pixel + Server-side Conversions API
- **Events Tracked:**
  - PageView - Every page navigation
  - Lead - Email capture
  - InitiateCheckout - Purchase CTA click
  - Purchase - Successful payment
- **Deduplication:** Uses event_id matching
- **Environment Variables:**
  - `FB_PIXEL_ID`
  - `FB_ACCESS_TOKEN`

---

## 7. Conversation Flow State Machine

### Phases
1. `greeting` - Initial welcome, capture attention
2. `name_capture` - Get user's first name
3. `bucket_selection` - Choose reading topic
4. `deepening_1` - First reading round
5. `deepening_2` - Follow-up question
6. `deepening_3` - Deeper insight
7. `email_capture` - Collect email
8. `crisis` - Reveal blocks, build urgency
9. `pitch` - Present offer
10. `checkout` - Redirect to payment

### Intent Detection (Client-Side)
- Positive response
- Negative/objection
- Gibberish/off-topic
- Question
- Name provided
- Email provided
- Bucket selection

---

## 8. Evelyn Cross Persona

### Character Traits
- **Age:** 50s, warm maternal energy
- **Voice:** Gentle, knowing, slightly mysterious
- **Style:** Uses poetic language, cosmic metaphors
- **Approach:** Empathetic, validating, encouraging

### Reading Techniques
- Barnum statements (universally applicable insights)
- Cold reading (picking up on user cues)
- Validation and affirmation
- Strategic pauses (simulated typing delays)
- Building rapport before pitch

---

## 9. Products & Pricing

### Digital Product (Main Offer)
- **Name:** Sacred Clearing Ritual
- **Price:** $35.00
- **Delivery:** Email (PDF)
- **Description:** Comprehensive personalized reading based on chat session

### Digital Product (Downsell)
- **Name:** Sacred Clearing Ritual
- **Price:** $25.00
- **Trigger:** Offered after user declines main offer 3 times
- **Delivery:** Email (PDF)
- **Description:** Same product at reduced price for hesitant customers

### Physical Product (Upsell)
- **Name:** Volcanic Stone (aka Black Lava)
- **Price:** $47.00
- **Delivery:** Shipped physical product
- **Description:** Energetically charged volcanic stone with ritual instructions

---

## 10. Legal Pages

### Required Pages
- `/privacy` - Privacy Policy
- `/terms` - Terms of Service
- `/refund` - Refund Policy

### Business Entity
- **Company:** Cosmo Numerology Pte Ltd
- **Address:** 45B Temple St S058590, Singapore
- **Contact:** support@cosmonumerology.com

---

## 11. Environment Variables Required

```env
# AI
ANTHROPIC_API_KEY=

# Payments
STRIPE_SECRET_KEY=

# Database
DATABASE_URL=

# Email Marketing
AWEBER_ACCESS_TOKEN=
AWEBER_REFRESH_TOKEN=
AWEBER_CLIENT_ID=
AWEBER_CLIENT_SECRET=
AWEBER_ACCOUNT_ID=
AWEBER_LIST_ID=

# Facebook Tracking
FB_PIXEL_ID=
FB_ACCESS_TOKEN=
```

---

## 12. Key Implementation Notes

### 1-Click Upsell Flow
- After initial purchase, save customer ID and payment method
- On upsell page, attempt to charge saved payment method
- If 1-click fails, fall back to new checkout session
- Background task handles AWeber sync (with 3s delay for shipping form)

### Shipping Data Flow
- Collected via Stripe checkout OR custom form on upsell page
- Saved to database
- Synced to AWeber custom fields
- Added to Stripe payment intent metadata

### Session Management
- Client-side: LocalStorage with 24-hour expiry
- Server-side: Session ID links to database conversation

### Typing Simulation
- Delay based on message length
- Creates realistic "human typing" experience
- Builds anticipation for readings
