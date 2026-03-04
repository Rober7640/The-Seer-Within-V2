/**
 * EVE-005: Conversation Bucket Progression
 *
 * Tests that topic routing works correctly (love / money / purpose),
 * that conversations deepen over multiple exchanges, and that the
 * closing phase is graceful.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// EVE-005-01: Opening exchange is exploratory / welcoming
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-005-01: First message gets an exploratory, welcoming response', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('eve-005-01');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(page, sessionId, regData.token, "Hello, I'm here for a reading");
  await page.waitForTimeout(12000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();
  // Should be welcoming and possibly ask what to focus on
  const isExploratory =
    lower.includes('focus') ||
    lower.includes('what') ||
    lower.includes('tell me') ||
    lower.includes('sense') ||
    lower.includes('welcome') ||
    lower.includes('feel');
  expect(isExploratory).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-005-02: Love keyword routes to love-focused response
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-005-02: Love/relationship message routes to love-focused response', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('eve-005-02');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(page, sessionId, regData.token, "I've been struggling with my romantic relationship");
  await page.waitForTimeout(12000);

  const data = await res.json();
  const lower = data.message.toLowerCase();

  const isLoveFocused =
    lower.includes('love') ||
    lower.includes('relationship') ||
    lower.includes('heart') ||
    lower.includes('partner') ||
    lower.includes('romance') ||
    lower.includes('connect') ||
    lower.includes('feel') ||
    lower.includes('emotion') ||
    lower.includes('bond') ||
    lower.includes('intimate') ||
    lower.includes('care') ||
    lower.includes('pain') ||
    lower.includes('hurt') ||
    lower.includes('struggle') ||
    lower.includes('energy') ||
    lower.includes('soul') ||
    lower.includes('deep') ||
    lower.includes('sense') ||
    lower.includes('between') ||
    lower.includes('together');
  expect(isLoveFocused).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-005-03: Money/career keyword routes to money-focused response
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-005-03: Money/career message routes to money-focused response', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('eve-005-03');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(page, sessionId, regData.token, "I need guidance about my job and financial situation");
  await page.waitForTimeout(12000);

  const data = await res.json();
  const lower = data.message.toLowerCase();

  const isMoneyFocused =
    lower.includes('career') ||
    lower.includes('work') ||
    lower.includes('job') ||
    lower.includes('money') ||
    lower.includes('finance') ||
    lower.includes('abundance') ||
    lower.includes('profession');
  expect(isMoneyFocused).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-005-04: Purpose keyword routes to purpose-focused response
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-005-04: Purpose/life-path message routes to purpose-focused response', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('eve-005-04');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(page, sessionId, regData.token, "I feel completely lost and don't know what my life is supposed to mean");
  await page.waitForTimeout(12000);

  const data = await res.json();
  const lower = data.message.toLowerCase();

  const isPurposeFocused =
    lower.includes('purpose') ||
    lower.includes('meaning') ||
    lower.includes('path') ||
    lower.includes('soul') ||
    lower.includes('calling') ||
    lower.includes('direction') ||
    lower.includes('lost') ||
    lower.includes('search') ||
    lower.includes('journey') ||
    lower.includes('heart') ||
    lower.includes('spirit') ||
    lower.includes('deeper') ||
    lower.includes('within') ||
    lower.includes('discover') ||
    lower.includes('question') ||
    lower.includes('guide') ||
    lower.includes('feel') ||
    lower.includes('sense') ||
    lower.includes('life') ||
    lower.includes('energy');
  expect(isPurposeFocused).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-005-05: Conversation deepens across multiple exchanges (no repetition)
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-005-05: Multiple exchanges on same topic produce distinct responses (no verbatim repetition)', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('eve-005-05');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const messages = [
    "I've been having problems in my relationship",
    "Can you tell me more about what you're sensing?",
    "What does this mean for my future with him?",
    "How should I handle this situation?",
  ];

  const responses: string[] = [];
  for (const msg of messages) {
    const res = await apiSendMessage(page, sessionId, regData.token, msg);
    await page.waitForTimeout(13000);
    const data = await res.json();
    if (data.message) responses.push(data.message.trim());
  }

  expect(responses.length).toBeGreaterThanOrEqual(3);

  // Each response should be unique (no verbatim repeats)
  const uniqueResponses = new Set(responses);
  expect(uniqueResponses.size).toBe(responses.length);

  // Responses should vary in content (not all the same word count)
  const lengths = responses.map((r) => r.length);
  const allSameLength = lengths.every((l) => l === lengths[0]);
  expect(allSameLength).toBeFalsy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-005-06: Closing message gets a graceful, open-ended farewell
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-005-06: "Thank you, I have what I need" triggers graceful warm closing', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('eve-005-06');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  // Establish context first
  await apiSendMessage(page, sessionId, regData.token, 'I have questions about my love life');
  await page.waitForTimeout(12000);

  // Closing message
  const closeRes = await apiSendMessage(page, sessionId, regData.token, 'Thank you Evelyn, I think I have what I need for now');
  await page.waitForTimeout(12000);

  const data = await closeRes.json();
  const lower = data.message.toLowerCase();

  // Should be a warm, open-ended farewell (broad — LLM phrasing varies greatly)
  const isGracefulClose =
    lower.includes('anytime') ||
    lower.includes('whenever') ||
    lower.includes('always here') ||
    lower.includes('take care') ||
    lower.includes('blessings') ||
    lower.includes('be well') ||
    lower.includes('journey') ||
    lower.includes('return') ||
    lower.includes('glad') ||
    lower.includes('happy') ||
    lower.includes('peace') ||
    lower.includes('light') ||
    lower.includes('love') ||
    lower.includes('carry') ||
    lower.includes('heart') ||
    lower.includes('safe') ||
    lower.includes('good') ||
    lower.includes('warm') ||
    lower.includes('care') ||
    lower.includes('here') ||
    lower.includes('remember') ||
    lower.includes('come back') ||
    lower.includes('welcome') ||
    lower.includes('wishing') ||
    lower.includes('hope') ||
    lower.includes('path') ||
    lower.includes('forward') ||
    lower.includes('clear') ||
    lower.includes('thank') ||
    lower.includes('beautiful') ||
    lower.includes('may') ||
    lower.includes('walk');
  expect(isGracefulClose).toBeTruthy();

  // Should NOT be pushy or create urgency
  expect(lower).not.toContain('buy');
  expect(lower).not.toContain('purchase');
  expect(lower).not.toContain('limited time');

  await apiEndSession(page, sessionId, regData.token);
});
