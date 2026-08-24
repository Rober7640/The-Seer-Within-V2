// Route-level tests for the auth API (server/routes/auth.ts).
//
// Run with:  npm run test:local server/routes/auth.test.ts
// (`tsx --env-file=.env.test --test` — assertLocalDb() below refuses to run
// against the production Supabase URL in .env, and assertNoOutboundCalls()
// refuses to run against the live Resend / PostHog / Turnstile / NeverBounce
// keys that .env also holds.)
//
// SCOPE: the free-minute grant. auth.ts is 1,700 lines and most of it is not
// covered here — this file exists to pin the one thing the Live Thread change
// touches, which is money: what a reader is QUOTED in the verification email
// versus what they actually RECEIVE in coins.
//
// Where the other half is. verificationEmail.ts:52 warns that the quote
// (getFreeMinutesForSignup) and the grant (auth.ts's coin constants) must move in
// lockstep, and a previous task shipped a bug of exactly that kind. This file is
// the GRANT half — what lands in a wallet. The QUOTE half is
// server/lib/verificationEmail.freeMinutes.test.ts; the two were one file until
// the whole-branch review pointed out that assertLocalDb() below made eight
// pure-function cases un-runnable without a Postgres. Read them together and
// change them together. `npm run test:live-thread` runs both.
//
// WHICH BRANCH EACH SUITE MEASURES — this matters, and is easy to get wrong:
//   POST /register        under NODE_ENV=test takes auth.ts's `isTestEnv` branch:
//                         it auto-verifies and stamps the coins at registration.
//                         So the register suite measures `testEnvCoinGrant`.
//   GET /verify-email     is the PRODUCTION grant site. Its suite builds the DB
//   POST /magic-verify    state by hand (an unverified user + a linked lander
//                         session) so it runs the real grant chain, with no
//                         dependence on the isTestEnv shortcut above.
//
// ADDING A SUITE: declare another `describe(...)` below and build rows with the
// server/lib/testFixtures.ts helpers. The module-level `after()` at the bottom
// already tears down everything those helpers handed out and closes the pool —
// do not add a second `pool.end()`, it would kill any suite that runs after it.

import { describe, it, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { assertLocalDb, assertNoOutboundCalls } from '../lib/testGuards';

assertLocalDb();
assertNoOutboundCalls();

import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, pool } from '../lib/db';
import { evelynLanderSessions, personas, users } from '@shared/schema';
import { minutesToCoins } from '@shared/types';
import { LIVE_THREAD_FREE_MINUTES } from '../lib/liveThreadEngagement';
import logger from '../lib/logger';
import {
  createTestApp,
  createTestUser,
  createMagicLinkToken,
  landerSessionToken,
  trackUserId,
  cleanupTestFixtures,
} from '../lib/testFixtures';
import authRouter from './auth';

const HAS_DB = Boolean(process.env.DATABASE_URL);

// Mounted exactly as production mounts it (server/routes.ts:340).
const app = createTestApp('/api/auth', authRouter);

// The three grant tiers this file distinguishes, in MINUTES (what the email
// quotes) and in COINS (what the wallet receives). Deriving the coin figures
// through the same minutesToCoins() auth.ts uses is deliberate: a test that
// hard-coded 2990 would still pass if the two sides silently disagreed about
// what a minute costs.
const DEFAULT_MINUTES = 3;
const LANDER_MINUTES = 5;
const DEFAULT_COINS = minutesToCoins(DEFAULT_MINUTES);
const LANDER_COINS = minutesToCoins(LANDER_MINUTES);
const LIVE_THREAD_COINS = minutesToCoins(LIVE_THREAD_FREE_MINUTES);

// Module-level: runs once, after every suite in this file.
after(async () => {
  await cleanupTestFixtures();
  await pool.end();
});

async function personaIdFor(slug: string): Promise<string> {
  const [row] = await db
    .select({ id: personas.id })
    .from(personas)
    .where(eq(personas.slug, slug))
    .limit(1);
  assert.ok(row, `local DB must be seeded with '${slug}' (npm run seed)`);
  return row!.id;
}

/**
 * A lander session row in whatever state the test needs. `resolvedUserId` is the
 * join the two verification routes use to find it; `pendingReply` is the evidence
 * the reader typed something. Both are what the grant chain reads.
 */
async function makeLanderSession(
  label: string,
  opts: { resolvedUserId?: string; pendingReply?: string } = {},
): Promise<string> {
  const sessionToken = landerSessionToken(label);
  await db.insert(evelynLanderSessions).values({
    sessionToken,
    resolvedSegment: 'brand_new',
    resolvedUserId: opts.resolvedUserId ?? null,
    pendingReply: opts.pendingReply ?? null,
    campaign: 'auth-test-campaign',
  });
  return sessionToken;
}

