# Replit Design Brief: Psychic Chat Funnel UI

## Overview

Build the **UI only** for a psychic reading chat funnel. No backend logic, no API calls — just beautiful, responsive components with mock data.

**Website Name:** The Seer Within
**Domain:** theseerwithin.com
**Persona:** Evelyn Cross (female psychic, late 50s, warm and wise)

---

## Tech Stack

```
Framework:    Next.js 14 (App Router)
Styling:      Tailwind CSS
Font:         Inter (body), Playfair Display (headings/logo)
Icons:        Lucide React
```

---

## Pages to Build

```
/                → Landing Page
/chat            → Chat Interface
```

---

## Color Palette

```css
/* Add to tailwind.config.js or use inline */

/* Backgrounds */
--bg-deep:       #0f172a    /* Deep navy */
--bg-mid:        #1e3a5f    /* Mid blue */

/* Accents */
--purple:        #7c3aed    /* Primary purple */
--purple-dark:   #6d28d9    /* Button gradient end */
--gold:          #d4af37    /* Logo, emphasis */

/* Status */
--red:           #ef4444    /* Busy */
--yellow:        #fbbf24    /* Connecting flash */
--green:         #22c55e    /* Online */

/* Neutrals */
--white:         #ffffff
--gray-100:      #f3f4f6
--gray-400:      #9ca3af    /* Disabled */
--gray-500:      #6b7280    /* Secondary text */
--gray-900:      #111827    /* Primary text */
```

---

## Page 1: Landing Page

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                   [COSMIC BACKGROUND]                          │
│              (gradient + animated particles)                   │
│                                                                │
│                    🔮 The Seer Within                       │
│                      (logo + gold text)                        │
│                                                                │
│              ┌────────────────────────────┐                    │
│              │                            │                    │
│              │        ┌────────┐          │                    │
│              │        │ AVATAR │          │                    │
│              │        │ (100px)│          │                    │
│              │        └────────┘          │                    │
│              │                            │                    │
│              │   Evelyn Cross is [●]      │                    │
│              │                            │                    │
│              │   ━━━━━━━━━━━━━━━━━━━━━   │                    │
│              │                            │                    │
│              │    Everything You Desire   │                    │
│              │      Is Within Reach       │                    │
│              │                            │                    │
│              │   [Subheadline text]       │                    │
│              │                            │                    │
│              │ ┌────────────────────────┐ │                    │
│              │ │      [CTA BUTTON]      │ │                    │
│              │ └────────────────────────┘ │                    │
│              │                            │                    │
│              │   * Scarcity text...       │                    │
│              │                            │                    │
│              │   🔒 Trust    ✓ Trust      │                    │
│              │                            │                    │
│              └────────────────────────────┘                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Background Component

```tsx
// components/CosmicBackground.tsx

// Full viewport background with:
// 1. Gradient: from #0f172a (top) to #1e3a5f (bottom)
// 2. Animated stars/particles (CSS or canvas)
// 3. Subtle aurora/light ray effect (optional)

// Simple CSS version:
<div className="fixed inset-0 bg-gradient-to-b from-[#0f172a] to-[#1e3a5f] overflow-hidden">
  {/* Stars - small white dots with twinkle animation */}
  <div className="stars" />
</div>
```

```css
/* Stars animation */
.stars {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(2px 2px at 20px 30px, white, transparent),
    radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 90px 40px, white, transparent),
    radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent),
    /* Add more random positions */;
  background-size: 200px 200px;
  animation: twinkle 5s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### Logo Component

```tsx
// components/Logo.tsx

<div className="flex items-center justify-center gap-3">
  {/* Crystal ball icon - use an emoji or SVG */}
  <span className="text-4xl">🔮</span>
  
  {/* Text */}
  <h1 className="font-playfair text-3xl md:text-4xl text-[#d4af37]">
    The Seer Within
  </h1>
</div>
```

### Card Component

```tsx
// components/LandingCard.tsx

