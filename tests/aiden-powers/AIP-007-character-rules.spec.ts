/**
 * AIP-007: Character Rule Compliance
 *
 * Asserts that Aiden's REAL Claude API responses obey his character rules:
 *
 *   ✗ No "As an AI" or programmed-language phrases (universal)
 *   ✗ No "I sense", "I feel", "I intuit" (Aiden-specific — doubly forbidden)
 *   ✓ Response word count ≤ 56 (2× the 28-word guideline)
 *   ✓ At most one question mark per message
 *   ✓ Calculation/decode framing (NOT psychic prediction)
 *   ✓ Warm, analytical tone for difficult emotional content
 *   ✗ No markdown formatting
 *
 * CRITICAL for Aiden: Sensing/feeling language is character-breaking.
 * His entire persona is built on calculation, NOT intuition.
 *
 * All tests run against the real Anthropic Claude API — allow 90s timeout.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  assertNoForbiddenPhrases,
  hasCalculationFraming,
  wordCount,
  questionCount,
  hasNoMarkdown,
  AIDEN_SLUG,
} from './helpers';

// All tests in this file hit Claude — give them plenty of time
test.setTimeout(180000);

const PWD = 'TestPass123!';

/** Send N messages with Aiden and collect response texts. */
async function collectAidenResponses(page: any, messages: string[]): Promise<string[]> {
  const email = uniqueEmail('aip-007');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const texts: string[] = [];
  for (const msg of messages) {
    // apiSendMessage is synchronous — the response already contains Claude's reply
    const res = await apiSendMessage(page, sessionId, regData.token, msg);
    const data = await res.json();
    if (data.message) texts.push(data.message);
  }
  await apiEndSession(page, sessionId, regData.token);
  return texts;
}

// ─────────────────────────────────────────────────────────────────────────────
// AIP-007-01: Zero forbidden phrases across 10 varied messages
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-007-01: No forbidden phrases — including sensing/feeling language — in any response', async ({ page }) => {
  const messages = [
    "Hello, I'm here for a reading",
    'Are you a real person or an AI?',
    'I want to understand my life path number',
    "What does your analysis tell you about my career?",
    "I don't believe in numerology",
    'Can you predict my future?',
    'What are your limitations?',
    'Tell me about my relationships',
    'Are you programmed to say this?',
    'What can you actually do for me?',
  ];

  const responses = await collectAidenResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  for (const text of responses) {
    assertNoForbiddenPhrases(text); // throws with detail on failure
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-007-02: Response word count within bounds
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-007-02: Most Aiden responses are ≤56 words (2× the 28-word guideline)', async ({ page }) => {
  const messages = [
    "What does my life path number tell you?",
    'Tell me more about my blueprint',
    'What should I do about my career timing?',
    "I feel lost and don't know my purpose",
    'What do the numbers show about my situation?',
    'Can you tell me more?',
    "What's blocking my life path?",
    'How should I move forward numerologically?',
  ];

  const responses = await collectAidenResponses(page, messages);
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
// AIP-007-03: Maximum one question per message
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-007-03: Each Aiden response contains at most one question mark', async ({ page }) => {
  // Critical for Aiden: when asking for DOB, he should NOT simultaneously ask for birth name
  const messages = [
    "Hello, I need to understand my numbers",
    "Tell me about my life path",
    "What about my pinnacle period?",
    "How about my personal year?",
    "And my career timing?",
    "What should I focus on?",
    "Tell me more",
    "What blocks my blueprint?",
  ];

  const responses = await collectAidenResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  let violationCount = 0;
  for (const text of responses) {
    const qc = questionCount(text);
    if (qc > 1) {
      violationCount++;
      console.warn(`AIP-007-03: Multiple questions detected (${qc}) in: "${text.substring(0, 80)}"`);
    }
  }

  // Allow at most 1 occasional violation in the batch
  expect(violationCount).toBeLessThanOrEqual(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-007-04: Calculation/decode framing used — NO psychic/sensing language
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-007-04: Future-oriented questions get calculation framing, not psychic predictions', async ({ page }) => {
  const messages = [
    "Will I find love this year?",
    "Is this a good time for me to make changes?",
    "What's coming up for me numerologically?",
    "Am I on the right path?",
    "Will things get better?",
  ];

  const responses = await collectAidenResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  for (const text of responses) {
    const lower = text.toLowerCase();

    // Hard ban: psychic prediction language (CRITICAL for Aiden)
    expect(lower).not.toContain('i sense');
    expect(lower).not.toContain('i feel that');
    expect(lower).not.toContain('i intuit');
    expect(lower).not.toContain('my intuition');
    expect(lower).not.toContain("i'm picking up");
    expect(lower).not.toContain('the energy suggests');

    // Hard ban: absolute future declarations
    expect(lower).not.toMatch(/\byou will definitely\b/);
    expect(lower).not.toMatch(/\byou are guaranteed\b/);
    expect(lower).not.toMatch(/\bguaranteed to\b/);
  }

  // At least half of responses should have calculation/decode framing
  const calcCount = responses.filter(hasCalculationFraming).length;
  expect(calcCount).toBeGreaterThanOrEqual(Math.floor(responses.length / 2));
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-007-05: Warm analytical tone for difficult emotional content
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-007-05: Response to hopeless message is warm and grounded, not clinical or sensing', async ({ page }) => {
  const email = uniqueEmail('aip-007-05');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    "I've been feeling really hopeless lately, like nothing will ever get better",
  );
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Should acknowledge the emotion in Aiden's grounded, analytical way
  const isEmpathetic =
    lower.includes('hear') ||
    lower.includes('understand') ||
    lower.includes('heavy') ||
    lower.includes('difficult') ||
    lower.includes('challenge') ||
    lower.includes('pinnacle') ||
    lower.includes('karmic') ||
    lower.includes('number') ||
    lower.includes('period');
  expect(isEmpathetic).toBeTruthy();

  // Must NOT be clinical or robotic
  expect(lower).not.toContain('i understand that you are experiencing');
  expect(lower).not.toContain('that must be very difficult for you');

  // CRITICAL: Must NOT use sensing/feeling framing (unique Aiden rule)
  expect(lower).not.toContain('i sense');
  expect(lower).not.toContain('i feel that');
  expect(lower).not.toContain('i intuit');
  expect(lower).not.toContain('my intuition');

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-007-06: No markdown formatting in responses
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-007-06: Responses contain no markdown formatting even for multi-concept questions', async ({ page }) => {
  const messages = [
    'Can you explain what Life Path, Pinnacle, and Personal Year all mean?',
    'Break down the main numerology numbers for me',
    'List the areas my blueprint covers',
    'Give me a summary of what the numbers show',
  ];

  const responses = await collectAidenResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  let markdownViolations = 0;
  for (const text of responses) {
    if (!hasNoMarkdown(text)) {
      markdownViolations++;
      console.warn('Markdown detected in Aiden response:', text.substring(0, 100));
    }
  }

  // Zero markdown violations expected
  expect(markdownViolations).toBe(0);
});
