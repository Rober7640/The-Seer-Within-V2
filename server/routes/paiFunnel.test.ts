// Route tests for the Payments.AI dev receiver's RETRY PROBE — no DB, no network.
//
//   npx tsx --test server/routes/paiFunnel.test.ts
//
// The probe exists to watch Payments.AI's stated retry schedule, so the thing that
// must never go wrong is the split: the probe username gets 503 (they retry), every
// other destination — including our normal one — still gets 200 (they don't).
// fetch is stubbed to throw, so a webhook request that reached out anywhere fails;
// requests go over node:http to an ephemeral local port.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

// The router's per-request gate needs these. Fake values: the webhook routes make no
// API calls, and the stubbed fetch below proves it.
process.env.PAI_DEV_FUNNEL = '1';
process.env.PAYMENTSAI_API_KEY = 'test-not-a-key';
process.env.PAYMENTSAI_ORG_ID = 'test-org';
process.env.PAYMENTSAI_BASE = 'https://staging-api.payments.ai';
process.env.PAI_WEBHOOK_PASS = 'test-pass';
// server/lib/facebook.ts reads its token ONCE at import, so it must exist before the
// first import below or every CAPI send is skipped as "not configured". Fake: the
// Facebook tests capture fetch, and every other test stubs it to throw.
process.env.FB_ACCESS_TOKEN = 'test-not-a-token';

const { default: paiFunnelRouter, RETRY_PROBE_USER, webhookResponseStatus } = await import('./paiFunnel');

