# PRD: Upsell Page — Protection Ritual (Black Lava Rock)

## Architecture Overview

```
PAGE 1: /chat
├── Landing
├── Reading flow
├── Crisis
├── Pitch
└── $35 Stripe Checkout
         │
         ▼
    [Stripe Success]
         │
         ▼
PAGE 2: /upsell?session_id={CHECKOUT_SESSION_ID}
├── Load user data from DB (by session_id)
├── Fresh chat (no history from Page 1)
├── Evelyn delivers upsell pitch
├── UpsellCTA (Accept/Decline)
├── ShippingForm (if accepted)
└── Confirmation → Redirect to /success
```

---

## 1. Product Summary

| Field | Value |
|-------|-------|
| **Product** | Protection Ritual + Volcanic Stone |
| **Price** | $47.00 USD (includes shipping) |
| **Physical Item** | Black Lava Rock Bracelet |
| **Stock** | 1,000 units |
| **Target Take Rate** | 25-35% |

---

## 2. Page 2 Flow

### URL Structure

```
/upsell?session_id={STRIPE_CHECKOUT_SESSION_ID}
```

### On Page Load

```typescript
1. Extract session_id from URL params
2. Fetch user data from database:
   - firstName
   - email
   - bucket
   - personName (if bucket === 'someone')
3. If no data found → redirect to /chat (error state)
4. Initialize fresh chat state
5. Start upsell pitch sequence
```

### User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Page loads: /upsell?session_id=cs_xxx                      │
│                         │                                   │
│                         ▼                                   │
│  Fetch user data from DB by session_id                      │
│                         │                                   │
│                         ▼                                   │
│  Initialize empty chat                                      │
│                         │                                   │
│                         ▼                                   │
│  Evelyn starts: "It's done, {firstName}..."                 │
│  (18-22 messages with typing simulation)                    │
│                         │                                   │
│                         ▼                                   │
│  Show UpsellCTA buttons                                     │
│          │                              │                   │
│          ▼                              ▼                   │
│     [ACCEPT]                       [DECLINE]                │
│          │                              │                   │
│          ▼                              ▼                   │
│  1-Click charge $47              Soft exit messages         │
│          │                              │                   │
│          ▼                              ▼                   │
│  Show ShippingForm               Redirect → /success        │
│          │                                                  │
│          ▼                                                  │
│  Save address                                               │
│          │                                                  │
│          ▼                                                  │
│  Confirmation messages                                      │
│          │                                                  │
│          ▼                                                  │
│  Redirect → /success                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Addition

### Orders Table (or wherever you store purchases)

```typescript
interface Order {
  id: string
  stripeSessionId: string      // From Stripe Checkout
  stripeCustomerId: string     // For 1-click upsell
  stripePaymentMethod: string  // Saved card for 1-click
  
  // User data (from chat)
  firstName: string
  email: string
  bucket: 'love' | 'money' | 'purpose' | 'someone'
  personName: string | null    // If bucket === 'someone'
  
  // Main purchase
  mainPurchaseAmount: number   // 3500 ($35)
  mainPurchaseStatus: 'completed' | 'refunded'
  
  // Upsell
  upsellOffered: boolean
  upsellPurchased: boolean
  upsellPaymentId: string | null
  upsellAmount: number | null  // 4700 ($47)
  
  // Shipping (only if upsell purchased)
  shippingName: string | null
  shippingLine1: string | null
  shippingLine2: string | null
  shippingCity: string | null
  shippingState: string | null
  shippingPostal: string | null
  shippingCountry: string | null
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}
```

---

## 4. API Routes

### 4.1 Update Main Checkout Route

When creating Stripe Checkout, save customer + payment method:

**File:** `/server/routes/checkout.ts`

```typescript
router.post('/create-checkout', async (req, res) => {
  const { email, firstName, bucket, personName } = req.body

  // 1. Create or get Stripe Customer
  let customer = await getOrCreateCustomer(email, firstName)

  // 2. Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Sacred Clearing Ritual' },
        unit_amount: 3500,
      },
      quantity: 1,
    }],
    mode: 'payment',
    payment_intent_data: {
      setup_future_usage: 'off_session',  // CRITICAL: Save card
    },
    success_url: `${BASE_URL}/upsell?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/chat?cancelled=true`,
  })

  // 3. Save order to database
  await db.orders.create({
    stripeSessionId: session.id,
    stripeCustomerId: customer.id,
    firstName,
    email,
    bucket,
    personName: personName || null,
    mainPurchaseAmount: 3500,
    mainPurchaseStatus: 'completed',
    upsellOffered: false,
    upsellPurchased: false,
    createdAt: new Date(),
  })

  res.json({ url: session.url })
})
```

