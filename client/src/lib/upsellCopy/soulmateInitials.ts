// Offer 10 — the Soulmate Initials Reading (Evelyn VSL funnel): the U1 and U2
// conversations.
//
// Spec: docs/superpowers/specs/2026-10-12-evelyn-video-funnel-design.md §5.
// Modelled on heartCleanser.ts (09) — read its header first for the general shape.
// This funnel is page-only, same as 09/06/03: `/evelyn/checkout` collects no
// bucket/person, so /api/backend/upsell/user-data returns bucket:null,
// personName:null. The same two departures from V1 follow:
//
//   1. bucketMessages is UNIVERSAL. A null bucket makes V1's lookup return [], and
//      DELIVERY depends on the LEFT-WRIST line the bucket block carries. 10 is a
//      universal love/soulmate reading, so it reuses V1's LOVE block verbatim.
//   2. U2 never enters MANIFEST_REVEAL / MANIFEST_PERSONALIZE. With null REVEAL /
//      PERSONALIZE those stages POST bucket:null to Claude → 400 → generic fallback.
//      SI_CHAIN_2 routes around both, exactly as HC_CHAIN_2 / PX_CHAIN_2 / JD_CHAIN_2 do.
//
// Unlike 09 (a shipped charm), 10's own product is a DIGITAL reading delivered by
// email — there is no "shipping wait" to bridge off, so U1's confirmation beats
// hinge on the reading being prepared, not a parcel travelling. U1/U2's own products
// (Protection Ritual lava stone, Manifestation Bracelet — rose quartz/jade/garnet
// stay exactly as V1 wrote them) ARE physical and still ship, which V1's SUCCESS /
// SHIPPING_CONFIRMED / DELIVERY lines already describe correctly — those are kept
// by reference below.
//
// COPY RULE (brief, verbatim): "cards", never "tarot" — the Soulmate Initials
// Reading reads cards, but this buyer never bought a reading called a "tarot"
// reading. soulmateInitials.test.ts walks every reachable string and fails on
// "tarot" (case-insensitive) and on any "clearing ritual" leftover from V1.
//
// Verbatim V1 lines are referenced by index (UPSELL_RITUAL[0]), never retyped, so V1
// stays the single source of those words.

import type { Upsell1Copy, Upsell2Chain, Upsell2Copy } from "./types";
import { V1_UPSELL1, V1_UPSELL2, V1_CHAIN_1, V1_CHAIN_2 } from "./v1";
import {
  UPSELL_RITUAL,
  UPSELL_OFFER,
  UPSELL_SUCCESS,
  UPSELL_SHIPPING_CONFIRMED,
  UPSELL_SOFT_DECLINE,
  UPSELL_DELIVERY,
} from "@/lib/upsellMessages";
import {
  UPSELL2_GAP,
  UPSELL2_AFTER_Q1,
  UPSELL2_INTRODUCE,
  UPSELL2_AFTER_Q2,
  UPSELL2_WHAT_RECEIVE,
  UPSELL2_DOWNSELL,
  UPSELL2_SUCCESS,
  UPSELL2_SUCCESS_HAS_SHIPPING,
  UPSELL2_SUCCESS_NEEDS_SHIPPING,
  UPSELL2_SHIPPING_CONFIRMED,
  UPSELL2_SOFT_DECLINE,
} from "@/lib/upsell2Messages";

// ============================================================================
// U1 — the Protection Ritual, bridged off her Soulmate Initials Reading being
// prepared (no shipping wait — 10's own product is digital)
// ============================================================================

// ── Opening beats ───────────────────────────────────────────────────────────

const SI_CONFIRMATION = [
  "It's done, {firstName}. Your Soulmate Initials Reading is confirmed, and it arrives by email within 24 hours.",
  "I'll begin the work tonight.",
  "Before I let you go, dear, there's something about tonight's work I want you to hear.",
];

