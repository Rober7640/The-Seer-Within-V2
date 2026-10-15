// The three numerology numbers the Soulmate Initials reading uses (spec §2 step 5).
//
// A buyer gives only her FIRST name and birth date at checkout (Job A intake) —
// never a full birth name — so we compute exactly the three numbers that need
// only those two facts, reusing the shared engine rather than a second copy.

import {
  reduceNumber,
  letterSum,
  calculateLifePath,
  calculatePersonalYear,
} from '../numerologyEngine';

export interface ReadingNumbers {
  /** From her birth date. Drives the FIRST initial's Pythagorean group. */
  lifePath: number;
  /** Her first name reduced (Pythagorean). Drives the LAST initial's group. */
  firstNameNumber: number;
  /** Her current personal year — colour for the "when" card. */
  personalYear: number;
}

/**
 * Compute the reading's numbers from the only two personal facts we hold.
 * Deterministic: the same name + date always yield the same numbers.
 * `referenceDate` is injectable so tests and a fixed "as-of" run are stable.
 */
export function computeReadingNumbers(
  firstName: string,
  dateOfBirth: string,
  referenceDate?: Date,
): ReadingNumbers {
  return {
    lifePath: calculateLifePath(dateOfBirth),
    firstNameNumber: reduceNumber(letterSum(firstName, 'all')),
    personalYear: calculatePersonalYear(dateOfBirth, referenceDate),
  };
}
