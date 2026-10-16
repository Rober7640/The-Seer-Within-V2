import { isStone, type StoneKey } from '@shared/evelynVsl';

const MIN_AGE_YEARS = 18;

/**
 * Which stone the add-on line should name. Query wins (fresh ?stone= from the CTA
 * link, spec §4); falls back to the localStorage pick saved on /evelyn/reading;
 * null means the caller should fall back to "your stone" in the label.
 */
export function resolveStone(query: string | null, stored: string | null): StoneKey | null {
  if (isStone(query)) return query;
  if (isStone(stored)) return stored;
  return null;
}

export interface IntakeInput {
  email: string;
  firstName: string;
  dateOfBirth: string;
}

export type IntakeResult =
  | { ok: true }
  | { ok: false; field: 'email' | 'firstName' | 'dateOfBirth'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pop-up validation (spec §4). DOB must parse to a real calendar date AND the
 * visitor must be at least 18 today — the one hard age gate on this funnel.
 */
export function validateIntake(input: IntakeInput): IntakeResult {
  const email = input.email?.trim() ?? '';
  const firstName = input.firstName?.trim() ?? '';
  const dateOfBirth = input.dateOfBirth?.trim() ?? '';

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, field: 'email', message: 'Please enter a valid email address' };
  }
  if (!firstName) {
    return { ok: false, field: 'firstName', message: 'Please enter your first name' };
  }

  // Reject anything that doesn't round-trip as the same calendar date — catches
  // both unparseable strings and dates like 2026-02-30 that Date "corrects" away.
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!parsed) {
    return { ok: false, field: 'dateOfBirth', message: 'Please enter a valid birth date' };
  }
  const [, yStr, mStr, dStr] = parsed;
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const dob = new Date(year, month - 1, day);
  if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) {
    return { ok: false, field: 'dateOfBirth', message: 'Please enter a valid birth date' };
  }
  if (dob.getTime() > Date.now()) {
    return { ok: false, field: 'dateOfBirth', message: 'Please enter a valid birth date' };
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  if (age < MIN_AGE_YEARS) {
    return { ok: false, field: 'dateOfBirth', message: 'This reading is for adults 18 and over' };
  }

  return { ok: true };
}
