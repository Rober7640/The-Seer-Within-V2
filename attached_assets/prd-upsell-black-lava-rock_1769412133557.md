# PRD: Protection Ritual Upsell (Black Lava Rock)

## 1. Product Overview

### Offer Summary

| Field | Value |
|-------|-------|
| **Product Name** | Protection Ritual + Volcanic Stone |
| **Display Name** | "Volcanic Protection Stone" |
| **Price** | $47.00 USD (includes shipping) |
| **Physical Product** | Black Lava Rock Bracelet/Bead |
| **Inventory** | 1,000 units |
| **Estimated COGS** | $3-5 per unit |
| **Margin** | ~90% |
| **Target Take Rate** | 25-35% |

### Value Proposition

The clearing removes the block. The Protection Ritual prevents it from returning during the 30-day vulnerability window while the user's energy field rebuilds.

### Positioning

**NOT a product sale.** It's a second ritual with a physical anchor.

| Wrong Framing | Correct Framing |
|---------------|-----------------|
| "Buy this bracelet" | "I'll perform a Protection Ritual" |
| "Protection stone for $47" | "I'll anchor the shield to volcanic stone" |
| Product pitch | Ritual continuation |

---

## 2. User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  User completes $35 Sacred Clearing purchase                    │
│                         │                                       │
│                         ▼                                       │
│  Stripe redirects to: /chat?session_id={ID}&purchased=true      │
│                         │                                       │
│                         ▼                                       │
│  Chat detects return, sets state: POST_PURCHASE                 │
│                         │                                       │
│                         ▼                                       │
│  Evelyn delivers upsell pitch (18-22 messages with typing)      │
│                         │                                       │
│                         ▼                                       │
│  Show UpsellCTA component                                       │
│          │                              │                       │
│          ▼                              ▼                       │
│     [ACCEPT]                       [DECLINE]                    │
│          │                              │                       │
│          ▼                              ▼                       │
│  1-Click Charge $47              Soft decline messages          │
│          │                              │                       │
│          ▼                              ▼                       │
│  Show ShippingForm                 state: COMPLETE              │
│          │                                                      │
│          ▼                                                      │
│  Save address, confirm                                          │
│          │                                                      │
│          ▼                                                      │
│  state: COMPLETE                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Conversation States

Add to existing `ConversationState` type:

```typescript
type ConversationState =
  | 'INIT'
  | 'GREETING'
  | 'NAME_CAPTURE'
  | 'BUCKET_SELECTION'
  | 'PERSON_NAME_CAPTURE'
  | 'EMAIL_CAPTURE'
  | 'READING_1'
  | 'READING_2'
  | 'FUTURE_PACING'
  | 'CRISIS_REVEAL'
  | 'CRISIS_COST'
  | 'CRISIS_URGENCY'
  | 'PERMISSION_ASK'
  | 'PITCH'
  | 'OBJECTION_HANDLING'
  | 'CHECKOUT'
  // === NEW UPSELL STATES ===
  | 'POST_PURCHASE'        // Just returned from Stripe
  | 'UPSELL_PITCH'         // Delivering upsell messages
  | 'UPSELL_CTA'           // Showing accept/decline buttons
  | 'UPSELL_PROCESSING'    // Processing 1-click payment
  | 'UPSELL_SHIPPING'      // Collecting shipping address
  | 'UPSELL_DECLINED'      // User declined, soft exit
  | 'COMPLETE'             // Flow finished
```

---

## 4. Chat State Additions

Add to `ChatState` interface:

```typescript
interface ChatState {
  // ... existing fields ...
  
  // Upsell state
  showUpsellCTA: boolean
  showShippingForm: boolean
  isUpsellProcessing: boolean
  checkoutSessionId: string | null
  upsellPaymentId: string | null
  shippingAddress: ShippingAddress | null
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
```

Initial state additions:

```typescript
const initialChatState: ChatState = {
  // ... existing ...
  showUpsellCTA: false,
  showShippingForm: false,
  isUpsellProcessing: false,
  checkoutSessionId: null,
  upsellPaymentId: null,
  shippingAddress: null,
}
```

---

## 5. Upsell Messages

### 5.1 Confirmation Messages (All Buckets)

```typescript
export const UPSELL_CONFIRMATION = [
  "It's done, {firstName}. Your Sacred Clearing Ritual has been scheduled.",
  "I'll begin the work tonight, and your reading will arrive within 24 hours.",
  "But before I let you go... there's something important I need to tell you.",
]
```

### 5.2 Gap Creation (All Buckets)

