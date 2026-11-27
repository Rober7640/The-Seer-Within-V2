// /fb Upsell 1 copy test (v1_fb_u1_copy_2026), arm B: "hook 6, the stone is a filter".
//
// Arm A is today's V1_UPSELL1, untouched: an arm-A buyer gets no copy override at all, so
// the hook resolves V1_UPSELL1 exactly as it always has. This file is arm B ONLY, shipped as
// its own copy object the way the backend offers are, so nothing the six live funnels read
// (v1.ts, upsellMessages.ts, V1_UPSELL1) changes.
//
// Source, approved and transcribed word for word:
//   docs/superpowers/specs/2026-11-27-v1-fb-u1-copy-2026-hook-6-filter.md
// fbU1Filter.test.ts reads that file and fails on any line that drifts from it.
//
// Per buyer, not one shared object: three spots change by topic (GAP bubble 4, FEEL bubble 4
// and BUCKET) and one line changes by chat (RITUAL bubble 2 names the candle only for a buyer
// who saw it in /fb chat B). Build it with fbU1FilterCopy({ bucket, candle }).
//
// ⛔ No em or en dashes in any string here (copy rule; asserted in the test).

import type { Bucket } from "@shared/types";
import type { QuickReply } from "@/lib/upsellMessages";
import { V1_CHAIN_1 } from "./v1";
import type { Upsell1Copy } from "./types";

export const FILTER_BUCKETS: readonly Bucket[] = ["love", "money", "purpose", "someone"];

export function isFilterBucket(bucket: unknown): bucket is Bucket {
  return typeof bucket === "string" && (FILTER_BUCKETS as readonly string[]).includes(bucket);
}

// ── CONFIRMATION ─────────────────────────────────────────────────────────────
const CONFIRMATION = [
  "Your Energy Clearing is confirmed, {firstName}. I start tonight.",
  "Your reading reaches your inbox within 24 hours.",
  "Before you go... there's a second job I want to tell you about. It's separate from tonight's.",
];

// ── GAP (bubble 4 is the topic's own: what comes at her next) ─────────────────
const GAP_BEFORE = [
  "Tonight's clearing works on what's already in you.",
  "I cut it out and seal it, and that part is done.",
  "What it can't do is choose what comes at you next.",
];
const GAP_TOPIC: Record<Bucket, string> = {
  love: "Other people's moods. Someone's jealousy. The next man who looks a lot like the last one.",
  money:
    "Someone else's money worries. A relative who needs another loan. The next deal that looks a lot like the last one that cost you.",
  purpose:
    "Other people's doubts about your plans. Someone's jealousy when you start to do well. The next safe choice that looks a lot like the last one.",
  someone:
    "Other people's opinions about you and {personName}. Someone's jealousy. Every bad mood that comes from {personName}.",
};
const GAP_AFTER = ["That's the second job, {firstName}. All of that comes from outside you."];

// ── RISK ─────────────────────────────────────────────────────────────────────
const RISK = [
  "Ask the people close to you. They'll say you take everything home with you.",
  "A friend's bad day turns into your bad evening.",
  "Someone snaps at work, and you're still talking about it at dinner.",
  "None of it was yours. It reached you because nothing sorts it on the way in.",
];

// ── Q1 ───────────────────────────────────────────────────────────────────────
const QUESTION_1 = "Are you the one who cheers everyone up, {firstName}?";
const QUESTION_1_REPLIES: QuickReply[] = [
  { text: "Yes, always me", value: "yes" },
  { text: "Sometimes", value: "maybe" },
  { text: "I'm not sure", value: "unsure" },
];
const AFTER_Q1_UNSURE = [
  "That's alright. It happens fast, and it rarely looks like anything.",
  "But the people close to you can tell. You come home quieter than you left.",
  "Whatever it was, it reached you with nothing to sort it first.",
];
const AFTER_Q1: Record<string, string[]> = {
  yes: [
    "I thought so.",
    "By dinner their mood has lifted, and you're the one carrying it.",
    "That's kindness, dear, and I'd never take it from you. But right now it lets everything in, the good and the rest.",
  ],
  maybe: [
    "Sometimes is enough.",
    "Each time, a little of their bad day goes home with you instead of them.",
    "Something has to do the choosing for you.",
  ],
  unsure: AFTER_Q1_UNSURE,
  // NOTES FOR BUILD: "Default goes to the unsure branch."
  default: AFTER_Q1_UNSURE,
};

