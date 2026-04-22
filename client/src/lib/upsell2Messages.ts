import type { Bucket } from '@shared/types'

// ============================================
// TYPES
// ============================================

export interface QuickReply {
  text: string
  value: string
}

export type Upsell2Stage =
  | 'INIT'
  | 'PATH_A_OPEN'
  | 'PATH_B_OPEN'
  | 'MANIFEST_REVEAL'
  | 'WAITING_REVEAL'
  | 'GAP'
  | 'QUESTION_1'
  | 'WAITING_Q1'
  | 'AFTER_Q1'
  | 'INTRODUCE'
  | 'STONES'
  | 'QUESTION_2'
  | 'WAITING_Q2'
  | 'AFTER_Q2'
  | 'MANIFEST_PERSONALIZE'
  | 'WAITING_PERSONALIZE'
  | 'RITUAL_INSTRUCTION'
  | 'WHAT_RECEIVE'
  | 'QUESTION_3'
  | 'WAITING_Q3'
  | 'AFTER_Q3'
  | 'SOCIAL_PROOF'
  | 'PRICE'
  | 'URGENCY'
  | 'CTA'
  | 'OBJECTION_1'
  | 'OBJECTION_2'
  | 'DOWNSELL'
  | 'DOWNSELL_CTA'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DECLINED'
  | 'COMPLETE'

// ============================================
// PATH A OPENING (bought upsell 1)
// ============================================

export const UPSELL2_PATH_A_OPEN = [
  "{firstName}... both rituals are confirmed. Clearing and protection. Tonight's work will be powerful.",
  "Your lava stone will guard your left side — your receiving side — while your energy field heals. Nothing unwanted gets through.",
  "But I want to ask you something, and I need you to answer honestly...",
  "When the block is gone... and you're protected... what then?",
  "The clearing removes what's been holding you back. The stone keeps it from returning. But {firstName}... neither one actively draws your desire toward you.",
  "Clearing is about the past. Protection is about the present. But what about your future?",
]

// ============================================
// PATH B OPENING (declined upsell 1)
// ============================================

export const UPSELL2_PATH_B_OPEN = [
  "{firstName}... I respect your decision about the protection ritual. Your clearing will still be powerful on its own.",
  "But before I begin tonight... there's something else I saw during our reading. Something I haven't mentioned yet.",
  "It's not about what's blocking you. The clearing handles that.",
  "It's about what's waiting for you on the other side.",
  "When I looked at your energy, {firstName}... I didn't just see the shadow. I saw what's trying to reach you. And it's close.",
  "But it can't find you yet. Not because of the block — because you're not broadcasting the right signal.",
]

// ============================================
// GAP (Phase 4)
// ============================================

export const UPSELL2_GAP = [
  "The clearing will remove what's been standing in the way. That I promise you.",
  "But removing a wall isn't the same as opening a door, {firstName}.",
  "Think about it... you can clear every block in your field. You can protect yourself from anything returning. But if you're not actively calling in what you want...",
  "You're just standing in an empty room. Safe, but alone.",
]

// ============================================
// QUESTION 1
// ============================================

export const UPSELL2_QUESTION_1 = "{firstName}... can you feel the difference between removing something and calling something in? Between being safe... and actually having what you want?"

export const UPSELL2_QUESTION_1_REPLIES: QuickReply[] = [
  { text: "Yes, I feel it", value: "yes" },
  { text: "I think so", value: "maybe" },
  { text: "What do you mean?", value: "what" },
]

export const UPSELL2_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "Good. That's your intuition speaking. It already knows what's missing.",
    "The clearing opens the space. But something needs to fill it... or the old patterns will.",
  ],
  maybe: [
    "It's subtle. But you'll feel it clearly once the clearing is done.",
    "There'll be a lightness... and then a quiet voice asking, \"Now what?\" That's the moment this is for.",
  ],
  what: [
    "Think of it this way — clearing a block is like pulling weeds from a garden. It's necessary. But it doesn't plant flowers.",
    "Planting — actively attracting what you want — that's a different kind of work entirely.",
  ],
  default: [
    "I can sense you understand more than you realize.",
    "Let me show you what I mean.",
  ],
}

// ============================================
// INTRODUCE BRACELET (Phase 5)
// ============================================

export const UPSELL2_INTRODUCE = [
  "That's why I created something specific for this moment.",
  "Not for protection. Not for clearing. For attraction.",
  "A bracelet made of eight stones — each one chosen for its ability to draw specific energies toward you.",
  "I call it a Manifestation Bracelet. And I only offer it to seekers whose energy is ready to receive.",
  "Yours is, {firstName}. I felt it the moment we began talking.",
]

// ============================================
// STONES (Phase 6)
// ============================================

