/**
 * Shared fixtures for DB-touching route tests (supertest + node:test).
 *
 * Every helper that CREATES a row also REGISTERS it for deletion, so a test
 * file's only cleanup obligation is a single `after(cleanupTestFixtures)`.
 * Nothing here truncates a table or deletes by pattern — rows are removed by
 * the exact id / token that was handed out. See server/lib/testGuards.ts for
 * why that matters (this repo's single DATABASE_URL points at production).
 *
 * Note on assertLocalDb() placement: ES import hoisting runs `./db` before any
 * statement in the importing module, so the guard does NOT execute before the
 * Pool is constructed — it executes before the first QUERY, which is what
 * actually matters (server/lib/db.ts:16 builds the Pool lazily and issues
 * nothing at load). If you later import a module that queries at load time,
 * that ordering no longer protects you.
 *
 * Usage:
 *   assertLocalDb();                       // at module scope, above the first test
 *   const app = createTestApp('/api/evelyn-lander', evelynLanderRouter);
 *   const user = await createTestUser({ emailVerified: true });
 *   after(async () => { await cleanupTestFixtures(); await pool.end(); });
 */

import express, { type Express, type Router } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  evelynLanderSessions,
  soulmateLanderSessions,
  magicLinkTokens,
  personas,
  safetyViolations,
} from '@shared/schema';
import { generateMagicLinkToken } from './magicLink';
import { assertNoOutboundCalls } from './testGuards';

type NewUser = typeof users.$inferInsert;
type User = typeof users.$inferSelect;

const createdUserIds: string[] = [];
const createdLanderSessionTokens: string[] = [];
const createdSoulmateSessionIds: string[] = [];
const createdMagicLinkTokens: string[] = [];
const createdSafetyViolationMessages: string[] = [];

/** Monotonic within a process; keeps generated emails/tokens unique. */
let seq = 0;
function stamp(): string {
  return `${Date.now()}-${process.pid}-${++seq}`;
}

/**
 * An Express app with the same body parsing production applies (server/index.ts:44-53),
 * with `router` mounted at the same path `server/routes.ts` mounts it.
 *
 * Deliberately omitted from production's stack, none of which affects routing or
 * body shape for the routes tested so far:
 *   - `express.json({ verify })`'s rawBody hook (server/index.ts:44-51) — Stripe only.
 *   - `express.text({ type: 'text/plain' })` (server/index.ts:53) — no route here
 *     accepts text/plain.
 *   - `requestIdMiddleware` (server/index.ts:56).
 *   - `app.set('trust proxy', 1)` (server/index.ts:36). NOTE for a future task:
 *     without it, `extractClientIp(req)` resolves to the socket address rather
 *     than the first X-Forwarded-For hop. POST /start persists that value
 *     (evelyn_lander_sessions.ip_address), so a test asserting IP-derived
 *     behaviour would see a different value than production — add
 *     `app.set('trust proxy', 1)` to the app under test in that case.
 */
export function createTestApp(mountPath: string, router: Router): Express {
  // Every route test funnels through here, so this is the one place that can
  // guarantee no suite mails, tracks or validates against a live third party.
  // Calling it per-file did not work: a file that forgot the call would still
  // PASS while making real outbound requests, because the assertions never look
  // at the "not configured" log line. See server/lib/testGuards.ts for the keys
  // and why .env alone is not safe (it holds the production values).
  assertNoOutboundCalls();

  // Routers under test carry the real rate limiters, which disable themselves
  // ONLY via rateLimiter.ts:3 (`NODE_ENV === 'test' || DISABLE_RATE_LIMIT === 'true'`).
  // landerLimiter is 5 requests/hour/IP in production mode, and a single suite
  // easily exceeds that from one IP — so without this, tests would fail with 429s
  // that look like route bugs. NODE_ENV comes from .env.test, which is git-ignored
  // and machine-specific, so fail loudly rather than mysteriously on a fresh clone.
  if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_RATE_LIMIT !== 'true') {
    throw new Error(
      'createTestApp() requires rate limiting to be disabled, or suites will 429.\n' +
        `Got NODE_ENV=${process.env.NODE_ENV ?? '(unset)'}, DISABLE_RATE_LIMIT=${process.env.DISABLE_RATE_LIMIT ?? '(unset)'}.\n` +
        'Run route tests with: npm run test:local <file>\n' +
        'and make sure your git-ignored .env.test sets NODE_ENV=test ' +
        '(copy the shape documented in server/lib/testGuards.ts).',
    );
  }

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(mountPath, router);
  return app;
}

/**
 * Inserts a real `users` row and returns it. `email` and `firstName` default to
 * unique throwaway values; pass any column in `overrides` to vary the fixture
 * (`emailVerified`, `accountStatus`, `passwordHash`, `coinBalance`, ...).
 */
export async function createTestUser(overrides: Partial<NewUser> = {}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      email: `fixture-${stamp()}@eval.internal`,
      firstName: 'Fixture',
      ...overrides,
    })
    .returning();
  createdUserIds.push(row.id);
  return row;
}

