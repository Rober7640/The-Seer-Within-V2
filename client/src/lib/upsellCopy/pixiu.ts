// Offer 06 — the Wishing Bracelet (Pixiu): the U1 and U2 conversations.
//
// 06 upsells are de-personalized, exactly like 03 (Joel, 2026-09-01) and 02
// before it: the offer is page-only and its booking page collects no
// bucket/person, so /api/backend/upsell/user-data returns bucket:null,
// personName:null. That forces the same two departures from V1's flow that
// judgement.ts documents in full — read that file's header for the why. In
// brief:
//
//   1. bucketMessages must be UNIVERSAL. A null bucket makes V1's bucket-keyed
//      lookup return [], which sends zero U1 bucket messages — and DELIVERY
//      downstream depends on the LEFT-WRIST mechanic they carry. Rather than
//      author new lines (03 did, because its theme is "opening/guard"), 06
//      reuses V1's MONEY bucket VERBATIM: Pixiu is a wealth guardian, the money
//      block is bucket-invariant (no {personName}), its theme ("money flows TO
//      you before you send it out... abundance flows cleaner") is Pixiu's own
//      promise restated, and message 2 is the verbatim left-wrist line.
//   2. U2 must not enter MANIFEST_REVEAL or MANIFEST_PERSONALIZE. With null
//      copy.REVEAL/PERSONALIZE (inherited from V1) those stages fire a live
//      Claude call that POSTs bucket:null → 400 → generic fallback for every
//      buyer. PX_CHAIN_2 routes AROUND both so they are never reachable.
//
// Everything 06-U did NOT rewrite spreads straight from V1_UPSELL1/V1_UPSELL2:
// the opening beats (CONFIRMATION/GAP/RISK/Q1/AFTER_Q1 for U1; PATH_*_OPEN for
// U2) are 06's; everything from SOLUTION / UPSELL2_GAP onward is V1's, unchanged
// (06-U1a / 06-U2a frontmatter). U1 KEEPS QUESTION_1 (06-U1a rewrites it), so
// U1 uses V1_CHAIN_1 unmodified — RISK routes to QUESTION_1, same as V1/03.
//
// Bridge (06-U1a): U1 hangs on 06's real SHIPPING WAIT as the vulnerability
// window — "cargo is not a guardian" — which 02–04 don't have (Bixie is a
// physical object that has to travel). U2 hinge (06-U2a): a guardian HOLDS what
// reaches you; the Manifestation Bracelet CALLS what hasn't reached you yet.

import type { Upsell2Chain, Upsell1Copy, Upsell2Copy } from "./types";
import { V1_UPSELL1, V1_UPSELL2, V1_CHAIN_1, V1_CHAIN_2 } from "./v1";

// ============================================================================
// U1 — the Protection Ritual, bridged off 06's real shipping wait
// ============================================================================

const PX_CONFIRMATION = [
  "It's done, {firstName}. Bixie's ordered — he's being packed to come find you.",
  "He still has real ground to cover before he's actually on your wrist, though. That part isn't instant, however much I wish it were.",
  "But before I let you go, dear, there's something about that stretch of road I need to say.",
];

const PX_GAP = [
  "Once he's on your wrist, Bixie does exactly what I told you he does. No exit. What reaches you stays reached. I'm not walking one word of that back.",
  "But here's what most people don't understand about a guardian that has to be shipped, {firstName}...",
  "A creature sitting in a box, somewhere between here and your door, isn't guarding anything yet. He can't be. He isn't on you.",
  "He becomes what I promised the moment he arrives. Not one day sooner.",
];

const PX_RISK = [
  "And nobody tells you the honest part of a wait like this one.",
  "For however many days it takes him to reach you, you're not one bit safer than you were an hour ago. If anything, less — because now you believe it's already handled.",
  "That belief is its own kind of danger, {firstName}. Thinking you're covered is exactly when you stop doing the small, ordinary things that were covering you before.",
  "I've watched it happen more times than I can count. Someone makes the decision that will finally hold what reaches them, feels the relief of having made it, and lets their guard down in the very days before it arrives.",
  "Bixie promised you a guardian. He never promised you one for the wait.",
];

const PX_QUESTION_1 =
  "Tell me honestly, {firstName} — has something ever reached right up close to your hand, close enough to feel it, and then not been there when you closed your fingers?";

const PX_QUESTION_1_REPLIES = [
  { text: "Yes — more than once", value: "yes" },
  { text: "I think so, yes", value: "maybe" },
  { text: "I'm not sure", value: "unsure" },
];

