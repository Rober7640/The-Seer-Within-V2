// Offer 11 — The Unsent Letter, a twelve-card reading by Evelyn Cross: the booking page's copy and
// its checkout helpers, in one place.
//
// Copy specs: improve-v1/v1-one-time-BEs/docs/11/booking-page/11-C1-booking-page.md (page)
//             improve-v1/v1-one-time-BEs/docs/11/booking-page/11-C3-order-bump.md (bump)
// Decisions:  improve-v1/v1-one-time-BEs/docs/11/11-DELIVERABLES.md wins over everything.
// Change the doc first, then this file. Tests: unsentLetterBooking.test.ts (reads the docs).
//
// ⛔ She gives two things here: her full birth name and date of birth. They go to OUR server and
// be_order_intake, NEVER to Stripe (the operator's rule from 08). Her first name is the letter's
// ?fn=, with no field, and it stays off Stripe too (`piiOutOfStripe`). No ?fn= and she is "dear".
//
// ⛔ No numerology, on this page or anywhere after it. The one stated reason for asking is
// REASON_LINE, which must stay true: "set how I lay your twelve cards".
//
// ⚠ VOICE. Plain second person. The bump is in HER voice. Evelyn is named in
// the third person, with one exception: REASON_LINE, the operator's own sentence, set as a signed
// quote. ⛔ Never the word "buy". Reveal words stay out (11-C1): nerve, trust, laugh, safe, freedom,
// looked after, judgement, worth, softness.

import type { BackendCheckoutRequest } from './backendCheckout';
import {
  BACKEND_OFFER_CATALOG,
  UNSENT_LETTER_BUMP_CENTS,
  priceLabel,
} from '@shared/backendOffers';

export { UNSENT_LETTER_BUMP_CENTS, priceLabel } from '@shared/backendOffers';

export const UNSENT_LETTER_OFFER = 'unsent-letter' as const;

const pricing = BACKEND_OFFER_CATALOG[UNSENT_LETTER_OFFER].pricing;
/** From the catalog, never typed. */
export const UNSENT_LETTER_PRICE_CENTS = pricing.model === 'fixed' ? pricing.priceCents : 0;

export const TAB_TITLE = 'The Unsent Letter — your reading | The Seer Within';

export const PAGE_HEADER = {
  eyebrow: 'Evelyn Cross',
  title: "They've had it long enough",
  subline: 'Evelyn lays your twelve cards and writes out the letter they never sent.',
} as const;

/** Top of the white sheet, signed. ⛔ The only reason this page gives for asking. */
export const REASON_LINE = {
  quote: 'Your birth name and date set how I lay your twelve cards.',
  signature: 'Evelyn',
} as const;

export const FIELDS = {
  birthName: {
    label: 'Your first and last name on your birth certificate',
    hint: 'If you married and changed your name, use your maiden name.',
  },
  dateOfBirth: {
    label: 'Your date of birth',
    hint: 'For example, 03 14 1961',
    month: 'MM',
    day: 'DD',
    year: 'YYYY',
  },
} as const;

// Word for word from MarcusBooking.tsx (11-C1 "Field errors"); the test reads that file.
export const FIELD_ERRORS = {
  birthName: 'please enter your first and last name as it is on your birth certificate.',
  month: 'enter the month as a number from 1 to 12.',
  day: 'enter the day as a number from 1 to 31.',
  year: 'the year should have four numbers, for example 1961.',
  dayInMonth: 'that month does not have that many days — please check the day.',
} as const;

/** Beside the price. "You never have to contact them" sits here on purpose (11-C1). */
export const PRICE_NOTES = [
  'Paid once',
  'Your reading within 24 hours',
  'You never have to contact them',
] as const;

// The order bump — Closing the Door (11-C3). ⭐ The last page of her PDF, so nothing separate
// arrives. ⛔ Never pre-checked: a pre-selected paid add-on is a negative option under FTC and
// card-network rules. ⛔ Not a speed bump: delivery is 24 hours either way.
export const BUMP = {
  label: 'Yes, I want that door shut for good',
  priceLabel: `+${priceLabel(UNSENT_LETTER_BUMP_CENTS)}`,
  noteBefore: "The letter gives me back what's mine. Shutting the door they left by is my job.",
  noteName: 'Closing the Door',
  noteAfter: "is one page, done once, after I've read the letter. Nobody sees it, and I don't write to anyone.",
} as const;

export const CHECKOUT = {
  totalLabel: 'Total',
  button: 'WRITE OUT MY LETTER',
  lockedHint: 'Fill in both boxes to continue.',
  trust: ['Secure payment is next'],
  refundLabel: 'Refund policy',
  refundHref: '/refund',
  supportEmail: 'hi@theseerwithin.com',
} as const;

/** Back from the secure checkout page. ⛔ Not 04's "Nothing has been taken": here that means something else. */
export const CANCELLED_LINE = "You haven't been charged. Your details are still here.";

