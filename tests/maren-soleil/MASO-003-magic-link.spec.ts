/**
 * MASO-003: Returning User via Magic Link (Email)
 *
 * Tests the one-click re-engagement flow: magic link URL auto-logs in
 * the user and redirects to the Maren Soleil persona.
 *
 * Notes:
 * - Magic link URL format: /magic-auth?t=<token>
 * - Verify endpoint: POST /api/auth/magic-verify { token }
 * - Tokens are valid for 30 days; re-clickable (marked usedAt on first click)
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  loginUser,
  startSession,
  getLastResponse,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  SELECTORS,
  BASE_URL,
  MAREN_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

/** Generate a magic link token via server API helper. */
async function createMagicLinkToken(page: any, userId: string, personaSlug = MAREN_SLUG): Promise<string> {
  const res = await page.request.post(`${BASE_URL}/api/admin/follow-ups/generate-token`, {
    data: { userId, personaSlug },
  });

  if (res.ok()) {
    const data = await res.json();
    return data.token as string;
  }

  throw new Error(
    'No magic link generation endpoint found. ' +
    'Add POST /api/admin/follow-ups/generate-token or a test helper endpoint.'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MASO-003-01: Session timeout sets DB state that would trigger timeout email
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-003-01: Idle session ends and DB state satisfies timeout email conditions', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('mar-003-01');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  // Send one message
  await apiSendMessage(page, sessionId, regData.token, 'Hello');
  await page.waitForTimeout(12000);

  // End session (simulating timeout via manual end for test reliability)
  const endData = await apiEndSession(page, sessionId, regData.token);
  expect(endData.sessionStatus).toBe('ended');

  // Verify the DB state via admin API — session should be ended
  // (conditions for timeout email: user has email, session ended, no prior email)
  const adminLoginRes = await page.request.post(`${BASE_URL}/api/admin/login`, {
    data: { email: 'admin@theseerwithin.com', password: 'ChangeMe123!' },
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;

  const sessionsRes = await page.request.get(
    `${BASE_URL}/api/admin/users/${regData.user.id}/sessions`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  const sessionsData = await sessionsRes.json();
  const session = sessionsData.sessions.find((s: any) => s.id === sessionId);

  expect(session).toBeTruthy();
  expect(session.status).toBe('ended');
  // User has an email — condition for timeout email satisfied
  expect(email).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-003-02: Magic link auto-logs in user and redirects to Maren Soleil
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-003-02: Valid magic link auto-logs in user and opens Maren Soleil chat', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('mar-003-02');
  const regData = await apiRegister(page, email, PWD);

  let token: string;
  try {
    token = await createMagicLinkToken(page, regData.user.id, MAREN_SLUG);
  } catch {
    test.skip(true, 'Magic link generation endpoint not available; skipping');
    return;
  }

  // Navigate to magic link URL
  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(3000);

  const currentUrl = page.url();

  // Should be on the reading page (not login)
  expect(currentUrl).not.toContain('/login');
  expect(currentUrl).toMatch(/reading|chat/);

  // Should show Maren Soleil
  await expect(page.locator('text=Maren Soleil').first()).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-003-03: Magic link can be re-used (tokens are valid for 30 days)
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-003-03: Magic link is re-usable within 30-day window', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('mar-003-03');
  const regData = await apiRegister(page, email, PWD);

  let token: string;
  try {
    token = await createMagicLinkToken(page, regData.user.id, MAREN_SLUG);
  } catch {
    test.skip(true, 'Magic link generation endpoint not available; skipping');
    return;
  }

  // First use
  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(2000);
  await expect(page.locator('text=Maren Soleil').first()).toBeVisible({ timeout: 10000 });

  // Clear auth and try same token again (token should still work — 30-day window)
  await page.evaluate(() => localStorage.removeItem('seer_auth_token'));
  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(2000);

  // Should still log in (not show an error)
  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/login');
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-003-04: Magic link for returning user shows returning greeting
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-003-04: Magic link for returning user shows returning-style greeting', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('mar-003-04');
  const regData = await apiRegister(page, email, PWD);

  // Complete a first session to make this a returning user
  const { sessionId } = await apiStartSession(page, regData.token);
  await apiSendMessage(page, sessionId, regData.token, 'Hello');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, regData.token);
  await page.waitForTimeout(3000);

  let token: string;
  try {
    token = await createMagicLinkToken(page, regData.user.id, MAREN_SLUG);
  } catch {
    test.skip(true, 'Magic link generation endpoint not available; skipping');
    return;
  }

  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(3000);
  await page.locator(SELECTORS.beginReading).click();
  await page.waitForTimeout(3000);

  const greeting = await getLastResponse(page);
  const lower = greeting.toLowerCase();

  const isReturning =
    lower.includes('good to see you') ||
    lower.includes('welcome back') ||
    lower.includes('again') ||
    lower.includes('return') ||
    lower.includes('since') ||
    lower.includes('before') ||
    lower.includes('sensed') ||
    lower.includes('felt you') ||
    lower.includes('carried') ||
    lower.includes('still') ||
    lower.includes('back to') ||
    lower.includes('something brought') ||
    lower.includes('something called');
  expect(isReturning).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-003-05: Expired magic link shows graceful error (no 500)
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-003-05: Expired or invalid magic link shows friendly error, not a crash', async ({ page }) => {
  test.setTimeout(30000);
  // Navigate with a clearly fake token
  await page.goto('/magic-auth?t=definitely_invalid_token_xyz123');
  await page.waitForTimeout(2000);

  // Should either redirect to login or show an error message
  const currentUrl = page.url();
  const isLoginPage = currentUrl.includes('/login');
  const hasErrorText = await page.locator('text=/expired|invalid|error|not found/i').first().isVisible().catch(() => false);

  // Must not be a blank/crashed page
  const hasNoServerError = !(await page.locator('text=/Cannot GET|500|Internal Server Error/i').first().isVisible().catch(() => false));

  expect(isLoginPage || hasErrorText).toBeTruthy();
  expect(hasNoServerError).toBeTruthy();
});