const PX_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "I thought you might say that. It's the most common answer there is.",
    "That's not bad luck, {firstName}. Reaching your hand isn't the same as closing it around something — and until now, nobody's ever handed you a way to do the second part.",
    "I don't want you spending this particular wait without one.",
  ],
  maybe: [
    "Most people don't notice it until they're looking back at a whole year of it.",
    "Something that was almost yours, more than once, in ways that felt like coincidence at the time. It wasn't.",
    "That's what I want stopped before Bixie ever reaches your door.",
  ],
  unsure: [
    "It's quiet work, the kind that doesn't announce itself. You just notice, one day, that things never quite hold the way they should.",
    "Either way, I'd rather not leave the days ahead of you to chance.",
    "Not while there's still a gap for anything to slip through.",
  ],
  default: [
    "I can tell you know exactly what I mean.",
    "Reaching for a thing and keeping it are two different pieces of work, and Bixie only takes over once he's actually on you.",
    "Let me cover the part he can't reach yet.",
  ],
};

// ── Physical-product copy fixes ─────────────────────────────────────────────
// From SOLUTION onward 06-U1a reuses V1's Protection-Ritual copy verbatim. But a
// few of V1's lines assume the buyer bought V1's Energy CLEARING reading and had
// a live CHAT — neither is true for a page-only Pixiu buyer (she bought a
// physical bracelet, no reading, no conversation). These override just the
// offending lines; everything else stays V1's. (Same class of fix 03 needs.)

const PX_RITUAL = [
  "Here's exactly what I'll do for you, {firstName}...",
  "Tonight, between 2 and 4am — when the veil between worlds is thinnest — I'll begin.",
  "I'll place your stone on my altar, beside a white candle and a vessel of blessed water.",
  // was "the energy signature from our conversation" — there was no conversation.
  "I'll call your spirit forward — the same pull that drew you to Bixie.",
  "Then I'll speak the protection invocation — words passed down through my grandmother's line.",
  "I'll circle your stone with sage smoke seven times, sealing your frequency into it.",
  "The ritual takes about two hours. It drains me... but for those who are ready, it's necessary work.",
  "When I'm done, I'll place your stone under moonlight until dawn to lock the charge.",
];

const PX_OFFER = [
  "The Protection Ritual is {upsellPrice}, {firstName}.",
  "That includes the charged volcanic stone shipped directly to your door.",
  // was "both rituals together — clearing AND protection" — she bought no clearing.
  "Most of my serious clients send their guardian out with this protection around him — the piece that covers the days before he arrives. It's the complete work.",
  "Shall I add your protection to tonight's ritual?",
];

const PX_U1_SUCCESS = [
  "Beautiful choice, {firstName}.",
  // was "Both rituals ... clearing AND protection" — the pair is Bixie + protection.
  "Your protection is confirmed — the ritual, and the charged stone that carries it.",
  "I'll perform it tonight. The work will be deeper this way.",
  "Your charged volcanic stone will ship within 48 hours.",
  "I just need to know where to send it.",
];

const PX_U1_SHIPPING_CONFIRMED = [
  "Perfect. Your protection stone is on its way, {firstName}.",
  "Remember — when it arrives, hold it and say: 'I am protected. I am transforming.'",
  "That seals the bond.",
  "Tonight, as I work, you may feel warmth or have vivid dreams. That's normal. That's me.",
  // was "your clearing reading arrives within 24 hours" — no reading; a real object ships.
  "Your stone ships within 48 hours, and Bixie follows in the weeks after. Watch for both.",
  "Thank you for trusting me with this sacred work, {firstName}.",
  "The universe is already responding to your decision. I can feel it shifting.",
];

const PX_U1_SOFT_DECLINE = [
  "I understand, {firstName}. It's your journey to walk.",
  "Just... be mindful over the next 30 days.",
  "If you feel the old heaviness returning, or patterns creeping back in, know that I'm here.",
  "The protection ritual is always available if you change your mind.",
  // was "your clearing reading will arrive within 24 hours" + "during the work" (no work on a decline).
  "For now, watch for Bixie — he's on his way to you.",
  "Take care of yourself, dear.",
];