export const WHAT_YOU_GET = {
  heading: 'What you get',
  items: [
    'Your twelve cards. Evelyn names what they took, and gives you one flat answer to each question.',
    'The letter they never sent, written out start to finish.',
    'A link to your reading, by email, within 24 hours.',
  ],
  closing: "You don't write to anyone, and you don't reply to anyone. If this person hurt you, you owe them no reply.",
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────

/** The Total line, always with cents (11-C1: "Total · $35.00"), plus the bump while ticked. */
export function unsentLetterTotalCents(bump: boolean): number {
  return UNSENT_LETTER_PRICE_CENTS + (bump ? UNSENT_LETTER_BUMP_CENTS : 0);
}

export function totalLabel(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface UnsentLetterIntake {
  birthName: string;
  month: string;
  day: string;
  year: string;
}

export const EMPTY_INTAKE: UnsentLetterIntake = { birthName: '', month: '', day: '', year: '' };

export type IntakeProblems = Partial<Record<'birthName' | 'dob', string>>;

/** Every box has something in it. Decides how the button LOOKS; `checkIntake` decides if it goes. */
export function intakeFilled(intake: UnsentLetterIntake): boolean {
  return [intake.birthName, intake.month, intake.day, intake.year].every((v) => v.trim() !== '');
}

/** Combine the three boxes. The same rules as MarcusBooking's dateOfBirthFromBoxes. */
export function dateOfBirthFromBoxes(
  month: string,
  day: string,
  year: string,
): { value: string } | { error: string } {
  const m = month.trim();
  const d = day.trim();
  const y = year.trim();
  if (!/^\d{1,2}$/.test(m) || +m < 1 || +m > 12) return { error: FIELD_ERRORS.month };
  if (!/^\d{1,2}$/.test(d) || +d < 1 || +d > 31) return { error: FIELD_ERRORS.day };
  if (!/^\d{4}$/.test(y)) return { error: FIELD_ERRORS.year };
  const date = new Date(Date.UTC(+y, +m - 1, +d));
  if (date.getUTCMonth() !== +m - 1 || date.getUTCDate() !== +d) {
    return { error: FIELD_ERRORS.dayInMonth };
  }
  return { value: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` };
}

/** Checked on press only. Either the two clean values, or what to say above which box. */
export function checkIntake(
  intake: UnsentLetterIntake,
):
  | { ok: true; fullBirthName: string; dateOfBirth: string }
  | { ok: false; problems: IntakeProblems } {
  const fullBirthName = intake.birthName.replace(/\s+/g, ' ').trim();
  const dob = dateOfBirthFromBoxes(intake.month, intake.day, intake.year);
  const problems: IntakeProblems = {};
  if (!/\S\s+\S/.test(fullBirthName)) problems.birthName = FIELD_ERRORS.birthName;
  if ('error' in dob) problems.dob = dob.error;
  if (problems.birthName || problems.dob || 'error' in dob) return { ok: false, problems };
  return { ok: true, fullBirthName, dateOfBirth: dob.value };
}

/** A refusal from the server, put above the right box. Null: not about either field. */
export function fieldForServerCode(code: string | undefined): keyof IntakeProblems | null {
  if (code?.startsWith('dob')) return 'dob';
  if (code?.startsWith('birth_name')) return 'birthName';
  return null;
}

/**
 * What the button sends to beginBackendCheckout.
 *
 * ⛔ Posts NO price: the server reads it from the catalog. Her birth details and ?fn= go to our
 * server, which parks them on be_order_intake. Only ?c= rides into Stripe metadata.
 */
export function unsentLetterCheckoutRequest(from: {
  firstName: string | null;
  letterCode: string | null;
  bump: boolean;
  fullBirthName: string;
  dateOfBirth: string;
}): BackendCheckoutRequest {
  return {
    offer: UNSENT_LETTER_OFFER,
    treatment: 'page',
    bump: from.bump === true,
    firstName: from.firstName,
    letterCode: from.letterCode,
    fullBirthName: from.fullBirthName,
    dateOfBirth: from.dateOfBirth,
  };
}

// ─── Her details across a Stripe cancel ────────────────────────────────────────────────────
// ⛔ sessionStorage only: never the URL, never localStorage. Written on the press that leaves for
// Stripe, read back only on ?cancelled=1, and gone on any other load and on the receipt. The bump
// is never stored: an add-on she paid nothing for yet is never restored.

const INTAKE_KEY = 'be11_intake';

type IntakeStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionStore(): IntakeStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null; // Private mode or no window. A per-tab convenience only.
  }
}

export function saveIntake(intake: UnsentLetterIntake, store = sessionStore()): void {
  try {
    store?.setItem(INTAKE_KEY, JSON.stringify(intake));
  } catch {
    /* a per-tab convenience only */
  }
}

export function restoreIntake(store = sessionStore()): UnsentLetterIntake {
  try {
    const raw = store?.getItem(INTAKE_KEY);
    if (!raw) return EMPTY_INTAKE;
    const v = JSON.parse(raw) as Partial<UnsentLetterIntake>;
    const s = (x: unknown) => (typeof x === 'string' ? x : '');
    return { birthName: s(v.birthName), month: s(v.month), day: s(v.day), year: s(v.year) };
  } catch {
    return EMPTY_INTAKE;
  }
}

export function forgetIntake(store = sessionStore()): void {
  try {
    store?.removeItem(INTAKE_KEY);
  } catch {
    /* a per-tab convenience only */
  }
}
