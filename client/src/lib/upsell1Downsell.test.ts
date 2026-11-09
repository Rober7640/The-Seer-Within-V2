// The optional U1 downsell is OFF for every offer but 12, and V1's U1 is byte-for-byte unchanged.
//
//   npx vitest run client/src/lib/upsell1Downsell.test.ts
//
// useUpsellChat.ts takes every decision below from lib/upsell1Downsell.ts, so these are the
// hook's own rules. The walk (walk-12-smoke.mjs) drives the real hook in a browser.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  formatDownsellPrice,
  upsell1BackendBody,
  upsell1DownsellOn,
  upsell1PhProduct,
} from './upsell1Downsell';
import { BACKEND_UPSELL_PITCH } from './backendOffers';
import { V1_UPSELL1 } from './upsellCopy/v1';
import { LUCKY_NUMBERS_UPSELL1 } from './upsellCopy/luckyNumbers';
import { personalizeMessage, personalizeMessages } from './upsellMessages';

const file = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// What /api/backend/upsell/user-data returns: 12 adds the two keys, nobody else does.
const LUCKY_USER = { upsell1Product: 'be_citrine_wish_ritual', upsell1DownsellCents: 3000 };
const OTHER_USER = {};

describe('off unless all three are there', () => {
  it("V1's own copy has no DOWNSELL, and no copy but 12's sets one", () => {
    expect(V1_UPSELL1.DOWNSELL).toBeUndefined();
    for (const [offer, pitch] of Object.entries(BACKEND_UPSELL_PITCH)) {
      if (offer === 'lucky-numbers') continue;
      expect(pitch?.upsell1.DOWNSELL, offer).toBeUndefined();
      expect(pitch?.upsell1.stoneImage, offer).toBeUndefined();
    }
  });

  it('every offer but 12 stays off, even if the server sent the keys', () => {
    for (const [offer, pitch] of Object.entries(BACKEND_UPSELL_PITCH)) {
      if (offer === 'lucky-numbers') continue;
      expect(upsell1DownsellOn(pitch!.upsell1, LUCKY_USER), offer).toBe(false);
      expect(upsell1DownsellOn(pitch!.upsell1, OTHER_USER), offer).toBe(false);
    }
    expect(upsell1DownsellOn(V1_UPSELL1, LUCKY_USER)).toBe(false);
  });

  it("12's copy alone can't switch it on: it needs the server's product and price", () => {
    expect(upsell1DownsellOn(LUCKY_NUMBERS_UPSELL1, OTHER_USER)).toBe(false);
    expect(upsell1DownsellOn(LUCKY_NUMBERS_UPSELL1, { upsell1Product: 'be_citrine_wish_ritual' })).toBe(false);
    expect(upsell1DownsellOn(LUCKY_NUMBERS_UPSELL1, { ...LUCKY_USER, upsell1DownsellCents: null })).toBe(false);
    expect(upsell1DownsellOn(LUCKY_NUMBERS_UPSELL1, null)).toBe(false);
    expect(upsell1DownsellOn(LUCKY_NUMBERS_UPSELL1, LUCKY_USER)).toBe(true);
  });
});

