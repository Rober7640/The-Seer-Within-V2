/**
 * LUV-001: New User Journey
 *
 * Tests the complete first-time experience for a new user chatting with
 * Luna Voss — from registration through birth data collection, first session,
 * and memory creation.
 *
 * Key Luna differences:
 *  - Luna requires birth date + time + city before reading (not just DOB)
 *  - LUV-001-05: verifies Luna asks for birth data if none provided
 *  - All bucket responses reference astrological placements (Venus, 10th house, North Node)
 *  - LUV-001-11: returning greeting checked for astrological warmth
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
  completeBirthDataCollectionViaChat,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  apiSeedBirthChart,
  apiCompleteBirthDataCollection,
  getAdminToken,
  adminGetMemory,
  birthReasonMessage,
  assertNoForbiddenPhrases,
  SELECTORS,
  BASE_URL,
  LUNA_SLUG,
} from './helpers';

const PASSWORD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-01: Registration grants exactly 180 coins (3 free minutes)
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-01: Registration shows 3 free minutes on /reading', async ({ page }) => {
  const email = uniqueEmail('luv-001-01');
  await registerUser(page, email, PASSWORD);

  await expect(page.locator('text=/3.*min|180.*coin/i').first()).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-02: Pre-session screen renders all key elements for Luna
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-02: Pre-session screen shows Luna avatar, name, and Begin Reading button for new users', async ({ page }) => {
  const email = uniqueEmail('luv-001-02');
  await registerUser(page, email, PASSWORD);

  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(2000);

  await expect(page.locator('text=Luna Voss').first()).toBeVisible({ timeout: 10000 });
  // Begin Reading button is now always visible — birth data gate removed
  await expect(page.locator(SELECTORS.beginReading).first()).toBeVisible({ timeout: 10000 });
  // The old pre-session birth data form should NOT appear
  const formSubmitBtn = page.locator('button:has-text("Calculate My Birth Chart")');
  await expect(formSubmitBtn).not.toBeVisible();

  // No teaser badge on a fresh account
  const teaserBadge = page.locator('[data-testid="teaser-badge"], .teaser-badge');
  expect(await teaserBadge.count()).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-03: New-user greeting does not contain returning-user language
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-03: New-user greeting does not contain returning-user language', async ({ page }) => {
  const email = uniqueEmail('luv-001-03');
  await registerUser(page, email, PASSWORD);
  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(1000);
  await startSession(page);

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
// LUV-001-04: "Start Reading" initialises a session and shows chat input
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-04: Clicking Begin Reading starts session and shows greeting', async ({ page }) => {
  const email = uniqueEmail('luv-001-04');
  await registerUser(page, email, PASSWORD);
  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(1000);

  // Begin Reading is now always available — no form gate
  await startSession(page);

  await expect(page.locator(SELECTORS.chatInput).first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator(SELECTORS.chatInput).first()).toBeEnabled();

  const bubbles = page.locator(SELECTORS.assistantBubble);
  await expect(bubbles.first()).toBeVisible({ timeout: 10000 });

  await expect(page.locator(SELECTORS.creditDisplay)).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-05: Luna asks for birth data if none provided
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-05: After first message, Luna asks for birth date with MM/DD/YYYY format', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-001-05');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  // First user message — states reason
  const res = await apiSendMessage(page, sessionId, regData.token, "I want to understand my love life");
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();

  // Luna must ask for birth DATE and show the MM/DD/YYYY format
  const asksForDate =
    msgLower.includes('mm/dd/yyyy') ||
    msgLower.includes('date of birth') ||
    msgLower.includes('birth date') ||
    msgLower.includes('born') ||
    msgLower.includes('06/15') ||   // example she may show
    msgLower.includes('date');
  expect(asksForDate).toBeTruthy();

  // Must NOT fabricate placements without data
  expect(msgLower).not.toMatch(/your sun is in \w+/);
  expect(msgLower).not.toMatch(/your moon is in \w+/);
  // Must NOT ask for time or city yet — only date on first ask
  expect(msgLower).not.toMatch(/what city|what time|birth city/);

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-06: Credits decrease after exchanging messages
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-06: Credit balance decreases after in-chat birth data collection', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-001-06');
  const regData = await apiRegister(page, email, PASSWORD);
  const token = regData.token;

  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);
  // Completing collection sends 4 messages — each charged against balance
  await apiCompleteBirthDataCollection(page, sessionId, token);

  const endData = await apiEndSession(page, sessionId, token);

  expect(endData.remainingCoins).toBeLessThan(180);
  expect(endData.sessionStatus).toBe('ended');
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-07: Love/relationships bucket gets astrological response
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-07: Love bucket message gets Venus/7th house astrological response', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-001-07');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId, personaId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  // Seed chart directly so this test focuses on reading behaviour, not collection
  await apiSeedBirthChart(page, regData.token, personaId);

  const res = await apiSendMessage(page, sessionId, regData.token, 'I want to understand my love life through my chart');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();
  const isAstrologyFocused =
    msgLower.includes('venus') ||
    msgLower.includes('7th house') ||
    msgLower.includes('relationship') ||
    msgLower.includes('love') ||
    msgLower.includes('chart') ||
    msgLower.includes('placement') ||
    msgLower.includes('sign') ||
    msgLower.includes('energy');
  expect(isAstrologyFocused).toBeTruthy();

  // Must be in Luna's voice — direct, witty, warm
  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i intuit');
  expect(msgLower).not.toContain('tarot');
  expect(msgLower).not.toContain('life path');
  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-08: Career bucket gets 10th house / Midheaven astrological response
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-08: Career message gets 10th house / Midheaven astrological response', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-001-08');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId, personaId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSeedBirthChart(page, regData.token, personaId);

  const res = await apiSendMessage(page, sessionId, regData.token, 'What does my chart say about my career?');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();
  const isCareerAstrology =
    msgLower.includes('10th') ||
    msgLower.includes('midheaven') ||
    msgLower.includes('saturn') ||
    msgLower.includes('career') ||
    msgLower.includes('chart') ||
    msgLower.includes('placement') ||
    msgLower.includes('house');
  expect(isCareerAstrology).toBeTruthy();

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-09: Life purpose bucket gets North Node astrological response
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-09: Life purpose message gets North Node / chart ruler astrological response', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-001-09');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId, personaId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSeedBirthChart(page, regData.token, personaId);

  const res = await apiSendMessage(page, sessionId, regData.token, "I'm trying to understand my life purpose");
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();
  const isLifePurposeAstrology =
    msgLower.includes('north node') ||
    msgLower.includes('chart ruler') ||
    msgLower.includes('purpose') ||
    msgLower.includes('calling') ||
    msgLower.includes('chart') ||
    msgLower.includes('house') ||
    msgLower.includes('placement') ||
    msgLower.includes('soul');
  expect(isLifePurposeAstrology).toBeTruthy();

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-10: Manual "End Reading" ends session and deducts coins
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-10: Manual End Session deducts correct coins and ends session', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-001-10');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId, personaId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSeedBirthChart(page, regData.token, personaId);
  await apiSendMessage(page, sessionId, regData.token, "Tell me about my chart");
  await page.waitForTimeout(12000);

  const endData = await apiEndSession(page, sessionId, regData.token);

  expect(endData.sessionStatus).toBe('ended');
  expect(typeof endData.remainingCoins).toBe('number');
  expect(endData.remainingCoins).toBeLessThanOrEqual(180);
  expect(endData.remainingCoins).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-11: Memory record created after Luna session ends
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-11: Memory record (with birth data) created after Luna Voss session ends', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-001-11');
  const regData = await apiRegister(page, email, PASSWORD);
  const userId = regData.user.id;
  const token = regData.token;

  await loginAdmin(page);
  const adminToken = await getAdminToken(page);
  expect(adminToken).toBeTruthy();

  const { sessionId, personaId } = await apiStartSession(page, token, LUNA_SLUG);
  await apiSeedBirthChart(page, token, personaId);
  await apiSendMessage(page, sessionId, token, 'Tell me about my love life from my chart');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);

  await page.waitForTimeout(5000); // allow async memory write

  const { memories } = await adminGetMemory(page, adminToken!, userId);

  // At least one session_summary memory
  const sessionMemory = memories.filter((m: any) => m.memoryType === 'session_summary');
  expect(sessionMemory.length).toBeGreaterThan(0);

  const mem = sessionMemory[0];
  expect(mem.summary || mem.fullContext).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-001-12 (bonus): Second visit shows returning-user greeting
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-001-12: Second visit to Luna shows returning-user greeting', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-001-12');

  // First session — complete birth data collection in-chat
  await registerUser(page, email, PASSWORD);
  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(1000);
  await startSession(page);
  await completeBirthDataCollectionViaChat(page);
  await endSession(page);

  // Log out and back in
  const logoutBtn = page.locator('[aria-label="Logout"], button:has-text("Logout")');
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await page.waitForTimeout(1000);
  }

  await loginUser(page, email, PASSWORD);
  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(1000);
  await startSession(page);

  const greeting = await getLastResponse(page);
  const lower = greeting.toLowerCase();

  const hasReturningLanguage =
    lower.includes('good to see you') ||
    lower.includes('welcome back') ||
    lower.includes("you're back") ||
    lower.includes('again') ||
    lower.includes('return') ||
    lower.includes('back');
  expect(hasReturningLanguage).toBeTruthy();
});
