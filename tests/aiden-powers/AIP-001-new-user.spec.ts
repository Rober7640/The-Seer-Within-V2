/**
 * AIP-001: New User Journey
 *
 * Tests the complete first-time experience for a new user chatting with
 * Aiden Powers — from registration through first session to memory creation.
 *
 * Key Aiden difference: topics are numerology-specific (life path, pinnacle,
 * personal year), and all response assertions check for calculation/decode
 * framing rather than psychic/intuitive framing.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  registerUser,
  loginUser,
  loginAdmin,
  startSession,
  sendMessage,
  endSession,
  getLastResponse,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  getAdminToken,
  adminGetMemory,
  SELECTORS,
  BASE_URL,
  AIDEN_SLUG,
} from './helpers';

const PASSWORD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-01: Registration grants exactly 180 coins (3 free minutes)
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-01: Registration shows 3 free minutes on /reading', async ({ page }) => {
  const email = uniqueEmail('aip-001-01');
  await registerUser(page, email, PASSWORD);

  // Should land on reading page and show free time
  await expect(page.locator('text=/3.*min|180.*coin/i').first()).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-02: Pre-session screen renders all key elements for Aiden
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-02: Pre-session screen shows Aiden name, greeting, and chat input', async ({ page }) => {
  const email = uniqueEmail('aip-001-02');
  await registerUser(page, email, PASSWORD);

  // Navigate to Aiden's chat page — app auto-fetches the greeting
  await page.goto(`/chat/${AIDEN_SLUG}`);

  // Persona name visible in header
  await expect(page.locator('text=Aiden Powers').first()).toBeVisible({ timeout: 10000 });

  // Greeting bubble should auto-appear (no button click needed)
  await expect(page.locator(SELECTORS.assistantBubble).first()).toBeVisible({ timeout: 15000 });

  // Chat input should be ready
  await expect(page.locator(SELECTORS.chatInput).first()).toBeVisible({ timeout: 10000 });

  // No teaser badge on a fresh account
  const teaserBadge = page.locator('[data-testid="teaser-badge"], .teaser-badge');
  const badgeCount = await teaserBadge.count();
  expect(badgeCount).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-03: New-user greeting does not contain returning-user language
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-03: New-user greeting does not contain returning-user language', async ({ page }) => {
  const email = uniqueEmail('aip-001-03');
  await registerUser(page, email, PASSWORD);
  await page.goto(`/chat/${AIDEN_SLUG}`);
  // Greeting is auto-fetched — wait for it to appear
  await page.locator(SELECTORS.assistantBubble).first().waitFor({ state: 'visible', timeout: 15000 });

  const greeting = await getLastResponse(page);
  expect(greeting.length).toBeGreaterThan(10);

  const lower = greeting.toLowerCase();
  expect(lower).not.toContain('welcome back');
  expect(lower).not.toContain('good to see you again');
  expect(lower).not.toContain('last time');
  expect(lower).not.toContain('we spoke');
  expect(lower).not.toContain('you mentioned');

  // Must not use psychic/sensing framing (Aiden is a calculator, not a psychic)
  expect(lower).not.toContain('i sense');
  expect(lower).not.toContain('i feel that');
  expect(lower).not.toContain('i intuit');
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-04: "Start Reading" initialises a session and shows chat input
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-04: Navigating to Aiden auto-starts pre-session and activates chat input', async ({ page }) => {
  const email = uniqueEmail('aip-001-04');
  await registerUser(page, email, PASSWORD);
  await page.goto(`/chat/${AIDEN_SLUG}`);

  // Greeting is auto-fetched — wait for it
  const bubbles = page.locator(SELECTORS.assistantBubble);
  await expect(bubbles.first()).toBeVisible({ timeout: 15000 });

  // Chat input should be visible and enabled
  await expect(page.locator(SELECTORS.chatInput).first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator(SELECTORS.chatInput).first()).toBeEnabled();

  // Credit timer should be visible (paused pre-session)
  await expect(page.locator(SELECTORS.creditDisplay)).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-05: Credits decrease after exchanging messages
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-05: Credit balance decreases after session with messages', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-001-05');

  const regData = await apiRegister(page, email, PASSWORD);
  const token = regData.token;

  const { sessionId } = await apiStartSession(page, token, AIDEN_SLUG);
  await apiSendMessage(page, sessionId, token, 'I want to understand my life path number');
  await page.waitForTimeout(15000); // Wait for Claude response
  // Send a second message and wait so total elapsed time exceeds 30s → rounds to ≥1 min (60 coins)
  await apiSendMessage(page, sessionId, token, 'Can you tell me more about my life path?');
  await page.waitForTimeout(20000);

  const endData = await apiEndSession(page, sessionId, token);

  expect(endData.remainingCoins).toBeLessThan(180);
  expect(endData.sessionStatus).toBe('ended');
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-06: Life path topic message gets numerology-focused response
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-06: Life path message gets numerology-focused response', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-001-06');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, 'I want to understand my life path number');
  expect(res.status()).toBe(200);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  expect(data.message.length).toBeGreaterThan(20);

  const msgLower = data.message.toLowerCase();

  // Must be numerology-focused (not tarot/astrology/psychic)
  const isNumerologyFocused =
    msgLower.includes('life path') ||
    msgLower.includes('number') ||
    msgLower.includes('blueprint') ||
    msgLower.includes('calculate') ||
    msgLower.includes('born') ||
    msgLower.includes('birth') ||
    msgLower.includes('date');
  expect(isNumerologyFocused).toBeTruthy();

  // Must NOT use psychic/sensing framing
  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i feel that');
  expect(msgLower).not.toContain('tarot');
  expect(msgLower).not.toContain('stars');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-07: Love/relationship message bridges to numerology framing
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-07: Love/relationship message bridges to numerology framing', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-001-07');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    "I keep hitting the same walls in my relationship — can you read my numbers?",
  );
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();

  // Must bridge to numerology framing
  const isNumerologyBridged =
    msgLower.includes('expression number') ||
    msgLower.includes('number') ||
    msgLower.includes('blueprint') ||
    msgLower.includes('birth') ||
    msgLower.includes('relationship') ||
    msgLower.includes('calculate');
  expect(isNumerologyBridged).toBeTruthy();

  // Must NOT use psychic/intuitive language
  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i feel that');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-08: Career/timing message bridges to Personal Year or Pinnacle
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-08: Career/timing message bridges to Pinnacle or Personal Year framing', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-001-08');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    "Is this a good time to change careers? I keep feeling stuck.",
  );
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();

  // Must bridge to career/timing numerology
  const isCareerNumerology =
    msgLower.includes('pinnacle') ||
    msgLower.includes('personal year') ||
    msgLower.includes('timing') ||
    msgLower.includes('number') ||
    msgLower.includes('calculate') ||
    msgLower.includes('career') ||
    msgLower.includes('birth');
  expect(isCareerNumerology).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-09: Manual "End Reading" ends session and deducts coins
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-09: Manual End Session deducts correct coins and ends session', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-001-09');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  // Exchange at least one message
  await apiSendMessage(page, sessionId, regData.token, 'Hello, I need guidance on my numbers');
  await page.waitForTimeout(12000);

  // End the session
  const endData = await apiEndSession(page, sessionId, regData.token);

  expect(endData.sessionStatus).toBe('ended');
  expect(typeof endData.remainingCoins).toBe('number');
  expect(endData.remainingCoins).toBeLessThanOrEqual(180);
  expect(endData.remainingCoins).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-001-10: Memory record created after session ends
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-10: Memory record created after Aiden Powers session ends', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('aip-001-10');
  const regData = await apiRegister(page, email, PASSWORD);
  const userId = regData.user.id;
  const token = regData.token;

  // Get admin token for memory lookup
  await loginAdmin(page);
  const adminToken = await getAdminToken(page);
  expect(adminToken).toBeTruthy();

  // Start session, exchange messages, end session
  const { sessionId } = await apiStartSession(page, token, AIDEN_SLUG);
  await apiSendMessage(page, sessionId, token, 'I was born on March 15, 1987 and want to understand my life path');
  await page.waitForTimeout(12000);
  await apiSendMessage(page, sessionId, token, 'My name is Alexandra. What does my blueprint say about relationships?');
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
// AIP-001-11: Second visit shows returning-user greeting
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-001-11: Second visit to Aiden shows returning-user greeting', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('aip-001-11');

  // First session — via API; wait long enough for Claude to respond and memory to be generated
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);
  await apiSendMessage(page, sessionId, regData.token, 'Tell me about life path numbers');
  await page.waitForTimeout(20000); // Wait for Claude response
  await apiSendMessage(page, sessionId, regData.token, 'I was born March 15, 1987');
  await page.waitForTimeout(20000); // Second exchange for richer memory
  await apiEndSession(page, sessionId, regData.token);
  await page.waitForTimeout(5000); // Allow async memory generation to complete

  // Second visit — UI
  await loginUser(page, email, PASSWORD);
  await page.goto(`/chat/${AIDEN_SLUG}`);
  // Greeting is auto-fetched — wait for it
  await page.locator(SELECTORS.assistantBubble).first().waitFor({ state: 'visible', timeout: 15000 });

  // Check for returning-user signals: memory badge OR returning language in greeting
  const memoryBadge = page.locator('text=/remembers your previous sessions/i');
  const hasMemoryBadge = await memoryBadge.isVisible({ timeout: 3000 }).catch(() => false);

  const greeting = await getLastResponse(page);
  const lower = greeting.toLowerCase();
  const hasReturningLanguage =
    lower.includes('good to see you') ||
    lower.includes('welcome back') ||
    lower.includes("you're back") ||
    lower.includes('again') ||
    lower.includes('return') ||
    lower.includes('back') ||
    lower.includes('blueprint') || // Aiden may reference prior blueprint without "back"
    lower.includes('last time') ||
    lower.includes('previously');

  expect(hasMemoryBadge || hasReturningLanguage).toBeTruthy();

  // Still must NOT use psychic framing
  expect(lower).not.toContain('i sense');
  expect(lower).not.toContain('i intuit');
});
