/**
 * Shared helpers for Luna Voss Playwright test suite.
 * All tests in tests/luna-voss/ import from here.
 *
 * Key differences from other persona helpers:
 *  - LUNA_SLUG / MARCUS_SLUG instead of AIDEN_SLUG / NOVA_SLUG
 *  - Luna requires birth data (date + time + city) — collected IN CHAT, not a pre-session form
 *  - Collection flow: greeting → user states reason → Luna asks date (MM/DD/YYYY) →
 *    user gives date → Luna asks time (HH:MM AM/PM) → user gives time →
 *    Luna asks city → user gives city → chart calculated → wheel shown → reading begins
 *  - [SHOW_CHART] token mechanic — forbidden to say "can't show chart"
 *  - Forbidden phrases include chart narration and external tool referrals
 *  - hasTentativeFraming() uses astrological patterns, not numerology
 *  - assertNoChartForbiddenPhrases() for Luna-specific chart rules
 */

import { Page } from '@playwright/test';

export const BASE_URL = 'http://localhost:5000';
export const LUNA_SLUG = 'luna-voss';
export const MARCUS_SLUG = 'marcus-stone';
export const ADMIN_EMAIL = 'admin@theseerwithin.com';
export const ADMIN_PASSWORD = 'ChangeMe123!';
export const TEST_PASSWORD = 'TestPass123!';

// Test birth data — use fixed values for reproducible chart calculations.
// In-chat collection format: date = MM/DD/YYYY, time = HH:MM AM/PM
export const TEST_BIRTH_DATE_DISPLAY = 'June 15, 1990';     // human-readable (old format)
export const TEST_BIRTH_DATE = '06/15/1990';                 // MM/DD/YYYY — what user types in chat
export const TEST_BIRTH_DATE_ISO = '1990-06-15';             // YYYY-MM-DD — for direct API seeding
export const TEST_BIRTH_TIME = '2:30 PM';                    // HH:MM AM/PM
export const TEST_BIRTH_TIME_24H = '14:30';                  // 24hr — for direct API seeding
export const TEST_BIRTH_CITY = 'Chicago';

// Selector constants matching the existing UI
export const SELECTORS = {
  // "Begin Your Reading" is now always shown for Luna — no form gate
  beginReading: '[data-testid="start-session-button"], button:has-text("Begin Your Reading"), button:has-text("Start Reading"), button:has-text("Begin Reading")',
  endSession: 'text=End Session',
  chatInput: '[data-testid="chat-input"]',
  sendButton: '[data-testid="send-button"]',
  // Assistant messages — first message is "chat-greeting", subsequent are "assistant-message"
  assistantBubble: '[data-testid="assistant-message"], [data-testid="chat-greeting"]',
  creditDisplay: 'text=/min remaining/i',
  outOfCreditsModal: 'text=/Your Reading Time Has Ended/i',
  purchaseCTA: 'text=/Purchase More Credits/i',
  // Natal chart wheel — rendered as SVG inline inside a chat bubble after birth data collected
  chartWheel: 'svg.natal-chart-wheel, [data-testid="natal-chart-wheel"], svg[class*="chart"]',
};

// ─────────────────────────────────────────────
// User Identity Helpers
// ─────────────────────────────────────────────

