// /fb Upsell 1 copy test (v1_fb_u1_copy_2026): who is in, and the one call that assigns,
// logs and answers. No DB: the order lookup, the arm, the candle lookup and the exposure
// write are all injected, so every path, failures included, is proven here.
//
//   npx tsx --test server/lib/fbU1Copy.test.ts
//
// What it pins:
//   · eligibility is read off the order row only: /fb, no lane, $47 exactly, a known topic
//   · only an assigned + enrolled arm is logged, keyed on hashEmail with the conversationId
//     tallyUpsell1 joins on; a draft / off test logs nothing and answers today's copy
//   · every failure (bad id, no row, a throwing dependency) answers today's copy

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  fbU1CopyIneligible,
  fbU1CopyForOrder,
  FB_U1_COPY_TODAY,
  type FbU1CopyDeps,
  type FbU1CopyRow,
} from './fbU1Copy';
import {
  fbU1CopyArm,
  chatFlowVariantsShowCandle,
  hashEmail,
  V1_FB_U1_COPY_EXPERIMENT_KEY,
  type Assignment,
} from './experiments';

const ORDER = 'cs_live_a1B2c3D4e5F6g7H8';

const row = (over: Partial<FbU1CopyRow> = {}): FbU1CopyRow => ({
  id: 'conv-1',
  email: 'Maria@Example.com',
  priceVariant: '35_fb',
  lane: null,
  upsell1AmountCents: 4700,
  bucket: 'love',
  abVisitorId: 'vid-row',
  ...over,
});

type Arm = { filter: boolean; variant: string | null; enrolled: boolean };
const ARM_B: Arm = { filter: true, variant: 'B', enrolled: true };
const ARM_A: Arm = { filter: false, variant: 'A', enrolled: true };
const DRAFT: Arm = { filter: false, variant: 'A', enrolled: false };

function deps(o: { row?: FbU1CopyRow | null; arm?: Arm; candle?: boolean } = {}, throwIn?: keyof FbU1CopyDeps) {
  const calls = {
    findOrder: [] as string[],
    resolveArm: [] as string[],
    sawCandle: [] as string[][],
    logExposure: [] as Array<{ subjectId: string; variant: string; context: unknown }>,
  };
  const boom = (name: keyof FbU1CopyDeps) => {
    if (throwIn === name) throw new Error(`${name} failed`);
  };
  const d: FbU1CopyDeps = {
    async findOrder(id) {
      calls.findOrder.push(id);
      boom('findOrder');
      return o.row === undefined ? row() : o.row;
    },
    async resolveArm(email) {
      calls.resolveArm.push(email);
      boom('resolveArm');
      return o.arm ?? ARM_B;
    },
    async sawCandle(ids) {
      calls.sawCandle.push(ids);
      boom('sawCandle');
      return o.candle ?? false;
    },
    async logExposure(subjectId, variant, context) {
      boom('logExposure');
      calls.logExposure.push({ subjectId, variant, context });
    },
  };
  return { d, calls };
}

describe('V1_FB_U1_COPY_EXPERIMENT_KEY', () => {
  it('is the key the draft SQL creates', () => {
    assert.equal(V1_FB_U1_COPY_EXPERIMENT_KEY, 'v1_fb_u1_copy_2026');
  });
});

