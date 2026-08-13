// The backend deck's money rules.
//
//   npx vitest run server/lib/backendOffers.test.ts
//
// (Lives under server/ because vitest only collects tests from server/ and tests/;
//  the code under test is shared/backendOffers.ts.)
//
// What these pin down:
//  1. A FIXED-PRICE OFFER IGNORES THE BROWSER'S NUMBER. The one rule that stops a
//     $35 reading being bought for a cent.
//  2. THE PAY-WHAT-YOU-WANT FLOOR IS ENFORCED HERE, server-side. The screens hide
//     it; hiding is not enforcing.
//  3. THE BUMP IS OPT-IN and priced from the catalog, never from the request.
//  4. `metadata.product` STAYS `be_*`. Every branch of the live Stripe webhook is
//     keyed on that string, and six funnels share it — a backend order that
//     collided with `energy_clearing_ritual` would fire V1's paid-list writes,
//     Meta CAPI, Google Ads and the price-test stamp on a sale that is none of those.

import { describe, expect, it } from 'vitest';

import {
  BACKEND_OFFER_CATALOG,
  BACKEND_PWYW_MAX_CENTS,
  BACKEND_STRIPE_PRODUCT_PREFIX,
  JUDGEMENT_BUMP_CENTS,
  JUDGEMENT_MIN_CENTS,
  TWIN_FLAME_BUMP_CENTS,
  TWIN_FLAME_PRICE_CENTS,
  backendOfferForStripeProduct,
  isBackendOfferKey,
  priceBackendOffer,
  resolveBackendCharge,
} from '@shared/backendOffers';

/** Narrow to the success shape, failing loudly instead of returning undefined. */
function charged(result: ReturnType<typeof resolveBackendCharge>) {
  if (!result.ok) throw new Error(`expected a charge, got ${result.code}`);
  return result;
}

/** 03's arithmetic is provable long before 03 is allowed to take money. */
const JUDGEMENT = BACKEND_OFFER_CATALOG['judgement-day'];
const priceJudgement = (req: { amountCents?: number | null; bump?: boolean }) =>
  priceBackendOffer(JUDGEMENT, req);

describe('a fixed-price offer (02)', () => {
  it('charges the catalog price', () => {
    const r = charged(resolveBackendCharge({ offer: 'twin-flame' }));
    expect(r.readingCents).toBe(TWIN_FLAME_PRICE_CENTS);
    expect(r.totalCents).toBe(TWIN_FLAME_PRICE_CENTS);
  });

  it('IGNORES an amount posted by the browser', () => {
    const r = charged(resolveBackendCharge({ offer: 'twin-flame', amountCents: 1 }));
    expect(r.totalCents).toBe(TWIN_FLAME_PRICE_CENTS);
  });

  it('adds the bump only when she took it, at the catalog price', () => {
    expect(charged(resolveBackendCharge({ offer: 'twin-flame' })).bumpCents).toBe(0);
    const withBump = charged(resolveBackendCharge({ offer: 'twin-flame', bump: true }));
    expect(withBump.bumpCents).toBe(TWIN_FLAME_BUMP_CENTS);
    expect(withBump.totalCents).toBe(TWIN_FLAME_PRICE_CENTS + TWIN_FLAME_BUMP_CENTS);
    expect(withBump.lines).toHaveLength(2);
  });

  it('treats anything other than an explicit true as "no bump" — it ships unchecked', () => {
    expect(charged(resolveBackendCharge({ offer: 'twin-flame', bump: undefined })).bumpPurchased)
      .toBe(false);
    expect(charged(resolveBackendCharge({ offer: 'twin-flame', bump: false })).bumpPurchased)
      .toBe(false);
  });
});

