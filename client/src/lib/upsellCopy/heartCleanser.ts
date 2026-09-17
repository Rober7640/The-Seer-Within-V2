// Offer 09 — the Heart Cleanser Love Charm: the U1 and U2 conversations.
//
// Spec: improve-v1/v1-one-time-BEs/docs/09/upsells/09-U1a-upsell1-opening-beats.md
//       improve-v1/v1-one-time-BEs/docs/09/upsells/09-U2a-upsell2-opening-beats.md
// Ported from those files' TS-ready blocks as written (draft, awaiting operator
// review) — change the doc first, then this file.
//
// 09 is page-only like 06 (pixiu.ts — read its header for the full why): the booking
// page collects no bucket/person, so /api/backend/upsell/user-data returns
// bucket:null, personName:null. The same two departures from V1 follow:
//
//   1. bucketMessages is UNIVERSAL. A null bucket makes V1's lookup return [], and
//      DELIVERY depends on the LEFT-WRIST line the bucket block carries. 09 is a love
//      charm, so it reuses V1's LOVE block verbatim (06 reused MONEY).
//   2. U2 never enters MANIFEST_REVEAL / MANIFEST_PERSONALIZE. With null REVEAL /
//      PERSONALIZE those stages POST bucket:null to Claude → 400 → generic fallback.
//      HC_CHAIN_2 routes around both, exactly as PX_CHAIN_2 / JD_CHAIN_2 do.
//
// Beyond pixiu's set, 09 also overrides U1 DELIVERY and U2 URGENCY → SOFT_DECLINE and
// downsellDeclineLabel: pixiu inherits those from V1, so a 06 buyer still reads
// "tonight's clearing" and "just the clearing". heartCleanser.test.ts walks every
// reachable string and fails on any of that.
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
  UPSELL2_STONES,
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
// U1 — the Protection Ritual, bridged off the charm's real shipping wait (09-U1a)
// ============================================================================

// ── Opening beats ───────────────────────────────────────────────────────────

const HC_CONFIRMATION = [
  "It's done, {firstName}. Your Heart Cleanser Love Charm is ordered, and it ships within 2 business days.",
  "Then it has real distance to cover. 7–14 days if you're in the US, 2–4 weeks if you're anywhere else.",
  "Before I let you go, dear, there's something about that wait I want you to hear.",
];

const HC_GAP = [
  "Once it's on your left wrist with your wish inside, your charm gives that wish a place on your receiving side, close enough to touch every morning.",
  "But here's what nobody mentions about ordering something you have to wait for, {firstName}...",
  "You've already decided you're ready to receive love, too. You decided it today, when you ordered.",
  "Your charm is still in a box, a long way from your wrist.",
];

const HC_RISK = [
  "And those days in between are the ones I'd ask you to be careful with.",
  "Deciding you're ready to receive love opens you up. You want that. But you open up to everyone at once, including the people who took from you before.",
  "The conversation you promised yourself you'd stop reopening. The one who only calls when he's lonely. The voice telling you you're asking for too much.",
  "I've watched it happen more times than I'd like, {firstName}. Someone finally makes room for love, and the first thing through the door is the very thing they made room to get away from.",
  "Your charm holds your wish. Standing guard over who gets close was never what it's for.",
];

const HC_QUESTION_1 =
  "Tell me honestly, {firstName}. The last time you felt ready to try again, did someone from before turn up at almost exactly that moment?";

const HC_QUESTION_1_REPLIES = [
  { text: "Yes — that's happened to me", value: "yes" },
  { text: "I think so, yes", value: "maybe" },
  { text: "I'm not sure", value: "unsure" },
];

const HC_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "I thought you might say that. You're far from the only one.",
    "Nobody has to send them, {firstName}. They turn up because a door has opened, and they already know the way in.",
    "I don't want these weeks to go that way for you.",
  ],
  maybe: [
    "Most people only see it looking back.",
    "A message in the same week you'd finally stopped checking. An old flame at the party you nearly didn't go to.",
    "I'd like those weeks covered before your charm reaches you.",
  ],
  unsure: [
    "Then let's not wait to find out.",
    "For the next few weeks you'll be more open than you've been in a long while.",
    "I'd rather someone was keeping watch while that's true.",
  ],
  default: [
    "I can tell you know what I mean.",
    "Your charm is for your wish. Who gets close to you while it travels is a separate matter.",
    "Let me look after that part.",
  ],
};

// ── Downstream line fixes (same set pixiu.ts overrides) ─────────────────────

