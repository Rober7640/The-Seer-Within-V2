import { describe, expect, it } from 'vitest';
import { upsellOrderValuesFromPI } from './beUpsellOrders';

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