async function coinBalanceOf(userId: string): Promise<number> {
  const [row] = await db
    .select({ coinBalance: users.coinBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row!.coinBalance;
}

/** An unverified account holding a fresh, unexpired verification token. */
async function unverifiedUserWithToken(overrides: Record<string, unknown> = {}) {
  const verificationToken = randomUUID();
  const user = await createTestUser({
    emailVerified: false,
    coinBalance: 0,
    welcomeCoinsGrantedAt: null,
    verificationToken,
    verificationTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  });
  return { user, verificationToken };
}

// ---------------------------------------------------------------------------
// The QUOTE half of the lockstep LIVES IN A SIBLING FILE — read them together.
//
//   server/lib/verificationEmail.freeMinutes.test.ts
//
// Eight pure-function cases pinning what getFreeMinutesForSignup() quotes,
// including that LIVE_THREAD_FREE_MINUTES is 5 (without which every assertion
// BELOW is tautological — they all compare against the constant, so retuning it
// to 4 would keep this whole file green). They were written here on purpose, to
// sit beside the grant they must stay in lockstep with. They were moved out
// because assertLocalDb() at the top of this file made them unreachable without a
// local Postgres, and a pure-logic case that needs a database is a case nobody
// runs. `npm run test:pure` runs them in a fresh clone.
//
// CHANGING EITHER SIDE MEANS CHANGING BOTH, IN THE SAME COMMIT. That was already
// verificationEmail.ts's rule; the split does not relax it.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Registration. Under NODE_ENV=test this is the isTestEnv branch (see header).
// ---------------------------------------------------------------------------
describe('POST /api/auth/register — Live Thread engagement', { skip: !HAS_DB }, () => {
  async function register(body: Record<string, unknown>) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `auth-test-${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2)}@eval.internal`,
        password: 'password123',
        firstName: 'Test',
        ...body,
      });
    if (res.status === 201) trackUserId(res.body.user.id);
    return res;
  }

  it('grants the Live Thread amount when the lander session carries a pendingReply', async () => {
    const sessionToken = await makeLanderSession('register-engaged', {
      pendingReply: '444. Every day.',
    });

    const res = await register({
      persona: 'evelyn-cross',
      source: 'evelyn-lander',
      landerSessionToken: sessionToken,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.coinBalance, LIVE_THREAD_COINS);
    assert.equal(await coinBalanceOf(res.body.user.id), LIVE_THREAD_COINS);
  });

  it('grants only the lander amount when the session has no pendingReply', async () => {
    const sessionToken = await makeLanderSession('register-silent');

    const res = await register({
      persona: 'evelyn-cross',
      source: 'evelyn-lander',
      landerSessionToken: sessionToken,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.coinBalance, LANDER_COINS);
  });

  // The gate. A pendingReply on some session is not a claim on its own: the
  // signup has to be the Evelyn lander, because that is the only combination the
  // verification-time grant chain will ever resolve to the Live Thread amount.
  it('ignores a pendingReply when the signup is not an Evelyn-lander signup', async () => {
    const sessionToken = await makeLanderSession('register-wrong-source', {
      pendingReply: 'I typed this on a different funnel.',
    });

    const res = await register({
      persona: 'evelyn-cross',
      source: 'persona-lander',
      landerSessionToken: sessionToken,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.coinBalance, DEFAULT_COINS);
  });

  it('still registers normally when the lander session token matches nothing', async () => {
    const res = await register({
      persona: 'evelyn-cross',
      source: 'evelyn-lander',
      landerSessionToken: landerSessionToken('register-unknown'),
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.coinBalance, LANDER_COINS);
  });
});

// ---------------------------------------------------------------------------
// The GRANT half of the lockstep — the real production site.
// ---------------------------------------------------------------------------
describe('GET /api/auth/verify-email/:token — the coins a reader receives', { skip: !HAS_DB }, () => {
  it('grants the Live Thread amount when the linked session carries a pendingReply', async () => {
    const { user, verificationToken } = await unverifiedUserWithToken({
      defaultPersonaId: await personaIdFor('evelyn-cross'),
    });
    await makeLanderSession('verify-engaged', {
      resolvedUserId: user.id,
      pendingReply: '444. Every day.',
    });

    const res = await request(app).get(`/api/auth/verify-email/${verificationToken}`);

    assert.equal(res.status, 302);
    assert.equal(await coinBalanceOf(user.id), LIVE_THREAD_COINS);
  });

  it('grants only the lander amount when the linked session has no pendingReply', async () => {
    const { user, verificationToken } = await unverifiedUserWithToken({
      defaultPersonaId: await personaIdFor('evelyn-cross'),
    });
    await makeLanderSession('verify-silent', { resolvedUserId: user.id });

    const res = await request(app).get(`/api/auth/verify-email/${verificationToken}`);

    assert.equal(res.status, 302);
    assert.equal(await coinBalanceOf(user.id), LANDER_COINS);
  });

  // The linkage really is required. A session that was never stamped with
  // resolved_user_id is invisible to both grant sites, exactly as it already is
  // for the plain 5-minute lander grant — so a pendingReply on an unlinked row
  // buys nothing.
  it('grants the persona default when a session has a pendingReply but was never linked', async () => {
    const { user, verificationToken } = await unverifiedUserWithToken({
      defaultPersonaId: await personaIdFor('evelyn-cross'),
    });
    await makeLanderSession('verify-unlinked', { pendingReply: 'nobody knows this is mine' });

    const res = await request(app).get(`/api/auth/verify-email/${verificationToken}`);

    assert.equal(res.status, 302);
    assert.equal(await coinBalanceOf(user.id), DEFAULT_COINS);
  });

  // The persona half, on the grant side this time — mirrors the quote assertion
  // above so both halves are pinned by the same condition.
  it('grants the persona default when the reader is engaged but not an Evelyn user', async () => {
    const { user, verificationToken } = await unverifiedUserWithToken({
      defaultPersonaId: await personaIdFor('marcus-stone'),
    });
    await makeLanderSession('verify-nonevelyn', {
      resolvedUserId: user.id,
      pendingReply: 'typed, but on the wrong guide',
    });

    const res = await request(app).get(`/api/auth/verify-email/${verificationToken}`);

    assert.equal(res.status, 302);
    // marcus-stone is seeded at the same 897¢ default as the fallback.
    assert.equal(await coinBalanceOf(user.id), DEFAULT_COINS);
  });
});

describe('POST /api/auth/magic-verify — the coins a reader receives', { skip: !HAS_DB }, () => {
  it('grants the Live Thread amount when the linked session carries a pendingReply', async () => {
    const user = await createTestUser({
      emailVerified: false,
      coinBalance: 0,
      defaultPersonaId: await personaIdFor('evelyn-cross'),
    });
    await makeLanderSession('magic-engaged', {
      resolvedUserId: user.id,
      pendingReply: '444. Every day.',
    });
    const token = await createMagicLinkToken(user.id);

    const res = await request(app).post('/api/auth/magic-verify').send({ token });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.coinBalance, LIVE_THREAD_COINS);
    assert.equal(await coinBalanceOf(user.id), LIVE_THREAD_COINS);
  });

  it('grants only the lander amount when the linked session has no pendingReply', async () => {
    const user = await createTestUser({
      emailVerified: false,
      coinBalance: 0,
      defaultPersonaId: await personaIdFor('evelyn-cross'),
    });
    await makeLanderSession('magic-silent', { resolvedUserId: user.id });
    const token = await createMagicLinkToken(user.id);

    const res = await request(app).post('/api/auth/magic-verify').send({ token });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.coinBalance, LANDER_COINS);
  });
});

// ---------------------------------------------------------------------------
// Pre-existing coverage gap (not part of the Live Thread change): the route has
// no HTTP-layer test at all, and reissueVerificationEmail()'s personaSlug
// override — the thing that keeps a resent link landing in the right guide's
// chat rather than on generic /login — is exercised by nothing.
//
// Observed through sendVerificationEmail()'s own "Resend not configured" log
// line, which prints the exact URL the email body would have carried. That is
// the real artifact, not a re-derivation of it.
// ---------------------------------------------------------------------------
describe('POST /api/auth/resend-verification', { skip: !HAS_DB }, () => {
  function captureVerificationUrls(): { urls: string[]; restore: () => void } {
    const urls: string[] = [];
    const spy = mock.method(logger, 'warn', (message: any) => {
      if (typeof message === 'string' && message.includes('Verification URL for')) {
        urls.push(message);
      }
    });
    return { urls, restore: () => spy.mock.restore() };
  }

  it('lets the request persona override the account default in the resent link', async () => {
    const user = await createTestUser({
      emailVerified: false,
      defaultPersonaId: await personaIdFor('evelyn-cross'),
    });

    const capture = captureVerificationUrls();
    let res;
    try {
      res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: user.email, persona: 'aiden-powers' });
    } finally {
      capture.restore();
    }

    assert.equal(res!.status, 200);
    assert.equal(capture.urls.length, 1);
    assert.match(
      capture.urls[0],
      /\?persona=aiden-powers/,
      'the body persona must win over the account default',
    );

    // And the reissue really did mint a fresh token, not just re-log the old one.
    const [row] = await db
      .select({ verificationToken: users.verificationToken })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    assert.ok(row!.verificationToken);
    assert.match(capture.urls[0], new RegExp(row!.verificationToken!));
  });
});