```typescript
export const UPSELL_GAP = [
  "The clearing removes the block from your energy field.",
  "But here's what most people don't understand, {firstName}...",
  "Removal is only half the work.",
  "For the next 30 days, your energy field will be rebuilding — like a wound healing.",
]
```

### 5.3 Risk Introduction (All Buckets)

```typescript
export const UPSELL_RISK = [
  "During this window, you're actually MORE open than before.",
  "This is when shadows try to return. I've seen it happen too many times.",
  "Someone clears a block, feels amazing... then weeks later, it creeps back.",
]
```

### 5.4 Solution — Black Lava Introduction (All Buckets)

```typescript
export const UPSELL_LAVA_INTRO = [
  "That's why I offer a second ritual — a Protection Ritual.",
  "For your protection, I'll be using volcanic lava stone...",
  "It's born from the Earth's core — where transformation begins.",
  "When lava erupts, it destroys the old and creates new land. That's YOUR energy right now.",
  "Its porous surface absorbs negative energy before it can reach you.",
]
```

### 5.5 Bucket-Specific Messages

```typescript
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
```

### 5.6 Closing Messages (All Buckets)

```typescript
export const UPSELL_CLOSING = [
  "I'll personally consecrate it and charge it with YOUR specific energy.",
  "When you receive it, hold it in both hands and say: 'I am protected. I am transforming.'",
  "That activates the bond between you and the stone.",
]
```

### 5.7 Offer Messages (All Buckets)

```typescript
export const UPSELL_OFFER = [
  "The Protection Ritual is $47 — including the charged stone shipped directly to you.",
  "Most of my serious clients do both rituals together, {firstName}.",
  "Clearing AND protection. It's the complete work.",
  "Shall I protect what we're about to clear?",
]
```

### 5.8 Decline — Soft Exit

```typescript
export const UPSELL_SOFT_DECLINE = [
  "I understand, {firstName}. It's your journey.",
  "Just... be mindful over the next 30 days.",
  "If you feel old patterns returning, the protection ritual is always available.",
  "For now, watch your inbox. Your clearing reading arrives within 24 hours.",
  "Take care of yourself, dear.",
]
```

### 5.9 Accept — Success Messages

```typescript
export const UPSELL_SUCCESS = [
  "Beautiful choice, {firstName}.",
  "Both rituals are now confirmed — clearing AND protection.",
  "Your charged volcanic stone will ship within 48 hours.",
  "I just need your shipping address. Where should I send it?",
]
```

### 5.10 Shipping Confirmed Messages

```typescript
export const UPSELL_SHIPPING_CONFIRMED = [
  "Perfect. Your protection stone is on its way, {firstName}.",
  "When it arrives, hold it in both hands and say: 'I am protected. I am transforming.'",
  "That activates the bond between you and the stone.",
  "Watch your inbox — your clearing reading arrives within 24 hours.",
  "Thank you for trusting me with this sacred work. The universe is already responding.",
]
```

---

## 6. Complete Messages File

### `/lib/upsellMessages.ts`

```typescript
import type { Bucket } from '@/types/chat'

// ============================================
// UPSELL MESSAGE SEQUENCES
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
// HELPER FUNCTION
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

// ============================================
// GET ALL UPSELL MESSAGES IN ORDER
// ============================================

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

## 7. Upsell Hook

### `/hooks/useUpsell.ts`

```typescript
import { useCallback, useState } from 'react'
import type { Bucket, UserData, ChatState } from '@/types/chat'
import {
  getUpsellPitchMessages,
  personalizeMessages,
  UPSELL_SOFT_DECLINE,
  UPSELL_SUCCESS,
  UPSELL_SHIPPING_CONFIRMED,
} from '@/lib/upsellMessages'

