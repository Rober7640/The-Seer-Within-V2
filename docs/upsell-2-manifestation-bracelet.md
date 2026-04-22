# Upsell 2: Manifestation Bracelet

## Flow

```
Full funnel: Main Offer ($35 Clearing) → Upsell 1 ($47 Protection + Lava Stone) → Upsell 2 ($47 Manifestation Bracelet)

                        Clear the block → Protect while healing → Attract what you desire
                          (past)              (present)               (future)

Upsell 1 (Protection Ritual + Lava Stone — $47)
    ├── [User buys $47] → Payment → Upsell 2 triggered
    │       └── Path A opening messages (bought initial + upsell 1)
    │               └── Upsell 2 pitch sequence (shared)
    │                       ├── [Buy Bracelet $47] → Stripe → /success
    │                       ├── [Decline] → /success
    │                       └── [Objection x2] → Bracelet Downsell ($30)
    │                               ├── [Buy Bracelet $30] → Stripe → /success
    │                               ├── [Decline] → /success
    │                               └── [Objection] → Accept decline → /success
    │
    └── [User declines upsell 1 — "Not right now"]
            └── Path B opening messages (bought initial only)
                    └── Upsell 2 pitch sequence (shared)
                            ├── [Buy Bracelet $47] → Stripe → /success
                            ├── [Decline] → Graceful exit (END)
                            └── [Objection x2] → Bracelet Downsell ($30)
                                    ├── [Buy Bracelet $30] → Stripe → /success
                                    ├── [Decline] → Graceful exit (END)
                                    └── [Objection] → Accept decline → Graceful exit
```

---

## Overview

- **Offer:** Manifestation Bracelet — 8 attraction stones attuned to the buyer's specific desire during the clearing ritual
- **Price:** $47 (downsell: $30)
- **Trigger:** Appears in the chat flow immediately after upsell 1 (Protection Ritual + Lava Stone — $47), whether the user bought or declined it
- **Delivery:** Physical bracelet shipped to buyer
- **Guarantee:** 30-day money-back, keep the bracelet
- **Angle:** The clearing removes what's blocking you. The stone protects you while you heal. But neither one actively PULLS your desire toward you. This bracelet is the magnet.

## The Trilogy

| Step | Offer | What It Does | Timeframe |
|------|-------|-------------|-----------|
| 1. Clear | Main offer ($35) | Removes the block/shadow | Past — what's been holding them back |
| 2. Protect | Upsell 1 ($47) | Guards during the 30-day healing window | Present — while the energy field rebuilds |
| 3. Attract | Upsell 2 ($47) | Actively draws their desire toward them | Future — pulling in what they want |

## Stones (8 total)

| Stone | Attraction Role |
|-------|----------------|
| Amethyst | Intuition amplifier — helps recognize signs, synchronicities, and opportunities the universe sends |
| Citrine | The abundance magnet — attracts wealth, success, and positive energy. Known as "the merchant's stone" |
| Hematite | Grounds manifestation into reality — turns dreams and intentions into tangible action and results |
| Tiger's Eye | Attracts opportunity and courage — draws situations that require boldness, then gives you the nerve to act |
| Green Aventurine | The luck stone — strongest attractor of love, new connections, and fresh starts. Opens the heart to receive |
| Pyrite | "Fool's gold" — attracts financial abundance and manifestation power. Broadcasts confidence outward |
| Clear Quartz | The master amplifier — magnifies every intention you set and the power of every other stone |
| Malachite | Transformation magnet — attracts growth, change, and the breaking of old cycles. Pulls you toward your next chapter |

## Key Detail: Right Wrist

The manifestation bracelet is worn on the **right wrist** — the giving/broadcasting side. The right hand pushes energy outward into the world. Wearing the bracelet on the right means it amplifies what you're putting OUT — your intentions, your frequency, your desires — broadcasting them into the universe.

**For Path A buyers (who also have the lava stone):** The lava stone on the LEFT wrist filters what comes IN. The manifestation bracelet on the RIGHT wrist amplifies what goes OUT. Together they create a complete energetic circuit — receiving and broadcasting in harmony.

---

## Chat Message Sequence

### Phase 1 & 2: Context-Dependent Opening

Two paths lead to upsell 2. The opening must match the buyer's emotional state and what they've purchased.

---

#### Path A: Bought Initial ($35) + Upsell 1 ($47 Lava Stone)

**Emotional state:** Very high trust, double-committed ($35 + $47), deep in the experience. They have clearing and protection covered. They're thinking about the future — what happens once the block is gone and they're safe.

