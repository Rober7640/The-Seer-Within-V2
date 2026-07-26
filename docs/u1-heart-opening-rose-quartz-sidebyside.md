# U1 Re-Theme — Side-by-Side: Protection/Lava → Heart-Opening/Rose Quartz

**Status:** DRAFT for review. Nothing in the live app has changed. This document is the
proposed replacement copy for `client/src/lib/upsellMessages.ts`, shown BEFORE → AFTER.

**Why:** ~100% of paid traffic is LOVE-intent. The current U1 sells *protection* (fear-frame)
to *hope-frame* buyers — a motivation mismatch. This re-themes U1 onto a love-congruent
"clear → open → let love in" arc, keeping protection's loss-aversion pull *without* claiming
protection.

## What does NOT change
- The 20-stage state machine, all 3 interactive questions, auto-advance timing, accept/decline/
  shipping branches, the bucket fork, and the `{firstName} / {personName} / {upsellPrice}` tokens.
- The intent-reply **value keys** (`yes` / `maybe` / `unsure` / `understand` / `more` / `what` /
  `default`) — so every `AFTER_Q*` branch map still resolves. Only the displayed reply *labels*
  and the question text change.

## Implementation note (for A/B)
To keep the lava offer as a **control**, the AFTER copy below ships in a parallel module
(`upsellMessagesRose.ts`) exporting the **same constant names**. `useUpsellChat` selects the
module by the variant's `upsell1Theme` (`'lava' | 'rose'`). The live `upsellMessages.ts` (lava)
is left byte-for-byte intact.

## Compliance guardrails applied
- Rose quartz = the buyer's **own** openness/readiness. Allowed: "open / soften / call love in."
  Forbidden: "your soulmate will come," "your ex will return," any guaranteed outcome.
- The `someone` bucket is reframed as the buyer's **clarity and open-heartedness toward**
  `{personName}` — never "{personName} comes back."
- No timelines, no promises, no "will" statements about other people's behavior.

---

## SECTION 1 — CONFIRMATION (3 msgs) · *unchanged*
Refers to the FE clearing, not the offer. No edit.

```
"It's done, {firstName}. Your Energy Clearing Ritual has been scheduled."
"I'll begin the work tonight, and your reading will arrive within 24 hours."
"But before I let you go... there's something I need to tell you."
```

---

## SECTION 2 — GAP (4 msgs)

**BEFORE**
```
"The clearing I'm about to perform will remove the block from your energy field."
"But here's what most people don't understand, {firstName}..."
"Removal is only half the work."
"For the next 30 days, your energy field will be rebuilding — open, raw, like a wound healing."
```

**AFTER**
```
"The clearing I'm about to perform will lift the block that's been sitting over your heart."
"But here's what most people don't understand, {firstName}..."
"Clearing what's closed is only half the work."
"For the next 30 days, your heart will be tender — softening, slowly beginning to open after everything it's carried."
```

---

## SECTION 3 — RISK (5 msgs) · *the biggest reframe: fear → loss-aversion*

**BEFORE**
```
"During this window, you're actually MORE vulnerable than before."
"This is when old shadows try to return."
"Or worse — new ones try to attach, sensing the opening."
"I've seen it happen too many times, {firstName}."
"Someone clears a block, feels amazing for a few weeks... then it slowly creeps back."
```

**AFTER**
```
"And a heart that's been hurt learns one thing better than any other, {firstName}..."
"How to close."
"Once the weight lifts, that old habit of guarding can quietly slip back in — the walls going up again before you even notice."
"I've seen it happen too many times."
"Someone clears the heaviness, feels lighter for a few weeks... then softly, the door closes again — and they don't realize until they're standing alone behind it."
```

---

## INTERACTION 1 — QUESTION 1 + replies + AFTER_Q1

**Question — BEFORE**
```
"Tell me honestly... have you ever cleared something — a habit, a pattern, a feeling — only to watch it return weeks later?"
```
**Question — AFTER**
```
"Tell me honestly... have you ever felt ready to let love in — only to find your heart had quietly closed the door anyway?"
```

**Quick replies** (labels change, values unchanged)
| value | BEFORE label | AFTER label |
|-------|--------------|-------------|
| `yes` | "Yes, that's happened to me" | "Yes, that's happened to me" |
| `maybe` | "I think so, yes" | "I think so, yes" |
| `unsure` | "I'm not sure" | "I'm not sure" |

