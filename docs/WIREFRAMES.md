# Wireframes & UI Specification
# The Seer Within

## Design System

### Color Palette
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| Background | Purple-950 gradient | Purple-950 gradient | Page backgrounds |
| Card | Purple-900/50 | Purple-900/50 | Chat bubbles, cards |
| Primary | Gold/Amber-500 | Gold/Amber-400 | CTAs, accents |
| Text Primary | White | White | Headings, important text |
| Text Secondary | Purple-200/300 | Purple-200/300 | Body text |
| Accent | Indigo-500 | Indigo-400 | Links, highlights |

### Typography
| Element | Font | Size | Weight |
|---------|------|------|--------|
| Logo | Playfair Display | 2rem | 700 |
| H1 | Playfair Display | 2.5rem | 700 |
| H2 | Playfair Display | 1.5rem | 600 |
| Body | Inter | 1rem | 400 |
| Button | Inter | 1rem | 500 |

### Spacing
- Container max-width: 48rem (chat), 64rem (landing)
- Section padding: 2rem (mobile), 4rem (desktop)
- Card padding: 1.5rem
- Element gap: 1rem

---

## Page Wireframes

### 1. Landing Page (`/`)

```
┌──────────────────────────────────────────────────────────────┐
│                        HEADER                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [Logo: The Seer Within]              [Privacy] [Terms] │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                      HERO SECTION                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │           [Mystical Background Image/Gradient]          │ │
│  │                                                         │ │
│  │              "Discover What the Universe                │ │
│  │               Has in Store for You"                     │ │
│  │                                                         │ │
│  │         "Receive a personalized psychic reading         │ │
│  │          from Evelyn Cross, trusted by thousands"       │ │
│  │                                                         │ │
│  │              ┌─────────────────────────┐                │ │
│  │              │   Begin Your Free       │                │ │
│  │              │      Reading →          │                │ │
│  │              └─────────────────────────┘                │ │
│  │                   [Gold CTA Button]                     │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                     TRUST SECTION                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │   [Star Icon]        [Heart Icon]       [Shield Icon]   │ │
│  │   "10,000+"          "98% Accuracy"     "100% Private"  │ │
│  │   Readings           Rating             & Secure        │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                        FOOTER                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  © 2026 Cosmo Numerology Pte Ltd                        │ │
│  │  Privacy Policy | Terms of Service | Refund Policy      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

### 2. Chat Page (`/chat`)

```
┌──────────────────────────────────────────────────────────────┐
│                        CHAT HEADER                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [← Back]     The Seer Within          [Evelyn Avatar]  │ │
│  │               "Evelyn is typing..."                     │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                      CHAT MESSAGES                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────┐                   │ │
│  │  │ [Avatar] Evelyn                  │                   │ │
│  │  │ "Welcome, dear one. I've been    │                   │ │
│  │  │ waiting for you. The universe    │                   │ │
│  │  │ guided you here for a reason..." │                   │ │
│  │  └──────────────────────────────────┘                   │ │
│  │                                                         │ │
│  │                   ┌──────────────────────────────────┐  │ │
│  │                   │                     User Message │  │ │
│  │                   │               "My name is Sarah" │  │ │
│  │                   └──────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────┐                   │ │
│  │  │ [Avatar] Evelyn                  │                   │ │
│  │  │ "Sarah... what a beautiful name. │                   │ │
│  │  │ I sense a strong energy around   │                   │ │
│  │  │ you. What brings you to me?"     │                   │ │
│  │  └──────────────────────────────────┘                   │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                    BUCKET SELECTION                          │
│  (Shown when in bucket_selection phase)                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  ┌─────────────┐ ┌─────────────┐                        │ │
│  │  │   ❤️ Love   │ │  💰 Money   │                        │ │
│  │  │ & Relation- │ │  & Career   │                        │ │
│  │  │    ships    │ │             │                        │ │
│  │  └─────────────┘ └─────────────┘                        │ │
│  │                                                         │ │
│  │  ┌─────────────┐ ┌─────────────┐                        │ │
│  │  │  ✨ Life    │ │  👤 Someone │                        │ │
│  │  │   Purpose   │ │  Specific   │                        │ │
│  │  │             │ │             │                        │ │
│  │  └─────────────┘ └─────────────┘                        │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                      INPUT AREA                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ┌───────────────────────────────────────┐ ┌──────────┐ │ │
│  │  │  Type your message...                 │ │  Send →  │ │ │
│  │  └───────────────────────────────────────┘ └──────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

### 3. Email Capture (Inline in Chat)

Email is collected naturally within the conversation flow, not as a modal.

