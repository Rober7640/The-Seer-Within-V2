// 04 · The Turn — the PostHog funnel label for its paths, and the client mirror of the server's
// BACKEND_FUNNEL['tea-reading'] (server/lib/backendPurchaseAnalytics.ts).
//
//   npx vitest run client/src/lib/funnel.teaReading.test.ts

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG } from '@shared/backendOffers';
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
    for (const path of [offer.bookingPath.chat, offer.successPath]) {
      expect(path.startsWith(`${TEA_READING_PREFIX}/`)).toBe(true);
    }
  });

  it('tags the page, the chat and the receipt teareading — matching backendOfferFunnel', () => {
    for (const path of [
      '/offers/wiccan/tea-reading',
      '/offers/wiccan/tea-reading/',
      '/offers/wiccan/tea-reading?c=61&fn=Sarah',
      '/offers/wiccan/tea-reading/chat',
      '/offers/wiccan/tea-reading/success',
    ]) {
      expect(getPostHogFunnel(path), path).toBe(backendOfferFunnel('tea-reading'));
    }
    expect(backendOfferFunnel('tea-reading')).toBe('teareading');
  });

  it('steps: page and chat → booking, /success → thank_you; the retired /still-cup is no step', () => {
    expect(getPostHogStep('/offers/wiccan/tea-reading')).toBe('booking');
    expect(getPostHogStep('/offers/wiccan/tea-reading/chat')).toBe('booking');
    expect(getPostHogStep('/offers/wiccan/tea-reading/success')).toBe('thank_you');
    expect(getPostHogStep('/offers/wiccan/tea-reading/still-cup')).toBe('unknown');
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

// The bump is the Double Turning (operator 2026-10-11): intangible, so it has no page. The Still
// Cup page, its copy module and its route are gone.
describe('04 has no /still-cup route', () => {
  const src = (rel: string) => new URL(`../${rel}`, import.meta.url);

  it('App.tsx registers no still-cup route and imports no Still Cup page', () => {
    const app = readFileSync(src('App.tsx'), 'utf8');
    expect(app).not.toMatch(/still-cup|StillCup/);
    expect(app).toContain('path="/offers/wiccan/tea-reading/success"');
  });

  it('the page and its copy module are deleted', () => {
    expect(existsSync(src('pages/offers/tea-reading/StillCupPage.tsx'))).toBe(false);
    expect(existsSync(src('lib/stillCup.ts'))).toBe(false);
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
