// Does a post-purchase upsell still have to ASK her for a mailing address?
//
//   npx vitest run client/src/lib/upsellShipping.test.ts
//
// Operator decision (Joel, 2026-09-16): "skip". A backend offer that collects the
// address on Stripe Checkout BEFORE payment (09 Heart Cleanser, 06 Wishing Bracelet —
// the catalog's `collectsShipping`) must not make her type it a second time on U1/U2.
//
// What these pin down:
//  1. THE FORM IS SKIPPED for a collectsShipping offer, and the address it reuses is
//     the one she already gave.
//  2. ⛔ V1 IS UNTOUCHED. V1 is live and takes money: `backend: false` always asks,
//     whatever else is passed.
//  3. A BACKEND OFFER WITHOUT `collectsShipping` (02, 03, 08) still asks — those
//     checkouts never collected an address, so there is nothing to reuse.
//  4. A MISSING/UNUSABLE ADDRESS FALLS BACK TO ASKING rather than shipping blind.

import { describe, expect, it } from 'vitest';
import { reusableUpsellShipping } from './upsellShipping';

const ADDRESS = {
  name: 'Sarah Rose',
  line1: '1 Rose Lane',
  line2: 'Flat 2',
  city: 'Bath',
  state: 'Somerset',
  postal: 'BA1 1AA',
  country: 'GB',
};

describe('reusableUpsellShipping — the offers that already have her address', () => {
  it('09 reuses the booking address, so the upsell never opens the form', () => {
    expect(
      reusableUpsellShipping({ backend: true, offer: 'heart-cleanser', shipping: ADDRESS }),
    ).toEqual(ADDRESS);
  });

  it('06 shares the code and behaves the same', () => {
    expect(
      reusableUpsellShipping({ backend: true, offer: 'pixiu-bracelet', shipping: ADDRESS }),
    ).toEqual(ADDRESS);
  });

  it('omits line2 entirely when she gave none (never an empty bubble on the label)', () => {
    const { line2: _dropped, ...noLine2 } = ADDRESS;
    const reuse = reusableUpsellShipping({
      backend: true,
      offer: 'heart-cleanser',
      shipping: { ...noLine2, line2: '' },
    });
    expect(reuse).toEqual(noLine2);
    expect(reuse).not.toHaveProperty('line2');
  });

  it('normalises the country to upper-case ISO alpha-2', () => {
    const reuse = reusableUpsellShipping({
      backend: true,
      offer: 'heart-cleanser',
      shipping: { ...ADDRESS, country: 'gb' },
    });
    expect(reuse?.country).toBe('GB');
  });
});

describe('reusableUpsellShipping — ⛔ who must keep seeing the form', () => {
  it('V1 ALWAYS asks — the live funnel is untouched', () => {
    // Even handed a perfectly good address and a physical offer key, V1 asks.
    expect(reusableUpsellShipping({ backend: false, shipping: ADDRESS })).toBeNull();
    expect(
      reusableUpsellShipping({ backend: false, offer: 'heart-cleanser', shipping: ADDRESS }),
    ).toBeNull();
  });

  it('a backend offer that collects NO address at checkout still asks', () => {
    // 02 / 03 / 08 are digital: Stripe collected an email and nothing else.
    for (const offer of ['twin-flame', 'judgement-day', 'marcus-reading']) {
      expect(reusableUpsellShipping({ backend: true, offer, shipping: ADDRESS }), offer).toBeNull();
    }
  });

  it('an unknown or absent offer key asks rather than guessing', () => {
    expect(reusableUpsellShipping({ backend: true, shipping: ADDRESS })).toBeNull();
    expect(reusableUpsellShipping({ backend: true, offer: null, shipping: ADDRESS })).toBeNull();
    expect(reusableUpsellShipping({ backend: true, offer: 'hex-her', shipping: ADDRESS })).toBeNull();
  });
});

describe('reusableUpsellShipping — the fallback: ask rather than ship blind', () => {
  it('asks when there is no address at all', () => {
    expect(reusableUpsellShipping({ backend: true, offer: 'heart-cleanser' })).toBeNull();
    expect(
      reusableUpsellShipping({ backend: true, offer: 'heart-cleanser', shipping: null }),
    ).toBeNull();
  });

  it('asks when the street line is missing or blank', () => {
    for (const line1 of [undefined, '', '   ']) {
      expect(
        reusableUpsellShipping({
          backend: true,
          offer: 'heart-cleanser',
          shipping: { ...ADDRESS, line1 },
        }),
        String(line1),
      ).toBeNull();
    }
  });

  it('asks when the country is missing or not a 2-letter code', () => {
    for (const country of [undefined, '', 'United Kingdom']) {
      expect(
        reusableUpsellShipping({
          backend: true,
          offer: 'heart-cleanser',
          shipping: { ...ADDRESS, country },
        }),
        String(country),
      ).toBeNull();
    }
  });

  it('a partial address is still usable when line1 and country are there', () => {
    // State is genuinely absent in most of the world; that must not force the form.
    expect(
      reusableUpsellShipping({
        backend: true,
        offer: 'heart-cleanser',
        shipping: { name: 'Sarah Rose', line1: '1 Rose Lane', city: 'Bath', postal: 'BA1 1AA', country: 'GB' },
      }),
    ).toEqual({
      name: 'Sarah Rose',
      line1: '1 Rose Lane',
      city: 'Bath',
      state: '',
      postal: 'BA1 1AA',
      country: 'GB',
    });
  });
});
