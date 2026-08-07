// Offer 02 — Twin Flame Tarot: the U1 and U2 conversations, rebuilt.
//
// ⚠ THIS IS NOT V1'S FLOW WITH NEW OPENING BEATS ANY MORE. Two things forced a
// fuller redo (operator, 2026-08-06):
//
//   1. NOTHING IS COLLECTED. 02's booking step asks for nothing before the money
//      by design (00h rule 2, rule 9 — no text input anywhere), so at /welcome1
//      there is no bucket, no concern, no personName, and often no first name.
//      V1's flow leans on all four: a bucket-keyed block, two Claude calls that
//      interpolate her stated desire, and ~20 name merges.
//   2. NO ASKING. The three quick-reply questions in each flow are gone. The
//      booking step already established that Evelyn does not ask this buyer
//      anything, and a question she cannot answer usefully is worse than none.
//
// The replacement for both is the SPREAD ITSELF. Per 02-P1 the twelve are FIXED
// — same cards, same houses, same three closed loops, for every buyer — so
// Evelyn can speak concretely to all of them without knowing anything about any
// of them:
//
//     House 2   Wheel of Fortune   first windfall; "rewards a quick answer and
//                                  punishes a slow one"; be careful who you tell
//     House 5   Chariot            THE ARRIVAL, already travelling, not a
//                                  stranger; "arriving and recognised are two
//                                  different events"; beware the discouraging one
//     House 8   Death              second windfall, through someone else's ending
//     House 12  High Priestess     her Tower — present, unspoken, a decision
//                                  already taken. ⛔ "Do not go looking."
//
// ⚠ Every question in V1's flow became an ASSUMED ANSWER here, not a deletion.
// The beats those questions carried (making the risk personal, the micro-pause
// before the offer) are kept as statements. A woman who has just had twelve
// cards laid for her is not asked whether she has felt this before; she is told
// that she has.
//
// ⚠ U1 sells against her twelfth house WITHOUT selling against the product.
// 02-P1 instructs her plainly not to investigate what is hidden there. The stone
// is offered as what she does INSTEAD of looking — never as a way to find out.
// An upsell that promised disclosure would put her back on her partner's phone
// and contradict the reading she just paid for.
//
// Copy specs this supersedes in part — recorded, since all three are written as
// "only the opening beats change":
//   02-U1a (opening beats)  — kept, plus RISK now absorbs Q1's work
//   02-U1b (bucket block)   — REPLACED by one universal spread block
//   02-U2a (path opens)     — Path B trimmed; its Chariot reveal moved into the
//                             shared REVEAL so both paths converge
//
// The remaining ~40 reused messages were also de-clearing'd: V1's downstream
// copy says "clearing" 14 times, which is a product this buyer never bought.

import type { Bucket } from "@shared/types";
import {
  QuickReply,
  UpsellStage,
  UPSELL_CONFIRMATION,
  UPSELL_GAP,
  UPSELL_RISK,
  UPSELL_QUESTION_1,
  UPSELL_QUESTION_1_REPLIES,
  UPSELL_AFTER_Q1,
  UPSELL_SOLUTION,
  UPSELL_LAVA_INTRO,
  UPSELL_RITUAL,
  UPSELL_FEEL,
  UPSELL_BUCKET_MESSAGES,
  UPSELL_DELIVERY,
  UPSELL_OFFER,
  UPSELL_SOFT_DECLINE,
  UPSELL_SUCCESS,
  UPSELL_SHIPPING_CONFIRMED,
} from "@/lib/upsellMessages";
import {
  Upsell2Stage,
  UPSELL2_PATH_A_OPEN,
  UPSELL2_PATH_B_OPEN,
  UPSELL2_GAP,
  UPSELL2_INTRODUCE,
  UPSELL2_STONES,
  UPSELL2_RITUAL_INSTRUCTION,
  UPSELL2_RITUAL_PATH_A_EXTRA,
  UPSELL2_WHAT_RECEIVE,
  UPSELL2_SOCIAL_PROOF,
  UPSELL2_PRICE,
  UPSELL2_URGENCY,
  UPSELL2_DOWNSELL,
  UPSELL2_SUCCESS,
  UPSELL2_SUCCESS_HAS_SHIPPING,
  UPSELL2_SUCCESS_NEEDS_SHIPPING,
  UPSELL2_SHIPPING_CONFIRMED,
  UPSELL2_SOFT_DECLINE,
} from "@/lib/upsell2Messages";
import { isTwinFlameOffer } from "@/lib/funnel";

