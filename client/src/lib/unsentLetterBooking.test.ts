// Offer 11 — The Unsent Letter: the booking page's copy, field checks, totals and the checkout
// request.
//
//   npx vitest run client/src/lib/unsentLetterBooking.test.ts
//
// Copy sources: improve-v1/v1-one-time-BEs/docs/11/booking-page/11-C1-booking-page.md, 11-C3.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG, UNSENT_LETTER_BUMP_CENTS, priceLabel } from '@shared/backendOffers';
import * as booking from './unsentLetterBooking';
import {
  BUMP,
  CANCELLED_LINE,
  CHECKOUT,
  EMPTY_INTAKE,
  FIELD_ERRORS,
  FIELDS,
  PAGE_HEADER,
  PRICE_NOTES,
  REASON_LINE,
  WHAT_YOU_GET,
  checkIntake,
  dateOfBirthFromBoxes,
  fieldForServerCode,
  forgetIntake,
  intakeFilled,
  restoreIntake,
  saveIntake,
  totalLabel,
  unsentLetterCheckoutRequest,
  unsentLetterTotalCents,
} from './unsentLetterBooking';

const file = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const flat = (s: string) => s.replace(/[`*]/g, '').replace(/\s+/g, ' ');
const C1 = flat(file('../../../improve-v1/v1-one-time-BEs/docs/11/booking-page/11-C1-booking-page.md'));
const C3 = flat(file('../../../improve-v1/v1-one-time-BEs/docs/11/booking-page/11-C3-order-bump.md'));
const MARCUS = file('../pages/marcus/MarcusBooking.tsx');
const PAGE = file('../pages/offers/unsent-letter/BookingPage.tsx');

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

describe('the copy is 11-C1 and 11-C3, word for word', () => {
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
    ['what you get 1', WHAT_YOU_GET.items[0]],
    ['what you get 2', WHAT_YOU_GET.items[1]],
    ['what you get 3', WHAT_YOU_GET.items[2]],
    ['closing line', WHAT_YOU_GET.closing],
  ])('%s', (_name, line) => {
    expect(C1).toContain(flat(line));
  });

  it('the price notes', () => {
    expect(C1).toContain(PRICE_NOTES.join(' / '));
  });

  it('the bump, label and note, with its price from the catalog', () => {
    expect(C3).toContain(`${BUMP.label} · ${BUMP.priceLabel}`);
    expect(C3).toContain(`${BUMP.noteBefore} ${BUMP.noteName} ${BUMP.noteAfter}`);
    expect(BUMP.priceLabel).toBe('+$12.77');
  });

  it('the field errors are MarcusBooking’s own words', () => {
    for (const error of Object.values(FIELD_ERRORS)) {
      expect(MARCUS).toContain(error);
      expect(C1).toContain(error);
    }
  });
});

describe('what the page must never say', () => {
  it('no banned word, reveal word, sell word or blank merge token', () => {
    const banned =
      /\bnumerolog|\bjourney|\benergy|\bclearing|our conversation|\bthe universe\b|\bbuy\b|\bnerve\b|\btrust\b|\blaugh|\bsafe\b|\bfreedom\b|looked after|\bjudgement\b|\bworth\b|\bsoftness\b|\{\{|\{[a-zA-Z]+\}|%[A-Z]+%/i;
    for (const line of pageStrings()) expect(line).not.toMatch(banned);
  });

  it('not 04’s "Nothing has been taken", which means something else here', () => {
    expect(CANCELLED_LINE).not.toMatch(/taken/i);
  });
});

describe('the catalog', () => {
  const offer = BACKEND_OFFER_CATALOG['unsent-letter'];

  it('is offer 11, $35 fixed, dark', () => {
    expect(offer).toMatchObject({
      key: 'unsent-letter',
      number: '11',
      stripeProduct: 'be_unsent_letter',
      pricing: { model: 'fixed', priceCents: 3500 },
      successPath: '/tarot/unsent-letter/success',
      upsellEntryPath: '/offers/upsell/welcome1',
      collectsShipping: false,
      piiOutOfStripe: true,
      readyForMoney: false,
    });
  });

  it('the bump is Closing the Door, on its own product key', () => {
    expect(offer.bump).toEqual({ productKey: 'closing_the_door', cents: 1277, stripeName: 'Closing the Door' });
  });

  it('the card-receipt lines say nothing about her name or date, and never "buy"', () => {
    expect(`${offer.stripeName} ${offer.stripeDescription}`).not.toMatch(/\bbuy\b|birth|numerolog/i);
  });
});

describe('the total', () => {
  it('is worked out from the catalog', () => {
    expect(unsentLetterTotalCents(false)).toBe(3500);
    expect(unsentLetterTotalCents(true)).toBe(3500 + UNSENT_LETTER_BUMP_CENTS);
    expect(totalLabel(unsentLetterTotalCents(false))).toBe('$35.00');
    expect(totalLabel(unsentLetterTotalCents(true))).toBe('$47.77');
  });

  it('the price line is the short form', () => {
    expect(priceLabel(booking.UNSENT_LETTER_PRICE_CENTS)).toBe('$35');
  });
});

describe('the field checks', () => {
  const good = { birthName: 'Sarah Jane Miller', month: '3', day: '14', year: '1961' };

  it('passes and pads a good entry', () => {
    expect(checkIntake(good)).toEqual({ ok: true, fullBirthName: 'Sarah Jane Miller', dateOfBirth: '1961-03-14' });
  });

  it('tidies the spaces in her name', () => {
    expect(checkIntake({ ...good, birthName: '  Sarah   Miller ' })).toMatchObject({ fullBirthName: 'Sarah Miller' });
  });

  it.each([
    ['one word', { birthName: 'Sarah' }, { birthName: FIELD_ERRORS.birthName }],
    ['blank', { birthName: '   ' }, { birthName: FIELD_ERRORS.birthName }],
    ['month 13', { month: '13' }, { dob: FIELD_ERRORS.month }],
    ['month words', { month: 'Mar' }, { dob: FIELD_ERRORS.month }],
    ['day 32', { day: '32' }, { dob: FIELD_ERRORS.day }],
    ['two-digit year', { year: '61' }, { dob: FIELD_ERRORS.year }],
    ['31 June', { month: '6', day: '31' }, { dob: FIELD_ERRORS.dayInMonth }],
    ['29 Feb, not a leap year', { month: '2', day: '29', year: '1961' }, { dob: FIELD_ERRORS.dayInMonth }],
  ])('%s', (_name, change, problems) => {
    expect(checkIntake({ ...good, ...change })).toEqual({ ok: false, problems });
  });

  it('29 Feb in a leap year is fine', () => {
    expect(dateOfBirthFromBoxes('2', '29', '1960')).toEqual({ value: '1960-02-29' });
  });

  it('marks both fields at once, so she fixes them in one go', () => {
    expect(checkIntake(EMPTY_INTAKE)).toEqual({
      ok: false,
      problems: { birthName: FIELD_ERRORS.birthName, dob: FIELD_ERRORS.month },
    });
  });

  it('intakeFilled wants every box', () => {
    expect(intakeFilled(good)).toBe(true);
    for (const key of Object.keys(good) as (keyof typeof good)[]) {
      expect(intakeFilled({ ...good, [key]: ' ' })).toBe(false);
    }
  });

  it('places the server’s refusals above the right box', () => {
    expect(fieldForServerCode('dob_invalid')).toBe('dob');
    expect(fieldForServerCode('dob_missing')).toBe('dob');
    expect(fieldForServerCode('birth_name_invalid')).toBe('birthName');
    expect(fieldForServerCode('offer_not_ready')).toBeNull();
    expect(fieldForServerCode(undefined)).toBeNull();
  });
});

describe('the checkout request', () => {
  const from = {
    firstName: 'Sarah',
    letterCode: '3',
    bump: true,
    fullBirthName: 'Sarah Jane Miller',
    dateOfBirth: '1961-03-14',
  };

  it('carries ?fn=, ?c=, the bump and her details, on the page treatment', () => {
    expect(unsentLetterCheckoutRequest(from)).toEqual({ offer: 'unsent-letter', treatment: 'page', ...from });
  });

  it('posts no price', () => {
    expect(unsentLetterCheckoutRequest(from)).not.toHaveProperty('amountCents');
    expect(unsentLetterCheckoutRequest(from)).not.toHaveProperty('quotedArm');
  });

  it('with no ?fn= and no ?c= both stay null', () => {
    expect(unsentLetterCheckoutRequest({ ...from, firstName: null, letterCode: null })).toMatchObject({ firstName: null, letterCode: null });
  });

  it('the bump must be a real true', () => {
    expect(unsentLetterCheckoutRequest({ ...from, bump: 'yes' as never }).bump).toBe(false);
  });
});

describe('her details across a Stripe cancel', () => {
  const fakeStore = () => {
    const m = new Map<string, string>();
    return {
      m,
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    };
  };
  const intake = { birthName: 'Sarah Miller', month: '03', day: '14', year: '1961' };

  it('come back as she typed them', () => {
    const store = fakeStore();
    saveIntake(intake, store);
    expect(restoreIntake(store)).toEqual(intake);
  });

  it('are gone once forgotten', () => {
    const store = fakeStore();
    saveIntake(intake, store);
    forgetIntake(store);
    expect(restoreIntake(store)).toEqual(EMPTY_INTAKE);
  });

  it('a broken store gives empty boxes, never a crash', () => {
    const store = fakeStore();
    store.m.set('be11_intake', '{not json');
    expect(restoreIntake(store)).toEqual(EMPTY_INTAKE);
    expect(restoreIntake(null)).toEqual(EMPTY_INTAKE);
  });

  it('stores no bump: it is never restored', () => {
    const store = fakeStore();
    saveIntake(intake, store);
    expect(Object.keys(JSON.parse([...store.m.values()][0])).sort()).toEqual(['birthName', 'day', 'month', 'year']);
  });

  it('the page keeps her details out of the URL and localStorage, and out of analytics', () => {
    expect(PAGE).not.toMatch(/localStorage/);
    const tracked = PAGE.slice(PAGE.indexOf("trackPH('checkout_initiated'"));
    expect(tracked.slice(0, tracked.indexOf('})'))).not.toMatch(/birth|dateOfBirth|intake|firstName/i);
  });
});

describe('the page’s rules, from its source', () => {
  it('there is no required tick: the only box on the page is the bump', () => {
    expect(PAGE.match(/type="checkbox"/g)).toHaveLength(1);
    expect(PAGE).not.toMatch(/say-so|READY_TICK|checkbox-ready|setReady|setNudge/);
  });

  it('the button needs her two fields and nothing else', () => {
    expect(PAGE).toContain('const canCheckout = intakeFilled(intake)');
    expect(CHECKOUT.lockedHint).toBe('Fill in both boxes to continue.');
    expect(CHECKOUT.lockedHint).not.toMatch(/tick/i);
  });

  it('the bump starts false, toggles itself and nothing else, and the total follows it', () => {
    expect(PAGE).toContain('const [bumpTaken, setBumpTaken] = useState(false)');
    expect(PAGE).toContain('checked={bumpTaken}');
    expect(PAGE).toContain('onChange={(e) => setBumpTaken(e.target.checked)}');
    expect(PAGE).toContain('totalLabel(unsentLetterTotalCents(bumpTaken))');
  });

  it('the bump and the total sit above the button', () => {
    expect(PAGE.indexOf('data-testid="checkbox-bump"')).toBeLessThan(PAGE.indexOf('data-testid="text-total"'));
    expect(PAGE.indexOf('data-testid="text-total"')).toBeLessThan(PAGE.indexOf('data-testid="button-checkout"'));
  });

  it('the terms line under the button stays', () => {
    expect(PAGE).toContain('data-testid="link-refund"');
    expect(PAGE).toContain('data-testid="text-small-print"');
  });

  it('a back-button restore takes the bump back off', () => {
    const restore = PAGE.slice(PAGE.indexOf('const onPageShow'), PAGE.indexOf("addEventListener('pageshow'"));
    expect(restore).toContain('setBumpTaken(false)');
  });

  it('every input is big enough that iOS does not zoom', () => {
    expect(PAGE).toContain('text-[16px] text-gray-900');
  });
});
