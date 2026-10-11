// 04 · The Turn — the price ladder (S9), the cup draw, and the catalog row.
//
//   npx vitest run server/lib/backendOffers.teaReading.test.ts
//
// (Lives under server/ because vitest only collects tests from server/ and tests/; the code
// under test is shared/backendOffers.ts, plus the draw in server/lib/be04Draw.ts.)
//
// What these pin down:
//  1. THE DAY IS THE SERVER'S. Day = floor((now − start) / 24h) + 1, clamped to [1, 4].
//     An unset or unparseable start is day 1 — a broken setting undercharges, never over.
//  2. THE GRACE WINDOW. A page loaded just before the rung moved keeps its price for 120
//     minutes; after that the page is told the new price (`price_changed`), never charged
//     silently at a number she did not see.
//  3. NOTHING THE BROWSER SENDS CAN LOWER THE PRICE. Not `amountCents`, not `tier`, not a
//     `quotedDay` below today's (outside the window).
//  4. THE CUP IS DRAWN, NOT PICKED (operator 2026-10-11): uniform over the three slugs, and
//     reading it back off metadata never fails — anything that is not a slug is the fallback.

import { describe, expect, it } from 'vitest';

import {
  BACKEND_OFFER_CATALOG,
  TEA_CUPS,
  TEA_CUP_DEFAULT,
  TEA_READING_BUMP_CENTS,
  TEA_READING_BUMP_PRODUCT_KEY,
  TEA_READING_GRACE_MINUTES,
  TEA_READING_LADDER_START_ENV,
  TEA_READING_RUNG_CENTS,
  backendOfferForStripeProduct,
  backendOrderDescriptor,
  ladderRungAt,
  parseLadderStart,
  priceBackendOffer,
  priceLabel,
  resolveBackendCharge,
  resolveLadderCharge,
  isTeaCup,
  resolveTeaCup,
  type BackendChargeRequest,
  type TeaCup,
} from '@shared/backendOffers';
import { drawTeaCup } from './be04Draw';

const TEA = BACKEND_OFFER_CATALOG['tea-reading'];
if (TEA.pricing.model !== 'ladder') throw new Error('04 must be a ladder offer');
const LADDER = TEA.pricing;
const RUNGS = LADDER.rungs;

const START = '2026-10-12T10:30:00Z';
const START_MS = Date.parse(START);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** The checkout's view of the clock at `offsetMs` after the letter went out. */
const clockAt = (offsetMs: number) => ({ startIso: START, nowMs: START_MS + offsetMs });

const price = (req: Omit<BackendChargeRequest, 'offer'>) => priceBackendOffer(TEA, req);

function charged(result: ReturnType<typeof priceBackendOffer>) {
  if (!result.ok) throw new Error(`expected a charge, got ${result.code}`);
  return result;
}

describe('the rungs', () => {
  it('are $35 / $47 / $57 / $67 for days 1 / 2 / 3 / 4+ (D4, locked)', () => {
    expect(TEA_READING_RUNG_CENTS).toEqual({ 1: 3500, 2: 4700, 3: 5700, 4: 6700 });
    expect(RUNGS).toEqual([
      { day: 1, cents: 3500 },
      { day: 2, cents: 4700 },
      { day: 3, cents: 5700 },
      { day: 4, cents: 6700 },
    ]);
    expect(LADDER.startEnv).toBe('BE04_LADDER_START');
    expect(TEA_READING_LADDER_START_ENV).toBe('BE04_LADDER_START');
    expect(LADDER.graceMinutes).toBe(120);
  });
});