**AFTER_Q1 — AFTER**
```
yes:
  "I felt that in your energy before you even said it."
  "That closing — it isn't a flaw, {firstName}. It's a heart that learned to protect itself. But you don't have to stay behind that door."
  "Not this time."
maybe:
  "Most people don't recognize it until they look back."
  "A door that opened, then quietly shut. A hope that rose, then folded itself away."
  "That's the pattern I want to soften for you."
unsure:
  "It's subtle. Sometimes we don't feel the walls until we reach for someone and find them there."
  "Either way, I want to make sure your heart stays open this time."
  "What we're clearing is too precious to let close back over."
default:
  "I can sense you understand what I mean."
  "That quiet closing of the heart — it doesn't have to happen this time."
  "I'm going to make sure of it."
```

---

## SECTION 4 — SOLUTION (3 msgs) · *the offer is named here*

**BEFORE**
```
"That's why I offer a second ritual — a Protection Ritual."
"It creates an energetic shield around you while your field rebuilds."
"And I anchor that shield to something physical... so it stays with you always."
```

**AFTER**
```
"That's why I offer a second ritual — a Heart-Opening Ritual."
"It gently softens what's been closed, so your heart can open again at its own pace — safely, on your terms."
"And I anchor that opening to something physical... so it stays with you, close to your skin."
```

---

## SECTION 5 — STONE INTRO (5 msgs) · `UPSELL_LAVA_INTRO` → `UPSELL_ROSE_INTRO`

**BEFORE**
```
"For your protection, I use volcanic lava stone."
"It's not a random choice, {firstName}."
"Lava is born from the Earth's core — where creation and destruction meet."
"When a volcano erupts, it destroys the old and creates new land. That's exactly what's happening in your energy right now."
"The stone is porous — it literally absorbs negative energy before it can reach you."
```

**AFTER**
```
"For this, I work with rose quartz."
"It's not a random choice, {firstName}."
"Rose quartz is the heart stone — for as long as people have loved and lost, they've held it close."
"It carries the gentlest energy of all the crystals. It never forces. It simply invites the heart to soften and open."
"Where other stones push or shield, this one only ever whispers the same thing: it's safe to feel again."
```
*(Image: `lava-stone.jpg` → new `rose-quartz.jpg` asset. `<img alt>` "Volcanic lava stone bracelet" → "Rose quartz heart stone".)*

---

## INTERACTION 2 — QUESTION 2 + replies + AFTER_Q2

**Question — BEFORE**
```
"Transformation through fire... destruction of the old to create the new. Can you feel why this stone is meant for you right now, {firstName}?"
```
**Question — AFTER**
```
"The stone of the open heart, held close to your skin... Can you feel why rose quartz is meant for you right now, {firstName}?"
```

**Quick replies** (values `yes` / `understand` / `more` unchanged)
| value | label (unchanged) |
|-------|-------------------|
| `yes` | "Yes, I can feel it" |
| `understand` | "I think I understand" |
| `more` | "Tell me more" |

**AFTER_Q2 — AFTER**
```
yes:
  "I knew you would. Your heart recognized it immediately."
  "This stone has been waiting for someone ready to open again."
understand:
  "Good. The understanding will deepen once you hold it against your heart."
  "Some things the heart only learns through touch."
more:
  "Of course. Let me show you exactly what I'll do with it."
  "The ritual itself is where the real tenderness lives."
default:
  "The connection between you and this stone — it's already forming."
  "Let me tell you how I'll awaken it."
```

---

## SECTION 6 — RITUAL (8 msgs)

**BEFORE**
```
"Here's exactly what I'll do for you, {firstName}..."
"Tonight, between 2 and 4am — when the veil between worlds is thinnest — I'll begin."
"I'll place your stone on my altar, beside a white candle and a vessel of blessed water."
"Using the energy signature from our conversation, I'll call your spirit forward."
"Then I'll speak the protection invocation — words passed down through my grandmother's line."
"I'll circle your stone with sage smoke seven times, sealing your frequency into it."
"The ritual takes about two hours. It drains me... but for those who are ready, it's necessary work."
"When I'm done, I'll place your stone under moonlight until dawn to lock the charge."
```

**AFTER**
```
"Here's exactly what I'll do for you, {firstName}..."
"Tonight, between 2 and 4am — when the veil between worlds is thinnest — I'll begin."
"I'll place your rose quartz on my altar, beside a soft pink candle and a bowl of rose-blessed water."
"Using the energy signature from our conversation, I'll call your heart gently forward."
"Then I'll speak the heart-opening invocation — words passed down through my grandmother's line."
"I'll circle the stone with rose petals seven times, weaving your frequency into it."
"The ritual takes about two hours. It asks much of me... but for a heart that's ready, it's sacred work."
"When I'm done, I'll leave your stone beneath the moon until dawn, so the opening sets soft and deep."
```

---

## SECTION 7 — FEEL (4 msgs)

**BEFORE**
```
"You may feel something tonight, {firstName}."
"Warmth spreading through your chest. Dreams more vivid than usual."
"A sense of being watched over — protected."
"That's me, working on your energy from a distance. Don't be alarmed. It means the connection is strong."
```

