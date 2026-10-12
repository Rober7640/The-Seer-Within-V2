// 04 · The Turn — one fixed price under a $35 / $45 split test, the cup draw, and the catalog row.
//
//   npx vitest run server/lib/backendOffers.teaReading.test.ts
//
// (Lives under server/ because vitest only collects tests from server/ and tests/; the code
// under test is shared/backendOffers.ts, plus the draw in server/lib/be04Draw.ts.)
//
// What these pin down:
//  1. NO LADDER (operator 2026-10-11: no price hike). One fixed price, $35, with a CLOSED set
//     of split-test prices {3500, 4500}. Nothing of the day ladder is left to import.
//  2. THE ARM PRICE IS THE SERVER'S. priceBackendOffer charges `armCents` only when it is in
//     the closed set — anything else is the $35 control. The browser's `amountCents`, `tier`
//     and an old page's `quotedDay` can never move it.
//  3. NO OTHER OFFER READS `armCents`.
//  4. THE CUP IS DRAWN, NOT PICKED (operator 2026-10-11): uniform over the three slugs, and
//     reading it back off metadata never fails — anything that is not a slug is the fallback.

import { describe, expect, it } from 'vitest';

import * as shared from '@shared/backendOffers';
import {
  BACKEND_OFFER_CATALOG,
  TEA_CUPS,
  TEA_CUP_DEFAULT,
  TEA_READING_BUMP_CENTS,
  TEA_READING_BUMP_PRODUCT_KEY,
  TEA_READING_PRICE_ARMS,
  TEA_READING_PRICE_CENTS,
  TEA_READING_TEST_CENTS,
  backendOfferForStripeProduct,
  backendOrderDescriptor,
  isTeaReadingPriceArm,
  priceBackendOffer,
  priceLabel,
  resolveBackendCharge,
  isTeaCup,
  resolveTeaCup,
  type BackendChargeRequest,
  type TeaCup,
} from '@shared/backendOffers';
import { drawTeaCup } from './be04Draw';

const TEA = BACKEND_OFFER_CATALOG['tea-reading'];

const price = (req: Omit<BackendChargeRequest, 'offer'>) => priceBackendOffer(TEA, req);

function charged(result: ReturnType<typeof priceBackendOffer>) {
  if (!result.ok) throw new Error(`expected a charge, got ${result.code}`);
  return result;
}

describe('the price — fixed $35, split-tested against $45', () => {
  it('is a fixed price of $35 with the closed test set {3500, 4500}, control first', () => {
    expect(TEA.pricing).toEqual({ model: 'fixed', priceCents: 3500, testCents: [3500, 4500] });
    expect(TEA_READING_PRICE_CENTS).toBe(3500);
    expect(TEA_READING_PRICE_ARMS).toEqual({ A: 3500, B: 4500 });
    expect([...TEA_READING_TEST_CENTS]).toEqual([3500, 4500]);
  });

  it('knows exactly two arms', () => {
    expect(isTeaReadingPriceArm('A')).toBe(true);
    expect(isTeaReadingPriceArm('B')).toBe(true);
    for (const bad of ['a', 'b', 'C', '', null, undefined, 1, {}]) expect(isTeaReadingPriceArm(bad), String(bad)).toBe(false);
  });

  it('⛔ the day ladder is gone — no rungs, no clock, no grace window to import', () => {
    for (const name of [
      'TEA_READING_RUNG_CENTS',
      'TEA_READING_LADDER_START_ENV',
      'TEA_READING_GRACE_MINUTES',
      'ladderRungAt',
      'ladderCentsForDay',
      'parseLadderStart',
      'resolveLadderCharge',
    ]) {
      expect(name in shared, name).toBe(false);
    }
    for (const offer of Object.values(BACKEND_OFFER_CATALOG)) {
      expect(offer.pricing.model, offer.key).not.toBe('ladder');
    }
    expect(JSON.stringify(TEA)).not.toMatch(/ladder|rung|BE04_LADDER_START/i);
  });
});

describe('priceBackendOffer — what checkout charges for 04', () => {
  it('charges $35 when the server hands it no arm price', () => {
    const r = charged(price({}));
    expect(r.readingCents).toBe(3500);
    expect(r.totalCents).toBe(3500);
    expect(r.tier).toBeUndefined();
    expect(r).not.toHaveProperty('rung');
  });

  it('charges the server\'s arm price when it is in the closed set', () => {
    expect(charged(price({ armCents: 3500 })).readingCents).toBe(3500);
    expect(charged(price({ armCents: 4500 })).readingCents).toBe(4500);
    expect(charged(price({ armCents: 4500 })).totalCents).toBe(4500);
  });

  it('⛔ any other arm price falls back to the $35 control — never charged', () => {
    for (const bad of [1, 0, -4500, 4499, 4501, 4700, 5700, 6700, 45, 4500.5, Number.NaN, Infinity, '4500', null, undefined, {}]) {
      expect(charged(price({ armCents: bad as never })).readingCents, String(bad)).toBe(3500);
    }
  });

  it('IGNORES a tampered amountCents / tier, and an old page\'s quotedDay', () => {
    const r = charged(price({ armCents: 4500, amountCents: 1, tier: 'spread', quotedDay: 1 } as never));
    expect(r.readingCents).toBe(4500);
    expect(r.tier).toBeUndefined();
    expect(charged(price({ amountCents: 99999, quotedDay: 4 } as never)).readingCents).toBe(3500);
  });

  it('prints the same one line at either price — the arm never reaches her receipt', () => {
    for (const cents of [3500, 4500]) {
      expect(charged(price({ armCents: cents })).lines).toEqual([
        {
          name: 'The Turn — tea-leaf reading by Evelyn Cross',
          description: 'Your 21-day reading, delivered within 24 hours.',
          amountCents: cents,
        },
      ]);
    }
  });
});

describe('no other offer reads armCents', () => {
  it('fixed offers keep their own price, whatever arm price is handed in', () => {
    for (const [key, cents] of [['twin-flame', 3500], ['pixiu-bracelet', 4900], ['marcus-reading', 3500], ['heart-cleanser', 5500]] as const) {
      const offer = BACKEND_OFFER_CATALOG[key];
      expect(offer.pricing, key).toEqual({ model: 'fixed', priceCents: cents });
      for (const arm of [3500, 4500, 1]) {
        const r = priceBackendOffer(offer, { armCents: arm });
        expect(r.ok && r.readingCents, `${key} armCents ${arm}`).toBe(cents);
      }
    }
  });

  it('pay-what-you-want and tiered offers ignore it too', () => {
    const pwyw = priceBackendOffer(BACKEND_OFFER_CATALOG['judgement-day'], { amountCents: 2200, armCents: 4500 });
    expect(pwyw.ok && pwyw.readingCents).toBe(2200);
    const tiered = priceBackendOffer(BACKEND_OFFER_CATALOG['marcus-daily'], { tier: 'spread', armCents: 4500 });
    expect(tiered.ok && tiered.readingCents).toBe(3500);
  });
});

describe('the Double Turning bump (intangible — operator 2026-10-11)', () => {
  it('is $12.77 at either price, as a second line, under its own key', () => {
    for (const reading of [3500, 4500]) {
      const r = charged(price({ armCents: reading, bump: true }));
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
    const r = resolveBackendCharge({ offer: 'tea-reading', armCents: 4500 });
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
    expect(priceLabel(4500)).toBe('$45');
    expect(priceLabel(1277)).toBe('$12.77');
  });
});