describe('ladderRungAt — which day it is', () => {
  it('is day 1 at the moment the letter goes out', () => {
    expect(ladderRungAt(RUNGS, START, START_MS)).toEqual({ day: 1, cents: 3500, startSet: true });
  });

  it('is still day 1 at 23:59', () => {
    expect(ladderRungAt(RUNGS, START, START_MS + 23 * HOUR + 59 * MIN).day).toBe(1);
    expect(ladderRungAt(RUNGS, START, START_MS + DAY - 1).day).toBe(1);
  });

  it('turns to day 2 at exactly 24 hours', () => {
    expect(ladderRungAt(RUNGS, START, START_MS + DAY)).toEqual({ day: 2, cents: 4700, startSet: true });
  });

  it('is day 3 just before 72 hours, and day 4 at exactly 72 hours', () => {
    expect(ladderRungAt(RUNGS, START, START_MS + 72 * HOUR - 1)).toMatchObject({ day: 3, cents: 5700 });
    expect(ladderRungAt(RUNGS, START, START_MS + 72 * HOUR)).toMatchObject({ day: 4, cents: 6700 });
  });

  it('stays on day 4 at $67 for good — 30 days later the offer is still open', () => {
    expect(ladderRungAt(RUNGS, START, START_MS + 30 * DAY)).toEqual({ day: 4, cents: 6700, startSet: true });
  });

  it('is day 1 before the start', () => {
    expect(ladderRungAt(RUNGS, START, START_MS - HOUR)).toEqual({ day: 1, cents: 3500, startSet: true });
  });

  it('is day 1 with startSet:false when the start is unset or unparseable — never overcharge', () => {
    const late = START_MS + 30 * DAY;
    for (const bad of [undefined, null, '', '   ', 'next tuesday', '2026-13-45T99:99:00Z']) {
      expect(ladderRungAt(RUNGS, bad, late), String(bad)).toEqual({ day: 1, cents: 3500, startSet: false });
    }
  });

  it('refuses a time with no zone — Date.parse would read it in the SERVER\'s local zone', () => {
    expect(parseLadderStart('2026-10-12T10:30:00')).toBeNull();
    expect(ladderRungAt(RUNGS, '2026-10-12T10:30:00', START_MS + 30 * DAY).startSet).toBe(false);
  });

  it('accepts Z, an offset, or a bare date (UTC midnight)', () => {
    expect(parseLadderStart(START)).toBe(START_MS);
    expect(parseLadderStart('2026-10-12T18:30:00+08:00')).toBe(START_MS);
    expect(parseLadderStart('2026-10-12')).toBe(Date.parse('2026-10-12T00:00:00Z'));
    expect(parseLadderStart(' 2026-10-12T10:30:00.000Z ')).toBe(START_MS);
  });
});

describe('priceBackendOffer — what checkout charges on a ladder', () => {
  it('charges the server\'s rung and reports it as `rung`', () => {
    const cases = [
      [0, 1, 3500],
      [DAY, 2, 4700],
      [2 * DAY, 3, 5700],
      [3 * DAY, 4, 6700],
      [30 * DAY, 4, 6700],
    ] as const;
    for (const [offset, day, cents] of cases) {
      const r = charged(price({ ladderClock: clockAt(offset) }));
      expect(r.rung, `+${offset}ms`).toBe(day);
      expect(r.readingCents).toBe(cents);
      expect(r.totalCents).toBe(cents);
      expect(r.tier).toBeUndefined();
    }
  });

  it('charges day 1 when no clock is passed at all', () => {
    const r = charged(price({}));
    expect(r.rung).toBe(1);
    expect(r.readingCents).toBe(3500);
  });

  it('charges day 1 when the start is unset, however late it is', () => {
    const r = charged(price({ ladderClock: { startIso: undefined, nowMs: START_MS + 30 * DAY } }));
    expect(r.readingCents).toBe(3500);
  });

  it('IGNORES a tampered amountCents and tier — the ladder is priced by the server alone', () => {
    const r = charged(price({ ladderClock: clockAt(DAY + 3 * HOUR), amountCents: 1, tier: 'spread' }));
    expect(r.readingCents).toBe(4700);
    expect(r.rung).toBe(2);
    expect(r.tier).toBeUndefined();
  });

  it('a missing (or nonsense) quotedDay is charged today\'s rung', () => {
    for (const quotedDay of [undefined, null, '', 'abc', 0, -1, 1.5, {}, NaN]) {
      const r = charged(price({ ladderClock: clockAt(DAY + 3 * HOUR), quotedDay }));
      expect(r.readingCents, String(quotedDay)).toBe(4700);
    }
  });

  it('accepts a quotedDay sent as a string', () => {
    const r = charged(price({ ladderClock: clockAt(DAY + 60 * MIN), quotedDay: '1' }));
    expect(r.readingCents).toBe(3500);
  });
});

