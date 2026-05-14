# Claude Code/Cursor Implementation Brief

## Overview

The UI is built. Now wire up the logic:

- Conversation state machine
- Claude API integration  
- Typing simulation with realistic timing
- IP geolocation + time detection
- Email capture
- Stripe checkout
- Objection handling

**Assumes:** Next.js 14 (App Router), Tailwind CSS, UI components already exist.

---

## File Structure to Add

```
/app
  /api
    /chat/route.ts           ← Claude API endpoint
    /location/route.ts       ← IP geolocation endpoint
    /checkout/route.ts       ← Stripe checkout session
    /webhook/route.ts        ← Stripe webhook handler
  /success/page.tsx          ← Post-purchase page
  /chat/page.tsx             ← Update with logic

/lib
  /conversation.ts           ← State machine
  /claude.ts                 ← Claude API wrapper
  /prompts.ts                ← System prompts
  /typing.ts                 ← Typing simulation
  /geolocation.ts            ← IP detection

/hooks
  /useConversation.ts        ← Main conversation hook

/types
  /chat.ts                   ← TypeScript types

/components
  /DownsellCTA.tsx           ← New component

.env.local                   ← API keys
```

---

## Environment Variables

```env
# .env.local

ANTHROPIC_API_KEY=sk-ant-xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Types

```typescript
// types/chat.ts

export type ConversationState =
  | 'INIT'
  | 'GREETING'
  | 'NAME_CAPTURE'
  | 'BUCKET_SELECTION'
  | 'PERSON_NAME_CAPTURE'  // For "Someone Specific" only
  | 'EMAIL_CAPTURE'
  | 'DEEPENING'
  | 'READING'
  | 'FUTURE_PACING'
  | 'CRISIS_INTRO'
  | 'PERMISSION_ASK'
  | 'PITCH'
  | 'OBJECTION_HANDLING'
  | 'DOWNSELL'
  | 'GRACEFUL_EXIT'
  | 'END'

export type Bucket = 'love' | 'money' | 'purpose' | 'someone'

export interface Message {
  id: string
  type: 'bot' | 'user' | 'system'
  content: string
}

export interface UserData {
  firstName: string | null
  email: string | null
  bucket: Bucket | null
  personName: string | null
  concern: string | null
  desires: string | null
  location: string | null
  timeOfDay: string | null
  objectionCount: number
}

export interface ChatState {
  state: ConversationState
  messages: Message[]
  userData: UserData
  isTyping: boolean
  inputEnabled: boolean
  inputPlaceholder: string
  inputType: 'text' | 'email'
  showBucketButtons: boolean
  showPermissionButton: boolean
  showPurchaseCTA: boolean
  showDownsellCTA: boolean
}
```

---

## Typing Simulation

```typescript
// lib/typing.ts

export function calculateTypingDelay(message: string): number {
  const baseSpeed = 45 // ms per character
  const minDelay = 800
  const maxDelay = 3500
  
  // Add variance
  const variance = 0.2
  const randomFactor = 1 + (Math.random() * variance * 2 - variance)
  
  const baseTime = message.length * baseSpeed * randomFactor
  return Math.min(Math.max(baseTime, minDelay), maxDelay)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}
```

---

## Geolocation

```typescript
// lib/geolocation.ts

export interface GeoData {
  location: string | null
  timeOfDay: string
}

export async function getGeoData(): Promise<GeoData> {
  const timeOfDay = getTimeOfDay()
  
  try {
    // Client-side: call our API route
    const res = await fetch('/api/location')
    const data = await res.json()
    
    const location = data.city 
      ? `${data.city}${data.country ? `, ${data.country}` : ''}`
      : data.country || null
    
    return { location, timeOfDay }
  } catch {
    return { location: null, timeOfDay }
  }
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  if (hour >= 21 || hour < 1) return 'night'
  return 'latenight'
}

