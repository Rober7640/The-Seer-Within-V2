// The `upsell1_funnel` conversion guard in the experiments admin route.
//
// It used to allow exactly one key (u1_price_2026), because only that key had code that
// applied it. The /fb Upsell 1 copy test (v1_fb_u1_copy_2026) has its own resolver and logs
// its own exposures with the conversationId tallyUpsell1 joins on, so it joins the list.
// Every other key is still refused, and the price key keeps its price-payload rule.
//
//   npx tsx --test server/routes/admin/upsell1Funnel.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { UPSELL1_FUNNEL_KEYS, upsell1FunnelKeyError, upsell1PayloadCheck } from './experiments';

describe('upsell1FunnelKeyError', () => {
  it('allows the price test and the /fb copy test, nothing else', () => {
    assert.deepEqual([...UPSELL1_FUNNEL_KEYS], ['u1_price_2026', 'v1_fb_u1_copy_2026']);
    assert.equal(upsell1FunnelKeyError('u1_price_2026'), null);
    assert.equal(upsell1FunnelKeyError('v1_fb_u1_copy_2026'), null);
    for (const k of ['u1_price_2027', 'v1_fb_u1_copy_2027', 'v1_fb_chat_flow_2026', 'anything']) {
      assert.match(upsell1FunnelKeyError(k) ?? '', /only supported for/, k);
    }
  });
});

describe('upsell1PayloadCheck', () => {
  const priced = [
    { key: 'A', payload: { upsell1Cents: 4700 } },
    { key: 'B', payload: { upsell1Cents: 3900 } },
  ];
  const copyArms = [
    { key: 'A', payload: {} },
    { key: 'B', payload: { copy: 'filter' } },
  ];
  it('the price test still needs a positive price on every arm', () => {
    assert.equal(upsell1PayloadCheck('u1_price_2026', priced), null);
    assert.match(upsell1PayloadCheck('u1_price_2026', copyArms) ?? '', /upsell1Cents/);
    assert.match(
      upsell1PayloadCheck('u1_price_2026', [{ key: 'A', payload: { upsell1Cents: 4700 } }, { key: 'B', payload: {} }]) ?? '',
      /variant 'B'/,
    );
  });
  it('the copy test changes no price, so its {} / {copy:"filter"} arms pass', () => {
    assert.equal(upsell1PayloadCheck('v1_fb_u1_copy_2026', copyArms), null);
  });
  it('any other key is checked exactly as before (price rule)', () => {
    assert.match(upsell1PayloadCheck('some_other_key', copyArms) ?? '', /upsell1Cents/);
  });
});
