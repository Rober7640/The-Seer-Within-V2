// Offer 11 — The Unsent Letter (twelve cards by Evelyn Cross): the U1 and U2 conversations.
//
// Spec: improve-v1/v1-one-time-BEs/docs/11/upsells/11-U1a-opening-beats.md (Protection Ritual)
//       improve-v1/v1-one-time-BEs/docs/11/upsells/11-U2a-opening-beats.md (Manifestation Bracelet)
// Change the spec first, then this file. unsentLetter.test.ts reads both specs, and walks every
// reachable string.
//
// Both upsells sell one line: "Protect what's coming back to you." The reading gets it back;
// keeping it is a separate job. Like every backend offer, /api/backend/upsell/user-data returns
// bucket:null and personName:null, so as in judgement.ts:
//
//   1. bucketMessages is UNIVERSAL — one block for every buyer, carrying V1's verbatim LEFT-WRIST
//      line that DELIVERY and UPSELL2_RITUAL_PATH_A_EXTRA refer back to.
//   2. U2 never enters MANIFEST_REVEAL / MANIFEST_PERSONALIZE, which would POST bucket:null.
//
// Three shared questions go too (U1 Q2 + Q3, U2 Q1–Q3): their text and answers can't be overridden,
// and they say "Your energy recognized it", "being safe" and "calling it in". A CONTINUE tap breaks
// up each run instead (`pauses`).
//
// ⛔ What the product says, so the upsell must never say (11-U1a):
//     · it comes back when she reads it → never that the reading needs a stone or a bracelet;
//     · she never has to contact them → nothing that leads her to them, or says they're coming;
//     · cards 1–3 name what was taken → no hint at it. Reveal words stay out, V1's lines too:
//       nerve, trust, laugh, safe, freedom, looked after, judgement, worth, softness;
//     · Act 3 answers the fork → never which way it goes.
//   The threat is her own openness and "the ones who take", as a type. ⛔ Never them coming back.
//
// ⚠ U2's trap: V1 sells "calling it in", which here reads as calling THEM, or a promise of someone
//   new. So the bracelet works on her side only, and says so: "It won't bring them back."
//
// ⚠ Timing. "Tonight" is only ever about the stone. The reading is always "within 24 hours".
//
// Two lines live in shared CTA components, not bubbles: `ctaReassurance` and
// `downsellReassurance` below replace "This is your journey" and "Same manifestation energy".
//
// Verbatim V1 lines are referenced by index (UPSELL_RITUAL[0]), never retyped, so V1 stays the
// single source of those words.

import type { Upsell1Copy, Upsell2Chain, Upsell2Copy } from "./types";
import { V1_UPSELL1, V1_UPSELL2, V1_CHAIN_1, V1_CHAIN_2 } from "./v1";
import {
  UPSELL_LAVA_INTRO,
  UPSELL_RITUAL,
  UPSELL_BUCKET_MESSAGES,
  UPSELL_DELIVERY,
  UPSELL_OFFER,
  UPSELL_SUCCESS,
  UPSELL_SHIPPING_CONFIRMED,
} from "@/lib/upsellMessages";
import {
  UPSELL2_INTRODUCE,
  UPSELL2_STONES,
  UPSELL2_RITUAL_INSTRUCTION,
  UPSELL2_WHAT_RECEIVE,
  UPSELL2_SOCIAL_PROOF,
  UPSELL2_PRICE,
  UPSELL2_DOWNSELL,
  UPSELL2_SUCCESS,
  UPSELL2_SUCCESS_HAS_SHIPPING,
  UPSELL2_SUCCESS_NEEDS_SHIPPING,
  UPSELL2_SHIPPING_CONFIRMED,
  UPSELL2_SOFT_DECLINE,
} from "@/lib/upsell2Messages";

// ============================================================================
// U1 — the Protection Ritual. A guard on what comes in (11-U1a).
// ============================================================================

const UL_CONFIRMATION = [
  "It's done, {firstName}. I'll lay your twelve and write out the letter myself, and your reading will be with you within 24 hours.",
  "You've got nothing to do for that. You don't write to anyone, and you don't look anyone up.",
  "Before I let you go, there's one thing your reading won't do for you, dear.",
];

