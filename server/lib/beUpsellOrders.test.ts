import { describe, expect, it, vi } from 'vitest';

// The DB is the only thing the read helper touches; mock it so the mapping/guard logic
// is testable without a database (same spirit as the pure-function tests below).
const select = vi.fn();
vi.mock('./db', () => ({ db: { select: (...a: unknown[]) => select(...a) } }));
vi.mock('./logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const { upsellOrderValuesFromPI, paidUpsellAmountCents } = await import('./beUpsellOrders');

/** A drizzle-style chainable that resolves `.limit()` to `rows`. */
function chain(rows: unknown[]) {
  const q = { from: () => q, where: () => q, limit: async () => rows } as Record<string, unknown>;
  return q;
}

const basePI = {
  id: 'pi_123',
  amount: 4700,
  amount_received: 4700,
  currency: 'usd',
};

describe('upsellOrderValuesFromPI', () => {
  it('maps a judgement-day Protection Ritual PI to insert values', () => {
    const v = upsellOrderValuesFromPI({
      ...basePI,
      metadata: {
        product: 'be_protection_ritual',
        offer: 'judgement-day',
        originalSession: 'cs_booking_1',
        flow: '1click',
        email: 'her@example.com',
        firstName: 'Sarah',
      },
    });
    expect(v).toEqual({
      stripePaymentIntentId: 'pi_123',
      bookingSessionId: 'cs_booking_1',
      offer: 'judgement-day',
      offerNumber: '03',
      product: 'be_protection_ritual',
      tier: 'full',
      amountCents: 4700,
      currency: 'usd',
      email: 'her@example.com',
      firstName: 'Sarah',
      // A digital booking's upsell carries no address of its own.
      recipientName: null,
      line1: null,
      line2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
    });
  });

  it('reads tier=downsell from metadata.type and offerNumber 02 for twin-flame', () => {
    const v = upsellOrderValuesFromPI({
      ...basePI,
      amount: 3000,
      amount_received: 3000,
      metadata: {
        product: 'be_bracelet',
        offer: 'twin-flame',
        originalSession: 'cs_booking_2',
        type: 'downsell',
      },
    });
    expect(v?.offerNumber).toBe('02');
    expect(v?.tier).toBe('downsell');
    expect(v?.amountCents).toBe(3000);
    expect(v?.email).toBeNull();
  });

  it('returns null when the product is not a BE upsell', () => {
    expect(upsellOrderValuesFromPI({ ...basePI, metadata: { product: 'be_twin_flame', offer: 'twin-flame' } })).toBeNull();
    expect(upsellOrderValuesFromPI({ ...basePI, metadata: {} })).toBeNull();
  });

  it('returns null when the offer does not resolve (never misattribute)', () => {
    expect(upsellOrderValuesFromPI({ ...basePI, metadata: { product: 'be_protection_ritual', offer: 'bogus' } })).toBeNull();
  });
});

// The upsells no longer ask a 09/06 buyer for an address — she gave one at checkout and
// it is copied onto the upsell PaymentIntent (operator, Joel 2026-09-16: "skip"). So the
// ORDER RECORD has to keep it too: the row is what says where this parcel goes.
describe('upsellOrderValuesFromPI — the shipping address on the record', () => {
  const shipped = (shipping: unknown) =>
    upsellOrderValuesFromPI({
      ...basePI,
      shipping,
      metadata: {
        product: 'be_bracelet',
        offer: 'heart-cleanser',
        originalSession: 'cs_booking_09',
        email: 'her@example.com',
      },
    } as Parameters<typeof upsellOrderValuesFromPI>[0]);

  it('records the address the charge carried, so nothing is lost by skipping the form', () => {
    const v = shipped({
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
    expect(v).toMatchObject({
      offer: 'heart-cleanser',
      offerNumber: '09',
      recipientName: 'Sarah Rose',
      line1: '1 Rose Lane',
      line2: 'Flat 2',
      city: 'Bath',
      state: 'Somerset',
      postalCode: 'BA1 1AA',
      country: 'GB',
    });
  });

  it('leaves the address columns null when the charge carried none', () => {
    expect(shipped(undefined)).toMatchObject({ recipientName: null, line1: null, country: null });
    expect(shipped(null)).toMatchObject({ line1: null });
  });

  it('records the parts that are there and nulls the rest', () => {
    expect(shipped({ name: 'Sarah Rose', address: { line1: '1 Rose Lane', country: 'GB' } })).toMatchObject({
      recipientName: 'Sarah Rose',
      line1: '1 Rose Lane',
      line2: null,
      city: null,
      state: null,
      postalCode: null,
      country: 'GB',
    });
  });
});

// The read-only entitlement lookup a receipt uses to itemise a bought audio upsell.
describe('paidUpsellAmountCents', () => {
  it('returns null (and does not touch the DB) without a booking session', async () => {
    select.mockClear();
    expect(await paidUpsellAmountCents(null, 'be_08_marcus_audio')).toBeNull();
    expect(await paidUpsellAmountCents('', 'be_08_marcus_audio')).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });

  it('returns the amount paid when a matching upsell row exists', async () => {
    select.mockReturnValueOnce(chain([{ amountCents: 1700 }]));
    expect(await paidUpsellAmountCents('cs_booking_1', 'be_08_marcus_audio')).toBe(1700);
  });

  it('returns null when no matching upsell row exists', async () => {
    select.mockReturnValueOnce(chain([]));
    expect(await paidUpsellAmountCents('cs_booking_1', 'be_08_marcus_audio')).toBeNull();
  });

  it('swallows a DB error and returns null — a receipt must never break on it', async () => {
    select.mockImplementationOnce(() => {
      throw new Error('relation "be_upsell_orders" does not exist');
    });
    expect(await paidUpsellAmountCents('cs_booking_1', 'be_08_marcus_audio')).toBeNull();
  });
});
