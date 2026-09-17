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
