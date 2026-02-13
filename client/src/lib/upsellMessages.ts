import type { Bucket } from '@shared/types'

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
    "Wear it on your LEFT wrist — your receiving hand.",
    "In energy work, the left side receives. Everything coming toward you — every person, every intention — passes through that hand first.",
    "The stone intercepts what shouldn't reach your heart. It filters. The wrong ones won't get through.",
  ],
  money: [
    "Once charged, your stone will protect your abundance field.",
    "Wear it on your LEFT wrist — your receiving hand.",
    "Money is energy that flows TO you before you send it out. The left hand is where opportunity enters.",
    "The stone absorbs scarcity thoughts and blocks before they can settle into your field. Abundance flows cleaner.",
  ],
  purpose: [
    "Once charged, your stone will anchor your emerging purpose.",
    "Wear it on your LEFT wrist — your receiving hand.",
    "Clarity, guidance, signs from the universe — they enter through the left side. That's where intuition lives.",
    "The stone filters the noise. When confusion tries to reach you, it gets absorbed before it clouds your path.",
  ],
  someone: [
    "Once charged, your stone will clarify the connection between you and {personName}.",
    "Wear it on your LEFT wrist — your receiving hand.",
    "Their energy, their thoughts about you, their intentions — it all flows toward your left side first.",
    "The stone filters what reaches you. Truth passes through. Confusion, mixed signals, interference — absorbed before it can twist your perception.",
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