**AFTER**
```
"You may feel something tonight, {firstName}."
"A warmth spreading through your chest. A loosening, where it's felt tight for so long."
"Perhaps a dream of someone — or something — you'd almost forgotten you wanted."
"That's me, working with your heart from a distance. Don't be alarmed. It means the opening has begun."
```

---

## INTERACTION 3 — QUESTION 3 + replies + AFTER_Q3

**Question — BEFORE**
```
"I'm prepared to do this work for you tonight, {firstName}. Are you ready to be protected?"
```
**Question — AFTER**
```
"I'm ready to do this work for you tonight, {firstName}. Are you ready to open your heart again?"
```

**Quick replies** (values `yes` / `maybe` / `what` unchanged)
| value | BEFORE label | AFTER label |
|-------|--------------|-------------|
| `yes` | "Yes, I'm ready" | "Yes, I'm ready" |
| `maybe` | "I think so" | "I think so" |
| `what` | "What exactly will I receive?" | "What exactly will I receive?" |

**AFTER_Q3 — AFTER**
```
yes:
  "I can feel it — your heart already leaning toward the warmth. It's ready."
  "Let me tell you exactly what happens after the ritual..."
maybe:
  "That hesitation is natural. Your heart has been careful for good reason."
  "But it wouldn't have brought you this far if it weren't ready to soften."
what:
  "A fair question. Let me be completely clear about what you'll receive."
default:
  "Let me tell you exactly what you'll receive..."
```

---

## SECTION 8 — BUCKET-SPECIFIC (4 msgs each)

> ~100% of traffic hits `love`. `money` / `purpose` are dormant (money vertical parked) and are
> rewritten to stay coherent with a heart/receiving stone ("open to receive"). **Design flag:**
> rose quartz is a weak fit for a *money* offer — if money traffic ever scales, U1 should branch
> the stone by bucket rather than force rose quartz onto abundance.

### love — BEFORE
```
"Once your stone is charged, it will guard your heart while it heals and opens to love."
"Wear it on your LEFT wrist — your receiving hand."
"In energy work, the left side receives. Everything coming toward you — every person, every intention — passes through that hand first."
"The stone intercepts what shouldn't reach your heart. It filters. The wrong ones won't get through."
```
### love — AFTER
```
"Once your rose quartz is charged, it will hold your heart open while it heals — so love has a way back in."
"Wear it on your LEFT wrist — your receiving hand."
"In energy work, the left side receives. Everything moving toward you — every person, every chance at connection — passes through that hand first."
"The stone keeps that door open, gently. So when the right warmth comes near, your heart is ready to let it in."
```

### someone — BEFORE
```
"Once charged, your stone will clarify the connection between you and {personName}."
"Wear it on your LEFT wrist — your receiving hand."
"Their energy, their thoughts about you, their intentions — it all flows toward your left side first."
"The stone filters what reaches you. Truth passes through. Confusion, mixed signals, interference — absorbed before it can twist your perception."
```
### someone — AFTER *(compliance-critical — buyer's openness, NOT {personName}'s return)*
```
"Once charged, your rose quartz will soften the walls around your heart where {personName} is concerned."
"Wear it on your LEFT wrist — your receiving hand."
"Whatever moves between you and {personName} reaches your left side first."
"The stone keeps your heart open and clear — so you can feel what's truly there, without the old fear clouding it."
```

### money — AFTER *(reframed: open to receive / worthiness)*
```
"Once charged, your rose quartz will open you to receive — abundance included."
"Wear it on your LEFT wrist — your receiving hand."
"So much of what blocks money is a quiet sense of not deserving it. That lives in the heart, not the wallet."
"The stone softens that. It helps you feel worthy of what's coming — and an open hand receives far more than a closed one."
```

### purpose — AFTER *(reframed: open your heart to the calling)*
```
"Once charged, your rose quartz will open your heart to what's calling you."
"Wear it on your LEFT wrist — your receiving hand."
"Purpose isn't only thought through — it's felt. It reaches you through the heart before the mind catches up."
"The stone keeps that channel open, so when the quiet pull comes, you'll feel it clearly instead of talking yourself out of it."
```

---

## SECTION 9 — DELIVERY (5 msgs) · *new activation mantra*

**BEFORE**
```
"Once the ritual is complete, I'll ship your charged stone directly to you."
"It arrives in a protective velvet pouch with a card explaining how to activate it."
"When you receive it, hold it in both hands, close your eyes, and say: 'I am protected. I am transforming.'"
"That phrase activates the bond between you and the stone."
"The protection holds strong for at least 30 days — longer for most people. Long enough for your energy field to fully heal."
```

