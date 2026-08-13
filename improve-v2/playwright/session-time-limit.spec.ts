/**
 * Session wall-clock limit (2026-08-13) — end-to-end regression for the fix built
 * on 2026-08-12. This is the "NOT verified: the end-to-end flow" gap from that day.
 *
 * WHAT IS UNDER TEST
 * ------------------
 * MAX_BILLABLE_SECONDS (creditTracking.ts:18) caps BILLING at 30 minutes, not the
 * session. Past that point coinsToDeductNow is permanently 0, the balance stops
 * falling, so the only per-message gate (playableBalance <= 0) never trips and the
 * chat runs free and unbounded while every turn still costs a full Anthropic call.
 * server/lib/sessionLimits.ts bounds that window: a session has a maximum life
 * (default 60 min, tunable via system_config.max_session_minutes, '0' = off).
 *
 * WHY IT ASSERTS WHAT IT ASSERTS
 * ------------------------------
 * The gate sits AFTER the credit check and BEFORE loadPersonaConfig, so the three
 * things that must hold are: (1) it fires at the boundary and not before, (2) it
 * costs zero Anthropic spend when it fires, (3) it does not become a back-door
 * price rise — the customer must still never pay for more than 30 minutes. The
 * expected coin ceiling is re-derived here rather than imported, so a bug in the
 * real billing math cannot cancel itself out and pass.
 *
 * LOCAL ONLY. Backdates started_at directly in the DB to simulate a long session
 * (a real 61-minute wait would be unusable) and tops up wallets. Refuses to run
 * against a non-localhost DATABASE_URL.
 *
 * Run:  npx playwright test -c improve-v2/playwright/playwright.config.ts session-time-limit
 */
import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import 'dotenv/config';
import { freshEvelynSession, say, apiSendMessage, apiRegister, uniqueEmail } from './helpers';
import type { EvelynSession } from './helpers';

/** Copied, not imported, from server/lib/sessionLimits.ts. See header. */
const SESSION_LIMIT_TEMPLATE =
  "We've been sitting together for a full hour now, and that's a complete reading. " +
  "Let what came through settle for a while before you reach for it again — the quiet " +
  "afterwards is part of the work. When you're ready to pick the thread back up, " +
  "begin a new reading and I'll be right here waiting for you.";

const RATE = 299;                 // coins per minute (Evelyn, verified against the DB)
const BLOCK = 15;                 // BILLING_INTERVAL_SECONDS
const MAX_BILLABLE_SECONDS = 1800; // the 30-minute billing cap this fix must not move
const CACHE_TTL_MS = 60_000;      // getMaxSessionSeconds() cache window

/** Independent re-implementation of shared/types.ts secondsToCoins(). */
function expectedCoins(seconds: number, rate = RATE): number {
  return Math.floor((Math.floor(seconds / BLOCK) * rate) / 4);
}

/** The most a single session may ever cost: 30 minutes at the persona rate. */
const MAX_SESSION_COINS = expectedCoins(MAX_BILLABLE_SECONDS); // 8970 = $89.70

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('localhost')) {
    throw new Error(
      'session-time-limit spec refuses a non-localhost DATABASE_URL. This test WRITES ' +
      'to the database (backdates sessions, tops up wallets) — pointing it at production ' +
      'would corrupt real billing rows. Switch .env to the localhost line.',
    );
  }
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

/**
 * Make a live session look `minutesOld` minutes old while still being ACTIVELY
 * chatted in. Both columns matter and for different reasons:
 *   • started_at  — what the wall-clock gate measures.
 *   • last_message_at — what endChatSession uses to decide idle-vs-active billing.
 *     Leaving it stale would exercise the idle path (bill active_seconds only) and
 *     silently stop testing the cap. A real customer at minute 61 typed seconds ago.
 */
async function ageSession(sessionId: string, minutesOld: number, idleSeconds = 20) {
  await withDb(async (c) => {
    await c.query(
      `UPDATE chat_sessions
          SET started_at = (NOW() AT TIME ZONE 'UTC') - ($2 || ' minutes')::interval,
              last_message_at = (NOW() AT TIME ZONE 'UTC') - ($3 || ' seconds')::interval
        WHERE id = $1`,
      [sessionId, String(minutesOld), String(idleSeconds)],
    );
  });
}

async function topUpWallet(userId: string, coins: number) {
  await withDb(async (c) => {
    await c.query('UPDATE users SET coin_balance = $2 WHERE id = $1', [userId, coins]);
  });
}

async function readSession(sessionId: string) {
  return withDb(async (c) => {
    const r = await c.query(
      `SELECT status, coins_charged, duration_seconds, ended_at IS NOT NULL AS has_ended_at
         FROM chat_sessions WHERE id = $1`,
      [sessionId],
    );
    return r.rows[0] as {
      status: string;
      coins_charged: number;
      duration_seconds: number;
      has_ended_at: boolean;
    };
  });
}