```
{firstName}... both rituals are confirmed. Clearing and protection. Tonight's work will be powerful.
```

```
Your lava stone will guard your left side — your receiving side — while your energy field heals. Nothing unwanted gets through.
```

```
But I want to ask you something, and I need you to answer honestly...
```

```
When the block is gone... and you're protected... what then?
```

```
The clearing removes what's been holding you back. The stone keeps it from returning. But {firstName}... neither one actively draws your desire toward you.
```

```
Clearing is about the past. Protection is about the present. But what about your future?
```

→ **Continue to Phase 3: Claude API Call — `manifestReveal`**

---

#### Path B: Bought Initial ($35) Only — Declined Upsell 1

**Emotional state:** They trusted Evelyn enough to buy the clearing but said no to the lava stone. Still engaged. May have felt protection wasn't necessary, or the price was too much. They're not "protection" buyers — but they might be "attraction" buyers. Different emotional register: hope over fear.

```
{firstName}... I respect your decision about the protection ritual. Your clearing will still be powerful on its own.
```

```
But before I begin tonight... there's something else I saw during our reading. Something I haven't mentioned yet.
```

```
It's not about what's blocking you. The clearing handles that.
```

```
It's about what's waiting for you on the other side.
```

```
When I looked at your energy, {firstName}... I didn't just see the shadow. I saw what's trying to reach you. And it's close.
```

```
But it can't find you yet. Not because of the block — because you're not broadcasting the right signal.
```

→ **Continue to Phase 3: Claude API Call — `manifestReveal`**

---

**Both paths merge at Phase 3.** Path A frames it as the missing third step (clear → protect → attract). Path B frames it as something entirely different from what they just declined — not defense, but offense. Not fear, but hope.

### Phase 3: Claude API Call — `manifestReveal`

Personalized message based on their bucket and the specific desire/vision they shared during the chat. Names what's trying to reach them. Returns 2-3 messages.

**Prompt direction:** Reference the DESIRE they expressed (not the block — the clearing handles that). Tell them you saw something beyond the shadow — you saw what's on the other side, trying to reach them. Be specific to their bucket:
- **Love:** "I saw a connection forming... someone whose energy is already aligned with yours. But they can't feel you yet."
- **Money:** "I saw an opening — a flow of abundance that's been circling your field, looking for a way in. It's close."
- **Purpose:** "I saw clarity trying to break through. Your purpose isn't lost, {firstName}. It's just waiting for the signal."
- **Someone:** "I saw {personName}'s energy shifting. There's a pull between you. But something needs to change for them to feel it."

### Phase 4: The Gap — What's Missing

```
The clearing will remove what's been standing in the way. That I promise you.
```

```
But removing a wall isn't the same as opening a door, {firstName}.
```

```
Think about it... you can clear every block in your field. You can protect yourself from anything returning. But if you're not actively calling in what you want...
```

```
You're just standing in an empty room. Safe, but alone.
```

### Phase 4b: QUESTION 1 (interactive — waits for response)

```
{firstName}... can you feel the difference between removing something and calling something in? Between being safe... and actually having what you want?
```

Quick Replies:
  [Yes, I feel it]  [I think so]  [What do you mean?]
  (or free text input)

**Intent detection:** matches user text to `yes`, `maybe`, `what`, or `default`

### Phase 4c: AFTER Q1 (2 messages based on response, auto-advance)

#### If "yes":
```
Good. That's your intuition speaking. It already knows what's missing.
```
```
The clearing opens the space. But something needs to fill it... or the old patterns will.
```

#### If "maybe" / "I think so":
```
It's subtle. But you'll feel it clearly once the clearing is done.
```
```
There'll be a lightness... and then a quiet voice asking, "Now what?" That's the moment this is for.
```

#### If "what" / "What do you mean?":
```
Think of it this way — clearing a block is like pulling weeds from a garden. It's necessary. But it doesn't plant flowers.
```
```
Planting — actively attracting what you want — that's a different kind of work entirely.
```

#### If "default" (unrecognized input):
```
I can sense you understand more than you realize.
```
```
Let me show you what I mean.
```

---

### Phase 5: Introduce the Bracelet

```
That's why I created something specific for this moment.
```

```
Not for protection. Not for clearing. For attraction.
```

```
A bracelet made of eight stones — each one chosen for its ability to draw specific energies toward you.
```

```
I call it a Manifestation Bracelet. And I only offer it to seekers whose energy is ready to receive.
```

```
Yours is, {firstName}. I felt it the moment we began talking.
```

### Phase 6: The Stones — Specific & Tangible

