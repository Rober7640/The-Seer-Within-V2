/**
 * Session churn fix (2026-07-14) — deterministic end-to-end regression.
 *
 * The 72h audit found 57 of 128 sessions were phantom re-opens: a reload/phone
 * lock wiped the client's session state and the next message forked a NEW
 * session (force-closing the old one), each fork with its own billable idle
 * window and duplicated context rows. Fixes under test:
 *   • initSession reattaches to a live same-persona session inside its idle
 *     window instead of forking (chatEngine.ts).
 *   • Past the idle window it deliberately recreates (reattaching would
 *     re-bill the idle gap wall-clock).
 *   • "Continue Reading" context copies are flagged is_context_copy so the
 *     message ledger stays honest.
 *
 * LOCAL ONLY: shifts timestamps directly in the local DB to simulate idle;
 * refuses to run against a non-localhost DATABASE_URL.
 */
import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import 'dotenv/config';
import { freshEvelynSession, say, apiEndSession, EVELYN_SLUG } from './helpers';

async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('localhost')) throw new Error('churn spec refuses a non-localhost DATABASE_URL');
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function startSessionRaw(page: any, token: string, personaId: string, extra: object = {}) {
  const res = await page.request.post('http://localhost:5000/api/chat-service/session/start', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { personaId, ...extra },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test.describe('Session churn: reattach instead of fork', () => {
  test('a second session/start inside the idle window REATTACHES — same session, no fork, no force-close', async ({ page }) => {
    const s = await freshEvelynSession(page, 'Runa');
    await say(page, s, 'I keep dreaming about water. What does it mean?');

    const msgCountBefore = await withDb(async (c) =>
      Number((await c.query(`SELECT count(*) FROM chat_messages WHERE session_id = $1`, [s.sessionId])).rows[0].count),
    );

    // What a reloaded client does: no session in state → POST /session/start again.
    const second = await startSessionRaw(page, s.token, (await withDb(async (c) =>
      (await c.query(`SELECT persona_id FROM chat_sessions WHERE id = $1`, [s.sessionId])).rows[0].persona_id)));

    expect(second.sessionId).toBe(s.sessionId); // reattached, not forked

    const rows = await withDb(async (c) =>
      (await c.query(
        `SELECT id, status FROM chat_sessions WHERE user_id = $1 ORDER BY started_at`,
        [s.userId],
      )).rows,
    );
    expect(rows.length).toBe(1);              // no second row was ever created
    expect(rows[0].status).toBe('active');    // and the original was not force-closed

    // Reattach must not inject a fresh greeting row into the live conversation.
    const msgCountAfter = await withDb(async (c) =>
      Number((await c.query(`SELECT count(*) FROM chat_messages WHERE session_id = $1`, [s.sessionId])).rows[0].count),
    );
    expect(msgCountAfter).toBe(msgCountBefore);

    // The conversation genuinely continues on the reattached session.
    const res = await say(page, s, 'It was the ocean, always at night.');
    expect(res.sessionActive).toBe(true);
  });

  test('PAST the idle window it recreates — reattaching there would re-bill the idle gap', async ({ page }) => {
    const s = await freshEvelynSession(page, 'Stella');
    await say(page, s, 'Quick question about my sister.');

    // Push the session past the 2-minute idle window (timeout is per-persona in DB).
    await withDb((c) =>
      c.query(
        `UPDATE chat_sessions SET
           started_at      = (NOW() AT TIME ZONE 'UTC') - interval '10 minutes',
           last_message_at = (NOW() AT TIME ZONE 'UTC') - interval '3 minutes'
         WHERE id = $1`,
        [s.sessionId],
      ),
    );

    const personaId = await withDb(async (c) =>
      (await c.query(`SELECT persona_id FROM chat_sessions WHERE id = $1`, [s.sessionId])).rows[0].persona_id,
    );
    const second = await startSessionRaw(page, s.token, personaId);

    expect(second.sessionId).not.toBe(s.sessionId); // fresh session
    const old = await withDb(async (c) =>
      (await c.query(`SELECT status FROM chat_sessions WHERE id = $1`, [s.sessionId])).rows[0],
    );
    expect(old.status).toBe('ended'); // stale one force-closed by the new start
  });

  test('UI: a page reload rejoins the live reading — history restored, no fork', async ({ page }) => {
    const s = await freshEvelynSession(page, 'Rhea');
    const userText = 'I keep seeing the number eleven everywhere lately.';
    await say(page, s, userText);

    const personaId = await withDb(async (c) =>
      (await c.query(`SELECT persona_id FROM chat_sessions WHERE id = $1`, [s.sessionId])).rows[0].persona_id,
    );

    // Simulate the post-reload browser: auth token present, live-session record
    // present, React state gone. This is exactly the phone-unlock case.
    await page.addInitScript(
      ({ token, live }: { token: string; live: string }) => {
        localStorage.setItem('seer_auth_token', token);
        localStorage.setItem('seer-live-session-v1', live);
      },
      {
        token: s.token,
        live: JSON.stringify({
          id: s.sessionId,
          personaId,
          startedAt: Date.now() - 60_000,
          lastActiveAt: Date.now() - 5_000,
        }),
      },
    );

    await page.goto(`http://localhost:5000/reading?persona=${EVELYN_SLUG}`);

    // The conversation is back on screen (restored from the server, not memory)…
    await expect(page.getByText(userText)).toBeVisible({ timeout: 20_000 });

    // …and no second session was forked by the reload.
    const rows = await withDb(async (c) =>
      (await c.query(`SELECT status FROM chat_sessions WHERE user_id = $1`, [s.userId])).rows,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('active');
  });

  test('"Continue Reading" context copies are flagged is_context_copy', async ({ page }) => {
    const s = await freshEvelynSession(page, 'Cora');
    await say(page, s, 'Tell me about my path.');
    await apiEndSession(page, s.sessionId, s.token);

    const personaId = await withDb(async (c) =>
      (await c.query(`SELECT persona_id FROM chat_sessions WHERE id = $1`, [s.sessionId])).rows[0].persona_id,
    );
    const cont = await startSessionRaw(page, s.token, personaId, {
      continuationMessages: [
        { role: 'user', content: 'Tell me about my path.' },
        { role: 'assistant', content: 'Your path bends toward water, love.' },
      ],
    });
    expect(cont.sessionId).not.toBe(s.sessionId);

    const flags = await withDb(async (c) =>
      (await c.query(
        `SELECT is_context_copy, count(*)::int AS n
         FROM chat_messages WHERE session_id = $1 GROUP BY 1`,
        [cont.sessionId],
      )).rows,
    );
    const copies = flags.find((r: any) => r.is_context_copy === true);
    expect(copies?.n).toBe(2);                 // exactly the carried-over rows are marked
    const genuine = flags.find((r: any) => r.is_context_copy === false);
    expect(genuine).toBeUndefined();           // continuation sends no greeting; nothing else yet
  });
});
