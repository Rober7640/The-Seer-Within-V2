/**
 * Shared fixtures for DB-touching route tests (supertest + node:test).
 *
 * Every helper that CREATES a row also REGISTERS it for deletion, so a test
 * file's only cleanup obligation is a single `after(cleanupTestFixtures)`.
 * Nothing here truncates a table or deletes by pattern — rows are removed by
 * the exact id / token that was handed out. See server/lib/testGuards.ts for
 * why that matters (this repo's single DATABASE_URL points at production).
 *
 * Usage:
 *   assertLocalDb();                       // FIRST, at module scope
 *   const app = createTestApp('/api/evelyn-lander', evelynLanderRouter);
 *   const user = await createTestUser({ emailVerified: true });
 *   after(async () => { await cleanupTestFixtures(); await pool.end(); });
 */

import express, { type Express, type Router } from 'express';
import { inArray } from 'drizzle-orm';
import { db } from './db';
import { users, evelynLanderSessions } from '@shared/schema';

type NewUser = typeof users.$inferInsert;
type User = typeof users.$inferSelect;

const createdUserIds: string[] = [];
const createdLanderSessionTokens: string[] = [];

/** Monotonic within a process; keeps generated emails/tokens unique. */
let seq = 0;
function stamp(): string {
  return `${Date.now()}-${process.pid}-${++seq}`;
}

/**
 * An Express app with the same body parsing production applies (server/index.ts:44-53),
 * with `router` mounted at the same path `server/routes.ts` mounts it.
 * The Stripe `verify` hook and request-id middleware are deliberately omitted —
 * neither affects routing or body shape.
 */
export function createTestApp(mountPath: string, router: Router): Express {
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
 * Deletes exactly the rows this module handed out, children first.
 * Idempotent — safe to call from more than one `after()` hook.
 */
export async function cleanupTestFixtures(): Promise<void> {
  if (createdLanderSessionTokens.length > 0) {
    await db
      .delete(evelynLanderSessions)
      .where(inArray(evelynLanderSessions.sessionToken, createdLanderSessionTokens));
    createdLanderSessionTokens.length = 0;
  }
  if (createdUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
}