### 4.2 Get User Data Route

**File:** `/server/routes/upsell.ts`

```typescript
// GET /api/upsell/user-data?session_id=xxx
router.get('/user-data', async (req, res) => {
  const { session_id } = req.query

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' })
  }

  // Fetch from database
  const order = await db.orders.findOne({
    where: { stripeSessionId: session_id }
  })

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  // Mark upsell as offered
  await db.orders.update({
    where: { id: order.id },
    data: { upsellOffered: true }
  })

  res.json({
    firstName: order.firstName,
    email: order.email,
    bucket: order.bucket,
    personName: order.personName,
    stripeCustomerId: order.stripeCustomerId,
  })
})
```

### 4.3 One-Click Charge Route

**File:** `/server/routes/upsell.ts`

```typescript
// POST /api/upsell/charge
router.post('/charge', async (req, res) => {
  const { sessionId } = req.body

  // 1. Get order from database
  const order = await db.orders.findOne({
    where: { stripeSessionId: sessionId }
  })

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' })
  }

  // 2. Get original payment intent to get payment method
  const originalSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })

  const paymentIntent = originalSession.payment_intent as Stripe.PaymentIntent
  const paymentMethodId = paymentIntent.payment_method as string

  if (!paymentMethodId) {
    return res.json({ success: false, fallback: true })
  }

  // 3. Charge the saved card
  try {
    const upsellPayment = await stripe.paymentIntents.create({
      amount: 4700,
      currency: 'usd',
      customer: order.stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: 'Protection Ritual + Volcanic Stone',
      metadata: {
        orderId: order.id,
        product: 'protection_ritual',
      },
    })

    if (upsellPayment.status === 'succeeded') {
      // Update database
      await db.orders.update({
        where: { id: order.id },
        data: {
          upsellPurchased: true,
          upsellPaymentId: upsellPayment.id,
          upsellAmount: 4700,
        }
      })

      return res.json({
        success: true,
        paymentIntentId: upsellPayment.id,
      })
    }

    return res.json({ success: false, fallback: true })
  } catch (error: any) {
    console.error('1-click charge failed:', error.code)
    return res.json({ success: false, fallback: true })
  }
})
```

### 4.4 Fallback Checkout Route

**File:** `/server/routes/upsell.ts`

```typescript
// POST /api/upsell/fallback-checkout
router.post('/fallback-checkout', async (req, res) => {
  const { sessionId } = req.body

  const order = await db.orders.findOne({
    where: { stripeSessionId: sessionId }
  })

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const session = await stripe.checkout.sessions.create({
    customer: order.stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Protection Ritual + Volcanic Stone',
        },
        unit_amount: 4700,
      },
      quantity: 1,
    }],
    mode: 'payment',
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ', 'SG'],
    },
    success_url: `${BASE_URL}/success?upsell=true&order_id=${order.id}`,
    cancel_url: `${BASE_URL}/upsell?session_id=${sessionId}&fallback_cancelled=true`,
    metadata: {
      orderId: order.id,
      product: 'protection_ritual',
    },
  })

  res.json({ url: session.url })
})
```

### 4.5 Save Shipping Route

**File:** `/server/routes/shipping.ts`

```typescript
// POST /api/shipping/save
router.post('/save', async (req, res) => {
  const { sessionId, address } = req.body

  const order = await db.orders.findOne({
    where: { stripeSessionId: sessionId }
  })

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  await db.orders.update({
    where: { id: order.id },
    data: {
      shippingName: address.name,
      shippingLine1: address.line1,
      shippingLine2: address.line2 || null,
      shippingCity: address.city,
      shippingState: address.state,
      shippingPostal: address.postal,
      shippingCountry: address.country,
      updatedAt: new Date(),
    }
  })

  // TODO: Trigger fulfillment / shipping label creation
  // TODO: Send confirmation email

  res.json({ success: true })
})
```

---

## 5. Upsell Page Component

### File: `/pages/Upsell.tsx` or `/app/upsell/page.tsx`

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { UpsellCTA } from '@/components/upsell/UpsellCTA'
import { ShippingForm } from '@/components/upsell/ShippingForm'
import { useUpsellChat } from '@/hooks/useUpsellChat'

interface UserData {
  firstName: string
  email: string
  bucket: 'love' | 'money' | 'purpose' | 'someone'
  personName: string | null
}

