// Unit tests for the PostHog purchase_completed event built from a completed Stripe
// checkout session.
//
//   npm run test:purchase-analytics
//
// This ONE event serves six products across three funnel families (V1 front-end, V1
// upsell fallback checkouts, soulmate). Adding price_variant/purchase_type for the
// sliding close must not perturb any of them — so the "REGRESSION" block below pins
// the pre-change properties for every product byte-for-byte, and the new keys are
// asserted separately.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildPurchaseEvent, TRACKED_PRODUCTS } from './purchaseAnalytics';

// The exact property set emitted BEFORE this change. Any product whose event loses,
// renames, or alters one of these has broken an existing PostHog insight.
const LEGACY_KEYS = [
  'funnel',
  'step',
  'product',
  'payment_method',
  'amount_cents',
  'stripe_session_id',
  'email',
  'email_gate',
] as const;

const NEW_KEYS = ['price_variant', 'purchase_type'] as const;

const legacyOf = (props: Record<string, unknown>) =>
  Object.fromEntries(LEGACY_KEYS.map((k) => [k, props[k]]));

describe('REGRESSION — existing funnels emit exactly what they emitted before', () => {
  it('soulmate_sketch: unchanged, and the new keys are null (it has no price test)', () => {
    const ev = buildPurchaseEvent({
      product: 'soulmate_sketch',
      metadata: { email: 'a@b.com', posthogDistinctId: 'ph_123' },
      amountCents: 1700,
      stripeSessionId: 'cs_soul_1',
      email: 'a@b.com',
    })!;

    assert.equal(ev.distinctId, 'ph_123');
    assert.equal(ev.event, 'purchase_completed');
    assert.deepEqual(legacyOf(ev.properties), {
      funnel: 'soulmate',
      step: 'sales',
      product: 'soulmate_sketch',
      payment_method: 'stripe_checkout',
      amount_cents: 1700,
      stripe_session_id: 'cs_soul_1',
      email: 'a@b.com',
      email_gate: 'on',
    });
    assert.equal(ev.properties.price_variant, null);
    assert.equal(ev.properties.purchase_type, null);
  });

  it('soulmate_bracelet / soulmate_love_tuner keep funnel=soulmate + their upsell steps', () => {
    const b = buildPurchaseEvent({
      product: 'soulmate_bracelet', metadata: {}, amountCents: 4700,
      stripeSessionId: 'cs_b', email: 'x@y.com',
    })!;
    assert.equal(b.properties.funnel, 'soulmate');
    assert.equal(b.properties.step, 'upsell1');

    const t = buildPurchaseEvent({
      product: 'soulmate_love_tuner', metadata: {}, amountCents: 7900,
      stripeSessionId: 'cs_t', email: 'x@y.com',
    })!;
    assert.equal(t.properties.funnel, 'soulmate');
    assert.equal(t.properties.step, 'upsell2');
  });

  it('V1 upsell FALLBACK checkouts (protection_ritual / manifestation_bracelet) are unchanged', () => {
    const u1 = buildPurchaseEvent({
      product: 'protection_ritual',
      metadata: { funnel: 'v1-palm' },
      amountCents: 4700,
      stripeSessionId: 'cs_u1',
      email: 'x@y.com',
    })!;
    assert.deepEqual(legacyOf(u1.properties), {
      funnel: 'palm',
      step: 'upsell1',
      product: 'protection_ritual',
      payment_method: 'stripe_checkout',
      amount_cents: 4700,
      stripe_session_id: 'cs_u1',
      email: 'x@y.com',
      email_gate: 'on',
    });

    const u2 = buildPurchaseEvent({
      product: 'manifestation_bracelet', metadata: {}, amountCents: 4700,
      stripeSessionId: 'cs_u2', email: 'x@y.com',
    })!;
    assert.equal(u2.properties.step, 'upsell2');
    assert.equal(u2.properties.funnel, 'v1'); // no metadata.funnel → 'v1'
  });

  it('funnel derivation is untouched for every V1 lander', () => {
    const cases: Array<[string | undefined, string]> = [
      ['v1-fb', 'fb'],
      ['v1-fb2', 'fb2'],
      ['v1-gdn', 'gdn'],
      ['v1-palm', 'palm'],
      [undefined, 'v1'],
      ['nonsense', 'v1'],
    ];
    for (const [meta, expected] of cases) {
      const ev = buildPurchaseEvent({
        product: 'energy_clearing_ritual',
        metadata: meta ? { funnel: meta } : {},
        amountCents: 3500, stripeSessionId: 'cs', email: 'e@e.com',
      })!;
      assert.equal(ev.properties.funnel, expected, `funnel=${meta}`);
    }
  });

  it('email_gate (no-optin arm) still derives from metadata.noemail', () => {
    const off = buildPurchaseEvent({
      product: 'energy_clearing_ritual', metadata: { noemail: '1' },
      amountCents: 3500, stripeSessionId: 'cs', email: 'e@e.com',
    })!;
    assert.equal(off.properties.email_gate, 'off');
  });

  it('distinctId still prefers posthogDistinctId, falling back to email', () => {
    const withPh = buildPurchaseEvent({
      product: 'energy_clearing_ritual', metadata: { posthogDistinctId: 'ph_9' },
      amountCents: 3500, stripeSessionId: 'cs', email: 'e@e.com',
    })!;
    assert.equal(withPh.distinctId, 'ph_9');

    const withoutPh = buildPurchaseEvent({
      product: 'energy_clearing_ritual', metadata: {},
      amountCents: 3500, stripeSessionId: 'cs', email: 'e@e.com',
    })!;
    assert.equal(withoutPh.distinctId, 'e@e.com');
  });

  it('untracked / missing products still emit NOTHING', () => {
    assert.equal(buildPurchaseEvent({ product: undefined, metadata: {}, amountCents: 1, stripeSessionId: 's', email: 'e' }), null);
    assert.equal(buildPurchaseEvent({ product: 'credits_pack', metadata: {}, amountCents: 1, stripeSessionId: 's', email: 'e' }), null);
    assert.equal(Object.keys(TRACKED_PRODUCTS).length, 6, 'a product was added/removed from TRACKED_PRODUCTS');
  });

  it('every tracked product emits ALL legacy keys plus exactly the two new ones — no key was dropped', () => {
    for (const product of Object.keys(TRACKED_PRODUCTS)) {
      const ev = buildPurchaseEvent({
        product, metadata: {}, amountCents: 100, stripeSessionId: 'cs', email: 'e@e.com',
      })!;
      const keys = Object.keys(ev.properties).sort();
      assert.deepEqual(keys, [...LEGACY_KEYS, ...NEW_KEYS].sort(), `property set changed for ${product}`);
    }
  });
});

