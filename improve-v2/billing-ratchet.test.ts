/**
 * The billing ratchet — repro for the wallet-drain behind the `1800` sessions (2026-08-04).
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * `improve-v2/playwright/billing-1800-anomaly.spec.ts` drove 200–1900s sessions through the
 * real billing code and passed 9/9. It tests the ARITHMETIC, and the arithmetic is correct.
 * It resets `coins_charged = 0` and then settles the session ONCE, so it can never see this
 * bug — which only appears ACROSS REPEATED HEARTBEAT CYCLES. That blind spot is why the
 * fault reached production.
 *
 * THE MECHANISM UNDER TEST
 * ------------------------
 * Billing is charged as a DIFFERENCE (server/lib/creditTracking.ts:202-203):
 *
 *     coinsToDeductNow = secondsToCoins(elapsed, rate) - row.coins_charged
 *
 * `chat_sessions.coins_charged` is therefore a RECEIPT of money already taken, and the whole
 * scheme rests on one rule: **the receipt must never go down unless the money goes back.**
 *
 * `server/lib/creditTracking.ts:326-332` — the block commented `// NUCLEAR FIX` — breaks that
 * rule. It lowers `coins_charged` and refunds nothing:
 *
 *     coins_charged = LEAST(coins_charged, ${maxBillableCoins})
 *
 * Every subsequent heartbeat then re-charges the erased difference, capped at 897 coins per
 * 30-second cycle — up to 1,794 coins/min, i.e. $17.94/min against an advertised $2.99 —
 * until the balance reaches zero.
 *
 * Real damage measured on production: sakunthala.265@gmail.com lost $208.39 across two
 * sessions (936s and 976s), both of which recorded exactly `coins_charged = 1800`.
 * See docs/root-cause-1800-wallet-drain-2026-08-04.md.
 *
 * WHAT EACH TEST SHOULD DO RIGHT NOW
 * ----------------------------------
 *   1. "steady heartbeats"      → EXPECTED PASS. Proves the loop is safe when nothing
 *                                 rewrites the receipt, so a failure in test 2 can only be
 *                                 caused by the rewrite itself.
 *   2. "receipt lowered"        → EXPECTED FAIL until the fix lands. This is the bug.
 *   3. "clamp refunds"          → EXPECTED FAIL until the fix lands. States the rule the
 *                                 NUCLEAR FIX must obey: erase a charge, return the money.
 *
 * Tests 2 and 3 do not simulate a hypothetical. They perform the exact UPDATE that
 * creditTracking.ts:326-332 performs, then let the real billing code react to it.
 *
 * LOCAL ONLY — creates and deletes a throwaway user, and writes billing rows.
 * Refuses any non-localhost DATABASE_URL.
 *
 * Run:  npx tsx --test improve-v2/billing-ratchet.test.ts
 */
import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { pool } from '../server/lib/db';
import { checkpointSession, startChatSession } from '../server/lib/creditTracking';

const BLOCK = 15;                 // BILLING_INTERVAL_SECONDS
const HEARTBEAT_SECONDS = 30;     // startHeartbeat() interval
const STALE_CLAMP = 1800;         // the value seen on all 51 production rows

/**
 * Independent re-implementation of shared/types.ts secondsToCoins(), on purpose: importing
 * the real one would let a bug in it cancel out and the test would pass while production
 * stayed broken.
 */
function expectedCoins(seconds: number, rate: number): number {
  return Math.floor((Math.floor(seconds / BLOCK) * rate) / 4);
}

function requireLocalDb(): string {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('localhost')) {
    throw new Error(
      'billing-ratchet test refuses a non-localhost DATABASE_URL. It WRITES billing rows; ' +
      'pointing it at production would corrupt real customer wallets. ' +
      'Switch .env to the localhost line first.',
    );
  }
  return url;
}

async function sql<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const c = new Client({ connectionString: requireLocalDb() });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}

interface Fixture {
  userId: string;
  personaId: string;
  sessionId: string;
  rate: number;
}

