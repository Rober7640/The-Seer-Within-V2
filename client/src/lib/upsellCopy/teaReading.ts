// Offer 04 — The Turn (a tea-leaf reading by Evelyn Cross): the U1 and U2 conversations.
//
// Spec:   improve-v1/v1-one-time-BEs/copy/04/04-U-upsell-copy-v2.md  ← the copy as she sees it
// Source: improve-v1/v1-one-time-BEs/copy/04/04-U-upsell-beats.md     ← the drafted beats
// Change the spec first, then this file.
//
// Like every backend offer, /api/backend/upsell/user-data returns bucket:null and
// personName:null for 04, so the same two departures from V1 that judgement.ts documents
// in full apply here:
//
//   1. bucketMessages is UNIVERSAL — one block for every buyer, carrying V1's verbatim
//      LEFT-WRIST line that DELIVERY and UPSELL2_RITUAL_PATH_A_EXTRA refer back to.
//   2. U2 never enters MANIFEST_REVEAL / MANIFEST_PERSONALIZE. With null REVEAL /
//      PERSONALIZE those stages POST bucket:null to /api/upsell2/reading → 400 → generic
//      fallback. TR_CHAIN_2 routes around both, exactly as JD/PX/HC_CHAIN_2 do.
//
// ⛔ THE CUP IS UNKNOWN HERE. Checkout draws one of three cups at random (operator
//    2026-10-11), the cup decides which of three readings she is sent — and the three put
//    the same seven leaves on DIFFERENT days (the bridge is days 16–18 in the Divided Rim,
//    13–15 in the Turned Handle, 19–21 in the Sunken Leaf; the quiet runs nine days in two
//    cups and six in the third). So no day number and no count of quiet days appears
//    anywhere below. What every buyer's reading shares, and what this copy argues from:
//      - twenty-one days, seven leaves, quiet days and one bridge stretch with ONE message;
//      - the three "ways through" from the letter: the bridge, the lighthouse, the butterfly;
//      - expectation three, in all three cups: someone close to her will try
//        to talk her out of the quiet days ("just be honest with him"), and the product's
//        answer, "Don't argue with them. Don't tell them what you're doing.";
//      - the refusal to promise he comes back — the letter's "I'm not going to promise you he
//        comes back", and each reading's own version ("Recoverable doesn't mean he's coming
//        back" / "I won't promise you he's coming back" / "Nine days of silence may produce
//        nothing").
//
// ⚠ The cup has NOT been turned when these run — the letter sold the turning, and the
//    reading opens "Your cup's turned". So nothing here claims a leaf's POSITION (the
//    drafted "it sat highest in your cup"). The leaves themselves, and what they mean, she
//    already has from the letter.
//
// ⚠ U2 must not fight the product. The drafted hinge — "the bracelet draws him back" —
//    is the one promise the letter and all three readings refuse. Here the bracelet works
//    on HER side: right wrist, the sending side, charged to the bridge, the lighthouse and
//    the butterfly, so what goes out from her on the quiet days is those three leaves and
//    not the waiting. It says outright that it won't walk him across.
//
// ⚠ Timing. Delivery is "within 24 hours" (TEA_READING_DELIVERY_HOURS). Never "by morning",
//    "tomorrow" or "tonight" about the reading. "Tonight" stays only on the stone ritual,
//    which V1's RITUAL/FEEL and the shared Question 3 already set at night.
//
// Verbatim V1 lines are referenced by index (UPSELL_RITUAL[0]), never retyped, so V1 stays
// the single source of those words. teaReading.test.ts walks every reachable string.

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
  UPSELL_SOFT_DECLINE,
} from "@/lib/upsellMessages";
import {
  UPSELL2_AFTER_Q2,
  UPSELL2_INTRODUCE,
  UPSELL2_STONES,
  UPSELL2_RITUAL_INSTRUCTION,
  UPSELL2_WHAT_RECEIVE,
  UPSELL2_PRICE,
  UPSELL2_DOWNSELL,
  UPSELL2_SUCCESS,
  UPSELL2_SUCCESS_HAS_SHIPPING,
  UPSELL2_SUCCESS_NEEDS_SHIPPING,
  UPSELL2_SHIPPING_CONFIRMED,
  UPSELL2_SOFT_DECLINE,
} from "@/lib/upsell2Messages";

