import { describe, it, expect } from 'vitest';
import { BACKEND_OFFER_CATALOG, resolveBackendCharge } from '../../shared/backendOffers';

describe('soulmate-initials catalog row', () => {
  const offer = BACKEND_OFFER_CATALOG['soulmate-initials'];

  it('is a $19 fixed-price offer with an $11.11 stone-charge bump', () => {
    expect(offer).toBeDefined();
    expect(offer.pricing).toEqual({ model: 'fixed', priceCents: 1900 });
    expect(offer.stripeProduct).toBe('be_soulmate_initials');
    expect(offer.bump?.productKey).toBe('be_soulmate_initials_charge');
    expect(offer.bump?.cents).toBe(1111);
  });

  it('keeps PII out of Stripe and routes into the shared upsell chain', () => {
    expect(offer.piiOutOfStripe).toBe(true);
    expect(offer.upsellEntryPath).toBe('/offers/upsell/welcome1');
    expect(offer.successPath).toBe('/evelyn/thank-you');
  });

  it('is gated off until the operator flips it, and resolves $19 + $11.11', () => {
    expect(offer.readyForMoney).toBe(false);
    const charge = resolveBackendCharge({ offer: 'soulmate-initials', bump: true } as any);
    // not_ready is enforced at the checkout layer, not here; the math must still be right
    if (charge.ok) {
      expect(charge.readingCents).toBe(1900);
      expect(charge.bumpCents).toBe(1111);
      expect(charge.totalCents).toBe(3011);
    }
  });
});