export function UpsellPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session_id')

  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user data on mount
  useEffect(() => {
    if (!sessionId) {
      setError('Missing session')
      setIsLoading(false)
      return
    }

    async function fetchUserData() {
      try {
        const response = await fetch(`/api/upsell/user-data?session_id=${sessionId}`)
        
        if (!response.ok) {
          throw new Error('Order not found')
        }

        const data = await response.json()
        setUserData(data)
      } catch (err) {
        setError('Could not load your session')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [sessionId])

  // Initialize chat hook once we have user data
  const {
    messages,
    isTyping,
    showCTA,
    showShippingForm,
    isProcessing,
    handleAccept,
    handleDecline,
    handleShippingSubmit,
    isComplete,
  } = useUpsellChat({
    userData,
    sessionId,
    enabled: !!userData,
  })

  // Redirect to success when complete
  useEffect(() => {
    if (isComplete) {
      setTimeout(() => {
        navigate('/success')
      }, 2000)
    }
  }, [isComplete, navigate])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  // Error state
  if (error || !userData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">{error || 'Something went wrong'}</p>
          <button
            onClick={() => navigate('/')}
            className="text-purple-400 hover:text-purple-300"
          >
            Return home
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center p-4 py-8">
      <ChatContainer>
        {/* Messages */}
        <ChatMessages messages={messages} />

        {/* Typing Indicator */}
        {isTyping && <TypingIndicator />}

        {/* Upsell CTA */}
        {showCTA && (
          <UpsellCTA
            onAccept={handleAccept}
            onDecline={handleDecline}
            isProcessing={isProcessing}
          />
        )}

        {/* Shipping Form */}
        {showShippingForm && (
          <ShippingForm
            defaultName={userData.firstName}
            onSubmit={handleShippingSubmit}
          />
        )}
      </ChatContainer>
    </main>
  )
}
```

---

## 6. Upsell Chat Hook

### File: `/hooks/useUpsellChat.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import {
  getUpsellPitchMessages,
  personalizeMessages,
  UPSELL_SOFT_DECLINE,
  UPSELL_SUCCESS,
  UPSELL_SHIPPING_CONFIRMED,
} from '@/lib/upsellMessages'

interface Message {
  id: string
  role: 'user' | 'bot'
  content: string
}

interface UserData {
  firstName: string
  email: string
  bucket: 'love' | 'money' | 'purpose' | 'someone'
  personName: string | null
}

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postal: string
  country: string
}

interface UseUpsellChatProps {
  userData: UserData | null
  sessionId: string | null
  enabled: boolean
}

// Typing delay calculator
function getTypingDelay(message: string): number {
  const baseDelay = 500
  const perCharDelay = 30
  const maxDelay = 3000
  return Math.min(baseDelay + message.length * perCharDelay, maxDelay)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function useUpsellChat({ userData, sessionId, enabled }: UseUpsellChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [showCTA, setShowCTA] = useState(false)
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  // Add a bot message with typing simulation
  const sendBotMessage = useCallback(async (content: string) => {
    setIsTyping(true)
    await sleep(getTypingDelay(content))
    setIsTyping(false)

    setMessages(prev => [
      ...prev,
      { id: generateId(), role: 'bot', content }
    ])

    await sleep(300) // Pause between messages
  }, [])

  // Add multiple bot messages
  const sendBotMessages = useCallback(async (contents: string[]) => {
    for (const content of contents) {
      await sendBotMessage(content)
    }
  }, [sendBotMessage])

  // Add user message (no typing simulation)
  const addUserMessage = useCallback((content: string) => {
    setMessages(prev => [
      ...prev,
      { id: generateId(), role: 'user', content }
    ])
  }, [])

  // Start the upsell pitch
  useEffect(() => {
    if (!enabled || !userData || hasStarted) return

    setHasStarted(true)

    async function startPitch() {
      const pitchMessages = getUpsellPitchMessages(
        userData!.bucket,
        userData!.firstName,
        userData!.personName || undefined
      )

      await sendBotMessages(pitchMessages)
      setShowCTA(true)
    }

    // Small delay before starting
    setTimeout(startPitch, 500)
  }, [enabled, userData, hasStarted, sendBotMessages])

  // Handle Accept
  const handleAccept = useCallback(async () => {
    if (!sessionId || !userData) return

    setShowCTA(false)
    setIsProcessing(true)
    addUserMessage("Yes, protect my clearing")

    try {
      const response = await fetch('/api/upsell/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const result = await response.json()

      if (result.success) {
        // 1-click succeeded
        const successMessages = personalizeMessages(
          UPSELL_SUCCESS,
          userData.firstName
        )
        await sendBotMessages(successMessages)

        setIsProcessing(false)
        setShowShippingForm(true)
      } else if (result.fallback) {
        // Need Stripe Checkout fallback
        await sendBotMessage("Let me set up a secure payment page...")

        const fallbackResponse = await fetch('/api/upsell/fallback-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })

        const { url } = await fallbackResponse.json()

        if (url) {
          window.location.href = url
        }
      }
    } catch (error) {
      console.error('Upsell error:', error)
      await sendBotMessage("Something went wrong. Let me try another way...")
      setIsProcessing(false)
      setShowCTA(true)
    }
  }, [sessionId, userData, addUserMessage, sendBotMessage, sendBotMessages])

  // Handle Decline
  const handleDecline = useCallback(async () => {
    if (!userData) return

    setShowCTA(false)
    addUserMessage("No thanks, I'll take my chances")

    const declineMessages = personalizeMessages(
      UPSELL_SOFT_DECLINE,
      userData.firstName
    )
    await sendBotMessages(declineMessages)

    setIsComplete(true)
  }, [userData, addUserMessage, sendBotMessages])

  // Handle Shipping Submit
  const handleShippingSubmit = useCallback(async (address: ShippingAddress) => {
    if (!sessionId || !userData) return

    setShowShippingForm(false)

    try {
      await fetch('/api/shipping/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, address }),
      })

      const confirmMessages = personalizeMessages(
        UPSELL_SHIPPING_CONFIRMED,
        userData.firstName
      )
      await sendBotMessages(confirmMessages)

      setIsComplete(true)
    } catch (error) {
      console.error('Shipping error:', error)
      await sendBotMessage("Address saved. We'll confirm via email.")
      setIsComplete(true)
    }
  }, [sessionId, userData, sendBotMessage, sendBotMessages])

  return {
    messages,
    isTyping,
    showCTA,
    showShippingForm,
    isProcessing,
    handleAccept,
    handleDecline,
    handleShippingSubmit,
    isComplete,
  }
}
```

---

## 7. Upsell Messages

### File: `/lib/upsellMessages.ts`

```typescript
import type { Bucket } from '@/types/chat'

// ============================================
// MESSAGE SEQUENCES
// ============================================

export const UPSELL_CONFIRMATION = [
  "It's done, {firstName}. Your Sacred Clearing Ritual has been scheduled.",
  "I'll begin the work tonight, and your reading will arrive within 24 hours.",
  "But before I let you go... there's something important I need to tell you.",
]

export const UPSELL_GAP = [
  "The clearing removes the block from your energy field.",
  "But here's what most people don't understand, {firstName}...",
  "Removal is only half the work.",
  "For the next 30 days, your energy field will be rebuilding — like a wound healing.",
]

export const UPSELL_RISK = [
  "During this window, you're actually MORE open than before.",
  "This is when shadows try to return. I've seen it happen too many times.",
  "Someone clears a block, feels amazing... then weeks later, it creeps back.",
]

export const UPSELL_LAVA_INTRO = [
  "That's why I offer a second ritual — a Protection Ritual.",
  "For your protection, I'll be using volcanic lava stone...",
  "It's born from the Earth's core — where transformation begins.",
  "When lava erupts, it destroys the old and creates new land. That's YOUR energy right now.",
  "Its porous surface absorbs negative energy before it can reach you.",
]

export const UPSELL_BUCKET_MESSAGES: Record<Bucket, string[]> = {
  love: [
    "It will guard your heart while it heals and opens to new love.",
    "Wear it close to your skin — let it filter who gets access to your energy.",
  ],
  money: [
    "Keep it where you handle money — your wallet, desk, or workspace.",
    "It will absorb scarcity thinking and protect your growing abundance.",
  ],
  purpose: [
    "Wear it daily as you step into your true path.",
    "It will ground you when things feel uncertain, and protect your emerging purpose.",
  ],
  someone: [
    "Wear it when you think of {personName}, or when you'll see them.",
    "It filters their energy — letting truth through, blocking confusion.",
  ],
}

export const UPSELL_CLOSING = [
  "I'll personally consecrate it and charge it with YOUR specific energy.",
  "When you receive it, hold it in both hands and say: 'I am protected. I am transforming.'",
  "That activates the bond between you and the stone.",
]

export const UPSELL_OFFER = [
  "The Protection Ritual is $47 — including the charged stone shipped directly to you.",
  "Most of my serious clients do both rituals together, {firstName}.",
  "Clearing AND protection. It's the complete work.",
  "Shall I protect what we're about to clear?",
]

export const UPSELL_SOFT_DECLINE = [
  "I understand, {firstName}. It's your journey.",
  "Just... be mindful over the next 30 days.",
  "If you feel old patterns returning, the protection ritual is always available.",
  "For now, watch your inbox. Your clearing reading arrives within 24 hours.",
  "Take care of yourself, dear.",
]

export const UPSELL_SUCCESS = [
  "Beautiful choice, {firstName}.",
  "Both rituals are now confirmed — clearing AND protection.",
  "Your charged volcanic stone will ship within 48 hours.",
  "I just need your shipping address. Where should I send it?",
]

export const UPSELL_SHIPPING_CONFIRMED = [
  "Perfect. Your protection stone is on its way, {firstName}.",
  "When it arrives, hold it in both hands and say: 'I am protected. I am transforming.'",
  "That activates the bond between you and the stone.",
  "Watch your inbox — your clearing reading arrives within 24 hours.",
  "Thank you for trusting me with this sacred work. The universe is already responding.",
]

// ============================================
// HELPERS
// ============================================

export function personalizeMessages(
  messages: string[],
  firstName: string,
  personName?: string
): string[] {
  return messages.map(msg =>
    msg
      .replace(/{firstName}/g, firstName || 'dear')
      .replace(/{personName}/g, personName || 'them')
  )
}

export function getUpsellPitchMessages(
  bucket: Bucket,
  firstName: string,
  personName?: string
): string[] {
  const bucketMessages = UPSELL_BUCKET_MESSAGES[bucket] || []

  const allMessages = [
    ...UPSELL_CONFIRMATION,
    ...UPSELL_GAP,
    ...UPSELL_RISK,
    ...UPSELL_LAVA_INTRO,
    ...bucketMessages,
    ...UPSELL_CLOSING,
    ...UPSELL_OFFER,
  ]

  return personalizeMessages(allMessages, firstName, personName)
}
```

---

## 8. Route Registration

### Update `/server/index.ts`

```typescript
import checkoutRoutes from './routes/checkout'
import upsellRoutes from './routes/upsell'
import shippingRoutes from './routes/shipping'

// ...

app.use('/api/checkout', checkoutRoutes)
app.use('/api/upsell', upsellRoutes)
app.use('/api/shipping', shippingRoutes)
```

### Update Frontend Routes

```typescript
// React Router example
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/chat" element={<ChatPage />} />
  <Route path="/upsell" element={<UpsellPage />} />  {/* NEW */}
  <Route path="/success" element={<SuccessPage />} />
</Routes>
```

---

## 9. Files Summary

### New Files

| File | Purpose |
|------|---------|
| `/pages/Upsell.tsx` | Upsell page component |
| `/hooks/useUpsellChat.ts` | Upsell chat logic |
| `/lib/upsellMessages.ts` | All message sequences |
| `/server/routes/upsell.ts` | User data + charge routes |
| `/server/routes/shipping.ts` | Save address route |

### Modified Files

| File | Changes |
|------|---------|
| `/server/routes/checkout.ts` | Save customer, set `success_url` to `/upsell` |
| `/server/index.ts` | Register new routes |
| Router config | Add `/upsell` route |
| Database schema | Add order fields |

### Existing (Keep As-Is)

| File | Notes |
|------|-------|
| `/components/upsell/UpsellCTA.tsx` | Already built |
| `/components/upsell/ShippingForm.tsx` | Already built |

---

## 10. Implementation Order

```
1. Update database schema (add order fields)
2. Update checkout route:
   - Create Stripe Customer
   - Set setup_future_usage
   - Save order to DB
   - Change success_url to /upsell
3. Create /api/upsell/user-data route
4. Create /api/upsell/charge route
5. Create /api/upsell/fallback-checkout route
6. Create /api/shipping/save route
7. Create upsellMessages.ts
8. Create useUpsellChat hook
9. Create Upsell page component
10. Add route to router
11. Test end-to-end
```

---

## 11. Testing Checklist

### Happy Path
- [ ] Complete $35 purchase
- [ ] Redirect to /upsell?session_id=xxx
- [ ] User data loads from DB
- [ ] Upsell messages appear with typing
- [ ] CTA buttons appear
- [ ] Click Accept → 1-click charge succeeds
- [ ] Shipping form appears
- [ ] Submit address → confirmation messages
- [ ] Redirect to /success

### Decline Path
- [ ] Click Decline → soft exit messages
- [ ] Redirect to /success

### Fallback Path
- [ ] 1-click fails → redirect to Stripe Checkout
- [ ] Complete checkout → return to success

### Error Handling
- [ ] Invalid session_id → error message
- [ ] Network error → retry option
- [ ] Card declined → fallback checkout

---

*This PRD reflects the correct architecture: separate upsell page with fresh chat, data from database.*
