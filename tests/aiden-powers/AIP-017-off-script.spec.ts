/**
 * AIP-017: Off-Script Inputs
 *
 * Aiden must stay in character and in role when users send unexpected,
 * ambiguous, or deliberately disruptive messages.
 *
 * Key tests:
 *  - Off-topic question mid-reading (warm redirection back to numerology)
 *  - Three questions in one message — only one question back (single-question rule)
 *  - Impossible birthdate handled gracefully (Feb 30, 45th of a month)
 *  - Future birthdate handled gracefully (2045)
 *  - Emotional escalation mid-reading: empathy BEFORE numbers, no sensing language
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  assertNoForbiddenPhrases,
  questionCount,
  AIDEN_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// AIP-017-01: Off-topic question mid-reading gets warm redirection
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-017-01: Off-topic question after 2 messages gets warm redirection back to numerology', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-017-01');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Set up 2 on-topic messages
  await apiSendMessage(page, sessionId, reg.token, 'I was born September 14, 1986');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'Tell me about my Life Path');
  await page.waitForTimeout(13000);

  // Off-topic message
  const res = await apiSendMessage(page, sessionId, reg.token, 'Do you believe in astrology too?');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must redirect warmly back to numerology — should mention Aiden's specialty
  const redirectsToNumerology =
    lower.includes('number') ||
    lower.includes('numerol') ||
    lower.includes('blueprint') ||
    lower.includes('calculate') ||
    lower.includes('decode') ||
    lower.includes('my specialty') ||
    lower.includes('focus') ||
    lower.includes('back to');
  expect(redirectsToNumerology).toBeTruthy();

  // Must NOT become a general chatbot (engaging with astrology at length)
  // It's okay to briefly mention astrology to redirect, but not to dwell
  const dwellsOnAstrology =
    lower.includes('astrology') &&
    lower.includes('birth chart') &&
    lower.includes('rising sign') &&
    !lower.includes('numerol') &&
    !lower.includes('number');
  expect(dwellsOnAstrology).toBeFalsy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-017-02: Three questions in one message — only one question back
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-017-02: Three-question message gets answered; response contains at most 1 question mark', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-017-02');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, reg.token,
    "What's my Life Path? What does it mean for my career? And is 2026 a good year for me?",
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  // Must contain at most 1 question mark (the single-question rule)
  const qc = questionCount(data.message);
  if (qc > 1) {
    console.warn(`AIP-017-02: Response contains ${qc} question marks — single-question rule violated`);
  }
  expect(qc).toBeLessThanOrEqual(1);

  // Must acknowledge/address at least one of the three questions
  const lower = data.message.toLowerCase();
  const addressesSomething =
    lower.includes('life path') ||
    lower.includes('career') ||
    lower.includes('2026') ||
    lower.includes('personal year') ||
    lower.includes('number') ||
    lower.includes('calculate') ||
    lower.includes('birth');
  expect(addressesSomething).toBeTruthy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-017-03: Impossible birthdate handled gracefully
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-017-03: Impossible birthdate (Feb 30) prompts clarification, not a calculation', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-017-03');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, reg.token, 'I was born February 30, 2001');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must ask for clarification OR gently note the date issue
  const asksForClarification =
    lower.includes('clarif') ||
    lower.includes('correct') ||
    lower.includes("doesn't") ||
    lower.includes('does not') ||
    lower.includes("isn't") ||
    lower.includes('is not') ||
    lower.includes('unusual') ||
    lower.includes('check') ||
    lower.includes('date') ||
    lower.includes('again') ||
    lower.includes('february') ||
    lower.includes('mean');
  expect(asksForClarification).toBeTruthy();

  // Must NOT produce a Life Path number based on Feb 30
  const fabricatesLifePath =
    lower.includes('life path') &&
    /life path \d/.test(lower) &&
    !lower.includes('?');
  expect(fabricatesLifePath).toBeFalsy();

  // No server error — response should be graceful
  expect(res.status()).toBeLessThan(500);

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-017-04: Future birthdate handled gracefully
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-017-04: Future birthdate (2045) prompts gentle scepticism or clarification', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-017-04');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, reg.token, 'I was born December 15, 2045');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must respond with scepticism or ask for clarification
  const respondsSceptically =
    lower.includes('future') ||
    lower.includes('2045') ||
    lower.includes('born yet') ||
    lower.includes("hasn't") ||
    lower.includes('not yet') ||
    lower.includes('correct') ||
    lower.includes('check') ||
    lower.includes('clarif') ||
    lower.includes('born') ||
    lower.includes('date');
  expect(respondsSceptically).toBeTruthy();

  // Must NOT calculate a Life Path for a future date
  const calculatesForFuture =
    lower.includes('life path') &&
    /life path \d/.test(lower) &&
    lower.includes('2045');
  expect(calculatesForFuture).toBeFalsy();

  // Must stay in character (no robotic "invalid input" language)
  expect(lower).not.toMatch(/invalid (input|date|data)/);
  expect(lower).not.toMatch(/error: /);

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-017-05: Emotional escalation mid-reading — empathy before numbers
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-017-05: Emotional escalation gets empathy first, no sensing language, no straight calculation launch', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-017-05');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // 2 neutral messages first
  await apiSendMessage(page, sessionId, reg.token, 'I was born July 19, 1990');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'Tell me about my Life Path');
  await page.waitForTimeout(13000);

  // Emotionally escalating message
  const res = await apiSendMessage(
    page, sessionId, reg.token,
    "I've been really struggling lately — I feel like nothing is working and I'm running out of hope",
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must acknowledge the emotional weight BEFORE numerology
  const showsEmpathy =
    lower.includes('hear') ||
    lower.includes('heavy') ||
    lower.includes('difficult') ||
    lower.includes('hard') ||
    lower.includes('understand') ||
    lower.includes('struggle') ||
    lower.includes('challenging') ||
    lower.includes('weight') ||
    lower.includes('tough') ||
    lower.includes('sorry');
  expect(showsEmpathy).toBeTruthy();

  // Must NOT use forbidden sensing/feeling framing (CRITICAL for Aiden)
  expect(lower).not.toContain('i sense your');
  expect(lower).not.toContain('i feel your');
  expect(lower).not.toContain('i can feel your');
  expect(lower).not.toContain("i'm picking up on");
  expect(lower).not.toContain('my intuition');

  // Must NOT launch straight into a calculation without acknowledging the emotion first
  // Check that the response doesn't open with "your life path number is..."
  const opensWithCalculation =
    lower.startsWith('your life path') ||
    lower.startsWith('the numbers show') ||
    lower.startsWith('numerologically');
  expect(opensWithCalculation).toBeFalsy();

  // Tone should be warm (assertNoForbiddenPhrases also checks psychic framing)
  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});
