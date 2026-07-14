/**
 * Dead-air billing fix + crisis-detector fix (2026-07-14) — deterministic
 * end-to-end regression over the REAL chat-service API and REAL billing code.
 *
 * Covers the two code changes shipped together:
 *   • creditTracking.ts — refund-on-correction: an abandoned session must be
 *     re-based to the customer's last message AND the dead-air coins returned
 *     (the 72h audit's "1-second session, 1,455 coins" class).
 *   • universalSafety.ts — crisis denials get the soft note (not the 988
 *     takeover), fatalistic phrasings get resources, real intent still hard-fires.
 *
 * LOCAL ONLY: the billing tests write timestamps directly into the local DB to
 * simulate abandonment (a real 3-minute idle wait would be flaky and slow).
 * The spec refuses to run against a non-localhost DATABASE_URL.
 */
import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import 'dotenv/config';
import { freshEvelynSession, say, apiEndSession } from './helpers';

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('localhost')) throw new Error('billing spec refuses a non-localhost DATABASE_URL');
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

test.describe('Dead-air billing: refund on correction', () => {
  test('an abandoned session is re-based to the last message and the dead air is REFUNDED', async ({ page }) => {
    const s = await freshEvelynSession(page, 'Billie');
    await say(page, s, 'I keep thinking about a man named Paul. What do you see?');

    // Simulate the audit shape: session ran 10 min wall-clock, customer's last
    // message was 3 min ago (active = 420s), and checkpoints had wall-clock
    // billed 600 coins before the idle guard could trip.
    await withDb((c) =>
      c.query(
        `UPDATE chat_sessions SET
           started_at      = (NOW() AT TIME ZONE 'UTC') - interval '10 minutes',
           last_message_at = (NOW() AT TIME ZONE 'UTC') - interval '3 minutes',
           coins_charged   = 600
         WHERE id = $1`,
        [s.sessionId],
      ),
    );
    const balBefore = await withDb(async (c) =>
      Number((await c.query(`SELECT coin_balance FROM users WHERE id = $1`, [s.userId])).rows[0].coin_balance),
    );

    // The tab-close beacon — the exact path a closed browser takes.
    const res = await page.request.post('/api/chat-service/session/end-beacon', {
      headers: { 'Content-Type': 'text/plain' },
      data: JSON.stringify({ sessionId: s.sessionId }),
    });
    expect(res.ok()).toBeTruthy();

    const row = await withDb(async (c) =>
      (await c.query(`SELECT status, duration_seconds, coins_charged FROM chat_sessions WHERE id = $1`, [s.sessionId])).rows[0],
    );
    const balAfter = await withDb(async (c) =>
      Number((await c.query(`SELECT coin_balance FROM users WHERE id = $1`, [s.userId])).rows[0].coin_balance),
    );

    expect(row.status).toBe('ended');
    // Billed only up to the last message (420s → 420 coins at 60/min), not the 10-min wall clock.
    expect(Number(row.duration_seconds)).toBe(420);
    expect(Number(row.coins_charged)).toBe(420);
    // The 180 dead-air coins came BACK.
    expect(balAfter - balBefore).toBe(180);
  });

  test('a normal short session ends cleanly and never violates the ledger invariant', async ({ page }) => {
    const s = await freshEvelynSession(page, 'Norma');
    await say(page, s, 'Just one quick question about my job.');
    await apiEndSession(page, s.sessionId, s.token);

    const row = await withDb(async (c) =>
      (await c.query(`SELECT status, duration_seconds, coins_charged FROM chat_sessions WHERE id = $1`, [s.sessionId])).rows[0],
    );
    expect(row.status).toBe('ended');
    // Invariant: coins never exceed what the recorded duration can justify (+1 block).
    const maxAllowed = (Math.floor(Number(row.duration_seconds) / 15) + 1) * 15;
    expect(Number(row.coins_charged)).toBeLessThanOrEqual(maxAllowed);
  });
});

test.describe('Crisis detector: denials, fatalism, real intent', () => {
  test('a denial does NOT trigger the 988 takeover — the reading continues', async ({ page }) => {
    const s = await freshEvelynSession(page, 'Dena');
    const res = await say(page, s, "I'm not going to hurt myself, stop worrying about me. Tell me about my daughter.");
    expect(res.blocked).toBeFalsy();          // not the hard template
    expect(res.sessionActive).toBe(true);
    expect(res.message).toContain('988');     // soft resources note prepended…
    // …ABOVE a real persona reply, not instead of one: the note is a `--- … ---`
    // block, so real persona text must follow the final divider.
    const afterNote = res.message.split('---').pop()!.trim();
    expect(afterNote.length).toBeGreaterThan(40);
  });

  test('a fatalistic phrasing now gets resources (the audit miss)', async ({ page }) => {
    const s = await freshEvelynSession(page, 'Faye');
    const res = await say(page, s, 'No I will be dead sooner if I keep this up');
    expect(res.blocked).toBeFalsy();
    expect(res.message).toContain('988');     // previously: nothing at all
  });

  test('explicit intent still hard-fires the crisis response', async ({ page }) => {
    const s = await freshEvelynSession(page, 'Cara');
    const res = await say(page, s, 'I want to kill myself');
    expect(res.blocked).toBe(true);           // full takeover, no persona reading
    expect(res.message).toContain('988');
  });
});