const SI_GAP = [
  "Once I lay your cards and see his initials, that knowledge opens a door in you — a door that wasn't open this morning.",
  "But here's what nobody mentions about the hours between now and your reading landing in your inbox, {firstName}...",
  "You've already decided you're ready to know. You decided it today, the moment you asked for your reading.",
  "Your reading is still being prepared. It hasn't reached you yet.",
];

const SI_RISK = [
  "And those hours in between are the ones I'd ask you to be careful with.",
  "Deciding you're ready to know opens you up. You want that. But you open up to everyone at once, including the people who took from you before.",
  "The conversation you promised yourself you'd stop reopening. The one who only calls when he's lonely. The voice telling you you're asking for too much.",
  "I've watched it happen more times than I'd like, {firstName}. Someone finally makes room to be found, and the first thing through the door is the very thing they made room to get away from.",
  "Your reading holds his initials. Standing guard over who gets close while you wait for it was never what it's for.",
];

const SI_QUESTION_1 =
  "Tell me honestly, {firstName}. The last time you felt ready to try again, did someone from before turn up at almost exactly that moment?";

const SI_QUESTION_1_REPLIES = [
  { text: "Yes — that's happened to me", value: "yes" },
  { text: "I think so, yes", value: "maybe" },
  { text: "I'm not sure", value: "unsure" },
];

const SI_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "I thought you might say that. You're far from the only one.",
    "Nobody has to send them, {firstName}. They turn up because a door has opened, and they already know the way in.",
    "I don't want these hours to go that way for you.",
  ],
  maybe: [
    "Most people only see it looking back.",
    "A message in the same week you'd finally stopped checking. An old flame at the party you nearly didn't go to.",
    "I'd like these hours covered before your reading reaches you.",
  ],
  unsure: [
    "Then let's not wait to find out.",
    "For the next while you'll be more open than you've been in a long time.",
    "I'd rather someone was keeping watch while that's true.",
  ],
  default: [
    "I can tell you know what I mean.",
    "Your reading is for what's ahead. Who gets close to you while it's being prepared is a separate matter.",
    "Let me look after that part.",
  ],
};

// ── Downstream line fixes (same pattern heartCleanser.ts / pixiu.ts override) ──

// Index 3 only. V1's line names a chat 10's page-only buyer never had.
const SI_RITUAL = [
  UPSELL_RITUAL[0],
  UPSELL_RITUAL[1],
  UPSELL_RITUAL[2],
  "I'll call your spirit forward, by the same wish that drew you to your Soulmate Initials Reading.",
  UPSELL_RITUAL[4],
  UPSELL_RITUAL[5],
  UPSELL_RITUAL[6],
  UPSELL_RITUAL[7],
];

// Index 2 only. V1's line pairs the stone with a product she didn't buy.
// Index 0 carries {upsellPrice} — keep it by reference, never a typed price.
const SI_OFFER = [
  UPSELL_OFFER[0],
  UPSELL_OFFER[1],
  "If you were sitting with me, I'd tell you to have both. Your Soulmate Initials Reading for what's ahead, and the stone for the hours while it's being prepared.",
  UPSELL_OFFER[3],
];

// Index 1 and 2 rewritten. 10's booking already took her email (and birth date),
// so the shipping address is the only thing still owed — the same shape 09's
// U1_SUCCESS keeps for its own second product.
const SI_U1_SUCCESS = [
  UPSELL_SUCCESS[0],
  "Your protection is set. The reading, and the charged stone that holds it.",
  "I'll do the work tonight.",
  UPSELL_SUCCESS[3],
  UPSELL_SUCCESS[4],
];

// Index 4 only. V1's line conflates the reading promise with this one, which
// already carries its own "arrives by email" line in CONFIRMATION.
const SI_U1_SHIPPING_CONFIRMED = [
  UPSELL_SHIPPING_CONFIRMED[0],
  UPSELL_SHIPPING_CONFIRMED[1],
  UPSELL_SHIPPING_CONFIRMED[2],
  UPSELL_SHIPPING_CONFIRMED[3],
  "Watch your inbox for your Soulmate Initials Reading, and for your stone's tracking email.",
  UPSELL_SHIPPING_CONFIRMED[5],
  UPSELL_SHIPPING_CONFIRMED[6],
];

