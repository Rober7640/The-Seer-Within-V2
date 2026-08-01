import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { assertLocalDb } from '../lib/testGuards';

assertLocalDb();

import { inArray } from 'drizzle-orm';
import { db, pool } from '../lib/db';
import { emailLinkCodes } from '@shared/schema';
import { emailLinkRedirectRouter } from './emailLinkRedirect';
import { mintEmailLinkCode } from '../lib/emailLinkCodes';

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
});
