// Turning one authored line into the several chat bubbles a real person would
// have sent.
//
// WHY THIS EXISTS. The Live Thread arrival surface opens with the campaign's
// `continue_seed` — one authored string, written per email send and stored on
// `email_link_codes` (server/lib/emailReadingBriefs.ts). Rendered as a single
// bubble it reads like a notice; a real thread arrives in pieces. So the seed is
// split here, and each piece is revealed with the same typing pacing the live
// chat uses.
//
// THE SEED IS THE ONLY READER-FACING FIELD. Its siblings on the same row —
// `reading_recap` and `open_loop` — are written in the second person ABOUT
// Evelyn ("You showed them…", "You asked them to bring you…") because they are
// prompt input, not copy. Rendering either one verbatim would show the reader
// stage directions. So the bubbles come from the seed and nothing else.
//
// OPERATORS CONTROL THE SPLIT. A seed containing blank-line (or single-newline)
// breaks is taken as an EXPLICIT bubble list — that is the authoring hook, and
// it needs no migration because it is just the text of a column the render
// pipeline already writes. Seeds without breaks (every one minted so far) fall
// back to sentence grouping, which lands the existing copy on 2–3 bubbles.

/** Hard ceiling on bubbles. More than this reads as spam, not as a person. */
export const MAX_OPENER_BUBBLES = 3;

/**
 * Split on sentence-ending punctuation, KEEPING the punctuation with its
 * sentence. Deliberately not a lookbehind regex (`(?<=[.!?])`) — Safari only
 * gained lookbehind in 16.4, and this runs on the mobile traffic an email list
 * sends. Also deliberately does NOT split on the em dash, which Evelyn's voice
 * uses mid-sentence ("You came back — good.").
 */
function toSentences(text: string): string[] {
  return (text.match(/[^.!?…]+[.!?…]*\s*/g) ?? [text])
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Merge `parts` down to at most `max` groups, keeping order and splitting as
 * evenly as the counts allow. Only reached when a seed has more sentences than
 * we are willing to show as separate bubbles.
 */
function groupEvenly(parts: string[], max: number): string[] {
  const perGroup = Math.ceil(parts.length / max);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += perGroup) {
    out.push(parts.slice(i, i + perGroup).join(" "));
  }
  return out;
}

/**
 * The bubbles to reveal, in order. Returns `[]` for empty input so callers can
 * fall back to their own copy rather than rendering a blank bubble.
 */
export function splitIntoBubbles(text: string, max: number = MAX_OPENER_BUBBLES): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (max < 1) return [trimmed];

  // Authored breaks win over anything inferred: if an operator wrote the seed in
  // pieces, those pieces ARE the bubbles, and the cap still applies so a
  // pathological seed cannot flood the thread.
  const authored = trimmed
    .split(/\n\s*\n|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (authored.length > 1) {
    return authored.length <= max ? authored : groupEvenly(authored, max);
  }

  const sentences = toSentences(trimmed);
  if (sentences.length <= 1) return [trimmed];
  return sentences.length <= max ? sentences : groupEvenly(sentences, max);
}