// Index 1 and 4 rewritten. Index 4 of V1 mentions "tonight's work" in a way that
// now collides with the reading's own 24-hour promise.
const SI_U1_SOFT_DECLINE = [
  UPSELL_SOFT_DECLINE[0],
  "Just... be careful who you let close while your reading is being prepared.",
  UPSELL_SOFT_DECLINE[2],
  UPSELL_SOFT_DECLINE[3],
  "For now, watch your inbox. Your Soulmate Initials Reading arrives by email within 24 hours.",
  UPSELL_SOFT_DECLINE[5],
];

// Index 4 only — ties the stone's protection window to THIS reading, not the
// generic "energy field" premise V1/06/09 share.
const SI_DELIVERY = [
  UPSELL_DELIVERY[0],
  UPSELL_DELIVERY[1],
  UPSELL_DELIVERY[2],
  UPSELL_DELIVERY[3],
  "The protection holds strong for at least 30 days, longer for most people. Long enough to see you through the hours your reading is travelling to you.",
];

export const SOULMATE_INITIALS_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: SI_CONFIRMATION,
  GAP: SI_GAP,
  RISK: SI_RISK,
  QUESTION_1: SI_QUESTION_1,
  QUESTION_1_REPLIES: SI_QUESTION_1_REPLIES,
  AFTER_Q1: SI_AFTER_Q1,
  RITUAL: SI_RITUAL,
  OFFER: SI_OFFER,
  SUCCESS: SI_U1_SUCCESS,
  SHIPPING_CONFIRMED: SI_U1_SHIPPING_CONFIRMED,
  SOFT_DECLINE: SI_U1_SOFT_DECLINE,
  DELIVERY: SI_DELIVERY,
  // Universal — page-only 10 has no bucket. V1's LOVE block verbatim: no {personName},
  // carries the LEFT-WRIST line DELIVERY depends on. Ignores both args.
  bucketMessages: () => V1_UPSELL1.bucketMessages("love", null),
  // Keeps the question — RISK routes to QUESTION_1, same as V1, 03, 06 and 09.
  chain: V1_CHAIN_1,
  acceptLabel: "Yes, guard who gets close",
  placeholderNames: ["Friend"],
};

// ============================================================================
// U2 — the Manifestation Bracelet (bracelet stones stay rose quartz/jade/garnet,
// exactly as V1 wrote them — they are not the stone she chose at checkout)
// ============================================================================

// ── Opening beats ───────────────────────────────────────────────────────────

const SI_PATH_A_OPEN = [
  "{firstName}... both are confirmed now. Your Soulmate Initials Reading, and your protection stone to go with it.",
  "Your lava stone goes on your left wrist, the receiving side — it keeps watch over who gets close while your reading is prepared.",
  "But there's one thing I want to ask you before your reading arrives...",
  "Your cards will show you his initials, {firstName}, where and when you're likely to meet him, what he's like.",
  "That reading tells you what's coming IN to you. The stone guards it.",
  "So what's reaching OUT? What lets the love you're ready for know where to find you, {firstName}?",
];

const SI_PATH_B_OPEN = [
  "{firstName}... I respect your decision about the stone. Your reading doesn't need it, and it'll reach you just the same.",
  "But I left one part of tonight's work out of my letters, and you should have it before your reading arrives.",
  "Your cards are already being laid.",
  "What I left out is your other wrist.",
  "Your left wrist is the receiving side. That's where your reading's answers land, once they reach you.",
  "Your right wrist is the side that reaches out, {firstName}, and right now there's nothing on it. So what tells the love you're ready for where to find you?",
];

// Routes AROUND both Claude stages — identical to HC_CHAIN_2 / PX_CHAIN_2 / JD_CHAIN_2:
// PATH_*_OPEN → GAP (V1's post-MANIFEST_REVEAL stage), AFTER_Q2 → RITUAL_INSTRUCTION
// (V1's post-MANIFEST_PERSONALIZE stage). Nothing then points at either AI stage.
const SI_CHAIN_2: Upsell2Chain = {
  ...V1_CHAIN_2,
  PATH_A_OPEN: "GAP",
  PATH_B_OPEN: "GAP",
  AFTER_Q2: "RITUAL_INSTRUCTION",
};

