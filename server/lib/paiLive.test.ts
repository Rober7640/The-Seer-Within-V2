// Unit tests for the LIVE Stripe-vs-Payments.AI split — no real DB, no network.
//
//   npx tsx --test server/lib/paiLive.test.ts
//
// What must never go wrong, and is pinned here:
//   - a buyer is only ever put on Payments.AI on an allow-listed lander, with an
//     email, on a deploy that is configured for it — everything else is Stripe and
//     NOT enrolled (an enrolled exposure for a Stripe buyer would poison the report);
//   - the signed order cannot be altered or replayed after it expires;
//   - a Payments.AI order id is told apart from a Stripe one by its prefix alone;
//   - a decline fulfils nothing, and an approval lands her on the funnel's own
//     /welcome1 with the transaction as the session id.
// fetch is stubbed to answer as Payments.AI's API; the DB points at a closed port, so
// every DB write fails fast (and the module swallows it, as it must).

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = 'postgresql://nobody:nothing@127.0.0.1:1/none';
process.env.JWT_SECRET = 'test-order-secret';

const live = await import('./paiLive');
const { paiEligibleLander, isPaiOrderId } = await import('@shared/paymentGateway');
const { paiLiveReady } = await import('./paymentsai');

const deps = {
  fbifyAweberTags: (t: string[]) => t,
  funnelPath: (p: string, f?: string) => (f === 'v1-fb' ? `/fb${p}` : f === 'v1-tarot' ? `/fb-tarot${p}` : p),
  fbPosthogName: () => 'fb',
  fbTagSuffix: () => '-fb',
  isFbFunnel: () => true,
};

function order(over: Partial<import('./paiLive').PaiOrder> = {}): import('./paiLive').PaiOrder {
  return {
    v: 1,
    email: 'buyer+test@example.com',
    firstName: 'Ann',
    bucket: 'love',
    funnel: 'v1-fb',
    hook: null,
    deck: null,
    type: 'main',
    mainCents: 3500,
    bumpOffered: true,
    bumpApplied: true,
    bumpCents: 1277,
    bumpBucket: 'money',
    bumpProduct: 'double_reading',
    priceVariant: '35',
    productName: 'Energy Clearing Ritual - FB',
    gclid: null,
    trackdeskClickId: null,
    posthogDistinctId: null,
    src: null,
    readDevice: null,
    iat: Date.now(),
    ...over,
  };
}

// The DB pool and analytics clients hold sockets open; nothing here needs them to.
after(() => setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref());

describe('the allow-list', () => {
  it('admits exactly the three landers Lewis named', () => {
    assert.equal(paiEligibleLander('v1-fb', undefined), true);
    assert.equal(paiEligibleLander('v1-tarot', 'cards-meant-alone'), true);
    assert.equal(paiEligibleLander('v1-tarot', 'cards-come-back'), true);
  });
  it('refuses near-twins, other hooks, other funnels and root', () => {
    // cards-meant-alone-still-time is a NEAR TWIN of cards-meant-alone (tarotRedirect.ts).
    assert.equal(paiEligibleLander('v1-tarot', 'cards-meant-alone-still-time'), false);
    assert.equal(paiEligibleLander('v1-tarot', 'cards-return'), false);
    assert.equal(paiEligibleLander('v1-tarot', undefined), false);
    assert.equal(paiEligibleLander('v1-fb', 'cards-meant-alone'), false);
    assert.equal(paiEligibleLander('v1-fb2', undefined), false);
    assert.equal(paiEligibleLander('v1-palm', undefined), false);
    assert.equal(paiEligibleLander(undefined, undefined), false);
  });
});

describe('isPaiOrderId', () => {
  it('is true for txn_ and false for every Stripe id shape', () => {
    assert.equal(isPaiOrderId('txn_01M4D57Z4ZTEJ074GDHNE697CD'), true);
    assert.equal(isPaiOrderId('cs_live_a1b2'), false);
    assert.equal(isPaiOrderId('cs_test_a1b2'), false);
    assert.equal(isPaiOrderId('pi_123'), false);
    assert.equal(isPaiOrderId(undefined), false);
    assert.equal(isPaiOrderId(''), false);
  });
});

describe('the signed order', () => {
  it('round-trips', () => {
    const o = order();
    assert.deepEqual(live.verifyOrder(live.signOrder(o)), o);
  });
  it('refuses a changed price', () => {
    const tok = live.signOrder(order());
    const [body, sig] = tok.split('.');
    const forged = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    forged.mainCents = 100;
    const forgedBody = Buffer.from(JSON.stringify(forged), 'utf8').toString('base64url');
    assert.equal(live.verifyOrder(`${forgedBody}.${sig}`), null);
  });
  it('refuses a token signed with another secret, garbage, and an expired order', () => {
    assert.equal(live.verifyOrder(live.signOrder(order(), 'other-secret')), null);
    assert.equal(live.verifyOrder('nonsense'), null);
    assert.equal(live.verifyOrder(undefined), null);
    const old = order({ iat: Date.now() - live.ORDER_TTL_MS - 1000 });
    assert.equal(live.verifyOrder(live.signOrder(old)), null);
  });
});

