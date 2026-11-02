// Offer 12 — Lucky Numbers (a numbers reading by Evelyn Cross): the U1 and U2 conversations.
//
// Spec: improve-v1/v1-one-time-BEs/docs/12/upsells/12-U1a-opening-beats.md (Wish Ritual + citrine)
//       improve-v1/v1-one-time-BEs/docs/12/upsells/12-U2a-opening-beats.md (Manifestation Bracelet)
// Change the spec first, then this file. luckyNumbers.test.ts reads both docs and walks every
// reachable string. Same shape as unsentLetter.ts.
//
// Both upsells sell one line: "Keep the luck your numbers bring." Like every backend offer,
// /api/backend/upsell/user-data returns bucket:null and personName:null.
//
// ⛔ Never in either upsell: a win, a money sum, a ticket that pays, her numbers' values, or
// tarot. Her first name is the only personal detail.
//
// U1 is its OWN product: Evelyn's Wish Ritual + charged citrine bracelet, $47 with a $30
// downsell (operator, 2026-11-02). The catalog's `upsell1Product` ('be_citrine_wish_ritual')
// makes the chat charge it by name and turns the downsell on. Prices reach the copy as
// {upsellPrice} and {downsellPrice}, never typed.
// ⚠ DELIVERY[4] says the bracelet arrives "before your first open day in January". It holds only
//   if the engine never puts January's day too early (12-U1a "Settle before code" 1).
//
// U2 is V1's Manifestation Bracelet. On Path A she has just bought a citrine bracelet, so the
// opening says out loud what's different: the citrine (left wrist) holds her one wish; this one
// (right wrist) works on what goes out from her. Path B never mentions the citrine.
//
// Verbatim V1 lines are referenced by index, never retyped, so V1 stays the single source of them.

import type { Upsell1Copy, Upsell2Chain, Upsell2Copy } from "./types";
// The operator's own product photo (wishamiracle.com, citrine.jpg, plain white background).
// Their other two photos were not used: one shows another brand's box, one a stranger's wrist.
import citrineBraceletImage from "../../assets/images/citrine-wish-bracelet.jpg";
import { V1_UPSELL1, V1_UPSELL2, V1_CHAIN_1, V1_CHAIN_2 } from "./v1";
import {
  UPSELL_LAVA_INTRO,
  UPSELL_RITUAL,
  UPSELL_BUCKET_MESSAGES,
  UPSELL_DELIVERY,
  UPSELL_SUCCESS,
  UPSELL_SHIPPING_CONFIRMED,
} from "@/lib/upsellMessages";
import {
  UPSELL2_INTRODUCE,
  UPSELL2_RITUAL_INSTRUCTION,
  UPSELL2_PRICE,
  UPSELL2_DOWNSELL,
  UPSELL2_SUCCESS,
  UPSELL2_SUCCESS_HAS_SHIPPING,
  UPSELL2_SUCCESS_NEEDS_SHIPPING,
  UPSELL2_SHIPPING_CONFIRMED,
  UPSELL2_SOFT_DECLINE,
} from "@/lib/upsell2Messages";

// ============================================================================
// U1 — Evelyn's Wish Ritual + charged citrine bracelet (12-U1a).
// ============================================================================

const LN_U1_CONFIRMATION = [
  "It's done, {firstName}. Your numbers are booked, and your reading will be with you within 24 hours.",
  "Your three lucky numbers, your six for a ticket, your PIN, the number to stop using, and your twelve open days. All of it from your birth name and date.",
  "Before I let you go, there's one thing your reading can't do for you, dear.",
];

const LN_U1_GAP = [
  "Your reading gives you the days. Twelve of them, one in every month. That part's settled, and it needs nothing else from you or from me.",
  "But here's what nobody tells you, {firstName}. Your numbers tell luck when to find you. They can't tell it what you want.",
  "Luck will turn up on each of your open days. Luck doesn't know what you're hoping for. You've never told it.",
  "So it brings whatever's nearest. A nice afternoon. A good parking space. And the thing you really wanted goes on waiting.",
];

const LN_U1_RISK = [
  "A lucky day with nothing asked for goes to waste.",
  "You've got twelve of them coming in 2027. Twelve days when luck can reach you, and most women walk through every one with their hands empty.",
  "They don't ask, because nobody told them to. Then the year's gone, and they say it was a nice enough year.",
  "And January's comes first. You'll have the date within a day. What you won't have yet is something to ask it for.",
];

