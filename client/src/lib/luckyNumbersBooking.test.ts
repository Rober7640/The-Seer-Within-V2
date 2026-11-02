// Offer 12 — Lucky Numbers: the booking page's copy, totals, checkout request and the cancel
// round-trip. The field checks are 11's (one shared copy), so they're tested in
// unsentLetterBooking.test.ts; here we only prove 12 re-uses them.
//
//   npx vitest run client/src/lib/luckyNumbersBooking.test.ts
//
// Copy sources: improve-v1/v1-one-time-BEs/docs/12/booking-page/12-C1-booking-page.md, 12-C3.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG, LUCKY_NUMBERS_BUMP_CENTS, priceLabel } from '@shared/backendOffers';
import * as eleven from './unsentLetterBooking';
import {
  BUMP,
  CANCELLED_LINE,
  CHECKOUT,
  EMPTY_INTAKE,
  FIELD_ERRORS,
  FIELDS,
  LUCKY_NUMBERS_PRICE_CENTS,
  PAGE_HEADER,
  PRICE_NOTES,
  REASON_LINE,
  WHAT_YOU_GET,
  checkIntake,
  forgetIntake,
  luckyNumbersCheckoutRequest,
  luckyNumbersTotalCents,
  restoreIntake,
  saveIntake,
  totalLabel,
} from './luckyNumbersBooking';

