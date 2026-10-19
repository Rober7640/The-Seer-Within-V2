// node:test — run: npx tsx --test server/lib/retargetOrder.test.ts
// The /fb-tarot RETARGETING order gate used by the post-purchase path (U2 fixed copy,
// thank-you → Evelyn, the Evelyn gift + brief). See server/lib/retargetOrder.ts.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  retargetOrderFromSession,
  couldBeRetargetOrder,
  lookupRetargetOrder,
  rememberRetargetSession,
  _clearRetargetOrderCache,
} from './retargetOrder';

// Exactly what /api/checkout writes on an offer-page order (no email, no concern).
const offerMeta = {
  firstName: 'Ann',
  bucket: 'love',
  app: 'the-seer-within',
  product: 'energy_clearing_ritual',
  priceVariant: '30_tarot_rt',
  funnel: 'v1-tarot',
  type: 'main',
  src: 'retarget',
  rtfmt: 'offer',
};

beforeEach(() => _clearRetargetOrderCache());

test('gate: a paid src=retarget order on v1-tarot → her first name + love/money', () => {
  assert.deepEqual(retargetOrderFromSession({ payment_status: 'paid', metadata: offerMeta }), {
    firstName: 'Ann',
    bucket: 'love',
  });
  assert.deepEqual(
    retargetOrderFromSession({ payment_status: 'paid', metadata: { ...offerMeta, bucket: 'money' } })?.bucket,
    'money',
  );
});

test('gate: everything else is NOT a retarget order', () => {
  const no = (m: Record<string, string>, status = 'paid') =>
    assert.equal(retargetOrderFromSession({ payment_status: status, metadata: m }), null, JSON.stringify(m));
  no(offerMeta, 'unpaid');
  no({ ...offerMeta, src: 'recovery' });
  no({ ...offerMeta, src: 'Retarget' });
  no({ ...offerMeta, funnel: 'v1-palm' });
  no({ ...offerMeta, funnel: 'v1-fb' });
  const { src: _s, ...noSrc } = offerMeta;
  no(noSrc);
  const { funnel: _f, ...noFunnel } = offerMeta;
  no(noFunnel);
  assert.equal(retargetOrderFromSession(null), null);
  assert.equal(retargetOrderFromSession({ payment_status: 'paid', metadata: null }), null);
});

test('gate: junk topic → null bucket; name trimmed and clipped', () => {
  const r = retargetOrderFromSession({
    payment_status: 'paid',
    metadata: { ...offerMeta, bucket: 'specific', firstName: `  ${'A'.repeat(80)}  ` },
  });
  assert.equal(r?.bucket, null);
  assert.equal(r?.firstName?.length, 60);
  assert.equal(retargetOrderFromSession({ payment_status: 'paid', metadata: { ...offerMeta, firstName: ' ' } })?.firstName, null);
});

test('couldBeRetargetOrder: only a fresh row or a tarot row is ever looked up', () => {
  for (const v of [null, undefined, '', '35_tarot', '30_tarot_rt']) assert.equal(couldBeRetargetOrder(v as any), true, String(v));
  for (const v of ['35_fb', '35_fb2', '35_gdn', '35_palm', '35_read', '35', '55-35']) assert.equal(couldBeRetargetOrder(v), false, v);
});

function fakeStripe(impl: (id: string) => Promise<any>) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    checkout: { sessions: { retrieve: async (id: string) => { calls++; return impl(id); } } },
  } as any;
}

test('lookup: asks Stripe once per paid session, then answers from the cache', async () => {
  const s = fakeStripe(async (id) => ({ id, payment_status: 'paid', metadata: offerMeta }));
  assert.deepEqual(await lookupRetargetOrder('cs_test_1', s), { firstName: 'Ann', bucket: 'love' });
  assert.deepEqual(await lookupRetargetOrder('cs_test_1', s), { firstName: 'Ann', bucket: 'love' });
  assert.equal(s.calls, 1);
  // A normal order is cached as "no" too.
  const n = fakeStripe(async (id) => ({ id, payment_status: 'paid', metadata: { funnel: 'v1-tarot' } }));
  assert.equal(await lookupRetargetOrder('cs_test_2', n), null);
  assert.equal(await lookupRetargetOrder('cs_test_2', n), null);
  assert.equal(n.calls, 1);
});

test('lookup: never throws, never calls Stripe for a non-Stripe id, never caches an error or an unpaid session', async () => {
  const boom = fakeStripe(async () => { throw new Error('stripe down'); });
  assert.equal(await lookupRetargetOrder('cs_test_3', boom), null);
  assert.equal(await lookupRetargetOrder('cs_test_3', boom), null);
  assert.equal(boom.calls, 2);
  const unpaid = fakeStripe(async (id) => ({ id, payment_status: 'unpaid', metadata: offerMeta }));
  await lookupRetargetOrder('cs_test_4', unpaid);
  await lookupRetargetOrder('cs_test_4', unpaid);
  assert.equal(unpaid.calls, 2);
  const s = fakeStripe(async () => ({}));
  for (const id of ['txn_123', '', null, undefined, 'demo_session']) assert.equal(await lookupRetargetOrder(id as any, s), null);
  assert.equal(s.calls, 0);
  assert.equal(await lookupRetargetOrder('cs_test_5', null), null);
});

test('rememberRetargetSession warms the cache so the next lookup needs no Stripe call', async () => {
  rememberRetargetSession({ id: 'cs_test_6', payment_status: 'paid', metadata: offerMeta });
  const s = fakeStripe(async () => { throw new Error('should not be called'); });
  assert.deepEqual(await lookupRetargetOrder('cs_test_6', s), { firstName: 'Ann', bucket: 'love' });
  assert.equal(s.calls, 0);
  // Junk in, nothing thrown.
  rememberRetargetSession(null);
  rememberRetargetSession({} as any);
});