const LN_U1_QUESTION_1 =
  "Tell me honestly, {firstName}. Is there one thing you've wanted for a long time, and stopped saying out loud?";

// ⚠ The hook reads her intent from the WORDS (detectQ1Intent), not the value. 12-U1a's middle
// reply was "There might be", which matches no pattern and fell to `default`; "Maybe there is"
// reaches `maybe`. The test proves each reply lands on its own branch.
const LN_U1_QUESTION_1_REPLIES = [
  { text: "Yes — there's one thing", value: "yes" },
  { text: "Maybe there is", value: "maybe" },
  { text: "I'm not sure", value: "unsure" },
];

const LN_U1_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "Then you already know your wish.",
    "Keep it to yourself. Don't tell me, and don't type it here. I don't need it for what I do.",
    "Just hold on to it. You'll need it.",
  ],
  maybe: [
    "Most women have one. It's just gone quiet.",
    "The house. The trip. The yes from someone who keeps saying later.",
    "Whatever came to mind just now, hold on to that one.",
  ],
  unsure: [
    "All right. Don't force it.",
    "When your reading comes and you see your twelve days, one thing will come to mind.",
    "I'd just hate for January's day to get here before you've got it.",
  ],
  default: [
    "You know what I mean.",
    "Your reading gives you the days. What you ask for on them is up to you.",
    "Let me help with that part.",
  ],
};

const LN_U1_SOLUTION = [
  "So there's one more piece of work I do alongside a reading like yours. A Wish Ritual.",
  "I work it for you, with the birth name and date you've just given me, and I charge a citrine bracelet in it.",
  "Then I post the bracelet to you. You put it on and make your one wish. That's all you do. One wish, and twelve days for it to land.",
];

// LAVA_INTRO keeps its engine name but holds the citrine.
const LN_U1_LAVA_INTRO = [
  "For your wish, I use citrine.",
  UPSELL_LAVA_INTRO[1],
  "Citrine's a yellow stone, the colour of late sun. Shopkeepers used to call it the merchant's stone, and kept a piece in the till.",
  "I use it for a plainer reason. Citrine is the stone for asking.",
  "Citrine holds one thing at a time, and holds it well. So it's one wish, not a list.",
];

const LN_U1_RITUAL = [
  UPSELL_RITUAL[0],
  "Before your bracelet's posted, I'll wait till the house is quiet, and I'll begin.",
  UPSELL_RITUAL[2],
  "I'll call you forward by your birth name and your birth date. They're all I need to find you by.",
  "Then I'll speak the old words for asking over your citrine, so it's ready to carry one wish.",
  "I'll pass it through sage smoke seven times, and from then on it's yours.",
  UPSELL_RITUAL[6],
  UPSELL_RITUAL[7],
];

const LN_U1_FEEL = [
  "Some women feel it the night I work, {firstName}.",
  "Warm hands. A dream that's still there in the morning.",
  "Others feel nothing at all, and the work's done just the same.",
  "If you feel it, that's me. Don't be alarmed.",
];

// One block for every buyer: 12 has no bucket, and V1's would return nothing.
const LN_U1_BRACELET_BLOCK = [
  "Once your citrine's charged, it carries my work, and it's waiting for one wish.",
  UPSELL_BUCKET_MESSAGES.love[1],
  "When it arrives, sit somewhere quiet. Think of your one wish, the thing itself and not the money for it. Then put it on.",
  "Your part ends there. Don't tell me the wish, and don't tell anyone else.",
  "On each of your open days, touch the stone. Once is enough.",
  "The bracelet doesn't do your reading's job. Your reading gives you the twelve days, and they're yours either way. The bracelet carries what you're asking for on them.",
];

// [0–1] are V1's: the citrine ships in the lava stone's velvet pouch with the SAME card
// (operator, 2026-11-02), so nothing here says what the card says about the wish.
const LN_U1_DELIVERY = [
  UPSELL_DELIVERY[0],
  UPSELL_DELIVERY[1],
  "When it arrives, follow the card in the pouch to put it on, and make your one wish as you do.",
  "Then just wear it. The stone does the carrying.",
  "Your bracelet will be with you before your first open day in January, {firstName}.",
];