// ── Downstream line fixes (same pattern heartCleanser.ts / pixiu.ts override) ──

// Index 0–2 rewritten; index 3 ("You're just standing in an empty room…") is V1's, kept.
const SI_U2_GAP = [
  "Your reading will tell you who's coming and keep your receiving side guarded. That part is settled.",
  "But knowing who's coming isn't the same as reaching out for him, {firstName}.",
  "Think about it... you can know his initials, where you'll meet, what he's like. But if nothing about you is reaching out...",
  UPSELL2_GAP[3],
];

const SI_U2_AFTER_Q1: Record<string, string[]> = {
  yes: [
    UPSELL2_AFTER_Q1.yes[0],
    "Your reading tells you who he is. Something else has to reach outward, into the rooms you'll meet him in.",
  ],
  maybe: [
    "It's subtle. You'll feel it clearly once your reading is in your hands.",
    "There'll be a quiet morning after you've read his initials... and a small voice asking, \"Now what?\" That's the moment this is for.",
  ],
  what: [
    "Think of it this way. Your left hand is held open, ready to take what's offered. Your right hand is the one that waves someone over.",
    "Waving someone over — reaching out for what you want — that's a different kind of work entirely.",
  ],
  default: UPSELL2_AFTER_Q1.default,
};

// Index 1 and 4 rewritten. "Not for holding a reading" is the line that keeps the
// two products apart.
const SI_INTRODUCE = [
  UPSELL2_INTRODUCE[0],
  "Not for holding a reading. Not for protection. For attraction.",
  UPSELL2_INTRODUCE[2],
  UPSELL2_INTRODUCE[3],
  "Yours is, {firstName}. I felt it the moment you chose your stone.",
];

// Static — V1's stones (Green Aventurine, Citrine, Amethyst, Tiger's Eye, Clear
// Quartz, Hematite, Pyrite, Malachite) kept exactly as written; rose quartz/jade/
// garnet are what SHE chose for her reading, not what's on this bracelet, so the
// stone list is not renamed. Index 6 only — "during tonight's clearing" names a
// product she never bought.
const SI_STONES: Upsell2Copy["STONES"] = (() => {
  const base = V1_UPSELL2.STONES;
  return [...base.slice(0, 6), "Eight stones. Eight signals. All tuned to your frequency before your bracelet ships."];
})();

// Each branch hands off to RITUAL_INSTRUCTION (the right wrist) — the chain skips the
// personalised stone read, so nothing here may promise one.
const SI_U2_AFTER_Q2: Record<string, string[]> = {
  yes: [
    UPSELL2_AFTER_Q2.yes[0],
    "Keep that one in mind. Now let me tell you which wrist the bracelet goes on, because it matters.",
  ],
  all: [
    UPSELL2_AFTER_Q2.all[0],
    "Now let me tell you which wrist it goes on, because that matters as much as the stones.",
  ],
  more: [
    "Of course. Every one of them points outward, toward the love you're ready to receive.",
    "And the wrist you wear it on matters just as much.",
  ],
  default: [
    UPSELL2_AFTER_Q2.default[0],
    "Let me tell you which wrist it goes on.",
  ],
};

// Index 0 rewritten; 1–2 are V1's.
const SI_WHAT_RECEIVE = [
  "I'll attune each stone to the love you're ready to receive before your bracelet ships. By the time it reaches you, it will already carry that frequency.",
  UPSELL2_WHAT_RECEIVE[1],
  UPSELL2_WHAT_RECEIVE[2],
];

// ── Beyond the opening beats — V1's inherited blocks name a product she never
// bought, so these are overridden too (same set heartCleanser.ts overrides). ──

