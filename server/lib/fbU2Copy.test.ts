// /fb Upsell 2 copy test (v1_fb_u2_copy_2026): who is in, and the one call that assigns,
// logs and answers. No DB: the order lookup, the arm, the candle lookup and the exposure
// write are all injected, so every path, failures included, is proven here.
//
//   npx vitest run server/lib/fbU2Copy.test.ts
//
// (vitest, not node:test like fbU1Copy.test.ts: the repo's `npx vitest run` picks up
// server/**/*.test.ts, and a node:test file there fails with "No test suite found".)
//
// What it pins:
//   · eligibility is read off the order row only: /fb, no lane, a known topic. No price rule
//     (Upsell 2 is $47 / $30 for every V1 order). Both paths are in.
//   · only an assigned + enrolled arm is logged, keyed on hashEmail, with the conversationId
//     tallyUpsell2 joins on and the path, topic and candle the spec asks for
//   · every failure (bad id, no row, a throwing dependency) answers today's copy

import { describe, expect, it } from 'vitest';

import {
  fbU2CopyIneligible,
  fbU2CopyForOrder,
  fbU2Path,
  FB_U2_COPY_PRICE_CENTS,
  FB_U2_COPY_TODAY,
  type FbU2CopyDeps,
  type FbU2CopyRow,
} from './fbU2Copy';
import {
  fbU2CopyArm,
  hashEmail,
  V1_FB_U2_COPY_EXPERIMENT_KEY,
  type Assignment,
} from './experiments';

const ORDER = 'cs_live_a1B2c3D4e5F6g7H8';

const row = (over: Partial<FbU2CopyRow> = {}): FbU2CopyRow => ({
  id: 'conv-1',
  email: 'Maria@Example.com',
  priceVariant: '35_fb',
  lane: null,
  bucket: 'love',
  abVisitorId: 'vid-row',
  upsellPurchased: true,
  ...over,
});

type Arm = { magnet: boolean; variant: string | null; enrolled: boolean };
const ARM_B: Arm = { magnet: true, variant: 'B', enrolled: true };
const ARM_A: Arm = { magnet: false, variant: 'A', enrolled: true };
const DRAFT: Arm = { magnet: false, variant: 'A', enrolled: false };

