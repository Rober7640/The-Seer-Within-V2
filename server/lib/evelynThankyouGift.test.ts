// node:test — run: npx tsx --test server/lib/evelynThankyouGift.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVELYN_TY_FREE_COINS,
  isEvelynTyConversation,
  buildEvelynTyBriefSection,
  buildEvelynTyGreetingInstruction,
  type EvelynTyBrief,
} from './evelynThankyouGift';
import { LUNA_TY_FREE_COINS } from './lunaThankyouGift';
import { minutesToCoins } from '@shared/types';

test('gift is 15 minutes — and Luna stays at 30', () => {
  assert.equal(EVELYN_TY_FREE_COINS, minutesToCoins(15));
  assert.equal(LUNA_TY_FREE_COINS, minutesToCoins(30));
});

test('only /fb orders go to Evelyn', () => {
  for (const v of ['35_fb', '45_fb', '55-35_fb', '35_FB']) assert.equal(isEvelynTyConversation(v), true, v);
  for (const v of ['35_fb2', '35_gdn', '35_palm', '35_tarot', '35_read', '35', '55-35', '', null, undefined]) {
    assert.equal(isEvelynTyConversation(v as any), false, String(v));
  }
});

const full: EvelynTyBrief = {
  firstName: 'Mary',
  bucket: 'love',
  subBucket: null,
  personName: 'David',
  blockSource: 'my mother never let me speak up',
};

test('brief carries the ~4 facts + the ritual, and no prices', () => {
  const s = buildEvelynTyBriefSection(full);
  assert.match(s, /Mary/);
  assert.match(s, /about: love/);
  assert.match(s, /David/);
  assert.match(s, /my mother never let me speak up/);
  assert.match(s, /Energy Clearing Ritual/);
  assert.doesNotMatch(s, /\$\d/);
  assert.match(s, /Never mention prices/);
  assert.match(s, /^<recent_reading>[\s\S]*<\/recent_reading>$/);
});

test('missing optional facts are simply left out', () => {
  const s = buildEvelynTyBriefSection({ firstName: null, bucket: 'money', subBucket: null, personName: null, blockSource: null });
  assert.doesNotMatch(s, /First name/);
  assert.doesNotMatch(s, /The person in their reading/);
  assert.match(s, /about: money/);
  assert.match(s, /energetic block/);
});

test('"specific" bucket reads naturally', () => {
  assert.match(buildEvelynTyBriefSection({ ...full, bucket: 'specific' }), /about: someone specific/);
});

test('greeting is short, names the ritual, never the purchase', () => {
  const g = buildEvelynTyGreetingInstruction(full, 'Mary');
  assert.match(g, /1-2 short sentences/);
  assert.match(g, /Energy Clearing Ritual is on its way/);
  assert.match(g, /Never mention prices/);
  assert.doesNotMatch(g, /\$\d/);
});
