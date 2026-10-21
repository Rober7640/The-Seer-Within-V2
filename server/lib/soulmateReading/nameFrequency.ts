// How often each letter STARTS a US first name vs a US surname.
//
// Used to pick a believable initial inside a Pythagorean group: we never want
// "Q" or "X" as a soulmate's first initial just because the number landed in
// that group. Weights are relative (not percentages) and approximate, drawn
// from US SSA given-name popularity and census surname-frequency shapes — they
// only need to rank letters sensibly, and the operator can tune them.
//
// A weight of 0 means "this letter starts under ~1% of names" — it is NEVER
// chosen. That rules out Q, U, X, Y, Z (spec §2 step 6).

export type LetterWeights = Readonly<Record<string, number>>;

export const FIRST_NAME_START_WEIGHTS: LetterWeights = {
  A: 8, B: 4, C: 6, D: 5, E: 4, F: 1.5, G: 2.5, H: 3, I: 2, J: 10,
  K: 5, L: 6, M: 9, N: 4, O: 1.5, P: 2.5, R: 6, S: 7, T: 5, V: 1.5, W: 2,
  Q: 0, U: 0, X: 0, Y: 0, Z: 0,
};

export const SURNAME_START_WEIGHTS: LetterWeights = {
  A: 3, B: 9, C: 8, D: 6, E: 2, F: 4, G: 6, H: 7, I: 1, J: 3,
  K: 5, L: 6, M: 9, N: 3, O: 2, P: 6, R: 6, S: 8, T: 5, V: 2, W: 6,
  Q: 0, U: 0, X: 0, Y: 0, Z: 0,
};

/**
 * The nine Pythagorean letter groups, 1–9. The soulmate's first initial is
 * drawn from the group matching her Life Path; the last initial from the group
 * matching her first-name number.
 */
export const PYTHAGOREAN_GROUPS: Readonly<Record<number, readonly string[]>> = {
  1: ['A', 'J', 'S'],
  2: ['B', 'K', 'T'],
  3: ['C', 'L', 'U'],
  4: ['D', 'M', 'V'],
  5: ['E', 'N', 'W'],
  6: ['F', 'O', 'X'],
  7: ['G', 'P', 'Y'],
  8: ['H', 'Q', 'Z'],
  9: ['I', 'R'],
};
