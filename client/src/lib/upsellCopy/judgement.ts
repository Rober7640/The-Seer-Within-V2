// Offer 03 — Judgement Day: the U1 and U2 conversations.
//
// Unlike offer 02 (Twin Flame), 03 KEEPS V1's shape almost entirely: it collects
// a bucket + personName at booking, same as V1, and its own copy spec
// (03-U-upsell-beats.md) says plainly "Everything not rewritten below is V1's
// copy, unchanged." So this file only overrides what 03-U actually rewrote —
// the opening beats of U1 (CONFIRMATION/GAP/RISK/QUESTION_1/AFTER_Q1), U1's
// bucket block (messages 1 & 4 only — 2 & 3 stay V1's, they carry the
// left-wrist mechanic UPSELL_DELIVERY depends on), and U2's two path opens.
// Everything else — SOLUTION, LAVA_INTRO, RITUAL, FEEL, DELIVERY, OFFER,
// SUCCESS, SOFT_DECLINE, REVEAL/PERSONALIZE, INTRODUCE, STONES, PRICE,
// DOWNSELL, etc. — spreads straight from V1_UPSELL1 / V1_UPSELL2.
//
// ⚠ 03-U1a retires the karmic-backlash premise ("strike at an enemy and their
// energy strikes back") that an earlier draft opened on. The hinge is now
// 03-P1's verdict 2 + section 8: closing the account settles what was owed,
// but does not undo what carrying it cost her — the vigilance. The RISK beat
// must stay about HER guard, never about a returning enemy; "old shadows try
// to return" is V1's frame and would smuggle the backlash premise back in.
//
// ⚠ 03 KEEPS QUESTION_1 — 03-U calls it "the strongest question in the deck" —
// so unlike twin-flame (which absorbs its questions into statements and skips
// them via its own chain), judgement uses V1_CHAIN_1 unmodified: RISK routes
// to QUESTION_1, same as V1.
//
// ⚠ REVEAL/PERSONALIZE: left un-overridden (inherited null from V1_UPSELL2).
// 03, like V1 and unlike 02, collects a bucket + concern + personName at
// booking, so the existing /api/upsell2/reading Claude call (which interpolates
// those fields) is meaningful for a 03 buyer — there is no reason to fake a
// static replacement the way 02 did (02 collects nothing, so null would have
// gone out as an empty-string prompt).
//
// ⚠ {duration} token: 03-U2a's PATH_A_OPEN/PATH_B_OPEN reference "{duration}"
// merging from intake ({{HOW_LONG}}), with an explicit build note: "If it's
// missing, cut the clause rather than rendering a bare token." Neither
// upsellMessages.ts's personalizeMessage (firstName/personName/upsellPrice)
// nor upsell2Messages.ts's (firstName/personName) substitute a {duration}
// token — confirmed by reading useUpsell2Chat.ts's p()/pMsg() wrappers, which
// call only those two helpers. Since the token is never merged, the clauses
// referencing it are rephrased to a safe, static form below rather than
// shipped with a literal "{duration}" in the bubble.

import type { Upsell1Copy, Upsell2Copy } from "./types";
import { V1_UPSELL1, V1_UPSELL2, V1_CHAIN_1, V1_CHAIN_2 } from "./v1";

// ============================================================================
// U1 — the Protection Ritual, for a woman who just closed her account
// ============================================================================

const JD_CONFIRMATION = [
  "It's done, {firstName}. Your page is open and your name is at the top of it.",
  "The three nights start the moment your Entry reaches me, and the line gets ruled on the third.",
  "But before I go — there's something the Closing won't reach, and I'd rather tell you now than have you find it in a month.",
];

const JD_GAP = [
  "Closing an account settles what was owed. That part I can do, and I'll do it properly.",
  "But there's a distinction nobody ever draws for you, {firstName}, and it's the whole of this...",
  "A debt and the cost of carrying it are two different things, and only one of them is on the page.",
  "Nobody owes you back the years of being careful. There's no one to close that against.",
];

// ⚠ Kept to HER guard, never a returning enemy — see file header.
const JD_RISK = [
  "And it leaves you in a particular state that I want you to know about.",
  "When the weight comes off, you're open in a way you haven't been in a long time. That's the point of it — but open is open.",
  "The guard you've been keeping came from somewhere real. It has been doing a job.",
  "Take the reason away and the habit stays, {firstName} — or it drops all at once, at the worst possible moment, for the wrong person.",
  "I've watched women close an account and then hand the empty room to the next one who asked nicely.",
];

const JD_QUESTION_1 =
  "Tell me honestly — since all this, have you found yourself holding a little back from people who had nothing to do with it?";

const JD_QUESTION_1_REPLIES = [
  { text: "Yes, with almost everyone", value: "yes" },
  { text: "With some people", value: "maybe" },
  { text: "I hadn't thought about it", value: "unsure" },
];

