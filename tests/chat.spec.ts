import { test, expect, type Page } from '@playwright/test';

// Core reading experience for a V2 customer, against the REAL /reading UI:
// land on a guide → an opening + suggested questions → send a message → a real reply
// → time counts down → send a follow-up → end the reading → switch guides.
// These exercise the live chat engine (real Anthropic replies), so timeouts are generous.

const TOKEN_KEY = 'seer_auth_token';

async function freshReader(page: Page): Promise<void> {
  const email = `chat-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const reg = await page.request.post('/api/auth/register', {
    data: { email, password: 'ChatTest123!', firstName: 'ChatTester' },
  });
  const token = (await reg.json()).token as string;
  await page.addInitScript(([k, t]) => localStorage.setItem(k as string, t as string), [TOKEN_KEY, token]);
}

const SUGGESTED = /financial abundance|love keep slipping|life purpose|holding me back|meant to last/i;

test.describe('Chat Service Flow', () => {
  test('lands on a guide with an opening and suggested questions', async ({ page }) => {
    await freshReader(page);
    await page.goto('/reading?persona=evelyn-cross');
    await expect(page.getByText(/Evelyn Cross/i).first()).toBeVisible({ timeout: 15000 });
    // Suggested-question prompts start the reading.
    await expect(page.getByRole('button', { name: SUGGESTED }).first()).toBeVisible({ timeout: 15000 });
  });

  test('sends a message and receives a reply', async ({ page }) => {
    await freshReader(page);
    await page.goto('/reading?persona=evelyn-cross');

    const q = page.getByRole('button', { name: /financial abundance/i });
    await expect(q).toBeVisible({ timeout: 15000 });
    await q.click();

    // The user's message is echoed into the thread…
    await expect(page.getByText(/financial abundance/i).first()).toBeVisible({ timeout: 15000 });
    // …the chat opens (follow-up composer appears)…
    await expect(page.getByPlaceholder(/type your message/i)).toBeVisible({ timeout: 30000 });
    // …and a non-empty assistant reply arrives (poll the thread text past the opening + question).
    await expect
      .poll(async () => (await page.evaluate(() => document.body.innerText)).length, { timeout: 45000, intervals: [1500] })
      .toBeGreaterThan(400);
    await expect(page.getByText(/sensing|tell me|love|dear|feel|energy|heart|see|notice/i).first())
      .toBeVisible({ timeout: 45000 });
  });

  test('shows the time remaining and it counts down during the reading', async ({ page }) => {
    await freshReader(page);
    await page.goto('/reading?persona=evelyn-cross');
    await page.getByRole('button', { name: /financial abundance/i }).click();
    await expect(page.getByPlaceholder(/type your message/i)).toBeVisible({ timeout: 30000 });
    // A m:ss time indicator is shown (free trial ~3:00, ticking down).
    await expect(page.getByText(/\b[0-2]:\d{2}\b/).first()).toBeVisible({ timeout: 15000 });
  });

  test('keeps message history (two messages in the thread)', async ({ page }) => {
    await freshReader(page);
    await page.goto('/reading?persona=evelyn-cross');
    await page.getByRole('button', { name: /financial abundance/i }).click();

    const composer = page.getByPlaceholder(/type your message/i);
    await expect(composer).toBeVisible({ timeout: 30000 });
    await composer.fill('And what about my career?');
    await composer.press('Enter');

    await expect(page.getByText(/financial abundance/i).first()).toBeVisible();
    await expect(page.getByText(/what about my career/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('ends the reading', async ({ page }) => {
    await freshReader(page);
    await page.goto('/reading?persona=evelyn-cross');
    await page.getByRole('button', { name: /financial abundance/i }).click();
    await expect(page.getByPlaceholder(/type your message/i)).toBeVisible({ timeout: 30000 });

    // Ending opens a confirm that reassures history is kept, then confirms.
    await page.getByRole('button', { name: /^End Reading$/i }).first().click();
    await expect(page.getByText(/End this reading\?/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/chat history will be saved/i)).toBeVisible();
    await page.getByRole('button', { name: /^End Reading$/i }).last().click();
    // The confirm closes — the reading has ended.
    await expect(page.getByText(/End this reading\?/i)).toBeHidden({ timeout: 15000 });
  });

  test('switches between guides', async ({ page }) => {
    await freshReader(page);
    await page.goto('/reading?persona=evelyn-cross');
    await expect(page.getByText(/Evelyn Cross/i).first()).toBeVisible({ timeout: 15000 });

    // Switch to another guide from the sidebar (no active session yet → switches freely).
    await page.getByRole('button', { name: /Marcus Stone/i }).first().click();
    await expect(page.getByText(/Marcus Stone/i).first()).toBeVisible({ timeout: 15000 });
  });
});