// ── SOLUTION ─────────────────────────────────────────────────────────────────
const SOLUTION = [
  "That's what my second ritual is for, {firstName}. The Protection Ritual.",
  "Your clearing takes care of what's in you. This one takes care of what comes at you.",
  "It doesn't shut people out. You'd lose the good ones with the rest.",
  "It sorts. What's yours gets in. What isn't gets caught on the way.",
  "And there's a stone that already does that kind of catching.",
];

// ── LAVA_INTRO (the hook shows the stone photo after the last of these) ─────────
const LAVA_INTRO = [
  "Volcanic lava stone.",
  "Lava stone is full of tiny holes. It's what people put in pond filters.",
  "The water runs through it, and the dirt stays behind in the stone.",
  "Dirt falls into a pond every single day. The pond stays clear anyway, because the stone catches it.",
  "Your stone works the same way. Everything that reaches for you goes through it first.",
  "What's meant for you passes through. What isn't stays in the stone.",
];

// ── Q2 ───────────────────────────────────────────────────────────────────────
const QUESTION_2 =
  "A stone that lets the good through and keeps the rest. Is that what you want, {firstName}?";
const QUESTION_2_REPLIES: QuickReply[] = [
  { text: "Yes, only the good", value: "yes" },
  { text: "That makes sense", value: "understand" },
  { text: "How does the filter work?", value: "more" },
];
const AFTER_Q2_UNDERSTAND = [
  "Picture the pond. Nothing has to stop coming. It just has to get caught.",
  "Let me tell you how I set yours tonight.",
];
const AFTER_Q2: Record<string, string[]> = {
  yes: [
    "Then this is your stone.",
    "Every good thing that comes your way still reaches you. The rest never gets as far as you.",
  ],
  understand: AFTER_Q2_UNDERSTAND,
  more: [
    "In a pond, the water gets pumped through a box of lava stones, then back into the pond.",
    "The holes are tiny, and there are so many that the dirt gets stuck inside. Clean water comes out the other side.",
    "Yours does that with whatever reaches for you. It only has to know what's yours, and that's what I do tonight.",
  ],
  // NOTES FOR BUILD: "Default goes to understand."
  default: AFTER_Q2_UNDERSTAND,
};

// ── RITUAL (bubble 2 names the candle only for a buyer who saw it) ──────────────
// The candle bent at her name in /fb chat B (fbBNameLines). A buyer who was never in
// chat B never saw it, so she gets the fallback line from the NOTES FOR BUILD.
export const RITUAL_CANDLE_LINE =
  "When your clearing is finished and sealed, I set your stone beside the candle that bent at your name.";
export const RITUAL_ALTAR_LINE =
  "When your clearing is finished and sealed, I set your stone on my altar.";
const RITUAL_FIRST = ["Here's what I'll do tonight, {firstName}."];
const RITUAL_REST = [
  "A pond filter only has to know dirt from water. Yours has to know you.",
  "And tonight you're easiest to see. Right after a clearing, what's yours is all that's left in you.",
  "So I say your name over the stone, and I show it everything that's yours.",
  "Then I show it what isn't. Other people's moods. Other people's jealousy. Anything that comes at you looking for somewhere to land.",
  "I hold it until it knows the difference. You don't have to do a thing.",
];

// ── FEEL (bubble 4 is the topic's own) ────────────────────────────────────────
const FEEL_BEFORE = [
  "Here's what the people around you will notice, dear.",
  "Someone at work will be in a mood, and the people at home won't hear a word about it at dinner.",
  'A friend will say, "You didn\'t let that get to you."',
];
const FEEL_TOPIC: Record<Bucket, string> = {
  love: "And when the next man like the last one comes along, your friends will watch you walk right past him.",
  money:
    'And when the next "just this once" comes asking for money, your family will hear you say no without a fight.',
  purpose:
    "And when someone tells you to play it safe, your friends will watch you keep going anyway.",
  someone:
    "And when a bad day comes from {personName}, your friends will notice it doesn't become yours.",
};

