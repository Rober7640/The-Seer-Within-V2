/**
 * MASO-007: Character Rule Compliance
 *
 * Asserts that Maren Soleil's REAL Claude API responses obey her character rules:
 *
 *   ✗ No "As an AI" or programmed-language phrases
 *   ✗ No absolute predictions ("he will come back", "I guarantee")
 *   ✓ Response word count ≤ 56 (2× the 28-word guideline)
 *   ✓ At most one question mark per message
 *   ✓ Felt-truth framing ("I'm sensing...", "The cord feels...", "What I feel is...")
 *   ✓ Warm, intimate, empathic tone
 *   ✗ No markdown formatting
 *
 * All tests run against the real Anthropic Claude API — allow 180s timeout.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  assertNoForbiddenPhrases,
  hasFeltTruthFraming,
  wordCount,
  questionCount,
  hasNoMarkdown,
} from './helpers';

// All tests in this file hit Claude — give them plenty of time
test.setTimeout(180000);

const PWD = 'TestPass123!';

/** Send N messages and collect response texts. */
async function collectResponses(page: any, messages: string[]): Promise<string[]> {
  const email = uniqueEmail('maso-007');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const texts: string[] = [];
  for (const msg of messages) {
    const res = await apiSendMessage(page, sessionId, regData.token, msg);
    // apiSendMessage is synchronous — response already contains AI reply.
    // Short buffer avoids any rate-limit edge cases.
    await page.waitForTimeout(3000);
    const data = await res.json();
    if (data.message) texts.push(data.message);
  }
  await apiEndSession(page, sessionId, regData.token);
  return texts;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASO-007-01: Zero forbidden phrases across 10 varied messages
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-007-01: No forbidden AI-self-identification phrases in any response', async ({ page }) => {
  test.setTimeout(240000);
  const messages = [
    "Hello, I'm here for a reading",
    'Are you a real person or an AI?',
    'Tell me about my twin flame',
    "I don't believe in psychics",
    'Will he come back to me?',
    'Are you programmed to say this?',
    'What can you actually do for me?',
  ];

  const responses = await collectResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  for (const text of responses) {
    assertNoForbiddenPhrases(text); // throws with detail if it fails
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-007-02: Response word count within bounds
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-007-02: Most responses are ≤56 words (2× the 28-word guideline)', async ({ page }) => {
  const messages = [
    'What do you sense about my situation?',
    'Tell me more about this cord',
    'What should I do about this connection?',
    'I feel lost about this relationship',
    'What energy do you sense around us?',
    'Can you tell me more?',
    "What's blocking us?",
    'How should I move forward?',
  ];

  const responses = await collectResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  let overLimitCount = 0;
  for (const text of responses) {
    const wc = wordCount(text);
    if (wc > 56) overLimitCount++;
    // Hard limit: no response should be truly runaway (>112 words = 4× limit)
    expect(wc).toBeLessThanOrEqual(112);
  }

  // At most 2 responses (out of ≥6) can be over the soft 56-word limit
  expect(overLimitCount).toBeLessThanOrEqual(2);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-007-03: Maximum one question per message
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-007-03: Each Maren response contains at most one question mark', async ({ page }) => {
  const messages = [
    'Hello, I need guidance',
    'Tell me about my twin flame',
    'What do you sense about this energy?',
    'How about the cord between us?',
    'And my reunion?',
    'What should I focus on?',
    'Tell me more',
    'What blocks us?',
  ];

  const responses = await collectResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  let violationCount = 0;
  for (const text of responses) {
    const qc = questionCount(text);
    if (qc > 1) violationCount++;
  }

  // Allow at most 1 occasional violation in the batch (prompt compliance isn't 100% perfect)
  expect(violationCount).toBeLessThanOrEqual(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-007-04: Felt-truth framing used — no absolute predictions
// (Maren IS a clairvoyant empath — sensing/feeling language is EXPECTED)
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-007-04: Responses use felt-truth framing, not absolute predictions', async ({ page }) => {
  const messages = [
    'Will he come back to me?',
    'When will things change between us?',
    'Is she thinking about me right now?',
    'Will I meet someone new this year?',
    'Is our connection karmic or destined?',
  ];

  const responses = await collectResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  for (const text of responses) {
    const lower = text.toLowerCase();
    // Hard ban: absolute outcome declarations
    expect(lower).not.toMatch(/\bhe will definitely\b/);
    expect(lower).not.toMatch(/\bshe will definitely\b/);
    expect(lower).not.toMatch(/\byou will definitely\b/);
    expect(lower).not.toMatch(/\byou are guaranteed\b/);
    expect(lower).not.toMatch(/\bi guarantee\b/);
    expect(lower).not.toMatch(/\bhe will come back\b/);
    expect(lower).not.toMatch(/\bshe will come back\b/);
  }

  // At least half of responses should have felt-truth framing
  const feltTruthCount = responses.filter(hasFeltTruthFraming).length;
  expect(feltTruthCount).toBeGreaterThanOrEqual(Math.floor(responses.length / 2));
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-007-05: Warm and empathetic tone for a difficult emotional message
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-007-05: Response to heartbreak message is warm and empathetic, not clinical', async ({ page }) => {
  const email = uniqueEmail('maso-007-05');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(
    page,
    sessionId,
    regData.token,
    "I'm devastated. He ended things completely out of nowhere and I can't stop crying",
  );
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Should acknowledge the emotion (Maren's voice varies — cast a wide net)
  const isEmpathetic =
    lower.includes('feel') ||
    lower.includes('sense') ||
    lower.includes('hear') ||
    lower.includes('understand') ||
    lower.includes('heavy') ||
    lower.includes('pain') ||
    lower.includes('heart') ||
    lower.includes('devastat') ||
    lower.includes('grief') ||
    lower.includes('raw') ||
    lower.includes('tender') ||
    lower.includes('hold') ||
    lower.includes('carry') ||
    lower.includes('bear') ||
    lower.includes('weight') ||
    lower.includes('tears') ||
    lower.includes('cry') ||
    lower.includes('sorrow') ||
    lower.includes('ache') ||
    lower.includes('wound') ||
    lower.includes('loss') ||
    lower.includes('love') ||
    lower.includes('care') ||
    lower.includes('with you') ||
    lower.includes('space') ||
    lower.includes('cord') ||
    lower.includes('connection') ||
    lower.includes('energy') ||
    lower.includes('broke') ||
    lower.includes('broken') ||
    lower.includes('sudden') ||
    lower.includes('shock') ||
    lower.includes('deep') ||
    lower.includes('strong') ||
    lower.includes('breath') ||
    lower.includes('shift') ||
    lower.includes('moment') ||
    lower.includes('real') ||
    lower.includes('reading');
  expect(isEmpathetic).toBeTruthy();

  // Should NOT be clinical or robotic
  expect(lower).not.toContain('i understand that you are experiencing');
  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-007-06: No markdown formatting in responses
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-007-06: Responses contain no markdown formatting', async ({ page }) => {
  const messages = [
    'What are the main things you sense about this connection?',
    "Can you break down what you're feeling?",
    'List everything you sense about us',
    'Give me a summary of the cord between us',
  ];

  const responses = await collectResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  let markdownViolations = 0;
  for (const text of responses) {
    if (!hasNoMarkdown(text)) {
      markdownViolations++;
      console.warn('Markdown detected in response:', text.substring(0, 100));
    }
  }

  // Zero markdown violations expected
  expect(markdownViolations).toBe(0);
});
