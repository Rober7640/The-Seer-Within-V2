// Deterministic seeded randomness for the Soulmate Initials reading.
//
// Everything a buyer receives — her soulmate's initials and her seven cards —
// must be identical on every re-run of the same order (spec §5). A Stripe
// webhook retry, a grade-regenerate, or the operator re-running fulfilment must
// never change what she was told. So all "random" choices are seeded off the
// order's own session id via FNV-1a → xorshift, never Math.random().

/** FNV-1a 32-bit hash of a string → unsigned 32-bit seed. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in uint32 via Math.imul.
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A deterministic generator seeded from a string. Returns a function that
 * yields floats in [0, 1) via xorshift32 — same seed, same sequence, forever.
 */
export function seededRng(seed: string): () => number {
  let state = fnv1a(seed) || 0x9e3779b9; // avoid a zero state
  return () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

/** In-place-safe Fisher–Yates shuffle of a copy of `items`, driven by `rng`. */
export function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick one entry from `weighted` (each `{ value, weight }`) by a single draw of
 * `rng`. Entries with weight ≤ 0 are ignored. Returns null if nothing is
 * eligible (every weight ≤ 0).
 */
export function weightedPick<T>(
  weighted: ReadonlyArray<{ value: T; weight: number }>,
  rng: () => number,
): T | null {
  const eligible = weighted.filter((w) => w.weight > 0);
  if (eligible.length === 0) return null;
  const total = eligible.reduce((acc, w) => acc + w.weight, 0);
  let r = rng() * total;
  for (const w of eligible) {
    r -= w.weight;
    if (r < 0) return w.value;
  }
  return eligible[eligible.length - 1].value; // float-rounding safety net
}
