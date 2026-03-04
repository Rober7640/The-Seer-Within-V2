# Upsell 1 — Complete Prompt Flow Structure

## Overview

- **Product:** Protection Ritual + Charged Volcanic Lava Stone
- **Price:** $47 (one-time)
- **Trigger:** User redirected here after completing the main $35 purchase
- **Payment:** 1-click charge (reuses payment method from main purchase), with fallback to new Stripe checkout
- **Total messages:** ~55-60 bot messages depending on user responses
- **Interactive points:** 3 questions with quick replies + free text input
- **Personalization:** `{firstName}` and `{personName}` replaced throughout

---

## Stage 1: CONFIRMATION (3 messages, auto-advance)

```
Bot: "It's done, {firstName}. Your Sacred Clearing Ritual has been scheduled."
Bot: "I'll begin the work tonight, and your reading will arrive within 24 hours."
Bot: "But before I let you go... there's something I need to tell you."
```

---

## Stage 2: GAP CREATION (4 messages, auto-advance)

```
Bot: "The clearing I'm about to perform will remove the block from your energy field."
Bot: "But here's what most people don't understand, {firstName}..."
Bot: "Removal is only half the work."
Bot: "For the next 30 days, your energy field will be rebuilding — open, raw, like a wound healing."
```

---

## Stage 3: RISK (5 messages, auto-advance)

```
Bot: "During this window, you're actually MORE vulnerable than before."
Bot: "This is when old shadows try to return."
Bot: "Or worse — new ones try to attach, sensing the opening."
Bot: "I've seen it happen too many times, {firstName}."
Bot: "Someone clears a block, feels amazing for a few weeks... then it slowly creeps back."
```

---

## Stage 4: QUESTION 1 (interactive — waits for response)

```
Bot: "Tell me honestly... have you ever cleared something — a habit, a pattern, a feeling — only to watch it return weeks later?"

Quick Replies:
  [Yes, that's happened to me]  [I think so, yes]  [I'm not sure]
  (or free text input)
```

**Intent detection:** matches user text to `yes`, `maybe`, `unsure`, or `default`

---

## Stage 5: AFTER Q1 (2-3 messages based on response, auto-advance)

### If "yes":
```
Bot: "I felt that in your energy even before you said it."
Bot: "That pattern of return — it's not your fault. It's what happens when we clear without protecting."
Bot: "I don't want that for you this time, {firstName}."
```

### If "maybe":
```
Bot: "Most people don't recognize it until they look back."
Bot: "A diet that worked then didn't. A decision that felt right then wavered."
Bot: "That's the pattern I want to break for you."
```

### If "unsure":
```
Bot: "It's subtle. Sometimes we don't notice until months later."
Bot: "Either way, I want to make sure it doesn't happen this time."
Bot: "What we're clearing is too important to risk."
```

### If "default" (unrecognized input):
```
Bot: "I can sense you understand what I mean."
Bot: "That cycle of clearing and returning — it ends now."
Bot: "I'm going to make sure of it."
```

---

## Stage 6: SOLUTION (3 messages, auto-advance)

```
Bot: "That's why I offer a second ritual — a Protection Ritual."
Bot: "It creates an energetic shield around you while your field rebuilds."
Bot: "And I anchor that shield to something physical... so it stays with you always."
```

---

## Stage 7: LAVA INTRO (5 messages + product image, auto-advance)

```
Bot: "For your protection, I use volcanic lava stone."
Bot: "It's not a random choice, {firstName}."
Bot: "Lava is born from the Earth's core — where creation and destruction meet."
Bot: "When a volcano erupts, it destroys the old and creates new land. That's exactly what's happening in your energy right now."
Bot: "The stone is porous — it literally absorbs negative energy before it can reach you."

[Lava Stone Image displayed]
```

---

## Stage 8: QUESTION 2 (interactive — waits for response)

```
Bot: "Transformation through fire... destruction of the old to create the new. Can you feel why this stone is meant for you right now, {firstName}?"

Quick Replies:
  [Yes, I can feel it]  [I think I understand]  [Tell me more]
  (or free text input)
```

**Intent detection:** matches to `yes`, `understand`, `more`, or `default`

---

## Stage 9: AFTER Q2 (2 messages based on response, auto-advance)

### If "yes":
```
Bot: "I knew you would. Your energy recognized it immediately."
Bot: "This stone has been waiting for someone like you."
```

### If "understand":
```
Bot: "Good. The understanding will deepen once you hold it in your hands."
Bot: "Some connections become clear only through touch."
```

### If "more":
```
Bot: "Of course. Let me show you exactly what I'll do with it."
Bot: "The ritual itself is where the real power lies."
```

