// node:test — run: npx tsx --test server/lib/evelynThankyouGift.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVELYN_TY_FREE_COINS,
  isEvelynTyConversation,
  buildEvelynTyBriefSection,
  buildEvelynTyGreetingInstruction,
  meaningfulAnswer,
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
  concern: 'he never has time for me anymore',
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
  assert.match(s, /he never has time for me anymore/);
  assert.doesNotMatch(s, /\$\d/);
  assert.match(s, /Never mention prices/);
  assert.match(s, /^<recent_reading>[\s\S]*<\/recent_reading>$/);
});

test('missing optional facts are simply left out', () => {
  const s = buildEvelynTyBriefSection({ firstName: null, bucket: 'money', concern: null, personName: null, blockSource: null });
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
  assert.match(g, /1-2 short sentences, under 35 words/);
  assert.match(g, /doing their Energy Clearing Ritual for them/);
  assert.match(g, /Never mention prices/);
  assert.doesNotMatch(g, /\$\d/);
});

test('junk block answers ("No", one-word) are dropped, real ones kept', () => {
  for (const v of ['No', 'no.', 'Yes', 'idk', 'not sure', '', null]) assert.equal(meaningfulAnswer(v as any), null, String(v));
  assert.equal(meaningfulAnswer('my father always criticised me'), 'my father always criticised me');
  const s = buildEvelynTyBriefSection({ ...full, blockSource: meaningfulAnswer('No') });
  assert.doesNotMatch(s, /"No"/);
  assert.match(s, /energetic block/);
});

test('ritual is described exactly as the funnel sells it — performed by Evelyn, written reading by email, nothing physical', () => {
  const s = buildEvelynTyBriefSection(full);
  assert.match(s, /YOU perform the ritual for them yourself/);
  assert.match(s, /2-3 hours of focused work/);
  assert.match(s, /written reading by email \(5-7 pages\)/);
  assert.match(s, /Within 24 hours/);
  assert.match(s, /nothing for them to light, burn/);
  assert.doesNotMatch(s, /on its way/);
});

// ── 2026-10-16: /fb-tarot RETARGETING buyers → Evelyn ────────────────────────────
import { readFileSync } from 'node:fs';
import { evelynTyPersonaFor } from './evelynThankyouGift';

const RT = { firstName: 'Ann', bucket: 'love' as const };

test('thank-you gate: /fb → Evelyn, retarget tarot → Evelyn, every other order → Luna', () => {
  // /fb unchanged: Evelyn from the price variant alone, whether or not anything was looked up.
  for (const v of ['35_fb', '45_fb', '55-35_fb']) {
    assert.equal(evelynTyPersonaFor(v, null), 'evelyn', v);
    assert.equal(evelynTyPersonaFor(v, RT), 'evelyn', v);
  }
  // A paid retarget order on v1-tarot: a fresh row (no variant), her old tarot lead row,
  // or the offer's own variant → Evelyn.
  for (const v of [null, undefined, '', '35_tarot', '30_tarot_rt']) {
    assert.equal(evelynTyPersonaFor(v as any, RT), 'evelyn', String(v));
  }
  // A NON-retarget tarot order (lookup answered null) → Luna, as before.
  for (const v of [null, '35_tarot', '30_tarot_rt']) assert.equal(evelynTyPersonaFor(v, null), 'luna', String(v));
  // Every other funnel → Luna, even if a lookup somehow answered (it is never asked for these).
  for (const v of ['35_fb2', '35_gdn', '35_palm', '35_read', '35', '55-35']) {
    assert.equal(evelynTyPersonaFor(v, null), 'luna', v);
    assert.equal(evelynTyPersonaFor(v, RT), 'luna', v);
  }
});

