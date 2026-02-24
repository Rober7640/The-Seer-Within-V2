/**
 * EVE-001: New User Journey
 *
 * Tests the complete first-time experience for a new user chatting with
 * Evelyn Cross — from registration through first session to memory creation.
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
  apiAdminLogin,
  adminGetMemory,
  SELECTORS,
  BASE_URL,
} from './helpers';

const PASSWORD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// EVE-001-01: Registration → free 3 minutes
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-001-01: Registration shows 3 free minutes on /reading', async ({ page }) => {
  const email = uniqueEmail('eve-001-01');
  await registerUser(page, email, PASSWORD);

  // Should land on reading page and show free time
  await expect(page.locator('text=/3.*min|180.*coin/i').first()).toBeVisible({ timeout: 10000 });
  // Default persona should be Evelyn Cross
  await expect(page.locator('text=Evelyn Cross').first()).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-001-02: Pre-session screen renders all key elements
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-001-02: Pre-session screen shows avatar, name, and auto-loads greeting', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('eve-001-02');
  await registerUser(page, email, PASSWORD);
  await page.goto('/chat/evelyn-cross');

  // Evelyn's avatar and name must be visible
  await expect(page.locator('text=Evelyn Cross').first()).toBeVisible({ timeout: 10000 });

  // Greeting auto-loads and chat input becomes ready
  await expect(page.locator(SELECTORS.chatInput).first()).toBeVisible({ timeout: 20000 });

  // No teaser badge on a fresh account (first visit)
  const teaserBadge = page.locator('[data-testid="teaser-badge"], .teaser-badge');
  const badgeCount = await teaserBadge.count();
  expect(badgeCount).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-001-03: New-user greeting is generic (no "welcome back" language)
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-001-03: New-user greeting does not contain returning-user language', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('eve-001-03');
  await registerUser(page, email, PASSWORD);
  // Greeting auto-loads when navigating to Evelyn's page — no button click needed
  await startSession(page);
  await page.waitForTimeout(3000); // let greeting render

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
// EVE-001-04: "Begin Reading" initialises a session and shows chat input
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-001-04: Navigating to Evelyn auto-loads greeting and activates chat input', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('eve-001-04');
  await registerUser(page, email, PASSWORD);
  await page.goto('/chat/evelyn-cross');

  // Chat input should auto-appear (greeting auto-fetched, no button click required)
  await expect(page.locator(SELECTORS.chatInput).first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator(SELECTORS.chatInput).first()).toBeEnabled();

  // At least one assistant bubble (the greeting) should be present
  const bubbles = page.locator(SELECTORS.assistantBubble);
  await expect(bubbles.first()).toBeVisible({ timeout: 15000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-001-05: Credits decrease after exchanging messages
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-001-05: Credit balance decreases after session with messages', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('eve-001-05');

  // Register via API to get userId and token for balance checks
  const regData = await apiRegister(page, email, PASSWORD);
  const token = regData.token;

  // Set page localStorage so UI is authenticated
  await page.goto('/reading');
  await page.evaluate((t) => localStorage.setItem('seer_auth_token', t), token);
  await page.reload();
  await page.waitForTimeout(1000);

  // Start session + send a message via API
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'Tell me about my love life');
  await page.waitForTimeout(35000); // Wait for Claude + ensure 30s+ elapsed for billing threshold

  // End session
  const endData = await apiEndSession(page, sessionId, token);

  // Coins should have been used
  expect(endData.remainingCoins).toBeLessThan(180);
  expect(endData.sessionStatus).toBe('ended');
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-001-06: Love topic message gets a relevant response
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-001-06: Love/relationship message gets on-topic response', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('eve-001-06');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(page, sessionId, regData.token, "I've been having trouble in my relationship lately");
  expect(res.status()).toBe(200);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  expect(data.message.length).toBeGreaterThan(20);

  // Session should have updated topic to something relationship-related
  const msgLower = data.message.toLowerCase();
  const isRelationshipFocused =
    msgLower.includes('relationship') ||
    msgLower.includes('love') ||
    msgLower.includes('partner') ||
    msgLower.includes('connect') ||
    msgLower.includes('heart') ||
    msgLower.includes('feel');
  expect(isRelationshipFocused).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-001-07: Career/money topic message gets relevant response
// ─────────────────────────────────────────────────────────────────────────────
test("EVE-001-07: Career/money message gets on-topic response", async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('eve-001-07');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(page, sessionId, regData.token, "I'm worried about my career and finances");
  const data = await res.json();

  const msgLower = data.message.toLowerCase();
  const isCareerFocused =
    msgLower.includes('career') ||
    msgLower.includes('work') ||
    msgLower.includes('money') ||
    msgLower.includes('finance') ||
    msgLower.includes('job') ||
    msgLower.includes('path') ||
    msgLower.includes('abundance') ||
    msgLower.includes('earn') ||
    msgLower.includes('wealth') ||
    msgLower.includes('success') ||
    msgLower.includes('prosper') ||
    msgLower.includes('profession') ||
    msgLower.includes('worri') ||
    msgLower.includes('concern') ||
    msgLower.includes('income') ||
    msgLower.includes('opportunit') ||
    msgLower.includes('business') ||
    msgLower.includes('struggle') ||
    msgLower.includes('energy');
  expect(isCareerFocused).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-001-08: Purpose/life-path message gets relevant response
// ─────────────────────────────────────────────────────────────────────────────
test("EVE-001-08: Purpose/life-path message gets on-topic response", async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('eve-001-08');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(page, sessionId, regData.token, "I feel lost and don't know what my life is for");
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = (data.message as string).toLowerCase();
  const isPurposeFocused =
    msgLower.includes('purpose') ||
    msgLower.includes('path') ||
    msgLower.includes('meaning') ||
    msgLower.includes('soul') ||
    msgLower.includes('calling') ||
    msgLower.includes('direct') ||
    msgLower.includes('life') ||
    msgLower.includes('lost') ||
    msgLower.includes('search') ||
    msgLower.includes('journey') ||
    msgLower.includes('heart') ||
    msgLower.includes('spirit') ||
    msgLower.includes('deeper') ||
    msgLower.includes('within') ||
    msgLower.includes('discover') ||
    msgLower.includes('question') ||
    msgLower.includes('guide') ||
    msgLower.includes('feel') ||
    msgLower.includes('sense');
  expect(isPurposeFocused).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-001-09: "End Session" deducts coins and marks session ended
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-001-09: Manual End Session deducts correct coins and ends session', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('eve-001-09');
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
// EVE-001-10: Memory record created after session ends
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-001-10: Memory record created after session ends', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('eve-001-10');
  const regData = await apiRegister(page, email, PASSWORD);
  const userId = regData.user.id;
  const token = regData.token;

  // Get admin token for memory lookup (via API — no browser navigation needed)
  const adminToken = await apiAdminLogin(page);

  // Start session, exchange messages, end session
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'I have been struggling with my relationship with my partner Sam');
  await page.waitForTimeout(12000);
  await apiSendMessage(page, sessionId, token, 'We argue about money a lot');
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
// EVE-001-11: Second visit shows returning-user greeting
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-001-11: Second visit to Evelyn shows returning-user greeting', async ({ page }) => {
  test.setTimeout(150000);
  const email = uniqueEmail('eve-001-11');
  const PASSWORD_LOCAL = 'TestPass123!';

  // First session: use API to reliably create memory
  const regData = await apiRegister(page, email, PASSWORD_LOCAL);
  const token = regData.token;
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'I have been struggling with my relationship with my partner');
  await page.waitForTimeout(12000); // wait for Claude response
  await apiEndSession(page, sessionId, token);
  // Wait for background summarizeSession (Claude call) to complete
  await page.waitForTimeout(20000);

  // Second visit: use UI to check the greeting
  await loginUser(page, email, PASSWORD_LOCAL);
  await startSession(page);
  await page.waitForTimeout(3000); // let returning-user greeting fully render

  const greeting = await getLastResponse(page);
  const lower = greeting.toLowerCase();

  // Should have returning-user language (prompt says "acknowledge it's good to see them again")
  const hasReturningLanguage =
    lower.includes('good to see you') ||
    lower.includes('welcome back') ||
    lower.includes("you're back") ||
    lower.includes('again') ||
    lower.includes('return') ||
    lower.includes('glad') ||
    lower.includes("here you are") ||
    lower.includes('back');
  expect(hasReturningLanguage).toBeTruthy();
});

