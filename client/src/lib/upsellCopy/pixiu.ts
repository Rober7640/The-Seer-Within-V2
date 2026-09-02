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

export const PIXIU_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: PX_CONFIRMATION,
  GAP: PX_GAP,
  RISK: PX_RISK,
  QUESTION_1: PX_QUESTION_1,
  QUESTION_1_REPLIES: PX_QUESTION_1_REPLIES,
  AFTER_Q1: PX_AFTER_Q1,
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

export const PIXIU_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: PX_PATH_A_OPEN,
  PATH_B_OPEN: PX_PATH_B_OPEN,
  // REVEAL/PERSONALIZE stay inherited (null) but are now UNREACHABLE — the chain
  // skips MANIFEST_REVEAL and MANIFEST_PERSONALIZE. Kept only to satisfy the type.
  chain: PX_CHAIN_2,
  placeholderNames: ["Friend"],
};