```
┌──────────────────────────────────────────────────────────────┐
│                        CHAT MESSAGES                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────┐                   │ │
│  │  │ [Avatar] Evelyn                  │                   │ │
│  │  │ "Sarah, I'm sensing something    │                   │ │
│  │  │ powerful here. I'd like to       │                   │ │
│  │  │ prepare a deeper reading for     │                   │ │
│  │  │ you. What's your email so I      │                   │ │
│  │  │ can send it to you?"             │                   │ │
│  │  └──────────────────────────────────┘                   │ │
│  │                                                         │ │
│  │                   ┌──────────────────────────────────┐  │ │
│  │                   │               sarah@email.com   │  │ │
│  │                   └──────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────┐                   │ │
│  │  │ [Avatar] Evelyn                  │                   │ │
│  │  │ "Perfect, thank you dear. Now,   │                   │ │
│  │  │ let me look deeper into what     │                   │ │
│  │  │ the universe is revealing..."    │                   │ │
│  │  └──────────────────────────────────┘                   │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                      INPUT AREA                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ┌───────────────────────────────────────┐ ┌──────────┐ │ │
│  │  │  Type your email...                   │ │  Send →  │ │ │
│  │  └───────────────────────────────────────┘ └──────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

Note: The input field may show email-specific placeholder text 
during the email_capture phase. Email is validated before proceeding.
```

---

### 4. Purchase CTA (In Chat)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  [Avatar] Evelyn                                        │ │
│  │  "I see something blocking your path, dear Sarah.       │ │
│  │  This energy block is preventing your desires from      │ │
│  │  manifesting. I can help you clear it..."              │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    OFFER CARD                           │ │
│  │  ┌───────────────────────────────────────────────────┐  │ │
│  │  │                                                   │  │ │
│  │  │          🌟 Deep Personal Reading 🌟              │  │ │
│  │  │                                                   │  │ │
│  │  │   • Complete energy analysis                      │  │ │
│  │  │   • Block removal guidance                        │  │ │
│  │  │   • 12-month forecast                             │  │ │
│  │  │   • Personal mantras                              │  │ │
│  │  │                                                   │  │ │
│  │  │          ~~$97~~ → $35 (Limited Time)            │  │ │
│  │  │                                                   │  │ │
│  │  │   ┌─────────────────────────────────────────┐    │  │ │
│  │  │   │      Get My Reading Now →               │    │  │ │
│  │  │   └─────────────────────────────────────────┘    │  │ │
│  │  │                                                   │  │ │
│  │  │   [30-Day Money Back Guarantee]                   │  │ │
│  │  │                                                   │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 5. Upsell Flow (Chat-Based, `/upsell`)

The upsell is presented within the chat interface after initial purchase.

