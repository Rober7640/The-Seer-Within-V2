// Upsell 2 (Manifestation Bracelet) for /fb-tarot RETARGETING buyers — FIXED reveal copy.
//
// Operator, 2026-10-16: a retarget buyer bought the clearing straight from Evelyn's
// returning-reader offer page. She never chatted, so there is no concern for Claude to
// write the usual personal "manifest reveal" and "stone personalisation" from. For her
// ONLY, those two AI beats are replaced by the fixed lines below, which use nothing but
// her first name ({firstName}) and love/money. Everything else on the page — the
// openings, the three questions and their replies, the stones, the offer, the $47 price,
// the $30 downsell, shipping — is V1's live copy, untouched (it is V1_UPSELL2 spread).
//
// Why not the existing non-AI fallback: useUpsell2Chat already has one line for when the
// AI call fails ("I see something beyond the block, {firstName}... something trying to
// reach you." / "The stones that speak loudest to your energy are calling, {firstName}.").
// It is an error placeholder, one bubble, and says nothing about love or money — too thin
// to stand in for a two-to-three-bubble beat every retarget buyer would see.
//
// How the lines were written: they follow the AI prompts' own brief, beat for beat
// (server/lib/prompts.ts buildManifestRevealPrompt / buildManifestPersonalizePrompt —
// 2-3 bubbles, each under 25 words; love = "a connection forming… they can't feel you
// yet", money = "an opening… a flow of abundance circling your field… it's close"; love
// stones = Green Aventurine + Amethyst, money stones = Citrine + Pyrite). No guarantee,
// refund, result or timing claim, no invented people. "What's been holding love back /
// holding your money still" is the offer page's own phrase for what she bought cleared.
//
// Review doc: improve-v1/retargeting-test/page/05-post-purchase-copy.md

import { V1_UPSELL2 } from "./v1";
import type { Upsell2Copy } from "./types";

export type RetargetBucket = "love" | "money";

/** MANIFEST_REVEAL — straight after the PATH_A / PATH_B opening. */
export const RETARGET_U2_REVEAL: Record<RetargetBucket, string[]> = {
  love: [
    "I saw something past what's been holding love back from you, {firstName}.",
    "A connection forming. Someone whose energy already fits with yours... but they can't feel you yet.",
    "Once the way is clear, love has a path to you. It still needs a signal to follow.",
  ],
  money: [
    "I saw something past what's been holding your money still, {firstName}.",
    "An opening. A flow of abundance that's been circling your field, looking for a way in. It's close.",
    "Once the way is clear, money has a path to you. It still needs a signal to follow.",
  ],
};

/** MANIFEST_PERSONALIZE — straight after her answer to "did any of them stand out?". */
export const RETARGET_U2_PERSONALIZE: Record<RetargetBucket, string[]> = {
  love: [
    "For you, {firstName}, it's Green Aventurine. It draws love toward you, whether that's someone new or a connection coming back to life.",
    "And Amethyst beside it, so you recognize the right person when they appear.",
    "Picture wearing it and noticing how people start to respond to you. That's the shift I mean.",
  ],
  money: [
    "For you, {firstName}, it's Citrine. The merchant's stone. It pulls money and opportunity toward you.",
    "And Pyrite beside it, sending that abundance signal out further than you could on your own.",
    "Picture doors opening and offers arriving, and money starting to flow toward you instead of past you.",
  ],
};

function asRetargetBucket(...candidates: Array<string | null | undefined>): RetargetBucket {
  for (const c of candidates) if (c === "love" || c === "money") return c;
  return "love";
}

/** V1's live U2 copy with ONLY the two AI beats replaced by the fixed lines above. */
export function retargetUpsell2Copy(bucket: RetargetBucket): Upsell2Copy {
  return {
    ...V1_UPSELL2,
    REVEAL: RETARGET_U2_REVEAL[bucket],
    PERSONALIZE: RETARGET_U2_PERSONALIZE[bucket],
  };
}

/**
 * The copy override the /welcome2 page passes to useUpsell2Chat. `undefined` for every
 * buyer the server did not flag as a retarget buyer — the hook then resolves its copy
 * exactly as before (V1_UPSELL2, REVEAL/PERSONALIZE null ⇒ the AI call). For a retarget
 * buyer: the order's love/money topic, else her row's, else love.
 */
export function upsell2CopyOverrideFor(
  data: { retarget?: boolean; retargetBucket?: string | null; bucket?: string | null } | null | undefined,
): Upsell2Copy | undefined {
  if (!data || data.retarget !== true) return undefined;
  return retargetUpsell2Copy(asRetargetBucket(data.retargetBucket, data.bucket));
}