describe('the charge body', () => {
  it('every offer before 12 posts the lean body, exactly as before', () => {
    expect(upsell1BackendBody('cs_1', 'a@b.c', OTHER_USER, 'full')).toEqual({ checkoutSessionId: 'cs_1', email: 'a@b.c' });
    expect(JSON.stringify(upsell1BackendBody('cs_1', 'a@b.c', null, 'full'))).toBe(
      JSON.stringify({ checkoutSessionId: 'cs_1', email: 'a@b.c' }),
    );
  });

  it('12 names its product, and the downsell tier only when taken', () => {
    expect(upsell1BackendBody('cs_1', 'a@b.c', LUCKY_USER, 'full')).toEqual({
      checkoutSessionId: 'cs_1',
      email: 'a@b.c',
      product: 'be_citrine_wish_ritual',
    });
    expect(upsell1BackendBody('cs_1', 'a@b.c', LUCKY_USER, 'downsell')).toEqual({
      checkoutSessionId: 'cs_1',
      email: 'a@b.c',
      product: 'be_citrine_wish_ritual',
      tier: 'downsell',
    });
  });

  it("PostHog's product name is V1's literal for everyone but 12", () => {
    expect(upsell1PhProduct(OTHER_USER)).toBe('protection_ritual');
    expect(upsell1PhProduct(null)).toBe('protection_ritual');
    expect(upsell1PhProduct(LUCKY_USER)).toBe('citrine_wish_ritual');
  });

  it("V1's own charge body (the non-backend branch) is untouched in the hook", () => {
    const hook = file('../hooks/useUpsellChat.ts');
    expect(hook).toContain(`checkoutSessionId: sessionId,
                  email: userData.email,
                  firstName: userData.firstName,
                  funnel: currentFunnel(),
                  trackdeskClickId: getTrackdeskClickId(),`);
    // A decline goes to DECLINED unless downsellOn.
    expect(hook).toContain('await processStage(downsellOn ? "DOWNSELL" : "DECLINED");');
  });
});

describe('{downsellPrice}', () => {
  it('fills from the server price, never typed', () => {
    expect(formatDownsellPrice(3000)).toBe('$30');
    expect(personalizeMessage('For {downsellPrice}.', 'Ann', undefined, '$47', '$30')).toBe('For $30.');
  });

  it('changes nothing for a line without it (every V1 line)', () => {
    const v1Lines = Object.values(V1_UPSELL1).flatMap((v) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : [],
    );
    expect(v1Lines.some((s) => s.includes('{downsellPrice}'))).toBe(false);
    // Same output with and without the new argument.
    expect(personalizeMessages(v1Lines, 'Ann', 'Tom', '$47')).toEqual(personalizeMessages(v1Lines, 'Ann', 'Tom', '$47', '$30'));
  });

  it("12's copy never types $30 or $47 in U1", () => {
    const u1 = Object.values(LUCKY_NUMBERS_UPSELL1).flatMap((v) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : [],
    );
    expect(u1.filter((s) => /\$\d/.test(s))).toEqual([]);
    expect(LUCKY_NUMBERS_UPSELL1.DOWNSELL!.join(' ')).toContain('{downsellPrice}');
    expect(LUCKY_NUMBERS_UPSELL1.downsellAcceptLabel).toContain('{downsellPrice}');
  });
});

describe('the shared buttons keep their old words by default', () => {
  it('Upsell2DownsellCTA defaults to V1 U2’s exact labels', () => {
    const down = file('../components/upsell/Upsell2DownsellCTA.tsx');
    expect(down).toContain("acceptLabel = 'Yes, send it to me for $30'");
    expect(down).toContain("priceNote = '$30 includes bracelet + free shipping'");
  });

  it("OffersUpsell2 (U2) passes neither new prop, so U2's button is unchanged everywhere", () => {
    const u2 = file('../pages/offers/OffersUpsell2.tsx');
    const tag = u2.slice(u2.indexOf('<Upsell2DownsellCTA'), u2.indexOf('/>', u2.indexOf('<Upsell2DownsellCTA')));
    expect(tag).not.toContain('acceptLabel');
    expect(tag).not.toContain('priceNote');
  });

  it('the backend U1 page opens its footer for the downsell button (the walk found it hidden)', () => {
    const u1 = file('../pages/offers/OffersUpsell1.tsx');
    expect(u1).toMatch(/\|\| showCTA \|\| showDownsellCTA \|\| showShippingForm\) && \(/);
    expect(u1).toContain('{showDownsellCTA && (');
  });

  it('V1’s own U1 page never renders a downsell button', () => {
    expect(file('../pages/UpsellPage.tsx')).not.toContain('Upsell2DownsellCTA');
  });
});