// ============================================================================
// U1 — the Protection Ritual, for a woman who booked twelve cards
// ============================================================================

const TF_CONFIRMATION = [
  "It's done, {firstName}. Your twelve are booked, and I'll lay them tonight.",
  "You'll have the whole spread inside 24 hours — every house, including the one your Tower is standing in.",
  "But before I let you go, dear, there's something I need to say about that third card.",
];

// V1 argues "removal leaves a wound open for 30 days". 02 argues "sight is not
// protection" — the brief's own limit on what a spread does, so the bump, the
// reading and both upsells argue from one mechanism instead of three.
const TF_GAP = [
  "The spread will tell you what your Tower is. Its name, its face, and how close it is. That's what you've paid me for and that's what you'll get.",
  "But here's what most women don't understand, {firstName}...",
  "Seeing a thing coming and being able to stand in front of it are two different abilities.",
  "A reading gives you the first one. It does not give you the second.",
];

// ⚠ The last three messages are what V1 got out of Question 1 and its "yes"
// acknowledgment. Stated, not asked. "It didn't promise there was only one" is a
// bound on what the card said, NOT a new prediction about a real person — do not
// let a later pass sharpen it into a claim about someone identifiable.
const TF_RISK = [
  "And there's a part of this nobody warns you about.",
  "For the next few weeks, while you're waiting for it — you're more exposed than you were before I drew, not less.",
  "Because now you're watching. And a woman who's watching for one thing has her guard in exactly one place.",
  "I've seen it too many times, {firstName}. She sees the Tower coming, braces beautifully for it, and something else walks straight in through the side of her life while she's facing the front.",
  "The card told you it arrives as a person. It didn't promise there was only one.",
  "And you have done this before, dear. Seen a thing coming, been right about it, and still not been able to stand in front of it when it arrived.",
  "That isn't a failure of sight. You saw it. Knowing and being able to stand there are two separate things, and nobody ever taught you the second one.",
  "I don't want that for you this time.",
];

const TF_SOLUTION = [
  "So there is a second piece of work I do, and it's the only other thing I offer. A Protection Ritual.",
  "It doesn't touch what's coming. It puts a guard on what can reach you while you wait for it.",
  "And I anchor that guard to something physical, so it holds when I'm not the one thinking of you.",
];

const TF_LAVA_INTRO = [
  "For protection I work with volcanic lava stone.",
  "It isn't a decorative choice, {firstName}.",
  "Lava is what the earth makes when it destroys the old ground and lays new ground in its place. That is the whole of what your twelve describe.",
  "And the stone is porous. It takes a thing in before that thing reaches you — that's the plain physical fact underneath the work, and it's why I use this and not something prettier.",
];

// ⚠ V1's version says "using the energy signature from our conversation". There
// was no conversation. She came from a letter and a booking page — but she gave
// me twelve houses, which is more.
const TF_RITUAL = [
  "Here's exactly what I do, {firstName}.",
  "Tonight, between two and four — the same hours I'll be laying your twelve — I begin.",
  "Your stone goes on my altar, beside a white candle and a vessel of blessed water.",
  "I work from your own cards. Twelve houses is more of a woman than most people ever put in my hands, and it's more than enough to call you forward.",
  "Then I speak the protection invocation. Those words came down my grandmother's line and I've never written them anywhere.",
  "I circle the stone with sage smoke seven times, sealing you into it.",
  "It takes about two hours and it costs me something. For a woman with a twelfth house like yours, it's worth doing properly.",
  "When it's done, the stone sits under moonlight until dawn to lock the charge.",
];

const TF_FEEL = [
  "You may feel something tonight, {firstName}.",
  "Warmth through your chest. Dreams more vivid than they've any right to be.",
  "A sense of being watched over.",
  "That's me, working at a distance. Don't be alarmed by it — it means the charge took.",
];

