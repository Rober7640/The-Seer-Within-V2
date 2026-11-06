// 12 · Lucky Numbers — the PostHog funnel label for its paths, and the client mirror of the
// server's BACKEND_FUNNEL['lucky-numbers'] (server/lib/backendPurchaseAnalytics.ts).
//
//   npx vitest run client/src/lib/funnel.luckyNumbers.test.ts

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG } from '@shared/backendOffers';
import {
  LUCKY_NUMBERS_PREFIX,
  backendOfferFunnel,
  backendOfferPrefix,
  getPostHogFunnel,
  getPostHogStep,
  isBackendOffer,
} from './funnel';

describe('12 path → PostHog funnel', () => {
  it('the prefix is the catalog’s booking page, and the receipt sits under it', () => {
    const offer = BACKEND_OFFER_CATALOG['lucky-numbers'];
    expect(LUCKY_NUMBERS_PREFIX).toBe(offer.bookingPath.page);
    expect(offer.bookingPath.chat).toBe(offer.bookingPath.page);
    expect(offer.successPath).toBe(`${LUCKY_NUMBERS_PREFIX}/success`);
  });

  it('tags the page and the receipt luckynumbers — matching backendOfferFunnel', () => {
    for (const path of ['/numerology/lucky-numbers', '/numerology/lucky-numbers/', '/numerology/lucky-numbers?c=3&fn=Sarah', '/numerology/lucky-numbers/success']) {
      expect(getPostHogFunnel(path), path).toBe('luckynumbers');
    }
    expect(backendOfferFunnel('lucky-numbers')).toBe('luckynumbers');
  });

  it('steps: page → booking, /success → thank_you, anything else unknown', () => {
    expect(getPostHogStep('/numerology/lucky-numbers')).toBe('booking');
    expect(getPostHogStep('/numerology/lucky-numbers/success')).toBe('thank_you');
    expect(getPostHogStep('/numerology/lucky-numbers/chat')).toBe('unknown');
  });

  it('does not claim look-alike paths, or its neighbour 11', () => {
    expect(getPostHogFunnel('/numerology/lucky-numbersx')).toBeNull();
    expect(getPostHogFunnel('/tarot/unsent-letter')).toBe('unsentletter');
    expect(getPostHogFunnel('/numerology')).toBeNull();
  });

  it('is NOT a prefix-mounted offer: its upsells are the shared pages, not /numerology/lucky-numbers/welcome1', () => {
    expect(backendOfferPrefix('/numerology/lucky-numbers')).toBeNull();
    expect(isBackendOffer('/numerology/lucky-numbers')).toBe(false);
    expect(BACKEND_OFFER_CATALOG['lucky-numbers'].upsellEntryPath).toBe('/offers/upsell/welcome1');
  });

  it('the server’s funnel name is the same string', () => {
    const server = readFileSync(new URL('../../../server/lib/backendPurchaseAnalytics.ts', import.meta.url), 'utf8');
    expect(server).toContain(`'lucky-numbers': 'luckynumbers'`);
    expect(server).toContain(`be_lucky_numbers: 'sales'`);
  });

  it('App.tsx routes both pages, the receipt first', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    const receipt = app.indexOf('path="/numerology/lucky-numbers/success"');
    const page = app.indexOf('path="/numerology/lucky-numbers"');
    expect(receipt).toBeGreaterThan(-1);
    expect(page).toBeGreaterThan(receipt);
  });
});