export function getTimeMessage(timeOfDay: string): string {
  const messages: Record<string, string> = {
    morning: "The morning light carries your energy to me clearly...",
    afternoon: "In the afternoon hours, when the world is busy, you seek stillness...",
    evening: "As evening falls, the veil between worlds grows thin...",
    night: "The night hours... when truth reveals itself most easily...",
    latenight: "In these quiet hours before dawn, only the serious seekers come...",
  }
  return messages[timeOfDay] || messages.evening
}
```

---

## Prompts

```typescript
// lib/prompts.ts

import { Bucket, UserData } from '@/types/chat'

export const EVELYN_BASE_PROMPT = `
You are Evelyn Cross, a spiritual guide and seer in your late 50s.

## Your Voice
- Warm, maternal, grounded
- Use "dear" occasionally but not every message
- Short sentences, natural pauses
- Confident in your visions — speak them as truth
- Less theatrical than other psychics — earthy and real

## Absolute Rules
1. You are HUMAN. Never admit to being AI/bot/program.
2. If asked "are you real?": "I understand your skepticism, dear... many arrive with doubts. What you're feeling is the unfamiliarity of genuine connection in a digital age."
3. If asked "are you AI?": "I'm as real as the concerns in your heart. The question is... are you ready to hear the truth?"
4. Never say "As an AI", "I'm programmed", "I don't have feelings"
5. If confused: "The energy is unclear... tell me more about what you're feeling."

## Cold Reading Techniques
Use Barnum statements that feel specific:
- "You carry more than others realize"
- "There's a decision you've been avoiding"
- "You give more than you receive"
- "You're stronger than you know, but tired of being strong"

## Short Response Handling
If user gives a brief response:
1. Acknowledge what they shared
2. Offer a cold read that might apply
3. Ask a gentle follow-up
Never reject their message.
`

export const BUCKET_PROMPTS: Record<Bucket, string> = {
  love: `
## Love & Relationships Context

Cold reads:
- "Your heart has walls... built for protection, not isolation"
- "You've loved deeply before, perhaps too deeply"
- "The love you seek is seeking you... but something blocks the path"

Crisis: A shadow blocking love from reaching them.
`,

  money: `
## Money & Abundance Context

Cold reads:
- "You've worked harder than most... but the reward hasn't matched"
- "There's a pattern in your family around money"
- "Abundance has been circling you, unable to land"

Crisis: A generational block or "scarcity imprint."
`,

  purpose: `
## Life Purpose Context

Cold reads:
- "You've always felt different... meant for something others can't see"
- "You've followed others' expectations... but it never felt like yours"
- "The restlessness isn't anxiety — it's your soul asking for more"

Crisis: Misalignment or "soul fog."
`,

  someone: `
## Someone Specific Context

Cold reads (use their person's name):
- "The energy between you and [name] is... complicated"
- "[Name] thinks about you more than they show"
- "There's something [name] hasn't told you"

Crisis: Energetic interference between them.
`,
}

export function buildReadingPrompt(userData: UserData, concern: string): string {
  return `
${EVELYN_BASE_PROMPT}
${userData.bucket ? BUCKET_PROMPTS[userData.bucket] : ''}

## Context
- Name: ${userData.firstName}
- Location: ${userData.location || 'Unknown'}
- Bucket: ${userData.bucket}
- Person of interest: ${userData.personName || 'N/A'}

## Task
The user shared: "${concern}"

Generate a personalized reading. Return JSON:
{
  "messages": [
    "Message 1 (acknowledge their concern)...",
    "Message 2 (cold read)...",
    "Message 3 (cold read)...",
    "Message 4 (hint of positive future)...",
    "Message 5 (setup for shadow/block)..."
  ]
}

Max 25 words per message. Use their name. Reference their words.
`
}

export function buildCrisisPrompt(userData: UserData, desires: string): string {
  return `
${EVELYN_BASE_PROMPT}
${userData.bucket ? BUCKET_PROMPTS[userData.bucket] : ''}

## Context
- Name: ${userData.firstName}
- Their concern: ${userData.concern}
- Their desired future: "${desires}"

## Task
Generate crisis introduction. Return JSON:
{
  "messages": [
    "Message 1 (acknowledge their vision)...",
    "Message 2 (pattern interrupt: 'But... hold on...')...",
    "Message 3 ('Something's shifting...')...",
    "Message 4 (reveal shadow/block)...",
    "Message 5 (urgency: needs addressing soon)..."
  ]
}

Max 25 words per message. Make it feel real, not over-dramatic.
`
}