// Replaces V1's four bucket-keyed blocks. She never chose a bucket, and she
// never needed to: every one of these facts is in every buyer's spread.
//
// ⚠ Messages 2 and 3 carry the left-wrist mechanic verbatim — UPSELL_DELIVERY
// and UPSELL2_RITUAL_PATH_A_EXTRA downstream both refer back to it.
// ⚠ The last message is the hinge. 02-P1 tells her not to investigate her
// twelfth house; this offers the stone as what she does INSTEAD of looking. It
// must never be re-written into a promise of disclosure.
const TF_SPREAD_BLOCK = [
  "Once your stone is charged, it guards your left side through the weeks your spread is unfolding.",
  "Wear it on your LEFT wrist — your receiving hand.",
  "In this work the left side receives. Everything coming toward you — every person, every intention — passes through that hand before it reaches you.",
  "Your twelve name four people, {firstName}, and not one of them by name.",
  "The flatterers who come out for a woman whose luck is turning. The one who'd treat your good news as an opening. The one who turns gently discouraging about the thing arriving in your fifth house. And the one in your twelfth who has already decided something and hasn't said it.",
  "The stone is what stands in the doorway and decides which of them gets as far as you.",
  "And your twelfth house — I've told you not to go looking into it, and I meant it. This is what a woman does instead of looking.",
];

const TF_DELIVERY = [
  "Once the work is done, I ship your charged stone to you.",
  "It arrives in a protective velvet pouch with a card explaining how to wake it.",
  "When you receive it, hold it in both hands, close your eyes, and say: 'I am protected. I am transforming.'",
  "That phrase seals the bond between you and the stone.",
  "The guard holds strong for at least thirty days — longer for most women. Long enough to carry you through the window your spread describes.",
];

const TF_OFFER = [
  "The Protection Ritual is {upsellPrice}, {firstName}.",
  "That's the ritual, and the charged stone posted to your door.",
  "Most of the women I lay a twelve for have me do both the same night. The reading tells you what's coming; this is what stands with you while it does.",
  "Shall I put your stone on the altar tonight, beside your cards?",
];

const TF_SUCCESS = [
  "Good, {firstName}.",
  "Both are set now — your twelve, and your stone.",
  "I'll do them together tonight. The work is better that way; I'll already be looking at you.",
  "Your charged stone ships within 48 hours.",
  "I just need to know where to send it.",
];

const TF_SHIPPING_CONFIRMED = [
  "Your stone is on its way, {firstName}.",
  "When it arrives, hold it and say: 'I am protected. I am transforming.'",
  "That seals it.",
  "Tonight, while I work, you may feel warmth or dream vividly. That's normal. That's me.",
  "Watch your inbox — your twelve arrive within 24 hours.",
  "Thank you for trusting me with this, {firstName}.",
  "I'll be at the table tonight.",
];

const TF_SOFT_DECLINE = [
  "I understand, {firstName}. It's your walk to make.",
  "Just be careful these next few weeks. That's all I'll say.",
  "If something starts arriving through the side of your life while you're facing the front — you know where I am.",
  "The stone will still be here.",
  "For now, watch your inbox. Your twelve arrive within 24 hours.",
  "Take care of yourself, dear. I'll be at the table tonight.",
];

// ============================================================================
// U2 — the Manifestation Bracelet
// ============================================================================

// ⚠ Path A must not re-sell or re-price the stone — she bought it four minutes
// ago. Message 2 acknowledges it in one line and moves on.
const TF_PATH_A_OPEN = [
  "{firstName}... both are confirmed now. Your twelve, and your stone. Tonight's work is going to be a heavy one and I'm glad you're doing it properly.",
  "Your lava stone will hold your left side — your receiving side — while the spread unfolds. Nothing unwanted reaches you through that hand.",
  "But there's something I want to say before I go, and it's the last of it.",
  "When you know what's coming... and nothing can get at you... what then?",
  "Because the spread reads your future, {firstName}, and the stone guards it. Neither one of them CALLS anything toward you.",
  "A reading is about what arrives. Protection is about what doesn't. But what about what you want?",
];

// ⚠ Follows a decline, so it does not re-argue the stone — it produces NEW
// information from the same reading, which is the only honest way to reopen a
// conversation she just closed. Trimmed so both paths hand off to REVEAL.
const TF_PATH_B_OPEN = [
  "{firstName}... I respect your decision about the stone. Your twelve will be powerful without it, and I'll lay them just the same tonight.",
  "But before I start — there's something in your draw I haven't said yet.",
  "It isn't about the Tower. That card gets the whole spread pointed at it, and it deserves it.",
  "It's about your fifth house.",
];

