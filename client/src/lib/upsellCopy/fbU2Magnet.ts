// /fb Upsell 2 copy test (v1_fb_u2_copy_2026), arm B: "hook M, the magnet".
//
// Arm A is today's V1_UPSELL2, untouched: an arm-A buyer gets no copy override at all, so
// the hook resolves V1_UPSELL2 exactly as it always has. This file is arm B ONLY, shipped as
// its own copy object the way the backend offers are, so nothing the live funnels read
// (v1.ts, upsell2Messages.ts, V1_UPSELL2) changes.
//
// Source, approved and transcribed word for word:
//   docs/superpowers/specs/2026-11-27-v1-fb-u2-copy-2026-hook-M-magnet.md
// fbU2Magnet.test.ts reads that file and fails on any line that drifts from it.
//
// Per buyer, not one shared object: money and purpose swap a handful of lines (OTHER TOPICS),
// someone keeps the love lines and changes only Q2, and RITUAL_INSTRUCTION bubble 2 names the
// candle only for a buyer who saw it in /fb chat B. Build it with fbU2MagnetCopy({ bucket,
// candle }).
//
// The two AI beats (MANIFEST_REVEAL, MANIFEST_PERSONALIZE) are written by the server with the
// magnet prompts (aiPrompts: "magnet" → buildManifestRevealMagnetPrompt /
// buildManifestPersonalizeMagnetPrompt); the script's fallbacks play when they come back empty.
//
// ⛔ No em or en dashes in any string here (copy rule; asserted in the test).

import type { Bucket } from "@shared/types";
import type { QuickReply } from "@/lib/upsell2Messages";
import { V1_CHAIN_2, V1_UPSELL2 } from "./v1";
import type { Upsell2Copy } from "./types";

export const MAGNET_BUCKETS: readonly Bucket[] = ["love", "money", "purpose", "someone"];

export function isMagnetBucket(bucket: unknown): bucket is Bucket {
  return typeof bucket === "string" && (MAGNET_BUCKETS as readonly string[]).includes(bucket);
}

// The script writes love in full; money and purpose swap the lines OTHER TOPICS lists, and
// someone "keeps the love lines" except Q2.
type Swapped = "love" | "money" | "purpose";
const swapped = (b: Bucket): Swapped => (b === "someone" ? "love" : b);

// ── PATH_A_OPEN (bubble 5 is the topic's own) ─────────────────────────────────────
const PATH_A_OPEN_BEFORE = [
  "{firstName}... both are confirmed. Your clearing and your lava stone. Tonight's work will be powerful.",
  "Your lava stone goes on your left wrist. It looks after you, and lets in what's yours.",
  "But I want to ask you something before I begin...",
  "When the block is gone, and your stone is on... what then?",
];
const PATH_A_OPEN_5: Record<Swapped, string> = {
  love: "The clearing takes out what's in your way. Your stone looks after what comes in. But {firstName}... neither one draws love to you.",
  money:
    "The clearing takes out what's in your way. Your stone looks after what comes in. But {firstName}... neither one draws money to you.",
  purpose:
    "The clearing takes out what's in your way. Your stone looks after what comes in. But {firstName}... neither one draws the right chances to you.",
};
const PATH_A_OPEN_AFTER = [
  "While we were talking, I saw something about what you asked for. I haven't told you yet.",
];

// ── PATH_B_OPEN ───────────────────────────────────────────────────────────────────
const PATH_B_OPEN = [
  "That's alright about the stone, {firstName}. Your clearing is still set for tonight.",
  "Your clearing takes out what's been in your way. I seal it, and it stays out.",
  "But before I begin, there's something I saw while we were talking. I haven't told you yet.",
  "It isn't about what's in your way. It's about what you asked for.",
];

// ── MANIFEST_REVEAL fallback (the AI line itself is the server's magnet prompt) ────────
export const REVEAL_FALLBACK = "I saw past the block, {firstName}... and what you asked for is close.";