export const UPSELL2_STONES = [
  "Eight stones, {firstName}. Each one pulls a different piece of your desire toward you.",
  "Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected opportunities. The things you've been asking the universe for... this stone helps them find you.",
  "Citrine — the merchant's stone. It's been carried by traders and seekers of abundance for centuries. It doesn't just attract wealth... it attracts the confidence to receive it. The feeling that you deserve what's coming.",
  "Amethyst — your intuition amplifier. Once the block is cleared, signs and synchronicities will start appearing. This stone helps you SEE them. The universe is always speaking, {firstName}. Amethyst helps you listen.",
  "Tiger's Eye — the stone of bold action. It attracts the opportunities that require courage. The ones you'd normally hesitate on. And then it gives you the nerve to say yes.",
  "And four more working together — Clear Quartz to amplify every intention you set... Hematite to ground your manifestations into physical reality... Pyrite to broadcast abundance frequency outward... and Malachite to pull transformation and growth toward you like a magnet.",
  "Eight stones. Eight signals. All tuned to your frequency during tonight's clearing.",
]

// ============================================
// QUESTION 2
// ============================================

export const UPSELL2_QUESTION_2 = "Eight stones, each pulling something different toward you. {firstName}... did any of them stand out? Did one feel like it was speaking directly to you?"

export const UPSELL2_QUESTION_2_REPLIES: QuickReply[] = [
  { text: "Yes, one stood out", value: "yes" },
  { text: "They all resonate", value: "all" },
  { text: "Tell me more", value: "more" },
]

export const UPSELL2_AFTER_Q2: Record<string, string[]> = {
  yes: [
    "I'm not surprised. The stone that calls to you loudest is the one doing the most work for your energy right now.",
    "Let me tell you specifically what it means for YOUR situation...",
  ],
  all: [
    "That tells me something powerful, {firstName}. When all eight stones speak to you... it means your energy is ready for all of it.",
    "But there's one that matters most for where you are right now. Let me show you.",
  ],
  more: [
    "Of course. Let me connect them to what you told me earlier — what you actually want.",
    "Because these stones aren't random. They're specific to you.",
  ],
  default: [
    "The connection between you and these stones is already forming, {firstName}.",
    "Let me show you which one speaks loudest to your energy...",
  ],
}

// ============================================
// MANIFEST PERSONALIZE (Phase 7)
// ============================================

// ============================================
// RITUAL INSTRUCTION (Phase 8)
// ============================================

export const UPSELL2_RITUAL_INSTRUCTION = [
  "You'll wear this on your right wrist, {firstName}. Always the right.",
  "Your right side is your broadcasting side. It's how your energy flows outward into the world — into every room you enter, every person you meet, every intention you set.",
  "The bracelet amplifies that broadcast. It takes the frequency of your desire and pushes it out further, stronger, clearer... so the universe can hear exactly what you're asking for.",
  "Right now, you're whispering. With this bracelet, you'll be speaking at full volume.",
]

export const UPSELL2_RITUAL_PATH_A_EXTRA = "And with your lava stone on your left, filtering what comes IN... and the manifestation bracelet on your right, amplifying what goes OUT... you'll have a complete circuit. Receiving and broadcasting in perfect harmony."

// ============================================
// WHAT THEY RECEIVE (Phase 9)
// ============================================

export const UPSELL2_WHAT_RECEIVE = [
  "I'll attune each stone to your specific desire during tonight's clearing. By the time the bracelet reaches you, it will already carry the frequency of what you told me you want most.",
  "You'll also receive a manifestation guide — a daily 3-minute ritual to activate the bracelet each morning. It's simple. But my seekers tell me it's the most powerful part of their day.",
  "Most of them start noticing shifts within the first week. Small things at first — a feeling, a coincidence, a conversation that seems too perfectly timed. Then bigger.",
]

// ============================================
// QUESTION 3
// ============================================

export const UPSELL2_QUESTION_3 = "{firstName}... I've shown you the stones. I've told you how they work. But I need to ask you something before we go further. Are you ready to stop waiting for what you want... and start calling it in?"

export const UPSELL2_QUESTION_3_REPLIES: QuickReply[] = [
  { text: "Yes, I'm ready", value: "yes" },
  { text: "I think so", value: "maybe" },
  { text: "What exactly will I receive?", value: "what" },
]

export const UPSELL2_AFTER_Q3: Record<string, string[]> = {
  yes: [
    "I felt that, {firstName}. Your energy just shifted. You're ready.",
    "Let me tell you exactly what happens next.",
  ],
  maybe: [
    "That's honest. And honesty is a kind of readiness too.",
    "Let me make this simple for you.",
  ],
  what: [
    "A fair question. Let me be completely clear.",
  ],
  default: [
    "I can feel your energy leaning forward, {firstName}. That's enough.",
    "Here's what you'll receive.",
  ],
}

// ============================================
// SOCIAL PROOF (Phase 10)
// ============================================

export const UPSELL2_SOCIAL_PROOF = [
  "I've sent these to hundreds of seekers now. The ones who wear them daily... their stories still give me chills.",
  "They don't just tell me something changed. They tell me everything changed. Like the universe finally heard them.",
]

