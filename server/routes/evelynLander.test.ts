// Route-level tests for the Evelyn lander API (server/routes/evelynLander.ts).
//
// Run with:  npm run test:local server/routes/evelynLander.test.ts
// (`tsx --env-file=.env.test --test` — assertLocalDb() below refuses to run
// against the production Supabase URL in .env.)
//
// Only POST /start is exercised here. /start is deliberately LLM-free — it
// calls selectStaticOpener(), a pure lookup table (evelynLanderEngine.ts:76).
// The Haiku call lives in generateTurnReply(), reached only from /turn, which
// no test here touches.
//
// ADDING A SUITE: declare another `describe(...)` below and build rows with the
// server/lib/testFixtures.ts helpers. The module-level `after()` at the bottom
// already tears down everything those helpers handed out and closes the pool —
// do not add a second `pool.end()`, it would kill any suite that runs after it.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { assertLocalDb } from '../lib/testGuards';

assertLocalDb();

import { eq } from 'drizzle-orm';
import { db, pool } from '../lib/db';
import { evelynLanderSessions } from '@shared/schema';
import { generateToken } from '../lib/auth';
import {
  createTestApp,
  createTestUser,
  landerSessionToken,
  cleanupTestFixtures,
} from '../lib/testFixtures';
import evelynLanderRouter from './evelynLander';

const HAS_DB = Boolean(process.env.DATABASE_URL);

// Mirrors server/lib/auth.ts:10 so hand-rolled tokens are signed with whatever
// secret verifyToken() will actually check against.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

// Mounted exactly as production mounts it (server/routes.ts:351).
const app = createTestApp('/api/evelyn-lander', evelynLanderRouter);

// Module-level: runs once, after every suite in this file.
after(async () => {
  await cleanupTestFixtures();
  await pool.end();
});

describe('POST /api/evelyn-lander/start — already-authenticated caller', { skip: !HAS_DB }, () => {
  it('resolves directly to v2_active for a valid, verified JWT, skipping email/token checks', async () => {
    const user = await createTestUser({ emailVerified: true, firstName: 'Verified' });
    const token = generateToken(user.id, user.email);
    const sessionToken = landerSessionToken('jwt-active');

    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionToken, campaign: 'jwt-test-campaign' });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'v2_active');
    assert.equal(res.body.isReturning, true);
    assert.equal(res.body.firstName, 'Verified');

    // The session row is what POST /cta reads to pick the handoff action, so the
    // segment + user must actually be persisted, not just echoed in the response.
    const [row] = await db
      .select()
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.sessionToken, sessionToken))
      .limit(1);
    assert.equal(row.resolvedSegment, 'v2_active');
    assert.equal(row.resolvedUserId, user.id);
  });

  it('does NOT resolve to v2_active for an unverified account\'s JWT', async () => {
    const user = await createTestUser({ emailVerified: false });
    const token = generateToken(user.id, user.email);

    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionToken: landerSessionToken('jwt-unverified'), campaign: 'jwt-test-campaign' });

    assert.equal(res.status, 200);
    assert.notEqual(res.body.segment, 'v2_active');
  });

  it('falls through to brand_new with no Authorization header, as today', async () => {
    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .send({ sessionToken: landerSessionToken('anon') });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'brand_new');
  });

  // Beyond the brief. The auth branch reads an attacker-controlled header, so
  // every way it can be wrong must degrade to "no header" rather than 500.
  //
  // The `forged` and `expired` payloads name a REAL verified+active user, so the
  // ONLY thing standing between them and a v2_active skip is verifyToken()
  // rejecting the credential. If they named a nonexistent user they'd fall
  // through even with signature/expiry checking broken, and prove nothing.
  it('falls through instead of erroring on a malformed, forged or expired Authorization header', async () => {
    const victim = await createTestUser({ emailVerified: true });
    const claims = { userId: victim.id, email: victim.email };

    const cases: Record<string, string> = {
      garbage: 'Bearer not-a-jwt',
      empty: 'Bearer ',
      wrongScheme: 'Basic YWJjOmRlZg==',
      forged: `Bearer ${jwt.sign(claims, 'not-the-real-secret')}`,
      expired: `Bearer ${jwt.sign(claims, JWT_SECRET, { expiresIn: '-1s' })}`,
    };

    // Guard the guard: the same claims, correctly signed and unexpired, MUST
    // reach v2_active — otherwise the assertions below would pass vacuously.
    const control = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${generateToken(victim.id, victim.email)}`)
      .send({ sessionToken: landerSessionToken('bad-control') });
    assert.equal(control.body.segment, 'v2_active');

    for (const [label, header] of Object.entries(cases)) {
      const res = await request(app)
        .post('/api/evelyn-lander/start')
        .set('Authorization', header)
        .send({ sessionToken: landerSessionToken(`bad-${label}`) });

      assert.equal(res.status, 200, `${label} should not error`);
      assert.equal(res.body.segment, 'brand_new', `${label} should fall through`);
    }
  });

  // Beyond the brief. A correctly-signed token can outlive its user row (account
  // deleted while the 7-day JWT is still valid).
  it('falls through for a correctly-signed JWT whose user no longer exists', async () => {
    const token = generateToken('00000000-0000-0000-0000-000000000000', 'ghost@eval.internal');

    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionToken: landerSessionToken('jwt-ghost') });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'brand_new');
  });

  // Beyond the brief. resolveSegment already refuses non-'active' accounts on the
  // email path (`if (user.accountStatus !== 'active')` in the email branch); the
  // JWT path must not become a way around it.
  it('does NOT resolve to v2_active for a verified but suspended or banned account', async () => {
    for (const accountStatus of ['suspended', 'banned', 'flagged_for_review']) {
      const user = await createTestUser({ emailVerified: true, accountStatus });
      const token = generateToken(user.id, user.email);

      const res = await request(app)
        .post('/api/evelyn-lander/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionToken: landerSessionToken(`jwt-${accountStatus}`) });

      assert.equal(res.status, 200);
      assert.notEqual(res.body.segment, 'v2_active', `${accountStatus} must not be v2_active`);
    }
  });

  // Beyond the brief. The first test's name claims the JWT branch runs BEFORE the
  // email/token branches; this is what actually proves it.
  it('lets the JWT win over an email param that would resolve to another segment', async () => {
    const authed = await createTestUser({ emailVerified: true, firstName: 'Authed' });
    const other = await createTestUser({ passwordHash: 'x', firstName: 'Other' });
    const token = generateToken(authed.id, authed.email);
    const sessionToken = landerSessionToken('jwt-beats-email');

    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionToken, email: other.email });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'v2_active');
    assert.equal(res.body.firstName, 'Authed');

    const [row] = await db
      .select()
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.sessionToken, sessionToken))
      .limit(1);
    assert.equal(row.resolvedUserId, authed.id);
  });
});