<div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
  {/* Avatar */}
  <div className="flex justify-center mb-4">
    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-100">
      <img 
        src="/evelyn-avatar.jpg" 
        alt="Evelyn Cross"
        className="w-full h-full object-cover"
      />
    </div>
  </div>
  
  {/* Status */}
  <StatusIndicator />
  
  {/* Divider */}
  <div className="w-16 h-0.5 bg-gray-200 mx-auto my-6" />
  
  {/* Headline */}
  <h2 className="font-playfair text-2xl text-gray-900 text-center mb-3">
    Everything You Desire Is Within Reach
  </h2>
  
  {/* Subheadline */}
  <p className="text-gray-500 text-center text-sm mb-6">
    Evelyn has sensed the blessings you so richly deserve. 
    <strong className="text-gray-700"> Don't miss your chance for your life to be changed forever.</strong>
  </p>
  
  {/* CTA Button */}
  <CTAButton />
  
  {/* Scarcity text */}
  <p className="text-center text-xs text-gray-400 mt-4 italic">
    * Each reading drains Evelyn's energy. If you're reading this, you have been chosen...
  </p>
  
  {/* Trust badges */}
  <TrustBadges />
</div>
```

### Status Indicator Component (Critical Animation)

```tsx
// components/StatusIndicator.tsx

'use client'
import { useState, useEffect } from 'react'

type Status = 'busy-slow' | 'busy-fast' | 'connecting' | 'online'

