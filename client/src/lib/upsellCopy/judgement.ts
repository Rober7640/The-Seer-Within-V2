// Offer 03 — Judgement Day: the U1 and U2 conversations.
//
// 03 upsells are de-personalized per Joel (2026-09-01): page-only collects no
// bucket/person; mirrors how 02 removed personalization.
//
// Concretely, page-only 03's booking collects only checkboxes/amount/bump/
// firstName, and /api/backend/upsell/user-data returns bucket:null,
// personName:null. That forces two departures from V1's flow — the same two
// twin-flame (02) had to make for the same reason:
//
//   1. bucketMessages must be UNIVERSAL. A null bucket makes V1's
//      bucket-keyed lookup return [], which would send zero U1 bucket
//      messages — and DELIVERY downstream depends on the LEFT-WRIST mechanic
//      those messages carry. So this file ships ONE fixed block for every
//      buyer, built around V1's bucket-invariant left-wrist line.
//   2. U2 must not enter MANIFEST_REVEAL or MANIFEST_PERSONALIZE. Those two
//      stages, when copy.REVEAL/PERSONALIZE are null (inherited from V1),
//      fire a live Claude call that POSTs bucket:null to /api/upsell2/reading,
//      whose Zod schema requires bucket: z.string() → 400 → generic fallback
//      for EVERY 03 buyer. The fix is to route AROUND both stages in the
//      chain so they are never reachable (see JD_CHAIN_2 below). The
//      REVEAL/PERSONALIZE fields stay inherited/null purely to satisfy the
//      type; they are dead code once the chain skips their stages.
//
// Everything 03-U did NOT rewrite spreads straight from V1_UPSELL1/V1_UPSELL2
// ("Everything not rewritten below is V1's copy, unchanged" — 03-U).
//
// ⚠ 03-U1a retires the karmic-backlash premise ("strike at an enemy and their
// energy strikes back"). The hinge is 03-P1's verdict 2 + section 8: closing
// the account settles what was owed, but does not undo what carrying it cost
// her — the vigilance. The RISK beat stays about HER guard, never a returning
// enemy ("old shadows try to return" is V1's frame and would smuggle the
// backlash premise back in).
//
// ⚠ 03 KEEPS QUESTION_1 — 03-U calls it "the strongest question in the deck" —
// so U1 uses V1_CHAIN_1 unmodified: RISK routes to QUESTION_1, same as V1.
// (Only U2's chain is overridden, and only to skip the Claude stages.)

import type { Upsell2Chain, Upsell1Copy, Upsell2Copy } from "./types";
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

// ONE universal block for every buyer — no bucket branching, no personName.
// Page-only 03 has no bucket, so V1's bucket-keyed lookup would return [] and
// send nothing; this must always return a non-empty set carrying the
// LEFT-WRIST mechanic DELIVERY depends on.
//
// The left-wrist line (message 2) is V1's bucket-invariant line, verbatim:
// UPSELL_BUCKET_MESSAGES[*][1] === "Wear it on your LEFT wrist — your
// receiving hand." is byte-identical across all four V1 buckets, and
// UPSELL_DELIVERY refers back to it.
//
// Messages 1, 3 and 4 are bucket-agnostic connective copy drawn from 03's own
// GAP/RISK "guard / vigilance / what's opening" theme, so the block coheres in
// 03's voice without naming a bucket. They are NEW lines authored for this
// de-personalization — see the fix report for Joel to eyeball.
const JD_UNIVERSAL_BLOCK: string[] = [
  // NEW connective (03 voice — the opening/guard theme)
  "Once your stone is charged, it stands guard over the side of you that's about to be open.",
  // V1 bucket-invariant line, verbatim (the mechanic DELIVERY depends on)
  "Wear it on your LEFT wrist — your receiving hand.",
  // NEW connective (03 voice — the receiving-side mechanic, bucket-free)
  "In this work the left side receives. Everyone who comes toward you — every person, every intention — passes through that hand before it reaches you.",
  // NEW connective (03 voice — the "who gets that close" hinge from AFTER_Q1)
  "The stone is what decides who gets that close from here — so the room you're clearing stays yours to give.",
];

export const JUDGEMENT_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: JD_CONFIRMATION,
  GAP: JD_GAP,
  RISK: JD_RISK,
  QUESTION_1: JD_QUESTION_1,
  QUESTION_1_REPLIES: JD_QUESTION_1_REPLIES,
  AFTER_Q1: JD_AFTER_Q1,
  // Universal — ignores bucket + personName, always returns the fixed block.
  bucketMessages: () => JD_UNIVERSAL_BLOCK,
  // Keeps the question — RISK routes to QUESTION_1, same as V1.
  chain: V1_CHAIN_1,
  acceptLabel: "Yes, guard what's opening",
  placeholderNames: ["Friend"],
};

// ============================================================================
// U2 — the Manifestation Bracelet
// ============================================================================

// De-personalized. No {duration}, no {personName}: page-only 03 supplies
// neither, and the helpers wouldn't substitute {duration} anyway.
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

// Routes AROUND both Claude stages so neither is ever entered:
//   - PATH_A_OPEN/PATH_B_OPEN → GAP (the stage V1 reaches AFTER MANIFEST_REVEAL)
//   - AFTER_Q2 → RITUAL_INSTRUCTION (the stage V1 reaches AFTER
//     MANIFEST_PERSONALIZE; AFTER_Q2 is MANIFEST_PERSONALIZE's only predecessor
//     in V1_CHAIN_2)
// With these two edges, nothing in the chain points at MANIFEST_REVEAL or
// MANIFEST_PERSONALIZE, so useUpsell2Chat never runs their Claude fetch. The
// interactive Q2 quick-reply is kept (it's not personalization).
const JD_CHAIN_2: Upsell2Chain = {
  ...V1_CHAIN_2,
  PATH_A_OPEN: "GAP",
  PATH_B_OPEN: "GAP",
  AFTER_Q2: "RITUAL_INSTRUCTION",
};

export const JUDGEMENT_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: JD_PATH_A_OPEN,
  PATH_B_OPEN: JD_PATH_B_OPEN,
  // REVEAL/PERSONALIZE stay inherited (null) but are now UNREACHABLE — the
  // chain skips MANIFEST_REVEAL and MANIFEST_PERSONALIZE, so no Claude call
  // ever fires. Kept only to satisfy the Upsell2Copy type.
  chain: JD_CHAIN_2,
  placeholderNames: ["Friend"],
};