// ============================================================================
// U1 — the Protection Ritual: keeps a well-meaning friend from talking her out
// of the quiet days (04-U1a). It supports the sequence; it never replaces it.
// ============================================================================

// ── Opening beats (04-U1a, de-dated) ────────────────────────────────────────

const TR_CONFIRMATION = [
  "It's done, {firstName}. I'll turn your cup, and your twenty-one days will be with you within 24 hours.",
  "You'll have the whole sequence. Which days are for quiet, which week the bridge is for, and how old the bird actually is.",
  "One thing before I go, because it's the thing most likely to cost you this.",
];

const TR_GAP = [
  "The sequence works because of the quiet. The quiet days are the ones that do it.",
  "But quiet isn't nothing, {firstName}. Everything still reaches you. You just don't get to answer it the way you'd like to.",
  "Whatever he sends, or doesn't. Your own version of events at two in the morning. And — this is the one — everybody else's opinion about what you should be doing instead.",
  "When you're holding a line you can't explain, you're very easy to talk out of it.",
];

// ⚠ The danger is a person who LOVES her — 04-P1's third expectation, in all three cups.
// Never a rival, never a returning threat.
const TR_RISK = [
  "And somebody is going to try. I'd put money on it.",
  "Not an enemy. Someone who loves you, who's watched you be unhappy for months and wants it over — and who's going to tell you, kindly, to stop overthinking and just be honest with him.",
  "They'll say it a few days in. They always do. That's when the quiet starts to look like you're suffering for no reason.",
  "The trouble is they're not wrong about the honesty, {firstName}. Being honest with him is IN the sequence. It has its own week, and that's what the bridge is for.",
  "What they're actually asking is that you do it now, on the wrong day. Then even the right words push him further off.",
  "And you won't be able to argue back, because the case for waiting is a tea reading, and you'll hear how that sounds in your own mouth before you've finished saying it.",
];

const TR_QUESTION_1 =
  "Tell me honestly — is there somebody in your life who already thinks you're being too patient about this?";

const TR_QUESTION_1_REPLIES = [
  { text: "Yes, and they've said so", value: "yes" },
  { text: "Probably", value: "maybe" },
  { text: "I haven't told anyone", value: "unsure" },
];

const TR_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "Then you already know which day this gets difficult.",
    "They mean it well, {firstName}, and they're still the biggest risk to your twenty-one days. Bigger than anything he does.",
    "Let me give you something to hold the line with.",
  ],
  maybe: [
    "They will. A few days in, when the quiet starts to look like giving up from the outside.",
    "You don't need to win that argument. You just need to still be on your days when it's over.",
    "That's what this next part is for.",
  ],
  unsure: [
    "That's the safest place to be, and I'd keep it that way. Don't explain the sequence to anybody.",
    "But it reaches you anyway — the general opinion that you should be doing something. It doesn't need to be aimed at you to land.",
    "Let me keep it off you while you keep your days.",
  ],
  default: [
    "Then you know the shape of what I mean.",
    "The sequence is sound. What it needs is a woman who doesn't get talked out of the quiet days.",
  ],
};

// ── Downstream line fixes ───────────────────────────────────────────────────

// All three rewritten. V1's "a second ritual" assumes a first; its "while your field
// rebuilds" is the clearing premise. Message 2 also covers the shipping gap honestly: her
// days start within 24 hours, the stone takes longer to reach her, and the guard starts
// with the ritual (as V1's own FEEL already has it), not with the post.
const TR_SOLUTION = [
  "That's why there's one other piece of work I do alongside a reading like yours. A Protection Ritual.",
  "It puts a guard on what reaches you while you keep your days. The guard starts the night I do the work, before your stone has even left me.",
  "And I anchor it to something physical, so it holds on the days you're on your own with this.",
];

// Index 3 only. V1's "That's exactly what's happening in your energy right now" re-pointed
// at the change the butterfly names — the old way of doing this going, a new one setting.
const TR_LAVA_INTRO = [
  UPSELL_LAVA_INTRO[0],
  UPSELL_LAVA_INTRO[1],
  UPSELL_LAVA_INTRO[2],
  "When a volcano erupts, it destroys the old ground and lays new ground in its place. That's what these three weeks are. The old way you've been doing this goes, and a new one sets.",
  UPSELL_LAVA_INTRO[4],
];

