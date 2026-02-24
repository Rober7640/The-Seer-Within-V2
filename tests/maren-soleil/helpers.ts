/**
 * Shared helpers for Maren Soleil Playwright test suite.
 * All tests in tests/maren-soleil/ import from here.
 *
 * Key differences from evelyn-cross/helpers.ts:
 *  - MAREN_SLUG / EVELYN_SLUG instead of EVELYN_SLUG / MARCUS_SLUG
 *  - Extended forbidden phrases (absolute predictions banned for Maren)
 *  - hasFeltTruthFraming() helper for MASO-007-04
 *    (Maren IS a clairvoyant empath — sensing/feeling language is EXPECTED, not banned)
 */

import { Page } from '@playwright/test';

export const BASE_URL = 'http://localhost:5000';
export const MAREN_SLUG = 'maren-soleil';
export const OTHER_PERSONA_SLUG = 'evelyn-cross'; // for isolation tests
export const OTHER_PERSONA_NAME = 'Evelyn Cross';
export const ADMIN_EMAIL = 'admin@theseerwithin.com';
export const ADMIN_PASSWORD = 'ChangeMe123!';
export const TEST_PASSWORD = 'TestPass123!';

// Selector constants matching the existing UI
export const SELECTORS = {
  // The pre-reading welcome button (data-testid for reliability)
  beginReading: '[data-testid="start-session-button"]',
  // "End Reading" is the label used in the active-session header
  endSession: 'button:has-text("End Reading"), [aria-label="End Reading"]',
  chatInput: 'input[type="text"]',
  sendButton: 'button[type="submit"]',
  assistantBubble: '.bg-white.text-gray-800.border',
  // Pre-session: shows "3:00 paused"; active session: shows "X min left"
  creditDisplay: 'text=/min left|paused/i',
  outOfCreditsModal: "text=/You've run out of credits/i",
  purchaseCTA: 'text=/Purchase More Credits/i',
};

// ─────────────────────────────────────────────
// User Identity Helpers
// ─────────────────────────────────────────────

export function uniqueEmail(prefix = 'mar') {
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

/**
 * Get an admin token directly via the API — more reliable than UI login
 * because loginAdmin's waitForURL(/.*admin/) matches /admin/login itself,
 * which can cause silent failures.
 */
export async function apiGetAdminToken(page: Page): Promise<string | null> {
  const res = await page.request.post(`${BASE_URL}/api/admin/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) return null;
  const data = await res.json();
  return data.token ?? null;
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
export async function getPersonaId(page: Page, token: string, slug = MAREN_SLUG): Promise<string> {
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
  personaSlug = MAREN_SLUG,
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
 * Navigate to Maren's chat page (if not already there) and wait for her
 * greeting to appear.
 *
 * Maren Soleil is index 4 in the personas list — NOT the default persona that
 * /reading selects. Always navigating to /chat/maren-soleil ensures every
 * UI test exercises Maren, regardless of where the page currently is.
 *
 * The greeting auto-loads on page load (no button click required). If the
 * "Begin Your Reading" button is briefly visible before the auto-fetch hides
 * it, we click it. Either way we wait for [data-testid="chat-greeting"].
 */
export async function startSession(page: Page) {
  // Always navigate to Maren's dedicated chat page
  const currentUrl = page.url();
  if (!currentUrl.includes(MAREN_SLUG)) {
    await page.goto(`/chat/${MAREN_SLUG}`);
  }
  await page.waitForTimeout(500);

  // Click the button if it's still visible (briefly before auto-fetch hides it)
  const btn = page.locator(SELECTORS.beginReading);
  const isVisible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
  if (isVisible) {
    await btn.click();
  }

  // Wait for the first assistant greeting bubble
  await page.waitForSelector('[data-testid="chat-greeting"]', { timeout: 30000 });
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

/**
 * End the active session via the UI.
 *
 * The "End Reading" header button opens a confirm dialog. We must click
 * the confirm "End Reading" button inside that dialog to actually end the
 * session. Then we wait for the server to finalize and for the async
 * summarizeSession background job to have enough time to run.
 */
export async function endSession(page: Page) {
  // Step 1: Click the header "End Reading" button (opens confirm dialog)
  const headerBtn = page.locator('[aria-label="End Reading"]');
  if (!(await headerBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await headerBtn.click();
  await page.waitForTimeout(500);

  // Step 2: Confirm in the dialog (the red "End Reading" button)
  const confirmBtn = page.locator('button:has-text("End Reading")').last();
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  // Step 3: Wait for session to fully close + allow async memory summarization to run
  await page.waitForTimeout(5000);
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
 * Maren's forbidden phrases:
 *  - Universal AI self-identification (same as other personas)
 *  - Absolute predictions (banned for a felt-truth empath)
 *
 * NOTE: sensing/feeling language ("I sense", "I feel") is NOT banned for Maren —
 * it is her primary framing mode. Only AI-identity and absolute predictions are forbidden.
 */
const MAREN_FORBIDDEN_PHRASES = [
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
  'artificial intelligence',
  'i am an algorithm',
  'i\'m an algorithm',
  'based on algorithms',
  'i am a bot',
  'i\'m a bot',
  'i am a chatbot',
  // Absolute outcome predictions (banned for Maren)
  'he will definitely',
  'she will definitely',
  'they will definitely',
  'i guarantee',
  'i promise',
  'he will come back',
  'she will come back',
];

/** Assert that a response text contains none of Maren's forbidden phrases. */
export function assertNoForbiddenPhrases(text: string) {
  const lower = text.toLowerCase();
  for (const phrase of MAREN_FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      throw new Error(`Response contains forbidden phrase "${phrase}":\n\n"${text}"`);
    }
  }
}

/**
 * Check that text uses felt-truth framing — Maren's "I sense" equivalent.
 * (NOT banned like Aiden's sensing language — Maren IS a clairvoyant empath.)
 */
export function hasFeltTruthFraming(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = [
    "i'm sensing",
    "i'm feeling",
    'what i sense',
    'what i feel',
    'the cord',
    'the energy between',
    'it feels',
    'i sense',
    'i feel',
    'this feels',
    'feels karmic',
    'feels open',
    'feels closed',
    'feels like recognition',
    'the flame',
    'the pull',
    'the current',
    'the warmth',
    'the tide',
    // Additional epistemic/hedged framing Maren uses
    'suggests',
    ' may ',
    ' might ',
    'perhaps',
    'could be',
    'i read',
    'what i read',
    'the reading',
    'pick up',
    'picking up',
    'i pick',
    'between you',
    'in this connection',
    'the energy',
    'i see',
    'i perceive',
  ];
  return patterns.some((p) => lower.includes(p));
}

/** Count words in a string. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Count question marks in a string. */
export function questionCount(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

/** Check that text contains no markdown formatting. */
export function hasNoMarkdown(text: string): boolean {
  return !/(\*\*|__|\#{1,3} |^- |\d+\. )/m.test(text);
}