async function readBalance(userId: string): Promise<number> {
  return withDb(async (c) => {
    const r = await c.query('SELECT coin_balance FROM users WHERE id = $1', [userId]);
    return Number(r.rows[0]?.coin_balance ?? 0);
  });
}

async function lastMessages(sessionId: string, n: number) {
  return withDb(async (c) => {
    const r = await c.query(
      `SELECT role, content FROM chat_messages
        WHERE session_id = $1 ORDER BY sent_at DESC, id DESC LIMIT $2`,
      [sessionId, n],
    );
    return r.rows as { role: string; content: string }[];
  });
}

async function setMaxSessionMinutes(value: string | null) {
  await withDb(async (c) => {
    if (value === null) {
      await c.query(`DELETE FROM system_config WHERE config_key = 'max_session_minutes'`);
      return;
    }
    // config_type is NOT NULL — an INSERT without it fails.
    await c.query(
      `INSERT INTO system_config (config_key, config_value, config_type)
       VALUES ('max_session_minutes', $1, 'number')
       ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value`,
      [value],
    );
  });
}

test.describe('V2 session wall-clock limit', () => {
  // The suite assumes the default (no config row = 60 minutes), which is the shape
  // production will ship in. The rollback test sets the row and clears it again.
  test.beforeAll(async () => {
    await setMaxSessionMinutes(null);
  });

  test('under the limit: a 59-minute session is untouched — the gate does not fire early', async ({ page }) => {
    const s: EvelynSession = await freshEvelynSession(page, 'UnderLimit');
    await topUpWallet(s.userId, 20_000);
    await ageSession(s.sessionId, 59);

    const res = await say(page, s, 'What do you see for me right now?');

    expect(res.sessionActive, 'a 59-minute session must still be active').toBe(true);
    expect(res.message).not.toBe(SESSION_LIMIT_TEMPLATE);
    expect(res.message.length).toBeGreaterThan(0);

    const row = await readSession(s.sessionId);
    expect(row.status).toBe('active');
  });

  test('at the limit: a 61-minute session closes with the canned line and zero API spend', async ({ page }) => {
    const s: EvelynSession = await freshEvelynSession(page, 'OverLimit');
    await topUpWallet(s.userId, 20_000);
    await ageSession(s.sessionId, 61);

    const startedAt = Date.now();
    const res = await say(page, s, 'Tell me more about what you saw.');
    const elapsedMs = Date.now() - startedAt;

    // Byte-identical to the canned constant is the proof that no model generated it.
    expect(res.message).toBe(SESSION_LIMIT_TEMPLATE);
    expect(res.sessionActive, 'the session must be reported as ended').toBe(false);
    expect(res.blocked).toBe(true);

    // A real Evelyn turn is 8-20s. Sub-3s corroborates that no Anthropic call happened.
    expect(elapsedMs, `expected a template short-circuit, took ${elapsedMs}ms`).toBeLessThan(3_000);

    const row = await readSession(s.sessionId);
    expect(row.status).toBe('ended');
    expect(row.has_ended_at).toBe(true);

    // The turn is persisted so the transcript explains why the reading stopped.
    const tail = await lastMessages(s.sessionId, 2);
    expect(tail[0].role).toBe('assistant');
    expect(tail[0].content).toBe(SESSION_LIMIT_TEMPLATE);
    expect(tail[1].role).toBe('user');
  });

  test('the close is not a price rise: a 61-minute session still bills at most 30 minutes', async ({ page }) => {
    const s: EvelynSession = await freshEvelynSession(page, 'BillingCap');
    await topUpWallet(s.userId, 20_000);
    const before = await readBalance(s.userId);
    await ageSession(s.sessionId, 61);

    await say(page, s, 'One more thing before we finish.');

    const row = await readSession(s.sessionId);
    const after = await readBalance(s.userId);
    const deducted = before - after;

    // 61 minutes billed raw would be 18,239 coins ($182.39). The cap must hold.
    const uncapped61Min = expectedCoins(61 * 60);
    expect(uncapped61Min).toBeGreaterThan(MAX_SESSION_COINS); // sanity: the test can fail

    expect(row.coins_charged,
      `session charged ${row.coins_charged} coins; the 30-minute cap is ${MAX_SESSION_COINS}`,
    ).toBeLessThanOrEqual(MAX_SESSION_COINS);
    expect(deducted,
      `wallet lost ${deducted} coins; the 30-minute cap is ${MAX_SESSION_COINS}`,
    ).toBeLessThanOrEqual(MAX_SESSION_COINS);
    expect(deducted).toBe(Number(row.coins_charged));
    expect(row.duration_seconds).toBeLessThanOrEqual(MAX_BILLABLE_SECONDS);
  });

  test('after the close the session is genuinely dead — no further free turns', async ({ page }) => {
    const s: EvelynSession = await freshEvelynSession(page, 'DeadSession');
    await topUpWallet(s.userId, 20_000);
    await ageSession(s.sessionId, 61);

    const closing = await say(page, s, 'Are you still there?');
    expect(closing.message).toBe(SESSION_LIMIT_TEMPLATE);

    // The whole point of the fix: the next turn must be refused, not served free.
    const after = await apiSendMessage(page, s.sessionId, s.token, 'Hello? Still there?');
    expect(after.ok(), 'a closed session must not accept another message').toBeFalsy();
    expect(after.status(), 'SESSION_ENDED maps to 410 — the branch the client already tears down on').toBe(410);
  });

  test('crisis precedence holds at minute 61 — safety answers first, the limit does not swallow it', async ({ page }) => {
    const s: EvelynSession = await freshEvelynSession(page, 'CrisisAtLimit');
    await topUpWallet(s.userId, 20_000);
    await ageSession(s.sessionId, 61);

    const res = await say(page, s, "I don't want to be alive anymore");

    // checkAndLogSafety returns before the gate, so this turn must never be the one
    // that closes the reading — a person in crisis cannot be shown a goodbye line.
    expect(res.message, 'a crisis message must not receive the session-limit goodbye').not.toBe(SESSION_LIMIT_TEMPLATE);
    expect(res.blocked, 'the safety layer should have intercepted').toBe(true);
    expect(res.sessionActive, 'the session must stay open for a crisis turn').toBe(true);

    const row = await readSession(s.sessionId);
    expect(row.status).toBe('active');
  });

  /**
   * The five tests above prove the SERVER closes the session. This one proves the
   * CUSTOMER sees a coherent screen — the client branch on sessionStatus === 'ended'
   * (ChatServicePage.tsx). Without it the goodbye line lands while the timer keeps
   * running and the UI still looks live, which reads as "it took my money and froze".
   */
  test('the browser tears the session down — divider and restart CTA, not a frozen live chat', async ({ page }) => {
    test.setTimeout(120_000); // one real LLM turn to open the session, then the close

    const { token, user } = await apiRegister(page, uniqueEmail('v2ui'), undefined, 'UiTeardown');
    await topUpWallet(user.id, 20_000);

    await page.addInitScript((t) => {
      window.localStorage.setItem('seer_auth_token', t as string);
    }, token);
    await page.goto('/reading?persona=evelyn-cross');

    // Open a real session through the UI (the page starts one on the first send).
    const input = page.getByTestId('chat-input');
    await input.waitFor({ state: 'visible', timeout: 30_000 });
    await input.fill('Hello, I have been waiting to speak with you.');
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('assistant-message').first()).toBeVisible({ timeout: 60_000 });

    // Age the session the UI is now holding, then send the turn that trips the limit.
    const sessionId = await withDb(async (c) => {
      const r = await c.query(
        `SELECT id FROM chat_sessions WHERE user_id = $1 AND status = 'active'
          ORDER BY started_at DESC LIMIT 1`,
        [user.id],
      );
      return r.rows[0]?.id as string;
    });
    expect(sessionId, 'the UI should have opened a session').toBeTruthy();
    await ageSession(sessionId, 61);

    await input.fill('Can you tell me one last thing?');
    await page.getByTestId('send-button').click();

    // The goodbye line is rendered to the customer.
    await expect(page.getByText(SESSION_LIMIT_TEMPLATE, { exact: false })).toBeVisible({ timeout: 30_000 });

    // The teardown actually ran: the divider needs readingEnded, and the CTA below it
    // only renders when readingEnded AND session === null — i.e. the live session and
    // its timer were genuinely cleared, not just visually appended to.
    await expect(page.getByText(/Reading ended/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Start a New Reading' })).toBeVisible({ timeout: 15_000 });

    const row = await readSession(sessionId);
    expect(row.status).toBe('ended');
  });

  test('rollback works: max_session_minutes = 0 disables the limit with no deploy', async ({ page }) => {
    test.setTimeout(180_000); // includes a real 60s wait for the config cache to expire

    await setMaxSessionMinutes('0');
    // getMaxSessionSeconds() caches for 60s and there is no invalidation route, so the
    // wait is the honest way to prove an operator's UPDATE actually takes effect.
    await new Promise((r) => setTimeout(r, CACHE_TTL_MS + 5_000));

    try {
      const s: EvelynSession = await freshEvelynSession(page, 'LimitDisabled');
      await topUpWallet(s.userId, 20_000);
      await ageSession(s.sessionId, 61);

      const res = await say(page, s, 'Can we keep going a little longer?');

      expect(res.message, 'with the limit disabled the persona must answer normally').not.toBe(SESSION_LIMIT_TEMPLATE);
      expect(res.sessionActive).toBe(true);

      const row = await readSession(s.sessionId);
      expect(row.status).toBe('active');
    } finally {
      await setMaxSessionMinutes(null);
    }
  });
});
