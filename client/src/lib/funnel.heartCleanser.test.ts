// 09 · the Heart Cleanser Love Charm — the PostHog funnel label the shared
// /offers/upsell/* pages use (client mirror of server/lib/backendPurchaseAnalytics.ts).
//
//   npx vitest run client/src/lib/funnel.heartCleanser.test.ts

import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG } from '@shared/backendOffers';
import { backendOfferFunnel, getPostHogFunnel, getPostHogStep, HEART_CLEANSER_PREFIX } from './funnel';

// The booking page + receipt are path-routed, so App.tsx's lander_view needs the path
// mapped — that is what makes a mailed 09 link report its clicks (with the letter's utm_*).
describe('09 path → PostHog funnel', () => {
  it('the prefix is the catalog’s booking path', () => {
    expect(HEART_CLEANSER_PREFIX).toBe(BACKEND_OFFER_CATALOG['heart-cleanser'].bookingPath.page);
  });

  it('tags the booking page and the receipt heartcleanser, matching backendOfferFunnel', () => {
    expect(getPostHogFunnel('/offers/heart-cleanser')).toBe(backendOfferFunnel('heart-cleanser'));
    expect(getPostHogFunnel('/offers/heart-cleanser/')).toBe('heartcleanser');
    expect(getPostHogFunnel('/offers/heart-cleanser/success')).toBe('heartcleanser');
  });

  it('steps: booking root → booking, /success → thank_you', () => {
    expect(getPostHogStep('/offers/heart-cleanser')).toBe('booking');
    expect(getPostHogStep('/offers/heart-cleanser/success')).toBe('thank_you');
    expect(getPostHogStep('/offers/heart-cleanser/other')).toBe('unknown');
  });

  it('does not claim look-alike paths or the shared upsell pages', () => {
    expect(getPostHogFunnel('/offers/heart-cleanserx')).toBeNull();
    expect(getPostHogFunnel('/offers/upsell/welcome1')).toBeNull();
    expect(getPostHogFunnel('/offers/wiccan/pixiu-bracelet')).toBe('pixiu');
  });
});

describe('backendOfferFunnel', () => {
  it('labels 09 heartcleanser, matching the server map', () => {
    expect(backendOfferFunnel('heart-cleanser')).toBe('heartcleanser');
  });

  it('keeps the earlier offers unchanged', () => {
    expect(backendOfferFunnel('twin-flame')).toBe('twinflame');
    expect(backendOfferFunnel('judgement-day')).toBe('judgement');
    expect(backendOfferFunnel('pixiu-bracelet')).toBe('pixiu');
  });
});