export const PIXIU_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: PX_CONFIRMATION,
  GAP: PX_GAP,
  RISK: PX_RISK,
  QUESTION_1: PX_QUESTION_1,
  QUESTION_1_REPLIES: PX_QUESTION_1_REPLIES,
  AFTER_Q1: PX_AFTER_Q1,
  RITUAL: PX_RITUAL,
  OFFER: PX_OFFER,
  SUCCESS: PX_U1_SUCCESS,
  SHIPPING_CONFIRMED: PX_U1_SHIPPING_CONFIRMED,
  SOFT_DECLINE: PX_U1_SOFT_DECLINE,
  // Universal — page-only 06 has no bucket. Reuse V1's MONEY block verbatim
  // (bucket-invariant, no {personName}, carries the LEFT-WRIST line DELIVERY
  // needs); ignores both args, always returns the same set. See file header.
  bucketMessages: () => V1_UPSELL1.bucketMessages("money", null),
  // Keeps the question — RISK routes to QUESTION_1, same as V1/03.
  chain: V1_CHAIN_1,
  acceptLabel: "Yes, cover the wait",
  placeholderNames: ["Friend"],
};

// ============================================================================
// U2 — the Manifestation Bracelet (a guardian holds; the bracelet calls)
// ============================================================================

const PX_PATH_A_OPEN = [
  "{firstName}... both are confirmed now. Your Pixiu, and your protection alongside him. I'm glad you're not sending him to travel alone.",
  "Your lava stone holds your left side too — the same side Pixiu already guards — while you wait for him to reach you.",
  "But I want to ask you something before he arrives, and I want an honest answer...",
  "When what's yours is guarded on both counts, {firstName}... when nothing that reaches you can slip back out... what then?",
  "Pixiu holds what reaches you. The stone keeps watch while you wait for him. What neither one of them does is go out and bring something new back to you.",
  "A guardian is about what stays. Protection is about what doesn't get in. But what about what hasn't found you yet, {firstName}?",
];

const PX_PATH_B_OPEN = [
  "{firstName}... I respect your decision about the protection. Pixiu doesn't need it — he was built to guard on his own, and he'll do that work whether or not anything travels beside him.",
  "But there's a piece of him I only told you half of, and I'd rather finish it than leave it sitting.",
  "It isn't about the mouth, or the claws, or the seal. You already have all of that.",
  "It's about the horns.",
  "Two of them make him Bixie — the guardian, not the puller. He holds what reaches you. He was never built to go get you something new. That's not a flaw in him. It was just never his job.",
  "So here's the honest question underneath all of it, {firstName}: if he only guards what already reaches you... what calls the rest of it toward you in the first place?",
];

// Routes AROUND both Claude stages so neither is ever entered — identical
// technique to judgement.ts's JD_CHAIN_2 (see its comment for the edge-by-edge
// reasoning): PATH_*_OPEN → GAP (V1's post-MANIFEST_REVEAL stage), AFTER_Q2 →
// RITUAL_INSTRUCTION (V1's post-MANIFEST_PERSONALIZE stage). Nothing then points
// at MANIFEST_REVEAL / MANIFEST_PERSONALIZE, so no Claude fetch ever fires. The
// interactive Q2 quick-reply is kept (it captures no personalization).
const PX_CHAIN_2: Upsell2Chain = {
  ...V1_CHAIN_2,
  PATH_A_OPEN: "GAP",
  PATH_B_OPEN: "GAP",
  AFTER_Q2: "RITUAL_INSTRUCTION",
};

// ── Physical-product copy fixes (U2) ────────────────────────────────────────
// V1's Manifestation-Bracelet copy is built around "you just did a CLEARING, now
// attract" and a live CHAT. Neither fits Pixiu — she bought a guardian that HOLDS
// what reaches her, on a page, no conversation. These re-point the "clearing"
// beats onto Bixie (holds vs calls — the same hinge the openers set up) and drop
// the chat references. Structure, stones, prices and wrists are unchanged.

const PX_U2_GAP = [
  // was "The clearing will remove what's been standing in the way."
  "Bixie will hold everything that reaches you. That I promise you.",
  // was "removing a wall isn't the same as opening a door"
  "But holding what comes isn't the same as calling new things toward you, {firstName}.",
  // was "you can clear every block... protect yourself from anything returning"
  "Think about it... you can guard everything you have. You can keep anything from slipping back out. But if you're not actively calling in what you want...",
  "You're just standing in an empty room. Safe, but alone.",
];

