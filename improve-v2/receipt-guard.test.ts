/**
 * Receipt guard — the DB-level block on the 2026-08 wallet drain, and the matrix that
 * proves it blocks the attack WITHOUT breaking a legitimate refund.
 *
 * THE RULE
 * --------
 * Billing charges a DIFFERENCE (creditTracking.ts:202-203), so `chat_sessions.coins_charged`
 * is a receipt of money already taken. Lowering it on an ACTIVE session makes every later
 * checkpoint re-bill the erased amount — up to 897 coins/30s until the wallet is empty.
 *
 * WHY THIS FILE EXISTS (2026-08-06)
 * ---------------------------------
 * The first cut of the trigger blocked *every* active lowering, on the recorded belief that
 * "every legitimate lowering path sets status='ended' in the same UPDATE". That was verified
 * against endChatSession (:495-515) and the inactive cleanup (:723-733) — and MISSED a third
 * path: the dead-air refund inside checkpointSession itself (:254-277). It refunds the coins
 * and writes a LOWER receipt while the row stays 'active'. The trigger would have rejected it
 * in production, killing the 2026-07-14 dead-air fairness fix on ordinary idle sessions.
 *
 * The fix is intent, not status: a transaction that is genuinely giving the money back says so
 * with `SET LOCAL app.receipt_refund = 'on'`. A stale build, a forgotten Railway service, an
 * anon-key write or a manual SQL accident never sets it, so the block still holds.
 *
 * Test 5 and test 7 are the two that fail against the original trigger.
 *
 * LOCAL ONLY — creates and deletes a throwaway user, and writes billing rows.
 * Refuses any non-localhost DATABASE_URL.
 *
 * Run:  npx tsx --test improve-v2/receipt-guard.test.ts
 */
import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { pool } from '../server/lib/db';
import { checkpointSession, startChatSession } from '../server/lib/creditTracking';

const GUARD_SQL = new URL('./receipt-guard-2026-08-05.sql', import.meta.url);

function requireLocalDb(): string {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('localhost')) {
    throw new Error(
      'receipt-guard test refuses a non-localhost DATABASE_URL. It WRITES billing rows; ' +
      'pointing it at production would corrupt real customer wallets. ' +
      'Switch .env to the localhost line first.',
    );
  }
  return url;
}

/** Independent re-implementation of secondsToCoins() — see billing-ratchet.test.ts for why. */
function expectedCoins(seconds: number, rate: number): number {
  return Math.floor((Math.floor(seconds / 15) * rate) / 4);
}

async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: requireLocalDb() });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function sql<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return withClient(async (c) => (await c.query(text, params)).rows as T[]);
}

/** Install the trigger straight from the .sql file, so the test always tests the committed file. */
async function installGuard(): Promise<void> {
  const text = readFileSync(GUARD_SQL, 'utf8');
  await withClient(async (c) => { await c.query(text); });
}

interface Fixture { userId: string; personaId: string; sessionId: string; rate: number }

async function makeFixture(fundCoins: number): Promise<Fixture> {
  requireLocalDb();
  const personas = await sql(
    `SELECT id, coins_per_minute FROM personas
      WHERE coins_per_minute IS NOT NULL AND is_active = true
      ORDER BY (coins_per_minute = 299) DESC LIMIT 1`,
  );
  if (!personas[0]) throw new Error('No active persona in the local DB. Run `npm run seed` first.');

  const email = `guard-${Date.now()}-${Math.floor(process.hrtime()[1] / 1000)}@test.local`;
  const users = await sql(
    `INSERT INTO users (email, first_name, coin_balance, total_coins_used, email_verified)
     VALUES ($1, 'GuardTest', $2, 0, true) RETURNING id`,
    [email, fundCoins],
  );
  const userId = users[0].id as string;
  const personaId = personas[0].id as string;
  const sessionId = await startChatSession(userId, personaId);
  return { userId, personaId, sessionId, rate: Number(personas[0].coins_per_minute) };
}

const cleanup = (userId: string) => sql(`DELETE FROM users WHERE id = $1`, [userId]);

/** Force a receipt upward without going through billing (raising is always allowed). */
const seedReceipt = (sessionId: string, coins: number) =>
  sql(`UPDATE chat_sessions SET coins_charged = $2 WHERE id = $1`, [sessionId, coins]);

