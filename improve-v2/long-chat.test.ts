/**
 * Long chat, end to end, WITH the receipt guard installed.
 *
 * WHY
 * ---
 * The August drain presented as "long chats break". The precise threshold was never 30
 * minutes — it was ~6 minutes. The stale writer computed its ceiling as
 * secondsToCoins(1800s, 60/min) = 1,800 COINS. Under the pre-flip 60-coins/min pricing that
 * really was 30 minutes of chat; after the flip to 299/min, 1,800 coins is 6m02s. So every
 * session past six minutes had its receipt stamped down to 1800 and was re-billed the
 * difference at up to 897 coins/30s until the wallet emptied.
 *
 * This test walks a funded customer through a 40-minute continuous conversation on 30-second
 * heartbeats — straight through the 1,800-coin threshold that used to be fatal, and out past
 * the 30-minute MAX_BILLABLE_SECONDS cap — and asserts the customer is billed correctly and
 * never interrupted.
 *
 * It is deliberately funded far beyond the cost, so that "did the chat survive" is measured
 * independently of "did they run out of money".
 *
 * LOCAL ONLY — creates and deletes a throwaway user, and writes billing rows.
 *
 * Run:  npx tsx --test improve-v2/long-chat.test.ts
 */
import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { pool } from '../server/lib/db';
import { checkpointSession, startChatSession } from '../server/lib/creditTracking';

const GUARD_SQL = new URL('./receipt-guard-2026-08-05.sql', import.meta.url);

const HEARTBEAT = 30;              // startHeartbeat() interval
const MAX_BILLABLE_SECONDS = 1800; // creditTracking.ts:18 — the 30-minute billing ceiling
const CHAT_SECONDS = 40 * 60;      // a 40-minute conversation
const FUNDED = 40_000;             // ~$400 — never the limiting factor here

/** Independent re-implementation of secondsToCoins() — see billing-ratchet.test.ts for why. */
function expectedCoins(seconds: number, rate: number): number {
  return Math.floor((Math.floor(seconds / 15) * rate) / 4);
}

function requireLocalDb(): string {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('localhost')) {
    throw new Error(
      'long-chat test refuses a non-localhost DATABASE_URL. It WRITES billing rows; ' +
      'pointing it at production would corrupt real customer wallets.',
    );
  }
  return url;
}

async function sql<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const c = new Client({ connectionString: requireLocalDb() });
  await c.connect();
  try { return (await c.query(text, params)).rows as T[]; } finally { await c.end(); }
}

test('a 40-minute conversation bills correctly and is never interrupted', async () => {
  await sql(readFileSync(GUARD_SQL, 'utf8'));   // the guard is installed for this whole run

  const personas = await sql(
    `SELECT id, coins_per_minute FROM personas
      WHERE coins_per_minute IS NOT NULL AND is_active = true
      ORDER BY (coins_per_minute = 299) DESC LIMIT 1`,
  );
  if (!personas[0]) throw new Error('No active persona in the local DB. Run `npm run seed` first.');
  const personaId = personas[0].id as string;
  const rate = Number(personas[0].coins_per_minute);

  const email = `longchat-${Date.now()}@test.local`;
  const userId = (await sql(
    `INSERT INTO users (email, first_name, coin_balance, total_coins_used, email_verified)
     VALUES ($1, 'LongChat', $2, 0, true) RETURNING id`, [email, FUNDED],
  ))[0].id as string;

  try {
    const sessionId = await startChatSession(userId, personaId);

    let previousReceipt = 0;
    let crossedTheOldThreshold = false;
    let billingStoppedAt: number | null = null;

    for (let elapsed = HEARTBEAT; elapsed <= CHAT_SECONDS; elapsed += HEARTBEAT) {
      // The customer is talking throughout: last_message_at keeps up with the clock, so the
      // idle guard never trips and this stays a genuine ACTIVE long chat.
      await sql(
        `UPDATE chat_sessions SET
           started_at      = (NOW() AT TIME ZONE 'UTC') - ($2::int * interval '1 second'),
           last_message_at = (NOW() AT TIME ZONE 'UTC')
         WHERE id = $1`,
        [sessionId, elapsed],
      );

      await checkpointSession(sessionId);

      const s = (await sql(
        `SELECT s.coins_charged, s.status, u.coin_balance, u.total_coins_used
           FROM chat_sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
        [sessionId],
      ))[0];
      const receipt = Number(s.coins_charged);
      const owed = expectedCoins(Math.min(elapsed, MAX_BILLABLE_SECONDS), rate);

      assert.equal(s.status, 'active',
        `at ${elapsed}s the chat must still be open — a long chat is never force-ended`);
      assert.ok(receipt >= previousReceipt,
        `at ${elapsed}s the receipt went DOWN (${previousReceipt} -> ${receipt}); that is the drain`);
      assert.equal(receipt, owed,
        `at ${elapsed}s the customer must be charged exactly what the time is worth`);
      assert.equal(Number(s.total_coins_used), receipt,
        `at ${elapsed}s the wallet debit must equal the receipt — no coins taken off-ledger`);
      assert.equal(Number(s.coin_balance), FUNDED - receipt,
        `at ${elapsed}s the remaining balance must be fully explained by the receipt`);

      // The exact point the August drain used to fire.
      if (!crossedTheOldThreshold && receipt >= 1800) {
        crossedTheOldThreshold = true;
        assert.ok(elapsed < 7 * 60,
          'sanity: 1,800 coins should be reached around 6 minutes at 299/min');
      }
      if (billingStoppedAt === null && receipt === previousReceipt && elapsed > MAX_BILLABLE_SECONDS) {
        billingStoppedAt = elapsed;
      }
      previousReceipt = receipt;
    }

    assert.ok(crossedTheOldThreshold,
      'the chat must actually have passed the 1,800-coin mark, or it proves nothing');

    // Documented behaviour, asserted so a future change to MAX_BILLABLE_SECONDS is loud:
    // past 30 minutes the amount owed stops growing, so the customer keeps talking for free.
    assert.equal(previousReceipt, expectedCoins(MAX_BILLABLE_SECONDS, rate),
      'billing must plateau at the 30-minute ceiling, not keep climbing');
    assert.ok(billingStoppedAt !== null && billingStoppedAt <= MAX_BILLABLE_SECONDS + HEARTBEAT * 2,
      'the plateau must begin right after the 30-minute mark');
  } finally {
    await sql(`DELETE FROM users WHERE id = $1`, [userId]);
  }
});

test.after(async () => { await pool.end(); });
