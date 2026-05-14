# Upsell Implementation — Final Version

## Overview

| Element | Value |
|---------|-------|
| **Messages** | ~44 |
| **Interactions** | 4 (3 questions + 1 CTA) |
| **Duration** | 4-6 minutes |
| **Components** | Uses existing shadcn UpsellCTA & ShippingForm |

---

## Architecture

```
/upsell?session_id={ID}
        │
        ▼
┌─────────────────────────────────────┐
│  1. Fetch user data from DB         │
│  2. Initialize fresh chat           │
│  3. Start upsell flow               │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  CONFIRMATION (3 msgs)              │
│  GAP (4 msgs)                       │
│  RISK (5 msgs)                      │
│           ↓                         │
│  ══════════════════════════════     │
│  █ QUESTION 1                  █    │
│  █ [Quick Replies] + Input     █    │
│  ══════════════════════════════     │
│           ↓                         │
│  VALIDATION (3 msgs)                │
│  SOLUTION (3 msgs)                  │
│  LAVA INTRO (5 msgs)                │
│           ↓                         │
│  ══════════════════════════════     │
│  █ QUESTION 2                  █    │
│  █ [Quick Replies] + Input     █    │
│  ══════════════════════════════     │
│           ↓                         │
│  VALIDATION (2 msgs)                │
│  RITUAL DETAILS (8 msgs)            │
│  WHAT YOU'LL FEEL (4 msgs)          │
│           ↓                         │
│  ══════════════════════════════     │
│  █ QUESTION 3                  █    │
│  █ [Quick Replies] + Input     █    │
│  ══════════════════════════════     │
│           ↓                         │
│  VALIDATION (2 msgs)                │
│  BUCKET-SPECIFIC (3 msgs)           │
│  DELIVERY (5 msgs)                  │
│  OFFER (4 msgs)                     │
│           ↓                         │
│  ══════════════════════════════     │
│  █ EXISTING UpsellCTA          █    │
│  █ [Accept $47] [Decline]      █    │
│  ══════════════════════════════     │
│           ↓                         │
│  (If Accept) → 1-Click Charge       │
│           ↓                         │
│  ══════════════════════════════     │
│  █ EXISTING ShippingForm       █    │
│  ══════════════════════════════     │
│           ↓                         │
│  CONFIRMATION (7 msgs)              │
│           ↓                         │
│  Redirect → /success                │
└─────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `/lib/upsellMessages.ts` | All message sequences |
| `/hooks/useUpsellChat.ts` | Chat flow logic |
| `/components/upsell/QuickReplies.tsx` | Quick reply buttons (NEW) |
| `/pages/upsell.tsx` | Page component |

## Existing Components (DO NOT RECREATE)

| File | Notes |
|------|-------|
| `/components/upsell/UpsellCTA.tsx` | Already built with shadcn |
| `/components/upsell/ShippingForm.tsx` | Already built with shadcn |

---

## File 1: `/lib/upsellMessages.ts`

```typescript
import type { Bucket } from '@/types/chat'

// ============================================
// TYPES
// ============================================

export interface QuickReply {
  text: string
  value: string
}

export type UpsellStage =
  | 'INIT'
  | 'CONFIRMATION'
  | 'GAP'
  | 'RISK'
  | 'QUESTION_1'
  | 'WAITING_Q1'
  | 'AFTER_Q1'
  | 'SOLUTION'
  | 'LAVA_INTRO'
  | 'QUESTION_2'
  | 'WAITING_Q2'
  | 'AFTER_Q2'
  | 'RITUAL'
  | 'FEEL'
  | 'QUESTION_3'
  | 'WAITING_Q3'
  | 'AFTER_Q3'
  | 'BUCKET'
  | 'DELIVERY'
  | 'OFFER'
  | 'CTA'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DECLINED'
  | 'COMPLETE'

// ============================================
// SECTION 1: CONFIRMATION (3 messages)
// ============================================