### If "default":
```
Bot: "The connection between you and this stone — it's already forming."
Bot: "Let me tell you how I'll seal it."
```

---

## Stage 10: RITUAL (8 messages, auto-advance)

```
Bot: "Here's exactly what I'll do for you, {firstName}..."
Bot: "Tonight, between 2 and 4am — when the veil between worlds is thinnest — I'll begin."
Bot: "I'll place your stone on my altar, beside a white candle and a vessel of blessed water."
Bot: "Using the energy signature from our conversation, I'll call your spirit forward."
Bot: "Then I'll speak the protection invocation — words passed down through my grandmother's line."
Bot: "I'll circle your stone with sage smoke seven times, sealing your frequency into it."
Bot: "The ritual takes about two hours. It drains me... but for those who are ready, it's necessary work."
Bot: "When I'm done, I'll place your stone under moonlight until dawn to lock the charge."
```

---

## Stage 11: FEEL (4 messages, auto-advance)

```
Bot: "You may feel something tonight, {firstName}."
Bot: "Warmth spreading through your chest. Dreams more vivid than usual."
Bot: "A sense of being watched over — protected."
Bot: "That's me, working on your energy from a distance. Don't be alarmed. It means the connection is strong."
```

---

## Stage 12: QUESTION 3 (interactive — waits for response)

```
Bot: "I'm prepared to do this work for you tonight, {firstName}. Are you ready to be protected?"

Quick Replies:
  [Yes, I'm ready]  [I think so]  [What exactly will I receive?]
  (or free text input)
```

**Intent detection:** matches to `yes`, `maybe`, `what`, or `default`

---

## Stage 13: AFTER Q3 (1-2 messages based on response, auto-advance)

### If "yes":
```
Bot: "I can feel your readiness. It's strong."
Bot: "Let me tell you exactly what happens after the ritual..."
```

### If "maybe":
```
Bot: "That hesitation is natural. You've been let down before."
Bot: "But your soul wouldn't have brought you this far if you weren't meant to continue."
```

### If "what":
```
Bot: "A fair question. Let me be completely clear about what you'll receive."
```

### If "default":
```
Bot: "Let me tell you exactly what you'll receive..."
```

---

## Stage 14: BUCKET-SPECIFIC (3-4 messages based on user's topic, auto-advance)

### If bucket = "love":
```
Bot: "Once your stone is charged, it will guard your heart while it heals and opens to love."
Bot: "Wear it on your LEFT wrist — your receiving hand."
Bot: "In energy work, the left side receives. Everything coming toward you — every person, every intention — passes through that hand first."
Bot: "The stone intercepts what shouldn't reach your heart. It filters. The wrong ones won't get through."
```

### If bucket = "money":
```
Bot: "Once charged, your stone will protect your abundance field."
Bot: "Wear it on your LEFT wrist — your receiving hand."
Bot: "Money is energy that flows TO you before you send it out. The left hand is where opportunity enters."
Bot: "The stone absorbs scarcity thoughts and blocks before they can settle into your field. Abundance flows cleaner."
```

### If bucket = "purpose":
```
Bot: "Once charged, your stone will anchor your emerging purpose."
Bot: "Wear it on your LEFT wrist — your receiving hand."
Bot: "Clarity, guidance, signs from the universe — they enter through the left side. That's where intuition lives."
Bot: "The stone filters the noise. When confusion tries to reach you, it gets absorbed before it clouds your path."
```

### If bucket = "someone":
```
Bot: "Once charged, your stone will clarify the connection between you and {personName}."
Bot: "Wear it on your LEFT wrist — your receiving hand."
Bot: "Their energy, their thoughts about you, their intentions — it all flows toward your left side first."
Bot: "The stone filters what reaches you. Truth passes through. Confusion, mixed signals, interference — absorbed before it can twist your perception."
```

---

## Stage 15: DELIVERY (5 messages, auto-advance)

```
Bot: "Once the ritual is complete, I'll ship your charged stone directly to you."
Bot: "It arrives in a protective velvet pouch with a card explaining how to activate it."
Bot: "When you receive it, hold it in both hands, close your eyes, and say: 'I am protected. I am transforming.'"
Bot: "That phrase activates the bond between you and the stone."
Bot: "The protection holds strong for at least 30 days — longer for most people. Long enough for your energy field to fully heal."
```

---

## Stage 16: OFFER (4 messages + CTA buttons)

```
Bot: "The Protection Ritual is $47, {firstName}."
Bot: "That includes the charged volcanic stone shipped directly to your door."
Bot: "Most of my serious clients do both rituals together — clearing AND protection. It's the complete work."
Bot: "Shall I add your protection to tonight's ritual?"

(2 second pause, then CTA buttons appear)

  [Yes, Protect What We Clear — $47 One-Time]
  "Not right now" (decline link)
```