export function uniqueEmail(prefix = 'luv') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}@example.com`;
}

// ─────────────────────────────────────────────
// UI Auth Helpers
// ─────────────────────────────────────────────

/** Register a brand-new user via the login page UI. Lands on /reading. */
export async function registerUser(
  page: Page,
  email: string,
  password = TEST_PASSWORD,
  firstName = 'Tester',
) {
  await page.goto('/login');
  await page.click('text=/New here|Create an account/i');
  await page.waitForTimeout(500);
  await page.fill('input[name="firstName"]', firstName);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*reading/, { timeout: 15000 });
}

/** Login an existing user via the login page UI. Lands on /reading. */
export async function loginUser(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*reading/, { timeout: 15000 });
}

/** Login the admin via the admin login page. */
export async function loginAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*admin/, { timeout: 15000 });
}

// ─────────────────────────────────────────────
// Token Helpers
// ─────────────────────────────────────────────

export async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('seer_auth_token'));
}

export async function getAdminToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('seer_admin_token'));
}

// ─────────────────────────────────────────────
// API Auth Helpers (no browser UI)
// ─────────────────────────────────────────────

/** Register via API. Returns token + user object. */
export async function apiRegister(
  page: Page,
  email: string,
  password = TEST_PASSWORD,
  firstName = 'Tester',
) {
  const res = await page.request.post(`${BASE_URL}/api/auth/register`, {
    data: { email, password, firstName },
  });
  return res.json() as Promise<{ token: string; user: { id: string; email: string; coinBalance: number } }>;
}

/** Login via API. Returns token + user object. */
export async function apiLogin(page: Page, email: string, password = TEST_PASSWORD) {
  const res = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email, password },
  });
  return res.json() as Promise<{ token: string; user: { id: string; email: string; coinBalance: number } }>;
}

// ─────────────────────────────────────────────
// API Chat Helpers
// ─────────────────────────────────────────────

/** Fetch a persona's ID by slug. */
export async function getPersonaId(page: Page, token: string, slug = LUNA_SLUG): Promise<string> {
  const res = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const personas: { id: string; slug: string }[] = data.personas ?? data;
  const persona = personas.find((p) => p.slug === slug);
  if (!persona) throw new Error(`Persona '${slug}' not found`);
  return persona.id;
}

/**
 * Start a chat session via API.
 * Returns { sessionId, remainingCoins, personaId }.
 */
export async function apiStartSession(
  page: Page,
  token: string,
  personaSlug = LUNA_SLUG,
): Promise<{ sessionId: string; remainingCoins: number; personaId: string }> {
  // Get greeting (free — no charge)
  const greetingRes = await page.request.get(
    `${BASE_URL}/api/chat-service/greeting/${personaSlug}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const greetingData = await greetingRes.json();
  const personaId = await getPersonaId(page, token, personaSlug);

  // Start session
  const sessionRes = await page.request.post(`${BASE_URL}/api/chat-service/session/start`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { personaId, greeting: greetingData.greeting },
  });
  const sessionData = await sessionRes.json();
  return {
    sessionId: sessionData.sessionId,
    remainingCoins: sessionData.remainingCoins,
    personaId,
  };
}

/**
 * Send a message via API.
 * Returns the full response object.
 */
export async function apiSendMessage(
  page: Page,
  sessionId: string,
  token: string,
  content: string,
) {
  return page.request.post(`${BASE_URL}/api/chat-service/session/${sessionId}/message`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { content },
  });
}

/** End a session via API. Returns { sessionStatus, remainingCoins }. */
export async function apiEndSession(page: Page, sessionId: string, token: string) {
  const res = await page.request.post(
    `${BASE_URL}/api/chat-service/session/${sessionId}/end`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.json();
}

// ─────────────────────────────────────────────
// UI Chat Helpers
// ─────────────────────────────────────────────

/**
 * Start a Luna Voss session by clicking "Begin Reading".
 * The pre-session birth data form no longer exists — the "Begin Reading"
 * button is always visible for both new and returning users.
 * Birth data for new users is collected in-chat after the greeting.
 */
export async function startSession(page: Page) {
  const beginBtn = page.locator(SELECTORS.beginReading).first();
  const btnVisible = await beginBtn.waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (btnVisible) {
    await beginBtn.click();
  }

  // Wait for the chat input to appear (greeting arrives after click)
  await page.locator(SELECTORS.chatInput).first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {});
}