const UL_GAP = [
  "Your reading gets it back to you. That part's settled, and it needs nothing else from you or from me.",
  "But here's what nobody tells you, {firstName}. Getting something back and keeping it are two different jobs.",
  "You've gone a long time without it. You've got no practice at holding on to it.",
  "The last time you had it, it left with someone, and nobody warned you it could.",
];

const UL_RISK = [
  "The weeks right after you read that letter are when it's easiest to lose.",
  "I told you that the next time someone reaches for you, there'd be someone there. I meant it.",
  "Now think what that means. Anyone who reaches will find you. The decent ones, and the ones who take.",
  "You've been hard to reach for a long time. It cost you plenty, but it also kept the takers off. That ends the day you read it.",
  "I've seen it too many times, {firstName}. A woman gets back what she lost, she feels it for the first time in years, and the first person who's kind to her walks off with it.",
  "And that's after the letter. Before it, you've got the Devil to get through. The closer your message comes, the harder you'll feel the pull.",
];

const UL_QUESTION_1 =
  "Tell me honestly, {firstName}. The last time you started to feel like yourself again, did someone come along and knock you straight back?";

const UL_QUESTION_1_REPLIES = [
  { text: "Yes — that's happened to me", value: "yes" },
  { text: "I think so, yes", value: "maybe" },
  { text: "I'm not sure", value: "unsure" },
];

const UL_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "Then you know what I'm talking about.",
    "That wasn't bad luck, {firstName}. You'd only just got your feet under you, and nothing was standing guard.",
    "I don't want that twice.",
  ],
  maybe: [
    "Most women only see it looking back.",
    "You'd started going out again. You'd stopped checking. Then one person and one bad month, and you were back where you started.",
    "I'd rather you saw this one coming.",
  ],
  unsure: [
    "Then don't find out the hard way.",
    "You're about to get back something you've been without for a long time.",
    "I'd rather someone was keeping watch while you get used to it.",
  ],
  default: [
    "You know what I mean.",
    "Your reading gets it back. Keeping it is a separate job.",
    "Let me do that part.",
  ],
};

const UL_SOLUTION = [
  "That's why there's one more piece of work I do alongside a reading like yours. A Protection Ritual.",
  "It protects what's coming back to you. It's on you from the night I do the work, so your stone doesn't have to reach you first.",
  "And I anchor it to something you can hold, so it stays with you once the letter's read.",
];

// ── The rest of the flow, so nothing old leaks (11-U1a's table) ─────────────

const UL_LAVA_INTRO = [
  UPSELL_LAVA_INTRO[0],
  UPSELL_LAVA_INTRO[1],
  UPSELL_LAVA_INTRO[2],
  "When a volcano erupts, it burns off the old ground and leaves new ground behind. That's what comes after your letter.",
  "The stone is porous. It takes in what's coming at you before it gets to you.",
];

const UL_RITUAL = [
  UPSELL_RITUAL[0],
  "Tonight, between 2 and 4am, when the house is quiet, I'll begin.",
  UPSELL_RITUAL[2],
  "I'll call you forward by your three cards. The Hermit, Judgement and the Devil are more than enough to find you by.",
  UPSELL_RITUAL[4],
  UPSELL_RITUAL[5],
  UPSELL_RITUAL[6],
  UPSELL_RITUAL[7],
];

const UL_FEEL = [
  "Some women feel it the night I work, {firstName}.",
  "Warmth in the chest. Dreams that stay with them after they wake.",
  "Others feel nothing at all, and the work's done just the same.",
  "If you feel it, that's me. Don't be alarmed.",
];

const UL_DELIVERY = [
  UPSELL_DELIVERY[0],
  UPSELL_DELIVERY[1],
  UPSELL_DELIVERY[2],
  UPSELL_DELIVERY[3],
  "The protection holds strong for at least 30 days, longer for most people. That covers the pull, and the first weeks after it's back with you.",
];

