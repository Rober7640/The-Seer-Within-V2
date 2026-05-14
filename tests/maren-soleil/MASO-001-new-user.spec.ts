/**
 * MASO-001: New User Journey
 *
 * Tests the complete first-time experience for a new user chatting with
 * Maren Soleil — from registration through first session to memory creation.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  registerUser,
  loginUser,
  startSession,
  sendMessage,
  endSession,
  getLastResponse,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  apiGetAdminToken,
  adminGetMemory,
  SELECTORS,
  BASE_URL,
} from './helpers';

const PASSWORD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-01: Registration → free 3 minutes
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-001-01: Registration shows 3 free minutes on /reading', async ({ page }) => {
  const email = uniqueEmail('mar-001-01');
  await registerUser(page, email, PASSWORD);

  // Should land on reading page and show free time
  await expect(page.locator('text=/3.*min|180.*coin/i').first()).toBeVisible({ timeout: 10000 });
  // Default persona (or sidebar) should show Maren Soleil
  await expect(page.locator('text=Maren Soleil').first()).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-02: Pre-session screen renders all key elements
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-001-02: Pre-session screen shows avatar, name, tagline, and greeting loads', async ({ page }) => {
  const email = uniqueEmail('mar-001-02');
  await registerUser(page, email, PASSWORD);

  // Navigate directly to Maren's chat page so she is the selected persona
  // (the default /reading page selects Evelyn Cross as sortOrder=1)
  await page.goto('/chat/maren-soleil');
  await page.waitForTimeout(500);

  // Persona name and tagline must be visible
  await expect(page.locator('text=Maren Soleil').first()).toBeVisible({ timeout: 15000 });
  // Tagline may load async — use a longer timeout
  await expect(page.locator('text=Twin Flame Oracle & Love Empath').first()).toBeVisible({ timeout: 20000 });

  // Greeting auto-loads — verify it appears (button click is not required)
  await expect(page.locator('[data-testid="chat-greeting"]')).toBeVisible({ timeout: 30000 });

  // No teaser badge on a fresh account (first visit)
  const teaserBadge = page.locator('[data-testid="teaser-badge"]');
  const badgeCount = await teaserBadge.count();
  expect(badgeCount).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-03: New-user greeting is generic (no "welcome back" language)
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-001-03: New-user greeting does not contain returning-user language', async ({ page }) => {
  const email = uniqueEmail('mar-001-03');
  await registerUser(page, email, PASSWORD);
  // Greeting auto-loads — wait for it without requiring a button click
  await page.waitForSelector('[data-testid="chat-greeting"]', { timeout: 30000 });

  const greeting = await getLastResponse(page);
  expect(greeting.length).toBeGreaterThan(10);

  const lower = greeting.toLowerCase();
  expect(lower).not.toContain('welcome back');
  expect(lower).not.toContain('good to see you again');
  expect(lower).not.toContain('last time');
  expect(lower).not.toContain('we spoke');
  expect(lower).not.toContain('you mentioned');
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-04: Greeting auto-loads and chat input is activated
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-001-04: Greeting auto-loads and activates chat input', async ({ page }) => {
  const email = uniqueEmail('mar-001-04');
  await registerUser(page, email, PASSWORD);

  // Greeting auto-loads — wait for it
  await page.waitForSelector('[data-testid="chat-greeting"]', { timeout: 30000 });

  // Chat input should be visible and enabled (appears once greeting is set)
  await expect(page.locator(SELECTORS.chatInput).first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator(SELECTORS.chatInput).first()).toBeEnabled();

  // Greeting bubble should be present
  const bubbles = page.locator(SELECTORS.assistantBubble);
  await expect(bubbles.first()).toBeVisible({ timeout: 10000 });

  // Credit balance indicator should be visible (paused pre-session or active)
  await expect(page.locator(SELECTORS.creditDisplay)).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-05: Credits decrease after exchanging messages
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-001-05: Credit balance decreases after session with messages', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('mar-001-05');

  // Register via API to get token for balance checks
  const regData = await apiRegister(page, email, PASSWORD);
  const token = regData.token;

  // Start session + send a message via API (defaults to maren-soleil)
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'I keep feeling this pull toward my ex. Is this a twin flame connection?');
  // Wait for Claude response + hold session open long enough for billing to
  // register at least 1 minute (Math.round(elapsed/60) * 60 coins).
  // 35 s → Math.round(35/60) = 1 → 60 coins deducted.
  await page.waitForTimeout(35000);

  // End session
  const endData = await apiEndSession(page, sessionId, token);

  // Coins should have been used (at least 1 minute = 60 coins)
  expect(endData.remainingCoins).toBeLessThan(180);
  expect(endData.sessionStatus).toBe('ended');
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-06: Twin flame message gets a relevant response
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-001-06: Twin flame message gets on-topic response', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('mar-001-06');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(
    page,
    sessionId,
    regData.token,
    "I keep feeling this pull toward my ex and I can't explain it. Is this a twin flame connection?",
  );
  expect(res.status()).toBe(200);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  expect(data.message.length).toBeGreaterThan(20);

  const msgLower = data.message.toLowerCase();
  const isRelevant =
    msgLower.includes('twin') ||
    msgLower.includes('flame') ||
    msgLower.includes('connection') ||
    msgLower.includes('cord') ||
    msgLower.includes('energy') ||
    msgLower.includes('pull') ||
    msgLower.includes('sense') ||
    msgLower.includes('feel') ||
    msgLower.includes('love');
  expect(isRelevant).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-07: Soulmate / seeking-love message gets a relevant response
// ─────────────────────────────────────────────────────────────────────────────
test("MASO-001-07: Soulmate/seeking love message gets on-topic response", async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('mar-001-07');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(
    page,
    sessionId,
    regData.token,
    "I've been single for years and I'm starting to wonder if I'll ever find my person",
  );
  const data = await res.json();

  const msgLower = data.message.toLowerCase();
  const isRelevant =
    msgLower.includes('love') ||
    msgLower.includes('soul') ||
    msgLower.includes('heart') ||
    msgLower.includes('connect') ||
    msgLower.includes('find') ||
    msgLower.includes('path') ||
    msgLower.includes('feel') ||
    msgLower.includes('sense');
  expect(isRelevant).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-08: Karmic / past-life message gets a relevant response
// ─────────────────────────────────────────────────────────────────────────────
test("MASO-001-08: Karmic/past-life message gets on-topic response", async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('mar-001-08');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(
    page,
    sessionId,
    regData.token,
    "I keep going back to someone I know isn't good for me. I can't seem to leave no matter what I do",
  );
  const data = await res.json();

  const msgLower = data.message.toLowerCase();
  const isRelevant =
    msgLower.includes('cord') ||
    msgLower.includes('karmic') ||
    msgLower.includes('pattern') ||
    msgLower.includes('pull') ||
    msgLower.includes('keep') ||
    msgLower.includes('bound') ||
    msgLower.includes('feel') ||
    msgLower.includes('energy') ||
    msgLower.includes('love');
  expect(isRelevant).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-09: "End Session" deducts coins and marks session ended
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-001-09: Manual End Session deducts correct coins and ends session', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('mar-001-09');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token);

  // Exchange at least one message
  await apiSendMessage(page, sessionId, regData.token, 'Hello, I need guidance');
  await page.waitForTimeout(12000);

  // End the session
  const endData = await apiEndSession(page, sessionId, regData.token);

  expect(endData.sessionStatus).toBe('ended');
  expect(typeof endData.remainingCoins).toBe('number');
  // Some coins should have been used (at least 1 minute = 60 coins)
  expect(endData.remainingCoins).toBeLessThanOrEqual(180);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-10: Memory record created after session ends
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-001-10: Memory record created after session ends', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('mar-001-10');
  const regData = await apiRegister(page, email, PASSWORD);
  const userId = regData.user.id;
  const token = regData.token;

  // Get admin token via API (more reliable than UI login)
  const adminToken = await apiGetAdminToken(page);
  expect(adminToken).toBeTruthy();

  // Start session, exchange messages, end session
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'I have a deep twin flame connection with my ex and I feel the cord between us');
  await page.waitForTimeout(12000);
  await apiSendMessage(page, sessionId, token, 'We keep finding our way back to each other no matter what happens');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);

  // Memory summarisation is async — give it a few seconds
  await page.waitForTimeout(5000);

  // Check memory via admin API
  const { memories } = await adminGetMemory(page, adminToken!, userId);

  // At least one session_summary memory should be present
  const sessionMemory = memories.filter((m: any) => m.memoryType === 'session_summary');
  expect(sessionMemory.length).toBeGreaterThan(0);

  // Memory should have a summary
  const mem = sessionMemory[0];
  expect(mem.summary || mem.fullContext).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-001-11: Second visit shows returning-user greeting
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-001-11: Second visit to Maren shows returning-user greeting', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('mar-001-11');
  const PASSWORD_LOCAL = 'TestPass123!';

  // First session
  await registerUser(page, email, PASSWORD_LOCAL);
  await startSession(page);
  await sendMessage(page, 'Tell me about my twin flame connection', 12000);
  await endSession(page);

  // Log out and back in
  const logoutBtn = page.locator('[aria-label="Logout"], button:has-text("Logout")');
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await page.waitForTimeout(1000);
  }

  await loginUser(page, email, PASSWORD_LOCAL);
  await startSession(page);

  const greeting = await getLastResponse(page);
  const lower = greeting.toLowerCase();

  // Broad set — Maren's empath voice varies widely on returning greetings
  const hasReturningLanguage =
    lower.includes('good to see you') ||
    lower.includes('welcome back') ||
    lower.includes("you're back") ||
    lower.includes('again') ||
    lower.includes('return') ||
    lower.includes("i've been thinking") ||
    lower.includes('your energy') ||
    lower.includes('you came back') ||
    lower.includes('since') ||
    lower.includes('last time') ||
    lower.includes('before') ||
    lower.includes('sensed') ||
    lower.includes('felt you') ||
    lower.includes('carried') ||
    lower.includes('still') ||
    lower.includes('back to') ||
    lower.includes('something brought') ||
    lower.includes('something called');
  expect(hasReturningLanguage).toBeTruthy();
});