// Index 3 only. V1's line calls her forward by "the energy signature from our
// conversation" — most 04 buyers never had one. She has a cup and seven leaves.
const TR_RITUAL = [
  UPSELL_RITUAL[0],
  UPSELL_RITUAL[1],
  UPSELL_RITUAL[2],
  "I'll call you forward through your cup. Seven leaves is more than enough to find you by.",
  UPSELL_RITUAL[4],
  UPSELL_RITUAL[5],
  UPSELL_RITUAL[6],
  UPSELL_RITUAL[7],
];

// ONE block for every buyer — no bucket, no personName. Message 2 is V1's bucket-invariant
// left-wrist line, verbatim (byte-identical across all four V1 buckets; DELIVERY and
// UPSELL2_RITUAL_PATH_A_EXTRA refer back to it). The rest is 04's own, built on the
// product's third expectation and its instruction: "Don't argue with them. Don't tell them
// what you're doing."
const TR_UNIVERSAL_BLOCK: string[] = [
  "Once your stone is charged, it stands between you and everything that comes at you while you keep your days.",
  UPSELL_BUCKET_MESSAGES.love[1],
  "In this work the left side receives. Everything coming toward you — every opinion, every kind \"just be honest with him\", whatever he sends or doesn't — passes through that hand before it reaches you.",
  "The stone takes it in before it gets to you. You'll still hear it, {firstName}. It just won't move you off your days.",
  "You don't argue with them and you don't explain. The stone holds the line, so you don't have to.",
];

// Index 4 only. V1's "Long enough for your energy field to fully heal" is the clearing premise.
const TR_DELIVERY = [
  UPSELL_DELIVERY[0],
  UPSELL_DELIVERY[1],
  UPSELL_DELIVERY[2],
  UPSELL_DELIVERY[3],
  "The protection holds strong for at least 30 days — longer for most people. Long enough to cover every one of your twenty-one days.",
];

// Index 2 and 3. V1's "both rituals together — clearing AND protection" and "tonight's
// ritual" name a product she didn't buy. Index 0 carries {upsellPrice} — kept by reference.
const TR_OFFER = [
  UPSELL_OFFER[0],
  UPSELL_OFFER[1],
  "Most women I turn a cup for have me do this as well, because the quiet days are where it gets lost.",
  "Shall I put your stone on the altar tonight?",
];

// Index 1 and 2. 04 is a digital reading: no address on file, so index 4 ("I just need to
// know where to send it") is TRUE here and the shipping form follows.
const TR_U1_SUCCESS = [
  UPSELL_SUCCESS[0],
  "Your reading and your protection are both confirmed now.",
  "I'll do your stone tonight. Your reading still comes within 24 hours.",
  UPSELL_SUCCESS[3],
  UPSELL_SUCCESS[4],
];

// Index 4 only. V1's "your clearing reading".
const TR_U1_SHIPPING_CONFIRMED = [
  UPSELL_SHIPPING_CONFIRMED[0],
  UPSELL_SHIPPING_CONFIRMED[1],
  UPSELL_SHIPPING_CONFIRMED[2],
  UPSELL_SHIPPING_CONFIRMED[3],
  "Watch your inbox — your reading arrives within 24 hours.",
  UPSELL_SHIPPING_CONFIRMED[5],
  UPSELL_SHIPPING_CONFIRMED[6],
];

// Index 1, 2, 4 and 5. V1's "next 30 days" / "old heaviness returning" is the clearing
// premise, index 4 is "your clearing reading", and index 5 puts the reading's work "tonight".
const TR_U1_SOFT_DECLINE = [
  UPSELL_SOFT_DECLINE[0],
  "Just... when somebody tells you to stop overthinking and be honest with him, remember that it's already in your days.",
  "Don't argue with them, and don't explain. If it starts to get to you, I'm here.",
  UPSELL_SOFT_DECLINE[3],
  "For now, watch your inbox. Your reading will be with you within 24 hours.",
  "Take care of yourself, dear.",
];

