import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPostHogFunnel, getPostHogStep, backendOfferFunnel } from './funnel';

// 03 (Judgement Day) booking + thank-you live under /offers/wiccan/judgement-day (the
// chat is the default treatment at the root; the page fallback is /page). Its upsells are
// the SHARED /offers/upsell/* pages, which can't be tagged by PATH (they serve 03 and 06)
// — they resolve their funnel from the booking session via backendOfferFunnel and fire
// their own lander_view. So the path resolvers below cover only the booking prefix.
describe('judgement-day PostHog funnel', () => {
  it('booking + thank-you paths resolve to the judgement funnel', () => {
    assert.equal(getPostHogFunnel('/offers/wiccan/judgement-day'), 'judgement');       // root = chat (default)
    assert.equal(getPostHogFunnel('/offers/wiccan/judgement-day/chat'), 'judgement');
    assert.equal(getPostHogFunnel('/offers/wiccan/judgement-day/page'), 'judgement');   // page fallback
    assert.equal(getPostHogFunnel('/offers/wiccan/judgement-day/success?s=cs_1'), 'judgement');
  });
  it('the shared upsell pages are NOT path-tagged; they resolve by session offer', () => {
    // Path-based resolution returns null for the shared pages (they serve 03 and 06).
    assert.equal(getPostHogFunnel('/offers/upsell/welcome1'), null);
    assert.equal(getPostHogFunnel('/offers/upsell/welcome2?session_id=cs_1'), null);
    // The pages tag themselves from the booking session offer instead.
    assert.equal(backendOfferFunnel('judgement-day'), 'judgement');
  });
  it('steps map to the shared funnel vocabulary across both prefixes', () => {
    assert.equal(getPostHogStep('/offers/wiccan/judgement-day'), 'booking');       // chat (default)
    assert.equal(getPostHogStep('/offers/wiccan/judgement-day/chat'), 'booking');
    assert.equal(getPostHogStep('/offers/wiccan/judgement-day/page'), 'booking');   // page fallback
    assert.equal(getPostHogStep('/offers/wiccan/judgement-day/success'), 'thank_you');
  });
});