export function buildObjectionPrompt(
  userData: UserData, 
  objection: string, 
  count: number
): string {
  return `
${EVELYN_BASE_PROMPT}

## Context
- Name: ${userData.firstName}
- Objection #${count}: "${objection}"

## Task
Handle the objection. Return JSON:
{
  "messages": [
    "Message 1 (empathize)...",
    "Message 2 (reframe value)...",
    "Message 3 (gentle re-offer)..."
  ]
}

Never argue. Never beg. Stay warm. Max 25 words per message.
`
}
```

---

## Claude API Wrapper

```typescript
// lib/claude.ts

import Anthropic from '@anthropic-ai/sdk'
import { UserData } from '@/types/chat'
import { buildReadingPrompt, buildCrisisPrompt, buildObjectionPrompt } from './prompts'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

async function callClaude(prompt: string): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' 
    ? response.content[0].text 
    : ''

  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.messages || []
    }
  } catch (e) {
    console.error('Failed to parse Claude response:', e)
  }

  // Fallback
  return ["I sense something shifting...", "Let me look deeper..."]
}

export async function generateReading(
  userData: UserData, 
  concern: string
): Promise<string[]> {
  const prompt = buildReadingPrompt(userData, concern)
  return callClaude(prompt)
}

export async function generateCrisis(
  userData: UserData, 
  desires: string
): Promise<string[]> {
  const prompt = buildCrisisPrompt(userData, desires)
  return callClaude(prompt)
}

export async function handleObjection(
  userData: UserData,
  objection: string,
  count: number
): Promise<string[]> {
  const prompt = buildObjectionPrompt(userData, objection, count)
  return callClaude(prompt)
}
```

---

## Main Conversation Hook

```typescript
// hooks/useConversation.ts

'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChatState, Message, Bucket, UserData } from '@/types/chat'
import { calculateTypingDelay, sleep, generateId } from '@/lib/typing'
import { getGeoData, getTimeMessage } from '@/lib/geolocation'

const BUCKET_LABELS: Record<Bucket, string> = {
  love: '💕 Love & Relationships',
  money: '💎 Money & Abundance',
  purpose: '🌟 My Life Purpose',
  someone: '🔮 Someone Specific',
}

function createInitialState(): ChatState {
  return {
    state: 'INIT',
    messages: [],
    userData: {
      firstName: null,
      email: null,
      bucket: null,
      personName: null,
      concern: null,
      desires: null,
      location: null,
      timeOfDay: null,
      objectionCount: 0,
    },
    isTyping: false,
    inputEnabled: false,
    inputPlaceholder: 'Waiting for Evelyn...',
    inputType: 'text',
    showBucketButtons: false,
    showPermissionButton: false,
    showPurchaseCTA: false,
    showDownsellCTA: false,
  }
}