interface UseUpsellProps {
  userData: UserData
  sendBotMessages: (messages: string[]) => Promise<void>
  sendBotMessage: (message: string) => Promise<void>
  updateState: (updates: Partial<ChatState>) => void
  addMessage: (role: 'user' | 'bot', content: string) => void
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

export function useUpsell({
  userData,
  sendBotMessages,
  sendBotMessage,
  updateState,
  addMessage,
}: UseUpsellProps) {
  const [upsellPaymentId, setUpsellPaymentId] = useState<string | null>(null)

  // ============================================
  // START UPSELL PITCH
  // ============================================
  const startUpsellPitch = useCallback(async () => {
    updateState({
      state: 'UPSELL_PITCH',
      inputEnabled: false,
      showUpsellCTA: false,
      showShippingForm: false,
    })

    // Get all pitch messages personalized
    const messages = getUpsellPitchMessages(
      userData.bucket || 'love',
      userData.firstName || 'dear',
      userData.personName || undefined
    )

    // Send all messages with typing delay
    await sendBotMessages(messages)

    // Show CTA buttons
    updateState({
      state: 'UPSELL_CTA',
      showUpsellCTA: true,
      inputEnabled: false,
    })
  }, [userData, sendBotMessages, updateState])

  // ============================================
  // HANDLE ACCEPT (1-Click Charge)
  // ============================================
  const handleUpsellAccept = useCallback(async (checkoutSessionId: string) => {
    updateState({
      showUpsellCTA: false,
      state: 'UPSELL_PROCESSING',
      isUpsellProcessing: true,
    })

    // Add user's acceptance to chat
    addMessage('user', "Yes, protect my clearing")

    try {
      // Attempt 1-click charge
      const response = await fetch('/api/upsell/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutSessionId }),
      })

      const result = await response.json()

      if (result.success) {
        // Payment succeeded!
        setUpsellPaymentId(result.paymentIntentId)

        const successMessages = personalizeMessages(
          UPSELL_SUCCESS,
          userData.firstName || 'dear'
        )
        await sendBotMessages(successMessages)

        updateState({
          state: 'UPSELL_SHIPPING',
          isUpsellProcessing: false,
          showShippingForm: true,
          upsellPaymentId: result.paymentIntentId,
        })
      } else if (result.fallback) {
        // Need redirect to Stripe Checkout
        await sendBotMessage("Let me set up a secure payment page...")

        const fallbackResponse = await fetch('/api/upsell/fallback-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userData.email,
            firstName: userData.firstName,
            bucket: userData.bucket,
            originalSessionId: checkoutSessionId,
          }),
        })

        const { url } = await fallbackResponse.json()

        if (url) {
          window.location.href = url
        }
      }
    } catch (error) {
      console.error('Upsell payment error:', error)
      await sendBotMessage("Something went wrong. Let me try another way...")
      
      updateState({
        isUpsellProcessing: false,
        showUpsellCTA: true,
        state: 'UPSELL_CTA',
      })
    }
  }, [userData, sendBotMessages, sendBotMessage, addMessage, updateState])

  // ============================================
  // HANDLE DECLINE
  // ============================================
  const handleUpsellDecline = useCallback(async () => {
    updateState({
      showUpsellCTA: false,
      state: 'UPSELL_DECLINED',
      inputEnabled: false,
    })

    // Add user's decline to chat
    addMessage('user', "No thanks, I'll take my chances")

    const declineMessages = personalizeMessages(
      UPSELL_SOFT_DECLINE,
      userData.firstName || 'dear'
    )
    await sendBotMessages(declineMessages)

    updateState({ state: 'COMPLETE' })
  }, [userData, sendBotMessages, addMessage, updateState])

  // ============================================
  // HANDLE SHIPPING SUBMIT
  // ============================================
  const handleShippingSubmit = useCallback(async (address: ShippingAddress) => {
    updateState({
      showShippingForm: false,
      inputEnabled: false,
    })

    try {
      await fetch('/api/shipping/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: upsellPaymentId,
          firstName: userData.firstName,
          email: userData.email,
          address,
        }),
      })

      const confirmMessages = personalizeMessages(
        UPSELL_SHIPPING_CONFIRMED,
        userData.firstName || 'dear'
      )
      await sendBotMessages(confirmMessages)

      updateState({
        state: 'COMPLETE',
        shippingAddress: address,
      })
    } catch (error) {
      console.error('Shipping save error:', error)
      await sendBotMessage("Address saved. We'll confirm shipping via email.")
      updateState({ state: 'COMPLETE' })
    }
  }, [upsellPaymentId, userData, sendBotMessages, sendBotMessage, updateState])

  return {
    startUpsellPitch,
    handleUpsellAccept,
    handleUpsellDecline,
    handleShippingSubmit,
  }
}
```

---

## 8. API Routes

### 8.1 Update Main Checkout

**File:** `/server/routes/checkout.ts`

Key changes:
- Create Stripe Customer (not guest)
- Set `setup_future_usage: 'off_session'` to save card

```typescript
// In your checkout session creation:
const session = await stripe.checkout.sessions.create({
  customer: customer.id,  // Attach to customer
  payment_method_types: ['card'],
  line_items: [/* ... */],
  mode: 'payment',
  payment_intent_data: {
    setup_future_usage: 'off_session',  // Save payment method
    metadata: {
      firstName,
      bucket,
      email,
    },
  },
  success_url: `${BASE_URL}/chat?session_id={CHECKOUT_SESSION_ID}&purchased=true`,
  cancel_url: `${BASE_URL}/chat?cancelled=true`,
})
```

### 8.2 Upsell Charge Route

**File:** `/server/routes/upsell.ts`

```typescript
import Stripe from 'stripe'
import { Router } from 'express'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const router = Router()

