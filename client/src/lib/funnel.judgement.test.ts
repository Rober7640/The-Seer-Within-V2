import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPostHogFunnel, getPostHogStep } from './funnel';

// 03 (Judgement Day) is split across TWO prefixes, unlike twin-flame's single one:
// booking + thank-you live under /offers/wiccan/judgement-day, but the upsells are the
// SHARED /offers/upsell/welcome1|2 pages. Both must resolve to the 'judgement' funnel so
// clicks (lander_view) group under the same funnel its revenue events already use.
describe('judgement-day PostHog funnel', () => {
  it('booking + thank-you paths resolve to the judgement funnel', () => {
    assert.equal(getPostHogFunnel('/offers/wiccan/judgement-day'), 'judgement');
    assert.equal(getPostHogFunnel('/offers/wiccan/judgement-day/chat'), 'judgement');
    assert.equal(getPostHogFunnel('/offers/wiccan/judgement-day/success?s=cs_1'), 'judgement');
  });
  it('the shared upsell pages resolve to the judgement funnel', () => {
    assert.equal(getPostHogFunnel('/offers/upsell/welcome1'), 'judgement');
    assert.equal(getPostHogFunnel('/offers/upsell/welcome2?session_id=cs_1'), 'judgement');
  });
  it('steps map to the shared funnel vocabulary across both prefixes', () => {
    assert.equal(getPostHogStep('/offers/wiccan/judgement-day'), 'booking');
    assert.equal(getPostHogStep('/offers/wiccan/judgement-day/chat'), 'booking');
    assert.equal(getPostHogStep('/offers/upsell/welcome1'), 'upsell1');
    assert.equal(getPostHogStep('/offers/upsell/welcome2'), 'upsell2');
    assert.equal(getPostHogStep('/offers/wiccan/judgement-day/success'), 'thank_you');
  });
});