const LN_U1_OFFER = [
  "Your Wish Ritual is {upsellPrice}, {firstName}.",
  "That includes your charged citrine bracelet, shipped straight to your door.",
  "If you were at my table I'd tell you to have both. Your reading gives you the days. The ritual carries your wish into them.",
  "Shall I do your Wish Ritual?",
];

// Nothing in it names a price, so the downsell's accept plays the same lines.
const LN_U1_SUCCESS = [
  UPSELL_SUCCESS[0],
  "Your reading and your Wish Ritual are both booked now.",
  "I'll do your ritual before your bracelet's posted. Your reading still comes within 24 hours.",
  "Your charged citrine bracelet ships within 48 hours.",
  UPSELL_SUCCESS[4],
];

const LN_U1_SHIPPING_CONFIRMED = [
  "Perfect. Your bracelet goes in the post as soon as your ritual's done, {firstName}.",
  "Remember, when it arrives, put it on and make your one wish.",
  UPSELL_SHIPPING_CONFIRMED[2],
  "If you feel warmth the night I work, or your dreams run vivid, that's me.",
  "Watch your inbox. Your reading arrives within 24 hours.",
  "Thank you for letting me do this, {firstName}.",
  "Now go and think about that wish.",
];

// Follows two declines now (the offer, then the downsell). Still reads right after either.
const LN_U1_SOFT_DECLINE = [
  "I understand, {firstName}. That's your call.",
  "Your reading's just as good without the ritual. Your twelve days are yours either way.",
  "Just don't let them go by empty. Pick one thing you want, and on each open day, ask for it.",
  "For now, watch your inbox. Your reading arrives within 24 hours.",
  "Take care of yourself, dear.",
];

// The $30 downsell. Same ritual, same citrine, same posting: nothing is taken away, so Evelyn
// just meets her halfway. V1 U2's "not attuned to anyone yet" and "the stones alone cost me
// nearly that" are left out on purpose (12-U1a): neither is true here.
const LN_U1_DOWNSELL = [
  UPSELL2_DOWNSELL[0],
  "I don't want the price to be the reason your days go by empty.",
  "So let me meet you halfway.",
  "Same Wish Ritual, the same citrine charged the same way, and posted to you the same way. Nothing's left out.",
  "I'll do it for {downsellPrice} instead.",
];

export const LUCKY_NUMBERS_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: LN_U1_CONFIRMATION,
  GAP: LN_U1_GAP,
  RISK: LN_U1_RISK,
  QUESTION_1: LN_U1_QUESTION_1,
  QUESTION_1_REPLIES: LN_U1_QUESTION_1_REPLIES,
  AFTER_Q1: LN_U1_AFTER_Q1,
  SOLUTION: LN_U1_SOLUTION,
  LAVA_INTRO: LN_U1_LAVA_INTRO,
  RITUAL: LN_U1_RITUAL,
  FEEL: LN_U1_FEEL,
  DELIVERY: LN_U1_DELIVERY,
  OFFER: LN_U1_OFFER,
  SUCCESS: LN_U1_SUCCESS,
  SHIPPING_CONFIRMED: LN_U1_SHIPPING_CONFIRMED,
  SOFT_DECLINE: LN_U1_SOFT_DECLINE,
  bucketMessages: () => LN_U1_BRACELET_BLOCK,
  // As 11: Q2 ("Transformation through fire") and Q3 ("ready to be protected?") can't be
  // overridden, so they're routed around.
  chain: { ...V1_CHAIN_1, LAVA_INTRO: "RITUAL", FEEL: "BUCKET" },
  pauses: { RITUAL: "I'm listening", BUCKET: "Tell me" },
  acceptLabel: "Yes, do my Wish Ritual",
  // V1's shared line says "This is your journey".
  ctaReassurance: "Take your time.",
  DOWNSELL: LN_U1_DOWNSELL,
  downsellAcceptLabel: "Yes, do my Wish Ritual for {downsellPrice}",
  downsellDeclineLabel: "No thanks, just my reading",
  // Empty: the bubble above already says it's the same.
  downsellReassurance: "",
  // The citrine bracelet, shown after LAVA_INTRO (never the lava stone).
  stoneImage: citrineBraceletImage,
  // The small print under both buy buttons. V1 says "charged stone".
  priceNoteItem: "charged citrine bracelet",
  placeholderNames: ["Friend"],
};