describe('a pay-what-you-want offer (03)', () => {
  it('charges what she chose to give', () => {
    const r = charged(priceJudgement({ amountCents: 4000 }));
    expect(r.readingCents).toBe(4000);
    expect(r.totalCents).toBe(4000);
  });

  it('refuses below the floor, and the message never names the floor', () => {
    const r = priceJudgement({ amountCents: JUDGEMENT_MIN_CENTS - 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('amount_below_floor');
    expect(r.message).not.toMatch(/\d/);
  });

  it('accepts exactly the floor', () => {
    expect(charged(priceJudgement({ amountCents: JUDGEMENT_MIN_CENTS })).totalCents)
      .toBe(JUDGEMENT_MIN_CENTS);
  });

  it('refuses a missing amount rather than inventing one', () => {
    expect(priceJudgement({}).ok).toBe(false);
    expect(priceJudgement({ amountCents: null }).ok).toBe(false);
    expect(priceJudgement({ amountCents: NaN }).ok).toBe(false);
  });

  it('refuses a slipped decimal point instead of charging it', () => {
    const r = priceJudgement({ amountCents: BACKEND_PWYW_MAX_CENTS + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('amount_too_large');
  });

  it('refuses a fractional cent rather than rounding to a number she never saw', () => {
    expect(priceJudgement({ amountCents: 4000.5 }).ok).toBe(false);
  });

  it('adds the bump at ITS fixed price, on top of whatever she gave', () => {
    const r = charged(priceJudgement({ amountCents: 2500, bump: true }));
    expect(r.readingCents).toBe(2500);
    expect(r.bumpCents).toBe(JUDGEMENT_BUMP_CENTS);
    expect(r.totalCents).toBe(2500 + JUDGEMENT_BUMP_CENTS);
  });
});

describe('the after-the-money gate', () => {
  // 🔴 The rule this exists for: a paid product must never fail to arrive. 03's
  // thank-you screen does not render and its ACT intake does not exist, so it must
  // refuse money however it is asked — including after somebody flips the client's
  // BACKEND_CHECKOUT_LIVE switch for 02.
  it('refuses an offer whose after-the-money screens do not exist yet', () => {
    const r = resolveBackendCharge({ offer: 'judgement-day', amountCents: 4000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('not_ready');
  });

  it('refuses it before pricing, so a perfectly valid amount still cannot pay', () => {
    // Same amount that prices fine through the pure path above.
    expect(charged(priceJudgement({ amountCents: 4000 })).totalCents).toBe(4000);
    expect(resolveBackendCharge({ offer: 'judgement-day', amountCents: 4000 }).ok).toBe(false);
  });

  it('lets a ready offer through', () => {
    expect(resolveBackendCharge({ offer: 'twin-flame' }).ok).toBe(true);
  });

  it('never marks an offer ready while its Entry form is missing on an ACT offer', () => {
    // 03 is the deck's only ACT offer. If someone sets readyForMoney without setting
    // entryPath, this catches it: fulfilment would have no way to ask for the Entry.
    if (JUDGEMENT.readyForMoney) expect(JUDGEMENT.entryPath).toBeTruthy();
  });
});

describe('the catalog', () => {
  it('rejects an offer key it does not hold', () => {
    expect(isBackendOfferKey('twin-flame')).toBe(true);
    expect(isBackendOfferKey('hex-her')).toBe(false);
    expect(isBackendOfferKey(undefined)).toBe(false);
    const r = resolveBackendCharge({ offer: 'hex-her' as never });
    expect(r.ok).toBe(false);
  });

  it('keeps every Stripe product under the be_ prefix, so no funnel branch can match it', () => {
    for (const offer of Object.values(BACKEND_OFFER_CATALOG)) {
      expect(offer.stripeProduct.startsWith(BACKEND_STRIPE_PRODUCT_PREFIX)).toBe(true);
    }
    // The strings the live webhook branches on. None of them may ever be a backend product.
    const funnelProducts = [
      'energy_clearing_ritual',
      'protection_ritual',
      'manifestation_bracelet',
      'soulmate_bracelet',
      'soulmate_love_tuner',
      'soulmate_sketch',
    ];
    for (const offer of Object.values(BACKEND_OFFER_CATALOG)) {
      expect(funnelProducts).not.toContain(offer.stripeProduct);
    }
  });

  it('gives each offer a distinct Stripe product, and maps back from it', () => {
    const products = Object.values(BACKEND_OFFER_CATALOG).map((o) => o.stripeProduct);
    expect(new Set(products).size).toBe(products.length);
    expect(backendOfferForStripeProduct('be_twin_flame')?.key).toBe('twin-flame');
    expect(backendOfferForStripeProduct('energy_clearing_ritual')).toBeNull();
    expect(backendOfferForStripeProduct(undefined)).toBeNull();
  });

  it('gives each offer its OWN bump product key — n8n exact-matches it to decide what to send', () => {
    const keys = Object.values(BACKEND_OFFER_CATALOG).map((o) => o.bump.productKey);
    expect(new Set(keys).size).toBe(keys.length);
    // V1's key. Reusing it would post her a second V1 reading instead of the instructional.
    expect(keys).not.toContain('double_reading');
  });
});