export const TEA_READING_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: TR_CONFIRMATION,
  GAP: TR_GAP,
  RISK: TR_RISK,
  QUESTION_1: TR_QUESTION_1,
  QUESTION_1_REPLIES: TR_QUESTION_1_REPLIES,
  AFTER_Q1: TR_AFTER_Q1,
  SOLUTION: TR_SOLUTION,
  LAVA_INTRO: TR_LAVA_INTRO,
  RITUAL: TR_RITUAL,
  DELIVERY: TR_DELIVERY,
  OFFER: TR_OFFER,
  SUCCESS: TR_U1_SUCCESS,
  SHIPPING_CONFIRMED: TR_U1_SHIPPING_CONFIRMED,
  SOFT_DECLINE: TR_U1_SOFT_DECLINE,
  // Universal — ignores bucket + personName, always the same block.
  bucketMessages: () => TR_UNIVERSAL_BLOCK,
  // Keeps the question — RISK routes to QUESTION_1, same as V1, 03, 06 and 09.
  chain: V1_CHAIN_1,
  acceptLabel: "Yes, guard my quiet days",
  placeholderNames: ["Friend"],
};

// ============================================================================
// U2 — the Manifestation Bracelet: works on HER side. Right wrist, the sending
// side, charged to the bridge, the lighthouse and the butterfly (04-U2a, reframed)
// ============================================================================

// ── Opening beats ───────────────────────────────────────────────────────────

// Took U1. Must not re-sell the stone; one line on it, then the hinge.
const TR_PATH_A_OPEN = [
  "{firstName}... both are confirmed. Your reading and your stone.",
  "Your stone goes on my altar tonight. Your twenty-one days will be with you within 24 hours.",
  "But I want to say one more thing while I've got you, and it's about the butterfly.",
  "It's the leaf I told you to hold on to. A change that finishes inside before anybody sees it, and yours has already begun.",
  "The sequence gives you the words and the weeks. The stone keeps what shouldn't reach you from reaching you.",
  "Neither one of them does anything about what goes OUT from you, {firstName}. That's the piece that's still missing, and on the quiet days it's the piece that counts.",
];

// Declined U1. Doesn't re-argue the stone; opens on the butterfly instead.
const TR_PATH_B_OPEN = [
  "{firstName}... I won't push the stone. Your twenty-one days will be with you within 24 hours either way.",
  "Before I turn your cup, there's one leaf I want to say a bit more about.",
  "It's the butterfly, the one leaf in your cup that's only about you.",
  "And it isn't about him. The butterfly is a change that finishes on the inside before it shows, and yours has already started.",
  "Here's why I'm telling you now, {firstName}. The sequence I'm about to send you tells you what to say and when to say it. Every word of it is about your timing.",
  "It doesn't do anything about what goes out from you on all the days you're saying nothing. And over three weeks, that matters as much as the wording does.",
];

// Routes AROUND both Claude stages — identical to JD_CHAIN_2 / PX_CHAIN_2 / HC_CHAIN_2:
// PATH_*_OPEN → GAP (V1's post-MANIFEST_REVEAL stage), AFTER_Q2 → RITUAL_INSTRUCTION
// (V1's post-MANIFEST_PERSONALIZE stage). Nothing then points at either AI stage.
const TR_CHAIN_2: Upsell2Chain = {
  ...V1_CHAIN_2,
  PATH_A_OPEN: "GAP",
  PATH_B_OPEN: "GAP",
  AFTER_Q2: "RITUAL_INSTRUCTION",
};

// ── Downstream line fixes ───────────────────────────────────────────────────

// All four rewritten — V1's are clearing lines. Ends on "safe", so the shared Question 1
// ("…between being safe… and actually having what you want?") lands.
const TR_U2_GAP = [
  "Your twenty-one days will tell you when to say nothing, and when to say the one thing. That part's settled.",
  "But saying nothing to him doesn't mean nothing goes out from you, {firstName}.",
  "Something goes out from a woman whether she types it or not. For weeks now, what's gone out from you is waiting. Checking the phone. Going over his last message. Steering by whatever he did that day.",
  "Holding back keeps you safe, dear. It doesn't put anything of yours out there.",
];

const TR_U2_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "Good. Then you already know what's missing.",
    "The quiet keeps the wrong words in. Something else has to carry the steady part of you out while you say nothing.",
  ],
  maybe: [
    "It's quiet, and you'll feel it more once your days start.",
    "There'll be an evening when you've sent nothing, and done it well, and you're still sat there waiting. That's the moment this is for.",
  ],
  what: [
    "Think of it this way. Saying nothing to him is one thing. Sitting there waiting for him to say something is another.",
    "Your days take care of the first one. The second needs different work.",
  ],
  default: [
    "You understand more than you realise.",
    "Let me show you what I mean.",
  ],
};