// ── Q3 ───────────────────────────────────────────────────────────────────────
const QUESTION_3 =
  "I can set your stone tonight, {firstName}, as soon as your clearing is sealed. Shall I make it so only what's yours gets through?";
const QUESTION_3_REPLIES: QuickReply[] = [
  { text: "Yes, only what's mine", value: "yes" },
  { text: "I think so", value: "maybe" },
  { text: "What would I get?", value: "what" },
];
const AFTER_Q3_WHAT = ["Fair question. Here's all of it."];
const AFTER_Q3: Record<string, string[]> = {
  yes: ["Then I'll set it tonight, right after your clearing.", "Here's how you wear it."],
  maybe: ["That's alright. It's a lot for one night.", "Let me tell you how it works once it's on you."],
  what: AFTER_Q3_WHAT,
  // NOTES FOR BUILD: "Default goes to what."
  default: AFTER_Q3_WHAT,
};

// ── BUCKET (one per topic) ────────────────────────────────────────────────────
const BUCKET: Record<Bucket, string[]> = {
  love: [
    "It goes on your left wrist, {firstName}. That's your receiving hand.",
    "It's the hand everything reaches first. Whoever reaches for you, reaches that hand.",
    "So in love, everything coming toward you goes through the stone before it gets to your heart.",
    "A man who means it gets through. The next one who looks a lot like the last one doesn't. His pull stays in the stone.",
  ],
  money: [
    "It goes on your left wrist, {firstName}. That's your receiving hand.",
    'It\'s the hand money reaches first. Your pay, a new offer, every "can you help me out" reaches for that hand.',
    "So everything coming toward your money goes through the stone before it gets to you.",
    "What's meant for you gets through. The loan that never comes back, and the deal that looks like the last bad one, stay in the stone.",
  ],
  purpose: [
    "It goes on your left wrist, {firstName}. That's your receiving hand.",
    "It's the hand everything reaches first. Chances, advice, other people's plans for your life.",
    "So everything coming toward your path goes through the stone before it gets to you.",
    "The right chance gets through. The doubts, and the next safe choice that looks like the last one, stay in the stone.",
  ],
  someone: [
    "It goes on your left wrist, {firstName}. That's your receiving hand.",
    "Whatever comes from {personName} reaches that hand first. The texts, the moods, the long quiet spells.",
    "So it all goes through the stone before it gets to your heart.",
    "What's real between you gets through. Other people's opinions, and the moods that were never yours, stay in the stone.",
  ],
};

// ── DELIVERY (the 30-day line stays, "until it's full" included) ─────────────────
const DELIVERY = [
  "I'll ship your stone within 48 hours, in a velvet pouch with a card from me.",
  'When it arrives, put it on and say this once: "Only what\'s mine gets through."',
  "That's your whole part. The setting is done before it leaves my hands.",
  "It works for at least 30 days, until it's full.",
];

// ── OFFER ────────────────────────────────────────────────────────────────────
const OFFER = [
  "The Protection Ritual is {upsellPrice}, {firstName}.",
  "That covers tonight's setting, the stone itself, and shipping to your door.",
  "It goes on the card you just used.",
  "Shall I set your stone tonight?",
];

// ── SOFT_DECLINE / SUCCESS / SHIPPING_CONFIRMED ─────────────────────────────────
const SOFT_DECLINE = [
  "That's alright, {firstName}. Your clearing is still set for tonight.",
  "What's in you comes out, and I seal it so it stays out. Just as I promised.",
  "Your reading arrives within 24 hours. Watch your inbox.",
  "And the next time someone's bad mood comes looking for you, remember it isn't yours to carry home.",
  "I'll be thinking of you tonight while I work.",
];

const SUCCESS = [
  "Wonderful, {firstName}.",
  "Tonight I clear what's in you, then I set your stone for what comes at you.",
  "Your stone ships within 48 hours. Where should I send it?",
];

