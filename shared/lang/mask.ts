// Blank out spans of folded text (same length, so match positions still line up
// for the denial check). Used for the pack's reportedCrisis and reportedSpeech.
export function maskSpans(text: string, patterns: RegExp | RegExp[]): { text: string; hit: boolean } {
  let hit = false;
  let out = text;
  for (const p of Array.isArray(patterns) ? patterns : [patterns]) {
    p.lastIndex = 0;
    out = out.replace(p, (m) => {
      hit = true;
      return " ".repeat(m.length);
    });
  }
  return { text: out, hit };
}