/** A funded user on a 299¢/min persona, with a live session. */
async function makeFixture(fundCoins: number): Promise<Fixture> {
  requireLocalDb();

  const personas = await sql(
    `SELECT id, coins_per_minute FROM personas
      WHERE coins_per_minute IS NOT NULL AND is_active = true
      ORDER BY (coins_per_minute = 299) DESC LIMIT 1`,
  );
  if (!personas[0]) {
    throw new Error('No active persona in the local DB. Run `npm run seed` first.');
  }
  const personaId = personas[0].id as string;
  const rate = Number(personas[0].coins_per_minute);

  const email = `ratchet-${Date.now()}-${Math.floor(process.hrtime()[1] / 1000)}@test.local`;
  const users = await sql(
    `INSERT INTO users (email, first_name, coin_balance, total_coins_used, email_verified)
     VALUES ($1, 'RatchetTest', $2, 0, true) RETURNING id`,
    [email, fundCoins],
  );
  const userId = users[0].id as string;

  const sessionId = await startChatSession(userId, personaId);
  return { userId, personaId, sessionId, rate };
}

async function cleanup(userId: string): Promise<void> {
  // chat_sessions cascades on user delete.
  await sql(`DELETE FROM users WHERE id = $1`, [userId]);
}

/** Advance simulated wall-clock: the session began `elapsed` ago, user just spoke. */
async function setElapsed(sessionId: string, elapsed: number): Promise<void> {
  await sql(
    `UPDATE chat_sessions SET
       started_at      = (NOW() AT TIME ZONE 'UTC') - ($2 * interval '1 second'),
       last_message_at = (NOW() AT TIME ZONE 'UTC')
     WHERE id = $1`,
    [sessionId, elapsed],
  );
}

async function readState(sessionId: string) {
  const rows = await sql(
    `SELECT s.duration_seconds, s.coins_charged, s.promo_coins_charged,
            u.total_coins_used, u.coin_balance
       FROM chat_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = $1`,
    [sessionId],
  );
  return {
    duration: Number(rows[0].duration_seconds),
    charged: Number(rows[0].coins_charged),
    promo: Number(rows[0].promo_coins_charged),
    walletUsed: Number(rows[0].total_coins_used),
    balance: Number(rows[0].coin_balance),
  };
}

/**
 * Drive `cycles` heartbeats 30s apart. `onCycle` runs AFTER each checkpoint, so a test can
 * interfere with the row exactly as the NUCLEAR FIX does mid-session.
 */
async function runHeartbeats(
  f: Fixture,
  cycles: number,
  onCycle?: (cycle: number, elapsed: number) => Promise<void>,
): Promise<number> {
  let elapsed = 0;
  for (let i = 1; i <= cycles; i++) {
    elapsed = i * HEARTBEAT_SECONDS;
    await setElapsed(f.sessionId, elapsed);
    await checkpointSession(f.sessionId);
    if (onCycle) await onCycle(i, elapsed);
  }
  return elapsed;
}

test.after(async () => {
  await pool.end();
});

// ---------------------------------------------------------------------------
// 1. Control — EXPECTED PASS
// ---------------------------------------------------------------------------
test('steady heartbeats: 33 cycles (~16 min) never take more than the time is worth', async () => {
  const f = await makeFixture(500_000); // funded far beyond any legitimate charge
  try {
    const elapsed = await runHeartbeats(f, 33);
    const s = await readState(f.sessionId);
    const owed = expectedCoins(elapsed, f.rate);

    console.log(
      `\n[control]  elapsed=${elapsed}s  owed=${owed}  ` +
      `receipt=${s.charged}  wallet_took=${s.walletUsed}`,
    );

    assert.ok(
      s.walletUsed <= owed + f.rate / 4,
      `wallet took ${s.walletUsed} for ${elapsed}s of chat; the time is only worth ${owed}. ` +
      `If THIS fails, the ratchet does not need the receipt rewrite to start.`,
    );
    assert.equal(
      s.walletUsed, s.charged - s.promo,
      'wallet counter and session receipt must agree when nothing has rewritten the receipt',
    );
  } finally {
    await cleanup(f.userId);
  }
});