describe('the grace window — 120 minutes after the rung moves on', () => {
  it('honours yesterday\'s price at +119 minutes', () => {
    const r = charged(price({ ladderClock: clockAt(DAY + 119 * MIN), quotedDay: 1 }));
    expect(r.rung).toBe(1);
    expect(r.readingCents).toBe(3500);
  });

  it('refuses it at +121 minutes with price_changed and today\'s rung', () => {
    const r = price({ ladderClock: clockAt(DAY + 121 * MIN), quotedDay: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('price_changed');
    expect(r.current).toEqual({ day: 2, cents: 4700 });
    // Plain, and it tells her what to do.
    expect(r.message).toMatch(/press the button again/);
  });

  it('honours today\'s own day inside the window too', () => {
    const r = charged(price({ ladderClock: clockAt(DAY + 30 * MIN), quotedDay: 2 }));
    expect(r.readingCents).toBe(4700);
  });

  it('refuses a quotedDay LOWER than both today and the grace day', () => {
    for (const quotedDay of [1, 2]) {
      const r = price({ ladderClock: clockAt(2 * DAY + 3 * HOUR), quotedDay });
      expect(r.ok, `quotedDay ${quotedDay}`).toBe(false);
      if (!r.ok) expect(r.current).toEqual({ day: 3, cents: 5700 });
    }
  });

  it('charges a quotedDay HIGHER than today at today\'s lower rung', () => {
    const r = charged(price({ ladderClock: clockAt(HOUR), quotedDay: 3 }));
    expect(r.rung).toBe(1);
    expect(r.readingCents).toBe(3500);
  });

  it('on day 4+ the grace day is day 4 as well — a day-3 page is refused, never honoured late', () => {
    const r = price({ ladderClock: clockAt(10 * DAY), quotedDay: 3 });
    expect(r.ok).toBe(false);
  });

  it('is the catalog\'s grace setting, applied by resolveLadderCharge', () => {
    const atEdge = resolveLadderCharge(LADDER, 1, clockAt(DAY + TEA_READING_GRACE_MINUTES * MIN - 1));
    const pastEdge = resolveLadderCharge(LADDER, 1, clockAt(DAY + TEA_READING_GRACE_MINUTES * MIN + 1));
    expect(atEdge.ok).toBe(true);
    expect(pastEdge.ok).toBe(false);
  });
});

describe('the Double Turning bump (intangible — operator 2026-10-11)', () => {
  it('is $12.77 at every rung, as a second line, under its own key', () => {
    for (const [offset, reading] of [[0, 3500], [DAY, 4700], [2 * DAY, 5700], [9 * DAY, 6700]] as const) {
      const r = charged(price({ ladderClock: clockAt(offset), bump: true }));
      expect(r.bumpCents).toBe(1277);
      expect(r.totalCents).toBe(reading + 1277);
      expect(r.lines).toEqual([
        {
          name: 'The Turn — tea-leaf reading by Evelyn Cross',
          description: 'Your 21-day reading, delivered within 24 hours.',
          amountCents: reading,
        },
        { name: 'The Double Turning', amountCents: 1277 },
      ]);
    }
  });

  it('ships unticked — anything but an explicit true is no bump', () => {
    expect(charged(price({ bump: undefined })).bumpPurchased).toBe(false);
    expect(charged(price({ bump: false })).bumpPurchased).toBe(false);
  });

  it('owns its key — never another offer\'s (n8n exact-matches bumpProduct)', () => {
    expect(TEA_READING_BUMP_PRODUCT_KEY).toBe('double_turning');
    expect(TEA_READING_BUMP_CENTS).toBe(1277);
    expect(TEA.bump).toEqual({ productKey: 'double_turning', cents: 1277, stripeName: 'The Double Turning' });
    const others = Object.values(BACKEND_OFFER_CATALOG)
      .filter((o) => o.key !== 'tea-reading')
      .flatMap((o) => (o.bump ? [o.bump.productKey] : []));
    expect(others).not.toContain('double_turning');
  });

  it('is a NEW key, not the retired Still Cup\'s — and nothing delivered rides with it', async () => {
    expect(TEA_READING_BUMP_PRODUCT_KEY).not.toBe('still_cup');
    const shared = await import('@shared/backendOffers');
    expect('TEA_READING_STILL_CUP_PATH' in shared).toBe(false);
    expect(JSON.stringify(TEA)).not.toMatch(/still[ _-]?cup/i);
  });
});

describe('the cup — drawn at checkout, never picked (operator 2026-10-11)', () => {
  it('has three slugs; the read-back fallback is the divided rim', () => {
    expect([...TEA_CUPS]).toEqual(['turned-handle', 'divided-rim', 'sunken-leaf']);
    expect(TEA_CUP_DEFAULT).toBe('divided-rim');
  });

  it('asks the random source for exactly three outcomes, and maps each to its own cup', () => {
    const asked: number[] = [];
    const cups = [0, 1, 2].map((i) =>
      drawTeaCup((max) => {
        asked.push(max);
        return i;
      }),
    );
    expect(asked).toEqual([3, 3, 3]);
    expect(cups).toEqual([...TEA_CUPS]);
  });

  it('is uniform over the three: a uniform source deals each cup equally often', () => {
    let n = 0;
    const counts: Record<TeaCup, number> = { 'turned-handle': 0, 'divided-rim': 0, 'sunken-leaf': 0 };
    for (let k = 0; k < 300; k++) counts[drawTeaCup((max) => n++ % max)]++;
    expect(counts).toEqual({ 'turned-handle': 100, 'divided-rim': 100, 'sunken-leaf': 100 });
  });

  it('the real draw (crypto.randomInt) only deals valid slugs, and deals all three', () => {
    const counts: Record<TeaCup, number> = { 'turned-handle': 0, 'divided-rim': 0, 'sunken-leaf': 0 };
    for (let k = 0; k < 600; k++) {
      const cup = drawTeaCup();
      expect(isTeaCup(cup), String(cup)).toBe(true);
      counts[cup]++;
    }
    // Expected 200 each (sd ≈ 11.5). 120..280 is ±7 sd: a fair draw never fails this; a
    // draw stuck on one cup, or on two, always does.
    for (const cup of TEA_CUPS) expect(counts[cup], cup).toBeGreaterThanOrEqual(120);
    for (const cup of TEA_CUPS) expect(counts[cup], cup).toBeLessThanOrEqual(280);
  });

  it('refuses an injected source that answers outside 0..2 — never a silent default', () => {
    for (const bad of [3, -1, 1.5, Number.NaN]) {
      expect(() => drawTeaCup(() => bad), String(bad)).toThrow(RangeError);
    }
  });

  it('reads a cup back off metadata: a valid slug stays, anything else is the fallback', () => {
    for (const cup of TEA_CUPS) expect(resolveTeaCup(cup)).toBe(cup);
    expect(resolveTeaCup(' Sunken-Leaf ')).toBe('sunken-leaf');
    for (const bad of [undefined, null, '', 'blue', 'divided_rim', 42, {}, ['sunken-leaf']]) {
      expect(resolveTeaCup(bad), JSON.stringify(bad)).toBe('divided-rim');
    }
  });
});

describe('the 04 catalog row', () => {
  it('is catalogued with the settled facts', () => {
    expect(TEA).toMatchObject({
      key: 'tea-reading',
      number: '04',
      stripeName: 'The Turn — tea-leaf reading by Evelyn Cross',
      stripeDescription: 'Your 21-day reading, delivered within 24 hours.',
      stripeProduct: 'be_tea_reading',
      bookingPath: { page: '/offers/wiccan/tea-reading', chat: '/offers/wiccan/tea-reading/chat' },
      successPath: '/offers/wiccan/tea-reading/success',
      upsellEntryPath: '/offers/upsell/welcome1',
      collectsShipping: false,
    });
    expect(backendOfferForStripeProduct('be_tea_reading')?.key).toBe('tea-reading');
  });

  it('⛔ is NOT open for money — resolveBackendCharge answers not_ready', () => {
    expect(TEA.readyForMoney).toBe(false);
    const r = resolveBackendCharge({ offer: 'tea-reading', ladderClock: clockAt(0) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('not_ready');
  });

  it('labels the Stripe Dashboard row BE 04, naming the bump only when she took it', () => {
    expect(backendOrderDescriptor('tea-reading', false)).toBe('BE 04 · The Turn — tea-leaf reading by Evelyn Cross');
    expect(backendOrderDescriptor('tea-reading', true))
      .toBe('BE 04 · The Turn — tea-leaf reading by Evelyn Cross + The Double Turning');
  });
});

describe('priceLabel', () => {
  it('prints whole dollars bare and cents with two places', () => {
    expect(priceLabel(3500)).toBe('$35');
    expect(priceLabel(6700)).toBe('$67');
    expect(priceLabel(1277)).toBe('$12.77');
  });
});