export const UPSELL_CONFIRMATION = [
  "It's done, {firstName}. Your Sacred Clearing Ritual has been scheduled.",
  "I'll begin the work tonight, and your reading will arrive within 24 hours.",
  "But before I let you go... there's something I need to tell you.",
]

// ============================================
// SECTION 2: GAP CREATION (4 messages)
// ============================================

export const UPSELL_GAP = [
  "The clearing I'm about to perform will remove the block from your energy field.",
  "But here's what most people don't understand, {firstName}...",
  "Removal is only half the work.",
  "For the next 30 days, your energy field will be rebuilding — open, raw, like a wound healing.",
]

// ============================================
// SECTION 3: RISK (5 messages)
// ============================================

export const UPSELL_RISK = [
  "During this window, you're actually MORE vulnerable than before.",
  "This is when old shadows try to return.",
  "Or worse — new ones try to attach, sensing the opening.",
  "I've seen it happen too many times, {firstName}.",
  "Someone clears a block, feels amazing for a few weeks... then it slowly creeps back.",
]

// ============================================
// INTERACTION 1
// ============================================

export const UPSELL_QUESTION_1 =
  "Tell me honestly... have you ever cleared something — a habit, a pattern, a feeling — only to watch it return weeks later?"

export const UPSELL_QUESTION_1_REPLIES: QuickReply[] = [
  { text: "Yes, that's happened to me", value: "yes" },
  { text: "I think so, yes", value: "maybe" },
  { text: "I'm not sure", value: "unsure" },
]

export const UPSELL_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "I felt that in your energy even before you said it.",
    "That pattern of return — it's not your fault. It's what happens when we clear without protecting.",
    "I don't want that for you this time, {firstName}.",
  ],
  maybe: [
    "Most people don't recognize it until they look back.",
    "A diet that worked then didn't. A decision that felt right then wavered.",
    "That's the pattern I want to break for you.",
  ],
  unsure: [
    "It's subtle. Sometimes we don't notice until months later.",
    "Either way, I want to make sure it doesn't happen this time.",
    "What we're clearing is too important to risk.",
  ],
  default: [
    "I can sense you understand what I mean.",
    "That cycle of clearing and returning — it ends now.",
    "I'm going to make sure of it.",
  ],
}

// ============================================
// SECTION 4: SOLUTION (3 messages)
// ============================================

export const UPSELL_SOLUTION = [
  "That's why I offer a second ritual — a Protection Ritual.",
  "It creates an energetic shield around you while your field rebuilds.",
  "And I anchor that shield to something physical... so it stays with you always.",
]

// ============================================
// SECTION 5: LAVA STONE (5 messages)
// ============================================

export const UPSELL_LAVA_INTRO = [
  "For your protection, I use volcanic lava stone.",
  "It's not a random choice, {firstName}.",
  "Lava is born from the Earth's core — where creation and destruction meet.",
  "When a volcano erupts, it destroys the old and creates new land. That's exactly what's happening in your energy right now.",
  "The stone is porous — it literally absorbs negative energy before it can reach you.",
]

// ============================================
// INTERACTION 2
// ============================================

export const UPSELL_QUESTION_2 =
  "Transformation through fire... destruction of the old to create the new. Can you feel why this stone is meant for you right now, {firstName}?"

export const UPSELL_QUESTION_2_REPLIES: QuickReply[] = [
  { text: "Yes, I can feel it", value: "yes" },
  { text: "I think I understand", value: "understand" },
  { text: "Tell me more", value: "more" },
]

export const UPSELL_AFTER_Q2: Record<string, string[]> = {
  yes: [
    "I knew you would. Your energy recognized it immediately.",
    "This stone has been waiting for someone like you.",
  ],
  understand: [
    "Good. The understanding will deepen once you hold it in your hands.",
    "Some connections become clear only through touch.",
  ],
  more: [
    "Of course. Let me show you exactly what I'll do with it.",
    "The ritual itself is where the real power lies.",
  ],
  default: [
    "The connection between you and this stone — it's already forming.",
    "Let me tell you how I'll seal it.",
  ],
}