// Replaces the `manifest_reveal` Claude call, which interpolated her stated
// desire into the prompt — a field 02 never collects, so it would have gone out
// as an empty string with the model left to invent one. This says the same thing
// from the fixed spread, which is true for every buyer.
//
// ⚠ Must stay consistent with 02-P1: the Chariot is in the FIFTH house, it is in
// motion, and it is "not a stranger". If that assignment changes, this changes.
const TF_REVEAL = [
  "When I looked at what was coming toward you, I didn't only see the thing you have to brace for.",
  "I saw something TRAVELLING. Already in motion, already pointed at you.",
  "The Chariot fell into your fifth house, {firstName}, and the Chariot is the card of a thing already on its way. It doesn't sit still.",
  "It isn't a stranger, and it isn't far off.",
  "And here is the difficulty, dear. It's moving toward you and it cannot find you yet. Not because anything is blocking it. Because you aren't giving it anything to steer by.",
];

// ⚠ Ends on what V1 got out of Question 1 — stated, not asked.
const TF_GAP_2 = [
  "Your twelve will tell you what's coming. That I promise you.",
  "But being told a thing is on its way isn't the same as being findable when it gets here, {firstName}.",
  "You can know the room it comes through. You can guard the door it comes through. If you're putting nothing out, it still has to find you by luck.",
  "And the Chariot warns about exactly this. A thing arriving and a thing recognised are two different events.",
  "You already know the difference. You've had things pass close by before and only recognised them afterwards, once they were somebody else's.",
  "I don't want your fifth house to be one of those.",
];

const TF_INTRODUCE = [
  "So I made something for exactly this moment.",
  "Not for protection. Not for reading. For being found.",
  "A bracelet of eight stones, each one chosen for what it draws toward you.",
  "I call it a Manifestation Bracelet, and I only offer it to women whose spread says something is already moving.",
  "Yours does, {firstName}. It's sitting in your fifth house.",
];

const TF_STONES = [
  "Eight stones, {firstName}. Each one pulls a different piece of it toward you.",
  "Green Aventurine — the luck stone. It's the most powerful attractor I've ever worked with. This one opens doors. New connections. Unexpected opportunities. The things you've been asking for... this stone helps them find you.",
  "Citrine — the merchant's stone. It's been carried by traders and seekers of abundance for centuries. It doesn't just attract wealth... it attracts the confidence to receive it. The feeling that you deserve what's coming.",
  "Amethyst — your intuition amplifier. Your second house pays inside two months and your fifth is already moving, and both of those arrive as small signs before they arrive as events. This stone helps you SEE them.",
  "Tiger's Eye — the stone of bold action. It attracts the opportunities that require courage, the ones you'd normally hesitate on. Your Wheel rewards a quick answer and punishes a slow one; this is the stone for that.",
  "And four more working together — Clear Quartz to amplify every intention you set... Hematite to ground your manifestations into physical reality... Pyrite to broadcast abundance frequency outward... and Malachite to pull transformation and growth toward you like a magnet.",
  "Eight stones. Eight signals. All tuned to you tonight, while your twelve are in front of me.",
];

// Replaces the `manifest_personalize` Claude call — same reason as REVEAL. Named
// off her spread instead of off a desire she was never asked for.
const TF_PERSONALIZE = [
  "And if you want to know which of them matters most for your spread, {firstName}, it isn't a hard answer.",
  "Green Aventurine, for the fifth house. It's the strongest attractor on the bracelet, and yours is the one thing in this reading that's already travelling.",
  "Then Amethyst — because what's coming arrives on an ordinary day in ordinary clothes, and the whole difficulty is noticing it.",
  "And Tiger's Eye for your second house, which pays inside two months and won't wait politely while you think it over.",
];

const TF_RITUAL_INSTRUCTION = [
  "You'll wear this on your right wrist, {firstName}. Always the right.",
  "Your right side is your broadcasting side. It's how your energy goes out into the world — into every room you enter, every person you meet, every intention you set.",
  "The bracelet amplifies that broadcast. It takes the frequency of what you want and pushes it out further, stronger, clearer... so the thing already travelling toward you has something to steer by.",
  "Right now, you're whispering. With this, you'll be speaking at full volume.",
];

