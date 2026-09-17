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
  PIXIU_BRACELET_BUMP_CENTS,
  PIXIU_BRACELET_PRICE_CENTS,
  MARCUS_READING_BUMP_CENTS,
  MARCUS_READING_PRICE_CENTS,
  backendOfferForStripeProduct,
  backendOrderDescriptor,
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

describe('a fixed-price PHYSICAL offer (06 — the Wishing Bracelet)', () => {
  // 06's arithmetic is provable now, months before readyForMoney flips true —
  // so, like 03, these price it directly (past the readiness gate that
  // resolveBackendCharge applies). See "the after-the-money gate" below.
  const WISHING = BACKEND_OFFER_CATALOG['pixiu-bracelet'];
  const priceWishing = (req: { amountCents?: number | null; bump?: boolean }) =>
    priceBackendOffer(WISHING, req);

  it('charges the catalog price and ignores a browser-posted amount', () => {
    expect(charged(priceWishing({})).readingCents).toBe(PIXIU_BRACELET_PRICE_CENTS);
    expect(charged(priceWishing({ amountCents: 1 })).totalCents).toBe(PIXIU_BRACELET_PRICE_CENTS);
  });

  it('adds The Closed Purse bump only when taken, at the catalog price', () => {
    expect(charged(priceWishing({})).bumpCents).toBe(0);
    const withBump = charged(priceWishing({ bump: true }));
    expect(withBump.bumpCents).toBe(PIXIU_BRACELET_BUMP_CENTS);
    expect(withBump.totalCents).toBe(PIXIU_BRACELET_PRICE_CENTS + PIXIU_BRACELET_BUMP_CENTS);
  });

  it('honors the readyForMoney gate (open only when the flag is set)', () => {
    // Robust to the flag flipping (dev-test true / prod false until launch): the
    // gate must MATCH the catalog flag, so this passes either way.
    const ready = BACKEND_OFFER_CATALOG['pixiu-bracelet'].readyForMoney;
    const r = resolveBackendCharge({ offer: 'pixiu-bracelet' });
    expect(r.ok).toBe(ready);
    if (!ready && !r.ok) expect(r.code).toBe('not_ready');
  });

  it('is the only offer that collects shipping — the digital ones do not', () => {
    expect(BACKEND_OFFER_CATALOG['pixiu-bracelet'].collectsShipping).toBe(true);
    expect(BACKEND_OFFER_CATALOG['twin-flame'].collectsShipping).toBeFalsy();
    expect(BACKEND_OFFER_CATALOG['judgement-day'].collectsShipping).toBeFalsy();
  });

  it('resolves from its own be_ Stripe product', () => {
    expect(backendOfferForStripeProduct('be_pixiu_bracelet')?.key).toBe('pixiu-bracelet');
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
  // The rule this exists for: a paid product must never fail to arrive. The gate
  // refuses money when after-the-money screens do not exist yet (including thankyou
  // and intake). Once screens render and flow exists, readyForMoney flips true.
  it('lets a ready offer through', () => {
    expect(resolveBackendCharge({ offer: 'twin-flame' }).ok).toBe(true);
    // 03's thank-you renders (Task 6); upsell chain wired (Task 7). Intake is
    // out of scope — booking directs her to reply by email instead.
    expect(resolveBackendCharge({ offer: 'judgement-day', amountCents: 4000 }).ok).toBe(true);
  });

  it('charges what an ACT offer giver chose, and allows the bump', () => {
    // 03's arithmetic is provable long before 03 is allowed to take money. Now
    // that readyForMoney is true, the gate does not refuse it — the amount gates.
    const r = charged(resolveBackendCharge({ offer: 'judgement-day', amountCents: 4000 }));
    expect(r.readingCents).toBe(4000);
    expect(r.totalCents).toBe(4000);
    const withBump = charged(resolveBackendCharge({ offer: 'judgement-day', amountCents: 4000, bump: true }));
    expect(withBump.bumpCents).toBe(JUDGEMENT_BUMP_CENTS);
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
    // Every offer that HAS a bump must own its key (09's reiki_charge included).
    const keys = Object.values(BACKEND_OFFER_CATALOG).flatMap((o) => (o.bump ? [o.bump.productKey] : []));
    expect(keys.length).toBeGreaterThanOrEqual(6);
    expect(keys).toContain('reiki_charge');
    expect(new Set(keys).size).toBe(keys.length);
    // V1's key. Reusing it would post her a second V1 reading instead of the instructional.
    expect(keys).not.toContain('double_reading');
  });
});

describe('backendOrderDescriptor — the Stripe Dashboard label', () => {
  // Operator-only (the Dashboard "Description" column), never on the buyer's receipt.
  // Prefixed "BE <nn>" so a backend order is unmistakable at a glance among V1 sales.
  it('prefixes the offer with BE and its deck number', () => {
    expect(backendOrderDescriptor('twin-flame', false)).toBe(
      'BE 02 · The Twin Flame Tarot Reading',
    );
  });

  it('names the bump too when she took it', () => {
    expect(backendOrderDescriptor('twin-flame', true)).toBe(
      'BE 02 · The Twin Flame Tarot Reading + Astro Force instructional',
    );
  });
});

import {
  resolveOfferKey,
  backendUpsellDescriptor,
  upsellChargeFields,
} from '@shared/backendOffers';

describe('upsell offer resolution + description', () => {
  it('resolves the offer from metadata.offer when valid', () => {
    expect(resolveOfferKey({ offer: 'judgement-day' })).toBe('judgement-day');
  });

  it('falls back to the offer that owns the Stripe product', () => {
    expect(resolveOfferKey({ product: 'be_judgement_day' })).toBe('judgement-day');
    expect(resolveOfferKey({ product: 'be_twin_flame' })).toBe('twin-flame');
  });

  it('returns null when nothing resolves', () => {
    expect(resolveOfferKey({ offer: 'nope', product: 'be_unknown' })).toBeNull();
    expect(resolveOfferKey(null)).toBeNull();
  });

  it('builds the BE <number> description per offer', () => {
    expect(backendUpsellDescriptor('twin-flame', 'Protection Ritual', false))
      .toBe('BE 02 · Protection Ritual');
    expect(backendUpsellDescriptor('judgement-day', 'Manifestation Bracelet', true))
      .toBe('BE 03 · Manifestation Bracelet (downsell)');
  });

  it('upsellChargeFields resolves offer + description together, defaulting to twin-flame', () => {
    expect(upsellChargeFields({ offer: 'judgement-day' }, 'Protection Ritual', false))
      .toEqual({ offer: 'judgement-day', description: 'BE 03 · Protection Ritual' });
    // Unresolvable → the historical default, so a mis-stamped session never 500s.
    expect(upsellChargeFields({}, 'Protection Ritual', false))
      .toEqual({ offer: 'twin-flame', description: 'BE 02 · Protection Ritual' });
  });
});

// ─── 07 · the TIERED model ─────────────────────────────────────────────────────
//
// 🔴 A tiered offer is the easiest place in this file to lose the one security rule,
// because unlike a fixed offer it genuinely does let the browser change the price —
// by naming a rung. These pin down that naming a rung is ALL it can do.
describe('tiered pricing (07 · Marcus Daily Tarot)', () => {
  const priced = (req: Parameters<typeof priceBackendOffer>[1]) =>
    priceBackendOffer(BACKEND_OFFER_CATALOG['marcus-daily'], req);

  it('prices each rung from the catalog', () => {
    for (const [tier, cents] of [
      ['spread', 3500],
      ['pattern', 5700],
      ['table', 8700],
    ] as const) {
      const r = priced({ tier });
      expect(r.ok, `${tier} should price`).toBe(true);
      if (r.ok) {
        expect(r.readingCents).toBe(cents);
        expect(r.tier).toBe(tier);
      }
    }
  });

  // ⛔ THE ONE THAT MATTERS. A browser posting its own number must not be able to
  //    move the price of a rung by a single cent.
  it('IGNORES amountCents entirely — a rung is priced by name, never by the request', () => {
    const r = priced({ tier: 'table', amountCents: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.readingCents).toBe(8700);
  });

  it('refuses a request with no rung rather than defaulting to the cheapest', () => {
    for (const tier of [undefined, null, '']) {
      const r = priced({ tier });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('tier_missing');
    }
  });

  it('refuses a rung that is not in the catalog', () => {
    for (const tier of ['premium', 'SPREAD', 'spread ', 7, {}]) {
      const r = priced({ tier });
      expect(r.ok, `${JSON.stringify(tier)} must not price`).toBe(false);
      if (!r.ok) expect(r.code).toBe('tier_unknown');
    }
  });

  it('puts the rung on the receipt, so $35 and $87 do not read as the same product', () => {
    const a = priced({ tier: 'spread' });
    const b = priced({ tier: 'table' });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.lines[0].name).not.toBe(b.lines[0].name);
      expect(a.lines[0].name).toContain('The Spread');
      expect(b.lines[0].name).toContain('The Third Question');
    }
  });

  it('adds the bump at the catalog price, on top of any rung', () => {
    const r = priced({ tier: 'pattern', bump: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bumpCents).toBe(1277);
      expect(r.totalCents).toBe(5700 + 1277);
      // ⛔ n8n exact-matches this string to decide what to fulfil.
      expect(BACKEND_OFFER_CATALOG['marcus-daily'].bump.productKey).toBe('marcus_same_day');
    }
  });

  it('⛔ is NOT open for money — three things are unbuilt, see the catalog note', () => {
    expect(BACKEND_OFFER_CATALOG['marcus-daily'].readyForMoney).toBe(false);
    const r = resolveBackendCharge({ offer: 'marcus-daily', tier: 'spread' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('not_ready');
  });

  it('keeps the be_ prefix, so no V1 webhook branch can claim it', () => {
    expect(BACKEND_OFFER_CATALOG['marcus-daily'].stripeProduct).toBe('be_marcus_daily');
    expect(BACKEND_OFFER_CATALOG['marcus-daily'].stripeProduct.startsWith('be_')).toBe(true);
  });

  it('rungs rise, and each step buys exactly one more of her questions', () => {
    const { tiers } = BACKEND_OFFER_CATALOG['marcus-daily'].pricing as {
      tiers: Record<'spread' | 'pattern' | 'table', { questions: number; priceCents: number }>;
    };
    expect(tiers.spread.questions).toBe(1);
    expect(tiers.pattern.questions).toBe(2);
    expect(tiers.table.questions).toBe(3);
    expect(tiers.pattern.priceCents).toBeGreaterThan(tiers.spread.priceCents);
    expect(tiers.table.priceCents).toBeGreaterThan(tiers.pattern.priceCents);
  });
});

// ─── 08 · Marcus Stone's personal reading — the FIXED model, gated shut ────────
//
// Same shape as 02: one price, one bump, the browser's number ignored. Priced through
// priceBackendOffer (past the gate) so the arithmetic is provable now; the gate itself
// is pinned shut in its own case. ⛔ 08 shares a persona with 07 and NOTHING else —
// the collision cases are the ones that matter.
describe('a fixed-price offer (08 · Marcus Stone personal reading)', () => {
  const READING = BACKEND_OFFER_CATALOG['marcus-reading'];
  const priceReading = (req: { amountCents?: number | null; bump?: boolean }) =>
    priceBackendOffer(READING, req);

  it('charges $35.00 without the bump', () => {
    const r = charged(priceReading({}));
    expect(r.readingCents).toBe(MARCUS_READING_PRICE_CENTS);
    expect(r.readingCents).toBe(3500);
    expect(r.bumpCents).toBe(0);
    expect(r.totalCents).toBe(3500);
    expect(r.bumpPurchased).toBe(false);
    expect(r.lines).toHaveLength(1);
  });

  it('charges $47.77 with the 12-hour bump, at the catalog price', () => {
    const r = charged(priceReading({ bump: true }));
    expect(r.readingCents).toBe(3500);
    expect(r.bumpCents).toBe(MARCUS_READING_BUMP_CENTS);
    expect(r.bumpCents).toBe(1277);
    expect(r.totalCents).toBe(4777);
    expect(r.bumpPurchased).toBe(true);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[1].name).toBe('+ 12-hour delivery');
  });

  it('IGNORES an amount posted by the browser', () => {
    expect(charged(priceReading({ amountCents: 1 })).totalCents).toBe(3500);
    expect(charged(priceReading({ amountCents: 1, bump: true })).totalCents).toBe(4777);
  });

  it('treats anything other than an explicit true as "no bump"', () => {
    expect(charged(priceReading({ bump: undefined })).bumpPurchased).toBe(false);
    expect(charged(priceReading({ bump: false })).bumpPurchased).toBe(false);
  });

  it('⛔ is NOT open for money — resolveBackendCharge answers not_ready', () => {
    expect(READING.readyForMoney).toBe(false);
    for (const req of [
      { offer: 'marcus-reading' as const },
      { offer: 'marcus-reading' as const, bump: true },
      { offer: 'marcus-reading' as const, amountCents: 3500 },
    ]) {
      const r = resolveBackendCharge(req);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('not_ready');
    }
  });

  it('is its own product — never 07\'s — on every string n8n or the webhook matches', () => {
    const DAILY = BACKEND_OFFER_CATALOG['marcus-daily'];
    expect(READING.number).toBe('08');
    expect(READING.stripeProduct).toBe('be_marcus_reading');
    expect(READING.stripeProduct.startsWith(BACKEND_STRIPE_PRODUCT_PREFIX)).toBe(true);
    expect(READING.stripeProduct).not.toBe(DAILY.stripeProduct);
    expect(READING.bump.productKey).toBe('marcus_speed');
    expect(READING.bump.productKey).not.toBe(DAILY.bump.productKey);
    expect(backendOfferForStripeProduct('be_marcus_reading')?.key).toBe('marcus-reading');
    expect(backendOfferForStripeProduct('be_marcus_daily')?.key).toBe('marcus-daily');
  });

  it('asks Stripe for NO custom fields — the three personal fields live on the booking page (D5 amended 2026-09-14)', () => {
    expect(READING.checkoutCustomFields ?? []).toHaveLength(0);
  });

  it('is a digital reading with its own post-purchase path, not the shared upsell chain', () => {
    expect(READING.collectsShipping).toBe(false);
    expect(READING.successPath).toBe('/marcus/reading/success');
    expect(READING.upsellEntryPath).toBe('/marcus/reading/bridge');
    expect(READING.bookingPath).toEqual({ page: '/marcus/reading', chat: '/marcus/reading' });
  });

  it('labels the Stripe Dashboard row BE 08', () => {
    expect(backendOrderDescriptor('marcus-reading', false)).toBe(
      'BE 08 · Marcus Stone — your personal tarot reading',
    );
    expect(backendOrderDescriptor('marcus-reading', true)).toBe(
      'BE 08 · Marcus Stone — your personal tarot reading + 12-hour delivery',
    );
  });
});

// ─── 09 · the Heart Cleanser Love Charm — FIXED, PHYSICAL, bump = Reiki charging ─
//
// Its bump (09-C3, Joel 2026-09-15) is a REAL service done by hand before packing. Three
// things matter most:
//  1. `bump: true` adds it as a second line at the catalog's 1111 cents, under its OWN key.
//  2. `bump: true` for an offer with no bump is still REFUSED — never silently charged,
//     never silently dropped. A buyer who ticked a box that does not exist is a wiring bug.
//  3. Every offer that existed before 09 prices, labels and bumps exactly as it did.
import {
  HEART_CLEANSER_PRICE_CENTS,
  HEART_CLEANSER_BUMP_CENTS,
  HEART_CLEANSER_BUMP_PRODUCT_KEY,
  MARCUS_DAILY_BUMP_CENTS,
  JUDGEMENT_BUMP_PRODUCT_KEY,
  TWIN_FLAME_BUMP_PRODUCT_KEY,
  PIXIU_BRACELET_BUMP_PRODUCT_KEY,
  MARCUS_DAILY_BUMP_PRODUCT_KEY,
  MARCUS_READING_BUMP_PRODUCT_KEY,
} from '@shared/backendOffers';
import { STRIPE_CHECKOUT_SHIPPING_COUNTRIES } from '@shared/shippingCountries';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('a fixed-price PHYSICAL offer whose bump is done by hand (09 · Heart Cleanser Love Charm)', () => {
  const CHARM = BACKEND_OFFER_CATALOG['heart-cleanser'];
  const priceCharm = (req: Parameters<typeof priceBackendOffer>[1]) => priceBackendOffer(CHARM, req);

  it('is catalogued with the settled product facts', () => {
    expect(CHARM.key).toBe('heart-cleanser');
    expect(CHARM.number).toBe('09');
    expect(CHARM.stripeProduct).toBe('be_heart_cleanser');
    expect(CHARM.stripeName).toBe('Heart Cleanser Love Charm');
    expect(CHARM.pricing).toEqual({ model: 'fixed', priceCents: 5900 });
    expect(HEART_CLEANSER_PRICE_CENTS).toBe(5900);
    expect(CHARM.collectsShipping).toBe(true);
    expect(CHARM.bookingPath).toEqual({ page: '/offers/heart-cleanser', chat: '/offers/heart-cleanser' });
    expect(CHARM.successPath).toBe('/offers/heart-cleanser/success');
    expect(CHARM.upsellEntryPath).toBe('/offers/upsell/welcome1');
    expect(backendOfferForStripeProduct('be_heart_cleanser')?.key).toBe('heart-cleanser');
    expect(isBackendOfferKey('heart-cleanser')).toBe(true);
  });

  it('charges $59.00, quantity one line, and ignores a browser-posted amount', () => {
    const r = charged(priceCharm({}));
    expect(r.readingCents).toBe(5900);
    expect(r.bumpCents).toBe(0);
    expect(r.totalCents).toBe(5900);
    expect(r.bumpPurchased).toBe(false);
    expect(r.lines).toEqual([
      { name: 'Heart Cleanser Love Charm', description: CHARM.stripeDescription, amountCents: 5900 },
    ]);
    expect(charged(priceCharm({ amountCents: 1 })).totalCents).toBe(5900);
    expect(charged(priceCharm({ bump: false })).totalCents).toBe(5900);
  });

  it('has its own bump: Reiki charging before packing, $11.11, key reiki_charge, flagged for the packer', () => {
    expect(CHARM.bump).toEqual({
      productKey: 'reiki_charge',
      cents: 1111,
      stripeName: '+ Reiki charging by Evelyn before packing',
      packingAlert: 'REIKI CHARGE BEFORE PACKING',
    });
    expect(HEART_CLEANSER_BUMP_CENTS).toBe(1111);
    expect(HEART_CLEANSER_BUMP_PRODUCT_KEY).toBe('reiki_charge');
    // ⛔ Never another offer's key — 06's closed_purse is a text instructional, not a service.
    expect(HEART_CLEANSER_BUMP_PRODUCT_KEY).not.toBe(PIXIU_BRACELET_BUMP_PRODUCT_KEY);
  });

  it('bump: true adds Reiki charging as a second line — $70.11 in all, amount from the catalog', () => {
    const r = charged(priceCharm({ bump: true, amountCents: 1 }));
    expect(r.readingCents).toBe(5900);
    expect(r.bumpCents).toBe(1111);
    expect(r.totalCents).toBe(7011);
    expect(r.bumpPurchased).toBe(true);
    expect(r.lines).toEqual([
      { name: 'Heart Cleanser Love Charm', description: CHARM.stripeDescription, amountCents: 5900 },
      { name: '+ Reiki charging by Evelyn before packing', amountCents: 1111 },
    ]);
  });

  it('the bump ships unticked: anything but an explicit true is no bump', () => {
    for (const bump of [undefined, false]) {
      const r = charged(priceCharm({ bump }));
      expect(r.bumpPurchased).toBe(false);
      expect(r.totalCents).toBe(5900);
    }
  });

  it('still REFUSES bump: true on an offer that has no bump — never charged, never ignored', () => {
    const noBump = { ...CHARM, bump: undefined };
    const r = priceBackendOffer(noBump, { bump: true });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('bump_unavailable');
      expect(r.message).toBeTruthy();
    }
    expect(charged(priceBackendOffer(noBump, { bump: false })).totalCents).toBe(5900);
  });

  it('only a bump someone performs before packing carries a packing alert (not 06\'s instructional)', () => {
    const withAlert = Object.values(BACKEND_OFFER_CATALOG).filter((o) => o.bump?.packingAlert).map((o) => o.key);
    expect(withAlert).toEqual(['heart-cleanser']);
  });

  it('ships to every country Stripe Checkout accepts', () => {
    expect(CHARM.shippingCountries).toEqual(STRIPE_CHECKOUT_SHIPPING_COUNTRIES);
  });

  it('⛔ is NOT open for money in committed code', () => {
    expect(CHARM.readyForMoney).toBe(false);
    const r = resolveBackendCharge({ offer: 'heart-cleanser' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('not_ready');
  });

  it('labels the Stripe Dashboard row BE 09, naming the bump only when she took it', () => {
    expect(backendOrderDescriptor('heart-cleanser', false)).toBe('BE 09 · Heart Cleanser Love Charm');
    expect(backendOrderDescriptor('heart-cleanser', true)).toBe(
      'BE 09 · Heart Cleanser Love Charm + Reiki charging by Evelyn before packing',
    );
  });
});

describe('the worldwide shipping list is derived from the installed Stripe SDK', () => {
  it('matches Checkout shipping_address_collection.allowed_countries exactly', () => {
    const dts = readFileSync(
      path.resolve(__dirname, '../../node_modules/stripe/types/Checkout/SessionsResource.d.ts'),
      'utf8',
    );
    const block = dts.match(/namespace ShippingAddressCollection \{\s*type AllowedCountry =([^;]+);/);
    expect(block, 'AllowedCountry union not found in the Stripe types').toBeTruthy();
    const fromSdk = [...block![1].matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]).sort();
    expect(fromSdk.length).toBeGreaterThan(200);
    expect([...STRIPE_CHECKOUT_SHIPPING_COUNTRIES].sort()).toEqual(fromSdk);
  });

  it('leaves 06 on the original seven-country list (no per-offer override)', () => {
    expect(BACKEND_OFFER_CATALOG['pixiu-bracelet'].shippingCountries).toBeUndefined();
  });
});

describe('regression: every offer that existed before 09 is unchanged', () => {
  it('keeps each bump byte-identical', () => {
    expect(BACKEND_OFFER_CATALOG['twin-flame'].bump).toEqual({
      productKey: TWIN_FLAME_BUMP_PRODUCT_KEY, cents: 1277, stripeName: '+ Astro Force instructional',
    });
    expect(BACKEND_OFFER_CATALOG['judgement-day'].bump).toEqual({
      productKey: JUDGEMENT_BUMP_PRODUCT_KEY, cents: 1277, stripeName: '+ The Unburdening instructional',
    });
    expect(BACKEND_OFFER_CATALOG['pixiu-bracelet'].bump).toEqual({
      productKey: PIXIU_BRACELET_BUMP_PRODUCT_KEY, cents: 1111, stripeName: '+ The Closed Purse instructional',
    });
    expect(BACKEND_OFFER_CATALOG['marcus-daily'].bump).toEqual({
      productKey: MARCUS_DAILY_BUMP_PRODUCT_KEY, cents: MARCUS_DAILY_BUMP_CENTS, stripeName: '+ Read first, same morning',
    });
    expect(BACKEND_OFFER_CATALOG['marcus-reading'].bump).toEqual({
      productKey: MARCUS_READING_BUMP_PRODUCT_KEY, cents: 1277, stripeName: '+ 12-hour delivery',
    });
  });

  it('still prices bump: true on every bumped offer as a second line at the catalog price', () => {
    const cases = [
      ['twin-flame', {}, 3500, 1277],
      ['judgement-day', { amountCents: 2000 }, 2000, 1277],
      ['pixiu-bracelet', {}, 4900, 1111],
      ['marcus-daily', { tier: 'spread' }, 3500, 1277],
      ['marcus-reading', {}, 3500, 1277],
    ] as const;
    for (const [key, extra, reading, bump] of cases) {
      const r = charged(priceBackendOffer(BACKEND_OFFER_CATALOG[key], { ...extra, bump: true }));
      expect(r.readingCents, key).toBe(reading);
      expect(r.bumpCents, key).toBe(bump);
      expect(r.totalCents, key).toBe(reading + bump);
      expect(r.lines, key).toHaveLength(2);
      expect(r.lines[1], key).toEqual({ name: BACKEND_OFFER_CATALOG[key].bump!.stripeName, amountCents: bump });
    }
  });

  it('keeps the Stripe Dashboard labels, with and without the bump', () => {
    expect(backendOrderDescriptor('judgement-day', true)).toBe('BE 03 · Judgement Day + The Unburdening instructional');
    // 06's label was deliberately made descriptive on development (9a3e515) so fulfilment
    // ships the right bracelet — pinned to the NEW wording, not reverted.
    expect(backendOrderDescriptor('pixiu-bracelet', false)).toBe('BE 06 · Wishing Bracelet Black Agate Pixiu Wealth');
    expect(backendOrderDescriptor('pixiu-bracelet', true)).toBe('BE 06 · Wishing Bracelet Black Agate Pixiu Wealth + The Closed Purse instructional');
    expect(backendOrderDescriptor('marcus-daily', true)).toBe('BE 07 · Marcus Daily Tarot + Read first, same morning');
  });

  it('keeps 06 physical, on its own booking page, with no shipping-country override', () => {
    const WISHING = BACKEND_OFFER_CATALOG['pixiu-bracelet'];
    expect(WISHING.collectsShipping).toBe(true);
    expect(WISHING.stripeProduct).toBe('be_pixiu_bracelet');
    expect(WISHING.successPath).toBe('/offers/wiccan/pixiu-bracelet/success');
    expect(WISHING.upsellEntryPath).toBe('/offers/upsell/welcome1');
  });
});