const readSession = async (sessionId: string) =>
  (await sql(
    `SELECT s.coins_charged, s.duration_seconds, s.status, u.coin_balance, u.total_coins_used
       FROM chat_sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
    [sessionId],
  ))[0];

// ---------------------------------------------------------------------------
// 1-4: the original matrix — these must keep passing.
// ---------------------------------------------------------------------------

test('1. BLOCKS the attack: lowering an ACTIVE receipt with no refund intent', async () => {
  await installGuard();
  const f = await makeFixture(10_000);
  try {
    await seedReceipt(f.sessionId, 3513);
    await assert.rejects(
      () => seedReceipt(f.sessionId, 1800),   // the exact August stamp
      /receipt guard/i,
      'the DB must refuse to lower an active receipt',
    );
    assert.equal(Number((await readSession(f.sessionId)).coins_charged), 3513, 'receipt unchanged');
  } finally { await cleanup(f.userId); }
});

test('2. ALLOWS a normal checkpoint raise', async () => {
  await installGuard();
  const f = await makeFixture(10_000);
  try {
    await seedReceipt(f.sessionId, 1000);
    await seedReceipt(f.sessionId, 2000);
    assert.equal(Number((await readSession(f.sessionId)).coins_charged), 2000);
  } finally { await cleanup(f.userId); }
});

test('3. ALLOWS lowering when the session ends in the SAME statement', async () => {
  await installGuard();
  const f = await makeFixture(10_000);
  try {
    await seedReceipt(f.sessionId, 3000);
    await sql(
      `UPDATE chat_sessions SET coins_charged = $2, status = 'ended' WHERE id = $1`,
      [f.sessionId, 1200],
    );
    const s = await readSession(f.sessionId);
    assert.equal(Number(s.coins_charged), 1200);
    assert.equal(s.status, 'ended');
  } finally { await cleanup(f.userId); }
});

test('4. ALLOWS correcting an already-ended row', async () => {
  await installGuard();
  const f = await makeFixture(10_000);
  try {
    await seedReceipt(f.sessionId, 3000);
    await sql(`UPDATE chat_sessions SET status = 'ended' WHERE id = $1`, [f.sessionId]);
    await seedReceipt(f.sessionId, 500);
    assert.equal(Number((await readSession(f.sessionId)).coins_charged), 500);
  } finally { await cleanup(f.userId); }
});

// ---------------------------------------------------------------------------
// 5-6: the gap found 2026-08-06 — a refund must be able to lower an ACTIVE receipt.
// ---------------------------------------------------------------------------

test('5. ALLOWS lowering an ACTIVE receipt inside a declared refund transaction', async () => {
  await installGuard();
  const f = await makeFixture(10_000);
  try {
    await seedReceipt(f.sessionId, 3000);
    await withClient(async (c) => {
      await c.query('BEGIN');
      await c.query(`SET LOCAL app.receipt_refund = 'on'`);
      await c.query(`UPDATE chat_sessions SET coins_charged = $2 WHERE id = $1`, [f.sessionId, 448]);
      await c.query('COMMIT');
    });
    const s = await readSession(f.sessionId);
    assert.equal(Number(s.coins_charged), 448, 'declared refund may lower the receipt');
    assert.equal(s.status, 'active', 'and the customer is still in the chat');
  } finally { await cleanup(f.userId); }
});

test('6. the refund flag is transaction-scoped — it cannot leak to a later write', async () => {
  await installGuard();
  const f = await makeFixture(10_000);
  try {
    await seedReceipt(f.sessionId, 3000);
    await withClient(async (c) => {
      // A legitimate refund happens on this connection...
      await c.query('BEGIN');
      await c.query(`SET LOCAL app.receipt_refund = 'on'`);
      await c.query(`UPDATE chat_sessions SET coins_charged = 2000 WHERE id = $1`, [f.sessionId]);
      await c.query('COMMIT');

      // ...and the very next transaction on the SAME connection must be blocked again.
      await c.query('BEGIN');
      await assert.rejects(
        () => c.query(`UPDATE chat_sessions SET coins_charged = 1800 WHERE id = $1`, [f.sessionId]),
        /receipt guard/i,
        'SET LOCAL must not survive the transaction that set it',
      );
      await c.query('ROLLBACK');
    });
    assert.equal(Number((await readSession(f.sessionId)).coins_charged), 2000);
  } finally { await cleanup(f.userId); }
});

// ---------------------------------------------------------------------------
// 7: the real thing — the production dead-air refund path, with the trigger installed.
// ---------------------------------------------------------------------------

test('7. the REAL dead-air refund in checkpointSession survives the trigger', async () => {
  await installGuard();
  const f = await makeFixture(10_000);
  try {
    // The customer spoke 100s into the session, then went silent for 24h. The idle guard
    // re-bases billing from wall-clock onto last_message_at, so the receipt must come DOWN
    // and the dead air must be refunded — while the session is still 'active'.
    const ACTIVE = 100;
    const IDLE = 24 * 60 * 60;
    await sql(
      `UPDATE chat_sessions SET
         started_at      = (NOW() AT TIME ZONE 'UTC') - (($2::int + $3::int) * interval '1 second'),
         last_message_at = (NOW() AT TIME ZONE 'UTC') - ($3::int * interval '1 second')
       WHERE id = $1`,
      [f.sessionId, ACTIVE, IDLE],
    );
    await seedReceipt(f.sessionId, 3000);

    const before = await readSession(f.sessionId);
    await checkpointSession(f.sessionId);
    const after = await readSession(f.sessionId);

    const owed = expectedCoins(ACTIVE, f.rate);
    assert.equal(Number(after.coins_charged), owed,
      `receipt must be re-based onto active time (${owed}), not left at 3000`);
    assert.ok(Number(after.coins_charged) < Number(before.coins_charged),
      'the dead-air branch must actually have fired (receipt went down)');
    assert.equal(after.status, 'active', 'the session must NOT be ended to work around the guard');
    assert.ok(Number(after.coin_balance) > Number(before.coin_balance),
      'the erased coins must be refunded to the wallet, not just deleted from the receipt');
  } finally { await cleanup(f.userId); }
});

test.after(async () => { await pool.end(); });
