import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPurchaseEvent, TRACKED_PRODUCTS } from './purchaseAnalytics';
import { gadsStepForProduct } from './googleAds';
import { BRACELET_PRODUCTS } from '@shared/braceletProducts';

// LOCK-IN TEST — "a bracelet buyer is never upsold, dripped, or counted as a funnel sale."
//
// Lewis, 2026-07-14: "we dont want to offer them any upsell once they purchase any of those
// 3 products from that new lander."
//
// Today that is true because EVERY side effect in the Stripe checkout.session.completed
// handler is name-gated and skips an unrecognised `metadata.product`. That is a property of
// three lookup tables, and anybody could quietly break it by adding a bracelet_* key to one
// of them — at which point storefront sales would start firing funnel conversions, or the
// buyer would land in a post-purchase upsell drip.
//
// These assertions are the tripwire. If one fails, DO NOT "fix" the test — the isolation
// has been broken and the bracelet buyer is about to be treated as a funnel buyer.

const BRACELET_STRIPE_PRODUCTS = BRACELET_PRODUCTS.map((p) => p.stripeProduct);

test('bracelet products are isolated from every funnel side effect', async (t) => {
  await t.test('the catalog actually uses bracelet_* names', () => {
    assert.ok(BRACELET_STRIPE_PRODUCTS.length >= 3, 'expected at least 3 products');
    for (const name of BRACELET_STRIPE_PRODUCTS) {
      assert.ok(
        name.startsWith('bracelet_'),
        `${name} must start with "bracelet_" — the webhook gate keys on that prefix`,
      );
    }
  });

  await t.test('NOT in TRACKED_PRODUCTS => no PostHog purchase_completed, no funnel revenue', () => {
    for (const name of BRACELET_STRIPE_PRODUCTS) {
      assert.equal(
        TRACKED_PRODUCTS[name],
        undefined,
        `${name} is in TRACKED_PRODUCTS — storefront sales would be counted as funnel purchases`,
      );
      assert.equal(
        buildPurchaseEvent({
          product: name,
          metadata: {},
          amountCents: 9900,
          stripeSessionId: 'cs_test_x',
          email: 'buyer@example.com',
        }),
        null,
        `buildPurchaseEvent fired for ${name} — PostHog would mix storefront and funnel revenue`,
      );
    }
  });

  await t.test('no Google Ads conversion step => no ad conversion is reported', () => {
    for (const name of BRACELET_STRIPE_PRODUCTS) {
      assert.equal(
        gadsStepForProduct(name),
        null,
        `${name} maps to a Google Ads step — a bracelet sale would be reported as an ad conversion`,
      );
    }
  });

  await t.test('the funnel products themselves still work (this test must not over-reach)', () => {
    // Guard against a "fix" that empties TRACKED_PRODUCTS to make the above pass.
    assert.ok(TRACKED_PRODUCTS['energy_clearing_ritual'], 'the V1 front-end product must still be tracked');
    assert.ok(TRACKED_PRODUCTS['soulmate_sketch'], 'soulmate must still be tracked');
    assert.equal(gadsStepForProduct('energy_clearing_ritual') !== null, true, 'V1 GAds step must still resolve');
  });
});