// 1-Click Charge
router.post('/charge', async (req, res) => {
  try {
    const { checkoutSessionId } = req.body

    // Get original session
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['payment_intent'],
    })

    if (!session.customer || !session.payment_intent) {
      return res.json({ success: false, fallback: true })
    }

    const customerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer.id

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent
    const paymentMethodId = paymentIntent.payment_method as string

    if (!paymentMethodId) {
      return res.json({ success: false, fallback: true })
    }

    // Create upsell charge
    const upsellPayment = await stripe.paymentIntents.create({
      amount: 4700, // $47.00
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: 'Protection Ritual + Volcanic Stone',
      metadata: {
        product: 'protection_ritual',
        originalSession: checkoutSessionId,
      },
    })

    if (upsellPayment.status === 'succeeded') {
      res.json({
        success: true,
        paymentIntentId: upsellPayment.id,
      })
    } else {
      res.json({ success: false, fallback: true })
    }
  } catch (error: any) {
    console.error('Upsell charge error:', error)
    
    if (error.code === 'card_declined' || error.code === 'authentication_required') {
      return res.json({ success: false, fallback: true })
    }
    
    res.json({ success: false, fallback: true })
  }
})

// Fallback Checkout
router.post('/fallback-checkout', async (req, res) => {
  try {
    const { email, firstName, bucket, originalSessionId } = req.body

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Protection Ritual + Volcanic Stone',
            description: 'Charged black lava protection talisman',
          },
          unit_amount: 4700,
        },
        quantity: 1,
      }],
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ', 'SG'],
      },
      success_url: `${process.env.BASE_URL}/success?upsell=true`,
      cancel_url: `${process.env.BASE_URL}/chat?upsell_cancelled=true`,
      metadata: {
        product: 'protection_ritual',
        originalSession: originalSessionId,
        firstName,
        bucket,
      },
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error('Fallback checkout error:', error)
    res.status(500).json({ error: 'Checkout failed' })
  }
})

export default router
```

### 8.3 Shipping Route

**File:** `/server/routes/shipping.ts`

```typescript
import { Router } from 'express'

const router = Router()

router.post('/save', async (req, res) => {
  try {
    const { paymentIntentId, firstName, email, address } = req.body

    // Validate
    if (!address.line1 || !address.city || !address.postal || !address.country) {
      return res.status(400).json({ error: 'Incomplete address' })
    }

    // Save to database
    // TODO: Replace with your database logic
    console.log('📦 Upsell order to ship:', {
      paymentIntentId,
      firstName,
      email,
      address,
      createdAt: new Date().toISOString(),
    })

    // TODO: Send to fulfillment system
    // TODO: Send confirmation email

    res.json({ success: true })
  } catch (error) {
    console.error('Shipping save error:', error)
    res.status(500).json({ error: 'Failed to save address' })
  }
})

export default router
```

---

## 9. Chat Page Integration

Add to your main chat page component:

```tsx
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useConversation } from '@/hooks/useConversation'
import { useUpsell } from '@/hooks/useUpsell'
import { UpsellCTA } from '@/components/upsell/UpsellCTA'
import { ShippingForm } from '@/components/upsell/ShippingForm'