const UL_OFFER = [
  UPSELL_OFFER[0],
  UPSELL_OFFER[1],
  "If you were at my table I'd tell you to have both. The letter gets it back. The stone helps you keep it.",
  "Shall I do your stone tonight?",
];

const UL_U1_SUCCESS = [
  UPSELL_SUCCESS[0],
  "Your reading and your stone are both booked now.",
  "I'll do your stone tonight. Your reading still comes within 24 hours.",
  UPSELL_SUCCESS[3],
  UPSELL_SUCCESS[4],
];

const UL_U1_SHIPPING_CONFIRMED = [
  UPSELL_SHIPPING_CONFIRMED[0],
  UPSELL_SHIPPING_CONFIRMED[1],
  UPSELL_SHIPPING_CONFIRMED[2],
  "If you feel warmth tonight, or your dreams run vivid, that's me.",
  "Watch your inbox. Your reading arrives within 24 hours.",
  "Thank you for letting me do this, {firstName}.",
  "Now leave your phone alone.",
];

const UL_U1_SOFT_DECLINE = [
  "I understand, {firstName}. That's your call.",
  "Just... be careful who you let close in the weeks after you read it.",
  "And remember the Devil. When the pull comes, it's the chain, whatever it feels like.",
  "Your reading's just as good without the stone.",
  "For now, watch your inbox. Your reading arrives within 24 hours.",
  "Take care of yourself, dear. And leave your phone where it is.",
];

// One block for everyone: 11 has no bucket, and V1's would return nothing. Keeps V1's left-wrist
// line because DELIVERY and U2 lean on it.
const UL_STONE_BLOCK = [
  "Once your stone is charged, it stands between you and whatever comes at what's yours.",
  UPSELL_BUCKET_MESSAGES.love[1],
  "The left side takes things in. Every person who reaches for you, every kind word that wants something, passes through that hand first.",
  "The stone takes the weight of it before it gets to you. You'll still see who they are, {firstName}. You'll see them before they've got hold of anything.",
  "It doesn't do your twelve's job. They tell you what to stop and what to do. The stone stands on your left while you do it.",
];

export const UNSENT_LETTER_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: UL_CONFIRMATION,
  GAP: UL_GAP,
  RISK: UL_RISK,
  QUESTION_1: UL_QUESTION_1,
  QUESTION_1_REPLIES: UL_QUESTION_1_REPLIES,
  AFTER_Q1: UL_AFTER_Q1,
  SOLUTION: UL_SOLUTION,
  LAVA_INTRO: UL_LAVA_INTRO,
  RITUAL: UL_RITUAL,
  FEEL: UL_FEEL,
  DELIVERY: UL_DELIVERY,
  OFFER: UL_OFFER,
  SUCCESS: UL_U1_SUCCESS,
  SHIPPING_CONFIRMED: UL_U1_SHIPPING_CONFIRMED,
  SOFT_DECLINE: UL_U1_SOFT_DECLINE,
  // Universal — ignores bucket + personName, always the same block.
  bucketMessages: () => UL_STONE_BLOCK,
  // Q2 and Q3 can't be overridden, so they're routed around: the hook hard-codes their answers,
  // and those say "Your energy recognized it".
  chain: { ...V1_CHAIN_1, LAVA_INTRO: "RITUAL", FEEL: "BUCKET" },
  pauses: { RITUAL: "I'm listening", BUCKET: "Tell me" },
  acceptLabel: "Yes, protect what's coming back",
  // ⚠ Not in 11-U1a's tables: its build notes flag this shared line and leave it. "Take your
  // time." is what's left once "journey" is cut.
  ctaReassurance: "Take your time.",
  placeholderNames: ["Friend"],
};

// ============================================================================
// U2 — the Manifestation Bracelet. Works on her side only (11-U2a).
// ============================================================================