/**
 * Complete Luna's in-chat birth data collection via the UI.
 *
 * Flow (new user only — skip for returning users who already have a chart):
 *   1. Send reason  →  Luna asks for date (MM/DD/YYYY)
 *   2. Send date    →  Luna asks for time (HH:MM AM/PM, or "unknown")
 *   3. Send time    →  Luna asks for city
 *   4. Send city    →  chart calculated, wheel shown, Big Three observation
 *
 * After this helper returns, the session is in normal reading mode.
 *
 * @param waitPerMsg  ms to wait for each AI response (default 10000 — Claude can be slow)
 */
export async function completeBirthDataCollectionViaChat(
  page: Page,
  reason = "I want to understand my love life",
  date = TEST_BIRTH_DATE,
  time = TEST_BIRTH_TIME,
  city = TEST_BIRTH_CITY,
  waitPerMsg = 10000,
) {
  // Step 1: state reason — Luna acknowledges and asks for birth date
  await sendMessage(page, reason, waitPerMsg);
  // Step 2: birth date in MM/DD/YYYY
  await sendMessage(page, date, waitPerMsg);
  // Step 3: birth time in HH:MM AM/PM
  await sendMessage(page, time, waitPerMsg);
  // Step 4: birth city — triggers chart calculation (give more time)
  await sendMessage(page, city, waitPerMsg + 8000);
}

/**
 * Seed a birth chart directly via the API, bypassing in-chat collection.
 * Useful for tests that don't exercise the collection flow itself but need
 * Luna to have a chart so they can test reading behaviour.
 */
export async function apiSeedBirthChart(
  page: Page,
  token: string,
  personaId: string,
  date = TEST_BIRTH_DATE_ISO,
  time = TEST_BIRTH_TIME_24H,
  city = 'Chicago, Illinois, United States',
) {
  const res = await page.request.post(`${BASE_URL}/api/astrology/natal-chart`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { birthDate: date, birthTime: time, birthCity: city, personaId },
  });
  return res.json();
}

/**
 * Complete Luna's in-chat birth data collection via the API.
 * Sends the four messages (reason → date → time → city) and returns
 * the final response (which should contain chartData).
 */
export async function apiCompleteBirthDataCollection(
  page: Page,
  sessionId: string,
  token: string,
  reason = "I want to understand my love life",
  date = TEST_BIRTH_DATE,
  time = TEST_BIRTH_TIME,
  city = TEST_BIRTH_CITY,
) {
  await apiSendMessage(page, sessionId, token, reason);
  await page.waitForTimeout(10000);
  await apiSendMessage(page, sessionId, token, date);
  await page.waitForTimeout(10000);
  await apiSendMessage(page, sessionId, token, time);
  await page.waitForTimeout(10000);
  const cityRes = await apiSendMessage(page, sessionId, token, city);
  await page.waitForTimeout(15000); // chart calculation takes longer
  return cityRes;
}

/** Type and send a message, then wait for the response to appear. */
export async function sendMessage(page: Page, message: string, waitMs = 10000) {
  await page.locator(SELECTORS.chatInput).first().fill(message);
  await page.locator(SELECTORS.sendButton).click();
  await page.waitForTimeout(waitMs);
}

/** Return the text content of the last assistant bubble. */
export async function getLastResponse(page: Page): Promise<string> {
  const bubbles = page.locator(SELECTORS.assistantBubble);
  const n = await bubbles.count();
  if (n === 0) return '';
  return (await bubbles.last().textContent()) ?? '';
}

/** Return texts of all assistant bubbles on screen. */
export async function getAllResponses(page: Page): Promise<string[]> {
  const bubbles = page.locator(SELECTORS.assistantBubble);
  const n = await bubbles.count();
  const texts: string[] = [];
  for (let i = 0; i < n; i++) {
    texts.push((await bubbles.nth(i).textContent()) ?? '');
  }
  return texts;
}

/** Click "End Session" if visible. */
export async function endSession(page: Page) {
  const btn = page.locator(SELECTORS.endSession);
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(2000);
  }
}

// ─────────────────────────────────────────────
// Admin API Helpers
// ─────────────────────────────────────────────