describe('order totals and metadata', () => {
  it('charges main + bump only when the bump was applied', () => {
    assert.equal(live.orderTotalCents(order()), 4777);
    assert.equal(live.orderTotalCents(order({ bumpApplied: false, bumpCents: 0 })), 3500);
  });
  it('stamps the bump keys ONLY on a bump order (Mike branches on their presence)', () => {
    const withBump = live.mainMetadata(order());
    assert.equal(withBump.product, 'energy_clearing_ritual');
    assert.equal(withBump.bumpProduct, 'double_reading');
    assert.equal(withBump.bumpAmount, '1277');
    const plain = live.mainMetadata(order({ bumpApplied: false, bumpCents: 0, bumpProduct: null, bumpBucket: null }));
    assert.equal('bumpProduct' in plain, false);
    assert.equal('bumpAmount' in plain, false);
    assert.equal(plain.product, 'energy_clearing_ritual');
    assert.equal(plain.funnel, 'v1-fb');
  });
  it('normalises a phone to E.164 or refuses it', () => {
    assert.equal(live.normalizePhone('+44 7700 900-123'), '+447700900123');
    assert.equal(live.normalizePhone('07700900123'), null);
    assert.equal(live.normalizePhone(''), null);
  });
});

describe('resolveGateway — Stripe and NOT enrolled unless everything holds', () => {
  const saved = { ...process.env };
  after(() => {
    process.env = saved;
  });

  it('not configured ⇒ Stripe, not enrolled', async () => {
    delete process.env.PAI_LIVE_ENABLED;
    const d = await live.resolveGateway({ email: 'a@b.co', funnel: 'v1-fb' });
    assert.equal(d.gateway, 'stripe');
    assert.equal(d.enrolled, false);
    assert.match(d.reason ?? '', /not ready/);
  });

  it('configured, but an ineligible lander / no email / no-optin ⇒ Stripe, not enrolled', async () => {
    process.env.PAI_LIVE_ENABLED = '1';
    process.env.PAI_LIVE_API_KEY = 'k';
    process.env.PAI_LIVE_ORG_ID = 'o';
    assert.equal(paiLiveReady().ready, true);
    for (const args of [
      { email: 'a@b.co', funnel: 'v1-palm' as const },
      { email: 'a@b.co', funnel: 'v1-tarot' as const, hook: 'cards-return' },
      { email: '', funnel: 'v1-fb' as const },
      { email: 'a@b.co', funnel: 'v1-fb' as const, noemail: true },
    ]) {
      const d = await live.resolveGateway(args);
      assert.equal(d.gateway, 'stripe', JSON.stringify(args));
      assert.equal(d.enrolled, false, JSON.stringify(args));
    }
  });

  it('eligible but the experiment cannot be read (DB down) ⇒ Stripe, not enrolled', async () => {
    const d = await live.resolveGateway({ email: 'a@b.co', funnel: 'v1-fb' });
    assert.equal(d.gateway, 'stripe');
    assert.equal(d.enrolled, false);
  });
});

describe('chargeMain against a stubbed Payments.AI', () => {
  const realFetch = globalThis.fetch;
  let txnResult = 'approved';
  let calls: string[] = [];

  before(() => {
    process.env.PAI_LIVE_ENABLED = '1';
    process.env.PAI_LIVE_API_KEY = 'k';
    process.env.PAI_LIVE_ORG_ID = 'o';
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push(`${init?.method ?? 'GET'} ${u.replace(/^https:\/\/[^/]+/, '')}`);
      const json = (data: unknown) =>
        new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } });
      if (u.endsWith('/customers')) return json({ id: 'cus_TEST' });
      if (u.endsWith('/transactions') && init?.method === 'POST') return json({ id: 'txn_TEST1', result: 'pending' });
      if (u.includes('/transactions/txn_TEST1')) {
        return json({
          id: 'txn_TEST1',
          result: txnResult,
          status: 'completed',
          amount: 47.77,
          paymentInstrument: { id: 'inst_TEST' },
          metadata: { email: 'buyer+test@example.com' },
        });
      }
      // Anything else (Facebook, Google, AWeber…) — accept and ignore.
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
  });
  after(() => {
    globalThis.fetch = realFetch;
  });
  beforeEach(() => {
    calls = [];
  });

  it('a decline fulfils nothing and says declined', async () => {
    txnResult = 'declined';
    const out = await live.chargeMain(
      { order: order(), cardToken: 'tok_1', phone: '+15555550123', smsAnswer: 'yes', returnUrl: 'https://x/fb/chat?paiReturn=1', policyBase: 'https://x' },
      deps,
    );
    assert.equal(out.kind, 'declined');
    // Charged once for the order TOTAL (main + bump), as one transaction.
    const charges = calls.filter((c) => c.startsWith('POST') && c.endsWith('/transactions'));
    assert.equal(charges.length, 1);
  });

  it('an approval goes to the funnel’s own /welcome1 with the txn as the session id', async () => {
    txnResult = 'approved';
    const out = await live.chargeMain(
      { order: order({ firstName: 'Bea' }), cardToken: 'tok_2', phone: '+15555550123', smsAnswer: 'no', returnUrl: 'https://x/fb/chat?paiReturn=1', policyBase: 'https://x' },
      deps,
    );
    assert.equal(out.kind, 'approved');
    if (out.kind === 'approved') {
      assert.equal(out.redirect, '/fb/welcome1?session_id=txn_TEST1');
      assert.equal(out.totalCents, 4777);
    }
  });
});

describe('idempotency keys', () => {
  it('never exceed Payments.AI’s 50-character cap, for every tag in use', () => {
    for (const tag of ['main', 'upsell1', 'upsell2', 'upsell1-card', 'upsell2-card']) {
      const k = live.idemKey(tag);
      assert.ok(k.length <= 50, `${tag}: ${k.length} chars`);
      assert.notEqual(k, live.idemKey(tag));
    }
  });
});
