import { describe, expect, it } from 'vitest';
import { upsell1CopyForOffer, upsell2CopyForOffer } from './backendOffers';
import { TWIN_FLAME_UPSELL1 } from './upsellCopy/twinFlame';

describe('offer-keyed upsell pitch registry', () => {
  it('returns twin-flame copy for the twin-flame key', () => {
    expect(upsell1CopyForOffer('twin-flame')).toBe(TWIN_FLAME_UPSELL1);
  });
  it('returns a valid Upsell1Copy for judgement-day (has the 03 confirmation)', () => {
    const c = upsell1CopyForOffer('judgement-day');
    expect(Array.isArray(c.CONFIRMATION)).toBe(true);
    expect(c.CONFIRMATION[0]).toContain('page is open'); // 03-U U1a first beat
  });
  it('returns Upsell2Copy for both offers', () => {
    expect(upsell2CopyForOffer('twin-flame').PATH_A_OPEN.length).toBeGreaterThan(0);
    expect(upsell2CopyForOffer('judgement-day').PATH_A_OPEN.length).toBeGreaterThan(0);
  });
});
