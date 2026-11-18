// Apple Pay domain file route — no DB, no network beyond a local port.
//
//   npx tsx --test server/routes/appleDomainFile.test.ts
//
// Apple only verifies the domain when the EXACT file comes back with HTTP 200 and no
// redirect. Pinned here: empty contents = 404 (never our homepage), filled = exact
// bytes, text/plain, both spellings, no redirect.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { APPLE_DOMAIN_ASSOCIATION, APPLE_DOMAIN_FILE_PATH, registerAppleDomainFile } from './appleDomainFile';

async function serve(contents: string) {
  const app = express();
  registerAppleDomainFile(app, contents);
  // Stand-in for the SPA fallback, which must NOT be what Apple gets.
  app.use((_req, res) => res.status(200).type('html').send('<!doctype html>homepage'));
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: () => new Promise((r) => server.close(r)) };
}

test('not received yet: 404, not the homepage', async () => {
  const s = await serve('');
  try {
    const r = await fetch(s.base + APPLE_DOMAIN_FILE_PATH, { redirect: 'manual' });
    assert.equal(r.status, 404);
    assert.doesNotMatch(await r.text(), /homepage/);
  } finally {
    await s.close();
  }
});

test('received: exact contents, 200, text/plain, no redirect, both spellings', async () => {
  const file = '7B227073704964223A2241424344227D0A';
  const s = await serve(file);
  try {
    for (const p of [APPLE_DOMAIN_FILE_PATH, `${APPLE_DOMAIN_FILE_PATH}.txt`]) {
      const r = await fetch(s.base + p, { redirect: 'manual' });
      assert.equal(r.status, 200, p);
      assert.match(r.headers.get('content-type') ?? '', /^text\/plain/, p);
      assert.equal(await r.text(), file, p);
    }
  } finally {
    await s.close();
  }
});

test('the real Payments.AI file is filled in and is their hex-encoded JSON', () => {
  assert.match(APPLE_DOMAIN_ASSOCIATION, /^[0-9a-f]+$/);
  const decoded = JSON.parse(Buffer.from(APPLE_DOMAIN_ASSOCIATION, 'hex').toString('utf8'));
  assert.equal(decoded.version, 1);
  assert.match(decoded.pspId, /^[0-9A-F]{64}$/);
});