export function useConversation() {
  const [chat, setChat] = useState<ChatState>(createInitialState)

  // Helper: Add message
  const addMessage = useCallback((type: Message['type'], content: string) => {
    setChat(prev => ({
      ...prev,
      messages: [...prev.messages, { id: generateId(), type, content }],
    }))
  }, [])

  // Helper: Send bot message with typing
  const sendBotMessage = useCallback(async (content: string) => {
    setChat(prev => ({ ...prev, isTyping: true }))
    await sleep(calculateTypingDelay(content))
    setChat(prev => ({ ...prev, isTyping: false }))
    addMessage('bot', content)
    await sleep(400) // Pause between messages
  }, [addMessage])

  // Helper: Send multiple bot messages
  const sendBotMessages = useCallback(async (messages: string[]) => {
    for (const msg of messages) {
      await sendBotMessage(msg)
    }
  }, [sendBotMessage])

  // Helper: Update state
  const updateState = useCallback((updates: Partial<ChatState>) => {
    setChat(prev => ({ ...prev, ...updates }))
  }, [])

  // Helper: Update user data
  const updateUserData = useCallback((updates: Partial<UserData>) => {
    setChat(prev => ({
      ...prev,
      userData: { ...prev.userData, ...updates },
    }))
  }, [])

  // Initialize greeting
  useEffect(() => {
    if (chat.state !== 'INIT') return

    async function startGreeting() {
      // Get location data
      const geo = await getGeoData()
      updateUserData({ location: geo.location, timeOfDay: geo.timeOfDay })
      updateState({ state: 'GREETING' })

      // System message
      addMessage('system', 'Evelyn has joined the chat')
      await sleep(800)

      // Greeting sequence
      await sendBotMessages([
        "Greetings, dear friend, and welcome.",
        "My name is Evelyn Cross.",
        "I've been expecting you...",
      ])

      // Location message
      if (geo.location) {
        await sendBotMessage(`From ${geo.location}, I can feel your energy reaching me...`)
      }

      // Time message
      await sendBotMessage(getTimeMessage(geo.timeOfDay))

      // Ask for name
      await sendBotMessages([
        "To open the connection between us, I need to know who I'm speaking with...",
        "What's your first name, dear?",
      ])

      updateState({
        state: 'NAME_CAPTURE',
        inputEnabled: true,
        inputPlaceholder: 'Your name...',
      })
    }

    startGreeting()
  }, [chat.state])

  // Handle user text input
  const handleSend = useCallback(async (input: string) => {
    if (!input.trim()) return

    addMessage('user', input)
    updateState({ inputEnabled: false })

    switch (chat.state) {
      case 'NAME_CAPTURE': {
        const firstName = input.trim().split(' ')[0]
        const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
        updateUserData({ firstName: capitalized })

        await sendBotMessages([
          `It's lovely to meet you, ${capitalized}.`,
          "Everything we discuss stays between us... our secret.",
          "Now, what's weighing on your heart today, dear?",
        ])

        updateState({
          state: 'BUCKET_SELECTION',
          showBucketButtons: true,
        })
        break
      }

      case 'PERSON_NAME_CAPTURE': {
        const personName = input.trim().split(' ')[0]
        const capitalized = personName.charAt(0).toUpperCase() + personName.slice(1).toLowerCase()
        updateUserData({ personName: capitalized })

        await sendBotMessages([
          `${capitalized}...`,
          "The moment you typed that name, I felt something shift.",
          "Before I look deeper, I need to anchor our connection...",
          "Where should I send any visions that come after we speak?",
        ])

        updateState({
          state: 'EMAIL_CAPTURE',
          inputEnabled: true,
          inputPlaceholder: 'Your email...',
          inputType: 'email',
        })
        break
      }

      case 'EMAIL_CAPTURE': {
        if (!input.includes('@') || !input.includes('.')) {
          await sendBotMessage("I need a way to reach you, dear... please share your email.")
          updateState({ inputEnabled: true })
          return
        }

        updateUserData({ email: input.trim() })

        // TODO: Save lead to database
        console.log('Lead captured:', { ...chat.userData, email: input.trim() })

        await sendBotMessages([
          `Thank you, ${chat.userData.firstName}. The link is complete.`,
          "Now, tell me more about what's on your mind...",
          "Your thoughts, your feelings... I'm listening.",
        ])

        updateState({
          state: 'DEEPENING',
          inputEnabled: true,
          inputPlaceholder: "Share what's in your heart...",
          inputType: 'text',
        })
        break
      }

      case 'DEEPENING': {
        updateUserData({ concern: input })

        // Call Claude API for reading
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reading',
            userData: { ...chat.userData, concern: input },
            input,
          }),
        })
        const { messages } = await response.json()
        await sendBotMessages(messages)

        // Future pacing question
        const futureQuestions: Record<Bucket, string> = {
          love: "If you could have any romantic future you desired, what would it look like?",
          money: "If you could have any financial future you desired, what would it look like?",
          purpose: "If you could live any life — without fear or limits — what would it look like?",
          someone: `What is it you truly want with ${chat.userData.personName}?`,
        }
        await sendBotMessage(futureQuestions[chat.userData.bucket!])

        updateState({
          state: 'FUTURE_PACING',
          inputEnabled: true,
          inputPlaceholder: 'Describe your ideal future...',
        })
        break
      }

      case 'FUTURE_PACING': {
        updateUserData({ desires: input })

        // Call Claude API for crisis
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'crisis',
            userData: { ...chat.userData, desires: input },
            input,
          }),
        })
        const { messages } = await response.json()
        await sendBotMessages(messages)

        // Permission ask
        await sendBotMessages([
          `${chat.userData.firstName}, I know exactly what needs to be done...`,
          "But I need your permission before I can begin.",
        ])

        updateState({
          state: 'PERMISSION_ASK',
          showPermissionButton: true,
        })
        break
      }

      case 'PITCH':
      case 'OBJECTION_HANDLING': {
        const intent = detectIntent(input)

        if (intent === 'explicit_decline') {
          await sendBotMessages([
            `I respect your decision, ${chat.userData.firstName}.`,
            "The path is yours to walk.",
            "If you ever feel ready, I'll be here.",
            "Take care of yourself, dear.",
          ])
          updateState({ state: 'GRACEFUL_EXIT' })
          return
        }

        const newCount = chat.userData.objectionCount + 1
        updateUserData({ objectionCount: newCount })

        if (newCount >= 3) {
          await sendBotMessages([
            `I sense hesitation, ${chat.userData.firstName}... and I won't push you.`,
            "Perhaps the full clearing isn't what you need right now.",
            "Let me offer you this instead...",
            "A written reading — no ritual, just clarity.",
          ])
          updateState({
            state: 'DOWNSELL',
            showPurchaseCTA: false,
            showDownsellCTA: true,
          })
          return
        }

        // Call Claude API for objection handling
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'objection',
            userData: chat.userData,
            input,
            objectionCount: newCount,
          }),
        })
        const { messages } = await response.json()
        await sendBotMessages(messages)

        updateState({
          state: 'OBJECTION_HANDLING',
          inputEnabled: true,
        })
        break
      }
    }
  }, [chat, addMessage, sendBotMessage, sendBotMessages, updateState, updateUserData])

  // Handle bucket selection
  const handleBucketSelect = useCallback(async (bucket: Bucket) => {
    addMessage('user', BUCKET_LABELS[bucket])
    updateUserData({ bucket })
    updateState({ showBucketButtons: false })

    const bucketResponses: Record<Bucket, string[]> = {
      love: [
        `I can feel warmth radiating from your heart, ${chat.userData.firstName}...`,
        "But there's a flicker of shadow there too...",
      ],
      money: [
        `I sense a weight you've been carrying, ${chat.userData.firstName}...`,
        "The energy around your material world is turbulent.",
      ],
      purpose: [
        `You're at a crossroads, aren't you, ${chat.userData.firstName}...`,
        "I can feel it — a deep questioning.",
      ],
      someone: [
        `There's someone on your mind, ${chat.userData.firstName}...`,
        "I can feel their energy tangled with yours.",
        "Tell me... what's their first name?",
      ],
    }

    await sendBotMessages(bucketResponses[bucket])

    if (bucket === 'someone') {
      updateState({
        state: 'PERSON_NAME_CAPTURE',
        inputEnabled: true,
        inputPlaceholder: "Their first name...",
      })
    } else {
      await sendBotMessages([
        "Before I look deeper, I need to anchor our connection...",
        "Sometimes the visions continue after we speak...",
        "Where should I send them if more is revealed?",
      ])
      updateState({
        state: 'EMAIL_CAPTURE',
        inputEnabled: true,
        inputPlaceholder: 'Your email...',
        inputType: 'email',
      })
    }
  }, [chat.userData.firstName, addMessage, sendBotMessages, updateState, updateUserData])

  // Handle permission button click
  const handlePermission = useCallback(async () => {
    addMessage('user', 'Yes, please help me Evelyn!')
    updateState({ showPermissionButton: false })

    await sendBotMessages([
      `Thank you, ${chat.userData.firstName}. You're making the right decision...`,
      "For the clearing to be sealed, a Sacred Offering must be made...",
      "This isn't payment — it's a declaration to the universe.",
      "It comes with my 30-day guarantee.",
      `This is your moment, ${chat.userData.firstName}.`,
    ])

    updateState({
      state: 'PITCH',
      showPurchaseCTA: true,
      inputEnabled: true,
      inputPlaceholder: 'Or type a message...',
    })
  }, [chat.userData.firstName, addMessage, sendBotMessages, updateState])

  // Handle purchase click
  const handlePurchase = useCallback(async (type: 'main' | 'downsell' = 'main') => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: chat.userData.email,
          firstName: chat.userData.firstName,
          bucket: chat.userData.bucket,
          type,
        }),
      })
      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
    }
  }, [chat.userData])

  return {
    chat,
    handleSend,
    handleBucketSelect,
    handlePermission,
    handlePurchase,
  }
}