// Index 1, 2 and 4. "Not for pulling him back" is the line that keeps U2 from promising
// what the reading refuses. Index 4: most 04 buyers never "began talking" with Evelyn.
const TR_INTRODUCE = [
  UPSELL2_INTRODUCE[0],
  "Not for protection. Not for pulling him back. For what goes out from you.",
  "A bracelet of eight stones, each one chosen for a different part of what you give off.",
  UPSELL2_INTRODUCE[3],
  "Yours is, {firstName}. I knew it when I saw the butterfly in your cup.",
];

// Index 0, 1, 3 and 6. Index 1 keeps Aventurine's description but drops "the things you've
// been asking the universe for… find you" — for this buyer that reads as "he'll find you".
// Index 3 drops "once the block is cleared"; index 6 drops "tonight's clearing".
const TR_STONES = [
  "Eight stones, {firstName}. Each one does a different job on what goes out from you.",
  "Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected opportunities. The good things you've walked straight past because you were watching your phone.",
  UPSELL2_STONES[2],
  "Amethyst — your intuition amplifier. Signs and synchronicities are easy to miss when you're busy going over his last message. This stone helps you SEE them. The universe is always speaking, {firstName}. Amethyst helps you listen.",
  UPSELL2_STONES[4],
  UPSELL2_STONES[5],
  "Eight stones. Eight signals. All tuned to you while your cup's in front of me.",
];

// Each branch hands off to RITUAL_INSTRUCTION — the chain skips the personalised stone
// read, so nothing here may promise one ("let me show you", "speaks loudest").
const TR_U2_AFTER_Q2: Record<string, string[]> = {
  yes: [
    UPSELL2_AFTER_Q2.yes[0],
    "Keep that one in mind. Now let me tell you what I charge it to, and which wrist it goes on.",
  ],
  all: [
    UPSELL2_AFTER_Q2.all[0],
    "Now let me tell you what I charge them to, and which wrist they go on.",
  ],
  more: [
    "Of course. Every one of them works on what goes out from you. None of them works on him.",
    "And what I charge them to matters just as much. Let me tell you.",
  ],
  default: [
    UPSELL2_AFTER_Q2.default[0],
    "Let me tell you what I charge them to.",
  ],
};

// Index 0–1 are V1's. Then 04-U2b, rebuilt: the shared Question 2 can't be re-pointed at
// a three-way choice, so the bracelet is charged to all three good leaves, and each is
// turned to HER side (04-P1: the lighthouse is "not him"; "a long bridge is a woman
// crossing the whole way herself"; the butterfly's change "doesn't reverse"). V1's "you'll
// be speaking at full volume" is gone — it argues against the quiet days.
const TR_RITUAL_INSTRUCTION = [
  UPSELL2_RITUAL_INSTRUCTION[0],
  UPSELL2_RITUAL_INSTRUCTION[1],
  "I charge it to the three good leaves in your cup. The bridge, the lighthouse and the butterfly.",
  "The lighthouse is your own fixed point, the one that isn't him. On your wrist it keeps you steering by that, and not by whatever he did today.",
  "The bridge is your side of the way across. The bracelet keeps you standing on your side of it — open, and not crossing the whole way yourself.",
  "And the butterfly is the change in you that's already started. The bracelet holds it, whatever he does.",
  "It won't walk him across that bridge, {firstName}. Nothing does, and I'm not going to pretend otherwise. What it does is make sure that what goes out from you on the quiet days is those three leaves, and not the waiting.",
];

// Index 0 only. V1's "during tonight's clearing… what you told me you want most".
const TR_WHAT_RECEIVE = [
  "I do the charging while your cup's in front of me. By the time the bracelet reaches you, those three leaves are already in it.",
  UPSELL2_WHAT_RECEIVE[1],
  UPSELL2_WHAT_RECEIVE[2],
];

// Index 1 only. V1's "if nothing starts moving toward you" turns the guarantee into the
// promise this reading refuses. Index 0 carries the $47 — kept by reference, never retyped.
const TR_PRICE = [
  UPSELL2_PRICE[0],
  "Same 30-day guarantee. If you don't feel the difference in yourself, every penny back.",
  UPSELL2_PRICE[2],
];