// ============================================
// PRICE & GUARANTEE (Phase 11)
// ============================================

export const UPSELL2_PRICE = [
  "The Manifestation Bracelet, fully charged and attuned to your desire, is $47. Shipped directly to you.",
  "Same 30-day guarantee. If you don't feel the shift... if nothing starts moving toward you... every penny back. Keep the bracelet.",
  "I've never had anyone return one.",
]

// ============================================
// URGENCY (Phase 12)
// ============================================

export const UPSELL2_URGENCY = [
  "I can only attune the stones while I'm inside your energy field tonight, {firstName}. Once the clearing is complete and I close the session... the window to charge them with your specific frequency is gone.",
  "Your clearing will be powerful either way. I promise you that.",
  "But if you want to go beyond clearing and start calling in what's yours... this is the moment.",
]

// ============================================
// DOWNSELL (Phase 13)
// ============================================

export const UPSELL2_DOWNSELL = [
  "{firstName}... I hear you.",
  "Let me do something I don't normally do.",
  "I have a bracelet that's already been cleansed and prepared — it just hasn't been attuned to anyone yet. It won't carry the full personalized charge of tonight's clearing the way a fresh one would...",
  "But I can still connect it to your energy before I begin. It won't be as deeply bonded to your specific desire, but the stones themselves are powerful attractors on their own.",
  "I can send it to you for $30 instead. Same eight stones. Same manifestation energy. Just prepared differently.",
  "This is the lowest I can offer, dear. The stones alone cost me nearly that.",
]

// ============================================
// SUCCESS (after purchase)
// ============================================

export const UPSELL2_SUCCESS = [
  "Beautiful choice, {firstName}.",
  "Your Manifestation Bracelet will be attuned during tonight's clearing.",
  "Eight stones, each carrying the frequency of what you desire most.",
  "It will ship within 48 hours.",
]

// ============================================
// SUCCESS with existing shipping (Path A)
// ============================================

export const UPSELL2_SUCCESS_HAS_SHIPPING = [
  "Beautiful choice, {firstName}.",
  "Your Manifestation Bracelet will be attuned during tonight's clearing.",
  "Eight stones, each carrying the frequency of what you desire most.",
  "I'll ship it to the same address as your protection stone.",
]

// ============================================
// SUCCESS needs shipping (Path B)
// ============================================

export const UPSELL2_SUCCESS_NEEDS_SHIPPING = [
  "Beautiful choice, {firstName}.",
  "Your Manifestation Bracelet will be attuned during tonight's clearing.",
  "Eight stones, each carrying the frequency of what you desire most.",
  "It will ship within 48 hours.",
  "I just need to know where to send it.",
]

// ============================================
// SHIPPING CONFIRMED
// ============================================

export const UPSELL2_SHIPPING_CONFIRMED = [
  "Perfect. Your Manifestation Bracelet is on its way, {firstName}.",
  "Remember — wear it on your right wrist. Always the right.",
  "Each morning, hold it and set your intention for the day. Three minutes. That's all it takes.",
  "Watch your inbox — your clearing reading arrives within 24 hours.",
  "Thank you for trusting me with this sacred work, {firstName}.",
  "The universe is already responding. I can feel it.",
]

// ============================================
// SOFT DECLINE
// ============================================

export const UPSELL2_SOFT_DECLINE = [
  "I understand, {firstName}. The clearing alone will be powerful work.",
  "Just know... the stones are patient. If you ever feel ready to start calling in what's yours, I'll be here.",
  "Watch your inbox — your reading arrives within 24 hours.",
  "Take care, dear. Tonight's work begins soon.",
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

export function detectU2Q1Intent(input: string): string {
  const lower = input.toLowerCase()

  if (lower.match(/yes|feel it|definitely|absolutely|i can|sense it/)) {
    return 'yes'
  }
  if (lower.match(/think so|maybe|probably|sort of|kind of/)) {
    return 'maybe'
  }
  if (lower.match(/what|mean|explain|don't understand|how/)) {
    return 'what'
  }

  return 'default'
}

export function detectU2Q2Intent(input: string): string {
  const lower = input.toLowerCase()

  if (lower.match(/yes|one stood out|one of them|specific|that one/)) {
    return 'yes'
  }
  if (lower.match(/all|every|each|they all|resonate/)) {
    return 'all'
  }
  if (lower.match(/more|tell me|explain|curious|how/)) {
    return 'more'
  }

  return 'default'
}

export function detectU2Q3Intent(input: string): string {
  const lower = input.toLowerCase()

  if (lower.match(/yes|ready|i am|let's|please|absolutely|definitely/)) {
    return 'yes'
  }
  if (lower.match(/think so|maybe|probably|i guess|suppose/)) {
    return 'maybe'
  }
  if (lower.match(/what|receive|get|included|exactly|details/)) {
    return 'what'
  }

  return 'default'
}