/**
 * Registers a `users.id` for cleanup. Use when the ROUTE creates the account
 * (POST /api/auth/register, /magic-register) rather than createTestUser() —
 * the response body's `user.id` is the handle. Same contract as
 * trackLanderSession(): exact-by-id, never a pattern delete.
 */
export function trackUserId(userId: string): string {
  createdUserIds.push(userId);
  return userId;
}

/**
 * Registers a lander sessionToken for cleanup. Use when the ROUTE creates the
 * row (POST /start) rather than the fixture.
 */
export function trackLanderSession(sessionToken: string): string {
  createdLanderSessionTokens.push(sessionToken);
  return sessionToken;
}

/** A unique, already-tracked lander sessionToken (8-128 chars per the /start schema). */
export function landerSessionToken(label: string): string {
  return trackLanderSession(`test-${label}-${stamp()}`);
}

/**
 * Inserts a `soulmate_lander_sessions` row linked to `userId` — the state a real
 * /soulmate signup leaves behind (soulmateLanderSignup.ts:145-149).
 *
 * Tracked BY ID and deleted explicitly, because unlike evelyn_lander_sessions this
 * table's resolvedUserId FK is `onDelete: "set null"`, not cascade — deleting the
 * user would orphan the row rather than remove it.
 */
export async function createSoulmateLanderSession(userId: string): Promise<string> {
  const [row] = await db
    .insert(soulmateLanderSessions)
    .values({ email: `fixture-soulmate-${stamp()}@eval.internal`, resolvedUserId: userId })
    .returning({ id: soulmateLanderSessions.id });
  createdSoulmateSessionIds.push(row.id);
  return row.id;
}

/**
 * Registers a `safetyViolations.userMessage` value for cleanup. checkAndLogSafety()
 * (server/lib/universalSafety.ts) writes violations as a fire-and-forget side effect
 * of a route call — there's no id or FK back to the row that triggered it (the table's
 * own sessionId column FKs to chat_sessions, not any lander session table), so the
 * exact literal text sent is the only precise handle. Pass the SAME string the route
 * was sent; cleanupTestFixtures() deletes any row with that exact userMessage.
 */
export function trackSafetyViolation(userMessage: string): string {
  createdSafetyViolationMessages.push(userMessage);
  return userMessage;
}

/**
 * Mints a REAL magic-link token for `userId` via the production
 * generateMagicLinkToken(), and registers it for cleanup. Resolves the persona
 * FK by slug rather than hard-coding a uuid, since persona ids differ per
 * database. Requires that persona to be seeded (`npm run seed`).
 */
export async function createMagicLinkToken(
  userId: string,
  personaSlug = 'evelyn-cross',
): Promise<string> {
  const [persona] = await db
    .select({ id: personas.id })
    .from(personas)
    .where(eq(personas.slug, personaSlug))
    .limit(1);
  if (!persona) {
    throw new Error(
      `createMagicLinkToken: persona '${personaSlug}' is not seeded in this database. ` +
        'Run `npm run seed` against your local Postgres.',
    );
  }

  const token = await generateMagicLinkToken(userId, persona.id, personaSlug);
  createdMagicLinkTokens.push(token);
  return token;
}

/**
 * Deletes exactly the rows this module handed out, children first.
 * Idempotent — safe to call from more than one `after()` hook.
 */
export async function cleanupTestFixtures(): Promise<void> {
  if (createdMagicLinkTokens.length > 0) {
    // Also cascades from users, but delete explicitly so the registry stays the
    // single source of truth for what this module created.
    await db
      .delete(magicLinkTokens)
      .where(inArray(magicLinkTokens.token, createdMagicLinkTokens));
    createdMagicLinkTokens.length = 0;
  }
  if (createdUserIds.length > 0) {
    // Magic-link tokens minted by a ROUTE rather than by createMagicLinkToken()
    // — POST /api/evelyn-lander/check-email mints one for a verified account and
    // never hands the raw token back, so the owning user id is the only handle a
    // test has. Still exact-by-id (these users are ours), never a pattern delete.
    // Redundant with the users cascade below, but keeps this module the single
    // source of truth for the rows it caused to exist.
    await db.delete(magicLinkTokens).where(inArray(magicLinkTokens.userId, createdUserIds));
  }
  if (createdLanderSessionTokens.length > 0) {
    await db
      .delete(evelynLanderSessions)
      .where(inArray(evelynLanderSessions.sessionToken, createdLanderSessionTokens));
    createdLanderSessionTokens.length = 0;
  }
  if (createdSoulmateSessionIds.length > 0) {
    await db
      .delete(soulmateLanderSessions)
      .where(inArray(soulmateLanderSessions.id, createdSoulmateSessionIds));
    createdSoulmateSessionIds.length = 0;
  }
  if (createdSafetyViolationMessages.length > 0) {
    await db
      .delete(safetyViolations)
      .where(inArray(safetyViolations.userMessage, createdSafetyViolationMessages));
    createdSafetyViolationMessages.length = 0;
  }
  if (createdUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
}