// Index 3 only. V1's line names a chat 09's buyer never had.
const HC_RITUAL = [
  UPSELL_RITUAL[0],
  UPSELL_RITUAL[1],
  UPSELL_RITUAL[2],
  "I'll call your spirit forward, by the same wish that drew you to your charm.",
  UPSELL_RITUAL[4],
  UPSELL_RITUAL[5],
  UPSELL_RITUAL[6],
  UPSELL_RITUAL[7],
];

// Index 2 only. V1's line pairs the stone with a product she didn't buy.
// Index 0 carries {upsellPrice} — keep it by reference, never a typed price.
const HC_OFFER = [
  UPSELL_OFFER[0],
  UPSELL_OFFER[1],
  "If you were sitting with me, I'd tell you to have both. Your charm for your wish, and the stone for the weeks it's travelling.",
  UPSELL_OFFER[3],
];

// Index 1, 2 and 4. Index 4 is 09's own: the booking already took her address, so the engine
// skips the shipping form (Joel, 2026-09-16) and V1's "where to send it" line would be false.
const HC_U1_SUCCESS = [
  UPSELL_SUCCESS[0],
  "Your protection is set. The ritual, and the charged stone that holds it.",
  "I'll do the work tonight.",
  UPSELL_SUCCESS[3],
  "Your stone goes to the same address as your Heart Cleanser Love Charm. There's nothing more I need from you.",
];

// Index 4 only. V1's line promises a reading by email; 09's buyer has a charm on the way.
const HC_U1_SHIPPING_CONFIRMED = [
  UPSELL_SHIPPING_CONFIRMED[0],
  UPSELL_SHIPPING_CONFIRMED[1],
  UPSELL_SHIPPING_CONFIRMED[2],
  UPSELL_SHIPPING_CONFIRMED[3],
  "Watch for your stone at your door, and for your charm's tracking email in your inbox.",
  UPSELL_SHIPPING_CONFIRMED[5],
  UPSELL_SHIPPING_CONFIRMED[6],
];

// Index 1, 4 and 5. Index 4 of V1 promises a reading; index 5 mentions tonight's work on a decline.
const HC_U1_SOFT_DECLINE = [
  UPSELL_SOFT_DECLINE[0],
  "Just... be careful who you let close while your charm is on its way.",
  UPSELL_SOFT_DECLINE[2],
  UPSELL_SOFT_DECLINE[3],
  "For now, watch your inbox. Your charm ships within 2 business days, and I'll send you the tracking link.",
  "Take care of yourself, dear.",
];

// ── Beyond pixiu's set ──────────────────────────────────────────────────────
// Index 4 only. pixiu.ts and judgement.ts both inherit V1's line here ("…for your
// energy field to fully heal"), which ties the stone to a premise 09 never sold.
const HC_DELIVERY = [
  UPSELL_DELIVERY[0],
  UPSELL_DELIVERY[1],
  UPSELL_DELIVERY[2],
  UPSELL_DELIVERY[3],
  "The protection holds strong for at least 30 days, longer for most people. Long enough to see you through the weeks your charm is travelling.",
];

export const HEART_CLEANSER_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: HC_CONFIRMATION,
  GAP: HC_GAP,
  RISK: HC_RISK,
  QUESTION_1: HC_QUESTION_1,
  QUESTION_1_REPLIES: HC_QUESTION_1_REPLIES,
  AFTER_Q1: HC_AFTER_Q1,
  RITUAL: HC_RITUAL,
  OFFER: HC_OFFER,
  SUCCESS: HC_U1_SUCCESS,
  SHIPPING_CONFIRMED: HC_U1_SHIPPING_CONFIRMED,
  SOFT_DECLINE: HC_U1_SOFT_DECLINE,
  DELIVERY: HC_DELIVERY,
  // Universal — page-only 09 has no bucket. V1's LOVE block verbatim: no {personName},
  // carries the LEFT-WRIST line DELIVERY depends on. Ignores both args.
  bucketMessages: () => V1_UPSELL1.bucketMessages("love", null),
  // Keeps the question — RISK routes to QUESTION_1, same as V1, 03 and 06.
  chain: V1_CHAIN_1,
  acceptLabel: "Yes, guard who gets close",
  placeholderNames: ["Friend"],
};

// ============================================================================
// U2 — the Manifestation Bracelet (charm = left wrist, receives; bracelet = right
// wrist, reaches out) (09-U2a)
// ============================================================================

// ── Opening beats ───────────────────────────────────────────────────────────