// ============================================================================
// U2 — the Manifestation Bracelet (12-U2a).
// ============================================================================

// Path A has just bought the citrine bracelet. The second bracelet is named head-on.
const LN_PATH_A_OPEN = [
  "{firstName}... both are booked. Your reading comes within 24 hours, and your citrine goes in the post once your ritual's done.",
  "Now, I'm about to offer you a second bracelet, and I know how that sounds. So let me tell you straight away what's different.",
  "Your citrine does one job. It sits on your left wrist and holds your one wish.",
  "It doesn't get you out of the door on your days. Your reading doesn't either. That part's still up to you.",
  "And I told you what happens on a lucky day you stay in. Luck comes round, finds nobody home, and moves on.",
];

// Path B declined U1. ⛔ No citrine here: she doesn't have one.
const LN_PATH_B_OPEN = [
  "{firstName}... that's your call, and I'll leave it there. Your reading will be with you within 24 hours either way.",
  "But there's one thing from my letter I want to say a bit more about.",
  "Most women's lucky days go by like any other day. They stay in. They put the call off till Monday.",
  "And luck comes round, finds nobody home, and moves on.",
];

const LN_U2_GAP = [
  "Your numbers tell you which days, {firstName}. They can't walk you out into them.",
  "And most of what's good on a lucky day happens out there. A call you return. A room you walk into. A yes you'd normally put off.",
  "Stay in, and the day's still lucky. There's just nobody there to meet it.",
];

const LN_INTRODUCE = [
  UPSELL2_INTRODUCE[0],
  "Not to guard you. Not to win you anything. For what goes out from you.",
  "Eight stones on one bracelet, and each one has its own job on the days your numbers mark.",
  "I call it a Manifestation Bracelet. And I only offer it to women who've just asked for their numbers.",
  "You have, {firstName}. That's why I'm offering it now.",
];

// [2] V1's citrine line said "attracts wealth"; here it's one of eight with a small job, and it
// reads the same whether or not she has the citrine bracelet. [5] V1's says "abundance frequency".
const LN_STONES = [
  "Eight stones, {firstName}. Each one does something different with the luck that comes near you.",
  "Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected chances. The good things you've walked past because your head was somewhere else.",
  "Citrine — the merchant's stone. Here it's one of eight, with one small job: it helps you feel you've earned the good things when they come, so you don't wave them off.",
  "Amethyst — your intuition stone. It helps you notice a good chance while it's in front of you, not a week later.",
  "Tiger's Eye — the stone of bold action. It goes to work on the chances that take courage, the ones you'd normally hesitate on, and it gets you to say yes.",
  "And four more working together. Clear Quartz to make every one of them stronger. Hematite to keep your feet on the ground. Pyrite to make you seen. And Malachite to pull growth toward you like a magnet.",
  "Eight stones. Eight signals. All charged while your numbers are on my table.",
];

const LN_RITUAL_INSTRUCTION = [
  UPSELL2_RITUAL_INSTRUCTION[0],
  "Your right side is the side that reaches out. Every room you walk into, every call you make, every yes you say.",
  "For a long time, what's gone out from that side is \"not today\" and \"maybe next week\".",
  "I charge it to your numbers. So on the days that count, you go out and meet your luck instead of waiting in for it.",
  "It won't win you anything, {firstName}. It won't pick a ticket for you. I'm not going to pretend it does. It gets you out of the door on the days that count.",
];

// Path A only. V1's says "your lava stone on your left"; on 12 the left wrist is the citrine's.
const LN_RITUAL_PATH_A_EXTRA =
  "So your citrine on your left holds your one wish, and this one on your right gets you out to meet it. One knows what you're asking for. The other makes sure you turn up.";

// [1] V1's says "my seekers tell me it's the most powerful part of their day": a testimonial.
const LN_WHAT_RECEIVE = [
  "I do the charging while your numbers are on my table. By the time the bracelet reaches you, it's done.",
  "You'll also get a short guide. It's a 3-minute ritual for the mornings, and it's simple.",
  "Wear it every day, and on your lucky days most of all.",
];

const LN_PRICE = [
  UPSELL2_PRICE[0],
  "There's a 30-day guarantee. If you don't feel the difference in yourself, every penny back.",
  UPSELL2_PRICE[2],
];

