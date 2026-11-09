// Offer 12 — Lucky Numbers, a numbers reading by Evelyn Cross: the booking page's copy and its
// checkout helpers, in one place. 11's shape (lib/unsentLetterBooking.ts), minus the cards.
//
// Copy specs: improve-v1/v1-one-time-BEs/docs/12/booking-page/12-C1-booking-page.md (page)
//             improve-v1/v1-one-time-BEs/docs/12/booking-page/12-C3-order-bump.md (bump)
// Decisions:  improve-v1/v1-one-time-BEs/docs/12/12-DELIVERABLES.md wins over everything.
// Change the doc first, then this file. Tests: luckyNumbersBooking.test.ts (reads the docs).
//
// ⛔ She gives two things here: her full birth name and date of birth. They go to OUR server and
// be_order_intake, NEVER to Stripe. Her first name is the letter's ?fn=, with no field, and it
// stays off Stripe too (`piiOutOfStripe`). No ?fn= and she is "dear".
//
// ⛔ Two letters land here (arm A ?c=1…5, arm B ?c=11…15). The page promises only the items both
// arms promise. ⛔ No win, no money sum, and no date before her order: the window is "2027" (12-A).
//
// ⚠ VOICE. Evelyn speaks the title and the signed reason line; the rest is plain second person.
// The bump is in HER voice. ⛔ Never the word "buy". No tarot.

import type { BackendCheckoutRequest } from './backendCheckout';
import { BACKEND_OFFER_CATALOG, LUCKY_NUMBERS_BUMP_CENTS, priceLabel } from '@shared/backendOffers';
import {
  EMPTY_INTAKE,
  checkIntake,
  dateOfBirthFromBoxes,
  fieldForServerCode,
  intakeFilled,
  totalLabel,
  type IntakeProblems,
  type UnsentLetterIntake,
} from './unsentLetterBooking';

export { LUCKY_NUMBERS_BUMP_CENTS, priceLabel } from '@shared/backendOffers';
// The same two fields under the same rules as 11 — one copy of the checks, not two.
export { EMPTY_INTAKE, checkIntake, dateOfBirthFromBoxes, fieldForServerCode, intakeFilled, totalLabel };
export type { IntakeProblems };
export type LuckyNumbersIntake = UnsentLetterIntake;

export const LUCKY_NUMBERS_OFFER = 'lucky-numbers' as const;

const pricing = BACKEND_OFFER_CATALOG[LUCKY_NUMBERS_OFFER].pricing;
/** From the catalog, never typed. */
export const LUCKY_NUMBERS_PRICE_CENTS = pricing.model === 'fixed' ? pricing.priceCents : 0;

export const TAB_TITLE = 'Lucky Numbers — your reading | The Seer Within';

export const PAGE_HEADER = {
  eyebrow: 'Evelyn Cross',
  title: "Give me one evening, and I'll hand you your lucky numbers",
  subline:
    'Your 6 numbers to play, a 4-digit PIN, your 12 lucky days in 2027, your 3 lucky numbers, and the one number to stop using.',
} as const;

/** Top of the white sheet, signed. The one reason this page gives for asking. True by code. */
export const REASON_LINE = {
  quote: 'Every number I hand you comes from your birth name and date.',
  signature: 'Evelyn',
} as const;

export const FIELDS = {
  birthName: {
    label: 'Your full name on your birth certificate',
    hint: 'Middle names too. If you married, use the name you were born with.',
  },
  dateOfBirth: {
    label: 'Your date of birth',
    hint: 'For example, 03 14 1961',
    month: 'MM',
    day: 'DD',
    year: 'YYYY',
  },
} as const;

export { FIELD_ERRORS } from './unsentLetterBooking';

/** Beside the price. */
export const PRICE_NOTES = ['Paid once', 'Your reading within 24 hours', 'Yours to keep and use'] as const;

// The order bump — The Full Year (12-C3). ⭐ The last page of her PDF. ⛔ Never pre-checked: a
// pre-selected paid add-on is a negative option under FTC and card-network rules. ⛔ Not a speed
// bump: delivery is 24 hours either way.
export const BUMP = {
  label: 'Yes, I want every lucky day in 2027',
  priceLabel: `+${priceLabel(LUCKY_NUMBERS_BUMP_CENTS)}`,
  noteBefore: 'My reading gives me twelve days.',
  noteName: 'The Full Year',
  noteAfter: "marks every lucky day I've got in 2027, not just the best twelve, on one calendar page.",
} as const;

export const CHECKOUT = {
  totalLabel: 'Total',
  button: 'WORK OUT MY NUMBERS',
  lockedHint: 'Fill in both boxes to continue.',
  trust: ['Secure payment is next'],
  refundLabel: 'Refund policy',
  refundHref: '/refund',
  supportEmail: 'hi@theseerwithin.com',
} as const;

/** Back from the secure checkout page. */
export const CANCELLED_LINE = "You haven't been charged. Your details are still here.";

export const WHAT_YOU_GET = {
  heading: 'What you get',
  items: [
    'Your 3 lucky numbers, and what each one means for you.',
    '6 numbers to play on any ticket or raffle, built from your three.',
    'A 4-digit PIN, built from your numbers.',
    'Your 12 lucky days in 2027, with the date of each.',
    'The one number to stop using, and where to look for it.',
    'Every use, from tickets to travel, with your own numbers filled in.',
    'A link to your reading, by email, within 24 hours.',
  ],
  // The letters' condition (the promise not to chase). True for both arms.
  closing: "Play your numbers the way you always would. Don't spend money you need on tickets because a day is marked.",
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────

/** The Total line, always with cents (12-C1: "Total · $35.00"), plus the bump while ticked. */
export function luckyNumbersTotalCents(bump: boolean): number {
  return LUCKY_NUMBERS_PRICE_CENTS + (bump ? LUCKY_NUMBERS_BUMP_CENTS : 0);
}

/**
 * What the button sends to beginBackendCheckout.
 *
 * ⛔ Posts NO price: the server reads it from the catalog. Her birth details and ?fn= go to our
 * server, which parks them on be_order_intake. Only ?c= rides into Stripe metadata.
 */
export function luckyNumbersCheckoutRequest(from: {
  firstName: string | null;
  letterCode: string | null;
  bump: boolean;
  fullBirthName: string;
  dateOfBirth: string;
}): BackendCheckoutRequest {
  return {
    offer: LUCKY_NUMBERS_OFFER,
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
// is never stored. Its own key, so 11's and 12's never cross.

const INTAKE_KEY = 'be12_intake';

type IntakeStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionStore(): IntakeStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null; // Private mode or no window. A per-tab convenience only.
  }
}

export function saveIntake(intake: LuckyNumbersIntake, store = sessionStore()): void {
  try {
    store?.setItem(INTAKE_KEY, JSON.stringify(intake));
  } catch {
    /* a per-tab convenience only */
  }
}

export function restoreIntake(store = sessionStore()): LuckyNumbersIntake {
  try {
    const raw = store?.getItem(INTAKE_KEY);
    if (!raw) return EMPTY_INTAKE;
    const v = JSON.parse(raw) as Partial<LuckyNumbersIntake>;
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