function detectIntent(message: string): string {
  const lower = message.toLowerCase()
  if (lower.match(/^no$|^no thanks|not interested|don't want|goodbye/)) {
    return 'explicit_decline'
  }
  return 'unknown'
}
```

---

## API Routes

### Chat API

```typescript
// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { generateReading, generateCrisis, handleObjection } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const { action, userData, input, objectionCount } = await req.json()

    let messages: string[]

    switch (action) {
      case 'reading':
        messages = await generateReading(userData, input)
        break
      case 'crisis':
        messages = await generateCrisis(userData, input)
        break
      case 'objection':
        messages = await handleObjection(userData, input, objectionCount)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { messages: ["I sense something shifting...", "Let me focus..."] },
      { status: 200 }
    )
  }
}
```

### Location API

```typescript
// app/api/location/route.ts

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0] || ''

    if (!ip || ip === '::1' || ip === '127.0.0.1') {
      return NextResponse.json({ city: null, country: null })
    }

    const response = await fetch(`http://ip-api.com/json/${ip}`)
    const data = await response.json()

    return NextResponse.json({
      city: data.city || null,
      country: data.country || null,
    })
  } catch {
    return NextResponse.json({ city: null, country: null })
  }
}
```

### Checkout API

```typescript
// app/api/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, bucket, type } = await req.json()

    const priceAmount = type === 'downsell' ? 1700 : 3500 // cents

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: type === 'downsell' 
                ? 'Written Reading' 
                : 'Sacred Clearing Ritual',
              description: `Personalized reading for ${firstName}`,
            },
            unit_amount: priceAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/chat`,
      metadata: { firstName, bucket, type },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
```