const JD_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "I thought so. It's in the way you wrote to me.",
    "That isn't damage, {firstName} — it's a sentry that was posted for a good reason and never stood down. The trouble is it doesn't know the war's over.",
    "I don't want you carrying that into whatever comes next.",
  ],
  maybe: [
    "Most women only see it looking backwards.",
    "A friendship that got shallower. A conversation you didn't finish. Small withdrawals, none of them decisions.",
    "That's the pattern I'd like closed alongside the account.",
  ],
  unsure: [
    "It's quiet, and it looks like being sensible from the inside.",
    "Either way — you're about to be lighter than you've been in years, and I'd rather you were protected while that settles.",
    "What's opening up is too valuable to leave unguarded.",
  ],
  default: [
    "Then you already know the shape of it.",
    "The debt goes on the page. The guard is still yours to deal with.",
    "Let me help with the second one.",
  ],
};

// 03-U1b: messages 2 & 3 of each bucket are V1's, unchanged (the left-wrist
// mechanic UPSELL_DELIVERY depends on them). Messages 1 & 4 are 03's.
//
// ⚠ Unlike V1's bucketMessages (which ignores personName and leaves
// {personName}/{firstName} as raw tokens for the hook's p()/pMsg() to merge
// later), the `someone` bucket's msg 1 here interpolates personName inline —
// mirroring twinFlame's bucketMessages(), which takes the same params but
// twin-flame doesn't need the substitution since it has no `someone` bucket
// content. 03's msg 1 and 4 are new copy authored for this file, so they
// interpolate personName directly rather than depending on a second pass.
function judgementBucketMessages(
  bucket: Parameters<Upsell1Copy["bucketMessages"]>[0],
  personName: Parameters<Upsell1Copy["bucketMessages"]>[1],
): string[] {
  if (!bucket) return [];
  const v1Msgs = V1_UPSELL1.bucketMessages(bucket, personName);
  const [, v1Msg2, v1Msg3] = v1Msgs;
  const person = personName || "them";

  const openers: Record<string, string> = {
    love: "Once charged, your stone will hold your heart steady while the account settles off you.",
    money: "Once charged, your stone will guard what you rebuild.",
    purpose: "Once charged, your stone will keep the new room yours while it clears.",
    someone: `Once charged, your stone will settle whatever still runs between you and ${person}.`,
  };
  const closers: Record<string, string> = {
    love: "You're about to be open again, {firstName}, and open is how this happened the first time. The stone is what decides who gets that close from here.",
    money: "What was taken from you came in through a door you'd left open because you had no reason not to. You have a reason now, and the stone is how you keep it without becoming hard about it.",
    purpose: "There's going to be room where that has been sitting, and room is disorienting before it's welcome. The stone buys you the time to decide what it's for before anyone fills it for you.",
    someone: "The account closes on your side. The stone is what stops the next word from them landing the way the last ones did.",
  };

  const opener = openers[bucket];
  const closer = closers[bucket];
  if (!opener || !closer) return v1Msgs;

  return [opener, v1Msg2, v1Msg3, closer].filter((m): m is string => Boolean(m));
}

export const JUDGEMENT_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: JD_CONFIRMATION,
  GAP: JD_GAP,
  RISK: JD_RISK,
  QUESTION_1: JD_QUESTION_1,
  QUESTION_1_REPLIES: JD_QUESTION_1_REPLIES,
  AFTER_Q1: JD_AFTER_Q1,
  bucketMessages: judgementBucketMessages,
  // Keeps the question — RISK routes to QUESTION_1, same as V1.
  chain: V1_CHAIN_1,
  acceptLabel: "Yes, guard what's opening",
  placeholderNames: ["Friend"],
};

// ============================================================================
// U2 — the Manifestation Bracelet
// ============================================================================

// {duration} merges from intake ({{HOW_LONG}}) per 03-U2a, but neither
// personalizeMessage helper substitutes it (see file header) — cut the clause
// to a safe static form rather than render a bare token.
const JD_PATH_A_OPEN = [
  "{firstName}... both are confirmed. The page and the stone.",
  "Your account closes on the third night, and you'll be guarded while it settles. That's the work done, and it's the right work.",
  "One more thing, and then I'll leave you be for a while.",
  "When it comes off you, there is going to be a space. I want to say something about that now, before you're standing in it.",
  "That space has been occupied for a long time — and you never chose what went into it. Somebody else put it there without asking, and you have been housing it ever since, at your own expense.",
  "It's about to be the first room in your life that is actually yours to allocate, {firstName}. I'd far rather you decided what goes in it than found out what drifts in.",
];

const JD_PATH_B_OPEN = [
  "{firstName}... I respect the decision about the stone. The closing stands perfectly well on its own.",
  "Before I start tonight, one thing I left out of the letter.",
  "It isn't about them — they're finished on the third night, and I won't be mentioning them again.",
  "It's about what takes their place. Because something will.",
  "You have not had a free room in a long time. When one opens it does not stay open — it fills with whatever is nearest and loudest, and for most women that turns out to be the next thing that goes wrong.",
  "I'd rather you were the one doing the choosing, {firstName}. That's a different piece of work from closing an account, and it's the one I'd want you walking into this with.",
];

export const JUDGEMENT_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: JD_PATH_A_OPEN,
  PATH_B_OPEN: JD_PATH_B_OPEN,
  // REVEAL/PERSONALIZE stay V1's (null → live Claude call): 03 collects a
  // bucket + concern + personName at booking same as V1, so the call is
  // meaningful — see file header.
  chain: V1_CHAIN_2,
  placeholderNames: ["Friend"],
};
