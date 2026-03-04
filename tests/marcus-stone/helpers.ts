/**
 * Shared helpers for Marcus Stone Playwright test suite.
 * All tests in tests/marcus-stone/ may import from here.
 *
 * Modelled after tests/evelyn-cross/helpers.ts for consistency.
 */

import { Page } from '@playwright/test';

export const BASE_URL = 'http://localhost:5000';
export const MARCUS_SLUG = 'marcus-stone';
export const EVELYN_SLUG = 'evelyn-cross';
export const ADMIN_EMAIL = 'admin@theseerwithin.com';
export const ADMIN_PASSWORD = 'ChangeMe123!';
export const TEST_PASSWORD = 'TestPass123!';

// Selector constants matching the existing UI
export const SELECTORS = {
  beginReading: 'button:has-text("Begin Reading"), button:has-text("Start Reading")',
  endSession: 'text=End Session',
  chatInput: 'input[type="text"]',
  sendButton: 'button[type="submit"]',
  assistantBubble: '.bg-white.text-gray-800.border',
  creditDisplay: 'text=/min remaining/i',
  outOfCreditsModal: 'text=/Your Reading Time Has Ended/i',
  purchaseCTA: 'text=/Purchase More Credits/i',
};

// ─────────────────────────────────────────────
// User Identity Helpers
// ─────────────────────────────────────────────

export function uniqueEmail(prefix = 'mas') {
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
export async function getPersonaId(page: Page, token: string, slug = MARCUS_SLUG): Promise<string> {
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
  personaSlug = MARCUS_SLUG,
): Promise<{ sessionId: string; remainingCoins: number; personaId: string }> {
  const greetingRes = await page.request.get(
    `${BASE_URL}/api/chat-service/greeting/${personaSlug}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const greetingData = await greetingRes.json();
  const personaId = await getPersonaId(page, token, personaSlug);

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

/** Click "Begin Reading" and wait for the chat to initialise. */
export async function startSession(page: Page) {
  await page.locator(SELECTORS.beginReading).first().click();
  await page.waitForTimeout(3000);
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
 * Marcus Stone's full forbidden-phrase list.
 * Covers both AI-disclosure phrases and his tarot-specific card-draw phrases.
 */
export const MARCUS_FORBIDDEN_PHRASES = [
  'as an ai',
  "i'm programmed",
  'i cannot',
  "i don't have access to",
  "i'm an ai assistant",
  'language model',
  'i was trained',
  'my training',
  'i am an ai',
  'artificial intelligence',
  ' bot ',
  'algorithm',
  'let me pull',
  'let me draw',
  'i will pull',
  'i will draw',
  "i don't have feelings",
];

/** Assert that a response text contains none of Marcus's forbidden phrases. */
export function assertNoForbiddenPhrases(text: string) {
  const lower = text.toLowerCase();
  for (const phrase of MARCUS_FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      throw new Error(`Response contains forbidden phrase "${phrase}":\n\n"${text}"`);
    }
  }
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
 * Check that text uses tentative/symbolic framing rather than absolute predictions.
 * Marcus uses archetypal / card-language framing.
 */
export function hasTentativeFraming(text: string): boolean {
  const lower = text.toLowerCase();
  const tentativePatterns = [
    'the card suggests',
    'there\'s an energy',
    "i'm sensing",
    'the archetype',
    'the energy here',
    'it feels like',
    'points to',
    'could',
    'may',
    'might',
    'seems',
    'appears',
    'suggests',
    'signals',
  ];
  return tentativePatterns.some((p) => lower.includes(p));
}

/** Check that text contains no markdown formatting. [TAROT_DRAW] tokens are allowed. */
export function hasNoMarkdown(text: string): boolean {
  const cleaned = text.replace(/\[TAROT_DRAW\]/gi, '');
  return !/(\*\*|__|\#{1,3} |^- |\d+\. )/m.test(cleaned);
}