// ── GAP (money swaps bubbles 1 and 2; purpose swaps 1, 2 and 4) ──────────────────────
const GAP: Record<Swapped, string[]> = {
  love: [
    "Clearing the way is only half of it, {firstName}. The other half is drawing love to you.",
    "Most women know two ways to get love. Chase it, or wait for it.",
    "Your friends have watched you do both, dear.",
    "Both wear you out. And neither one draws it to you.",
  ],
  money: [
    "Clearing the way is only half of it, {firstName}. The other half is drawing money to you.",
    "Most women know two ways to get more money. Work harder for it, or wait for a lucky break.",
    "Your friends have watched you do both, dear.",
    "Both wear you out. And neither one draws it to you.",
  ],
  purpose: [
    "Clearing the way is only half of it, {firstName}. The other half is drawing the right chances to you.",
    "Most women know two ways to find their path. Push for it, or wait for the right moment.",
    "Your friends have watched you do both, dear.",
    "Both wear you out. And neither one draws the right chances to you.",
  ],
};

// ── Q1 (the question changes by topic; the buttons stay) ─────────────────────────────
const QUESTION_1: Record<Swapped, string> = {
  love: "Would you like love to come to you, without chasing it, {firstName}?",
  money: "Would you like money to come to you, without chasing it, {firstName}?",
  purpose: "Would you like the right chances to come to you, without chasing them, {firstName}?",
};
const QUESTION_1_REPLIES: QuickReply[] = [
  { text: "Yes, I'd love that", value: "yes" },
  { text: "I think so", value: "maybe" },
  { text: "I'm not sure", value: "unsure" },
];
const AFTER_Q1: Record<string, string[]> = {
  yes: [
    "I thought so, dear. You shouldn't have to chase.",
    "And you shouldn't have to sit and wait, either.",
  ],
  maybe: [
    "That's honest. When you've chased or waited a long time, it's hard to picture anything else.",
    "There is another way, dear.",
  ],
  unsure: ["That's alright. Most women have never been shown another way.", "Let me show you one."],
  default: ["Let me show you another way, {firstName}."],
};

// ── INTRODUCE (bubble 2 is the topic's own; the photo shows after bubble 5) ────────────
const INTRODUCE_1 = "I made something for exactly this, {firstName}.";
const INTRODUCE_2: Record<Swapped, string> = {
  love: "Not to clear anything. Not to protect you. To draw love to you.",
  money: "Not to clear anything. Not to protect you. To draw money to you.",
  purpose: "Not to clear anything. Not to protect you. To draw the right chances to you.",
};
const INTRODUCE_REST = [
  "It's a bracelet of eight stones. I call it the Manifestation Bracelet.",
  "This bracelet works like a magnet. Tonight I set it to what you asked for, and it draws that to you.",
  "A magnet doesn't go looking for anything, dear. Things come to it.",
];

// ── STONES (shared) ─────────────────────────────────────────────────────────────────
const STONES = [
  "Eight stones, {firstName}. Each one draws something different to you.",
  "Green Aventurine, the green one, is the luck stone. It draws luck, like the chance meeting you never planned.",
  "Citrine, the yellow one, is the merchant's stone. It draws money.",
  "Amethyst, the purple one, draws calm. The kind where you sleep right through the night.",
  "Tiger's Eye, with its gold stripes, draws courage. You say yes when it counts.",
  "Clear Quartz draws clear answers, so you know what's right for you.",
  "Hematite, the shiny grey one, draws people you can count on. Pyrite, the shiny gold one, draws success at work.",
  "And Malachite, deep green with darker bands, draws love. The kind that stays.",
  "Eight stones, {firstName}. Tonight I set all eight to what you asked for.",
];

// ── Q2 (the question changes by topic, and so does button 2) ──────────────────────────
const QUESTION_2: Record<Bucket, string> = {
  love: "Is love the thing you want most right now, {firstName}?",
  money: "Is money the thing you want most right now, {firstName}?",
  purpose: "Is finding your path the thing you want most right now, {firstName}?",
  // {personName} falls back to "them" (personalizeMessage): "Is love with them the thing…"
  someone: "Is love with {personName} the thing you want most right now, {firstName}?",
};
const Q2_BUTTON_2: Record<Bucket, string> = {
  love: "Love and more",
  money: "Money and more",
  purpose: "That and more",
  someone: "That and more",
};
const questionTwoReplies = (b: Bucket): QuickReply[] => [
  { text: "Yes, it is", value: "yes" },
  { text: Q2_BUTTON_2[b], value: "more" },
  { text: "I'm not sure", value: "unsure" },
];
const AFTER_Q2: Record<string, string[]> = {
  yes: [
    "Then that's what I'll set your stones for, dear.",
    "And here are the ones that matter most for it.",
  ],
  more: [
    "Good. All eight work together, so it draws more than one thing.",
    "But for what you asked for, some stones matter more than others.",
  ],
  unsure: [
    "That's alright. You told me earlier what you want, and I remember it.",
    "Here are the stones that matter most for that.",
  ],
  default: ["Here are the stones that matter most for you, {firstName}."],
};