const HC_PATH_A_OPEN = [
  "{firstName}... both are confirmed now. Your charm, and your protection stone to go with it.",
  "Your lava stone goes on your left wrist too, beside your charm. Your charm holds your wish, and the stone keeps watch over who gets close.",
  "But there's one thing I want to ask you before your charm arrives...",
  "Your wish will be tucked away inside a capsule, {firstName}, where only you can read it.",
  "Your charm keeps it close. The stone guards the wrist it's on. Both of them look after what comes IN to you.",
  "So what's reaching OUT? What lets the love you're ready for know where to find you, {firstName}?",
];

const HC_PATH_B_OPEN = [
  "{firstName}... I respect your decision about the stone. Your charm doesn't need it, and it'll reach you just the same.",
  "But I left one part of the ritual out of my letters, and you should have it before your charm arrives.",
  "Your capsule and your pink quartz are already on their way to you.",
  "What I left out is your other wrist.",
  "Your left wrist is the receiving side. Your charm goes there, with your wish tucked away where nobody else can read it.",
  "Your right wrist is the side that reaches out, {firstName}, and right now there's nothing on it. So what tells the love you're ready for where to find you?",
];

// Routes AROUND both Claude stages — identical to PX_CHAIN_2 / JD_CHAIN_2:
// PATH_*_OPEN → GAP (V1's post-MANIFEST_REVEAL stage), AFTER_Q2 → RITUAL_INSTRUCTION
// (V1's post-MANIFEST_PERSONALIZE stage). Nothing then points at either AI stage.
const HC_CHAIN_2: Upsell2Chain = {
  ...V1_CHAIN_2,
  PATH_A_OPEN: "GAP",
  PATH_B_OPEN: "GAP",
  AFTER_Q2: "RITUAL_INSTRUCTION",
};

// ── Downstream line fixes (same set pixiu.ts overrides) ─────────────────────

// Index 0–2 rewritten; index 3 ("You're just standing in an empty room…") is V1's, kept.
const HC_U2_GAP = [
  "Your charm will keep your wish close, on your receiving side. That part is settled.",
  "But keeping a wish close to you isn't the same as reaching out for it, {firstName}.",
  "Think about it... your wish can be written, tucked away and worn every day. You can say the seven words every morning. But if nothing about you is reaching out...",
  UPSELL2_GAP[3],
];

const HC_U2_AFTER_Q1: Record<string, string[]> = {
  yes: [
    UPSELL2_AFTER_Q1.yes[0],
    "Your charm keeps the wish close. Something else has to reach outward, into the rooms you walk into.",
  ],
  maybe: [
    "It's subtle. You'll feel it clearly once your charm is on your wrist.",
    "There'll be a quiet morning after you've said the seven words... and a small voice asking, \"Now what?\" That's the moment this is for.",
  ],
  what: [
    "Think of it this way. Your left hand is held open, ready to take what's offered. Your right hand is the one that waves someone over.",
    "Waving someone over — reaching out for what you want — that's a different kind of work entirely.",
  ],
  default: UPSELL2_AFTER_Q1.default,
};

// Index 1 and 4 rewritten. "Not for holding a wish" is the line that keeps the two products apart.
const HC_INTRODUCE = [
  UPSELL2_INTRODUCE[0],
  "Not for holding a wish. Not for protection. For attraction.",
  UPSELL2_INTRODUCE[2],
  UPSELL2_INTRODUCE[3],
  "Yours is, {firstName}. I felt it the moment you chose your charm.",
];

// Index 3 and 6 rewritten. Index 3 must not credit the CHARM with making signs appear.
const HC_STONES = [
  UPSELL2_STONES[0],
  UPSELL2_STONES[1],
  UPSELL2_STONES[2],
  "Amethyst — your intuition amplifier. Signs and synchronicities are easy to miss on an ordinary day. This stone helps you SEE them. The universe is always speaking, {firstName}. Amethyst helps you listen.",
  UPSELL2_STONES[4],
  UPSELL2_STONES[5],
  "Eight stones. Eight signals. All tuned to your frequency before your bracelet ships.",
];