// ============================================
// SECTION 6: RITUAL DETAILS (8 messages)
// ============================================

export const UPSELL_RITUAL = [
  "Here's exactly what I'll do for you, {firstName}...",
  "Tonight, between 2 and 4am — when the veil between worlds is thinnest — I'll begin.",
  "I'll place your stone on my altar, beside a white candle and a vessel of blessed water.",
  "Using the energy signature from our conversation, I'll call your spirit forward.",
  "Then I'll speak the protection invocation — words passed down through my grandmother's line.",
  "I'll circle your stone with sage smoke seven times, sealing your frequency into it.",
  "The ritual takes about two hours. It drains me... but for those who are ready, it's necessary work.",
  "When I'm done, I'll place your stone under moonlight until dawn to lock the charge.",
]

// ============================================
// SECTION 7: WHAT YOU'LL FEEL (4 messages)
// ============================================

export const UPSELL_FEEL = [
  "You may feel something tonight, {firstName}.",
  "Warmth spreading through your chest. Dreams more vivid than usual.",
  "A sense of being watched over — protected.",
  "That's me, working on your energy from a distance. Don't be alarmed. It means the connection is strong.",
]

// ============================================
// INTERACTION 3
// ============================================

export const UPSELL_QUESTION_3 =
  "I'm prepared to do this work for you tonight, {firstName}. Are you ready to be protected?"

export const UPSELL_QUESTION_3_REPLIES: QuickReply[] = [
  { text: "Yes, I'm ready", value: "yes" },
  { text: "I think so", value: "maybe" },
  { text: "What exactly will I receive?", value: "what" },
]

export const UPSELL_AFTER_Q3: Record<string, string[]> = {
  yes: [
    "I can feel your readiness. It's strong.",
    "Let me tell you exactly what happens after the ritual...",
  ],
  maybe: [
    "That hesitation is natural. You've been let down before.",
    "But your soul wouldn't have brought you this far if you weren't meant to continue.",
  ],
  what: [
    "A fair question. Let me be completely clear about what you'll receive.",
  ],
  default: [
    "Let me tell you exactly what you'll receive...",
  ],
}

// ============================================
// SECTION 8: BUCKET-SPECIFIC (3 messages each)
// ============================================

export const UPSELL_BUCKET_MESSAGES: Record<Bucket, string[]> = {
  love: [
    "Once your stone is charged, it will guard your heart while it heals and opens to love.",
    "Wear it against your skin — close to your heart.",
    "The wrong ones will feel repelled by your energy. The right one will feel pulled closer.",
  ],
  money: [
    "Once charged, your stone will protect your abundance field.",
    "Keep it where you handle money — your wallet, your desk, wherever you do your work.",
    "It will absorb scarcity thoughts before they can take root. Opportunities will feel clearer.",
  ],
  purpose: [
    "Once charged, your stone will anchor your emerging purpose.",
    "Wear it daily as you step into your true path.",
    "When confusion hits — and it will — hold the stone. Clarity will come faster than you expect.",
  ],
  someone: [
    "Once charged, your stone will clarify the connection between you and {personName}.",
    "Wear it when you think of them, or when you know you'll see them.",
    "It filters their energy — letting their truth through while blocking confusion and interference.",
  ],
}

// ============================================
// SECTION 9: DELIVERY (5 messages)
// ============================================

export const UPSELL_DELIVERY = [
  "Once the ritual is complete, I'll ship your charged stone directly to you.",
  "It arrives in a protective velvet pouch with a card explaining how to activate it.",
  "When you receive it, hold it in both hands, close your eyes, and say: 'I am protected. I am transforming.'",
  "That phrase activates the bond between you and the stone.",
  "The protection holds strong for at least 30 days — longer for most people. Long enough for your energy field to fully heal.",
]

