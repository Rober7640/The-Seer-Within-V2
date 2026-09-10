import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPostHogFunnel, getPostHogStep } from './funnel';

describe('twin-flame PostHog funnel', () => {
  it('roots + sub-paths resolve to the twinflame funnel', () => {
    assert.equal(getPostHogFunnel('/tarot/twin-flame'), 'twinflame');
    assert.equal(getPostHogFunnel('/tarot/twin-flame/welcome1'), 'twinflame');
    assert.equal(getPostHogFunnel('/tarot/twin-flame/success?s=cs_1'), 'twinflame');
  });
  it('steps map to the shared funnel vocabulary', () => {
    assert.equal(getPostHogStep('/tarot/twin-flame'), 'booking');
    assert.equal(getPostHogStep('/tarot/twin-flame/welcome1'), 'upsell1');
    assert.equal(getPostHogStep('/tarot/twin-flame/welcome2'), 'upsell2');
    assert.equal(getPostHogStep('/tarot/twin-flame/success'), 'thank_you');
  });
});
