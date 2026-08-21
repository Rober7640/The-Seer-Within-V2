import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { assertLocalDb, assertNoOutboundCalls } from '../lib/testGuards';

assertLocalDb();
assertNoOutboundCalls();

import { inArray } from 'drizzle-orm';
import { db, pool } from '../lib/db';
import { emailLinkCodes } from '@shared/schema';
import { emailLinkRedirectRouter } from './emailLinkRedirect';
import { mintEmailLinkCode } from '../lib/emailLinkCodes';
import { posthog } from '../lib/posthog';

const HAS_DB = Boolean(process.env.DATABASE_URL);

const mintedCodes: string[] = [];

async function mint(...args: Parameters<typeof mintEmailLinkCode>) {
  const code = await mintEmailLinkCode(...args);
  mintedCodes.push(code);
  return code;
}

describe('GET /e/:code', { skip: !HAS_DB }, () => {
  const app = express();
  app.use(emailLinkRedirectRouter);

  after(async () => {
    if (mintedCodes.length > 0) {
      await db.delete(emailLinkCodes).where(inArray(emailLinkCodes.code, mintedCodes));
    }
    await pool.end();
  });

  it('redirects to the persona lander with a plain campaign param', async () => {
    const code = await mint({
      personaSlug: 'evelyn-cross',
      campaign: 'redirect-test-' + Date.now(),
      continueSeed: 'seed',
    });
    const res = await request(app).get(`/e/${code}`);
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /^\/evelyn\?campaign=/);
  });

  it('passes through an email hint if present', async () => {
    const code = await mint({
      personaSlug: 'evelyn-cross',
      campaign: 'redirect-test-email-' + Date.now(),
      continueSeed: 'seed',
    });
    const res = await request(app).get(`/e/${code}?email=reader@example.com`);
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /email=reader%40example\.com/);
  });

  // The short link's query string is rebuilt SERVER-SIDE from the row, not
  // forwarded from the request -- forwarding would be as strippable as the
  // legacy `?campaign=` link this replaced. `bucket` is the load-bearing one:
  // EvelynLanderPage appends it to the signup destination, and
  // evelynVerifiedDripGenerator selects Drip 1's bucket-specific phrase from
  // it, falling back to generic copy when it's absent.
  it('synthesizes bucket/src/utm params from the resolved row', async () => {
    const campaign = 'redirect-test-bucket-' + Date.now();
    const code = await mint({
      personaSlug: 'evelyn-cross',
      campaign,
      continueSeed: 'seed',
      bucket: 'love',
      src: 'aweber',
    });
    const res = await request(app).get(`/e/${code}`);
    assert.equal(res.status, 302);
    const q = new URLSearchParams(res.headers.location.split('?')[1]);
    assert.equal(q.get('campaign'), campaign);
    assert.equal(q.get('bucket'), 'love');
    assert.equal(q.get('src'), 'aweber');
    assert.equal(q.get('utm_source'), 'aweber');
    assert.equal(q.get('utm_medium'), 'email');
    assert.equal(q.get('utm_campaign'), campaign);
  });

  it('omits bucket/src entirely when the row carries neither', async () => {
    const code = await mint({
      personaSlug: 'evelyn-cross',
      campaign: 'redirect-test-nobucket-' + Date.now(),
      continueSeed: 'seed',
    });
    const res = await request(app).get(`/e/${code}`);
    const q = new URLSearchParams(res.headers.location.split('?')[1]);
    assert.equal(q.has('bucket'), false, 'must not emit an empty bucket param');
    assert.equal(q.has('src'), false);
    assert.equal(q.has('utm_source'), false);
    assert.equal(q.get('utm_medium'), 'email');
  });

  it('redirects to /personas for an unresolvable code', async () => {
    const res = await request(app).get('/e/does-not-exist-xyz');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/personas');
  });

  // Not in the brief's snippet: resolveEmailLinkCode() can reject (a real DB
  // error), not just resolve null. A NUL byte in the code param is a
  // deterministic, real way to provoke that -- Postgres rejects it as an
  // invalid UTF-8 byte sequence, so this exercises the actual rejection path
  // (not a mock) and proves a reader gets a redirect instead of an
  // unhandled rejection / crashed request.
  it('redirects to /personas instead of crashing when resolution errors', async () => {
    const res = await request(app).get('/e/abc%00def');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/personas');
  });

  // A DB error must still reach monitoring (Sentry/PostHog), not just the
  // logger, so an infrastructure failure pages someone instead of silently
  // degrading every reader to /personas. `posthog` is a real singleton
  // object (a no-op client in this test env, since POSTHOG_API_KEY isn't
  // set) so spying on its own `captureException` method is a real assertion
  // on production code, not a fabricated mock of unrelated internals.
  it('reports a resolution error to posthog before redirecting', async (t) => {
    const spy = t.mock.method(posthog, 'captureException', () => {});
    const res = await request(app).get('/e/abc%00def');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/personas');
    assert.equal(spy.mock.callCount(), 1);
    assert.match(spy.mock.calls[0].arguments[0].message, /invalid byte sequence/);
  });
});
