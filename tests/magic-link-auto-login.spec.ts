/**
 * Magic Link Auto-Login Tests
 *
 * Tests the auto-login flow triggered by email CTAs (top-up emails,
 * session timeout emails, follow-up emails). Verifies that:
 *   1. Magic link tokens are generated and stored correctly
 *   2. /magic-auth page exchanges token for JWT and auto-logs in
 *   3. Redirect param (?redirect=/credits) works for top-up emails
 *   4. Default redirect goes to persona chat for timeout emails
 *   5. Invalid/expired tokens show a friendly error
 *   6. Tokens are re-usable within the 30-day window
 *   7. User lands authenticated (can see chat UI, not login page)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';
const TEST_PASSWORD = 'TestPass123!';
const EVELYN_SLUG = 'evelyn-cross';
const MARCUS_SLUG = 'marcus-stone';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}@example.com`;
}

/** Register a user via API. */
async function apiRegister(page: any, email: string, firstName = 'Tester') {
  const res = await page.request.post(`${BASE_URL}/api/auth/register`, {
    data: { email, password: TEST_PASSWORD, firstName },
  });
  return res.json() as Promise<{ token: string; user: { id: string; email: string; coinBalance: number } }>;
}


/** Generate a magic link token via the test helper endpoint (no admin auth needed). */
async function generateToken(page: any, userId: string, personaSlug: string): Promise<string> {
  const res = await page.request.post(`${BASE_URL}/api/auth/generate-magic-token`, {
    data: { userId, personaSlug },
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.token).toBeTruthy();
  return data.token;
}

/** Start a session via API so the user has chat history. */
async function apiStartSession(page: any, userToken: string, personaSlug = EVELYN_SLUG) {
  const greetingRes = await page.request.get(
    `${BASE_URL}/api/chat-service/greeting/${personaSlug}`,
    { headers: { Authorization: `Bearer ${userToken}` } },
  );
  const greetingData = await greetingRes.json();

  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const personasData = await personasRes.json();
  const list: { id: string; slug: string }[] = personasData.personas ?? personasData;
  const persona = list.find((p) => p.slug === personaSlug);
  if (!persona) throw new Error(`Persona '${personaSlug}' not found`);

  const sessionRes = await page.request.post(`${BASE_URL}/api/chat-service/session/start`, {
    headers: { Authorization: `Bearer ${userToken}` },
    data: { personaId: persona.id, greeting: greetingData.greeting },
  });
  return sessionRes.json();
}

/** End a session via API. */
async function apiEndSession(page: any, sessionId: string, userToken: string) {
  const res = await page.request.post(
    `${BASE_URL}/api/chat-service/session/${sessionId}/end`,
    { headers: { Authorization: `Bearer ${userToken}` } },
  );
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// Test: Admin generate-token endpoint works
// ─────────────────────────────────────────────────────────────
test('ML-01: Generate-token endpoint creates a valid magic link token', async ({ page }) => {
  test.setTimeout(30000);
  const email = uniqueEmail('ml-01');
  const regData = await apiRegister(page, email);


  const token = await generateToken(page, regData.user.id, EVELYN_SLUG);
  expect(token).toHaveLength(64); // 32 bytes hex
});

// ─────────────────────────────────────────────────────────────
// Test: Magic link auto-logs in and redirects to persona chat
// (simulates session timeout email CTA)
// ─────────────────────────────────────────────────────────────
test('ML-02: Magic link auto-logs in user and redirects to persona chat (timeout email flow)', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('ml-02');
  const regData = await apiRegister(page, email);


  const token = await generateToken(page, regData.user.id, EVELYN_SLUG);

  // Navigate to magic auth URL (as if clicking the email CTA)
  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  // Should NOT be on login page
  expect(currentUrl).not.toContain('/login');
  // Should be on chat/reading page for Evelyn
  expect(currentUrl).toMatch(/chat\/evelyn-cross|reading/);

  // Verify JWT was stored
  const storedToken = await page.evaluate(() => localStorage.getItem('seer_auth_token'));
  expect(storedToken).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────
// Test: Magic link with ?redirect=/credits goes to credits page
// (simulates top-up email CTA)
// ─────────────────────────────────────────────────────────────
test('ML-03: Magic link with redirect=/credits lands on credits page (top-up email flow)', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('ml-03');
  const regData = await apiRegister(page, email);


  const token = await generateToken(page, regData.user.id, EVELYN_SLUG);

  // Navigate with redirect param (exactly how topupEmailGenerator builds the URL)
  await page.goto(`/magic-auth?t=${token}&redirect=/credits`);
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/login');
  expect(currentUrl).toContain('/credits');

  // Verify JWT was stored
  const storedToken = await page.evaluate(() => localStorage.getItem('seer_auth_token'));
  expect(storedToken).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────
// Test: Magic link for Marcus Stone redirects to Marcus chat
// ─────────────────────────────────────────────────────────────
test('ML-04: Magic link for Marcus Stone redirects to marcus-stone chat', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('ml-04');
  const regData = await apiRegister(page, email);


  const token = await generateToken(page, regData.user.id, MARCUS_SLUG);

  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/login');
  expect(currentUrl).toMatch(/chat\/marcus-stone|reading/);

  const storedToken = await page.evaluate(() => localStorage.getItem('seer_auth_token'));
  expect(storedToken).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────
// Test: Invalid token shows friendly error (no crash)
// ─────────────────────────────────────────────────────────────
test('ML-05: Invalid magic link token shows friendly error, not a crash', async ({ page }) => {
  test.setTimeout(30000);

  await page.goto('/magic-auth?t=totally_fake_invalid_token_abc123');
  await page.waitForTimeout(3000);

  // Should show error text or have a login link
  const hasErrorText = await page
    .locator('text=/expired|invalid|unavailable|error/i')
    .first()
    .isVisible()
    .catch(() => false);
  const hasLoginLink = await page
    .locator('a[href="/login"]')
    .first()
    .isVisible()
    .catch(() => false);

  // Must not be a server crash
  const hasServerError = await page
    .locator('text=/Cannot GET|500|Internal Server Error/i')
    .first()
    .isVisible()
    .catch(() => false);

  expect(hasErrorText || hasLoginLink).toBeTruthy();
  expect(hasServerError).toBeFalsy();
});

// ─────────────────────────────────────────────────────────────
// Test: Missing token param shows error
// ─────────────────────────────────────────────────────────────
test('ML-06: /magic-auth with no token param shows error', async ({ page }) => {
  test.setTimeout(30000);

  await page.goto('/magic-auth');
  await page.waitForTimeout(2000);

  const hasErrorText = await page
    .locator('text=/no magic link|token|use the link/i')
    .first()
    .isVisible()
    .catch(() => false);

  expect(hasErrorText).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────
// Test: Token is re-usable (30-day window)
// ─────────────────────────────────────────────────────────────
test('ML-07: Magic link token is re-usable within 30-day window', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('ml-07');
  const regData = await apiRegister(page, email);


  const token = await generateToken(page, regData.user.id, EVELYN_SLUG);

  // First use
  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(3000);
  expect(page.url()).not.toContain('/login');

  // Clear auth and reuse same token
  await page.evaluate(() => localStorage.removeItem('seer_auth_token'));
  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(3000);

  // Should still work — not show an error
  expect(page.url()).not.toContain('/login');
  const storedToken = await page.evaluate(() => localStorage.getItem('seer_auth_token'));
  expect(storedToken).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────
// Test: Authenticated user can interact after magic link login
// ─────────────────────────────────────────────────────────────
test('ML-08: User is fully authenticated after magic link — can call protected API', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('ml-08');
  const regData = await apiRegister(page, email);


  const token = await generateToken(page, regData.user.id, EVELYN_SLUG);

  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(3000);

  // Grab the JWT from localStorage and call a protected endpoint
  const jwt = await page.evaluate(() => localStorage.getItem('seer_auth_token'));
  expect(jwt).toBeTruthy();

  const meRes = await page.request.get(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  expect(meRes.ok()).toBeTruthy();
  const meData = await meRes.json();
  expect(meData.user?.email || meData.email).toBe(email);
});

// ─────────────────────────────────────────────────────────────
// Test: Magic link after a completed session (returning user)
// ─────────────────────────────────────────────────────────────
test('ML-09: Magic link works for returning user who had a previous session', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('ml-09');
  const regData = await apiRegister(page, email);

  // Complete a session so this user has history
  const sessionData = await apiStartSession(page, regData.token, EVELYN_SLUG);
  await page.waitForTimeout(2000);
  await apiEndSession(page, sessionData.sessionId, regData.token);
  await page.waitForTimeout(1000);

  // Generate magic link (as timeout/follow-up email would)

  const token = await generateToken(page, regData.user.id, EVELYN_SLUG);

  await page.goto(`/magic-auth?t=${token}`);
  await page.waitForTimeout(3000);

  expect(page.url()).not.toContain('/login');
  const jwt = await page.evaluate(() => localStorage.getItem('seer_auth_token'));
  expect(jwt).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────
// Test: POST /api/auth/magic-verify returns JWT and personaSlug
// ─────────────────────────────────────────────────────────────
test('ML-10: magic-verify API returns token and personaSlug', async ({ page }) => {
  test.setTimeout(30000);
  const email = uniqueEmail('ml-10');
  const regData = await apiRegister(page, email);


  const magicToken = await generateToken(page, regData.user.id, EVELYN_SLUG);

  const res = await page.request.post(`${BASE_URL}/api/auth/magic-verify`, {
    data: { token: magicToken },
  });
  expect(res.ok()).toBeTruthy();

  const data = await res.json();
  expect(data.token).toBeTruthy(); // JWT
  expect(data.personaSlug).toBe(EVELYN_SLUG);
});

// ─────────────────────────────────────────────────────────────
// Test: magic-verify rejects invalid token with proper error
// ─────────────────────────────────────────────────────────────
test('ML-11: magic-verify API rejects invalid token gracefully', async ({ page }) => {
  test.setTimeout(15000);

  const res = await page.request.post(`${BASE_URL}/api/auth/magic-verify`, {
    data: { token: 'not_a_real_token_at_all' },
  });

  // Should be 401 or 400, not 500
  expect(res.status()).toBeLessThan(500);
  expect(res.ok()).toBeFalsy();
});