// ── MANIFEST_PERSONALIZE fallback, per topic (love and someone: Malachite) ──────────────
export const PERSONALIZE_FALLBACK: Record<Swapped, string> = {
  love: "For you, {firstName}, Malachite matters most. It draws love, the kind that stays.",
  money: "For you, {firstName}, Citrine matters most. It draws money.",
  purpose:
    "For you, {firstName}, Tiger's Eye matters most. It draws courage, so you say yes when the right chance comes.",
};

// ── RITUAL_INSTRUCTION (bubble 2 names the candle only for a buyer who saw it) ──────────
// The candle bent at her name in /fb chat B (fbBNameLines). A buyer who was never in chat B
// never saw it, so she gets the swap from the NOTES FOR BUILD.
export const RITUAL_CANDLE_LINE =
  "While I'm doing your clearing, I'll set your bracelet beside the candle that bent at your name.";
export const RITUAL_ALTAR_LINE = "While I'm doing your clearing, I'll set your bracelet on my altar.";
const RITUAL_FIRST = ["Here's what I'll do tonight, {firstName}."];
const RITUAL_REST = [
  "Once the block is out, I can see what you asked for plainly. That's when I set all eight stones to it, one by one.",
  "After that, it works on its own. You don't have to do a thing.",
  "You wear it on your right wrist, always the right. That's the hand you hold out to people, so it's always out in front, where it works best.",
];

// ── RITUAL_PATH_A_EXTRA (Path A only, after RITUAL_INSTRUCTION) ─────────────────────────
const RITUAL_PATH_A_EXTRA: Record<Swapped, string> = {
  love: "Stone on your left, bracelet on your right. Your stone looks after what comes in, and your bracelet draws love to you.",
  money:
    "Stone on your left, bracelet on your right. Your stone looks after what comes in, and your bracelet draws money to you.",
  purpose:
    "Stone on your left, bracelet on your right. Your stone looks after what comes in, and your bracelet draws the right chances to you.",
};

// ── WHAT_RECEIVE (bubble 4 is the topic's own) ─────────────────────────────────────────
const WHAT_RECEIVE_BEFORE = [
  'It ships within 48 hours, already set to what you asked for. When it arrives, put it on and say once, "What\'s mine comes to me."',
  "That's all you do. It's the same for every woman I send one to.",
  "Most of them start noticing shifts within the first week. Small things at first... a feeling, a coincidence, a conversation that seems too perfectly timed. Then bigger.",
];
const WHAT_RECEIVE_4: Record<Swapped, string> = {
  love: 'And your friends will notice. One of them will ask, "Since when does love come this easy to you?"',
  money:
    'And your family will notice. One of them will ask, "Since when does money come this easy to you?"',
  purpose:
    'And your friends will notice. One of them will ask, "Since when do the right chances just come to you?"',
};

// ── Q3 (shared) ───────────────────────────────────────────────────────────────────────
const QUESTION_3 = "Shall I set yours tonight, {firstName}, while I'm doing your clearing?";
const QUESTION_3_REPLIES: QuickReply[] = [
  { text: "Yes, set it tonight", value: "yes" },
  { text: "I think so", value: "maybe" },
  { text: "What exactly do I get?", value: "what" },
];
const AFTER_Q3: Record<string, string[]> = {
  yes: ["Then I'll set it tonight, during your clearing.", "Here's the rest."],
  maybe: ["That's alright, dear. It's a lot for one night.", "Let me make it simple."],
  what: [
    "Fair question. Eight stones on one bracelet, set tonight to what you asked for, and shipped to you within 48 hours.",
    "All you do is wear it.",
  ],
  default: ["Here's the rest, {firstName}."],
};

// ── SOCIAL_PROOF / PRICE (shared; today's proof and guarantee lines, kept) ─────────────
const SOCIAL_PROOF = [
  "I've sent these to hundreds of seekers now. The ones who wear them daily... their stories still give me chills.",
  "They don't just tell me something changed. They tell me everything changed. Like the universe finally heard them.",
];
const PRICE = [
  "The Manifestation Bracelet is $47, {firstName}, set tonight and shipped straight to you. It goes on the card you just used.",
  "Same 30-day guarantee. If you don't feel the shift... if nothing starts moving toward you... every penny back.",
  "I've never had anyone return one.",
];