```
Eight stones, {firstName}. Each one pulls a different piece of your desire toward you.
```

```
Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected opportunities. The things you've been asking the universe for... this stone helps them find you.
```

```
Citrine — the merchant's stone. It's been carried by traders and seekers of abundance for centuries. It doesn't just attract wealth... it attracts the confidence to receive it. The feeling that you deserve what's coming.
```

```
Amethyst — your intuition amplifier. Once the block is cleared, signs and synchronicities will start appearing. This stone helps you SEE them. The universe is always speaking, {firstName}. Amethyst helps you listen.
```

```
Tiger's Eye — the stone of bold action. It attracts the opportunities that require courage. The ones you'd normally hesitate on. And then it gives you the nerve to say yes.
```

```
And four more working together — Clear Quartz to amplify every intention you set... Hematite to ground your manifestations into physical reality... Pyrite to broadcast abundance frequency outward... and Malachite to pull transformation and growth toward you like a magnet.
```

```
Eight stones. Eight signals. All tuned to your frequency during tonight's clearing.
```

### Phase 6b: QUESTION 2 (interactive — waits for response)

```
Eight stones, each pulling something different toward you. {firstName}... did any of them stand out? Did one feel like it was speaking directly to you?
```

Quick Replies:
  [Yes, one stood out]  [They all resonate]  [Tell me more]
  (or free text input)

**Intent detection:** matches user text to `yes`, `all`, `more`, or `default`

### Phase 6c: AFTER Q2 (2 messages based on response, auto-advance)

#### If "yes" / names a specific stone:
```
I'm not surprised. The stone that calls to you loudest is the one doing the most work for your energy right now.
```
```
Let me tell you specifically what it means for YOUR situation...
```

#### If "all" / "They all resonate":
```
That tells me something powerful, {firstName}. When all eight stones speak to you... it means your energy is ready for all of it.
```
```
But there's one that matters most for where you are right now. Let me show you.
```

#### If "more" / "Tell me more":
```
Of course. Let me connect them to what you told me earlier — what you actually want.
```
```
Because these stones aren't random. They're specific to you.
```

#### If "default":
```
The connection between you and these stones is already forming, {firstName}.
```
```
Let me show you which one speaks loudest to your energy...
```

---

### Phase 7: Claude API Call — `manifestPersonalize`

Personalized message connecting the stones to THEIR specific desire. Tells them which stone matters most for them based on their bucket. Returns 2-3 messages.

**Prompt direction by bucket:**
- **Love:** Emphasize Green Aventurine (attracting new love or rekindling connection) + Amethyst (recognizing the right person when they appear). Paint a picture of wearing the bracelet and feeling the shift in how people respond to them.
- **Money:** Emphasize Citrine (abundance magnet) + Pyrite (broadcasting wealth frequency). Paint a picture of opportunities appearing, doors opening, the flow of money shifting toward them.
- **Purpose:** Emphasize Tiger's Eye (courage to follow the path) + Amethyst (clarity to see the signs). Paint a picture of waking up knowing exactly what they're meant to do.
- **Someone:** Emphasize Green Aventurine (drawing {personName} closer) + Clear Quartz (amplifying the energetic connection between them). Paint a picture of {personName} reaching out, feeling the pull.

### Phase 8: The Ritual Instruction

```
You'll wear this on your right wrist, {firstName}. Always the right.
```

```
Your right side is your broadcasting side. It's how your energy flows outward into the world — into every room you enter, every person you meet, every intention you set.
```

```
The bracelet amplifies that broadcast. It takes the frequency of your desire and pushes it out further, stronger, clearer... so the universe can hear exactly what you're asking for.
```

```
Right now, you're whispering. With this bracelet, you'll be speaking at full volume.
```

**For Path A buyers, add:**

```
And with your lava stone on your left, filtering what comes IN... and the manifestation bracelet on your right, amplifying what goes OUT... you'll have a complete circuit. Receiving and broadcasting in perfect harmony.
```

### Phase 9: What They Receive

```
I'll attune each stone to your specific desire during tonight's clearing. By the time the bracelet reaches you, it will already carry the frequency of what you told me you want most.
```

```
You'll also receive a manifestation guide — a daily 3-minute ritual to activate the bracelet each morning. It's simple. But my seekers tell me it's the most powerful part of their day.
```

```
Most of them start noticing shifts within the first week. Small things at first — a feeling, a coincidence, a conversation that seems too perfectly timed. Then bigger.
```

### Phase 9b: QUESTION 3 (interactive — waits for response)

```
{firstName}... I've shown you the stones. I've told you how they work. But I need to ask you something before we go further. Are you ready to stop waiting for what you want... and start calling it in?
```