const TF_WHAT_RECEIVE = [
  "I attune each stone to you tonight, while your twelve are in front of me. By the time the bracelet reaches you, it already carries what your spread is pointed at.",
  "You'll also receive a manifestation guide — a daily 3-minute ritual to wake the bracelet each morning. It's simple. But my women tell me it's the most powerful part of their day.",
  "Most of them start noticing shifts within the first week. Small things at first — a feeling, a coincidence, a conversation that seems too perfectly timed. Then bigger.",
  // What V1 got out of Question 3, and a deliberate refusal to ask it.
  "I'm not going to ask whether you're ready, {firstName}. Your fifth house has already answered that.",
];

const TF_URGENCY = [
  "I can only attune the stones while I have your twelve in front of me, {firstName}. Once I close the spread tonight, the window to charge them to you is gone.",
  "Your reading will be powerful either way. I promise you that.",
  "But if you want to be findable when the fifth house arrives — this is the hour for it.",
];

const TF_DOWNSELL = [
  "{firstName}... I hear you.",
  "Let me do something I don't normally do.",
  "I have a bracelet that's already been cleansed and prepared — it just hasn't been attuned to anyone yet. It won't carry the full charge of tonight the way a fresh one would...",
  "But I can still connect it to you before I begin. It won't be as deeply bonded to your own spread, but the stones themselves are powerful attractors on their own.",
  "I can send it to you for $30 instead. Same eight stones. Same work. Just prepared differently.",
  "That's the lowest I can go, dear. The stones alone cost me nearly that.",
];

const TF_SUCCESS_2 = [
  "Good, {firstName}.",
  "Your Manifestation Bracelet will be attuned tonight, while your twelve are in front of me.",
  "Eight stones, each carrying what your spread is pointed at.",
  "It ships within 48 hours.",
];

const TF_SUCCESS_2_HAS_SHIPPING = [
  "Good, {firstName}.",
  "Your Manifestation Bracelet will be attuned tonight, while your twelve are in front of me.",
  "Eight stones, each carrying what your spread is pointed at.",
  "I'll send it to the same address as your stone.",
];

const TF_SUCCESS_2_NEEDS_SHIPPING = [
  "Good, {firstName}.",
  "Your Manifestation Bracelet will be attuned tonight, while your twelve are in front of me.",
  "Eight stones, each carrying what your spread is pointed at.",
  "It ships within 48 hours.",
  "I just need to know where to send it.",
];

const TF_SHIPPING_CONFIRMED_2 = [
  "Your Manifestation Bracelet is on its way, {firstName}.",
  "Remember — wear it on your right wrist. Always the right.",
  "Each morning, hold it and set your intention for the day. Three minutes. That's all it takes.",
  "Watch your inbox — your twelve arrive within 24 hours.",
  "Thank you for trusting me with this, {firstName}.",
  "I'll be at the table tonight.",
];

const TF_SOFT_DECLINE_2 = [
  "I understand, {firstName}. Your twelve alone are a heavy night's work.",
  "The stones are patient. If you ever want to be findable, I'll be here.",
  "Watch your inbox — your reading arrives within 24 hours.",
  "Take care, dear. I start soon.",
];

// ============================================================================
// RESOLUTION — which conversation this page is running
// ============================================================================

// Stage → the stage that follows it. This is what removes the questions: V1
// routes RISK → QUESTION_1, offer 02 routes RISK → SOLUTION, and the question
// cases in the hook are simply never entered.
export interface Upsell1Chain {
  CONFIRMATION: UpsellStage;
  GAP: UpsellStage;
  RISK: UpsellStage;
  AFTER_Q1: UpsellStage;
  SOLUTION: UpsellStage;
  LAVA_INTRO: UpsellStage;
  AFTER_Q2: UpsellStage;
  RITUAL: UpsellStage;
  FEEL: UpsellStage;
  AFTER_Q3: UpsellStage;
  BUCKET: UpsellStage;
  DELIVERY: UpsellStage;
}

