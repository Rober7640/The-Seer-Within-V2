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
  createMagicLinkToken,
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

  // Beyond the brief. The first test's name claims the JWT branch runs before the
  // email branch; this is what actually proves it. (Precedence is
  // magic token > JWT > email param — the magic-token half is covered below.)
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

// Precedence between a live magic link and a JWT already in localStorage.
// Operator decision 2026-08-02: the MAGIC LINK wins. A reader who clicks a link
// minted for account B is making a fresher, more deliberate statement about who
// they mean to be than a JWT for account A left over in their browser — and a
// magic link that silently did nothing would look broken.
describe('POST /api/evelyn-lander/start — magic token vs. JWT precedence', { skip: !HAS_DB }, () => {
  it('lets a valid magic link for another account beat the JWT in the browser', async () => {
    const a = await createTestUser({ emailVerified: true, firstName: 'Ayla' });
    const b = await createTestUser({ emailVerified: true, firstName: 'Bruno' });
    const jwtForA = generateToken(a.id, a.email);

    // Control: A's JWT alone genuinely CAN win. Without this the main assertion
    // below would also pass if the JWT branch were broken outright.
    const control = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${jwtForA}`)
      .send({ sessionToken: landerSessionToken('prec-control') });
    assert.equal(control.body.segment, 'v2_active');
    assert.equal(control.body.firstName, 'Ayla');

    // JWT for A + live magic link for B → B wins.
    const sessionToken = landerSessionToken('prec-mismatch');
    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${jwtForA}`)
      .send({ sessionToken, token: await createMagicLinkToken(b.id) });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'token_magic');
    assert.equal(res.body.firstName, 'Bruno');

    // The persisted row is what /cta reads to mint the JWT, so the identity
    // swap has to be real there, not just in the response.
    const [row] = await db
      .select()
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.sessionToken, sessionToken))
      .limit(1);
    assert.equal(row.resolvedSegment, 'token_magic');
    assert.equal(row.resolvedUserId, b.id);
    assert.notEqual(row.resolvedUserId, a.id);
  });

  it('resolves to a single, coherent result when the magic link and the JWT agree', async () => {
    const user = await createTestUser({ emailVerified: true, firstName: 'Same' });
    const sessionToken = landerSessionToken('prec-same');

    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${generateToken(user.id, user.email)}`)
      .send({ sessionToken, token: await createMagicLinkToken(user.id) });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'token_magic');
    assert.equal(res.body.isReturning, true);

    // Exactly one session row — proves the two branches don't both handle the
    // request (the token branch returns, so the auth branch never runs).
    const rows = await db
      .select()
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.sessionToken, sessionToken));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].resolvedUserId, user.id);
  });

  // The regression risk in reordering: the token branch must FALL THROUGH on a
  // bad token, not return, or an authenticated reader with a stale link would be
  // stranded on brand_new.
  it('still gives an authenticated reader the skip when the magic token is invalid', async () => {
    const user = await createTestUser({ emailVerified: true, firstName: 'Stale' });
    // Well-formed for the zod schema (min 16 / max 128) but not in the DB, so
    // verifyMagicLinkToken() returns null — same shape as expired or revoked.
    const deadToken = 'deadbeef'.repeat(8);

    // Control: the dead token on its own resolves to brand_new. This is what
    // makes the main assertion non-vacuous — it proves v2_active below comes
    // from the JWT and not from the token somehow succeeding.
    const control = await request(app)
      .post('/api/evelyn-lander/start')
      .send({ sessionToken: landerSessionToken('dead-control'), token: deadToken });
    assert.equal(control.body.segment, 'brand_new');

    const sessionToken = landerSessionToken('dead-plus-jwt');
    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${generateToken(user.id, user.email)}`)
      .send({ sessionToken, token: deadToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'v2_active');
    assert.equal(res.body.firstName, 'Stale');

    const [row] = await db
      .select()
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.sessionToken, sessionToken))
      .limit(1);
    assert.equal(row.resolvedUserId, user.id);
    // hadToken records that a token WAS supplied, even though it didn't resolve.
    assert.equal(row.hadToken, true);
  });
});