```
┌──────────────────────────────────────────────────────────────┐
│                        CHAT HEADER                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [← Back]     The Seer Within          [Evelyn Avatar]  │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                      CHAT MESSAGES                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────┐                   │ │
│  │  │ [Avatar] Evelyn                  │                   │ │
│  │  │ "Sarah, before I prepare your    │                   │ │
│  │  │ reading, there's something       │                   │ │
│  │  │ important I must share..."       │                   │ │
│  │  └──────────────────────────────────┘                   │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────┐                   │ │
│  │  │ [Avatar] Evelyn                  │                   │ │
│  │  │ "I sense a dark energy that has  │                   │ │
│  │  │ attached itself to you. This     │                   │ │
│  │  │ protection stone can shield you  │                   │ │
│  │  │ and amplify your manifestation   │                   │ │
│  │  │ power..."                        │                   │ │
│  │  └──────────────────────────────────┘                   │ │
│  │                                                         │ │
│  │  ┌───────────────────────────────────────────────────┐  │ │
│  │  │              PRODUCT CARD (in chat)               │  │ │
│  │  │  ┌─────────────────────────────────────────────┐  │  │ │
│  │  │  │       [Product Image: Volcanic Stone]       │  │  │ │
│  │  │  └─────────────────────────────────────────────┘  │  │ │
│  │  │                                                   │  │ │
│  │  │        Protection Ritual + Volcanic Stone         │  │ │
│  │  │                                                   │  │ │
│  │  │   - Energetically charged for you personally     │  │ │
│  │  │   - Includes ritual instructions                  │  │ │
│  │  │   - Free worldwide shipping                       │  │ │
│  │  │                                                   │  │ │
│  │  │              Only $47 (One-Time)                  │  │ │
│  │  │                                                   │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│               SHIPPING FORM (Expandable Section)             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │   Where should we ship your stone?                      │ │
│  │                                                         │ │
│  │   ┌─────────────────────────────────────────────┐      │ │
│  │   │  Full Name                                  │      │ │
│  │   └─────────────────────────────────────────────┘      │ │
│  │   ┌─────────────────────────────────────────────┐      │ │
│  │   │  Address Line 1                             │      │ │
│  │   └─────────────────────────────────────────────┘      │ │
│  │   ┌──────────────┐ ┌────────┐ ┌──────────────┐         │ │
│  │   │  City        │ │ State  │ │  Postal Code │         │ │
│  │   └──────────────┘ └────────┘ └──────────────┘         │ │
│  │   ┌─────────────────────────────────────────────┐      │ │
│  │   │  Country                               [▼] │      │ │
│  │   └─────────────────────────────────────────────┘      │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                     CTA BUTTONS                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │   ┌─────────────────────────────────────────────┐      │ │
│  │   │   Yes! Protect My Energy ($47) →            │      │ │
│  │   └─────────────────────────────────────────────┘      │ │
│  │                   [Gold Primary Button]                 │ │
│  │           (1-click charge or fallback checkout)         │ │
│  │                                                         │ │
│  │         [No thanks, just send my reading →]            │ │
│  │                   (Ghost/Link style)                    │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 6. Success Page (`/success`)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                     ORDER CONFIRMED                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │                    ✓ [Checkmark Icon]                   │ │
│  │                                                         │ │
│  │              "Thank you, Sarah!"                        │ │
│  │                                                         │ │
│  │         Your order has been confirmed.                  │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                    ORDER SUMMARY                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │   ┌───────────────────────────────────────────────┐    │ │
│  │   │  ORDER DETAILS                                │    │ │
│  │   │                                               │    │ │
│  │   │  Deep Personal Reading ............... $35.00 │    │ │
│  │   │  Protection Stone (if purchased) ..... $47.00 │    │ │
│  │   │  ───────────────────────────────────────────  │    │ │
│  │   │  Total ................................ $82.00 │    │ │
│  │   │                                               │    │ │
│  │   └───────────────────────────────────────────────┘    │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                    WHAT'S NEXT                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │   📧 Check your email for your reading                  │ │
│  │      (within 24 hours)                                  │ │
│  │                                                         │ │
│  │   📦 Your stone will ship within 3-5 business days     │ │
│  │      Tracking will be sent to your email               │ │
│  │                                                         │ │
│  │   ❓ Questions? Contact support@cosmonumerology.com     │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│         ┌─────────────────────────────────────────┐         │
│         │        Return to Home →                 │         │
│         └─────────────────────────────────────────┘         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Chat Bubble - Evelyn
```
┌───────────────────────────────────────┐
│ [40px Avatar]  Evelyn                 │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  Message content goes here...   │  │
│  │  Can be multiple lines.         │  │
│  └─────────────────────────────────┘  │
│         ↑                             │
│  Background: purple-900/60            │
│  Border-radius: 1rem                  │
│  Padding: 1rem 1.25rem                │
│  Max-width: 80%                       │
└───────────────────────────────────────┘
```

### Chat Bubble - User
```
┌───────────────────────────────────────┐
│                                       │
│  ┌─────────────────────────────────┐  │
│  │   User message goes here...    │  │
│  └─────────────────────────────────┘  │
│         ↑                             │
│  Background: indigo-600/80            │
│  Border-radius: 1rem                  │
│  Padding: 0.75rem 1rem                │
│  Max-width: 70%                       │
│  Align: right                         │
└───────────────────────────────────────┘
```

### Primary CTA Button
```
┌─────────────────────────────────────────┐
│                                         │
│         Button Text →                   │
│                                         │
└─────────────────────────────────────────┘
Background: gradient gold/amber
Text: White
Padding: 1rem 2rem
Border-radius: 0.5rem
Font-weight: 600
Hover: Scale 1.02, brightness increase
```

### Input Field
```
┌─────────────────────────────────────────┐
│  Placeholder text...                    │
└─────────────────────────────────────────┘
Background: white/10
Border: 1px white/20
Border-radius: 0.5rem
Padding: 0.75rem 1rem
Text: white
Focus: ring-2 ring-purple-400
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, full-width buttons, stacked elements |
| Tablet | 640-1024px | Moderate spacing, side-by-side elements where space allows |
| Desktop | > 1024px | Max-width containers, generous spacing |

---

## Animation & Micro-interactions

### Typing Indicator
- Three dots pulsing animation
- Shown while waiting for AI response
- Duration: until response received

### Message Appearance
- Fade in + slide up
- Duration: 200ms
- Easing: ease-out

### Button Hover
- Scale: 1.02
- Brightness: +5%
- Transition: 150ms

### Loading States
- Skeleton placeholders for content
- Spinner for button loading states
- Subtle pulse animation for waiting states