export interface Upsell2Chain {
  PATH_A_OPEN: Upsell2Stage;
  PATH_B_OPEN: Upsell2Stage;
  MANIFEST_REVEAL: Upsell2Stage;
  GAP: Upsell2Stage;
  AFTER_Q1: Upsell2Stage;
  INTRODUCE: Upsell2Stage;
  STONES: Upsell2Stage;
  AFTER_Q2: Upsell2Stage;
  MANIFEST_PERSONALIZE: Upsell2Stage;
  RITUAL_INSTRUCTION: Upsell2Stage;
  WHAT_RECEIVE: Upsell2Stage;
  AFTER_Q3: Upsell2Stage;
  SOCIAL_PROOF: Upsell2Stage;
  PRICE: Upsell2Stage;
}

export interface Upsell1Copy {
  CONFIRMATION: string[];
  GAP: string[];
  RISK: string[];
  QUESTION_1: string;
  QUESTION_1_REPLIES: QuickReply[];
  AFTER_Q1: Record<string, string[]>;
  SOLUTION: string[];
  LAVA_INTRO: string[];
  RITUAL: string[];
  FEEL: string[];
  DELIVERY: string[];
  OFFER: string[];
  SUCCESS: string[];
  SHIPPING_CONFIRMED: string[];
  SOFT_DECLINE: string[];
  bucketMessages(bucket: Bucket | undefined, personName: string | null | undefined): string[];
  chain: Upsell1Chain;
  // Stage → the label on a CONTINUE tap shown after that stage's messages.
  // Not a question: one button, no branch, nothing captured. It exists purely
  // so ~50 messages don't arrive as one uninterrupted broadcast — V1 got that
  // rhythm from its three questions, and offer 02 has none. Empty on V1, whose
  // questions already break the wall.
  pauses: Partial<Record<UpsellStage, string>>;
  // Label on the accept button AND the bubble it posts as her reply.
  acceptLabel: string;
  // First names that are placeholders rather than names. /api/upsell/user-data's
  // Stripe fallback stamps "Friend" when checkout carried no firstName metadata,
  // which 02's does not — and "It's done, Friend" is worse copy than Evelyn's own
  // fallback, "dear".
  placeholderNames: readonly string[];
}

export interface Upsell2Copy {
  PATH_A_OPEN: string[];
  PATH_B_OPEN: string[];
  // When present, played instead of calling Claude for that segment.
  REVEAL: string[] | null;
  PERSONALIZE: string[] | null;
  GAP: string[];
  INTRODUCE: string[];
  STONES: string[];
  RITUAL_INSTRUCTION: string[];
  RITUAL_PATH_A_EXTRA: string;
  WHAT_RECEIVE: string[];
  SOCIAL_PROOF: string[];
  PRICE: string[];
  URGENCY: string[];
  DOWNSELL: string[];
  SUCCESS: string[];
  SUCCESS_HAS_SHIPPING: string[];
  SUCCESS_NEEDS_SHIPPING: string[];
  SHIPPING_CONFIRMED: string[];
  SOFT_DECLINE: string[];
  chain: Upsell2Chain;
  // See Upsell1Copy.pauses.
  pauses: Partial<Record<Upsell2Stage, string>>;
  downsellDeclineLabel: string;
  placeholderNames: readonly string[];
}

// V1's chain, written out so the hook has one code path. Every value is the
// stage V1 already advanced to — this table changes nothing for a live funnel.
const V1_CHAIN_1: Upsell1Chain = {
  CONFIRMATION: "GAP",
  GAP: "RISK",
  RISK: "QUESTION_1",
  AFTER_Q1: "SOLUTION",
  SOLUTION: "LAVA_INTRO",
  LAVA_INTRO: "QUESTION_2",
  AFTER_Q2: "RITUAL",
  RITUAL: "FEEL",
  FEEL: "QUESTION_3",
  AFTER_Q3: "BUCKET",
  BUCKET: "DELIVERY",
  DELIVERY: "OFFER",
};

// The questions are gone; each one's beat was absorbed into the block before it.
const TF_CHAIN_1: Upsell1Chain = {
  ...V1_CHAIN_1,
  RISK: "SOLUTION",
  LAVA_INTRO: "RITUAL",
  FEEL: "BUCKET",
};

