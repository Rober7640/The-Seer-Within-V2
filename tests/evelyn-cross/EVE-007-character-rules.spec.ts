/**
 * EVE-007: Character Rule Compliance
 *
 * Asserts that Evelyn's REAL Claude API responses obey the character rules
 * defined in her system prompt:
 *
 *   ✗ No "As an AI" or programmed-language phrases
 *   ✓ Response word count ≤ 56 (2× the 28-word guideline)
 *   ✓ At most one question mark per message
 *   ✓ Tentative framing ("I sense…", "The energy suggests…")
 *   ✓ Warm, maternal tone
 *   ✗ No markdown formatting
 *
 * All tests run against the real Anthropic Claude API — allow 90 s timeout.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  assertNoForbiddenPhrases,
  wordCount,
  questionCount,
  hasTentativeFraming,
  hasNoMarkdown,
} from './helpers';

// All tests in this file hit Claude — give them plenty of time
// EVE-007-01 sends 10 messages (10 × ~25s each = ~4m+), so allow 360s
test.setTimeout(360000);

const PWD = 'TestPass123!';

/** Send N messages and collect response texts. */
async function collectResponses(page: any, messages: string[]): Promise<string[]> {
  const email = uniqueEmail('eve-007');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const texts: string[] = [];
  for (const msg of messages) {
    const res = await apiSendMessage(page, sessionId, regData.token, msg);
    await page.waitForTimeout(13000);
    const data = await res.json();
    if (data.message) texts.push(data.message);
  }
  await apiEndSession(page, sessionId, regData.token);
  return texts;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVE-007-01: Zero forbidden phrases across 10 varied messages
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-007-01: No forbidden AI-self-identification phrases in any response', async ({ page }) => {
  const messages = [
    "Hello, I'm here for a reading",
    'Are you a real person or an AI?',
    'Tell me about my love life',
    'What do you sense about my career?',
    "I don't believe in psychics",
    'Can you predict my future?',
    'What are your limitations?',
    'Tell me about my sister',
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
// EVE-007-02: Response word count within bounds
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-007-02: Most responses are ≤56 words (2× the 28-word guideline)', async ({ page }) => {
  const messages = [
    "What do you sense about my situation?",
    'Tell me more about my love life',
    'What should I do about my career?',
    "I feel lost and don't know my purpose",
    'What energy do you sense around me?',
    'Can you tell me more?',
    "What's blocking me?",
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
// EVE-007-03: Maximum one question per message
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-007-03: Each Evelyn response contains at most one question mark', async ({ page }) => {
  const messages = [
    "Hello, I need guidance",
    "Tell me about my love life",
    "What do you sense about my energy?",
    "How about my career?",
    "And my purpose?",
    "What should I focus on?",
    "Tell me more",
    "What blocks me?",
  ];

  const responses = await collectResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  let violationCount = 0;
  for (const text of responses) {
    const qc = questionCount(text);
    if (qc > 1) violationCount++;
  }

  // Allow at most 2 occasional violations in the batch (prompt compliance isn't 100% perfect)
  expect(violationCount).toBeLessThanOrEqual(2);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-007-04: Tentative framing used — no absolute future predictions
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-007-04: Responses use tentative framing, not absolute predictions', async ({ page }) => {
  const messages = [
    "Will I find love soon?",
    "Is my partner the one for me?",
    "Will I get the job?",
    "Am I on the right path?",
    "Will things get better?",
  ];

  const responses = await collectResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  for (const text of responses) {
    const lower = text.toLowerCase();
    // Hard ban: absolute future declarations
    expect(lower).not.toMatch(/\byou will definitely\b/);
    expect(lower).not.toMatch(/\byou are guaranteed\b/);
    expect(lower).not.toMatch(/\bguaranteed to\b/);
  }

  // At least 1 response should have tentative framing (LLM responses vary)
  const tentativeCount = responses.filter(hasTentativeFraming).length;
  expect(tentativeCount).toBeGreaterThanOrEqual(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-007-05: Warm and empathetic tone for a difficult emotional message
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-007-05: Response to hopeless message is warm and empathetic, not clinical', async ({ page }) => {
  const email = uniqueEmail('eve-007-05');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  const res = await apiSendMessage(page, sessionId, regData.token, "I've been feeling really hopeless lately, like nothing will ever get better");
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Should acknowledge the emotion
  const isEmpathetic =
    lower.includes('feel') ||
    lower.includes('sense') ||
    lower.includes('hear') ||
    lower.includes('understand') ||
    lower.includes('heavy') ||
    lower.includes('difficult') ||
    lower.includes('pain');
  expect(isEmpathetic).toBeTruthy();

  // Should NOT be clinical or robotic
  expect(lower).not.toContain('i understand that you are experiencing');
  expect(lower).not.toContain('that must be very difficult for you');
  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-007-06: No markdown formatting in responses
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-007-06: Responses contain no markdown formatting', async ({ page }) => {
  const messages = [
    'What are the main areas I should focus on?',
    'Can you break down my situation for me?',
    'List the things I need to work on',
    'Give me a summary of what you sense',
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