describe('fbU1CopyIneligible: read off the order row only', () => {
  it('a plain /fb order at $47 with a topic is in', () => {
    assert.equal(fbU1CopyIneligible(row()), null);
    for (const v of ['35_fb', '45_fb', '55-35_fb']) assert.equal(fbU1CopyIneligible(row({ priceVariant: v })), null);
    for (const b of ['love', 'money', 'purpose', 'someone']) assert.equal(fbU1CopyIneligible(row({ bucket: b })), null);
  });
  it('/fb only: any other funnel, or no price variant, is out', () => {
    for (const v of ['35_fb2', '45_fb2', '35_tarot', '35_palm', '35_palm_u47', '35_gdn', '35_read', '35', '', null]) {
      assert.equal(fbU1CopyIneligible(row({ priceVariant: v })), 'not_fb', String(v));
    }
  });
  it('$47 only: the u1_price_2026 $39 / $35 arms and an unpriced row are out', () => {
    for (const c of [3900, 3500, 3700, 4701, 0, null]) {
      assert.equal(fbU1CopyIneligible(row({ upsell1AmountCents: c })), 'price', String(c));
    }
  });
  it('belief-lane buyers are out', () => {
    assert.equal(fbU1CopyIneligible(row({ lane: 'manifest' })), 'lane');
    assert.equal(fbU1CopyIneligible(row({ lane: 'astrology' })), 'lane');
  });
  it('no email, no order or no known topic is out', () => {
    assert.equal(fbU1CopyIneligible(null), 'no_order');
    assert.equal(fbU1CopyIneligible(row({ email: '' })), 'no_email');
    assert.equal(fbU1CopyIneligible(row({ email: '   ' })), 'no_email');
    for (const b of [null, '', 'career']) assert.equal(fbU1CopyIneligible(row({ bucket: b })), 'bucket');
  });
});

describe('fbU1CopyForOrder: assign, log, answer', () => {
  it('B: answers filter, logs B on the email hash with the conversationId', async () => {
    const { d, calls } = deps({ arm: ARM_B, candle: true });
    assert.deepEqual(await fbU1CopyForOrder(ORDER, 'vid-cookie', d), { copy: 'filter', candle: true });
    assert.deepEqual(calls.findOrder, [ORDER]);
    assert.deepEqual(calls.resolveArm, ['Maria@Example.com']);
    assert.deepEqual(calls.sawCandle, [['vid-row', 'vid-cookie']]);
    assert.deepEqual(calls.logExposure, [
      { subjectId: hashEmail('maria@example.com'), variant: 'B', context: { conversationId: 'conv-1', funnel: 'v1-fb' } },
    ]);
  });
  it('B without the candle: filter, candle false', async () => {
    const { d } = deps({ arm: ARM_B, candle: false });
    assert.deepEqual(await fbU1CopyForOrder(ORDER, null, d), { copy: 'filter', candle: false });
  });
  it('B with no visitor id anywhere: no candle lookup, candle false', async () => {
    const { d, calls } = deps({ row: row({ abVisitorId: null }), arm: ARM_B, candle: true });
    assert.deepEqual(await fbU1CopyForOrder(ORDER, null, d), { copy: 'filter', candle: false });
    assert.equal(calls.sawCandle.length, 0);
  });
  it('the same visitor id twice is looked up once', async () => {
    const { d, calls } = deps({ arm: ARM_B });
    await fbU1CopyForOrder(ORDER, 'vid-row', d);
    assert.deepEqual(calls.sawCandle, [['vid-row']]);
  });
  it('A: answers today, logs A, never asks about the candle', async () => {
    const { d, calls } = deps({ arm: ARM_A });
    assert.deepEqual(await fbU1CopyForOrder(ORDER, 'vid-cookie', d), FB_U1_COPY_TODAY);
    assert.equal(calls.sawCandle.length, 0);
    assert.equal(calls.logExposure.length, 1);
    assert.equal(calls.logExposure[0].variant, 'A');
  });
  it('an off / draft test: today, nothing logged', async () => {
    const { d, calls } = deps({ arm: DRAFT });
    assert.deepEqual(await fbU1CopyForOrder(ORDER, 'vid-cookie', d), FB_U1_COPY_TODAY);
    assert.equal(calls.logExposure.length, 0);
  });
  it('a concluded test rolled out to B: filter, nothing logged', async () => {
    const { d, calls } = deps({ arm: { filter: true, variant: 'B', enrolled: false } });
    assert.equal((await fbU1CopyForOrder(ORDER, null, d)).copy, 'filter');
    assert.equal(calls.logExposure.length, 0);
  });
  it('an ineligible order is never assigned or logged', async () => {
    for (const r of [
      row({ upsell1AmountCents: 3900 }),
      row({ upsell1AmountCents: null }),
      row({ priceVariant: '35_tarot' }),
      row({ lane: 'manifest' }),
      row({ email: '' }),
      row({ bucket: null }),
      null,
    ]) {
      const { d, calls } = deps({ row: r });
      assert.deepEqual(await fbU1CopyForOrder(ORDER, 'vid-cookie', d), FB_U1_COPY_TODAY);
      assert.equal(calls.resolveArm.length, 0);
      assert.equal(calls.logExposure.length, 0);
    }
  });
  it('anything that is not an order id never reaches the database', async () => {
    for (const id of [undefined, null, '', 'demo_session', 'cs_test_short', "cs_live_abcdefghij'--", ['cs_live_a1B2c3D4e5F6g7H8'], 42]) {
      const { d, calls } = deps();
      assert.deepEqual(await fbU1CopyForOrder(id, null, d), FB_U1_COPY_TODAY);
      assert.equal(calls.findOrder.length, 0, String(id));
    }
  });
  it('a Payments.AI order id is accepted', async () => {
    const { d, calls } = deps({ arm: ARM_A });
    await fbU1CopyForOrder('txn_01M4D57Z4ZTEJ074GDHNE697CD', null, d);
    assert.deepEqual(calls.findOrder, ['txn_01M4D57Z4ZTEJ074GDHNE697CD']);
  });
  it('every failure answers today, and a failure before the write logs nothing', async () => {
    for (const where of ['findOrder', 'resolveArm', 'sawCandle', 'logExposure'] as const) {
      const { d, calls } = deps({ arm: ARM_B }, where);
      assert.deepEqual(await fbU1CopyForOrder(ORDER, 'vid-cookie', d), FB_U1_COPY_TODAY, where);
      assert.equal(calls.logExposure.length, 0, where);
    }
  });
});

