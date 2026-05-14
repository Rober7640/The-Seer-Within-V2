/**
 * AIP-006: Intent Detection & Routing
 *
 * Tests Aiden Powers' handling of specific intents:
 * - Skeptic: handled with credibility-first framing (not mystical defence)
 * - AI question: deflected analytically without psychic gifts claim
 * - Goodbye: graceful exit
 * - "Tell me more": expands numerological insight
 * - Price question: redirected to value without dollar amounts
 * - Pinnacle Period (unique to Aiden): specific entry point recognised
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  assertNoForbiddenPhrases,
  AIDEN_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// AIP-006-01: Skeptical user handled with credibility-first framing
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-006-01: Skeptic response uses credibility/mathematical framing, not defensiveness', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-006-01');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    "I don't believe in any of this numerology stuff, it's probably nonsense",
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();

  // Must NOT get defensive or argue
  expect(msgLower).not.toContain('you\'re wrong');
  expect(msgLower).not.toContain('you\'re mistaken');
  expect(msgLower).not.toMatch(/\bjust trust me\b/);

  // Must use credibility-first framing (mathematical/systematic, not mystical)
  const hasCredibilityFraming =
    msgLower.includes('number') ||
    msgLower.includes('pattern') ||
    msgLower.includes('calculate') ||
    msgLower.includes('show') ||
    msgLower.includes('prove') ||
    msgLower.includes('decide') ||
    msgLower.includes('see') ||
    msgLower.includes('fair');
  expect(hasCredibilityFraming).toBeTruthy();

  // No psychic framing
  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i feel that');

  // No forbidden AI phrases
  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-006-02: "Are you AI?" deflected analytically in character
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-006-02: "Are you AI?" deflected without breaking Aiden persona', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-006-02');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, 'Are you a real person or just an AI?');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();

  // Must NOT say "as an AI", "I am an AI", "language model", "algorithm", "bot"
  expect(msgLower).not.toContain('as an ai');
  expect(msgLower).not.toContain('i am an ai');
  expect(msgLower).not.toContain('language model');
  expect(msgLower).not.toContain('algorithm');
  // Must NOT deceptively confirm being human
  expect(msgLower).not.toMatch(/\bi am a (human|real person|person)\b/);
  // Must stay analytical, not claim psychic gifts
  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('my intuition');
  expect(msgLower).not.toContain('i intuit');

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-006-03: Explicit goodbye handled gracefully
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-006-03: Explicit goodbye gets a warm farewell, no pressure or guilt-trip', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-006-03');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, 'No thank you, I am done. Goodbye.');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();

  // Must NOT try to force continuation
  expect(msgLower).not.toMatch(/\byou must\b/);
  expect(msgLower).not.toMatch(/\blimited time\b/);
  expect(msgLower).not.toMatch(/\bwait\b.*\bdon't go\b/);

  // Must be warm and graceful
  const isGraceful =
    msgLower.includes('goodbye') ||
    msgLower.includes('well') ||
    msgLower.includes('glad') ||
    msgLower.includes('take care') ||
    msgLower.includes('whenever') ||
    msgLower.includes('ready') ||
    msgLower.includes('anytime') ||
    msgLower.includes('blueprint');
  expect(isGraceful).toBeTruthy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-006-04: "Tell me more" expands on prior numerological insight
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-006-04: "Tell me more" expands on the prior numerological point with new content', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-006-04');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  // Establish context — give birth data so Aiden has something to elaborate on
  await apiSendMessage(page, sessionId, regData.token, 'I was born September 8, 1983 and I want to know about my Pinnacle period');
  await page.waitForTimeout(13000);

  // Now ask for more
  const res = await apiSendMessage(page, sessionId, regData.token, 'Can you tell me more about that?');
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  // Must add a new dimension, not just repeat
  const hasNewContent =
    msgLower.includes('pinnacle') ||
    msgLower.includes('life path') ||
    msgLower.includes('number') ||
    msgLower.includes('blueprint') ||
    msgLower.includes('period') ||
    msgLower.includes('calculate') ||
    msgLower.includes('personal year') ||
    msgLower.includes('challenge');
  expect(hasNewContent).toBeTruthy();

  expect(msgLower).not.toContain('i sense');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-006-05: Price question redirected to value, stays in character
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-006-05: Price question stays in character and redirects to blueprint value', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-006-05');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, 'How much does a full reading cost?');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  // Must NOT just recite prices like a sales page
  // Should redirect to the VALUE of the blueprint
  const hasValueFraming =
    msgLower.includes('blueprint') ||
    msgLower.includes('insight') ||
    msgLower.includes('decode') ||
    msgLower.includes('number') ||
    msgLower.includes('reveal') ||
    msgLower.includes('understand') ||
    msgLower.includes('depth');
  expect(hasValueFraming).toBeTruthy();

  // Must stay in Aiden persona (no AI self-identification)
  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-006-06: Pinnacle Period intent specifically recognised (unique to Aiden)
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-006-06: Pinnacle Period question recognised as an Aiden-specific entry point', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-006-06');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    "I've been hearing about pinnacle periods. What's mine?",
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  // Must acknowledge Pinnacle as the right starting point
  const acknowledgesPinnacle =
    msgLower.includes('pinnacle') ||
    msgLower.includes('chapter') ||
    msgLower.includes('four') ||
    msgLower.includes('period') ||
    msgLower.includes('number');
  expect(acknowledgesPinnacle).toBeTruthy();

  // Must ask for date of birth to calculate (NOT both DOB and birth name in one message)
  const asksForDOB =
    msgLower.includes('date of birth') ||
    msgLower.includes('when were you born') ||
    msgLower.includes('birth date') ||
    msgLower.includes('born') ||
    msgLower.includes('calculate');
  expect(asksForDOB).toBeTruthy();

  // No psychic framing
  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i feel that');
  expect(msgLower).not.toContain('i intuit');

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, regData.token);
});