// Each branch hands off to RITUAL_INSTRUCTION (the right wrist) — the chain skips the
// personalised stone read, so nothing here may promise one.
const HC_U2_AFTER_Q2: Record<string, string[]> = {
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
const HC_WHAT_RECEIVE = [
  "I'll attune each stone to the love you're ready to receive before your bracelet ships. By the time it reaches you, it will already carry that frequency.",
  UPSELL2_WHAT_RECEIVE[1],
  UPSELL2_WHAT_RECEIVE[2],
];

// ── Beyond pixiu's set ──────────────────────────────────────────────────────
// pixiu.ts and judgement.ts both inherit every block below from V1 unchanged. Each one
// names a product 09's buyer never bought, or promises a reading "within 24 hours".

const HC_URGENCY = [
  "The easiest time to add the bracelet is now, {firstName}, while your charm order is still open.",
  "Your charm will reach you either way. I promise you that.",
  "But if you want your right wrist reaching out while your left wrist receives... this is the moment.",
];

// Index 2 only. Index 4 is V1's price line — kept by reference, never retyped.
const HC_DOWNSELL = [
  UPSELL2_DOWNSELL[0],
  UPSELL2_DOWNSELL[1],
  "I have a bracelet that's already been cleansed and prepared — it just hasn't been attuned to anyone yet. It won't carry the full personal charge a fresh one would...",
  UPSELL2_DOWNSELL[3],
  UPSELL2_DOWNSELL[4],
  UPSELL2_DOWNSELL[5],
];

const HC_ATTUNED = "Your Manifestation Bracelet will be attuned before it ships.";

const HC_U2_SUCCESS = [
  UPSELL2_SUCCESS[0],
  HC_ATTUNED,
  UPSELL2_SUCCESS[2],
  UPSELL2_SUCCESS[3],
];

// Index 3 is 09's own: V1 ships "to the same address as your protection stone", but this path is
// now reached by buyers who DECLINED the stone and still have a booking address (Joel, 2026-09-16).
const HC_U2_SUCCESS_HAS_SHIPPING = [
  UPSELL2_SUCCESS_HAS_SHIPPING[0],
  HC_ATTUNED,
  UPSELL2_SUCCESS_HAS_SHIPPING[2],
  "I'll send your Manifestation Bracelet to the same address as your Heart Cleanser Love Charm.",
];

const HC_U2_SUCCESS_NEEDS_SHIPPING = [
  UPSELL2_SUCCESS_NEEDS_SHIPPING[0],
  HC_ATTUNED,
  UPSELL2_SUCCESS_NEEDS_SHIPPING[2],
  UPSELL2_SUCCESS_NEEDS_SHIPPING[3],
  UPSELL2_SUCCESS_NEEDS_SHIPPING[4],
];

// Index 3 only.
const HC_U2_SHIPPING_CONFIRMED = [
  UPSELL2_SHIPPING_CONFIRMED[0],
  UPSELL2_SHIPPING_CONFIRMED[1],
  UPSELL2_SHIPPING_CONFIRMED[2],
  "Watch your inbox for your charm's tracking link, too.",
  UPSELL2_SHIPPING_CONFIRMED[4],
  UPSELL2_SHIPPING_CONFIRMED[5],
];

// Index 0, 2 and 3.
const HC_U2_SOFT_DECLINE = [
  "I understand, {firstName}. Your charm is a lovely thing to have on its own.",
  UPSELL2_SOFT_DECLINE[1],
  "Watch your inbox. Your charm's tracking link comes when it ships.",
  "Take care, dear.",
];

export const HEART_CLEANSER_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: HC_PATH_A_OPEN,
  PATH_B_OPEN: HC_PATH_B_OPEN,
  GAP: HC_U2_GAP,
  AFTER_Q1: HC_U2_AFTER_Q1,
  INTRODUCE: HC_INTRODUCE,
  STONES: HC_STONES,
  AFTER_Q2: HC_U2_AFTER_Q2,
  WHAT_RECEIVE: HC_WHAT_RECEIVE,
  URGENCY: HC_URGENCY,
  DOWNSELL: HC_DOWNSELL,
  SUCCESS: HC_U2_SUCCESS,
  SUCCESS_HAS_SHIPPING: HC_U2_SUCCESS_HAS_SHIPPING,
  SUCCESS_NEEDS_SHIPPING: HC_U2_SUCCESS_NEEDS_SHIPPING,
  SHIPPING_CONFIRMED: HC_U2_SHIPPING_CONFIRMED,
  SOFT_DECLINE: HC_U2_SOFT_DECLINE,
  // REVEAL/PERSONALIZE stay inherited (null) but are UNREACHABLE — see HC_CHAIN_2.
  chain: HC_CHAIN_2,
  downsellDeclineLabel: "No thanks, just my charm",
  placeholderNames: ["Friend"],
};