const UL_PATH_A_OPEN = [
  "{firstName}... both are booked. Your reading and your stone.",
  "Your stone goes on my altar tonight. Your reading will be with you within 24 hours.",
  "One more thing while I've got you, and it's about the day after you read that letter.",
  "The letter gets it back to you. The stone stands guard over what comes IN.",
  "Neither one does anything about what goes OUT from you, {firstName}.",
  "And if it comes back and you keep it shut away, it sits with you the way it sat with them, doing nobody any good.",
];

const UL_PATH_B_OPEN = [
  "{firstName}... the stone's your call, and I'll leave it there. Your reading will be with you within 24 hours either way.",
  "But before I lay your twelve, there's one card I want to say a bit more about.",
  "The Hermit. Look at how he holds that lantern. Out in front of him, up high, where it can do some good.",
  "That's what a lantern's for. I told you the lantern is what they took, and all this time it's done nobody any good.",
  "When it comes back to you it needs carrying, {firstName}. If you shut it away, it sits with you the way it sat with them.",
  "Your left wrist takes things in. Your right wrist is the side that reaches out, and right now there's nothing on it.",
];

const UL_U2_GAP = [
  "Your letter will get it back to you. That part's settled.",
  "But having it back and using it are two different things, {firstName}.",
  "You've had plenty of practice at keeping it in. You go quiet. You say you're tired. You find the fault by Thursday. Those habits don't know anything's changed.",
  "You protect what's coming back to you by using it.",
];

const UL_INTRODUCE = [
  UPSELL2_INTRODUCE[0],
  "Not to guard you. Not to pull anyone to you. For what goes out from you.",
  "Eight stones on one bracelet, and each one has its own job once it's back.",
  "I call it a Manifestation Bracelet. And I only offer it to women who've got something coming back to them.",
  "You do, {firstName}. I knew that the night they came to me.",
];

const UL_STONES = [
  "Eight stones, {firstName}. Each one does something different with what comes back.",
  "Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected opportunities. The good things you've walked past because your head was somewhere else.",
  UPSELL2_STONES[2],
  "Amethyst — your intuition amplifier. It helps you see what's in front of you, and not what used to be there.",
  "Tiger's Eye — the stone of bold action. It goes to work on the chances that take courage, the ones you'd normally hesitate on, and it gets you to say yes.",
  UPSELL2_STONES[5],
  "Eight stones. Eight signals. All charged while your twelve are on my table.",
];

const UL_RITUAL_INSTRUCTION = [
  UPSELL2_RITUAL_INSTRUCTION[0],
  "Your right side is the side that reaches out. Every room you walk into, every person you meet, every yes you say.",
  "For a long time, all that's gone out from that side is \"I'm tired\" and \"I'm busy\".",
  "I charge it to your lantern. The Hermit's, the one I told you about. So when it's back, it goes out in front of you and doesn't sit.",
  "It won't bring them back, {firstName}. It won't bring anybody. I don't do that and I'm not going to pretend I do. It keeps what's yours in use, where you can see it.",
];

const UL_WHAT_RECEIVE = [
  "I do the charging while your twelve are on my table. By the time the bracelet reaches you, it's done.",
  UPSELL2_WHAT_RECEIVE[1],
  UPSELL2_WHAT_RECEIVE[2],
];

const UL_SOCIAL_PROOF = [
  UPSELL2_SOCIAL_PROOF[0],
  "They don't just tell me something changed. They tell me everything changed.",
];

const UL_PRICE = [
  UPSELL2_PRICE[0],
  "There's a 30-day guarantee. If you don't feel the difference in yourself, every penny back.",
  UPSELL2_PRICE[2],
];

const UL_URGENCY = [
  "I can only charge the stones while your twelve are on my table, {firstName}. Once I've written out your letter, that's done.",
  "It comes back to you either way. It comes back when you read it, bracelet or no bracelet.",
  "But if you want something on your right wrist when it does... this is the moment.",
];

// ⚠ [4] types $30: V1's line says "Same manifestation energy", so it can't be kept by reference.
const UL_DOWNSELL = [
  UPSELL2_DOWNSELL[0],
  UPSELL2_DOWNSELL[1],
  "I have a bracelet that's already been cleansed and prepared. It just hasn't been charged to anyone yet. It won't carry your lantern the way a fresh one would...",
  "But I can still tie it to you before I begin. The stones do their work on their own.",
  "I can send it to you for $30 instead. Same eight stones. Just prepared differently.",
  UPSELL2_DOWNSELL[5],
];

