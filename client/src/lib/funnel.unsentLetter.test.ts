// 11 · The Unsent Letter — the PostHog funnel label for its paths, and the client mirror of the
// server's BACKEND_FUNNEL['unsent-letter'] (server/lib/backendPurchaseAnalytics.ts).
//
//   npx vitest run client/src/lib/funnel.unsentLetter.test.ts

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG } from '@shared/backendOffers';
import {
  UNSENT_LETTER_PREFIX,
  backendOfferFunnel,
  backendOfferPrefix,
  getPostHogFunnel,
  getPostHogStep,
  isBackendOffer,
} from './funnel';

describe('11 path → PostHog funnel', () => {
  it('the prefix is the catalog’s booking page, and the receipt sits under it', () => {
    const offer = BACKEND_OFFER_CATALOG['unsent-letter'];
    expect(UNSENT_LETTER_PREFIX).toBe(offer.bookingPath.page);
    expect(offer.bookingPath.chat).toBe(offer.bookingPath.page);
    expect(offer.successPath).toBe(`${UNSENT_LETTER_PREFIX}/success`);
  });

  it('tags the page and the receipt unsentletter — matching backendOfferFunnel', () => {
    for (const path of ['/tarot/unsent-letter', '/tarot/unsent-letter/', '/tarot/unsent-letter?c=3&fn=Sarah', '/tarot/unsent-letter/success']) {
      expect(getPostHogFunnel(path), path).toBe('unsentletter');
    }
    expect(backendOfferFunnel('unsent-letter')).toBe('unsentletter');
  });

  it('steps: page → booking, /success → thank_you, anything else unknown', () => {
    expect(getPostHogStep('/tarot/unsent-letter')).toBe('booking');
    expect(getPostHogStep('/tarot/unsent-letter/success')).toBe('thank_you');
    expect(getPostHogStep('/tarot/unsent-letter/chat')).toBe('unknown');
  });

  it('does not claim look-alike paths, or its neighbour 02', () => {
    expect(getPostHogFunnel('/tarot/unsent-letterx')).toBeNull();
    expect(getPostHogFunnel('/tarot/twin-flame')).toBe('twinflame');
  });

  it('is NOT a prefix-mounted offer: its upsells are the shared pages, not /tarot/unsent-letter/welcome1', () => {
    expect(backendOfferPrefix('/tarot/unsent-letter')).toBeNull();
    expect(isBackendOffer('/tarot/unsent-letter')).toBe(false);
    expect(BACKEND_OFFER_CATALOG['unsent-letter'].upsellEntryPath).toBe('/offers/upsell/welcome1');
  });

  it('the server’s funnel name is the same string', () => {
    const server = readFileSync(new URL('../../../server/lib/backendPurchaseAnalytics.ts', import.meta.url), 'utf8');
    expect(server).toContain(`'unsent-letter': 'unsentletter'`);
    expect(server).toContain(`be_unsent_letter: 'sales'`);
  });

  it('App.tsx routes both pages, the receipt first', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    const receipt = app.indexOf('path="/tarot/unsent-letter/success"');
    const page = app.indexOf('path="/tarot/unsent-letter"');
    expect(receipt).toBeGreaterThan(-1);
    expect(page).toBeGreaterThan(receipt);
  });
});