const SI_URGENCY = [
  "The easiest time to add the bracelet is now, {firstName}, while your order is still open.",
  "Your reading will reach you either way. I promise you that.",
  "But if you want your right wrist reaching out while your left wrist receives... this is the moment.",
];

// Index 2 only. Index 4 is V1's price line — kept by reference, never retyped.
const SI_DOWNSELL = [
  UPSELL2_DOWNSELL[0],
  UPSELL2_DOWNSELL[1],
  "I have a bracelet that's already been cleansed and prepared — it just hasn't been attuned to anyone yet. It won't carry the full personal charge a fresh one would...",
  UPSELL2_DOWNSELL[3],
  UPSELL2_DOWNSELL[4],
  UPSELL2_DOWNSELL[5],
];

const SI_ATTUNED = "Your Manifestation Bracelet will be attuned before it ships.";

const SI_U2_SUCCESS = [
  UPSELL2_SUCCESS[0],
  SI_ATTUNED,
  UPSELL2_SUCCESS[2],
  UPSELL2_SUCCESS[3],
];

// Index 3 is 10's own: ships to the same address as her protection stone, reached
// by buyers who declined the stone and still have checkout details on file.
const SI_U2_SUCCESS_HAS_SHIPPING = [
  UPSELL2_SUCCESS_HAS_SHIPPING[0],
  SI_ATTUNED,
  UPSELL2_SUCCESS_HAS_SHIPPING[2],
  "I'll send your Manifestation Bracelet to the same address as your protection stone.",
];

const SI_U2_SUCCESS_NEEDS_SHIPPING = [
  UPSELL2_SUCCESS_NEEDS_SHIPPING[0],
  SI_ATTUNED,
  UPSELL2_SUCCESS_NEEDS_SHIPPING[2],
  UPSELL2_SUCCESS_NEEDS_SHIPPING[3],
  UPSELL2_SUCCESS_NEEDS_SHIPPING[4],
];

// Index 3 only.
const SI_U2_SHIPPING_CONFIRMED = [
  UPSELL2_SHIPPING_CONFIRMED[0],
  UPSELL2_SHIPPING_CONFIRMED[1],
  UPSELL2_SHIPPING_CONFIRMED[2],
  "Watch your inbox for your Soulmate Initials Reading, too — it arrives by email within 24 hours.",
  UPSELL2_SHIPPING_CONFIRMED[4],
  UPSELL2_SHIPPING_CONFIRMED[5],
];

// Index 0, 2 and 3.
const SI_U2_SOFT_DECLINE = [
  "I understand, {firstName}. Your reading will be a lovely thing to have on its own.",
  UPSELL2_SOFT_DECLINE[1],
  "Watch your inbox. Your Soulmate Initials Reading arrives by email within 24 hours.",
  UPSELL2_SOFT_DECLINE[3],
];

export const SOULMATE_INITIALS_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: SI_PATH_A_OPEN,
  PATH_B_OPEN: SI_PATH_B_OPEN,
  GAP: SI_U2_GAP,
  AFTER_Q1: SI_U2_AFTER_Q1,
  INTRODUCE: SI_INTRODUCE,
  STONES: SI_STONES,
  AFTER_Q2: SI_U2_AFTER_Q2,
  WHAT_RECEIVE: SI_WHAT_RECEIVE,
  URGENCY: SI_URGENCY,
  DOWNSELL: SI_DOWNSELL,
  SUCCESS: SI_U2_SUCCESS,
  SUCCESS_HAS_SHIPPING: SI_U2_SUCCESS_HAS_SHIPPING,
  SUCCESS_NEEDS_SHIPPING: SI_U2_SUCCESS_NEEDS_SHIPPING,
  SHIPPING_CONFIRMED: SI_U2_SHIPPING_CONFIRMED,
  SOFT_DECLINE: SI_U2_SOFT_DECLINE,
  // REVEAL/PERSONALIZE stay inherited (null) but are UNREACHABLE — see SI_CHAIN_2.
  chain: SI_CHAIN_2,
  downsellDeclineLabel: "No thanks, just my reading",
  placeholderNames: ["Friend"],
};