---

## If ACCEPTED: SUCCESS (5 messages + shipping form)

```
Bot: "Beautiful choice, {firstName}."
Bot: "Both rituals are now confirmed — clearing AND protection."
Bot: "I'll perform them together tonight. The work will be deeper this way."
Bot: "Your charged volcanic stone will ship within 48 hours."
Bot: "I just need to know where to send it."

[Shipping Form appears: Name, Address, City, State, ZIP, Country]
```

---

## After Shipping Submitted: COMPLETE (7 messages)

```
Bot: "Perfect. Your protection stone is on its way, {firstName}."
Bot: "Remember — when it arrives, hold it and say: 'I am protected. I am transforming.'"
Bot: "That seals the bond."
Bot: "Tonight, as I work, you may feel warmth or have vivid dreams. That's normal. That's me."
Bot: "Watch your inbox — your clearing reading arrives within 24 hours."
Bot: "Thank you for trusting me with this sacred work, {firstName}."
Bot: "The universe is already responding to your decision. I can feel it shifting."
```

---

## If DECLINED: SOFT EXIT (6 messages)

```
Bot: "I understand, {firstName}. It's your journey to walk."
Bot: "Just... be mindful over the next 30 days."
Bot: "If you feel the old heaviness returning, or patterns creeping back in, know that I'm here."
Bot: "The protection ritual is always available if you change your mind."
Bot: "For now, watch your inbox. Your clearing reading will arrive within 24 hours."
Bot: "Take care of yourself, dear. I'll be thinking of you tonight during the work."
```

---

## Payment Flow

1. **1-click charge (preferred):** Reuses the payment method from the main $35 purchase via Stripe PaymentIntents API
2. **Fallback checkout:** If 1-click fails, creates a new Stripe checkout session at $47 with shipping collection
3. **Database tracking:** Records `upsellPurchased`, `upsellPaymentId`, `upsellAmount`, and shipping address

---

## Wireframe

```
┌──────────────────────────────────────┐
│  The Seer Within (header)            │
├──────────────────────────────────────┤
│                                      │
│  [Bot avatar] Bot message            │
│  [Bot avatar] Bot message            │
│  [Bot avatar] Bot message            │
│                                      │
│              User reply [User avatar]│
│                                      │
│  [Bot avatar] Bot message            │
│  [Bot avatar] Bot message            │
│                                      │
│  ┌── Lava Stone Image ──┐           │
│  │    (product photo)    │           │
│  └───────────────────────┘           │
│                                      │
│  [Bot avatar] Offer: $47            │
│                                      │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │  Yes, Protect What We Clear   │  │  <- Accept button
│  │        ($47 one-time)         │  │
│  └────────────────────────────────┘  │
│                                      │
│  "Not right now"  (decline link)     │
├──────────────────────────────────────┤
│  [Or type your response...]  [Send]  │  <- Text input (at question stages)
└──────────────────────────────────────┘

── After Accept & Payment Success ──

┌──────────────────────────────────────┐
│  Shipping Address Form               │
│  ┌──────────────────────────────┐    │
│  │ Full Name: [_______________] │    │
│  │ Address:   [_______________] │    │
│  │ City:      [_______________] │    │
│  │ State:     [_______________] │    │
│  │ ZIP:       [_______________] │    │
│  │ Country:   [US            ] │    │
│  └──────────────────────────────┘    │
│  [Ship My Protection Stone]          │
└──────────────────────────────────────┘
```

---

## Stage Flow Diagram

```
CONFIRMATION → GAP → RISK → QUESTION_1 → WAITING_Q1
                                              │
                                        (user responds)
                                              │
                                          AFTER_Q1 → SOLUTION → LAVA_INTRO → QUESTION_2 → WAITING_Q2
                                                                                              │
                                                                                        (user responds)
                                                                                              │
                                                                                          AFTER_Q2 → RITUAL → FEEL → QUESTION_3 → WAITING_Q3
                                                                                                                                       │
                                                                                                                                 (user responds)
                                                                                                                                       │
                                                                                                                                   AFTER_Q3 → BUCKET → DELIVERY → OFFER → CTA
                                                                                                                                                                           │
                                                                                                                                                              ┌─────────────┴─────────────┐
                                                                                                                                                              │                           │
                                                                                                                                                          [Accept]                   [Decline]
                                                                                                                                                              │                           │
                                                                                                                                                        SUCCESS → SHIPPING          SOFT EXIT
                                                                                                                                                              │
                                                                                                                                                        COMPLETE
```
