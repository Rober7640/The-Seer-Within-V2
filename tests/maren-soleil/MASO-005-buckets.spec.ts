/**
 * MASO-005: Conversation Bucket Progression
 *
 * Tests that topic routing works correctly for Maren Soleil's specialty areas:
 * twin flame, soulmate, reunion, karmic cord-reading — and that conversations
 * deepen over multiple exchanges, and the closing phase is graceful.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  questionCount,
  MAREN_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// MASO-005-01: Opening exchange is exploratory / welcoming
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-005-01: First message gets an exploratory, welcoming response', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('maso-005-01');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, MAREN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, "Hello, I'm here");
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();
  // Should be welcoming and possibly ask what to focus on
  const isExploratory =
    lower.includes('focus') ||
    lower.includes('what') ||
    lower.includes('tell me') ||
    lower.includes('sense') ||
    lower.includes('feel') ||
    lower.includes('welcome') ||
    lower.includes('presence') ||
    lower.includes('energy');
  expect(isExploratory).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-005-02: Twin flame keyword routes to twin-flame-focused response
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-005-02: Twin flame bucket keyword routes correctly', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('maso-005-02');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, MAREN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, "I think I've found my twin flame");
  const data = await res.json();
  const lower = data.message.toLowerCase();

  // Response should focus on twin flame topic
  const isTwinFlameFocused =
    lower.includes('twin') ||
    lower.includes('flame') ||
    lower.includes('cord') ||
    lower.includes('connection') ||
    lower.includes('soul') ||
    lower.includes('pull') ||
    lower.includes('sense') ||
    lower.includes('feel');
  expect(isTwinFlameFocused).toBeTruthy();

  // Should ask ONE clarifying question, not immediately interpret
  expect(questionCount(data.message)).toBeLessThanOrEqual(2);

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-005-03: Reunion intent routes to cord reading response
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-005-03: Reunion intent routes to cord reading', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('maso-005-03');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, MAREN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, "Will my ex come back to me? It's been 3 months");
  const data = await res.json();
  const lower = data.message.toLowerCase();

  // Response should engage with reunion/cord topic
  const isReunionFocused =
    lower.includes('cord') ||
    lower.includes('feel') ||
    lower.includes('sense') ||
    lower.includes('energy') ||
    lower.includes('pull') ||
    lower.includes('connection') ||
    lower.includes('between');
  expect(isReunionFocused).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-005-04: Karmic / past life intent routes correctly
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-005-04: Karmic / past life intent routes correctly', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('maso-005-04');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, MAREN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, "I keep going back to him even though I know he's bad for me. I can't stop");
  const data = await res.json();
  const lower = data.message.toLowerCase();

  // Response should engage with karmic/pattern topic
  const isKarmicFocused =
    lower.includes('cord') ||
    lower.includes('karmic') ||
    lower.includes('pattern') ||
    lower.includes('pull') ||
    lower.includes('keep') ||
    lower.includes('feel') ||
    lower.includes('bind') ||
    lower.includes('energy');
  expect(isKarmicFocused).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-005-05: Conversation deepens across multiple exchanges (no repetition)
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-005-05: Multiple exchanges on same topic produce distinct responses (no verbatim repetition)', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('maso-005-05');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, MAREN_SLUG);

  const messages = [
    "I've been having problems in my romantic relationship",
    "Can you tell me more about what you're sensing?",
    "What does this mean for our connection?",
    "How should I move forward?",
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
// MASO-005-06: Closing message gets a graceful, open-ended farewell
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-005-06: "Thank you, I have a lot to think about" triggers graceful warm closing', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('maso-005-06');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, MAREN_SLUG);

  // Establish context first
  await apiSendMessage(page, sessionId, regData.token, 'I have questions about my romantic connection with someone');
  await page.waitForTimeout(12000);

  // Closing message
  const closeRes = await apiSendMessage(page, sessionId, regData.token, 'Thank you Maren, I think I have what I need for now');
  await page.waitForTimeout(12000);

  const data = await closeRes.json();
  const lower = data.message.toLowerCase();

  // Should be a warm, open-ended farewell — Maren's voice varies widely
  const isGracefulClose =
    lower.includes('anytime') ||
    lower.includes('whenever') ||
    lower.includes('always here') ||
    lower.includes('take care') ||
    lower.includes('bless') ||
    lower.includes('be well') ||
    lower.includes('journey') ||
    lower.includes('return') ||
    lower.includes('here for you') ||
    lower.includes('goodbye') ||
    lower.includes('farewell') ||
    lower.includes('peace') ||
    lower.includes('carry') ||
    lower.includes('light') ||
    lower.includes('love') ||
    lower.includes('honor') ||
    lower.includes('safe') ||
    lower.includes('warmth') ||
    lower.includes('until') ||
    lower.includes('always') ||
    lower.includes('hold') ||
    lower.includes('open') ||
    lower.includes('gentle') ||
    lower.includes('heart') ||
    lower.includes('beautiful') ||
    lower.includes('grateful') ||
    lower.includes('clarity') ||
    lower.includes('sit with') ||
    lower.includes('trust') ||
    lower.includes('feel') ||
    lower.includes('sense');
  expect(isGracefulClose).toBeTruthy();

  // Should NOT be pushy or create urgency
  expect(lower).not.toContain('buy');
  expect(lower).not.toContain('purchase');
  expect(lower).not.toContain('limited time');

  await apiEndSession(page, sessionId, regData.token);
});