function deps(o: { row?: FbU2CopyRow | null; arm?: Arm; candle?: boolean } = {}, throwIn?: keyof FbU2CopyDeps) {
  const calls = {
    findOrder: [] as string[],
    resolveArm: [] as string[],
    sawCandle: [] as string[][],
    logExposure: [] as Array<{ subjectId: string; variant: string; context: unknown }>,
  };
  const boom = (name: keyof FbU2CopyDeps) => {
    if (throwIn === name) throw new Error(`${name} failed`);
  };
  const d: FbU2CopyDeps = {
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

describe('V1_FB_U2_COPY_EXPERIMENT_KEY', () => {
  it('is the key the draft SQL creates', () => {
    expect(V1_FB_U2_COPY_EXPERIMENT_KEY).toBe('v1_fb_u2_copy_2026');
  });
});

describe('fbU2CopyIneligible: read off the order row only', () => {
  it('a plain /fb order with a topic is in, on either path', () => {
    expect(fbU2CopyIneligible(row())).toBeNull();
    expect(fbU2CopyIneligible(row({ upsellPurchased: false }))).toBeNull();
    for (const bucket of ['love', 'money', 'purpose', 'someone']) {
      expect(fbU2CopyIneligible(row({ bucket }))).toBeNull();
    }
  });
  it('every /fb price variant is in: there is no price rule', () => {
    for (const priceVariant of ['35_fb', '45_fb', '25_fb', '35_fb_ds']) {
      expect(fbU2CopyIneligible(row({ priceVariant }))).toBeNull();
    }
    expect(FB_U2_COPY_PRICE_CENTS).toEqual({ full: 4700, downsell: 3000 });
  });
  it('/fb only: any other funnel, a retarget order or no price variant is out', () => {
    for (const priceVariant of ['35_fb2', '35', '35_tarot', '35_palm', '35_gdn', '', null]) {
      expect(fbU2CopyIneligible(row({ priceVariant: priceVariant as string | null }))).toBe('not_fb');
    }
  });
  it('belief-lane buyers are out', () => {
    expect(fbU2CopyIneligible(row({ lane: 'grief' }))).toBe('lane');
  });
  it('no order, no email or no known topic is out', () => {
    expect(fbU2CopyIneligible(null)).toBe('no_order');
    expect(fbU2CopyIneligible(undefined)).toBe('no_order');
    expect(fbU2CopyIneligible(row({ email: '' }))).toBe('no_email');
    expect(fbU2CopyIneligible(row({ email: '   ' }))).toBe('no_email');
    for (const bucket of [null, '', 'career', 'LOVE']) {
      expect(fbU2CopyIneligible(row({ bucket: bucket as string | null }))).toBe('bucket');
    }
  });
});

describe('fbU2Path: the opening she is shown', () => {
  it('A when she bought Upsell 1, B otherwise', () => {
    expect(fbU2Path({ upsellPurchased: true })).toBe('A');
    expect(fbU2Path({ upsellPurchased: false })).toBe('B');
    expect(fbU2Path({ upsellPurchased: null as unknown as boolean })).toBe('B');
  });
});

describe('fbU2CopyForOrder: assign, log, answer', () => {
  it('B with the candle: answers magnet, logs B on the email hash with path, topic, candle', async () => {
    const { d, calls } = deps({ arm: ARM_B, candle: true });
    expect(await fbU2CopyForOrder(ORDER, 'vid-cookie', d)).toEqual({ copy: 'magnet', candle: true });
    expect(calls.findOrder).toEqual([ORDER]);
    expect(calls.resolveArm).toEqual(['Maria@Example.com']);
    expect(calls.sawCandle).toEqual([['vid-row', 'vid-cookie']]);
    expect(calls.logExposure).toEqual([
      {
        subjectId: hashEmail('Maria@Example.com'),
        variant: 'B',
        context: { conversationId: 'conv-1', funnel: 'v1-fb', path: 'A', topic: 'love', candle: true },
      },
    ]);
  });
  it('B on path B (declined Upsell 1), without the candle', async () => {
    const { d, calls } = deps({ row: row({ upsellPurchased: false, bucket: 'money' }), arm: ARM_B, candle: false });
    expect(await fbU2CopyForOrder(ORDER, null, d)).toEqual({ copy: 'magnet', candle: false });
    expect(calls.logExposure[0].context).toEqual({
      conversationId: 'conv-1',
      funnel: 'v1-fb',
      path: 'B',
      topic: 'money',
      candle: false,
    });
  });
  it('B with no visitor id anywhere: no candle lookup, candle false', async () => {
    const { d, calls } = deps({ row: row({ abVisitorId: null }), arm: ARM_B, candle: true });
    expect(await fbU2CopyForOrder(ORDER, undefined, d)).toEqual({ copy: 'magnet', candle: false });
    expect(calls.sawCandle).toEqual([]);
  });
  it('the same visitor id twice is looked up once', async () => {
    const { d, calls } = deps({ arm: ARM_B });
    await fbU2CopyForOrder(ORDER, 'vid-row', d);
    expect(calls.sawCandle).toEqual([['vid-row']]);
  });
  it('A: answers today, logs A with candle false, never asks about the candle', async () => {
    const { d, calls } = deps({ arm: ARM_A, candle: true });
    expect(await fbU2CopyForOrder(ORDER, 'vid-cookie', d)).toEqual(FB_U2_COPY_TODAY);
    expect(calls.sawCandle).toEqual([]);
    expect(calls.logExposure).toHaveLength(1);
    expect(calls.logExposure[0].variant).toBe('A');
    expect(calls.logExposure[0].context).toMatchObject({ path: 'A', topic: 'love', candle: false });
  });
  it('an off / draft test: today, nothing logged', async () => {
    const { d, calls } = deps({ arm: DRAFT });
    expect(await fbU2CopyForOrder(ORDER, 'vid', d)).toEqual(FB_U2_COPY_TODAY);
    expect(calls.logExposure).toEqual([]);
  });
  it('a concluded test rolled out to B: magnet, nothing logged', async () => {
    const { d, calls } = deps({ arm: { magnet: true, variant: 'B', enrolled: false }, candle: true });
    expect(await fbU2CopyForOrder(ORDER, 'vid', d)).toEqual({ copy: 'magnet', candle: true });
    expect(calls.logExposure).toEqual([]);
  });
  it('each ineligible order gets today, and is never assigned or logged', async () => {
    for (const r of [
      null,
      row({ email: '' }),
      row({ priceVariant: '35_fb2' }),
      row({ priceVariant: '35_tarot' }),
      row({ priceVariant: null }),
      row({ lane: 'grief' }),
      row({ bucket: 'career' }),
      row({ bucket: null }),
    ]) {
      const { d, calls } = deps({ row: r, arm: ARM_B });
      expect(await fbU2CopyForOrder(ORDER, 'vid', d)).toEqual(FB_U2_COPY_TODAY);
      expect(calls.resolveArm).toEqual([]);
      expect(calls.sawCandle).toEqual([]);
      expect(calls.logExposure).toEqual([]);
    }
  });
  it('anything that is not an order id never reaches the database', async () => {
    for (const id of [undefined, null, '', 'abc', 'cs_live_short', 42, ['cs_live_a1B2c3D4e5F6g7H8'], "cs_live_a1B2c3D4e5'; drop"]) {
      const { d, calls } = deps();
      expect(await fbU2CopyForOrder(id, 'vid', d)).toEqual(FB_U2_COPY_TODAY);
      expect(calls.findOrder).toEqual([]);
    }
  });
  it('a Payments.AI order id is accepted', async () => {
    const { d, calls } = deps({ arm: ARM_B });
    expect((await fbU2CopyForOrder('txn_9f8e7d6c', null, d)).copy).toBe('magnet');
    expect(calls.findOrder).toEqual(['txn_9f8e7d6c']);
  });
  it('every failure answers today, and a failure before the write logs nothing', async () => {
    for (const where of ['findOrder', 'resolveArm', 'sawCandle', 'logExposure'] as const) {
      const { d, calls } = deps({ arm: ARM_B }, where);
      expect(await fbU2CopyForOrder(ORDER, 'vid', d)).toEqual(FB_U2_COPY_TODAY);
      expect(calls.logExposure).toEqual([]);
    }
  });
});

describe('fbU2CopyArm: only an applied {copy:"magnet"} is B', () => {
  const a = (over: Partial<Assignment>): Assignment => ({
    variant: 'B',
    payload: { copy: 'magnet' },
    enrolled: true,
    applied: true,
    ...over,
  });
  it('no experiment / no subject ⇒ A, not enrolled', () => {
    expect(fbU2CopyArm(null)).toEqual({ magnet: false, variant: null, enrolled: false });
  });
  it('running + enrolled B ⇒ magnet', () => {
    expect(fbU2CopyArm(a({}))).toEqual({ magnet: true, variant: 'B', enrolled: true });
  });
  it('draft, paused or out of scope (not applied) ⇒ A', () => {
    expect(fbU2CopyArm(a({ applied: false, enrolled: false })).magnet).toBe(false);
    expect(fbU2CopyArm(a({ applied: false, enrolled: false, variant: 'A', payload: {} })).magnet).toBe(false);
  });
  it("A's empty payload, Upsell 1's payload, or a malformed one ⇒ A", () => {
    expect(fbU2CopyArm(a({ variant: 'A', payload: {} })).magnet).toBe(false);
    for (const payload of [{ copy: 'MAGNET' }, { copy: true }, { copy: 'filter' }, { copy: 'magnet ' }]) {
      expect(fbU2CopyArm(a({ payload })).magnet).toBe(false);
    }
  });
  it('a concluded winner B ⇒ magnet, not enrolled (nothing logged)', () => {
    expect(fbU2CopyArm(a({ enrolled: false }))).toEqual({ magnet: true, variant: 'B', enrolled: false });
  });
});
