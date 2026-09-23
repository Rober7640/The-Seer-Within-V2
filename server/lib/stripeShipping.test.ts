// The shipping-address reader shared by the storefront (braceletOrders.ts) and the
// backend deck's shipments (beShipments.ts).
//
//   npx vitest run server/lib/stripeShipping.test.ts
//
// What these pin down:
//  1. BOTH STRIPE SHAPES. Stripe moved the address from `shipping_details` to
//     `collected_information.shipping_details` across API versions; either must read.
//  2. THE BILLING FALLBACK IS OPT-OUT, NOT GONE. The storefront has always fallen back to
//     `customer_details` and keeps doing so. A backend shipment turns it off, because a
//     billing address (often just a country + postcode) is not somewhere to post a parcel.

import { describe, expect, it } from 'vitest';
import { shippingFromSession, shippingParamFromSession } from './stripeShipping';

const ADDRESS = {
  line1: '1 Rose Lane',
  line2: 'Flat 2',
  city: 'Bath',
  state: 'Somerset',
  postal_code: 'BA1 1AA',
  country: 'GB',
};

const asSession = (raw: Record<string, unknown>) => raw as never;

describe('shippingFromSession', () => {
  it('reads collected_information.shipping_details (the current API shape)', () => {
    const r = shippingFromSession(
      asSession({ collected_information: { shipping_details: { name: 'Sarah Rose', address: ADDRESS } } }),
    );
    expect(r.source).toBe('collected_information');
    expect(r.address).toEqual({
      name: 'Sarah Rose',
      line1: '1 Rose Lane',
      line2: 'Flat 2',
      city: 'Bath',
      state: 'Somerset',
      postal: 'BA1 1AA',
      country: 'GB',
    });
  });

  it('prefers the legacy top-level shipping_details when it is present', () => {
    const r = shippingFromSession(
      asSession({
        shipping_details: { name: 'Legacy', address: ADDRESS },
        collected_information: { shipping_details: { name: 'New', address: ADDRESS } },
      }),
    );
    expect(r.source).toBe('shipping_details');
    expect(r.address.name).toBe('Legacy');
  });

  it('falls back to the billing address by default — the storefront behaviour', () => {
    const r = shippingFromSession(
      asSession({ customer_details: { name: 'Card Name', address: { country: 'US', postal_code: '10001' } } }),
    );
    expect(r.source).toBe('customer_details');
    expect(r.address).toMatchObject({ name: 'Card Name', country: 'US', postal: '10001', line1: null });
  });

  it('does NOT fall back to billing when told not to', () => {
    const r = shippingFromSession(
      asSession({ customer_details: { name: 'Card Name', address: { ...ADDRESS } } }),
      { billingFallback: false },
    );
    expect(r.source).toBeNull();
    expect(r.address).toEqual({
      name: null, line1: null, line2: null, city: null, state: null, postal: null, country: null,
    });
  });

  it('returns all nulls when the session carries no address at all', () => {
    const r = shippingFromSession(asSession({}));
    expect(r.source).toBeNull();
    expect(r.address.line1).toBeNull();
  });
});

// The same address, shaped as the `shipping` PARAM a PaymentIntent takes — so a backend
// upsell charge can carry the address she gave at checkout without asking for it again
// (operator decision, Joel 2026-09-16: "skip"). ⛔ Never the billing address.
describe('shippingParamFromSession', () => {
  it('builds the PaymentIntent shipping param from the collected address', () => {
    expect(
      shippingParamFromSession(
        asSession({ collected_information: { shipping_details: { name: 'Sarah Rose', address: ADDRESS } } }),
      ),
    ).toEqual({
      name: 'Sarah Rose',
      address: {
        line1: '1 Rose Lane',
        line2: 'Flat 2',
        city: 'Bath',
        state: 'Somerset',
        postal_code: 'BA1 1AA',
        country: 'GB',
      },
    });
  });

  it('omits the optional parts she left blank', () => {
    const param = shippingParamFromSession(
      asSession({
        collected_information: {
          shipping_details: { name: 'Sarah Rose', address: { line1: '1 Rose Lane', country: 'GB' } },
        },
      }),
    );
    expect(param).toEqual({ name: 'Sarah Rose', address: { line1: '1 Rose Lane', country: 'GB' } });
    expect(param?.address).not.toHaveProperty('line2');
  });

  it('falls back to the name on the card when the address carries none', () => {
    const param = shippingParamFromSession(
      asSession({
        customer_details: { name: 'Sarah On Card' },
        collected_information: { shipping_details: { address: { line1: '1 Rose Lane', country: 'GB' } } },
      }),
    );
    expect(param?.name).toBe('Sarah On Card');
  });

  it('upper-cases the country and drops one that is not ISO alpha-2', () => {
    expect(
      shippingParamFromSession(
        asSession({ shipping_details: { name: 'S', address: { line1: '1 Rose Lane', country: 'gb' } } }),
      )?.address.country,
    ).toBe('GB');
    // A full country name would make Stripe reject the whole charge — refuse instead.
    expect(
      shippingParamFromSession(
        asSession({ shipping_details: { name: 'S', address: { line1: '1 Rose Lane', country: 'United Kingdom' } } }),
      ),
    ).toBeNull();
  });

  it('is null without a street line — nothing to post a parcel to', () => {
    expect(
      shippingParamFromSession(asSession({ shipping_details: { name: 'S', address: { country: 'GB' } } })),
    ).toBeNull();
    expect(shippingParamFromSession(asSession({}))).toBeNull();
  });

  it('⛔ never reads the BILLING address', () => {
    expect(
      shippingParamFromSession(asSession({ customer_details: { name: 'Card Name', address: ADDRESS } })),
    ).toBeNull();
  });
});