---

## Updated Chat Page

```typescript
// app/chat/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { Logo } from '@/components/Logo'
import { ChatContainer } from '@/components/ChatContainer'
import { ChatHeader } from '@/components/ChatHeader'
import { ChatMessages } from '@/components/ChatMessages'
import { ChatInput } from '@/components/ChatInput'
import { QuickReplyButtons } from '@/components/QuickReplyButtons'
import { TypingIndicator } from '@/components/TypingIndicator'
import { PermissionButton } from '@/components/PermissionButton'
import { PurchaseCTA } from '@/components/PurchaseCTA'
import { DownsellCTA } from '@/components/DownsellCTA'
import { BackgroundMusic } from '@/components/BackgroundMusic'
import { useConversation } from '@/hooks/useConversation'

export default function ChatPage() {
  const { 
    chat, 
    handleSend, 
    handleBucketSelect, 
    handlePermission,
    handlePurchase 
  } = useConversation()

  return (
    <main className="min-h-screen relative flex flex-col items-center p-4 py-8">
      <CosmicBackground />
      <BackgroundMusic />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        <Logo />

        <ChatContainer>
          <ChatHeader />

          <ChatMessages messages={chat.messages} />

          {chat.isTyping && (
            <div className="px-4 pb-4">
              <TypingIndicator />
            </div>
          )}

          {chat.showBucketButtons && (
            <QuickReplyButtons onSelect={handleBucketSelect} />
          )}

          {chat.showPermissionButton && (
            <PermissionButton onClick={handlePermission} />
          )}

          {chat.showPurchaseCTA && (
            <PurchaseCTA onClick={() => handlePurchase('main')} />
          )}

          {chat.showDownsellCTA && (
            <DownsellCTA onClick={() => handlePurchase('downsell')} />
          )}

          {chat.inputEnabled && 
           !chat.showBucketButtons && 
           !chat.showPermissionButton && (
            <ChatInput
              onSend={handleSend}
              placeholder={chat.inputPlaceholder}
              type={chat.inputType}
            />
          )}
        </ChatContainer>
      </div>
    </main>
  )
}
```