// ── URGENCY (bubble 3 is the topic's own) ──────────────────────────────────────────────
const URGENCY_BEFORE = [
  "I can only set it while I'm doing your clearing tonight, {firstName}. Once I close the session, that chance is gone.",
  "Your clearing is sealed either way. I promise you that.",
];
const URGENCY_3: Record<Swapped, string> = {
  love: "But if you want something drawing love to you, this is the moment.",
  money: "But if you want something drawing money to you, this is the moment.",
  purpose: "But if you want something drawing the right chances to you, this is the moment.",
};

// ── DOWNSELL (shared) ─────────────────────────────────────────────────────────────────
const DOWNSELL = [
  "{firstName}... I hear you.",
  "Let me do something I don't normally do.",
  "I have a bracelet that's already been cleansed and prepared. The same eight stones.",
  "It won't be set to what you asked for tonight, so it won't draw that the way a fresh one would.",
  "But each stone still draws its own thing. Luck, money, calm, courage, love.",
  "I can send it to you for $30 instead, on the same card.",
  "This is the lowest I can offer, dear. The stones alone cost me nearly that.",
];

// ── SUCCESS variants (shared; a downsell buyer sees these too) ──────────────────────────
const SUCCESS = [
  "Wonderful, {firstName}. The bracelet is yours.",
  "Eight stones, and each one draws something good to you.",
  "It ships within 48 hours.",
];
const SUCCESS_HAS_SHIPPING = [
  "Wonderful, {firstName}. The bracelet is yours.",
  "Eight stones, and each one draws something good to you.",
  "It ships within 48 hours, to the same address as your lava stone.",
];
const SUCCESS_NEEDS_SHIPPING = [
  "Wonderful, {firstName}. The bracelet is yours.",
  "Eight stones, and each one draws something good to you.",
  "It ships within 48 hours. I just need to know where to send it.",
];
// NOTES FOR BUILD: "full-price buyers can get one extra SUCCESS bubble after bubble 1". The
// hook plays it from the $47 accept only (handleAccept); the $30 downsell accept never does.
export const FULL_PRICE_SUCCESS_EXTRA = "I'll set it tonight, during your clearing.";

const SHIPPING_CONFIRMED = [
  "It's all set, {firstName}.",
  'When your bracelet arrives, put it on your right wrist and say once, "What\'s mine comes to me."',
  "That's all you do. The stones do the rest.",
  "Watch your inbox. Your clearing reading arrives within 24 hours.",
  "Thank you for trusting me with this, dear. I'll be thinking of you tonight while I work.",
];

const SOFT_DECLINE = [
  "I understand, {firstName}. Your clearing is set for tonight.",
  "I take out what's been in your way, and I seal it so it stays out. Just as I promised.",
  "Your reading arrives within 24 hours. Watch your inbox.",
  "And if you ever want a bracelet of your own, I'll be here.",
  "Take care, dear. I'll be thinking of you tonight while I work.",
];

