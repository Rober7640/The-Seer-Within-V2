// Regression test for the context-window bug (improve-v2 checklist #1).
// The history query used .orderBy(sentAt).limit(20) — the FIRST 20 messages of a
// session — so long sessions went blind to their own recent turns (loops,
// in-session amnesia). The fix keeps a head+tail window: the first 10 messages
// (session opening — names, initial disclosure) plus the most recent 30, with an
// explicit omission note between them when middle messages are cut. This test
// seeds a 60-message session and proves the built context contains exactly that
// window in chronological order.
//
//   npm run test:local server/lib/chatEngine.contextWindow.test.ts
//
// Requires DATABASE_URL (skips otherwise). Seeds temp persona/user/session
// rows and deletes them afterwards — which is why assertLocalDb() runs at module
// scope below: `dotenv/config` loads .env, whose DATABASE_URL is PRODUCTION
// Supabase, so without the guard the plain `tsx --test` invocation this header
// used to recommend seeded and deleted rows in the live database.

import 'dotenv/config'; // must load DATABASE_URL before ./db builds the pool
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { personas, users, chatSessions, chatMessages } from '../../shared/schema';
import { _buildMessageContext } from './chatEngine';

const HAS_DB = Boolean(process.env.DATABASE_URL);
const STAMP = Date.now();
const TOTAL_MESSAGES = 60;
const HEAD = 10;
const TAIL = 30;
const T0 = new Date('2026-01-01T00:00:00.000Z');

let personaId: string;
let userId: string;
let sessionId: string;

describe('context window keeps the session opening plus the most recent messages', { skip: !HAS_DB }, () => {
  before(async () => {
    const [persona] = await db
      .insert(personas)
      .values({
        slug: `ctxwindow-test-${STAMP}`,
        displayName: 'Context Window Test Guide',
        baseSystemPrompt: 'You are a test guide for a context-window regression test.',
        isActive: true,
      })
      .returning({ id: personas.id });
    personaId = persona.id;

    const [user] = await db
      .insert(users)
      .values({
        email: `ctxwindow-test-${STAMP}@eval.internal`,
        firstName: 'CtxWindow',
        coinBalance: 100000,
      })
      .returning({ id: users.id });
    userId = user.id;

    const [session] = await db
      .insert(chatSessions)
      .values({ userId, personaId, status: 'active' })
      .returning({ id: chatSessions.id });
    sessionId = session.id;

    // 60 messages, alternating user/assistant, one minute apart.
    await db.insert(chatMessages).values(
      Array.from({ length: TOTAL_MESSAGES }, (_, i) => ({
        sessionId,
        userId,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `msg-${i + 1}`,
        sentAt: new Date(T0.getTime() + i * 60_000),
      })),
    );
  });

  after(async () => {
    if (sessionId) await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
    if (personaId) await db.delete(personas).where(eq(personas.id, personaId));
    await pool.end();
  });

  it('includes the first 10 and last 30 messages in order, with an omission note between', async () => {
    const { messages } = await _buildMessageContext(
      {
        id: personaId,
        displayName: 'Context Window Test Guide',
        baseSystemPrompt: 'You are a test guide for a context-window regression test.',
        personality: null,
        aiModel: null,
        basicModel: null,
        coinsPerMinute: 60,
      },
      userId,
      sessionId,
    );

    // Strip injected persona-reinforcement/system turns; keep real history only.
    const history = messages
      .map((m) => m.content)
      .filter((c) => c.startsWith('msg-'));

    const expected = [
      ...Array.from({ length: HEAD }, (_, i) => `msg-${i + 1}`), // msg-1 … msg-10
      ...Array.from({ length: TAIL }, (_, i) => `msg-${TOTAL_MESSAGES - TAIL + i + 1}`), // msg-31 … msg-60
    ];
    assert.deepEqual(history, expected);

    // The gap between head and tail must be flagged with the omitted count.
    const note = messages.find((m) => m.content.startsWith('[CONVERSATION NOTE:'));
    assert.ok(note, 'expected an omission note for the hidden middle messages');
    assert.match(note!.content, /20 earlier messages/);

    // The note must sit between the head block and the tail block.
    const noteIdx = messages.findIndex((m) => m.content.startsWith('[CONVERSATION NOTE:'));
    const lastHeadIdx = messages.findIndex((m) => m.content === `msg-${HEAD}`);
    const firstTailIdx = messages.findIndex((m) => m.content === `msg-${TOTAL_MESSAGES - TAIL + 1}`);
    assert.ok(lastHeadIdx < noteIdx && noteIdx < firstTailIdx, 'omission note must sit in the gap');
  });

  // sendMessage saves the incoming user message BEFORE building context, then
  // appends it explicitly after. Without excluding the saved row from the tail
  // query the model receives the current message twice in a row — it reads as
  // the user repeating themselves ("you said it twice", found live at rung 2).
  it('excludes the just-saved current message so it is never in the window twice', async () => {
    const [currentMsg] = await db
      .insert(chatMessages)
      .values({
        sessionId,
        userId,
        role: 'user',
        content: 'current-msg',
        sentAt: new Date(T0.getTime() + TOTAL_MESSAGES * 60_000),
      })
      .returning({ id: chatMessages.id });

    const { messages } = await _buildMessageContext(
      {
        id: personaId,
        displayName: 'Context Window Test Guide',
        baseSystemPrompt: 'You are a test guide for a context-window regression test.',
        personality: null,
        aiModel: null,
        basicModel: null,
        coinsPerMinute: 60,
      },
      userId,
      sessionId,
      undefined,
      undefined,
      currentMsg.id,
    );

    const contents = messages.map((m) => m.content);
    assert.ok(
      !contents.includes('current-msg'),
      'the excluded current message must not appear in the built history',
    );

    // The window itself must be unaffected: same head, tail ends at msg-60.
    const history = contents.filter((c) => c.startsWith('msg-'));
    assert.equal(history[0], 'msg-1');
    assert.equal(history[history.length - 1], `msg-${TOTAL_MESSAGES}`);
    assert.equal(history.length, HEAD + TAIL);

    await db.delete(chatMessages).where(eq(chatMessages.id, currentMsg.id));
  });
});
