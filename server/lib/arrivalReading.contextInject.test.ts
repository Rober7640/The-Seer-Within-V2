// server/lib/arrivalReading.contextInject.test.ts
//
// Run with: npm run test:local server/lib/arrivalReading.contextInject.test.ts
//
// `dotenv/config` below loads .env — which points DATABASE_URL at PRODUCTION
// Supabase — so assertLocalDb() runs before ./db builds a pool and refuses
// anything that is not a local Postgres. This file INSERTs users, chat sessions
// and lander sessions; without the guard, `tsx --test` on it wrote to production.
import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { users, personas, chatSessions, evelynLanderSessions, emailLinkCodes } from '../../shared/schema';
import { _buildMessageContext } from './chatEngine';

const HAS_DB = Boolean(process.env.DATABASE_URL);
const STAMP = Date.now();

describe('arrival reading is injected into a fresh Evelyn session', { skip: !HAS_DB }, () => {
  let evelyn: { id: string; displayName: string; baseSystemPrompt: string; coinsPerMinute: number } | undefined;
  let userId: string;
  let sessionId: string;

  before(async () => {
    const [p] = await db
      .select({ id: personas.id, displayName: personas.displayName, baseSystemPrompt: personas.baseSystemPrompt, coinsPerMinute: personas.coinsPerMinute })
      .from(personas)
      .where(eq(personas.slug, 'evelyn-cross'))
      .limit(1);
    evelyn = p as any;
    if (!evelyn) return; // handled by skip guard below

    const [u] = await db.insert(users).values({
      email: `arrival-inject-${STAMP}@eval.internal`, firstName: 'Inject', coinBalance: 100000,
    }).returning({ id: users.id });
    userId = u.id;

    // This case asserts the BUILT-IN REGISTRY's copy reaches the prompt, and
    // briefs now resolve email_link_codes FIRST. reframe-04-serious is a cycle-1
    // send that the pipeline refuses to mint (it already went out — see
    // sends/cycle-1/short-links.json), so no such row exists in any real
    // database. A local QA session can easily leave one behind though, and it
    // would silently swap the expected copy for whatever that row said. Clear it
    // so the test asserts against the source it names.
    await db.delete(emailLinkCodes).where(eq(emailLinkCodes.campaign, 'reframe-04-serious'));

    await db.insert(evelynLanderSessions).values({
      sessionToken: `inj-${STAMP}`, resolvedSegment: 'v2_active', resolvedUserId: userId, campaign: 'reframe-04-serious',
    });

    const [s] = await db.insert(chatSessions).values({ userId, personaId: evelyn.id, status: 'active' }).returning({ id: chatSessions.id });
    sessionId = s.id;
  });

  after(async () => {
    if (sessionId) await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
    if (userId) {
      await db.delete(evelynLanderSessions).where(eq(evelynLanderSessions.resolvedUserId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    await pool.end();
  });

  it('places the <arrival_reading> block with the email specifics into the system prompt', async (t) => {
    if (!evelyn) return t.skip('evelyn-cross persona not seeded');
    const { system } = await _buildMessageContext(
      { id: evelyn.id, slug: 'evelyn-cross', displayName: evelyn.displayName, baseSystemPrompt: evelyn.baseSystemPrompt, personality: null, aiModel: null, basicModel: null, coinsPerMinute: evelyn.coinsPerMinute },
      userId,
      sessionId,
    );
    assert.match(system, /<arrival_reading>/);
    assert.match(system, /The tell/);
    assert.match(system, /said twice/i);
  });
});