// ---------------------------------------------------------------------------
// 2. The bug — EXPECTED FAIL until creditTracking.ts:326-332 is fixed
// ---------------------------------------------------------------------------
test('receipt lowered mid-session (the NUCLEAR FIX) must not re-charge for time already paid', async () => {
  const f = await makeFixture(500_000);
  try {
    // Cycle 14 = 420s elapsed, past the 361s point where a 299¢/min charge first
    // exceeds 1800 — the threshold every one of the 51 production rows sits above.
    const CLAMP_FROM = 14;

    const elapsed = await runHeartbeats(f, 33, async (cycle) => {
      if (cycle >= CLAMP_FROM) {
        // VERBATIM what creditTracking.ts:326-332 does: lower the receipt, refund nothing.
        await sql(
          `UPDATE chat_sessions SET coins_charged = LEAST(coins_charged, $2) WHERE id = $1`,
          [f.sessionId, STALE_CLAMP],
        );
      }
    });

    const s = await readState(f.sessionId);
    const owed = expectedCoins(elapsed, f.rate);
    const overcharge = s.walletUsed - owed;

    console.log(
      `\n[ratchet]  elapsed=${elapsed}s  owed=${owed}  ` +
      `receipt=${s.charged}  wallet_took=${s.walletUsed}  ` +
      `OVERCHARGE=${overcharge} coins ($${(overcharge / 100).toFixed(2)})`,
    );

    assert.ok(
      s.walletUsed <= owed + f.rate / 4,
      `RATCHET REPRODUCED: the wallet took ${s.walletUsed} coins for ${elapsed}s of chat, ` +
      `which is only worth ${owed}. Overcharged by ${overcharge} coins ` +
      `($${(overcharge / 100).toFixed(2)}) because the receipt was lowered to ${STALE_CLAMP} ` +
      `without refunding, so every later heartbeat billed the same seconds again.`,
    );
  } finally {
    await cleanup(f.userId);
  }
});

// ---------------------------------------------------------------------------
// 2b. The production row itself — EXPECTED FAIL until the fix lands
// ---------------------------------------------------------------------------
test("reproduces sakunthala's 2026-08-01 session: $100 balance, 976s, drained to zero", async () => {
  // Her exact conditions: topped up $100 (10,000 coins) at 12:36:20, session ran 976s,
  // ended 12:52:55 with coins_charged = 1800 and a balance of 0.
  const f = await makeFixture(10_000);
  try {
    const CYCLES = Math.floor(976 / HEARTBEAT_SECONDS); // 32 heartbeats
    const elapsed = await runHeartbeats(f, CYCLES, async (cycle) => {
      if (cycle >= 14) {
        await sql(
          `UPDATE chat_sessions SET coins_charged = LEAST(coins_charged, $2) WHERE id = $1`,
          [f.sessionId, STALE_CLAMP],
        );
      }
    });

    const s = await readState(f.sessionId);
    const owed = expectedCoins(elapsed, f.rate);

    console.log(
      `\n[prod-row] elapsed=${elapsed}s  owed=${owed}  receipt=${s.charged}  ` +
      `wallet_took=${s.walletUsed}  balance=${s.balance}` +
      `${s.charged === STALE_CLAMP && s.balance === 0 ? '   <<< PRODUCTION ROW REPRODUCED' : ''}`,
    );

    assert.notEqual(
      s.balance, 0,
      `her balance was emptied: $100 (10,000 coins) bought ${elapsed}s of chat worth only ` +
      `${owed} coins, and the row reads coins_charged=${s.charged} — the same shape as the ` +
      `production row. She was overcharged $${((10_000 - owed) / 100).toFixed(2)} on this session.`,
    );
  } finally {
    await cleanup(f.userId);
  }
});

// ---------------------------------------------------------------------------
// 3. The rule the fix must satisfy — EXPECTED FAIL until the fix lands
// ---------------------------------------------------------------------------
test('lowering the receipt must refund the same amount to the wallet', async () => {
  const f = await makeFixture(500_000);
  try {
    await runHeartbeats(f, 20); // ~600s, receipt now well above the stale clamp
    const before = await readState(f.sessionId);
    assert.ok(
      before.charged > STALE_CLAMP,
      `precondition: receipt (${before.charged}) must exceed ${STALE_CLAMP} for the clamp to bite`,
    );

    const erased = before.charged - STALE_CLAMP;
    await sql(
      `UPDATE chat_sessions SET coins_charged = LEAST(coins_charged, $2) WHERE id = $1`,
      [f.sessionId, STALE_CLAMP],
    );
    const after = await readState(f.sessionId);

    console.log(
      `\n[refund]   receipt ${before.charged} → ${after.charged} (erased ${erased})  ` +
      `balance ${before.balance} → ${after.balance}`,
    );

    assert.equal(
      after.balance, before.balance + erased,
      `${erased} coins were erased from the receipt but not returned to the wallet. ` +
      `Money the customer paid now has no record behind it — this is exactly what makes ` +
      `users.total_coins_used exceed SUM(chat_sessions.coins_charged) on 66 production accounts.`,
    );
  } finally {
    await cleanup(f.userId);
  }
});