Quick Replies:
  [Yes, I'm ready]  [I think so]  [What exactly will I receive?]
  (or free text input)

**Intent detection:** matches user text to `yes`, `maybe`, `what`, or `default`

### Phase 9c: AFTER Q3 (1-2 messages based on response, auto-advance)

#### If "yes":
```
I felt that, {firstName}. Your energy just shifted. You're ready.
```
```
Let me tell you exactly what happens next.
```

#### If "maybe" / "I think so":
```
That's honest. And honesty is a kind of readiness too.
```
```
Let me make this simple for you.
```

#### If "what" / "What exactly will I receive?":
```
A fair question. Let me be completely clear.
```

#### If "default":
```
I can feel your energy leaning forward, {firstName}. That's enough.
```
```
Here's what you'll receive.
```

---

### Phase 10: Social Proof

```
I've sent these to hundreds of seekers now. The ones who wear them daily... their stories still give me chills.
```

```
They don't just tell me something changed. They tell me everything changed. Like the universe finally heard them.
```

### Phase 11: Price & Guarantee

```
The Manifestation Bracelet, fully charged and attuned to your desire, is $47. Shipped directly to you.
```

```
Same 30-day guarantee. If you don't feel the shift... if nothing starts moving toward you... every penny back.
```

```
I've never had anyone return one.
```

### Phase 12: Urgency & Close

```
I can only attune the stones while I'm inside your energy field tonight, {firstName}. Once the clearing is complete and I close the session... the window to charge them with your specific frequency is gone.
```

```
Your clearing will be powerful either way. I promise you that.
```

```
But if you want to go beyond clearing and start calling in what's yours... this is the moment.
```

### CTA Button

```
Claim My Manifestation Bracelet — $47
```

**Button style:** Gradient — warm gold to amber (manifestation/abundance energy)

**Below CTA:**
```
🔒 30-Day Guarantee | Free Shipping | 100% Secure
```

**Decline link:**
```
No thanks, the clearing is enough for now
```

---

### Phase 13: Bracelet Downsell ($30) — After 2 Objections

Triggered when the user objects twice to the $47 offer. Evelyn drops the price without making the original price feel inflated.

```
{firstName}... I hear you.
```

```
Let me do something I don't normally do.
```

```
I have a bracelet that's already been cleansed and prepared — it just hasn't been attuned to anyone yet. It won't carry the full personalized charge of tonight's clearing the way a fresh one would...
```

```
But I can still connect it to your energy before I begin. It won't be as deeply bonded to your specific desire, but the stones themselves are powerful attractors on their own.
```

```
I can send it to you for $30 instead. Same eight stones. Same manifestation energy. Just prepared differently.
```

```
This is the lowest I can offer, dear. The stones alone cost me nearly that.
```

### Bracelet Downsell CTA

```
Claim My Manifestation Bracelet — $30
```

**Button style:** Softer gradient (muted gold or warm slate)

**Below CTA:**
```
🔒 30-Day Guarantee | Free Shipping | 100% Secure
```

**Decline link:**
```
No thanks, I'll pass
```

After decline or one more objection → accept and exit (Path A → /success, Path B → graceful exit).

---

## Implementation Notes

### State Machine Additions

New states needed in `chat.ts`:
- `UPSELL_2` — Manifestation bracelet pitch active
- `UPSELL_2_OBJECTION` — Handling objections to bracelet offer
- `UPSELL_2_DOWNSELL` — $30 discounted bracelet offer

New fields in `ChatState`:
- `showManifestCTA: boolean`
- `showManifestDownsellCTA: boolean`

### Server Endpoints

New Claude API actions needed:
- `manifestReveal` — Personalized message about what's trying to reach them (their desire, not their block)
- `manifestPersonalize` — Connects specific stones to their bucket/desire

Checkout endpoint update:
- Add `type: 'manifest'` option with `priceAmount: 4700`
- Add `type: 'manifest_downsell'` option with `priceAmount: 3000`
- Product name: "Manifestation Bracelet" (both tiers)

### Shipping

Requires collecting a shipping address. Options:
1. Collect address on success page before/during pitch
2. Collect address after purchase via email follow-up
3. Add address fields to Stripe checkout session
4. If Path A buyer already submitted shipping for lava stone, reuse that address

### Message Count

- Static messages: ~36
- Claude API personalized messages: 4-6
- Branching response messages (3 questions x 2 msgs): 6
- Path A extra message (complete circuit): 1
- **Total: ~47-49 messages** (including interactive responses)
