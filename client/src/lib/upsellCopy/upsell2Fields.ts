// How useUpsell2Chat reads Upsell 2's optional copy fields, and the text it falls back to.
//
// Until the /fb Upsell 2 copy test (v1_fb_u2_copy_2026) all of this was hard-wired in
// useUpsell2Chat and Upsell2CTA: her reply bubble on the $47 tap, the button text, the two
// lines played when an AI beat comes back empty, the success lines, and the body sent to
// /api/upsell2/reading. Arm B of that test sets its own. ⛔ Every other copy sets none of
// the new fields, so it gets exactly today's text and today's request (asserted in
// upsell2Fields.test.ts).

import type { Upsell2Copy } from "./types";

/** Today's bubble when she taps the $47 button (posted as her reply). */
export const UPSELL2_ACCEPT_BUBBLE = "Yes, I want the Manifestation Bracelet";

/** Today's text on the $47 button (Upsell2CTA). */
export const UPSELL2_ACCEPT_BUTTON = "Yes, send me the Manifestation Bracelet";

/** Today's one bubble when the AI reveal comes back empty. */
export const UPSELL2_REVEAL_FALLBACK =
  "I see something beyond the block, {firstName}... something trying to reach you.";

/** Today's one bubble when the AI stone personalisation comes back empty. */
export const UPSELL2_PERSONALIZE_FALLBACK =
  "The stones that speak loudest to your energy are calling, {firstName}.";

/**
 * The success lines to play after a charge. A `full` ($47) buyer gets
 * `copy.fullPriceSuccessExtra` straight after bubble 1, when the copy sets one; a `downsell`
 * ($30) buyer never does, because her bracelet is not set to her wish tonight. With no extra
 * set, `lines` itself comes back unchanged.
 */
export function buyStepLines(
  lines: string[],
  copy: Pick<Upsell2Copy, "fullPriceSuccessExtra">,
  tier: "full" | "downsell",
): string[] {
  const extra = copy.fullPriceSuccessExtra;
  if (tier !== "full" || !extra || lines.length === 0) return lines;
  return [lines[0], extra, ...lines.slice(1)];
}

export interface Upsell2ReadingUser {
  firstName: string;
  bucket: string;
  concern: string;
  personName: string | null;
}

/**
 * The body POSTed to /api/upsell2/reading. Arm B of the /fb Upsell 2 copy test adds
 * `copy: "magnet"` so the server writes the two AI beats with the magnet prompts. With
 * `aiPrompts` unset there is no `copy` key at all: the body is byte-identical to today's.
 */
export function upsell2ReadingBody(
  type: "manifest_reveal" | "manifest_personalize",
  userData: Upsell2ReadingUser,
  aiPrompts: Upsell2Copy["aiPrompts"],
): string {
  return JSON.stringify({
    type,
    userData: {
      firstName: userData.firstName,
      bucket: userData.bucket,
      concern: userData.concern,
      personName: userData.personName,
    },
    concern: userData.concern,
    ...(aiPrompts ? { copy: aiPrompts } : {}),
  });
}