describe('fbU1CopyArm: only an applied {copy:"filter"} is B', () => {
  const a = (over: Partial<Assignment>): Assignment => ({
    variant: 'B',
    payload: { copy: 'filter' },
    enrolled: true,
    applied: true,
    ...over,
  });
  it('no experiment / no subject ⇒ A, not enrolled', () => {
    assert.deepEqual(fbU1CopyArm(null), { filter: false, variant: null, enrolled: false });
  });
  it('running + enrolled B ⇒ filter', () => {
    assert.deepEqual(fbU1CopyArm(a({})), { filter: true, variant: 'B', enrolled: true });
  });
  it('draft, paused or out of scope (not applied) ⇒ A', () => {
    assert.equal(fbU1CopyArm(a({ applied: false, enrolled: false })).filter, false);
    assert.equal(fbU1CopyArm(a({ applied: false, enrolled: false, variant: 'A', payload: {} })).filter, false);
  });
  it("A's empty payload or a malformed one ⇒ A", () => {
    assert.equal(fbU1CopyArm(a({ variant: 'A', payload: {} })).filter, false);
    for (const payload of [{ copy: 'FILTER' }, { copy: true }, { flow: 'b' }, { copy: 'filter ' }]) {
      assert.equal(fbU1CopyArm(a({ payload })).filter, false, JSON.stringify(payload));
    }
  });
  it('a concluded winner B ⇒ filter, not enrolled (nothing logged)', () => {
    assert.deepEqual(fbU1CopyArm(a({ enrolled: false })), { filter: true, variant: 'B', enrolled: false });
  });
});

describe('chatFlowVariantsShowCandle: did the logged chat-flow arm carry {flow:"b"}?', () => {
  const arms = [
    { key: 'A', weight: 50, payload: {} },
    { key: 'B', weight: 50, payload: { flow: 'b' } },
  ];
  it('B ⇒ she saw the candle; A ⇒ she did not', () => {
    assert.equal(chatFlowVariantsShowCandle(['B'], arms), true);
    assert.equal(chatFlowVariantsShowCandle(['A'], arms), false);
    assert.equal(chatFlowVariantsShowCandle(['A', 'B'], arms), true);
  });
  it('no rows, an unknown arm or no config ⇒ no candle', () => {
    assert.equal(chatFlowVariantsShowCandle([], arms), false);
    assert.equal(chatFlowVariantsShowCandle(['Z'], arms), false);
    assert.equal(chatFlowVariantsShowCandle(['B'], null), false);
    assert.equal(chatFlowVariantsShowCandle(['B'], undefined), false);
  });
});