const PX_U2_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "Good. That's your intuition speaking. It already knows what's missing.",
    // was "The clearing opens the space."
    "Bixie holds the space. But something needs to fill it... or the old patterns will.",
  ],
  maybe: [
    // was "once the clearing is done"
    "It's subtle. But you'll feel it clearly once Bixie is on your wrist.",
    "There'll be a lightness... and then a quiet voice asking, \"Now what?\" That's the moment this is for.",
  ],
  what: [
    // was "clearing a block is like pulling weeds from a garden"
    "Think of it this way — a guardian keeps what you have safe. But it doesn't go out and bring you more.",
    "Calling in what you want — that's a different kind of work entirely.",
  ],
  default: [
    "I can sense you understand more than you realize.",
    "Let me show you what I mean.",
  ],
};

const PX_INTRODUCE = [
  "That's why I created something specific for this moment.",
  // was "Not for protection. Not for clearing. For attraction."
  "Not for holding. Not for guarding. For attraction.",
  "A bracelet made of eight stones — each one chosen for its ability to draw specific energies toward you.",
  "I call it a Manifestation Bracelet. And I only offer it to seekers whose energy is ready to receive.",
  // was "I felt it the moment we began talking." — there was no conversation.
  "Yours is, {firstName}. I felt it the moment you reached for Bixie.",
];

const PX_STONES = [
  "Eight stones, {firstName}. Each one pulls a different piece of your desire toward you.",
  "Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected opportunities. The things you've been asking the universe for... this stone helps them find you.",
  "Citrine — the merchant's stone. It's been carried by traders and seekers of abundance for centuries. It doesn't just attract wealth... it attracts the confidence to receive it. The feeling that you deserve what's coming.",
  // was "Once the block is cleared, signs and synchronicities will start appearing."
  "Amethyst — your intuition amplifier. Once Bixie is holding your side, signs and synchronicities will start appearing. This stone helps you SEE them. The universe is always speaking, {firstName}. Amethyst helps you listen.",
  "Tiger's Eye — the stone of bold action. It attracts the opportunities that require courage. The ones you'd normally hesitate on. And then it gives you the nerve to say yes.",
  "And four more working together — Clear Quartz to amplify every intention you set... Hematite to ground your manifestations into physical reality... Pyrite to broadcast abundance frequency outward... and Malachite to pull transformation and growth toward you like a magnet.",
  // was "All tuned to your frequency during tonight's clearing."
  "Eight stones. Eight signals. All tuned to your frequency the night your bracelet is made.",
];

const PX_U2_AFTER_Q2: Record<string, string[]> = {
  yes: [
    "I'm not surprised. The stone that calls to you loudest is the one doing the most work for your energy right now.",
    "Let me tell you specifically what it means for YOUR situation...",
  ],
  all: [
    "That tells me something powerful, {firstName}. When all eight stones speak to you... it means your energy is ready for all of it.",
    "But there's one that matters most for where you are right now. Let me show you.",
  ],
  more: [
    // was "connect them to what you told me earlier" — there was no conversation.
    "Of course. Let me connect them to what you're calling in — what you actually want.",
    "Because these stones aren't random. They're specific to you.",
  ],
  default: [
    "The connection between you and these stones is already forming, {firstName}.",
    "Let me show you which one speaks loudest to your energy...",
  ],
};

const PX_WHAT_RECEIVE = [
  // was "during tonight's clearing... the frequency of what you told me you want most"
  "I'll attune each stone to your desire as your bracelet is made. By the time it reaches you, it will already carry the frequency of what you're calling in.",
  "You'll also receive a manifestation guide — a daily 3-minute ritual to activate the bracelet each morning. It's simple. But my seekers tell me it's the most powerful part of their day.",
  "Most of them start noticing shifts within the first week. Small things at first — a feeling, a coincidence, a conversation that seems too perfectly timed. Then bigger.",
];

export const PIXIU_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: PX_PATH_A_OPEN,
  PATH_B_OPEN: PX_PATH_B_OPEN,
  GAP: PX_U2_GAP,
  AFTER_Q1: PX_U2_AFTER_Q1,
  INTRODUCE: PX_INTRODUCE,
  STONES: PX_STONES,
  AFTER_Q2: PX_U2_AFTER_Q2,
  WHAT_RECEIVE: PX_WHAT_RECEIVE,
  // REVEAL/PERSONALIZE stay inherited (null) but are now UNREACHABLE — the chain
  // skips MANIFEST_REVEAL and MANIFEST_PERSONALIZE. Kept only to satisfy the type.
  chain: PX_CHAIN_2,
  placeholderNames: ["Friend"],
};