describe('THE FIX — the sliding close is no longer invisible in PostHog', () => {
  const palmBuy = (priceVariant: string, type: 'main' | 'downsell', amountCents: number) =>
    buildPurchaseEvent({
      product: 'energy_clearing_ritual',
      metadata: { funnel: 'v1-palm', priceVariant, type },
      amountCents,
      stripeSessionId: `cs_${priceVariant}_${type}`,
      email: 'buyer@example.com',
    })!.properties;

  it('the $3500 COLLISION is resolved — control main vs sliding grace are now distinguishable', () => {
    const controlMain = palmBuy('35_palm_u47', 'main', 3500);
    const slidingGrace = palmBuy('55-35_palm', 'downsell', 3500);

    // Identical on every property that existed before this change…
    assert.equal(controlMain.amount_cents, slidingGrace.amount_cents);
    assert.equal(controlMain.funnel, slidingGrace.funnel);
    assert.equal(controlMain.step, slidingGrace.step);
    assert.equal(controlMain.product, slidingGrace.product);

    // …and separable now.
    assert.notDeepEqual(
      [controlMain.price_variant, controlMain.purchase_type],
      [slidingGrace.price_variant, slidingGrace.purchase_type],
    );
    assert.deepEqual([controlMain.price_variant, controlMain.purchase_type], ['35_palm_u47', 'main']);
    assert.deepEqual([slidingGrace.price_variant, slidingGrace.purchase_type], ['55-35_palm', 'downsell']);
  });

  it('all four palm purchase shapes are uniquely identifiable', () => {
    const shapes = [
      palmBuy('35_palm_u47', 'main', 3500),      // control, full
      palmBuy('35_palm_u47', 'downsell', 2500),  // control, legacy $25 downsell
      palmBuy('55-35_palm', 'main', 5500),       // sliding, $55 full offering
      palmBuy('55-35_palm', 'downsell', 3500),   // sliding, $35 grace
    ].map((p) => `${p.price_variant}|${p.purchase_type}|${p.amount_cents}`);

    assert.equal(new Set(shapes).size, 4, `not all four arms are distinguishable: ${shapes.join(' , ')}`);
  });

  it('amount_cents is the amount ACTUALLY charged — grace reports $35, not the $55 anchor', () => {
    assert.equal(palmBuy('55-35_palm', 'downsell', 3500).amount_cents, 3500);
    assert.equal(palmBuy('55-35_palm', 'main', 5500).amount_cents, 5500);
  });
});