// ============================================
// SECTION 10: OFFER (4 messages)
// ============================================

export const UPSELL_OFFER = [
  "The Protection Ritual is $47, {firstName}.",
  "That includes the charged volcanic stone shipped directly to your door.",
  "Most of my serious clients do both rituals together — clearing AND protection. It's the complete work.",
  "Shall I add your protection to tonight's ritual?",
]

// ============================================
// DECLINE (SOFT EXIT) - 6 messages
// ============================================

export const UPSELL_SOFT_DECLINE = [
  "I understand, {firstName}. It's your journey to walk.",
  "Just... be mindful over the next 30 days.",
  "If you feel the old heaviness returning, or patterns creeping back in, know that I'm here.",
  "The protection ritual is always available if you change your mind.",
  "For now, watch your inbox. Your clearing reading will arrive within 24 hours.",
  "Take care of yourself, dear. I'll be thinking of you tonight during the work.",
]

// ============================================
// ACCEPT - SUCCESS (5 messages)
// ============================================

export const UPSELL_SUCCESS = [
  "Beautiful choice, {firstName}.",
  "Both rituals are now confirmed — clearing AND protection.",
  "I'll perform them together tonight. The work will be deeper this way.",
  "Your charged volcanic stone will ship within 48 hours.",
  "I just need to know where to send it.",
]

// ============================================
// SHIPPING CONFIRMED (7 messages)
// ============================================