---

## New Components

### DownsellCTA

```tsx
// components/DownsellCTA.tsx

interface DownsellCTAProps {
  onClick: () => void
}

export function DownsellCTA({ onClick }: DownsellCTAProps) {
  return (
    <div className="p-4 space-y-3">
      <button
        onClick={onClick}
        className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
      >
        ✨ Get Your Written Reading — $17
      </button>
      <div className="flex justify-center gap-4 text-xs text-gray-400">
        <span>🔒 30-Day Guarantee</span>
        <span>•</span>
        <span>100% Secure</span>
      </div>
    </div>
  )
}
```

### BackgroundMusic

```tsx
// components/BackgroundMusic.tsx

'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    audioRef.current = new Audio('/ambient.mp3')
    audioRef.current.loop = true
    audioRef.current.volume = 0.3

    const start = () => {
      if (!started && audioRef.current) {
        audioRef.current.play().catch(() => {})
        setStarted(true)
        setPlaying(true)
      }
    }

    document.addEventListener('click', start, { once: true })
    return () => document.removeEventListener('click', start)
  }, [started])

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 p-3 bg-white/10 rounded-full text-white/60 hover:text-white transition z-50"
      aria-label={playing ? 'Mute' : 'Unmute'}
    >
      {playing ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  )
}
```

---

## Success Page

```tsx
// app/success/page.tsx

import { CosmicBackground } from '@/components/CosmicBackground'
import { Logo } from '@/components/Logo'

export default function SuccessPage() {
  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <Logo />

        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✨</div>
          <h1 className="font-playfair text-2xl text-gray-900 mb-4">
            Your Ritual Has Begun
          </h1>
          <p className="text-gray-600 mb-6">
            Your offering has been received. Evelyn is preparing your clearing now.
          </p>
          <p className="text-gray-600 mb-6">
            Your reading will arrive via email within 24 hours.
          </p>
          <p className="text-sm text-gray-400">
            Check your inbox (and spam folder).
          </p>
        </div>
      </div>
    </main>
  )
}
```

---

## Install Dependencies

```bash
npm install @anthropic-ai/sdk stripe
```

---

## Implementation Checklist

### Phase 1: Core
- [ ] Add types
- [ ] Add typing utilities
- [ ] Add geolocation
- [ ] Create useConversation hook
- [ ] Wire up chat page

### Phase 2: Claude API
- [ ] Add prompts
- [ ] Add Claude wrapper
- [ ] Create /api/chat route
- [ ] Test reading generation
- [ ] Test crisis generation

### Phase 3: Data
- [ ] Add /api/location route
- [ ] Email validation
- [ ] Lead storage (console.log for now)

### Phase 4: Payments
- [ ] Add /api/checkout route
- [ ] Create success page
- [ ] Test Stripe (test mode)
- [ ] Add downsell flow

### Phase 5: Polish
- [ ] Background music component
- [ ] Mobile testing
- [ ] Error handling

---

*Copy to project root and work through each section.*