const V1_CHAIN_2: Upsell2Chain = {
  PATH_A_OPEN: "MANIFEST_REVEAL",
  PATH_B_OPEN: "MANIFEST_REVEAL",
  MANIFEST_REVEAL: "GAP",
  GAP: "QUESTION_1",
  AFTER_Q1: "INTRODUCE",
  INTRODUCE: "STONES",
  STONES: "QUESTION_2",
  AFTER_Q2: "MANIFEST_PERSONALIZE",
  MANIFEST_PERSONALIZE: "RITUAL_INSTRUCTION",
  RITUAL_INSTRUCTION: "WHAT_RECEIVE",
  WHAT_RECEIVE: "QUESTION_3",
  AFTER_Q3: "SOCIAL_PROOF",
  SOCIAL_PROOF: "PRICE",
  PRICE: "URGENCY",
};

const TF_CHAIN_2: Upsell2Chain = {
  ...V1_CHAIN_2,
  GAP: "INTRODUCE",
  STONES: "MANIFEST_PERSONALIZE",
  WHAT_RECEIVE: "SOCIAL_PROOF",
};

const V1_UPSELL1: Upsell1Copy = {
  CONFIRMATION: UPSELL_CONFIRMATION,
  GAP: UPSELL_GAP,
  RISK: UPSELL_RISK,
  QUESTION_1: UPSELL_QUESTION_1,
  QUESTION_1_REPLIES: UPSELL_QUESTION_1_REPLIES,
  AFTER_Q1: UPSELL_AFTER_Q1,
  SOLUTION: UPSELL_SOLUTION,
  LAVA_INTRO: UPSELL_LAVA_INTRO,
  RITUAL: UPSELL_RITUAL,
  FEEL: UPSELL_FEEL,
  DELIVERY: UPSELL_DELIVERY,
  OFFER: UPSELL_OFFER,
  SUCCESS: UPSELL_SUCCESS,
  SHIPPING_CONFIRMED: UPSELL_SHIPPING_CONFIRMED,
  SOFT_DECLINE: UPSELL_SOFT_DECLINE,
  // Byte-identical to the hook's old inline lookup, including a missing
  // personName, which personalizeMessage() still renders as "them".
  bucketMessages: (bucket) => (bucket ? UPSELL_BUCKET_MESSAGES[bucket] : []) || [],
  chain: V1_CHAIN_1,
  pauses: {},
  acceptLabel: "Yes, protect what we clear",
  placeholderNames: [],
};

const TWIN_FLAME_UPSELL1: Upsell1Copy = {
  CONFIRMATION: TF_CONFIRMATION,
  GAP: TF_GAP,
  RISK: TF_RISK,
  // Unreachable — TF_CHAIN_1 routes RISK straight to SOLUTION. Kept non-null so
  // the shape stays one type, and pointed at 02's own copy so that a future
  // change of heart about asking cannot resurrect V1's clearing question.
  QUESTION_1: "Tell me honestly — have you ever seen something coming, known you were right about it, and still not been able to stop it reaching you?",
  QUESTION_1_REPLIES: [
    { text: "Yes — more than once", value: "yes" },
    { text: "I think so, yes", value: "maybe" },
    { text: "I'm not sure", value: "unsure" },
  ],
  AFTER_Q1: { default: ["Seeing it and surviving it are two different pieces of work, and you've only bought the first."] },
  SOLUTION: TF_SOLUTION,
  LAVA_INTRO: TF_LAVA_INTRO,
  RITUAL: TF_RITUAL,
  FEEL: TF_FEEL,
  DELIVERY: TF_DELIVERY,
  OFFER: TF_OFFER,
  SUCCESS: TF_SUCCESS,
  SHIPPING_CONFIRMED: TF_SHIPPING_CONFIRMED,
  SOFT_DECLINE: TF_SOFT_DECLINE,
  // One block for everyone. She never chose a bucket and never needed to.
  bucketMessages: () => TF_SPREAD_BLOCK,
  chain: TF_CHAIN_1,
  // 15 · 15 · 11 · 9. Each break sits on a seam, not an arbitrary interval:
  // after the warning lands and before the answer to it, after the description
  // of the work, and after what the stone does for her — before delivery + price.
  pauses: {
    RISK: "Go on",
    RITUAL: "I'm listening",
    BUCKET: "Tell me",
  },
  acceptLabel: "Yes, guard me while I wait",
  placeholderNames: ["Friend"],
};

