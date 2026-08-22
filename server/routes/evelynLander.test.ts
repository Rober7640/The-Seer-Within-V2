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

import { describe, it, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { assertLocalDb } from '../lib/testGuards';

assertLocalDb();

import { eq } from 'drizzle-orm';
import { db, pool } from '../lib/db';
import { evelynLanderSessions, magicLinkTokens, personas, safetyViolations, users } from '@shared/schema';
import { generateToken } from '../lib/auth';
import { verifyMagicLinkToken } from '../lib/magicLink';
import { checkUniversalSafety } from '../lib/universalSafety';
import { LIVE_THREAD_FREE_MINUTES } from '../lib/liveThreadEngagement';
import logger from '../lib/logger';
import { selectStaticOpener } from '../lib/evelynLanderEngine';
import {
  createTestApp,
  createTestUser,
  createEmailLinkCode,
  createMagicLinkToken,
  landerSessionToken,
  trackSafetyViolation,
  createSoulmateLanderSession,
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

describe('POST /api/evelyn-lander/reply', { skip: !HAS_DB }, () => {
  it('stores the reply text against the session row', async () => {
    const sessionToken = landerSessionToken('reply');
    await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });

    const res = await request(app)
      .post('/api/evelyn-lander/reply')
      .send({ sessionToken, reply: '444. Every day.' });

    assert.equal(res.status, 200);

    const [row] = await db.select().from(evelynLanderSessions).where(eq(evelynLanderSessions.sessionToken, sessionToken));
    assert.equal(row.pendingReply, '444. Every day.');
  });

  it('404s for an unknown sessionToken', async () => {
    const res = await request(app).post('/api/evelyn-lander/reply').send({ sessionToken: 'does-not-exist', reply: 'x' });
    assert.equal(res.status, 404);
  });

  it('rejects an empty reply', async () => {
    const sessionToken = landerSessionToken('reply-empty');
    await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });
    const res = await request(app).post('/api/evelyn-lander/reply').send({ sessionToken, reply: '' });
    assert.equal(res.status, 400);
  });

  // Beyond the brief. The brief's implementation writes pendingReply unconditionally
  // on every call — this is deliberate (see report §"reason about" point 3): a
  // reader may edit their typed reply before submitting, and the second call must
  // win, not be rejected or concatenated onto the first.
  it('overwrites a previously stored reply with the latest call', async () => {
    const sessionToken = landerSessionToken('reply-overwrite');
    await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });

    await request(app).post('/api/evelyn-lander/reply').send({ sessionToken, reply: 'first draft' });
    const res = await request(app).post('/api/evelyn-lander/reply').send({ sessionToken, reply: 'final version' });

    assert.equal(res.status, 200);
    const [row] = await db.select().from(evelynLanderSessions).where(eq(evelynLanderSessions.sessionToken, sessionToken));
    assert.equal(row.pendingReply, 'final version');
  });

  // Beyond the brief. reply is capped at 2000 chars (matches turnSchema's userMessage
  // cap) — proves the boundary is enforced, not just documented in the schema.
  it('rejects a reply over 2000 chars', async () => {
    const sessionToken = landerSessionToken('reply-toolong');
    await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });
    const res = await request(app)
      .post('/api/evelyn-lander/reply')
      .send({ sessionToken, reply: 'x'.repeat(2001) });
    assert.equal(res.status, 400);
  });

  // Round 2/3: crisis/safety screening. Strings are pulled verbatim from
  // server/lib/universalSafety.test.ts's own fixtures so these tests stay aligned
  // with the real detector rather than drifting from an invented phrase.
  describe('safety screening', () => {
    // From universalSafety.test.ts's `crisisMessages` (hard crisis: safe=false).
    const HARD_CRISIS_TEXT = 'I want to kill myself';
    // From universalSafety.test.ts's `deniedMessages` (soft crisis: safe=true,
    // violationType='crisis', softCrisisNote set).
    const SOFT_CRISIS_TEXT = 'I would never kill myself';
    // From universalSafety.test.ts's `nonEnglishMessages` (non-crisis violation:
    // safe=false, violationType='non_english'). Represents the six non-crisis
    // ViolationTypes (inappropriate, prompt_injection, harassment, gibberish,
    // non_english, minor) that must NOT block storage — only 'crisis' does.
    const NON_ENGLISH_TEXT = 'estoy muy triste hoy';

    // checkAndLogSafety() logs a violation as fire-and-forget (universalSafety.ts's
    // own "don't await to keep response fast" comment) — the row may not exist the
    // instant the HTTP response returns. Poll briefly so the assertion is real
    // rather than either flaky or skipped.
    async function waitForSafetyViolation(userMessage: string, timeoutMs = 1000) {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const [row] = await db
          .select()
          .from(safetyViolations)
          .where(eq(safetyViolations.userMessage, userMessage))
          .limit(1);
        if (row) return row;
        if (Date.now() >= deadline) return undefined;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    it('flags a hard-crisis reply with the hotline response and does NOT store it', async () => {
      const sessionToken = landerSessionToken('reply-crisis-hard');
      trackSafetyViolation(HARD_CRISIS_TEXT);
      await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });

      const res = await request(app)
        .post('/api/evelyn-lander/reply')
        .send({ sessionToken, reply: HARD_CRISIS_TEXT });

      // Still a 200 — mirrors /turn's shape (blocked is a body field, not a
      // status code) — but ok:false + blocked:'safety' tells the client not to
      // advance to the email ask.
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, false);
      assert.equal(res.body.blocked, 'safety');
      assert.ok(res.body.reply.includes('988'), 'hard-crisis response should include the 988 hotline');

      // The point of this test: the flagged text must NOT become the reader's
      // pendingReply (Task 10 would otherwise replay it as a cheerful chat
      // opener). Reading the row back, not just trusting the response body.
      const [row] = await db.select().from(evelynLanderSessions).where(eq(evelynLanderSessions.sessionToken, sessionToken));
      assert.equal(row.pendingReply, null);

      // Minor fix: assert the safetyViolations row actually exists rather than
      // just asserting it in a comment (the write is fire-and-forget with a
      // swallowing catch, so this is the only way to know it really landed).
      const violation = await waitForSafetyViolation(HARD_CRISIS_TEXT);
      assert.ok(violation, 'expected a safetyViolations row for the flagged text');
      assert.equal(violation!.violationType, 'crisis');
      assert.equal(violation!.flaggedForReview, true);
    });

    it('lets a soft-crisis reply through exactly like an ordinary safe reply', async () => {
      // Control, matching universalSafety.test.ts's own assertSoftCrisis() guard:
      // proves SOFT_CRISIS_TEXT really is classified safe:true/violationType:'crisis'
      // right now, independent of this route's response shape (which deliberately
      // doesn't surface that classification — see report). Without this, the test
      // below would still pass if the detector's classification of this exact
      // string ever drifted (e.g. to a hard crisis, or to no violation at all).
      const classification = checkUniversalSafety(SOFT_CRISIS_TEXT);
      assert.equal(classification.safe, true, 'fixture must still classify as soft (safe)');
      assert.equal(classification.violationType, 'crisis', 'fixture must still be a crisis-type soft note');

      // checkAndLogSafety() logs soft-crisis detections too (universalSafety.ts's
      // "Log soft crisis detections" block), so this test leaks a safetyViolations
      // row exactly like the hard-crisis and non-crisis tests without this.
      trackSafetyViolation(SOFT_CRISIS_TEXT);

      const sessionToken = landerSessionToken('reply-crisis-soft');
      await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });

      const res = await request(app)
        .post('/api/evelyn-lander/reply')
        .send({ sessionToken, reply: SOFT_CRISIS_TEXT });

      // Mirrors /turn: safe:true + softCrisisNote doesn't block the normal flow.
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.blocked, undefined);

      // Proves it isn't just accepted at the HTTP layer — it's actually stored,
      // same as the ordinary safe path.
      const [row] = await db.select().from(evelynLanderSessions).where(eq(evelynLanderSessions.sessionToken, sessionToken));
      assert.equal(row.pendingReply, SOFT_CRISIS_TEXT);
    });

    // Critical-fix regression test: a non-crisis violation (non_english here,
    // standing in for the other five non-crisis ViolationTypes) must NOT block
    // storage. Round 2 accidentally gated on the generic `!safety.safe &&
    // safety.response`, which fires for all 7 violation types — this reply would
    // have been silently dropped (pendingReply stayed null, ok:false, no hotline
    // in the response) under that bug. This is the test that would have caught it.
    it('stores a non-crisis violation (non_english) and lets the reader through', async () => {
      const classification = checkUniversalSafety(NON_ENGLISH_TEXT);
      assert.equal(classification.safe, false, 'fixture must still classify as an unsafe (blocked) message');
      assert.equal(classification.violationType, 'non_english', 'fixture must still be non_english, not crisis');

      const sessionToken = landerSessionToken('reply-crisis-nonenglish');
      trackSafetyViolation(NON_ENGLISH_TEXT);
      await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });

      const res = await request(app)
        .post('/api/evelyn-lander/reply')
        .send({ sessionToken, reply: NON_ENGLISH_TEXT });

      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.blocked, undefined);

      const [row] = await db.select().from(evelynLanderSessions).where(eq(evelynLanderSessions.sessionToken, sessionToken));
      assert.equal(row.pendingReply, NON_ENGLISH_TEXT);

      // The violation is still logged for review — non-crisis screening isn't
      // bypassed, only the storage block is.
      const violation = await waitForSafetyViolation(NON_ENGLISH_TEXT);
      assert.ok(violation, 'expected a safetyViolations row for the non-crisis violation');
      assert.equal(violation!.violationType, 'non_english');
    });

    // Non-vacuity guard for the tests above: proves the normal path is
    // unaffected by the new safety check — same 200/ok:true/stored-value
    // behavior as this describe block's very first test, run again after the
    // safety gate was added.
    it('leaves an ordinary safe reply completely unaffected', async () => {
      const sessionToken = landerSessionToken('reply-crisis-safe-control');
      await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });

      const res = await request(app)
        .post('/api/evelyn-lander/reply')
        .send({ sessionToken, reply: '444. Every day.' });

      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);

      const [row] = await db.select().from(evelynLanderSessions).where(eq(evelynLanderSessions.sessionToken, sessionToken));
      assert.equal(row.pendingReply, '444. Every day.');
    });
  });
});