// ── Typed answers ─────────────────────────────────────────────────────────────────────
// The matching in NOTES FOR BUILD, in its order. A button tap runs through these too (the
// hook matches the button's text), so every button lands on its own branch. No match goes to
// the default branch, and so does a plain "no" (the notes: "No match (including 'no') goes to
// default").
//
// Curly apostrophes are straightened first: a phone keyboard types "don’t" and "I’d", and
// without this "I don’t know" would miss the unsure pattern.
//
// One guard the notes' patterns need: a typed NO can still contain a yes word ("No, I
// wouldn't" has "i would"; "it isn't" has "it is"; "not ready" has "ready"). A no never
// takes the yes branch; it carries on down the list like any other answer, so it still
// reaches unsure / maybe / what when it says so, and default when it doesn't.
const norm = (input: string) => input.toLowerCase().replace(/[‘’ʼ]/g, "'");
const SAYS_NO =
  /^\s*(no|nope|nah|never)\b|\bnot (really|ready|yet|now|for me)\b|\b(wouldn'?t|isn'?t|don'?t want)\b/;

export function detectMagnetQ1(input: string): string {
  const t = norm(input);
  if (/not sure|don't know|dont know|no idea|unsure/.test(t)) return "unsure";
  if (/think so|maybe|probably|i guess|sort of|kind of/.test(t)) return "maybe";
  if (!SAYS_NO.test(t) && /yes|yeah|love that|i'd love|i would|please|of course|definitely|absolutely/.test(t)) {
    return "yes";
  }
  return "default";
}

export function detectMagnetQ2(input: string): string {
  const t = norm(input);
  if (/not sure|don't know|dont know|no idea|unsure/.test(t)) return "unsure";
  // more BEFORE yes: "Love and more" / "Money and more" contain "love" / "money".
  if (/and more|more than|other things|everything|all of it|both|as well/.test(t)) return "more";
  if (!SAYS_NO.test(t) && /yes|yeah|it is|definitely|of course|love|money|path/.test(t)) return "yes";
  return "default";
}

export function detectMagnetQ3(input: string): string {
  const t = norm(input);
  if (!SAYS_NO.test(t) && /yes|yeah|set it|please|do it|ready|let's/.test(t)) return "yes";
  if (/think so|maybe|probably|i guess/.test(t)) return "maybe";
  if (/what|get|include|cost|price|how much/.test(t)) return "what";
  return "default";
}

export interface FbU2MagnetOptions {
  bucket: Bucket;
  // true only for a buyer who saw the candle bend at her name (plain /fb chat B).
  candle: boolean;
}

/** Arm B's Upsell 2 conversation for one buyer: her topic, and whether she saw the candle. */
export function fbU2MagnetCopy({ bucket, candle }: FbU2MagnetOptions): Upsell2Copy {
  const topic: Bucket = isMagnetBucket(bucket) ? bucket : "love";
  const t = swapped(topic);
  return {
    PATH_A_OPEN: [...PATH_A_OPEN_BEFORE, PATH_A_OPEN_5[t], ...PATH_A_OPEN_AFTER],
    PATH_B_OPEN,
    // null ⇒ the hook asks /api/upsell2/reading, which writes these with the magnet prompts.
    REVEAL: null,
    PERSONALIZE: null,
    GAP: GAP[t],
    QUESTION_1: QUESTION_1[t],
    QUESTION_1_REPLIES,
    AFTER_Q1,
    INTRODUCE: [INTRODUCE_1, INTRODUCE_2[t], ...INTRODUCE_REST],
    STONES,
    QUESTION_2: QUESTION_2[topic],
    QUESTION_2_REPLIES: questionTwoReplies(topic),
    AFTER_Q2,
    RITUAL_INSTRUCTION: [...RITUAL_FIRST, candle ? RITUAL_CANDLE_LINE : RITUAL_ALTAR_LINE, ...RITUAL_REST],
    RITUAL_PATH_A_EXTRA: RITUAL_PATH_A_EXTRA[t],
    WHAT_RECEIVE: [...WHAT_RECEIVE_BEFORE, WHAT_RECEIVE_4[t]],
    QUESTION_3,
    QUESTION_3_REPLIES,
    AFTER_Q3,
    SOCIAL_PROOF,
    PRICE,
    URGENCY: [...URGENCY_BEFORE, URGENCY_3[t]],
    DOWNSELL,
    SUCCESS,
    SUCCESS_HAS_SHIPPING,
    SUCCESS_NEEDS_SHIPPING,
    SHIPPING_CONFIRMED,
    SOFT_DECLINE,
    detectIntent: { q1: detectMagnetQ1, q2: detectMagnetQ2, q3: detectMagnetQ3 },
    acceptLabel: "Yes, set my bracelet tonight",
    revealFallback: REVEAL_FALLBACK,
    personalizeFallback: PERSONALIZE_FALLBACK[t],
    aiPrompts: "magnet",
    fullPriceSuccessExtra: FULL_PRICE_SUCCESS_EXTRA,
    // Same stage order as today (PATH_A/B_OPEN → MANIFEST_REVEAL → … → URGENCY).
    chain: V1_CHAIN_2,
    pauses: {},
    // NOTES FOR BUILD: "The downsell decline label stays 'No thanks, just the clearing'".
    downsellDeclineLabel: V1_UPSELL2.downsellDeclineLabel,
    // Same as arm A, so the only difference between the arms is the script.
    placeholderNames: [],
  };
}