const V1_UPSELL2: Upsell2Copy = {
  PATH_A_OPEN: UPSELL2_PATH_A_OPEN,
  PATH_B_OPEN: UPSELL2_PATH_B_OPEN,
  REVEAL: null,
  PERSONALIZE: null,
  GAP: UPSELL2_GAP,
  INTRODUCE: UPSELL2_INTRODUCE,
  STONES: UPSELL2_STONES,
  RITUAL_INSTRUCTION: UPSELL2_RITUAL_INSTRUCTION,
  RITUAL_PATH_A_EXTRA: UPSELL2_RITUAL_PATH_A_EXTRA,
  WHAT_RECEIVE: UPSELL2_WHAT_RECEIVE,
  SOCIAL_PROOF: UPSELL2_SOCIAL_PROOF,
  PRICE: UPSELL2_PRICE,
  URGENCY: UPSELL2_URGENCY,
  DOWNSELL: UPSELL2_DOWNSELL,
  SUCCESS: UPSELL2_SUCCESS,
  SUCCESS_HAS_SHIPPING: UPSELL2_SUCCESS_HAS_SHIPPING,
  SUCCESS_NEEDS_SHIPPING: UPSELL2_SUCCESS_NEEDS_SHIPPING,
  SHIPPING_CONFIRMED: UPSELL2_SHIPPING_CONFIRMED,
  SOFT_DECLINE: UPSELL2_SOFT_DECLINE,
  chain: V1_CHAIN_2,
  pauses: {},
  downsellDeclineLabel: "No thanks, just the clearing",
  placeholderNames: [],
};

const TWIN_FLAME_UPSELL2: Upsell2Copy = {
  PATH_A_OPEN: TF_PATH_A_OPEN,
  PATH_B_OPEN: TF_PATH_B_OPEN,
  REVEAL: TF_REVEAL,
  PERSONALIZE: TF_PERSONALIZE,
  GAP: TF_GAP_2,
  INTRODUCE: TF_INTRODUCE,
  STONES: TF_STONES,
  RITUAL_INSTRUCTION: TF_RITUAL_INSTRUCTION,
  RITUAL_PATH_A_EXTRA: UPSELL2_RITUAL_PATH_A_EXTRA,
  WHAT_RECEIVE: TF_WHAT_RECEIVE,
  SOCIAL_PROOF: UPSELL2_SOCIAL_PROOF,
  PRICE: UPSELL2_PRICE,
  URGENCY: TF_URGENCY,
  DOWNSELL: TF_DOWNSELL,
  SUCCESS: TF_SUCCESS_2,
  SUCCESS_HAS_SHIPPING: TF_SUCCESS_2_HAS_SHIPPING,
  SUCCESS_NEEDS_SHIPPING: TF_SUCCESS_2_NEEDS_SHIPPING,
  SHIPPING_CONFIRMED: TF_SHIPPING_CONFIRMED_2,
  SOFT_DECLINE: TF_SOFT_DECLINE_2,
  chain: TF_CHAIN_2,
  // 11 · 18 · 13 · 8. After the Chariot news lands; after the eight-stone run,
  // the longest unbroken stretch in either flow; after what she receives.
  pauses: {
    MANIFEST_REVEAL: "Go on",
    STONES: "I'm listening",
    WHAT_RECEIVE: "Tell me",
  },
  downsellDeclineLabel: "No thanks, just my twelve",
  placeholderNames: ["Friend"],
};

// Resolved from the URL, like every other per-funnel behaviour in the shared V1
// components. Any path outside offer 02's prefix gets V1's conversation.
export function upsell1Copy(pathname?: string): Upsell1Copy {
  return isTwinFlameOffer(pathname) ? TWIN_FLAME_UPSELL1 : V1_UPSELL1;
}

export function upsell2Copy(pathname?: string): Upsell2Copy {
  return isTwinFlameOffer(pathname) ? TWIN_FLAME_UPSELL2 : V1_UPSELL2;
}

// "Friend" is not a name — see Upsell1Copy.placeholderNames.
export function displayName(
  firstName: string | null | undefined,
  placeholders: readonly string[],
): string {
  const name = firstName || "";
  return placeholders.includes(name) ? "" : name;
}
