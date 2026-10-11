// 04 · The Turn — the PostHog funnel label for its paths, and the client mirror of the server's
// BACKEND_FUNNEL['tea-reading'] (server/lib/backendPurchaseAnalytics.ts).
//
//   npx vitest run client/src/lib/funnel.teaReading.test.ts

import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG, TEA_READING_STILL_CUP_PATH } from '@shared/backendOffers';
import {
  TEA_READING_PREFIX,
  backendOfferFunnel,
  backendOfferPrefix,
  funnelPath,
  getPostHogFunnel,
  getPostHogStep,
  isBackendOffer,
} from './funnel';

describe('04 path → PostHog funnel', () => {
  it('the prefix is the catalog’s booking page, and every 04 screen sits under it', () => {
    const offer = BACKEND_OFFER_CATALOG['tea-reading'];
    expect(TEA_READING_PREFIX).toBe(offer.bookingPath.page);
    for (const path of [offer.bookingPath.chat, offer.successPath, TEA_READING_STILL_CUP_PATH]) {
      expect(path.startsWith(`${TEA_READING_PREFIX}/`)).toBe(true);
    }
  });

  it('tags the page, the chat, the receipt and the Still Cup teareading — matching backendOfferFunnel', () => {
    for (const path of [
      '/offers/wiccan/tea-reading',
      '/offers/wiccan/tea-reading/',
      '/offers/wiccan/tea-reading?c=61&fn=Sarah',
      '/offers/wiccan/tea-reading/chat',
      '/offers/wiccan/tea-reading/success',
      '/offers/wiccan/tea-reading/still-cup',
    ]) {
      expect(getPostHogFunnel(path), path).toBe(backendOfferFunnel('tea-reading'));
    }
    expect(backendOfferFunnel('tea-reading')).toBe('teareading');
  });

  it('steps: page and chat → booking, /success → thank_you, /still-cup → still_cup', () => {
    expect(getPostHogStep('/offers/wiccan/tea-reading')).toBe('booking');
    expect(getPostHogStep('/offers/wiccan/tea-reading/chat')).toBe('booking');
    expect(getPostHogStep('/offers/wiccan/tea-reading/success')).toBe('thank_you');
    expect(getPostHogStep('/offers/wiccan/tea-reading/still-cup')).toBe('still_cup');
    expect(getPostHogStep('/offers/wiccan/tea-reading/other')).toBe('unknown');
  });

  it('does not claim look-alike paths, the shared upsell pages, or its neighbours', () => {
    expect(getPostHogFunnel('/offers/wiccan/tea-readingx')).toBeNull();
    expect(getPostHogFunnel('/offers/upsell/welcome1')).toBeNull();
    expect(getPostHogFunnel('/offers/wiccan/judgement-day/chat')).toBe('judgement');
    expect(getPostHogFunnel('/offers/heart-cleanser')).toBe('heartcleanser');
    expect(getPostHogFunnel('/')).toBe('v1');
  });
});

describe('04 leaves the V1 funnel’s routing alone', () => {
  it('is not a prefix-mounted upsell offer: its upsells are the shared /offers/upsell/* pages', () => {
    expect(BACKEND_OFFER_CATALOG['tea-reading'].upsellEntryPath).toBe('/offers/upsell/welcome1');
    expect(backendOfferPrefix('/offers/wiccan/tea-reading/success')).toBeNull();
    expect(isBackendOffer('/offers/wiccan/tea-reading')).toBe(false);
  });

  it('funnelPath from a 04 screen falls through to V1 paths unchanged', () => {
    expect(funnelPath('/welcome1', '/offers/wiccan/tea-reading')).toBe('/welcome1');
    expect(funnelPath('/', '/offers/wiccan/tea-reading/success')).toBe('/');
  });

  it('keeps the earlier offers’ labels', () => {
    expect(backendOfferFunnel('twin-flame')).toBe('twinflame');
    expect(backendOfferFunnel('judgement-day')).toBe('judgement');
    expect(backendOfferFunnel('pixiu-bracelet')).toBe('pixiu');
    expect(backendOfferFunnel('heart-cleanser')).toBe('heartcleanser');
  });
});