// All three rewritten — V1's are "inside your energy field tonight… the clearing".
const TR_URGENCY = [
  "I can only charge the stones while your cup's in front of me, {firstName}. Once I've turned it and written your days, that's done.",
  "Your reading will be just as good either way. I promise you that.",
  "But if you want those three leaves on your wrist for the quiet days... this is the moment.",
];

// Index 2 only. Index 4 is V1's $30 line — kept by reference, never retyped.
const TR_DOWNSELL = [
  UPSELL2_DOWNSELL[0],
  UPSELL2_DOWNSELL[1],
  "I have a bracelet that's already been cleansed and prepared — it just hasn't been charged to anyone yet. It won't carry your cup the way a fresh one would...",
  UPSELL2_DOWNSELL[3],
  UPSELL2_DOWNSELL[4],
  UPSELL2_DOWNSELL[5],
];

const TR_CHARGED = "Your Manifestation Bracelet gets charged while your cup's in front of me.";
const TR_THREE_LEAVES = "Eight stones, carrying the bridge, the lighthouse and the butterfly.";

// Index 1 and 2 of each. V1's are "attuned during tonight's clearing".
const TR_U2_SUCCESS = [UPSELL2_SUCCESS[0], TR_CHARGED, TR_THREE_LEAVES, UPSELL2_SUCCESS[3]];

// Index 3 ("the same address as your protection stone") stays V1's: 04 collects no address
// at booking, so this branch is reached only by a woman who bought the stone and gave one.
const TR_U2_SUCCESS_HAS_SHIPPING = [
  UPSELL2_SUCCESS_HAS_SHIPPING[0],
  TR_CHARGED,
  TR_THREE_LEAVES,
  UPSELL2_SUCCESS_HAS_SHIPPING[3],
];

const TR_U2_SUCCESS_NEEDS_SHIPPING = [
  UPSELL2_SUCCESS_NEEDS_SHIPPING[0],
  TR_CHARGED,
  TR_THREE_LEAVES,
  UPSELL2_SUCCESS_NEEDS_SHIPPING[3],
  UPSELL2_SUCCESS_NEEDS_SHIPPING[4],
];

// Index 3 only. V1's "your clearing reading".
const TR_U2_SHIPPING_CONFIRMED = [
  UPSELL2_SHIPPING_CONFIRMED[0],
  UPSELL2_SHIPPING_CONFIRMED[1],
  UPSELL2_SHIPPING_CONFIRMED[2],
  "Watch your inbox — your reading arrives within 24 hours.",
  UPSELL2_SHIPPING_CONFIRMED[4],
  UPSELL2_SHIPPING_CONFIRMED[5],
];

// Index 0, 1 and 3. V1's "The clearing alone", "start calling in what's yours" and
// "Tonight's work begins soon". The last line is the letter's own sign-off, de-dated.
const TR_U2_SOFT_DECLINE = [
  "I understand, {firstName}. Your reading stands on its own.",
  "Just know... the stones are patient. If you want them later, I'll be here.",
  UPSELL2_SOFT_DECLINE[2],
  "Take care, dear. And don't send him anything until your days arrive.",
];

export const TEA_READING_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: TR_PATH_A_OPEN,
  PATH_B_OPEN: TR_PATH_B_OPEN,
  GAP: TR_U2_GAP,
  AFTER_Q1: TR_U2_AFTER_Q1,
  INTRODUCE: TR_INTRODUCE,
  STONES: TR_STONES,
  AFTER_Q2: TR_U2_AFTER_Q2,
  RITUAL_INSTRUCTION: TR_RITUAL_INSTRUCTION,
  WHAT_RECEIVE: TR_WHAT_RECEIVE,
  PRICE: TR_PRICE,
  URGENCY: TR_URGENCY,
  DOWNSELL: TR_DOWNSELL,
  SUCCESS: TR_U2_SUCCESS,
  SUCCESS_HAS_SHIPPING: TR_U2_SUCCESS_HAS_SHIPPING,
  SUCCESS_NEEDS_SHIPPING: TR_U2_SUCCESS_NEEDS_SHIPPING,
  SHIPPING_CONFIRMED: TR_U2_SHIPPING_CONFIRMED,
  SOFT_DECLINE: TR_U2_SOFT_DECLINE,
  // REVEAL/PERSONALIZE stay inherited (null) but are UNREACHABLE — see TR_CHAIN_2.
  chain: TR_CHAIN_2,
  downsellDeclineLabel: "No thanks, just my reading",
  placeholderNames: ["Friend"],
};
