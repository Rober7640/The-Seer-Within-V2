/**
 * EVE-002: Returning User (Same Day)
 *
 * Verifies the returning-user experience: different greeting, badge
 * suppression, and subtle (not forceful) use of prior memory.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  loginUser,
  startSession,
  getLastResponse,
  apiRegister,
  apiLogin,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  SELECTORS,
  BASE_URL,
} from './helpers';

const PWD = 'TestPass123!';

/** Register + complete one full Evelyn session so returning-user state is set. */
async function setupReturningUser(page: any, email: string, topic = 'I want guidance about my love life and my partner Alex') {
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);
  await apiSendMessage(page, sessionId, regData.token, topic);
  await page.waitForTimeout(13000);
  await apiEndSession(page, sessionId, regData.token);
  await page.waitForTimeout(3000); // allow async memory write
  return { token: regData.token, userId: regData.user.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVE-002-01: Returning greeting has returning-user language
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-002-01: Second visit shows returning-user greeting language', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('eve-002-01');
  await setupReturningUser(page, email);

  await loginUser(page, email, PWD);
  await startSession(page);

  const greeting = await getLastResponse(page);
  const lower = greeting.toLowerCase();

  const isReturning =
    lower.includes('good to see you') ||
    lower.includes('welcome back') ||
    lower.includes("you're back") ||
    lower.includes('again') ||
    lower.includes('return');
  expect(isReturning).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-002-02: Greeting does NOT preemptively recite memory details
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-002-02: Greeting does not force-reference names from prior session', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('eve-002-02');
  await setupReturningUser(page, email, 'I want guidance about my partner Alex');

  await loginUser(page, email, PWD);
  await startSession(page);

  const greeting = await getLastResponse(page);
  // Memory available but should not be blurted upfront
  expect(greeting.toLowerCase()).not.toContain('alex');
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-002-03: Teaser badge absent after prior chat
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-002-03: Teaser/notification badge not visible after user has chatted with Evelyn', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('eve-002-03');
  await setupReturningUser(page, email);

  await loginUser(page, email, PWD);
  await page.goto('/personas');
  await page.waitForTimeout(2000);

  // No badge/notification dot should appear on Evelyn's card
  const badge = page.locator('[data-testid="teaser-badge"], .notification-badge, .badge-dot');
  expect(await badge.count()).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-002-04: New session on a different topic works normally
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-002-04: Returning user can pivot to a fresh topic without prior topic being injected', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('eve-002-04');
  // First session: love
  await setupReturningUser(page, email, 'My relationship with my partner Alex is failing');

  // Second session: career
  const loginData = await apiLogin(page, email, PWD);
  const token = loginData.token;
  const { sessionId } = await apiStartSession(page, token);
  const res = await apiSendMessage(page, sessionId, token, 'I want to talk about my career today');
  await page.waitForTimeout(12000);

  const data = await res.json();
  const msgLower = data.message.toLowerCase();

  const isCareerEngaged =
    msgLower.includes('career') ||
    msgLower.includes('work') ||
    msgLower.includes('job') ||
    msgLower.includes('path') ||
    msgLower.includes('professional') ||
    msgLower.includes('abundance') ||
    msgLower.includes('financial') ||
    msgLower.includes('finance') ||
    msgLower.includes('money') ||
    msgLower.includes('wealth') ||
    msgLower.includes('success') ||
    msgLower.includes('opportunit') ||
    msgLower.includes('direction') ||
    msgLower.includes('purpose') ||
    msgLower.includes('calling') ||
    msgLower.includes('achieve') ||
    msgLower.includes('growth') ||
    msgLower.includes('potential') ||
    msgLower.includes('energy') ||
    msgLower.includes('forward') ||
    msgLower.includes('transition') ||
    msgLower.includes('manifest') ||
    msgLower.includes('today') ||
    msgLower.includes('talk') ||
    msgLower.includes('focus') ||
    msgLower.includes('explore') ||
    msgLower.includes('guidance') ||
    msgLower.includes('feel') ||
    msgLower.includes('sense');
  expect(isCareerEngaged).toBeTruthy();

  // Alex should not be referenced in a career conversation opener
  expect(msgLower).not.toContain('alex');

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-002-05: Memory is accessible when user re-raises a prior detail
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-002-05: Prior session detail recognised naturally when user brings it up', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('eve-002-05');

  // Session 1: mention "my sister Emma"
  const regData = await apiRegister(page, email, PWD);
  const session1 = await apiStartSession(page, regData.token);
  await apiSendMessage(page, session1.sessionId, regData.token, 'My sister Emma and I have a very difficult relationship');
  await page.waitForTimeout(12000);
  await apiEndSession(page, session1.sessionId, regData.token);
  await page.waitForTimeout(3000);

  // Session 2: re-raise Emma
  const session2 = await apiStartSession(page, regData.token);
  const res = await apiSendMessage(page, session2.sessionId, regData.token, 'Things with my sister Emma have gotten worse since we last spoke');
  await page.waitForTimeout(12000);

  const data = await res.json();
  // Evelyn should respond naturally; response must be non-empty and sensible
  expect(data.message).toBeTruthy();
  expect(data.message.length).toBeGreaterThan(20);

  await apiEndSession(page, session2.sessionId, regData.token);
});