export function StatusIndicator() {
  const [status, setStatus] = useState<Status>('busy-slow')
  const [text, setText] = useState('Busy')

  useEffect(() => {
    // Phase 2: Fast pulse at 2s
    const t1 = setTimeout(() => setStatus('busy-fast'), 2000)
    
    // Phase 3: Connecting at 2.5s
    const t2 = setTimeout(() => {
      setStatus('connecting')
      setText('Connecting...')
    }, 2500)
    
    // Phase 4: Online at 3s
    const t3 = setTimeout(() => {
      setStatus('online')
      setText('Online')
    }, 3000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-gray-700">Evelyn Cross is</span>
      <span className={`status-dot ${status}`} />
      <span className={status === 'online' ? 'text-green-500' : 'text-gray-500'}>
        {text}
      </span>
    </div>
  )
}
```

```css
/* Status dot animations - add to globals.css */

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* Phase 1: Slow pulse (red) */
.status-dot.busy-slow {
  background: #ef4444;
  animation: pulse-slow 1s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

/* Phase 2: Fast pulse (red) */
.status-dot.busy-fast {
  background: #ef4444;
  animation: pulse-fast 0.3s ease-in-out infinite;
}

@keyframes pulse-fast {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Phase 3: Flicker transition */
.status-dot.connecting {
  animation: flicker 0.5s ease-out forwards;
}

@keyframes flicker {
  0% { background: #ef4444; opacity: 1; }
  20% { background: #ef4444; opacity: 0.2; }
  40% { background: #fbbf24; opacity: 1; }
  60% { background: #ef4444; opacity: 0.3; }
  80% { background: #22c55e; opacity: 0.7; }
  100% { background: #22c55e; opacity: 1; }
}

/* Phase 4: Online (green with glow) */
.status-dot.online {
  background: #22c55e;
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 4px #22c55e; }
  50% { box-shadow: 0 0 8px #22c55e, 0 0 16px #22c55e; }
}
```

### CTA Button Component

```tsx
// components/CTAButton.tsx

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CTAButton() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    // Enable after status goes Online (3s)
    const timer = setTimeout(() => setEnabled(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!enabled) {
    return (
      <button 
        disabled
        className="w-full py-4 px-6 rounded-lg bg-gray-300 text-gray-500 font-semibold cursor-not-allowed"
      >
        Yes Evelyn, Please Begin My FREE Reading!
      </button>
    )
  }

  return (
    <Link href="/chat">
      <button className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 animate-cta-appear">
        Yes Evelyn, Please Begin My FREE Reading!
      </button>
    </Link>
  )
}
```

```css
/* CTA appear animation */
@keyframes cta-appear {
  0% { 
    transform: scale(0.98); 
    box-shadow: none;
  }
  50% { 
    transform: scale(1.02); 
    box-shadow: 0 0 20px rgba(124, 58, 237, 0.5);
  }
  100% { 
    transform: scale(1); 
    box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
  }
}

.animate-cta-appear {
  animation: cta-appear 0.5s ease-out forwards;
}
```

### Trust Badges Component

```tsx
// components/TrustBadges.tsx

import { Lock, Shield } from 'lucide-react'

export function TrustBadges() {
  return (
    <div className="flex justify-center gap-6 mt-6 text-xs text-gray-400">
      <div className="flex items-center gap-1">
        <Lock className="w-4 h-4" />
        <span>100% Private & Confidential</span>
      </div>
      <div className="flex items-center gap-1">
        <Shield className="w-4 h-4" />
        <span>Trusted By 1,111+ Seekers</span>
      </div>
    </div>
  )
}
```

---

## Page 2: Chat Interface

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│                   [COSMIC BACKGROUND]                          │
│                                                                │
│                    🔮 The Seer Within                       │
│                                                                │
│         ┌──────────────────────────────────────────┐           │
│         │ ┌──────────────────────────────────────┐ │           │
│         │ │  [●] Evelyn  [● Online]              │ │ ← Header  │
│         │ └──────────────────────────────────────┘ │           │
│         │                                          │           │
│         │  🔊 Turn up your volume for the best     │           │
│         │     experience.                          │           │
│         │                                          │           │
│         │  [Message bubbles here]                  │           │
│         │                                          │           │
│         │                                          │           │
│         │                                          │           │
│         │                                          │           │
│         │                                          │           │
│         │                                          │           │
│         │                                          │           │
│         ├──────────────────────────────────────────┤           │
│         │  [Input field                   ] [Send] │           │
│         └──────────────────────────────────────────┘           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Chat Container Component

```tsx
// components/ChatContainer.tsx

export function ChatContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl w-full mx-auto bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-[600px] md:h-[700px]">
      {children}
    </div>
  )
}
```

### Chat Header Component

```tsx
// components/ChatHeader.tsx

export function ChatHeader() {
  return (
    <div className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] p-4 flex items-center gap-3">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
        <img 
          src="/evelyn-avatar.jpg" 
          alt="Evelyn"
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Name & Status */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">Evelyn</span>
          <span className="bg-green-400 text-white text-xs px-2 py-0.5 rounded-full">
            Online
          </span>
        </div>
      </div>
    </div>
  )
}
```

### Chat Messages Area Component

```tsx
// components/ChatMessages.tsx

'use client'
import { useRef, useEffect } from 'react'

interface Message {
  id: string
  type: 'bot' | 'user' | 'system'
  content: string
}

export function ChatMessages({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Volume notice */}
      <p className="text-center text-gray-400 text-sm mb-4">
        🔊 Turn up your volume for the best experience.
      </p>

      {/* Messages */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      
      <div ref={bottomRef} />
    </div>
  )
}
```

### Message Bubble Component

```tsx
// components/MessageBubble.tsx

interface Message {
  id: string
  type: 'bot' | 'user' | 'system'
  content: string
}

export function MessageBubble({ message }: { message: Message }) {
  // System message (e.g., "Evelyn has joined the chat")
  if (message.type === 'system') {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="w-8 h-8 rounded-full overflow-hidden">
          <img src="/evelyn-avatar.jpg" alt="" className="w-full h-full object-cover" />
        </div>
        <span>{message.content}</span>
      </div>
    )
  }

  // User message
  if (message.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-[#7c3aed] text-white px-4 py-2 rounded-2xl rounded-br-md max-w-[80%]">
          {message.content}
        </div>
      </div>
    )
  }

  // Bot message
  return (
    <div className="flex gap-2">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        <img src="/evelyn-avatar.jpg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-bl-md max-w-[80%]">
        {message.content}
      </div>
    </div>
  )
}
```

### Typing Indicator Component

```tsx
// components/TypingIndicator.tsx

export function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        <img src="/evelyn-avatar.jpg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
        <div className="flex gap-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  )
}
```

```css
/* Typing dots animation */
.typing-dot {
  width: 8px;
  height: 8px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}
```

### Quick Reply Buttons Component

```tsx
// components/QuickReplyButtons.tsx

interface Option {
  id: string
  emoji: string
  label: string
}

const bucketOptions: Option[] = [
  { id: 'love', emoji: '💕', label: 'Love & Relationships' },
  { id: 'money', emoji: '💎', label: 'Money & Abundance' },
  { id: 'purpose', emoji: '🌟', label: 'My Life Purpose' },
  { id: 'someone', emoji: '🔮', label: 'Someone Specific' },
]

export function QuickReplyButtons({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {bucketOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => onSelect(option.id)}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#7c3aed] text-[#7c3aed] rounded-lg hover:bg-[#7c3aed] hover:text-white transition-colors duration-200"
        >
          <span>{option.emoji}</span>
          <span className="text-sm font-medium">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
```

### Chat Input Component

```tsx
// components/ChatInput.tsx

'use client'
import { useState } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder = "Type a message..." }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    if (value.trim().length < 2) return
    onSend(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Waiting for Evelyn..." : placeholder}
          className={`flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#7c3aed] ${
            disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white text-gray-800'
          }`}
        />
        <button
          onClick={handleSend}
          disabled={disabled || value.trim().length < 2}
          className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
            disabled || value.trim().length < 2
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
```

### Permission Button Component

```tsx
// components/PermissionButton.tsx

export function PermissionButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="p-4">
      <button
        onClick={onClick}
        className="w-full py-3 px-6 border-2 border-[#7c3aed] text-[#7c3aed] rounded-lg font-semibold hover:bg-[#7c3aed] hover:text-white transition-colors duration-200"
      >
        Yes, please help me Evelyn!
      </button>
    </div>
  )
}
```

### Purchase CTA Button Component

```tsx
// components/PurchaseCTA.tsx

export function PurchaseCTA({ onClick }: { onClick: () => void }) {
  return (
    <div className="p-4 space-y-3">
      <button
        onClick={onClick}
        className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
      >
        ✨ Place Your Sacred Offering — $35
      </button>
      
      {/* Trust badges */}
      <div className="flex justify-center gap-4 text-xs text-gray-400">
        <span>🔒 60-Day Guarantee</span>
        <span>•</span>
        <span>100% Secure</span>
      </div>
    </div>
  )
}
```

---

## Mock Data for Demo

```tsx
// lib/mockData.ts

export const mockMessages = [
  { id: '1', type: 'system', content: 'Evelyn has joined the chat' },
  { id: '2', type: 'bot', content: 'Greetings, dear friend, and welcome.' },
  { id: '3', type: 'bot', content: 'My name is Evelyn Cross.' },
  { id: '4', type: 'bot', content: "I've been expecting you..." },
  { id: '5', type: 'bot', content: 'From Singapore, I can feel your energy reaching me across the distance...' },
  { id: '6', type: 'bot', content: "To open the connection between us, I need to know who I'm speaking with..." },
  { id: '7', type: 'bot', content: "What's your first name, dear?" },
  { id: '8', type: 'user', content: 'Joel' },
  { id: '9', type: 'bot', content: "It's lovely to meet you, Joel." },
  { id: '10', type: 'bot', content: 'Everything we discuss stays between us... our secret.' },
  { id: '11', type: 'bot', content: "Now, what's weighing on your heart today, dear?" },
  // Bucket selection happens here
  { id: '12', type: 'user', content: '💕 Love & Relationships' },
  { id: '13', type: 'bot', content: 'I can feel warmth radiating from your heart, Joel...' },
  { id: '14', type: 'bot', content: 'But there\'s a flicker of shadow there too...' },
  { id: '15', type: 'bot', content: "Tell me what's on your mind, dear. Your thoughts, your feelings... I'm listening." },
]

export const mockMessagesWithPitch = [
  ...mockMessages.slice(0, 15),
  { id: '16', type: 'user', content: "I've been single for 2 years and I'm starting to lose hope" },
  { id: '17', type: 'bot', content: 'Two years... I can feel that weight, Joel.' },
  { id: '18', type: 'bot', content: "You've been strong, but there's an ache beneath the surface..." },
  { id: '19', type: 'bot', content: 'But... hold on...' },
  { id: '20', type: 'bot', content: "Something's shifting." },
  { id: '21', type: 'bot', content: "There's a shadow pressing against your heart's energy..." },
  { id: '22', type: 'bot', content: 'Joel, I know exactly what needs to be done...' },
  { id: '23', type: 'bot', content: 'But I need your permission before I can begin.' },
  // Permission button appears here
]
```

---

## Complete Page Files

### app/page.tsx (Landing Page)

```tsx
import { CosmicBackground } from '@/components/CosmicBackground'
import { Logo } from '@/components/Logo'
import { LandingCard } from '@/components/LandingCard'

export default function Home() {
  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />
      
      <div className="relative z-10 flex flex-col items-center gap-8">
        <Logo />
        <LandingCard />
      </div>
    </main>
  )
}
```

### app/chat/page.tsx (Chat Interface)

```tsx
'use client'
import { useState } from 'react'
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
import { mockMessages } from '@/lib/mockData'

export default function ChatPage() {
  const [messages, setMessages] = useState(mockMessages)
  const [showBuckets, setShowBuckets] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(false)
  const [showPermission, setShowPermission] = useState(false)
  const [showPurchase, setShowPurchase] = useState(false)

  // For demo purposes - toggle different states with buttons
  // In production, this would be controlled by conversation logic

  return (
    <main className="min-h-screen relative flex flex-col items-center p-4 py-8">
      <CosmicBackground />
      
      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        <Logo />
        
        <ChatContainer>
          <ChatHeader />
          
          <ChatMessages messages={messages} />
          
          {showTyping && <div className="px-4 pb-4"><TypingIndicator /></div>}
          
          {showBuckets && (
            <QuickReplyButtons onSelect={(id) => console.log('Selected:', id)} />
          )}
          
          {showPermission && (
            <PermissionButton onClick={() => setShowPurchase(true)} />
          )}
          
          {showPurchase && (
            <PurchaseCTA onClick={() => console.log('Purchase clicked')} />
          )}
          
          {!showBuckets && !showPermission && !showPurchase && (
            <ChatInput 
              onSend={(msg) => console.log('Sent:', msg)}
              disabled={inputDisabled}
            />
          )}
        </ChatContainer>

        {/* Demo controls - remove in production */}
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={() => setShowTyping(!showTyping)} className="px-3 py-1 bg-white/20 text-white rounded text-sm">
            Toggle Typing
          </button>
          <button onClick={() => setShowBuckets(!showBuckets)} className="px-3 py-1 bg-white/20 text-white rounded text-sm">
            Toggle Buckets
          </button>
          <button onClick={() => setShowPermission(!showPermission)} className="px-3 py-1 bg-white/20 text-white rounded text-sm">
            Toggle Permission
          </button>
          <button onClick={() => setShowPurchase(!showPurchase)} className="px-3 py-1 bg-white/20 text-white rounded text-sm">
            Toggle Purchase
          </button>
          <button onClick={() => setInputDisabled(!inputDisabled)} className="px-3 py-1 bg-white/20 text-white rounded text-sm">
            Toggle Input Disabled
          </button>
        </div>
      </div>
    </main>
  )
}
```

---

## Global Styles (globals.css)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-inter: 'Inter', sans-serif;
  --font-playfair: 'Playfair Display', serif;
}

body {
  font-family: var(--font-inter);
}

.font-playfair {
  font-family: var(--font-playfair);
}

/* Stars animation */
.stars {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(2px 2px at 20px 30px, white, transparent),
    radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 90px 40px, white, transparent),
    radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent),
    radial-gradient(1px 1px at 230px 80px, white, transparent),
    radial-gradient(2px 2px at 300px 150px, rgba(255,255,255,0.7), transparent),
    radial-gradient(1px 1px at 370px 50px, white, transparent),
    radial-gradient(2px 2px at 450px 180px, rgba(255,255,255,0.8), transparent);
  background-size: 500px 300px;
  animation: twinkle 5s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Status dot animations */
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.busy-slow {
  background: #ef4444;
  animation: pulse-slow 1s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.status-dot.busy-fast {
  background: #ef4444;
  animation: pulse-fast 0.3s ease-in-out infinite;
}

@keyframes pulse-fast {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.status-dot.connecting {
  animation: flicker 0.5s ease-out forwards;
}

@keyframes flicker {
  0% { background: #ef4444; opacity: 1; }
  20% { background: #ef4444; opacity: 0.2; }
  40% { background: #fbbf24; opacity: 1; }
  60% { background: #ef4444; opacity: 0.3; }
  80% { background: #22c55e; opacity: 0.7; }
  100% { background: #22c55e; opacity: 1; }
}

.status-dot.online {
  background: #22c55e;
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 4px #22c55e; }
  50% { box-shadow: 0 0 8px #22c55e, 0 0 16px #22c55e; }
}

/* Typing dots animation */
.typing-dot {
  width: 8px;
  height: 8px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

/* CTA appear animation */
@keyframes cta-appear {
  0% { 
    transform: scale(0.98); 
    box-shadow: none;
  }
  50% { 
    transform: scale(1.02); 
    box-shadow: 0 0 20px rgba(124, 58, 237, 0.5);
  }
  100% { 
    transform: scale(1); 
    box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
  }
}

.animate-cta-appear {
  animation: cta-appear 0.5s ease-out forwards;
}
```

---

## Tailwind Config

```js
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          DEFAULT: '#7c3aed',
          dark: '#6d28d9',
        },
        gold: '#d4af37',
      },
      fontFamily: {
        playfair: ['Playfair Display', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

---

## Avatar Placeholder

Until you generate the AI face, use a placeholder:

```
/public/evelyn-avatar.jpg

Use any stock photo of a warm, wise-looking woman in her 50s-60s
with silver/gray hair. Or use a placeholder service:

https://ui-avatars.com/api/?name=Evelyn+Cross&background=7c3aed&color=fff&size=200
```

---

## File Structure

```
/app
  /page.tsx                 ← Landing page
  /chat/page.tsx            ← Chat interface
  /globals.css              ← Global styles + animations
  /layout.tsx               ← Root layout

/components
  /CosmicBackground.tsx
  /Logo.tsx
  /LandingCard.tsx
  /StatusIndicator.tsx
  /CTAButton.tsx
  /TrustBadges.tsx
  /ChatContainer.tsx
  /ChatHeader.tsx
  /ChatMessages.tsx
  /MessageBubble.tsx
  /TypingIndicator.tsx
  /QuickReplyButtons.tsx
  /ChatInput.tsx
  /PermissionButton.tsx
  /PurchaseCTA.tsx

/lib
  /mockData.ts              ← Mock conversation data

/public
  /evelyn-avatar.jpg        ← Avatar image

tailwind.config.js
```

---

## Instructions for Replit AI

1. Create a new Next.js project with Tailwind CSS
2. Build each component as specified above
3. Add all CSS animations to globals.css
4. Create both pages (landing and chat)
5. Include demo toggle buttons on chat page to test different states
6. Make it fully responsive (mobile-first)
7. Use placeholder avatar until real one is provided

---

## What This Does NOT Include (For Later)

- ❌ Claude API integration
- ❌ Conversation state machine logic
- ❌ IP geolocation detection
- ❌ Stripe checkout
- ❌ Email capture backend
- ❌ Background music
- ❌ Actual typing simulation timing

These will be added in Claude Code/Cursor after the design is approved.

---

*Paste this entire document into Replit AI and say: "Build this UI exactly as specified."*