**AFTER**
```
"Once the ritual is complete, I'll ship your charged rose quartz directly to you."
"It arrives in a soft pouch with a card explaining how to wake it."
"When you receive it, hold it over your heart, close your eyes, and say: 'I am open. I am ready to receive love.'"
"That phrase activates the bond between you and the stone."
"The opening holds strong for at least 30 days — longer for most. Long enough for your heart to remember how this feels."
```

---

## SECTION 10 — OFFER (4 msgs)

**BEFORE**
```
"The Protection Ritual is {upsellPrice}, {firstName}."
"That includes the charged volcanic stone shipped directly to your door."
"Most of my serious clients do both rituals together — clearing AND protection. It's the complete work."
"Shall I add your protection to tonight's ritual?"
```

**AFTER**
```
"The Heart-Opening Ritual is {upsellPrice}, {firstName}."
"That includes your charged rose quartz, shipped directly to your door."
"Most of my serious clients do both rituals together — clearing AND opening. It's the complete work."
"Shall I add your heart-opening to tonight's ritual?"
```

---

## DECLINE — SOFT EXIT (6 msgs)

**BEFORE**
```
"I understand, {firstName}. It's your journey to walk."
"Just... be mindful over the next 30 days."
"If you feel the old heaviness returning, or patterns creeping back in, know that I'm here."
"The protection ritual is always available if you change your mind."
"For now, watch your inbox. Your clearing reading will arrive within 24 hours."
"Take care of yourself, dear. I'll be thinking of you tonight during the work."
```

**AFTER**
```
"I understand, {firstName}. It's your heart, and your timing."
"Just... be gentle with yourself over the next 30 days."
"If you feel the old walls rising, or the door beginning to close, know that I'm here."
"The heart-opening ritual is always here if you change your mind."
"For now, watch your inbox. Your clearing reading will arrive within 24 hours."
"Take care of your heart, dear. I'll be thinking of you tonight during the work."
```

---

## ACCEPT — SUCCESS (5 msgs)

**BEFORE**
```
"Beautiful choice, {firstName}."
"Both rituals are now confirmed — clearing AND protection."
"I'll perform them together tonight. The work will be deeper this way."
"Your charged volcanic stone will ship within 48 hours."
"I just need to know where to send it."
```

**AFTER**
```
"Beautiful choice, {firstName}."
"Both rituals are now confirmed — clearing AND opening."
"I'll perform them together tonight. The work will go deeper this way."
"Your charged rose quartz will ship within 48 hours."
"I just need to know where to send it."
```

---

## SHIPPING CONFIRMED (7 msgs)

**BEFORE**
```
"Perfect. Your protection stone is on its way, {firstName}."
"Remember — when it arrives, hold it and say: 'I am protected. I am transforming.'"
"That seals the bond."
"Tonight, as I work, you may feel warmth or have vivid dreams. That's normal. That's me."
"Watch your inbox — your clearing reading arrives within 24 hours."
"Thank you for trusting me with this sacred work, {firstName}."
"The universe is already responding to your decision. I can feel it shifting."
```

**AFTER**
```
"Perfect. Your rose quartz is on its way, {firstName}."
"Remember — when it arrives, hold it to your heart and say: 'I am open. I am ready to receive love.'"
"That seals the bond."
"Tonight, as I work, you may feel a warmth in your chest, or dreams that stir something tender. That's normal. That's me."
"Watch your inbox — your clearing reading arrives within 24 hours."
"Thank you for trusting me with this sacred work, {firstName}."
"The universe is already responding. I can feel your heart beginning to open."
```

---

## Non-copy touchpoints that ride along (not flow changes)

| File | Current | New (rose arm) |
|------|---------|----------------|
| `hooks/useUpsellChat.ts` accept self-msg | `"Yes, protect what we clear"` | `"Yes, open my heart"` |
| `hooks/useUpsellChat.ts` PostHog `product` | `protection_ritual` | `heart_opening_ritual` |
| `lib/upsellMessages.ts` `detectQ3Intent` `yes` regex | includes `protect me` | include `open`, `open my heart`, `ready` |
| `pages/UpsellPage.tsx` `<img alt>` | "Volcanic lava stone bracelet" | "Rose quartz heart stone" |
| `assets/images/` | `lava-stone.jpg` | new `rose-quartz.jpg` |
| `components/upsell` `UpsellCTA` accept label | *(verify — likely "Protect What We Clear")* | "Open My Heart — {price}" |

## Stripe metadata for the rose arm (for the sister-repo tally)
| Arm | `metadata.product` | `metadata.upsell1Variant` | amount |
|-----|--------------------|---------------------------|--------|
| Lava control | `protection_ritual` *(unchanged)* | `lava_47` | 4700 |
| Rose $47 | `heart_opening_ritual` | `rose_47` | 4700 |
| Rose $57 | `heart_opening_ritual` | `rose_57` | 5700 |