const file = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const flat = (s: string) => s.replace(/[`*]/g, '').replace(/\s+/g, ' ');
const C1 = flat(file('../../../improve-v1/v1-one-time-BEs/docs/12/booking-page/12-C1-booking-page.md'));
const C3 = flat(file('../../../improve-v1/v1-one-time-BEs/docs/12/booking-page/12-C3-order-bump.md'));
const PAGE = file('../pages/offers/lucky-numbers/BookingPage.tsx');
const PAGE_11 = file('../pages/offers/unsent-letter/BookingPage.tsx');

function pageStrings(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  [PAGE_HEADER, REASON_LINE, FIELDS, FIELD_ERRORS, PRICE_NOTES, BUMP, CHECKOUT, CANCELLED_LINE, WHAT_YOU_GET].forEach(walk);
  return out;
}

describe('the copy is 12-C1 and 12-C3, word for word', () => {
  it.each([
    ['eyebrow', PAGE_HEADER.eyebrow],
    ['title', PAGE_HEADER.title],
    ['sub-line', PAGE_HEADER.subline],
    ['reason line', REASON_LINE.quote],
    ['field 1 label', FIELDS.birthName.label],
    ['field 1 hint', FIELDS.birthName.hint],
    ['field 2 label', FIELDS.dateOfBirth.label],
    ['field 2 hint', FIELDS.dateOfBirth.hint],
    ['button', CHECKOUT.button],
    ['locked hint', CHECKOUT.lockedHint],
    ['trust line', CHECKOUT.trust[0]],
    ['cancelled line', CANCELLED_LINE],
    ...WHAT_YOU_GET.items.map((item, i) => [`what you get ${i + 1}`, item] as [string, string]),
    ['closing line', WHAT_YOU_GET.closing],
  ])('%s', (_name, line) => {
    expect(C1).toContain(flat(line));
  });

  it('the headline is the operator’s', () => {
    expect(PAGE_HEADER.title).toMatch(/^Give me one evening/);
  });

  it('the price notes', () => {
    expect(C1).toContain(PRICE_NOTES.join(' / '));
  });

  it('the bump, label and note, with its price from the catalog', () => {
    expect(C3).toContain(`${BUMP.label} · ${BUMP.priceLabel}`);
    expect(C3).toContain(`${BUMP.noteBefore} ${BUMP.noteName} ${BUMP.noteAfter}`);
    expect(BUMP.priceLabel).toBe('+$12.77');
  });

  it('the field errors are 11’s, and in 12-C1', () => {
    expect(FIELD_ERRORS).toBe(eleven.FIELD_ERRORS);
    for (const error of Object.values(FIELD_ERRORS)) expect(C1).toContain(error);
  });
});

describe('what the page must never say', () => {
  it('no banned word, sell word, tarot, win or blank merge token', () => {
    const banned =
      /\bjourney|\benergy|\bclearing|our conversation|\bthe universe\b|\bbuy\b|\btarot|\bcards?\b|\bwin\b|jackpot|lottery|\{\{|\{[a-zA-Z]+\}|%[A-Z]+%/i;
    for (const line of pageStrings()) expect(line).not.toMatch(banned);
  });

  it('no date before her order: the window is "2027", never a month', () => {
    const months = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b|every month/;
    for (const line of pageStrings().filter((l) => l !== FIELDS.dateOfBirth.hint)) expect(line).not.toMatch(months);
    expect(PAGE_HEADER.subline).toContain('2027');
  });
});

describe('the catalog', () => {
  const offer = BACKEND_OFFER_CATALOG['lucky-numbers'];

  it('is offer 12, $35 fixed, dark', () => {
    expect(offer).toMatchObject({
      key: 'lucky-numbers',
      number: '12',
      stripeProduct: 'be_lucky_numbers',
      pricing: { model: 'fixed', priceCents: 3500 },
      bookingPath: { page: '/numerology/lucky-numbers', chat: '/numerology/lucky-numbers' },
      successPath: '/numerology/lucky-numbers/success',
      upsellEntryPath: '/offers/upsell/welcome1',
      upsell1Product: 'be_citrine_wish_ritual',
      collectsShipping: false,
      piiOutOfStripe: true,
      readyForMoney: false,
    });
  });

  it('the bump is The Full Year, on its own product key', () => {
    expect(offer.bump).toEqual({ productKey: 'full_year', cents: 1277, stripeName: 'The Full Year' });
  });

  it('the card-receipt lines say nothing about her name or date, and never "buy" or a win', () => {
    expect(`${offer.stripeName} ${offer.stripeDescription}`).not.toMatch(/\bbuy\b|birth|\bwin\b|jackpot/i);
  });
});

describe('the total', () => {
  it('is worked out from the catalog: $35.00, or $47.77 with the bump', () => {
    expect(luckyNumbersTotalCents(false)).toBe(3500);
    expect(luckyNumbersTotalCents(true)).toBe(3500 + LUCKY_NUMBERS_BUMP_CENTS);
    expect(totalLabel(luckyNumbersTotalCents(false))).toBe('$35.00');
    expect(totalLabel(luckyNumbersTotalCents(true))).toBe('$47.77');
    expect(priceLabel(LUCKY_NUMBERS_PRICE_CENTS)).toBe('$35');
  });
});

describe('the checkout request', () => {
  it('posts no price, and carries ?c= for either arm', () => {
    for (const letterCode of ['3', '13']) {
      const req = luckyNumbersCheckoutRequest({
        firstName: 'Sarah',
        letterCode,
        bump: true,
        fullBirthName: 'Sarah Jane Miller',
        dateOfBirth: '1961-03-14',
      });
      expect(req).toEqual({
        offer: 'lucky-numbers',
        treatment: 'page',
        bump: true,
        firstName: 'Sarah',
        letterCode,
        fullBirthName: 'Sarah Jane Miller',
        dateOfBirth: '1961-03-14',
      });
    }
  });

  it('uses 11’s field checks', () => {
    expect(checkIntake).toBe(eleven.checkIntake);
    expect(checkIntake({ birthName: 'Sarah Jane Miller', month: '3', day: '14', year: '1961' })).toMatchObject({ ok: true });
  });
});

describe('her details across a Stripe cancel', () => {
  const memory = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      keys: () => [...m.keys()],
    };
  };

  it('round-trips under its own key, never 11’s, and never the bump', () => {
    const store = memory();
    const intake = { birthName: 'Sarah Jane Miller', month: '03', day: '14', year: '1961' };
    saveIntake(intake, store);
    expect(store.keys()).toEqual(['be12_intake']);
    expect(restoreIntake(store)).toEqual(intake);
    expect(eleven.restoreIntake(store)).toEqual(EMPTY_INTAKE);
    forgetIntake(store);
    expect(restoreIntake(store)).toEqual(EMPTY_INTAKE);
  });
});

describe('the page is 11’s, with 12’s words', () => {
  it('the same testids, so one walk shape serves both', () => {
    const ids = (src: string) => [...src.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1]).sort();
    expect(ids(PAGE)).toEqual(ids(PAGE_11));
  });

  it('the bump starts unticked', () => {
    expect(PAGE).toContain('const [bumpTaken, setBumpTaken] = useState(false)');
  });

  it('reads its own constants, and analytics names its own product', () => {
    expect(PAGE).toContain("from '@/lib/luckyNumbersBooking'");
    expect(PAGE).not.toContain('unsentLetterBooking');
    expect(PAGE).toContain("product: 'be_lucky_numbers'");
  });
});