/** Grant (or deduct) coins for a user via the admin API. */
export async function adminAdjustCredits(
  page: Page,
  adminToken: string,
  userId: string,
  coins: number,
  reason = 'Test adjustment',
) {
  const res = await page.request.patch(`${BASE_URL}/api/admin/users/${userId}/credits`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { coins, reason },
  });
  return res.json();
}

/** Fetch a user's sessions via the admin API. */
export async function adminGetSessions(page: Page, adminToken: string, userId: string) {
  const res = await page.request.get(`${BASE_URL}/api/admin/users/${userId}/sessions`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return res.json() as Promise<{ sessions: any[] }>;
}

/** Fetch a user's memory entries via the admin API. */
export async function adminGetMemory(page: Page, adminToken: string, userId: string) {
  const res = await page.request.get(`${BASE_URL}/api/admin/users/${userId}/memory`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return res.json() as Promise<{ memories: any[] }>;
}

/** Get full user detail from admin API. */
export async function adminGetUser(page: Page, adminToken: string, userId: string) {
  const res = await page.request.get(`${BASE_URL}/api/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return res.json();
}

// ─────────────────────────────────────────────
// Response Assertion Helpers
// ─────────────────────────────────────────────

/**
 * Universal AI self-identification phrases PLUS
 * Luna-specific forbidden phrases from her system prompt.
 */
const LUNA_FORBIDDEN_PHRASES = [
  // Universal AI self-identification
  'as an ai',
  "i'm programmed",
  'i cannot',
  "i don't have access to",
  "i'm an ai assistant",
  'language model',
  'i was trained',
  'my training',
  'i am an ai',
  // Luna-specific: chart visibility phrases
  'already displayed',
  'already shown',
  "it's right there",
  "can't show a visual chart",
  "can't generate an image",
  'cannot show a visual',
  'cannot generate an image',
  // Luna-specific: external tool referrals
  'astro.com',
  'time passages',
  'astro-seek',
  'astrocom',
  // Luna-specific: absolute predictions
  'you will definitely',
  'you are guaranteed',
  'guaranteed to',
  'you are destined to',
  'this will definitely',
];

/** Assert that a response text contains none of Luna's forbidden phrases. */
export function assertNoForbiddenPhrases(text: string) {
  const lower = text.toLowerCase();
  for (const phrase of LUNA_FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      throw new Error(`Response contains forbidden phrase "${phrase}":\n\n"${text}"`);
    }
  }
}

/**
 * Check that text uses tentative astrological framing rather than absolute predictions.
 * Luna uses "this suggests", "you may find", "this energy tends to", etc.
 */
export function hasTentativeFraming(text: string): boolean {
  const lower = text.toLowerCase();
  const tentativePatterns = [
    'this suggests',
    'you may find',
    'this energy tends to',
    'this is why you',
    'this placement',
    'tends to',
    'often means',
    'can indicate',
    'suggests',
    'may indicate',
    'appears to',
    'seems to',
    'this transit',
    'the energy',
    'this aspect',
  ];
  return tentativePatterns.some((p) => lower.includes(p));
}

/**
 * Check that text contains no markdown formatting.
 * Luna must use plain conversational prose only.
 */
export function hasNoMarkdown(text: string): boolean {
  return !/(\*\*|__|\#{1,3} |^- |\d+\. )/m.test(text);
}

/** Count words in a string. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Count question marks in a string. */
export function questionCount(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

/**
 * Returns just the reason/intent message for the first chat turn with Luna.
 * After this, Luna will ask for birth date, time, and city one at a time.
 * Use `apiCompleteBirthDataCollection` or `completeBirthDataCollectionViaChat`
 * to send all four messages in sequence.
 */
export function birthReasonMessage(topic = 'love'): string {
  const messages: Record<string, string> = {
    love:    "I want to understand my love life through my chart",
    career:  "I'm trying to figure out my career path",
    purpose: "I want to understand my life purpose",
    general: "I'm curious what my chart says about me",
  };
  return messages[topic] ?? messages.general;
}