const LN_URGENCY = [
  "I can only charge the stones while your numbers are on my table, {firstName}. Once your reading's sent, that's done.",
  "Your numbers work either way, bracelet or no bracelet.",
  "But if you want something on your right wrist when your days come... this is the moment.",
];

// ⚠ [4] types $30, as 11's: V1's line says "Same manifestation energy", so it can't be kept by
// reference, and the U2 engine has no {downsellPrice} token.
const LN_DOWNSELL = [
  UPSELL2_DOWNSELL[0],
  UPSELL2_DOWNSELL[1],
  "I have a bracelet that's already been cleansed and prepared. It just hasn't been charged to anyone yet. It won't carry your numbers the way a fresh one would...",
  "But I can still tie it to you before I begin. The stones do their work on their own.",
  "I can send it to you for $30 instead. Same eight stones. Just prepared differently.",
  UPSELL2_DOWNSELL[5],
];

const LN_SUCCESS_MIDDLE = [
  "Your Manifestation Bracelet gets charged while your numbers are on my table.",
  "Eight stones, carrying your numbers.",
];

const LN_U2_SHIPPING_CONFIRMED = [
  UPSELL2_SHIPPING_CONFIRMED[0],
  UPSELL2_SHIPPING_CONFIRMED[1],
  UPSELL2_SHIPPING_CONFIRMED[2],
  "Watch your inbox. Your reading arrives within 24 hours.",
  "Thank you for letting me do this, {firstName}.",
  "Use your numbers the day they come, dear. Don't wait for the bracelet.",
];

const LN_U2_SOFT_DECLINE = [
  "I understand, {firstName}. Your numbers do their job with or without it.",
  "Just don't stay in on your days, dear. Go out and meet them.",
  UPSELL2_SOFT_DECLINE[2],
  "Take care. And remember your promise: turn up, don't chase.",
];

// Skips the AI reveal and personalise (they need a bucket 12 doesn't have), all three shared
// questions (their text can't be overridden), and the social proof ("hundreds of seekers… their
// stories" is a testimonial claim).
const LN_CHAIN_2: Upsell2Chain = {
  ...V1_CHAIN_2,
  PATH_A_OPEN: "GAP",
  PATH_B_OPEN: "GAP",
  GAP: "INTRODUCE",
  STONES: "RITUAL_INSTRUCTION",
  WHAT_RECEIVE: "PRICE",
};

export const LUCKY_NUMBERS_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: LN_PATH_A_OPEN,
  PATH_B_OPEN: LN_PATH_B_OPEN,
  GAP: LN_U2_GAP,
  INTRODUCE: LN_INTRODUCE,
  STONES: LN_STONES,
  RITUAL_INSTRUCTION: LN_RITUAL_INSTRUCTION,
  RITUAL_PATH_A_EXTRA: LN_RITUAL_PATH_A_EXTRA,
  WHAT_RECEIVE: LN_WHAT_RECEIVE,
  PRICE: LN_PRICE,
  URGENCY: LN_URGENCY,
  DOWNSELL: LN_DOWNSELL,
  SUCCESS: [UPSELL2_SUCCESS[0], ...LN_SUCCESS_MIDDLE, UPSELL2_SUCCESS[3]],
  // Only Path A has an address (12 is digital), so "the same address" is the citrine's.
  SUCCESS_HAS_SHIPPING: [
    UPSELL2_SUCCESS_HAS_SHIPPING[0],
    ...LN_SUCCESS_MIDDLE,
    "I'll send it to the same address as your citrine bracelet.",
  ],
  SUCCESS_NEEDS_SHIPPING: [
    UPSELL2_SUCCESS_NEEDS_SHIPPING[0],
    ...LN_SUCCESS_MIDDLE,
    UPSELL2_SUCCESS_NEEDS_SHIPPING[3],
    UPSELL2_SUCCESS_NEEDS_SHIPPING[4],
  ],
  SHIPPING_CONFIRMED: LN_U2_SHIPPING_CONFIRMED,
  SOFT_DECLINE: LN_U2_SOFT_DECLINE,
  chain: LN_CHAIN_2,
  pauses: { GAP: "Go on", STONES: "I'm listening" },
  downsellDeclineLabel: "No thanks, just my numbers",
  // Empty: DOWNSELL[4] already says it, so no line shows above the button (as 11).
  downsellReassurance: "",
  placeholderNames: ["Friend"],
};
