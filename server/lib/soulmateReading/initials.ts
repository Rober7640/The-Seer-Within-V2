// Resolve the soulmate's first + last initial — as FACTS, never invented by the
// model (spec §2 step 6). Given the reading's numbers and the order's session
// id, the result is fully deterministic and believable:
//
//   • first initial ← the Pythagorean group of her Life Path number
//   • last initial  ← the Pythagorean group of her first-name number
//   • inside a group, a seeded, frequency-weighted pick among letters that
//     actually start US names (first-name table for the first initial, surname
//     table for the last) — so Q/U/X/Y/Z are never chosen.
//   • a group whose every letter is excluded falls back to the next group up,
//     wrapping 9 → 1, until a letter is available.

import { seededRng, weightedPick } from './seededRandom';
import {
  PYTHAGOREAN_GROUPS,
  FIRST_NAME_START_WEIGHTS,
  SURNAME_START_WEIGHTS,
  type LetterWeights,
} from './nameFrequency';

export interface ResolvedInitials {
  first: string;
  last: string;
}

/** Normalise any number (incl. master numbers 11/22/33) to a 1–9 group index. */
function toGroupIndex(n: number): number {
  let g = n;
  while (g > 9) {
    g = String(g)
      .split('')
      .reduce((acc, d) => acc + Number(d), 0);
  }
  return g < 1 ? 1 : g;
}

/**
 * Pick one letter from the group `startGroup`, weighted by `weights`, seeded by
 * `seed`. If that group has no eligible (weight > 0) letter, step UP a group
 * (wrapping 9 → 1) until one does — guaranteeing a letter and keeping the walk
 * deterministic. We try at most 9 groups, then hard-fall-back to the first
 * eligible letter anywhere (cannot happen with the real tables; defends tests
 * that inject an all-zero table).
 */
function pickInitial(startGroup: number, weights: LetterWeights, seed: string): string {
  const rng = seededRng(seed);
  for (let step = 0; step < 9; step++) {
    const group = ((startGroup - 1 + step) % 9) + 1;
    const weighted = PYTHAGOREAN_GROUPS[group].map((letter) => ({
      value: letter,
      weight: weights[letter] ?? 0,
    }));
    const pick = weightedPick(weighted, rng);
    if (pick) return pick;
  }
  const anyEligible = Object.entries(weights).find(([, w]) => w > 0);
  return anyEligible ? anyEligible[0] : 'A';
}

/**
 * The soulmate's initials for this order. Deterministic in (lifePath,
 * firstNameNumber, sessionId): same inputs → same initials, always.
 */
export function resolveInitials(args: {
  lifePath: number;
  firstNameNumber: number;
  sessionId: string;
}): ResolvedInitials {
  const firstGroup = toGroupIndex(args.lifePath);
  const lastGroup = toGroupIndex(args.firstNameNumber);
  return {
    first: pickInitial(firstGroup, FIRST_NAME_START_WEIGHTS, `${args.sessionId}|first`),
    last: pickInitial(lastGroup, SURNAME_START_WEIGHTS, `${args.sessionId}|last`),
  };
}
