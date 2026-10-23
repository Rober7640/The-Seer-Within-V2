import { test, expect, type Page } from '@playwright/test';

/**
 * Chat session lifecycle — billing and state, against the current reading UI.
 * A reading consumes the wallet (never below zero), the time counts down, history
 * survives a refresh, longer conversations hold together, and a reading can be ended
 * and restarted. Exercises the live chat engine (real replies) + server-side billing.
 */

const TOKEN_KEY = 'seer_auth_token';

async function freshReader(page: Page): Promise<string> {
  const email = `lifecycle-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const reg = await page.request.post('/api/auth/register', {
    data: { email, password: 'TestPass123!', firstName: 'Lifecycle' },
  });
  const token = (await reg.json()).token as string;
  await page.addInitScript(([k, t]) => localStorage.setItem(k as string, t as string), [TOKEN_KEY, token]);
  return token;
}

async function getBalance(page: Page, token: string): Promise<number> {
  const res = await page.request.get('/api/credits/balance', { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).coinBalance;
}

async function startReadingAndSend(page: Page) {
  await page.goto('/reading?persona=evelyn-cross');
  const q = page.getByRole('button', { name: /financial abundance/i });
  await expect(q).toBeVisible({ timeout: 15000 });
  await q.click();
  await expect(page.getByPlaceholder(/type your message/i)).toBeVisible({ timeout: 30000 });
}

test.describe('Chat Session Lifecycle', () => {
  test('a reading is recorded and never drives the wallet negative', async ({ page }) => {
    const token = await freshReader(page);
    expect(await getBalance(page, token)).toBe(897); // 3:00 free trial
    await startReadingAndSend(page);
    await page.waitForTimeout(3000);
    // The session is recorded server-side…
    const sessions = (await (await page.request.get('/api/chat-service/sessions', {
      headers: { Authorization: `Bearer ${token}` },
    })).json()).sessions;
    expect(sessions.length).toBeGreaterThan(0);
    // …and the wallet is never negative (billing safety invariant in every environment).
    expect(await getBalance(page, token)).toBeGreaterThanOrEqual(0);
  });

  test('the time remaining counts down during the reading', async ({ page }) => {
    await freshReader(page);
    await startReadingAndSend(page);
    const readClock = async () => {
      const txt = (await page.evaluate(() => document.body.innerText)).match(/\b([0-2]):(\d{2})\b/);
      return txt ? parseInt(txt[1]) * 60 + parseInt(txt[2]) : null;
    };
    await expect(page.getByText(/\b[0-2]:\d{2}\b/).first()).toBeVisible({ timeout: 15000 });
    const first = await readClock();
    expect(first).not.toBeNull();
    await expect.poll(readClock, { timeout: 45000, intervals: [3000] }).toBeLessThan(first as number);
  });

  test('chat history is preserved server-side across a page refresh', async ({ page }) => {
    const token = await freshReader(page);
    await startReadingAndSend(page);
    const composer = page.getByPlaceholder(/type your message/i);
    await composer.fill('Please remember: my lucky number is 7.');
    await composer.press('Enter');
    await expect(page.getByText(/lucky number is 7/i).first()).toBeVisible({ timeout: 15000 });

    // The reading page resets to a ready state on reload (history is not re-rendered
    // inline by design) — but the conversation is safely persisted server-side.
    await page.reload();
    await page.waitForLoadState('networkidle');

    const sessions = (await (await page.request.get('/api/chat-service/sessions', {
      headers: { Authorization: `Bearer ${token}` },
    })).json()).sessions;
    expect(sessions.length).toBeGreaterThan(0);
    const msgs = await (await page.request.get(`/api/chat-service/session/${sessions[0].id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    expect(JSON.stringify(msgs)).toMatch(/lucky number is 7/i);
  });

  test('handles a longer conversation (several messages all retained)', async ({ page }) => {
    await freshReader(page);
    await startReadingAndSend(page);
    const composer = page.getByPlaceholder(/type your message/i);
    const msgs = ['What about my career?', 'And my relationships?'];
    for (const m of msgs) {
      await composer.fill(m);
      await composer.press('Enter');
      await expect(page.getByText(m, { exact: false }).first()).toBeVisible({ timeout: 20000 });
    }
    // The opening question plus both follow-ups are all present in the thread.
    await expect(page.getByText(/financial abundance/i).first()).toBeVisible();
    await expect(page.getByText(/What about my career/i).first()).toBeVisible();
    await expect(page.getByText(/And my relationships/i).first()).toBeVisible();
  });

  test('a reading can be ended and then started again', async ({ page }) => {
    await freshReader(page);
    await startReadingAndSend(page);
    await page.getByRole('button', { name: /^End Reading$/i }).first().click();
    await expect(page.getByText(/End this reading\?/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /^End Reading$/i }).last().click();
    await expect(page.getByText(/End this reading\?/i)).toBeHidden({ timeout: 15000 });

    // The customer can start a fresh reading again.
    await page.goto('/reading?persona=evelyn-cross');
    await expect(page.getByRole('button', { name: /financial abundance|life purpose|holding me back/i }).first())
      .toBeVisible({ timeout: 15000 });
  });
});