// node:http rather than supertest (not installed) or fetch (stubbed to throw below).
function call(
  port: number,
  method: 'GET' | 'POST',
  path: string,
  opts: { auth?: string; body?: unknown } = {},
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = opts.body === undefined ? undefined : JSON.stringify(opts.body);
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(opts.auth ? { Authorization: opts.auth } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: raw ? JSON.parse(raw) : null }));
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function basic(user: string, pass = 'whatever'): string {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

const event = (id: string, eventId: string) => ({
  id,
  eventId,
  type: 'transaction-processed',
  meta: { metadata: { transaction: { id: 'txn_test', amount: 12.34, result: 'approved', metadata: {} } } },
});

describe('pai webhook retry probe', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/pai', paiFunnelRouter);
  const realFetch = globalThis.fetch;
  let server: http.Server;
  let port = 0;
  const post = (auth: string | undefined, body: unknown) =>
    call(port, 'POST', '/api/pai/webhook', { auth, body });
  const received = () => call(port, 'GET', '/api/pai/webhook/received');

  before(async () => {
    globalThis.fetch = (() => {
      throw new Error('outbound fetch attempted');
    }) as typeof fetch;
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', () => r()));
    port = (server.address() as AddressInfo).port;
  });
  after(async () => {
    globalThis.fetch = realFetch;
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('only the probe username is answered 503', () => {
    assert.equal(webhookResponseStatus(RETRY_PROBE_USER), 503);
    assert.equal(webhookResponseStatus('paymentsai'), 200);
    assert.equal(webhookResponseStatus(null), 200);
    assert.equal(webhookResponseStatus(undefined), 200);
    // Near-misses must not fail our normal destination.
    assert.equal(webhookResponseStatus(RETRY_PROBE_USER.toUpperCase()), 200);
    assert.equal(webhookResponseStatus(`${RETRY_PROBE_USER} `), 200);
  });

  it('answers the probe destination 503 and still records the delivery', async () => {
    const res = await post(basic(RETRY_PROBE_USER), event('probe-id-1', 'probe-evt-1'));
    assert.equal(res.status, 503);

    const got = await received();
    const top = got.body.events[0];
    assert.equal(top.authUser, RETRY_PROBE_USER);
    assert.equal(top.responded, 503);
    assert.equal(top.id, 'probe-id-1');
    assert.equal(top.eventId, 'probe-evt-1');
  });

  it('keeps answering the normal destination 200 — with or without auth', async () => {
    const withAuth = await post(basic('paymentsai', 'test-pass'), event('ctl-id-1', 'ctl-evt-1'));
    assert.equal(withAuth.status, 200);

    const noAuth = await post(undefined, event('ctl-id-2', 'ctl-evt-2'));
    assert.equal(noAuth.status, 200);

    const got = await received();
    assert.equal(got.body.events[0].responded, 200);
    assert.equal(got.body.events[1].responded, 200);
    assert.equal(got.body.events[1].authOk, true);
  });

  it('advertises the probe username so a script can detect a stale deploy', async () => {
    const got = await received();
    assert.equal(got.body.retryProbeUser, RETRY_PROBE_USER);
  });

  it('holds a full retry run (12 attempts x 5 events) without dropping any', async () => {
    for (let i = 0; i < 60; i++) {
      await post(basic(RETRY_PROBE_USER), event(`bulk-${i}`, `bulk-evt-${i}`));
    }
    const got = await received();
    const bulk = got.body.events.filter((e: any) => String(e.id).startsWith('bulk-'));
    assert.equal(bulk.length, 60);
  });
});

// ── The dummy landers ────────────────────────────────────────────────────────────
// What differs between dummies is WHERE the buyer is filed. Each must mirror its
// LIVE lander's lists — the soulmate dummy's must stay exactly as they were, and the
// alone dummy's must be the four shared V1 tarot lists with the live tags.

const { PAI_LANDERS, resolvePaiLander, DEFAULT_PAI_HOOK, PAI_TAG } = await import('./paiFunnel');
const { bumpPaidListWanted } = await import('@shared/landerBumpRouting');
const { V1_BUMP_PRODUCT_KEY } = await import('@shared/orderBump');
const { SOULMATE_LANDER_HOOKS } = await import('@shared/soulmateLanderHooks');

const args = { email: 'lewis+pai@theseerwithin.com', name: 'PaiTest', orderId: 'txn_test', cents: 4477 };

describe('pai dummy landers', () => {
  it('resolves no hook to the original soulmate dummy, and refuses anything unknown', () => {
    assert.equal(DEFAULT_PAI_HOOK, 'cards-after-marriage');
    for (const none of [undefined, null, '']) {
      assert.equal(resolvePaiLander(none)?.hook, 'cards-after-marriage');
    }
    assert.equal(resolvePaiLander('cards-meant-alone')?.family, 'loneliness');
    for (const bad of ['bogus', 'cards-alone-forever', 123, {}, '__proto__', 'constructor', 'toString']) {
      assert.equal(resolvePaiLander(bad), null, `should refuse ${String(bad)}`);
    }
  });

  it('keeps the soulmate dummy writing exactly what it wrote before', () => {
    process.env.AWEBER_SOULMATE_PAID_LIST_ID = '6956486';
    process.env.AWEBER_SOULMATE_UPSELL1_LIST_ID = '6956488';
    process.env.AWEBER_SOULMATE_UPSELL2_LIST_ID = '6956490';
    const l = PAI_LANDERS['cards-after-marriage'];
    assert.equal(l.bucket, 'love');
    assert.equal(l.bumpProduct(), 'soulmate_reading_bump');
    assert.equal(l.bump, null, 'the soulmate dummy never wrote the order-bump list');
    assert.deepEqual(
      [l.main(args), l.upsell1(args), l.upsell2(args)].map((s) => [s.listId, s.tags]),
      [
        ['6956486', ['soulmate-sketch-buyer', PAI_TAG]],
        ['6956488', ['soulmate-bracelet-buyer', PAI_TAG]],
        ['6956490', ['soulmate-love-tuner-buyer', PAI_TAG]],
      ],
    );
  });

  it('files the alone dummy to the four V1 tarot lists with the live tags', () => {
    delete process.env.AWEBER_PAID_LIST_ID;
    delete process.env.AWEBER_BUMP_PAID_LIST_ID;
    const l = PAI_LANDERS['cards-meant-alone'];
    assert.equal(l.bucket, 'love');
    assert.ok(l.bump, 'alone bump buyers go on the order-bump list, as live');
    assert.deepEqual(
      [l.main(args), l.bump!(args), l.upsell1(args), l.upsell2(args)].map((s) => [s.listId, s.tags]),
      [
        ['6936955', ['love', 'paid', 'initial-purchase', 'initial-purchase-tarot', PAI_TAG]],
        ['6969209', ['order-bump', 'paid', 'love', 'initial-purchase-tarot', PAI_TAG]],
        ['6937139', ['seer-within-upsell-tarot', PAI_TAG]],
        ['6939683', ['seer-within-upsell2-tarot', 'bracelet-full', PAI_TAG]],
      ],
    );
  });

  it('gives the alone dummy the default bump key with either family split switched on', () => {
    // The alone hook is neither a soulmate nor a money lander, so no switch may move
    // its key — if one did, it would be kept off the order-bump list it belongs on.
    assert.ok(!SOULMATE_LANDER_HOOKS.includes('cards-meant-alone'));
    const saved = {
      soulmate: process.env.AWEBER_LIST_ID_TAROT_SOULMATE,
      money: process.env.AWEBER_LIST_ID_TAROT_MONEY,
    };
    try {
      for (const [s, m] of [[undefined, undefined], ['1', undefined], [undefined, '1'], ['1', '1']]) {
        if (s) process.env.AWEBER_LIST_ID_TAROT_SOULMATE = s;
        else delete process.env.AWEBER_LIST_ID_TAROT_SOULMATE;
        if (m) process.env.AWEBER_LIST_ID_TAROT_MONEY = m;
        else delete process.env.AWEBER_LIST_ID_TAROT_MONEY;
        const key = PAI_LANDERS['cards-meant-alone'].bumpProduct();
        assert.equal(key, V1_BUMP_PRODUCT_KEY);
        assert.equal(bumpPaidListWanted(key), true);
      }
    } finally {
      if (saved.soulmate === undefined) delete process.env.AWEBER_LIST_ID_TAROT_SOULMATE;
      else process.env.AWEBER_LIST_ID_TAROT_SOULMATE = saved.soulmate;
      if (saved.money === undefined) delete process.env.AWEBER_LIST_ID_TAROT_MONEY;
      else process.env.AWEBER_LIST_ID_TAROT_MONEY = saved.money;
    }
  });

  it('never sends two stages of one lander to the same list (the overwrite bug)', () => {
    for (const l of Object.values(PAI_LANDERS)) {
      const stages = [l.main, l.bump, l.upsell1, l.upsell2].filter(Boolean).map((s) => s!(args).listId);
      assert.equal(new Set(stages).size, stages.length, `${l.hook}: ${stages.join(', ')}`);
    }
  });
});

describe('pai routes refuse an unknown hook before any money moves', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/pai', paiFunnelRouter);
  const realFetch = globalThis.fetch;
  let server: http.Server;
  let port = 0;

  before(async () => {
    // Any charge, customer or guard lookup would call fetch — and fail the test.
    globalThis.fetch = (() => {
      throw new Error('outbound fetch attempted');
    }) as typeof fetch;
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', () => r()));
    port = (server.address() as AddressInfo).port;
  });
  after(async () => {
    globalThis.fetch = realFetch;
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('config names the lander, and 400s an unknown one', async () => {
    const ok = await call(port, 'GET', '/api/pai/config?hook=cards-meant-alone');
    assert.equal(ok.status, 200);
    assert.equal(ok.body.hook, 'cards-meant-alone');
    assert.equal(ok.body.family, 'loneliness');
    assert.deepEqual(ok.body.hooks, ['cards-after-marriage', 'cards-meant-alone']);

    const dflt = await call(port, 'GET', '/api/pai/config');
    assert.equal(dflt.body.hook, 'cards-after-marriage');

    const bad = await call(port, 'GET', '/api/pai/config?hook=bogus');
    assert.equal(bad.status, 400);
  });

  it('checkout 400s an unknown hook without charging', async () => {
    const res = await call(port, 'POST', '/api/pai/checkout', { body: { token: 'tok_test', hook: 'bogus' } });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /unknown hook/);
  });

  it('both upsells 400 an unknown hook before the guard or the charge', async () => {
    const body = { customerId: 'cus_t', instrumentId: 'inst_t', mainTransactionId: 'txn_t', hook: 'bogus' };
    for (const path of ['/api/pai/upsell/charge', '/api/pai/upsell2/charge']) {
      const res = await call(port, 'POST', path, { body });
      assert.equal(res.status, 400, path);
      assert.match(res.body.error, /unknown hook/);
    }
  });
});

// ── The AWeber wait limit ────────────────────────────────────────────────────────
// 22 Sep: an approved main charge never answered the browser because one AWeber write
// did not return. A write that never answers must cost the buyer seconds, not minutes.

const { timedWrite } = await import('./paiFunnel');

describe('timedWrite', () => {
  const stage = (write: () => Promise<{ success: boolean; error?: string }>) => ({
    listId: '6936955',
    tags: ['t'],
    write,
  });

  it('gives up on a write that never answers, and says so', async () => {
    const started = Date.now();
    const r = await timedWrite(stage(() => new Promise(() => {})), 'test', 50);
    assert.equal(r.success, false);
    assert.equal(r.timedOut, true);
    assert.match(r.error ?? '', /no answer from AWeber/);
    assert.ok(Date.now() - started < 1000, 'must not wait past the limit');
  });

  it('passes an answered write through, timed', async () => {
    const r = await timedWrite(stage(async () => ({ success: true })), 'test', 1000);
    assert.equal(r.success, true);
    assert.equal(r.timedOut, false);
    assert.equal(typeof r.ms, 'number');
  });

  it('turns a thrown write into a failure instead of a crash', async () => {
    const r = await timedWrite(stage(async () => { throw new Error('boom'); }), 'test', 1000);
    assert.equal(r.success, false);
    assert.equal(r.timedOut, false);
    assert.match(r.error ?? '', /boom/);
  });
});

// ── Facebook (CAPI) Purchase for Payments.AI sales ───────────────────────────────
// Must be what the Stripe webhook sends for the live tarot funnel, keyed on the MAIN
// transaction so the ids match the page's browser Pixel (purchase_ / upsell_u1_ /
// upsell2_) and Facebook dedups each pair. Runs the REAL fireStripePurchaseEvent with
// fetch captured — nothing leaves the machine.

const { firePaiFbPurchase } = await import('./paiFunnel');
const { createHash } = await import('node:crypto');

describe('firePaiFbPurchase', () => {
  const realFetch = globalThis.fetch;
  const saved = { base: process.env.BASE_URL };
  let sent: any[] = [];

  before(() => {
    process.env.BASE_URL = 'https://dev.example';
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      const body = JSON.parse(init?.body ?? '{}');
      // Direct-to-Meta wraps the event in data[]; the Stape route sends it flat.
      sent.push(body.data ? body.data[0] : body);
      return new Response('{"events_received":1}', { status: 200 });
    }) as typeof fetch;
  });
  after(() => {
    globalThis.fetch = realFetch;
    if (saved.base === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = saved.base;
  });

  const buyer = { email: 'lewis+pai-alone2@theseerwithin.com', firstName: 'PaiTest' };
  const cases = [
    {
      product: 'energy_clearing_ritual', transactionId: 'txn_main', cents: 4477,
      id: 'purchase_txn_main', url: 'https://dev.example/fb-tarot/welcome1', value: 44.77,
      category: 'frontend', name: 'Energy Clearing Ritual',
    },
    {
      product: 'protection_ritual', transactionId: 'txn_u1', cents: 4700,
      id: 'upsell_u1_txn_main', url: 'https://dev.example/fb-tarot/welcome2', value: 47,
      category: 'upsell', name: 'Protection Ritual + Volcanic Stone',
    },
    {
      // upsell2_ (not upsell_u2_) — only true when funnel is the FunnelParam.
      product: 'manifestation_bracelet', transactionId: 'txn_u2', cents: 4700,
      id: 'upsell2_txn_main', url: 'https://dev.example/fb-tarot/success', value: 47,
      category: 'upsell', name: 'Manifestation Bracelet',
    },
  ];

  for (const c of cases) {
    it(`${c.product}: ${c.id}, same shape as the Stripe webhook's`, async () => {
      sent = [];
      const result = await firePaiFbPurchase({
        product: c.product,
        transactionId: c.transactionId,
        mainTransactionId: 'txn_main',
        amountCents: c.cents,
        ...buyer,
      });
      // What the dummy's response reports — must name the id it actually sent.
      assert.deepEqual(result, { eventId: c.id, sent: true });
      assert.equal(sent.length, 1, 'exactly one CAPI event');
      const ev = sent[0];
      assert.equal(ev.event_name, 'Purchase');
      assert.equal(ev.event_id, c.id);
      assert.equal(ev.event_source_url, c.url);
      assert.equal(ev.action_source, 'website');
      assert.equal(ev.custom_data.value, c.value);
      assert.equal(ev.custom_data.currency, 'USD');
      assert.equal(ev.custom_data.content_category, c.category);
      assert.equal(ev.custom_data.content_name, c.name);
      assert.equal(ev.user_data.em, createHash('sha256').update(buyer.email).digest('hex'));
    });
  }
});

describe('firePaiFbPurchase failure reporting', () => {
  const realFetch = globalThis.fetch;
  after(() => {
    globalThis.fetch = realFetch;
  });
  const args = {
    product: 'energy_clearing_ritual', transactionId: 'txn_m', mainTransactionId: 'txn_m',
    amountCents: 3500, email: 'lewis+pai@theseerwithin.com', firstName: 'PaiTest',
  };

  it('reports a rejection by Facebook as not sent', async () => {
    globalThis.fetch = (async () => new Response('{"error":"bad"}', { status: 400 })) as typeof fetch;
    const r = await firePaiFbPurchase(args);
    assert.equal(r.sent, false);
    assert.equal(r.eventId, 'purchase_txn_m');
    assert.match(r.error ?? '', /bad/);
  });

  it('stops waiting on a Facebook that never answers, and says so', async () => {
    globalThis.fetch = (() => new Promise(() => {})) as typeof fetch;
    const started = Date.now();
    const r = await firePaiFbPurchase(args, 50);
    assert.equal(r.sent, false);
    assert.match(r.error ?? '', /no answer/);
    assert.ok(Date.now() - started < 1000);
  });
});