export const UPSELL_SHIPPING_CONFIRMED = [
  "Perfect. Your protection stone is on its way, {firstName}.",
  "Remember — when it arrives, hold it and say: 'I am protected. I am transforming.'",
  "That seals the bond.",
  "Tonight, as I work, you may feel warmth or have vivid dreams. That's normal. That's me.",
  "Watch your inbox — your clearing reading arrives within 24 hours.",
  "Thank you for trusting me with this sacred work, {firstName}.",
  "The universe is already responding to your decision. I can feel it shifting.",
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function personalizeMessages(
  messages: string[],
  firstName: string,
  personName?: string
): string[] {
  return messages.map((msg) =>
    msg
      .replace(/{firstName}/g, firstName || 'dear')
      .replace(/{personName}/g, personName || 'them')
  )
}

export function personalizeMessage(
  message: string,
  firstName: string,
  personName?: string
): string {
  return message
    .replace(/{firstName}/g, firstName || 'dear')
    .replace(/{personName}/g, personName || 'them')
}

// ============================================
// INTENT DETECTION
// ============================================

export function detectQ1Intent(input: string): string {
  const lower = input.toLowerCase()

  if (lower.match(/yes|definitely|absolutely|all the time|happened|totally|for sure|yep|yeah/)) {
    return 'yes'
  }
  if (lower.match(/think so|maybe|probably|sometimes|sort of|kind of|possibly/)) {
    return 'maybe'
  }
  if (lower.match(/not sure|don't know|no|haven't|never|unsure/)) {
    return 'unsure'
  }

  return 'default'
}

export function detectQ2Intent(input: string): string {
  const lower = input.toLowerCase()

  if (lower.match(/yes|feel it|sense it|definitely|i can|resonates|absolutely/)) {
    return 'yes'
  }
  if (lower.match(/understand|get it|makes sense|i see|think so/)) {
    return 'understand'
  }
  if (lower.match(/more|tell me|explain|what do you mean|how|curious/)) {
    return 'more'
  }

  return 'default'
}

export function detectQ3Intent(input: string): string {
  const lower = input.toLowerCase()

  if (lower.match(/yes|ready|i am|let's do|please|protect me|absolutely|definitely/)) {
    return 'yes'
  }
  if (lower.match(/think so|maybe|probably|i guess|suppose/)) {
    return 'maybe'
  }
  if (lower.match(/what|receive|get|included|how much|cost|price|details/)) {
    return 'what'
  }

  return 'default'
}
```

---

## File 2: `/hooks/useUpsellChat.ts`

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Bucket } from '@/types/chat'
import {
  UpsellStage,
  QuickReply,
  personalizeMessages,
  personalizeMessage,
  detectQ1Intent,
  detectQ2Intent,
  detectQ3Intent,
  UPSELL_CONFIRMATION,
  UPSELL_GAP,
  UPSELL_RISK,
  UPSELL_QUESTION_1,
  UPSELL_QUESTION_1_REPLIES,
  UPSELL_AFTER_Q1,
  UPSELL_SOLUTION,
  UPSELL_LAVA_INTRO,
  UPSELL_QUESTION_2,
  UPSELL_QUESTION_2_REPLIES,
  UPSELL_AFTER_Q2,
  UPSELL_RITUAL,
  UPSELL_FEEL,
  UPSELL_QUESTION_3,
  UPSELL_QUESTION_3_REPLIES,
  UPSELL_AFTER_Q3,
  UPSELL_BUCKET_MESSAGES,
  UPSELL_DELIVERY,
  UPSELL_OFFER,
  UPSELL_SOFT_DECLINE,
  UPSELL_SUCCESS,
  UPSELL_SHIPPING_CONFIRMED,
} from '@/lib/upsellMessages'

// ============================================
// TYPES
// ============================================

interface Message {
  id: string
  role: 'user' | 'bot'
  content: string
}

interface UserData {
  firstName: string
  email: string
  bucket: Bucket
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

// ============================================
// HELPERS
// ============================================

function getTypingDelay(message: string): number {
  const baseDelay = 400
  const perCharDelay = 25
  const maxDelay = 2500
  return Math.min(baseDelay + message.length * perCharDelay, maxDelay)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// ============================================
// HOOK
// ============================================

export function useUpsellChat({ userData, sessionId, enabled }: UseUpsellChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [stage, setStage] = useState<UpsellStage>('INIT')
  const [isTyping, setIsTyping] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [inputEnabled, setInputEnabled] = useState(false)
  const [showCTA, setShowCTA] = useState(false)
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const hasStartedRef = useRef(false)
  const lastResponseRef = useRef<string>('default')

  // Personalize helper
  const p = useCallback(
    (msgs: string[]) =>
      personalizeMessages(msgs, userData?.firstName || '', userData?.personName || undefined),
    [userData]
  )

  const pMsg = useCallback(
    (msg: string) =>
      personalizeMessage(msg, userData?.firstName || '', userData?.personName || undefined),
    [userData]
  )

  // Add bot message with typing
  const sendBotMessage = useCallback(async (content: string) => {
    setIsTyping(true)
    await sleep(getTypingDelay(content))
    setIsTyping(false)

    setMessages((prev) => [...prev, { id: generateId(), role: 'bot', content }])
    await sleep(250)
  }, [])

  // Add multiple bot messages
  const sendBotMessages = useCallback(
    async (contents: string[]) => {
      for (const content of contents) {
        await sendBotMessage(content)
      }
    },
    [sendBotMessage]
  )

  // Add user message
  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: generateId(), role: 'user', content }])
  }, [])

  // Reset UI state
  const resetUI = useCallback(() => {
    setShowQuickReplies(false)
    setInputEnabled(false)
    setShowCTA(false)
    setShowShippingForm(false)
  }, [])

  // Process stage
  const processStage = useCallback(
    async (targetStage: UpsellStage, responseKey?: string) => {
      if (!userData) return

      setStage(targetStage)
      resetUI()

      switch (targetStage) {
        case 'CONFIRMATION':
          await sendBotMessages(p(UPSELL_CONFIRMATION))
          processStage('GAP')
          break

        case 'GAP':
          await sendBotMessages(p(UPSELL_GAP))
          processStage('RISK')
          break

        case 'RISK':
          await sendBotMessages(p(UPSELL_RISK))
          processStage('QUESTION_1')
          break

        case 'QUESTION_1':
          await sendBotMessage(pMsg(UPSELL_QUESTION_1))
          setQuickReplies(UPSELL_QUESTION_1_REPLIES)
          setShowQuickReplies(true)
          setInputEnabled(true)
          setStage('WAITING_Q1')
          break

        case 'AFTER_Q1':
          const q1Response = UPSELL_AFTER_Q1[responseKey || 'default'] || UPSELL_AFTER_Q1.default
          await sendBotMessages(p(q1Response))
          processStage('SOLUTION')
          break

        case 'SOLUTION':
          await sendBotMessages(p(UPSELL_SOLUTION))
          processStage('LAVA_INTRO')
          break

        case 'LAVA_INTRO':
          await sendBotMessages(p(UPSELL_LAVA_INTRO))
          processStage('QUESTION_2')
          break

        case 'QUESTION_2':
          await sendBotMessage(pMsg(UPSELL_QUESTION_2))
          setQuickReplies(UPSELL_QUESTION_2_REPLIES)
          setShowQuickReplies(true)
          setInputEnabled(true)
          setStage('WAITING_Q2')
          break

        case 'AFTER_Q2':
          const q2Response = UPSELL_AFTER_Q2[responseKey || 'default'] || UPSELL_AFTER_Q2.default
          await sendBotMessages(p(q2Response))
          processStage('RITUAL')
          break

        case 'RITUAL':
          await sendBotMessages(p(UPSELL_RITUAL))
          processStage('FEEL')
          break

        case 'FEEL':
          await sendBotMessages(p(UPSELL_FEEL))
          processStage('QUESTION_3')
          break

        case 'QUESTION_3':
          await sendBotMessage(pMsg(UPSELL_QUESTION_3))
          setQuickReplies(UPSELL_QUESTION_3_REPLIES)
          setShowQuickReplies(true)
          setInputEnabled(true)
          setStage('WAITING_Q3')
          break

        case 'AFTER_Q3':
          const q3Response = UPSELL_AFTER_Q3[responseKey || 'default'] || UPSELL_AFTER_Q3.default
          await sendBotMessages(p(q3Response))
          processStage('BUCKET')
          break

        case 'BUCKET':
          const bucketMsgs = UPSELL_BUCKET_MESSAGES[userData.bucket] || []
          await sendBotMessages(p(bucketMsgs))
          processStage('DELIVERY')
          break

        case 'DELIVERY':
          await sendBotMessages(p(UPSELL_DELIVERY))
          processStage('OFFER')
          break

        case 'OFFER':
          await sendBotMessages(p(UPSELL_OFFER))
          setShowCTA(true)
          setStage('CTA')
          break

        case 'DECLINED':
          await sendBotMessages(p(UPSELL_SOFT_DECLINE))
          setIsComplete(true)
          break

        case 'COMPLETE':
          await sendBotMessages(p(UPSELL_SHIPPING_CONFIRMED))
          setIsComplete(true)
          break
      }
    },
    [userData, p, pMsg, sendBotMessage, sendBotMessages, resetUI]
  )

  // Handle user input (free text or quick reply)
  const handleUserInput = useCallback(
    async (input: string) => {
      addUserMessage(input)
      resetUI()

      if (stage === 'WAITING_Q1') {
        const intent = detectQ1Intent(input)
        lastResponseRef.current = intent
        await processStage('AFTER_Q1', intent)
      } else if (stage === 'WAITING_Q2') {
        const intent = detectQ2Intent(input)
        lastResponseRef.current = intent
        await processStage('AFTER_Q2', intent)
      } else if (stage === 'WAITING_Q3') {
        const intent = detectQ3Intent(input)
        lastResponseRef.current = intent
        await processStage('AFTER_Q3', intent)
      }
    },
    [stage, addUserMessage, resetUI, processStage]
  )

  // Handle quick reply click
  const handleQuickReply = useCallback(
    (reply: QuickReply) => {
      handleUserInput(reply.text)
    },
    [handleUserInput]
  )

  // Handle CTA Accept
  const handleAccept = useCallback(async () => {
    if (!sessionId || !userData) return

    setShowCTA(false)
    setIsProcessing(true)
    addUserMessage('Yes, protect my clearing')

    try {
      const response = await fetch('/api/upsell/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const result = await response.json()

      if (result.success) {
        await sendBotMessages(p(UPSELL_SUCCESS))
        setIsProcessing(false)
        setShowShippingForm(true)
        setStage('SHIPPING')
      } else if (result.fallback) {
        await sendBotMessage('Let me set up a secure payment page for you...')

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
      await sendBotMessage('Something went wrong. Let me try another way...')
      setIsProcessing(false)
      setShowCTA(true)
    }
  }, [sessionId, userData, addUserMessage, sendBotMessage, sendBotMessages, p])

  // Handle CTA Decline
  const handleDecline = useCallback(async () => {
    setShowCTA(false)
    addUserMessage("No thanks, I'll take my chances")
    await processStage('DECLINED')
  }, [addUserMessage, processStage])

  // Handle Shipping Submit
  const handleShippingSubmit = useCallback(
    async (address: ShippingAddress) => {
      if (!sessionId || !userData) return

      setShowShippingForm(false)

      try {
        await fetch('/api/shipping/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, address }),
        })

        await processStage('COMPLETE')
      } catch (error) {
        console.error('Shipping error:', error)
        await sendBotMessage("Address saved. We'll confirm details via email.")
        setIsComplete(true)
      }
    },
    [sessionId, userData, processStage, sendBotMessage]
  )

  // Start on mount
  useEffect(() => {
    if (enabled && userData && !hasStartedRef.current) {
      hasStartedRef.current = true
      setTimeout(() => {
        processStage('CONFIRMATION')
      }, 500)
    }
  }, [enabled, userData, processStage])

  return {
    messages,
    isTyping,
    showQuickReplies,
    quickReplies,
    inputEnabled,
    showCTA,
    showShippingForm,
    isProcessing,
    isComplete,
    handleUserInput,
    handleQuickReply,
    handleAccept,
    handleDecline,
    handleShippingSubmit,
  }
}
```

---

## File 3: `/components/upsell/QuickReplies.tsx` (NEW)

```tsx
import { Button } from '@/components/ui/button'

interface QuickReply {
  text: string
  value: string
}

interface QuickRepliesProps {
  replies: QuickReply[]
  onSelect: (reply: QuickReply) => void
  disabled?: boolean
}

export function QuickReplies({ replies, onSelect, disabled }: QuickRepliesProps) {
  return (
    <div className="p-4 flex flex-wrap gap-2 justify-center">
      {replies.map((reply) => (
        <Button
          key={reply.value}
          variant="outline"
          size="sm"
          onClick={() => onSelect(reply)}
          disabled={disabled}
          className="
            rounded-full
            bg-white/10 
            border-white/20
            text-white
            hover:bg-purple-600/30 
            hover:border-purple-500
            hover:text-white
            transition-all 
            duration-200
          "
        >
          {reply.text}
        </Button>
      ))}
    </div>
  )
}
```

---

## File 4: `/pages/upsell.tsx` (or `/app/upsell/page.tsx`)

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

// Your existing components
import { ChatContainer } from '@/components/chat/ChatContainer'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatInput } from '@/components/chat/ChatInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'

// Upsell components (UpsellCTA and ShippingForm are your existing shadcn versions)
import { UpsellCTA } from '@/components/upsell/UpsellCTA'
import { ShippingForm } from '@/components/upsell/ShippingForm'
import { QuickReplies } from '@/components/upsell/QuickReplies'

// Hook
import { useUpsellChat } from '@/hooks/useUpsellChat'

import type { Bucket } from '@/types/chat'

interface UserData {
  firstName: string
  email: string
  bucket: Bucket
  personName: string | null
}

export default function UpsellPage() {
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

  // Initialize chat hook
  const {
    messages,
    isTyping,
    showQuickReplies,
    quickReplies,
    inputEnabled,
    showCTA,
    showShippingForm,
    isProcessing,
    isComplete,
    handleUserInput,
    handleQuickReply,
    handleAccept,
    handleDecline,
    handleShippingSubmit,
  } = useUpsellChat({
    userData,
    sessionId,
    enabled: !!userData,
  })

  // Redirect to success when complete
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        navigate('/success')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isComplete, navigate])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white/60 animate-pulse">Loading your session...</div>
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
            className="text-purple-400 hover:text-purple-300 transition-colors"
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

        {/* Quick Replies */}
        {showQuickReplies && (
          <QuickReplies
            replies={quickReplies}
            onSelect={handleQuickReply}
            disabled={isTyping}
          />
        )}

        {/* Free Text Input (shown with quick replies) */}
        {inputEnabled && !showCTA && !showShippingForm && (
          <ChatInput
            onSend={handleUserInput}
            placeholder="Or type your response..."
            disabled={isTyping}
          />
        )}

        {/* CTA Buttons - YOUR EXISTING SHADCN COMPONENT */}
        {showCTA && (
          <UpsellCTA
            onAccept={handleAccept}
            onDecline={handleDecline}
            isProcessing={isProcessing}
          />
        )}

        {/* Shipping Form - YOUR EXISTING SHADCN COMPONENT */}
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

