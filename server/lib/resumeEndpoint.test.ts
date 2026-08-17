// Integration test for the EMAILED V1 RECOVERY LINK endpoint —
// GET /api/conversation/resume/:id.
//
// ── Why this exists and the browser spec is not enough ────────────────────────
// tests/v1-resume-arms.spec.ts STUBS this endpoint (that is how it drives each
// arm without a database), so it proves the CLIENT renders a gate/bump when the
// payload carries one — but it cannot see whether the SERVER puts them there.
// And the client merges `data.userData` with a spread, so the endpoint omitting a
// field and the endpoint returning `false` look identical from the browser.
//
// The bug was exactly that omission: the endpoint returned name/bucket/price and
// nothing else, so every reader arriving on a recovery link got the plain
// purchase CTA no matter which arm she had been assigned — while still sitting in
// that arm's denominator, because her exposure was logged weeks earlier at lead
// capture. So what has to be asserted is that the three KEYS are present, which
// is what this does.
//
// Runs over HTTP against a locally running dev server (npm run dev) so the real
// route, not a re-implementation of it, is what answers. Skips cleanly when there
// is no DATABASE_URL or no server on the port.
//
//   npm run dev
//   npx tsx --test server/lib/resumeEndpoint.test.ts
//
// 🔒 Seeds ONE conversation row with a `@test.invalid` email and deletes it in a
//    finally, so an assertion failure still cleans up. Deliberately does NOT go
//    through /api/lead: that fires a real AWeber subscriber write, and the local
//    .env carries LIVE AWeber credentials.

import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';

import { db, pool } from './db';
import { conversations } from '../../shared/schema';

const BASE = process.env.LOCAL_BASE_URL || 'http://127.0.0.1:5000';
const hasDb = !!process.env.DATABASE_URL;
const STAMP = Date.now();
const EMAIL = `resume-endpoint-${STAMP}@test.invalid`;

let serverUp = false;
let conversationId = '';

before(async () => {
  try {
    const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(4000) });
    serverUp = res.ok || res.status < 500;
  } catch {
    serverUp = false;
  }
  if (!serverUp || !hasDb) return;

  const [row] = await db
    .insert(conversations)
    .values({
      email: EMAIL,
      firstName: 'ResumeSpec',
      bucket: 'love',
      conversationState: 'PITCH',
      messages: JSON.stringify([]),
      // The locked price. The endpoint must hand these back untouched — nothing
      // on the resume path may re-draw them.
      priceVariant: '35_palm_u47',
      priceAmountCents: 3500,
      downsellAmountCents: 2500,
    })
    .returning({ id: conversations.id });
  conversationId = row.id;
});

after(async () => {
  try {
    if (conversationId) {
      await db.delete(conversations).where(eq(conversations.id, conversationId));
    }
  } finally {
    await pool.end();
  }
});

describe('GET /api/conversation/resume/:id', () => {
  it('returns the commitment-gate + order-bump arms, not just name/bucket/price', async (t) => {
    if (!serverUp || !hasDb) return t.skip('needs DATABASE_URL and a local server');

    const res = await fetch(
      `${BASE}/api/conversation/resume/${conversationId}?funnel=v1-palm`,
    );
    assert.equal(res.status, 200);
    const body = await res.json();

    // 🔴 THE REGRESSION. `in`, not truthiness: the arms are legitimately false for
    // a reader outside both tests, and `false` is the correct answer — but the key
    // being ABSENT is the bug, because the client then renders the plain CTA for
    // someone who was assigned an arm.
    assert.ok('commitmentGate' in body.userData, 'commitmentGate missing from resume payload');
    assert.ok('orderBump' in body.userData, 'orderBump missing from resume payload');
    assert.ok('bumpCopy' in body.userData, 'bumpCopy missing from resume payload');

    // Shape, so a junk value can never reach the offer card or the Stripe line.
    assert.equal(typeof body.userData.commitmentGate, 'boolean');
    assert.equal(typeof body.userData.orderBump, 'boolean');
    assert.ok(['control', 'A', 'B'].includes(body.userData.bumpCopy));
  });

  it('hands back her LOCKED price, never a fresh draw', async (t) => {
    if (!serverUp || !hasDb) return t.skip('needs DATABASE_URL and a local server');

    const res = await fetch(
      `${BASE}/api/conversation/resume/${conversationId}?funnel=v1-palm`,
    );
    const body = await res.json();

    // The stored row is the only source. If the resume path ever calls
    // assignVariantIfMissing (which re-draws when a stored variant is no longer
    // servable on this funnel), a new price test would silently re-price a
    // returning reader — chat quoting one number while Stripe charges another.
    assert.equal(body.userData.priceVariantId, '35_palm_u47');
    assert.equal(body.userData.priceDollars, 35);
    assert.equal(body.userData.downsellDollars, 25);
  });

  it('a bad uuid is rejected, and an unknown one 404s', async (t) => {
    if (!serverUp) return t.skip('needs a local server');

    const bad = await fetch(`${BASE}/api/conversation/resume/not-a-uuid`);
    assert.equal(bad.status, 400);

    const missing = await fetch(
      `${BASE}/api/conversation/resume/00000000-0000-4000-8000-000000000000`,
    );
    assert.equal(missing.status, 404);
  });
});