const UL_SUCCESS_MIDDLE = [
  "Your Manifestation Bracelet gets charged while your twelve are on my table.",
  "Eight stones, carrying your lantern.",
];

const UL_U2_SUCCESS = [UPSELL2_SUCCESS[0], ...UL_SUCCESS_MIDDLE, UPSELL2_SUCCESS[3]];

const UL_SUCCESS_HAS_SHIPPING = [
  UPSELL2_SUCCESS_HAS_SHIPPING[0],
  ...UL_SUCCESS_MIDDLE,
  UPSELL2_SUCCESS_HAS_SHIPPING[3],
];

const UL_SUCCESS_NEEDS_SHIPPING = [
  UPSELL2_SUCCESS_NEEDS_SHIPPING[0],
  ...UL_SUCCESS_MIDDLE,
  UPSELL2_SUCCESS_NEEDS_SHIPPING[3],
  UPSELL2_SUCCESS_NEEDS_SHIPPING[4],
];

const UL_U2_SHIPPING_CONFIRMED = [
  UPSELL2_SHIPPING_CONFIRMED[0],
  UPSELL2_SHIPPING_CONFIRMED[1],
  UPSELL2_SHIPPING_CONFIRMED[2],
  "Watch your inbox. Your reading arrives within 24 hours.",
  "Thank you for letting me do this, {firstName}.",
  "Read your letter the day it comes, dear. Don't wait for the bracelet.",
];

const UL_U2_SOFT_DECLINE = [
  "I understand, {firstName}. Your letter does its job with or without it.",
  "Just use what comes back, dear. Don't let it sit.",
  UPSELL2_SOFT_DECLINE[2],
  "Take care. You don't owe them a word.",
];

// Skips the AI reveal and personalise (they need a bucket 11 doesn't have), and all three shared
// questions, whose text can't be overridden.
const UL_CHAIN_2: Upsell2Chain = {
  ...V1_CHAIN_2,
  PATH_A_OPEN: "GAP",
  PATH_B_OPEN: "GAP",
  GAP: "INTRODUCE",
  STONES: "RITUAL_INSTRUCTION",
  WHAT_RECEIVE: "SOCIAL_PROOF",
};

export const UNSENT_LETTER_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: UL_PATH_A_OPEN,
  PATH_B_OPEN: UL_PATH_B_OPEN,
  GAP: UL_U2_GAP,
  INTRODUCE: UL_INTRODUCE,
  STONES: UL_STONES,
  RITUAL_INSTRUCTION: UL_RITUAL_INSTRUCTION,
  WHAT_RECEIVE: UL_WHAT_RECEIVE,
  SOCIAL_PROOF: UL_SOCIAL_PROOF,
  PRICE: UL_PRICE,
  URGENCY: UL_URGENCY,
  DOWNSELL: UL_DOWNSELL,
  SUCCESS: UL_U2_SUCCESS,
  SUCCESS_HAS_SHIPPING: UL_SUCCESS_HAS_SHIPPING,
  SUCCESS_NEEDS_SHIPPING: UL_SUCCESS_NEEDS_SHIPPING,
  SHIPPING_CONFIRMED: UL_U2_SHIPPING_CONFIRMED,
  SOFT_DECLINE: UL_U2_SOFT_DECLINE,
  chain: UL_CHAIN_2,
  pauses: { GAP: "Go on", STONES: "I'm listening", WHAT_RECEIVE: "Tell me" },
  downsellDeclineLabel: "No thanks, just my letter",
  // ⚠ Not in 11-U2a's tables: Upsell2DownsellCTA.tsx prints "Same manifestation energy". This is
  // DOWNSELL[4]'s own replacement for that line.
  downsellReassurance: "", // empty: the bubble above already says it, so no line shows
  placeholderNames: ["Friend"],
};