export function ChatPage() {
  const [searchParams] = useSearchParams()
  
  const {
    chat,
    sendBotMessages,
    sendBotMessage,
    updateState,
    addMessage,
    // ... other conversation methods
  } = useConversation()

  const {
    startUpsellPitch,
    handleUpsellAccept,
    handleUpsellDecline,
    handleShippingSubmit,
  } = useUpsell({
    userData: chat.userData,
    sendBotMessages,
    sendBotMessage,
    updateState,
    addMessage,
  })

  // Detect return from Stripe
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const purchased = searchParams.get('purchased')

    if (sessionId && purchased === 'true' && chat.state !== 'POST_PURCHASE') {
      updateState({
        state: 'POST_PURCHASE',
        checkoutSessionId: sessionId,
      })

      // Start upsell pitch after short delay
      setTimeout(() => {
        startUpsellPitch()
      }, 1000)
    }
  }, [searchParams, chat.state, updateState, startUpsellPitch])

  // Handle upsell accept click
  const onUpsellAccept = () => {
    if (chat.checkoutSessionId) {
      handleUpsellAccept(chat.checkoutSessionId)
    }
  }

  return (
    <main className="...">
      {/* Chat container */}
      <div className="...">
        {/* Messages */}
        <ChatMessages messages={chat.messages} />

        {/* Typing indicator */}
        {chat.isTyping && <TypingIndicator />}

        {/* === EXISTING COMPONENTS === */}
        {chat.showBucketButtons && <BucketButtons />}
        {chat.showPermissionButton && <PermissionButton />}
        {chat.showPurchaseCTA && <PurchaseCTA />}

        {/* === UPSELL COMPONENTS === */}
        {chat.showUpsellCTA && (
          <UpsellCTA
            onAccept={onUpsellAccept}
            onDecline={handleUpsellDecline}
            isProcessing={chat.isUpsellProcessing}
          />
        )}

        {chat.showShippingForm && (
          <ShippingForm
            defaultName={chat.userData.firstName || ''}
            onSubmit={handleShippingSubmit}
          />
        )}

        {/* Input field */}
        {chat.inputEnabled && !chat.showUpsellCTA && !chat.showShippingForm && (
          <ChatInput />
        )}
      </div>
    </main>
  )
}
```

---

## 10. Visual Components Reference

### UpsellCTA

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │   ✨ Yes, Protect My Clearing — $47 │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│      No thanks, I'll take my chances        │
│                                             │
│     🔒 Secure 1-Click • Same card           │
│                                             │
└─────────────────────────────────────────────┘
```

### ShippingForm

```
┌─────────────────────────────────────────────┐
│  📦 Where should I send your protection     │
│     stone?                                  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Full Name                           │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ Street Address                      │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ Apt, Suite (optional)               │    │
│  └─────────────────────────────────────┘    │
│  ┌────────────────┐ ┌──────────────────┐    │
│  │ City           │ │ State            │    │
│  └────────────────┘ └──────────────────┘    │
│  ┌────────────────┐ ┌──────────────────┐    │
│  │ Postal Code    │ │ Country ▼        │    │
│  └────────────────┘ └──────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     Ship My Protection Stone →      │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 11. Testing Checklist

### Flow Tests

- [ ] Complete $35 purchase
- [ ] Return to chat with session_id param
- [ ] Upsell messages appear with typing
- [ ] UpsellCTA appears after messages
- [ ] Accept → spinner → shipping form
- [ ] Shipping submit → confirmation messages
- [ ] Decline → soft exit messages

### Payment Tests

- [ ] 1-click charge succeeds (Stripe test: 4242 4242 4242 4242)
- [ ] 3D Secure card → fallback to checkout (4000 0025 0000 3155)
- [ ] Card declined → fallback to checkout (4000 0000 0000 0002)

### Edge Cases

- [ ] Refresh page during upsell → state preserved
- [ ] Close tab and return → graceful handling
- [ ] Network error during charge → retry option

---

## 12. Metrics to Track

| Metric | How to Measure |
|--------|----------------|
| Upsell view rate | Buyers who see upsell / Total buyers |
| Upsell conversion rate | Upsell purchases / Upsell views |
| 1-click success rate | 1-click charges / Total accept clicks |
| Fallback conversion rate | Fallback purchases / Fallback redirects |
| Average order value | (Main + Upsell revenue) / Total orders |

### Target KPIs

| Metric | Target |
|--------|--------|
| Upsell view rate | 100% |
| Upsell conversion rate | 25-35% |
| 1-click success rate | 80%+ |
| AOV lift | +33% ($35 → $47 avg) |

---

## 13. Files Summary

### New Files

| File | Purpose |
|------|---------|
| `/lib/upsellMessages.ts` | All message sequences |
| `/hooks/useUpsell.ts` | Upsell flow logic |
| `/server/routes/upsell.ts` | 1-click + fallback routes |
| `/server/routes/shipping.ts` | Save address route |

### Modified Files

| File | Changes |
|------|---------|
| `/types/chat.ts` | Add upsell states + ChatState fields |
| `/server/routes/checkout.ts` | Customer creation + save payment method |
| `/pages/Chat.tsx` | Upsell component integration |

### Existing (Keep)

| File | Notes |
|------|-------|
| `/components/upsell/UpsellCTA.tsx` | Already built (shadcn version) |
| `/components/upsell/ShippingForm.tsx` | Already built (shadcn version) |

---

## 14. Implementation Order

```
1. Add upsellMessages.ts (copy from this PRD)
2. Add types to chat.ts
3. Add useUpsell hook
4. Update checkout route (save payment method)
5. Add upsell API routes
6. Add shipping API route
7. Integrate into Chat page
8. Test end-to-end
```

---

*This PRD contains everything needed to implement the Black Lava Rock upsell. Components already exist — focus on messages, hook, and API integration.*