## File 5: Update `/components/upsell/index.ts`

```typescript
export { UpsellCTA } from './UpsellCTA'
export { ShippingForm } from './ShippingForm'
export { QuickReplies } from './QuickReplies'
```

---

## Message Count Summary

| Section | Count |
|---------|-------|
| Confirmation | 3 |
| Gap | 4 |
| Risk | 5 |
| Q1 + Response | 1 + 3 = 4 |
| Solution | 3 |
| Lava Intro | 5 |
| Q2 + Response | 1 + 2 = 3 |
| Ritual | 8 |
| Feel | 4 |
| Q3 + Response | 1 + 2 = 3 |
| Bucket | 3 |
| Delivery | 5 |
| Offer | 4 |
| **Total Pitch** | **~54** |
| Decline Exit | 6 |
| Success + Shipping | 5 + 7 = 12 |

---

## Interaction Summary

| # | Stage | Question | Quick Replies |
|---|-------|----------|---------------|
| 1 | After Risk | "Have you ever cleared something only to watch it return?" | Yes / Think so / Not sure |
| 2 | After Lava | "Can you feel why this stone is meant for you?" | Yes / Understand / Tell me more |
| 3 | After Feel | "Are you ready to be protected?" | Yes / Think so / What will I receive? |
| 4 | After Offer | CTA Buttons | Accept $47 / Decline |

---

## Components Used

| Component | Source |
|-----------|--------|
| `UpsellCTA` | **Your existing shadcn version** |
| `ShippingForm` | **Your existing shadcn version** |
| `QuickReplies` | New (uses shadcn Button) |
| `ChatContainer` | Your existing |
| `ChatMessages` | Your existing |
| `ChatInput` | Your existing |
| `TypingIndicator` | Your existing |

---

## Testing Checklist

- [ ] Page loads with session_id
- [ ] User data fetched from API
- [ ] Confirmation messages appear
- [ ] Q1 appears with quick replies
- [ ] Quick reply OR free text works
- [ ] Q2 appears after Q1 response
- [ ] Q3 appears after ritual explanation
- [ ] CTA appears after offer
- [ ] Accept → 1-click charge → shipping form
- [ ] Decline → soft exit → redirect
- [ ] Shipping submit → confirmation → redirect

---

Ready for Replit.