// Account detection at the email ask (Frame 1.5). Three outcomes, deliberately
// enumerable — the plan accepts account enumeration here and mitigates it with
// accountDetectionLimiter, so these tests assert the DISTINCT outcomes on purpose.
//
// No mail can leave the machine: .env.test sets RESEND_API_KEY empty, so both
// senders this route reaches take their "not configured" branch and log the URL
// instead (verificationEmail.ts:229, and the same guard inline in the route).
describe('POST /api/evelyn-lander/check-email', { skip: !HAS_DB }, () => {
  const CHECK_EMAIL = '/api/evelyn-lander/check-email';

  function magicLinksFor(userId: string) {
    return db.select().from(magicLinkTokens).where(eq(magicLinkTokens.userId, userId));
  }

  it('returns verified_match for an existing verified account', async () => {
    const user = await createTestUser({ emailVerified: true });

    const res = await request(app).post(CHECK_EMAIL).send({ email: user.email });

    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, 'verified_match');
  });

  // The outcome string alone proves nothing about the reader getting back in.
  // The brief's snippet passed `existing.defaultPersonaId ?? ''` as the personaId,
  // which cannot work: magic_link_tokens.persona_id is NOT NULL and FKs to personas
  // (schema.ts:549), and MagicAuthPage sends the reader to `/reading?persona=<slug>`
  // off the token's own personaSlug. So the token has to carry the REAL Evelyn row.
  it('mints a live, Evelyn-scoped magic link for the verified account', async () => {
    const user = await createTestUser({ emailVerified: true });
    const [evelyn] = await db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.slug, 'evelyn-cross'))
      .limit(1);
    assert.ok(evelyn, "local DB must be seeded with 'evelyn-cross' (npm run seed)");

    await request(app).post(CHECK_EMAIL).send({ email: user.email });

    const links = await magicLinksFor(user.id);
    assert.equal(links.length, 1, 'exactly one magic link should be minted');
    assert.equal(links[0].personaSlug, 'evelyn-cross');
    assert.equal(links[0].personaId, evelyn!.id);

    // End-to-end: the token the reader receives must actually authenticate them
    // through the same verifier /magic-auth calls, at the Evelyn destination.
    const verified = await verifyMagicLinkToken(links[0].token);
    assert.equal(verified?.userId, user.id);
    assert.equal(verified?.personaSlug, 'evelyn-cross');
  });

  it('returns unverified_match for an existing unverified account', async () => {
    const user = await createTestUser({ emailVerified: false });

    const res = await request(app).post(CHECK_EMAIL).send({ email: user.email });

    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, 'unverified_match');
  });

  // Beyond the brief. "Resend verification" has to mean a token the reader can
  // actually click — a stale/expired one left on the row would make the outcome
  // string a lie. Mirrors auth.ts's /resend-verification (auth.ts:877-886).
  it('issues a fresh, unexpired verification token and no magic link for the unverified account', async () => {
    const user = await createTestUser({ emailVerified: false, verificationToken: 'stale-token' });

    await request(app).post(CHECK_EMAIL).send({ email: user.email });

    const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    assert.ok(row.verificationToken, 'a verification token should be set');
    assert.notEqual(row.verificationToken, 'stale-token', 'the stale token should be replaced');
    assert.ok(row.verificationTokenExpiry, 'the token needs an expiry');
    assert.ok(row.verificationTokenExpiry! > new Date(), 'the reissued token must not be already expired');

    // An unverified account must NOT get the magic-link path — that would sign
    // them in without ever verifying (spec §Decisions, 2026-08-01).
    assert.equal((await magicLinksFor(user.id)).length, 0);
  });

  it('returns no_match for an unknown email', async () => {
    const res = await request(app)
      .post(CHECK_EMAIL)
      .send({ email: `nobody-${Date.now()}-${process.pid}@eval.internal` });

    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, 'no_match');
  });

  // Beyond the brief. The single most damaging way this route can be wrong: if the
  // lookup doesn't normalize the way registration does (`email.toLowerCase()`,
  // auth.ts:315), a real account reports no_match and the reader is sent down a
  // signup path that then collides with the unique-email constraint.
  it('matches an existing account regardless of the case the reader typed', async () => {
    const user = await createTestUser({ emailVerified: true });

    const res = await request(app).post(CHECK_EMAIL).send({ email: user.email.toUpperCase() });

    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, 'verified_match', 'uppercase input must resolve to the same account');
  });

  it('rejects a malformed email with 400', async () => {
    const res = await request(app).post(CHECK_EMAIL).send({ email: 'not-an-email' });
    assert.equal(res.status, 400);
  });

  it('rejects a missing email with 400', async () => {
    const res = await request(app).post(CHECK_EMAIL).send({});
    assert.equal(res.status, 400);
  });

  // Session linkage. This is what lets Task 10 find the pendingReply the reader
  // parked while anonymous: verify-email / magic-verify only know a userId, and
  // evelyn_lander_sessions.resolved_user_id is the join. /start already writes it for
  // the segments it can resolve; for an anonymous reader it stays NULL until the
  // email identifies them, which is here.
  describe('lander session linkage', () => {
    async function startSession(label: string): Promise<string> {
      const sessionToken = landerSessionToken(label);
      await request(app)
        .post('/api/evelyn-lander/start')
        .send({ sessionToken, campaign: 'check-email-test-campaign' });
      return sessionToken;
    }

    function sessionRow(sessionToken: string) {
      return db
        .select()
        .from(evelynLanderSessions)
        .where(eq(evelynLanderSessions.sessionToken, sessionToken))
        .limit(1);
    }

    it('stamps resolvedUserId on the session for a verified_match', async () => {
      const user = await createTestUser({ emailVerified: true });
      const sessionToken = await startSession('check-verified');

      // Control: an anonymous /start leaves it NULL, so the assertion below is
      // measuring this route's write and not something /start already did.
      const [before] = await sessionRow(sessionToken);
      assert.equal(before.resolvedUserId, null);

      const res = await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });
      assert.equal(res.body.outcome, 'verified_match');

      const [after] = await sessionRow(sessionToken);
      assert.equal(after.resolvedUserId, user.id);
    });

    it('stamps resolvedUserId on the session for an unverified_match', async () => {
      const user = await createTestUser({ emailVerified: false });
      const sessionToken = await startSession('check-unverified');

      const res = await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });
      assert.equal(res.body.outcome, 'unverified_match');

      const [after] = await sessionRow(sessionToken);
      assert.equal(after.resolvedUserId, user.id);
    });

    // The `resolvedUserId IS NULL` guard. /start may already have established an
    // identity from a live magic token or a JWT; a different email typed into the box
    // afterwards must not overwrite it, or the reply would be attached to the wrong
    // account.
    it('does not clobber a resolvedUserId /start already established', async () => {
      const authed = await createTestUser({ emailVerified: true, firstName: 'Authed' });
      const other = await createTestUser({ emailVerified: true, firstName: 'Other' });

      const sessionToken = landerSessionToken('check-noclobber');
      const start = await request(app)
        .post('/api/evelyn-lander/start')
        .set('Authorization', `Bearer ${generateToken(authed.id, authed.email)}`)
        .send({ sessionToken });
      assert.equal(start.body.segment, 'v2_active', 'precondition: /start resolved the JWT');

      await request(app).post(CHECK_EMAIL).send({ email: other.email, sessionToken });

      const [after] = await sessionRow(sessionToken);
      assert.equal(after.resolvedUserId, authed.id, 'the established identity must win');
      assert.notEqual(after.resolvedUserId, other.id);
    });

    // sessionToken is optional — Task 11's component posts only { email } today, and
    // that must keep working.
    it('still returns a normal outcome when no sessionToken is supplied', async () => {
      const user = await createTestUser({ emailVerified: true });

      const res = await request(app).post(CHECK_EMAIL).send({ email: user.email });

      assert.equal(res.status, 200);
      assert.equal(res.body.outcome, 'verified_match');
    });

    // A stale/unknown sessionToken (session row expired or never created) must not
    // fail the request — the linkage is best-effort.
    it('still returns a normal outcome for an unknown sessionToken', async () => {
      const user = await createTestUser({ emailVerified: true });

      const res = await request(app)
        .post(CHECK_EMAIL)
        .send({ email: user.email, sessionToken: landerSessionToken('check-nonexistent') });

      assert.equal(res.status, 200);
      assert.equal(res.body.outcome, 'verified_match');
    });

    // no_match must not link anything — there is no user to link to. Correct today
    // only because of the early return before linkSessionToUser(), which nothing
    // else pins.
    it('leaves resolvedUserId NULL for a no_match even when a sessionToken is sent', async () => {
      const sessionToken = await startSession('check-nomatch');

      const res = await request(app)
        .post(CHECK_EMAIL)
        .send({ email: `nobody-${Date.now()}-${process.pid}@eval.internal`, sessionToken });

      assert.equal(res.body.outcome, 'no_match');

      const [after] = await sessionRow(sessionToken);
      assert.equal(after.resolvedUserId, null);
    });

    // resolveSegment() deliberately refuses to resolve non-active accounts
    // (evelynLander.ts:188-195), and linking one here would hand a banned reader the
    // 5-minute lander grant and a nurture-drip enrolment at verify time. The outcome
    // string must stay identical so the route isn't an account-status oracle.
    it('does not link the session for a non-active account, without changing the outcome', async () => {
      for (const accountStatus of ['banned', 'suspended', 'flagged_for_review']) {
        const user = await createTestUser({ emailVerified: true, accountStatus });
        const sessionToken = await startSession(`check-inactive-${accountStatus}`);

        const res = await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });

        assert.equal(res.body.outcome, 'verified_match', `${accountStatus} outcome must be unchanged`);
        const [after] = await sessionRow(sessionToken);
        assert.equal(after.resolvedUserId, null, `${accountStatus} must not be linked`);
      }
    });
  });

  // The free-minutes quote must match the grant the reader will actually receive.
  // Writing resolved_user_id is NOT inert: isFromEvelynLander() (auth.ts:132-143)
  // returns true on the mere existence of a linked row, which selects
  // EVELYN_LANDER_FREE_COINS (5 min) over the persona default (3) and gates
  // scheduleEvelynVerifiedDrip. So passing `source` is a claim about a grant this
  // route itself just caused, and getting it backwards is the mismatch
  // verificationEmail.ts:50-51 warns about.
  //
  // Observed via the route's own log line, which carries the number
  // reissueVerificationEmail() resolved through the real getFreeMinutesForSignup()
  // — i.e. the number the email body actually printed, not a re-derivation.
  describe('free-minutes quote matches the grant', () => {
    function captureReissueLogs(): { entries: any[]; restore: () => void } {
      const entries: any[] = [];
      const spy = mock.method(logger, 'info', (message: any, meta?: any) => {
        if (message === 'evelyn-lander check-email: verification reissued') entries.push(meta);
      });
      return { entries, restore: () => spy.mock.restore() };
    }

    async function evelynPersonaId(): Promise<string> {
      const [row] = await db
        .select({ id: personas.id })
        .from(personas)
        .where(eq(personas.slug, 'evelyn-cross'))
        .limit(1);
      assert.ok(row, "local DB must be seeded with 'evelyn-cross' (npm run seed)");
      return row!.id;
    }

    async function startSession(label: string): Promise<string> {
      const sessionToken = landerSessionToken(label);
      await request(app)
        .post('/api/evelyn-lander/start')
        .send({ sessionToken, campaign: 'check-email-test-campaign' });
      return sessionToken;
    }

    it('quotes 5 when the session link makes them an Evelyn-lander signup', async () => {
      const user = await createTestUser({
        emailVerified: false,
        defaultPersonaId: await evelynPersonaId(),
      });
      const sessionToken = await startSession('quote-linked');

      const capture = captureReissueLogs();
      try {
        await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });
      } finally {
        capture.restore();
      }

      assert.equal(capture.entries.length, 1);
      assert.equal(capture.entries[0].landerLinked, true);
      assert.equal(capture.entries[0].freeMinutesQuoted, 5);

      // The other half of the lockstep: the row isFromEvelynLander() will find.
      const [row] = await db
        .select()
        .from(evelynLanderSessions)
        .where(eq(evelynLanderSessions.sessionToken, sessionToken))
        .limit(1);
      assert.equal(row.resolvedUserId, user.id);
    });

    // The Live Thread tier. Once linked, a session carrying a pendingReply makes
    // userHasLiveThreadReply() (liveThreadEngagement.ts), read via
    // resolveWelcomeGrantTier(), true at verify time, which selects
    // LIVE_THREAD_FREE_COINS over EVELYN_LANDER_FREE_COINS.
    //
    // ⚠ WEAKENED 2026-08-19. Both constants are now 5, so this case can no longer tell
    // the two tiers apart by their amount — it would stay green even if the tier were
    // resolved wrongly. What it still proves is the WIRING: that the route links the
    // session, sees the parked reply, and reports engagedViaLiveThread — which the two
    // assertions below it check directly. If the amounts ever diverge again, this
    // regains its teeth for free.
    it('quotes the Live Thread amount when the linked session carries a pendingReply', async () => {
      const user = await createTestUser({
        emailVerified: false,
        defaultPersonaId: await evelynPersonaId(),
      });
      const sessionToken = await startSession('quote-livethread');
      const reply = await request(app)
        .post('/api/evelyn-lander/reply')
        .send({ sessionToken, reply: '444. Every day.' });
      assert.equal(reply.body.ok, true, 'precondition: the reply was parked');

      const capture = captureReissueLogs();
      try {
        await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });
      } finally {
        capture.restore();
      }

      assert.equal(capture.entries.length, 1);
      assert.equal(capture.entries[0].landerLinked, true);
      assert.equal(capture.entries[0].engagedViaLiveThread, true);
      assert.equal(capture.entries[0].freeMinutesQuoted, LIVE_THREAD_FREE_MINUTES);
    });

    // PRECEDENCE. The grant chain evaluates isSoulmateLanderUser BEFORE the Evelyn
    // tiers (auth.ts), and a /soulmate signup is created unverified with
    // defaultPersonaId=evelyn-cross plus a linked soulmate row
    // (soulmateLanderSignup.ts:129-149). Such a reader can then click an Evelyn Live
    // Thread email, type a reply, and enter the same address here — satisfying both
    // Evelyn conditions while the grant still resolves to the soulmate tier. Quoting
    // the Live Thread amount here would promise 10 against a grant of 5.
    it('quotes 5, not the Live Thread amount, for a soulmate signup who typed into the thread', async () => {
      const user = await createTestUser({
        emailVerified: false,
        defaultPersonaId: await evelynPersonaId(),
      });
      await createSoulmateLanderSession(user.id);
      const sessionToken = await startSession('quote-soulmate-precedence');
      const reply = await request(app)
        .post('/api/evelyn-lander/reply')
        .send({ sessionToken, reply: '444. Every day.' });
      assert.equal(reply.body.ok, true, 'precondition: the reply was parked');

      const capture = captureReissueLogs();
      try {
        await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });
      } finally {
        capture.restore();
      }

      assert.equal(capture.entries.length, 1);
      assert.equal(
        capture.entries[0].engagedViaLiveThread,
        false,
        'the soulmate tier wins, so the Live Thread quote must not apply',
      );
      assert.equal(capture.entries[0].freeMinutesQuoted, 5);
    });

    // The control for the test above: same route, same linkage, no typed reply.
    it('quotes 5 for a linked reader who typed nothing into the thread', async () => {
      const user = await createTestUser({
        emailVerified: false,
        defaultPersonaId: await evelynPersonaId(),
      });
      const sessionToken = await startSession('quote-livethread-silent');

      const capture = captureReissueLogs();
      try {
        await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });
      } finally {
        capture.restore();
      }

      assert.equal(capture.entries.length, 1);
      assert.equal(capture.entries[0].engagedViaLiveThread, false);
      assert.equal(capture.entries[0].freeMinutesQuoted, 5);
    });

    it('quotes 3 when no session links them, so the grant stays the persona default', async () => {
      const user = await createTestUser({
        emailVerified: false,
        defaultPersonaId: await evelynPersonaId(),
      });

      const capture = captureReissueLogs();
      try {
        // No sessionToken at all — nothing to link, so isFromEvelynLander() is false.
        await request(app).post(CHECK_EMAIL).send({ email: user.email });
      } finally {
        capture.restore();
      }

      assert.equal(capture.entries.length, 1);
      assert.equal(capture.entries[0].landerLinked, false);
      assert.equal(capture.entries[0].freeMinutesQuoted, 3);
    });

    // THE TRAP. On a second submission the UPDATE matches zero rows, because
    // resolved_user_id is already set to this same user — but the row still EXISTS,
    // so isFromEvelynLander() is still true and the grant is still 5. Keying the
    // decision off "did the update write anything" would quote 3 here while granting
    // 5, which is the mismatch pointing the worse way.
    it('still quotes 5 on a repeat submission whose link write is a no-op', async () => {
      const user = await createTestUser({
        emailVerified: false,
        defaultPersonaId: await evelynPersonaId(),
      });
      const sessionToken = await startSession('quote-relink');

      // First call establishes the link.
      await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });

      const capture = captureReissueLogs();
      try {
        await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });
      } finally {
        capture.restore();
      }

      assert.equal(capture.entries.length, 1);
      assert.equal(capture.entries[0].landerLinked, true, 'existence, not rows-updated, decides');
      assert.equal(capture.entries[0].freeMinutesQuoted, 5);
    });

    // The persona half of getFreeMinutesForSignup's condition. A linked row is not
    // enough: isEvelynUser(defaultPersonaId) must also hold, and with no default
    // persona both sides fall to 3 — proving the two conditions really do move
    // together rather than the quote depending on the link alone.
    it('quotes 3 for a linked reader whose default persona is not Evelyn', async () => {
      const user = await createTestUser({ emailVerified: false, defaultPersonaId: null });
      const sessionToken = await startSession('quote-nonevelyn');

      const capture = captureReissueLogs();
      try {
        await request(app).post(CHECK_EMAIL).send({ email: user.email, sessionToken });
      } finally {
        capture.restore();
      }

      assert.equal(capture.entries.length, 1);
      assert.equal(capture.entries[0].landerLinked, true, 'the link itself is written');
      assert.equal(capture.entries[0].freeMinutesQuoted, 3, 'but the persona half fails, so 3');
    });
  });

  // Beyond the brief. verifyMagicLinkToken() refuses any non-'active' account
  // (magicLink.ts:78), so minting and mailing a link to one would send a
  // guaranteed-dead link. soulmateLanderSignup.ts:103-106 already skips the send
  // for that case; this does the same, widened from 'banned' to "not active" to
  // match the verifier's own gate. The outcome is unchanged so the route never
  // becomes an account-status oracle.
  it('mints no magic link for a verified but non-active account', async () => {
    for (const accountStatus of ['banned', 'suspended', 'flagged_for_review']) {
      const user = await createTestUser({ emailVerified: true, accountStatus });

      const res = await request(app).post(CHECK_EMAIL).send({ email: user.email });

      assert.equal(res.status, 200, `${accountStatus} should not error`);
      assert.equal(res.body.outcome, 'verified_match', `${accountStatus} outcome should be unchanged`);
      assert.equal(
        (await magicLinksFor(user.id)).length,
        0,
        `${accountStatus} must not receive a magic link`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Task 15: the campaign's authored continuation line reaches the opener.
//
// The whole email→chat feature's premise is that the lander opens by continuing
// the SPECIFIC email the reader clicked. That line is authored per-send in the
// draft's `**Continue Seed:**` frontmatter and snapshotted into
// `email_link_codes.continue_seed` by the rendering pipeline. /e/:code turns the
// row into `?campaign=<slug>`, the client forwards it here — and until now
// /start threw it away and returned the generic static opener to everyone.
//
// SOURCE OF TRUTH: the `email_link_codes` row, NOT the hardcoded
// `emailReadingBriefs.ts` registry that the chat engine reads. See
// resolveCampaignContinueSeed() in server/lib/emailLinkCodes.ts for the full
// reasoning; the short version is that the row is what the operator authors and
// what the reader's own link was built from.
//
// The comparisons below are made against selectStaticOpener() itself rather than
// against copied copy, so a future rewording of Evelyn's generic lines can't turn
// these into false passes (or false failures).
describe('POST /api/evelyn-lander/start — campaign continueSeed opener', { skip: !HAS_DB }, () => {
  const START = '/api/evelyn-lander/start';
  const brandNewOpener = selectStaticOpener({ firstName: null, bucket: null, isReturning: false });

  function campaignSlug(label: string): string {
    return `t15-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  it("opens with the campaign's authored seed when the campaign resolves", async () => {
    const campaign = campaignSlug('resolves');
    const seed =
      "You came to tell me about your fence — good. Tell me what it is you keep painting the same color.";
    await createEmailLinkCode({ campaign, continueSeed: seed });

    const sessionToken = landerSessionToken('t15-resolves');
    const res = await request(app).post(START).send({ sessionToken, campaign });

    assert.equal(res.status, 200);
    assert.equal(res.body.opener, seed);
    assert.notEqual(res.body.opener, brandNewOpener);

    // Everything else about /start is unchanged — the campaign is still recorded
    // on the session row, which is what arrivalReading.ts later reads.
    const [row] = await db
      .select()
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.sessionToken, sessionToken))
      .limit(1);
    assert.equal(row.campaign, campaign);
    assert.equal(res.body.segment, 'brand_new');
  });

  // 2026-08-20: the card the letter was about travels with the opener, so the
  // lander can show it as its own bubble between her naming it and her asking
  // for something. Most sends have none, and those must be unchanged.
  it("returns the campaign's card image when the letter has one", async () => {
    const campaign = campaignSlug('card');
    const seed = 'You came back about the Devil card — those chains hang loose. Tell me the one you keep going back to.';
    await createEmailLinkCode({ campaign, continueSeed: seed, cardImageUrl: '/tarot/rws-devil.jpg' });

    const res = await request(app)
      .post(START)
      .send({ sessionToken: landerSessionToken('t15-card'), campaign });

    assert.equal(res.status, 200);
    assert.equal(res.body.opener, seed);
    assert.equal(res.body.cardImageUrl, '/tarot/rws-devil.jpg');
  });

  it('returns a null card image for a letter without one', async () => {
    const campaign = campaignSlug('nocard');
    const seed = 'You came back about the green fence. Tell me what you keep painting.';
    await createEmailLinkCode({ campaign, continueSeed: seed });

    const res = await request(app)
      .post(START)
      .send({ sessionToken: landerSessionToken('t15-nocard'), campaign });

    assert.equal(res.status, 200);
    assert.equal(res.body.opener, seed);
    assert.equal(res.body.cardImageUrl, null);
  });

  // An unknown slug falls back to the STATIC opener, which names no card — so it
  // must carry none. A picture under a line that never mentions it is the "reads
  // like an ad" failure the placement rule exists to avoid.
  it('sends no card image when the campaign does not resolve', async () => {
    const res = await request(app)
      .post(START)
      .send({ sessionToken: landerSessionToken('t15-unknown'), campaign: campaignSlug('unknown') });

    assert.equal(res.status, 200);
    assert.equal(res.body.opener, brandNewOpener);
    assert.equal(res.body.cardImageUrl, null);
  });

  // The trade-off this task accepts, made explicit: for a reader whose email
  // param identifies an existing account, the authored line REPLACES the
  // segment-aware "Welcome back, <name>" opener. That is the intent — the seed
  // continues the specific letter they just read, which is more specific than a
  // name — but it is a real behavioural change, so it is pinned by a test rather
  // than left as an accident.
  it("prefers the authored seed over the returning reader's segment opener", async () => {
    const campaign = campaignSlug('returning');
    const seed = 'You came to name your loop — good. Tell me the sentence.';
    await createEmailLinkCode({ campaign, continueSeed: seed });
    const user = await createTestUser({ firstName: 'Nadia', passwordHash: 'x' });

    const sessionToken = landerSessionToken('t15-returning');
    const res = await request(app).post(START).send({ sessionToken, campaign, email: user.email });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'v2_password');
    assert.equal(res.body.isReturning, true);
    assert.equal(res.body.firstName, 'Nadia');
    assert.equal(res.body.opener, seed);
    assert.notEqual(
      res.body.opener,
      selectStaticOpener({ firstName: 'Nadia', bucket: null, isReturning: true }),
    );
  });

  // The FULL cost of the ruling above, on the reader who pays the most for it.
  //
  // The v2_password case is the mildest: that segment's CTA sub-copy still says
  // "Welcome back, {firstName}" (EvelynLanderPage.subCopyFor), so the name
  // survives elsewhere on the page. token_magic's sub-copy is "One tap. We've got
  // you signed in." — no name anywhere — so a magic-link arrival, the highest-
  // intent returning reader this whole feature funnels, loses their first name
  // from the chatbox arm entirely. The bucket-aware returning opener goes with it.
  //
  // And this is not a corner: /e/:code rebuilds BOTH `bucket` and `campaign` into
  // the same query string (emailLinkRedirect.ts), so a returning reader on a short
  // link hits exactly this combination every time. Exercised here with a real
  // magic token and bucket=love, which is what that reader actually sends.
  //
  // OPERATOR RULING (2026-08-02): the campaign line wins, the name is dropped.
  // Pinned here so the trade is explicit rather than implicit — if it is ever
  // revisited, this test is the thing that has to change on purpose.
  it('drops the first name for a token_magic reader, who has no name anywhere else', async () => {
    const campaign = campaignSlug('tokenmagic');
    const seed = 'You came to tell me about your lamp — good. Tell me which one went dark.';
    await createEmailLinkCode({ campaign, continueSeed: seed });
    const user = await createTestUser({ emailVerified: true, firstName: 'Mira' });
    const token = await createMagicLinkToken(user.id);

    const sessionToken = landerSessionToken('t15-tokenmagic');
    const res = await request(app)
      .post(START)
      .send({ sessionToken, campaign, token, bucket: 'love' });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'token_magic');
    assert.equal(res.body.isReturning, true);
    // The name is still RESOLVED and returned — the loss is that the opener no
    // longer uses it, and for this segment nothing else on the page does either.
    assert.equal(res.body.firstName, 'Mira');
    assert.equal(res.body.opener, seed);
    assert.doesNotMatch(res.body.opener, /Mira/);
    // Both halves of what the static opener would have given this reader are gone:
    // the name AND the bucket-aware "the thread we left around love" line.
    assert.notEqual(
      res.body.opener,
      selectStaticOpener({ firstName: 'Mira', bucket: 'love', isReturning: true }),
    );
  });

  it('falls back to the static opener for a campaign with no minted row', async () => {
    const sessionToken = landerSessionToken('t15-unknown');
    const res = await request(app)
      .post(START)
      .send({ sessionToken, campaign: campaignSlug('never-minted') });

    assert.equal(res.status, 200);
    assert.equal(res.body.opener, brandNewOpener);
  });

  it('falls back to the static opener when no campaign is supplied at all', async () => {
    const sessionToken = landerSessionToken('t15-nocampaign');
    const res = await request(app).post(START).send({ sessionToken, bucket: 'love' });

    assert.equal(res.status, 200);
    assert.equal(
      res.body.opener,
      selectStaticOpener({ firstName: null, bucket: 'love', isReturning: false }),
    );
  });

  // `campaign` is a reader-supplied query param: anyone can type any slug. The
  // content it can reach is operator-authored marketing copy that already went
  // out to a whole list, so there is nothing private to leak — but it must never
  // cross personas, or a reader could put Luna's authored line in Evelyn's mouth
  // by guessing a slug. The lookup is keyed on (persona, campaign) for exactly
  // this reason.
  it("does not serve another persona's authored seed for the same campaign slug", async () => {
    const campaign = campaignSlug('cross-persona');
    await createEmailLinkCode({
      campaign,
      continueSeed: "Luna here — the sky moved for you this week, and I want to show you where.",
      personaSlug: 'luna-voss',
    });

    const sessionToken = landerSessionToken('t15-crosspersona');
    const res = await request(app).post(START).send({ sessionToken, campaign });

    assert.equal(res.status, 200);
    assert.equal(res.body.opener, brandNewOpener);
  });

  // Beyond the brief, both of these — but both are ways the authored value can
  // make the lander WORSE than the fallback it replaced, so each gets a test.
  it('falls back when the authored seed is blank', async () => {
    const campaign = campaignSlug('blank');
    await createEmailLinkCode({ campaign, continueSeed: '   \n  ' });

    const sessionToken = landerSessionToken('t15-blank');
    const res = await request(app).post(START).send({ sessionToken, campaign });

    assert.equal(res.status, 200);
    assert.equal(res.body.opener, brandNewOpener);
  });

  // POST /turn validates every history entry at .max(2000) (turnSchema in
  // evelynLander.ts) and the chatbox arm replays the opener back as history[0].
  // An over-long seed would therefore 400 the reader's FIRST message — a worse
  // outcome than a generic opener — so it is refused here instead.
  it('falls back when the authored seed exceeds what POST /turn accepts as history', async () => {
    const campaign = campaignSlug('toolong');
    await createEmailLinkCode({ campaign, continueSeed: 'x'.repeat(2001) });

    const sessionToken = landerSessionToken('t15-toolong');
    const res = await request(app).post(START).send({ sessionToken, campaign });

    assert.equal(res.status, 200);
    assert.equal(res.body.opener, brandNewOpener);
  });
});