test('/fb brief + greeting are byte-identical to before the retarget change (golden captured pre-change)', () => {
  const golden = JSON.parse(readFileSync(new URL('./__fixtures__/evelynTyBrief.fb.golden.json', import.meta.url), 'utf8'));
  const bare: EvelynTyBrief = { firstName: null, bucket: 'money', concern: null, personName: null, blockSource: null };
  assert.equal(buildEvelynTyBriefSection(full), golden.fullSection);
  assert.equal(buildEvelynTyGreetingInstruction(full, 'Mary'), golden.fullGreeting);
  assert.equal(buildEvelynTyBriefSection(bare), golden.bareSection);
  assert.equal(buildEvelynTyGreetingInstruction(bare, 'Ann'), golden.bareGreeting);
});

const rtBrief = (over: Partial<EvelynTyBrief> = {}): EvelynTyBrief => ({
  firstName: 'Ann',
  bucket: 'love',
  concern: null,
  personName: null,
  blockSource: null,
  retarget: { upsellPurchased: false, upsell2Purchased: false },
  ...over,
});

test('retarget brief: name + topic + came back via the returning-reader offer + real ritual facts, no concern', () => {
  const s = buildEvelynTyBriefSection(rtBrief());
  assert.match(s, /^<recent_reading>[\s\S]*<\/recent_reading>$/);
  assert.match(s, /First name: Ann/);
  assert.match(s, /came to you about: love/);
  assert.match(s, /returning-reader offer/);
  assert.match(s, /holding love back from them/);
  assert.match(s, /chose the Energy Clearing Ritual/);
  assert.match(s, /YOU perform the ritual for them yourself/);
  assert.match(s, /written reading by email \(5-7 pages\)/);
  // Never pretends to know what she said, and quotes nothing of hers.
  assert.match(s, /What you do NOT know/);
  assert.match(s, /Never guess at it or pretend to remember it/);
  assert.doesNotMatch(s, /in their own words/);
  assert.doesNotMatch(s, /The person in their reading/);
  assert.doesNotMatch(s, /"/);
  // No prices; no upsell lines when none were bought; nothing physical for the clearing.
  assert.doesNotMatch(s, /\$\d/);
  assert.match(s, /Never mention prices, discounts or payments/);
  assert.doesNotMatch(s, /Protection Ritual|Manifestation Bracelet/);
  assert.match(s, /nothing physical is sent for it/);
});

test('retarget brief: money wording, and no first-name line when there is none', () => {
  const s = buildEvelynTyBriefSection(rtBrief({ bucket: 'money', firstName: null }));
  assert.match(s, /came to you about: money/);
  assert.match(s, /holding their money still/);
  assert.doesNotMatch(s, /First name/);
});

test('retarget brief: the upsells she took are named, with only the live funnel facts', () => {
  const s = buildEvelynTyBriefSection(rtBrief({ retarget: { upsellPurchased: true, upsell2Purchased: true } }));
  assert.match(s, /Protection Ritual: you charge a volcanic lava stone/);
  assert.match(s, /left wrist/);
  assert.match(s, /Manifestation Bracelet: eight stones/);
  assert.match(s, /right wrist/);
  const onlyU2 = buildEvelynTyBriefSection(rtBrief({ retarget: { upsellPurchased: false, upsell2Purchased: true } }));
  assert.doesNotMatch(onlyU2, /Protection Ritual/);
  assert.match(onlyU2, /Manifestation Bracelet/);
});

test('retarget greeting: short, names topic + ritual, never claims to remember what she said, no prices', () => {
  const g = buildEvelynTyGreetingInstruction(rtBrief(), 'Ann');
  assert.match(g, /Generate a brief opening message for Ann/);
  assert.match(g, /1-2 short sentences, under 35 words/);
  assert.match(g, /came back to you about love/);
  assert.match(g, /doing their Energy Clearing Ritual for them/);
  assert.match(g, /Never claim to remember any of it and never invent it/);
  assert.match(g, /Never mention prices, discounts/);
  assert.match(g, /End with one short, open question/);
  assert.doesNotMatch(g, /\$\d/);
});