const SHIPPING_CONFIRMED = [
  "Got it. That's where your stone is going, {firstName}.",
  'When it arrives, put it on your left wrist and say once: "Only what\'s mine gets through."',
  "Your clearing reading arrives within 24 hours. Watch your inbox.",
  "Tonight, what's in you comes out for good. Then your stone learns what's yours.",
  "Rest well, dear.",
];

// ── Typed answers ─────────────────────────────────────────────────────────────
// The matching in NOTES FOR BUILD, in its order. A button tap runs through these too (the
// hook matches the button's text), so every button lands on its own branch.
//
// Curly apostrophes are straightened first: a phone keyboard types "what’s", and without
// this "only what’s mine" would miss the Q3 yes pattern and fall to "what", the exact
// trap the Q3 order exists to avoid.
const norm = (input: string) => input.toLowerCase().replace(/[‘’ʼ]/g, "'");

export function detectFilterQ1(input: string): string {
  const t = norm(input);
  // maybe FIRST: "not always" contains "always".
  if (/sometimes|a bit|a little|depends|not always/.test(t)) return "maybe";
  // A "no" before yes: "not me" contains "me", which would land on "I thought so."
  if (/\bnot me\b|^\s*(no|nope|never|not really)\b/.test(t)) return "unsure";
  if (/yes|always|every time|\bme\b|\bi am\b/.test(t)) return "yes";
  if (/not sure|don't know|no idea|unsure/.test(t)) return "unsure";
  return "unsure";
}

export function detectFilterQ2(input: string): string {
  const t = norm(input);
  if (/yes|only the good|want (that|it)|please/.test(t)) return "yes";
  if (/makes sense|understand|i see|get it/.test(t)) return "understand";
  if (/how|filter|pond|explain|more|why/.test(t)) return "more";
  return "understand";
}

export function detectFilterQ3(input: string): string {
  const t = norm(input);
  // yes FIRST: "only what's mine" contains "what".
  if (/yes|only what'?s mine|please|set it|do it|ready/.test(t)) return "yes";
  if (/think so|maybe|probably|i guess/.test(t)) return "maybe";
  if (/what|get|include|cost|price/.test(t)) return "what";
  return "what";
}

export interface FbU1FilterOptions {
  bucket: Bucket;
  // true only for a buyer who saw the candle bend at her name (plain /fb chat B).
  candle: boolean;
}

/** Arm B's Upsell 1 conversation for one buyer: her topic, and whether she saw the candle. */
export function fbU1FilterCopy({ bucket, candle }: FbU1FilterOptions): Upsell1Copy {
  const topic: Bucket = isFilterBucket(bucket) ? bucket : "love";
  return {
    CONFIRMATION,
    GAP: [...GAP_BEFORE, GAP_TOPIC[topic], ...GAP_AFTER],
    RISK,
    QUESTION_1,
    QUESTION_1_REPLIES,
    AFTER_Q1,
    SOLUTION,
    LAVA_INTRO,
    RITUAL: [...RITUAL_FIRST, candle ? RITUAL_CANDLE_LINE : RITUAL_ALTAR_LINE, ...RITUAL_REST],
    FEEL: [...FEEL_BEFORE, FEEL_TOPIC[topic]],
    DELIVERY,
    OFFER,
    SUCCESS,
    SHIPPING_CONFIRMED,
    SOFT_DECLINE,
    // One topic per copy object, so GAP, FEEL and BUCKET can never disagree. The hook
    // passes the same userData.bucket this object was built for. {personName} is filled
    // by personalizeMessage(), which falls back to "them".
    bucketMessages: () => BUCKET[topic],
    QUESTION_2,
    QUESTION_2_REPLIES,
    AFTER_Q2,
    QUESTION_3,
    QUESTION_3_REPLIES,
    AFTER_Q3,
    detectIntent: { q1: detectFilterQ1, q2: detectFilterQ2, q3: detectFilterQ3 },
    // Same stage order as today (CONFIRMATION → … → OFFER).
    chain: V1_CHAIN_1,
    pauses: {},
    acceptLabel: "Yes, set my stone tonight",
    // Same as arm A, so the only difference between the arms is the script.
    placeholderNames: [],
  };
}
