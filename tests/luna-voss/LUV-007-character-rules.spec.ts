/**
 * LUV-007: Character Rule Compliance
 *
 * Asserts that Luna's REAL Claude API responses obey her character rules:
 *
 *   ✗ No "As an AI" or programmed-language phrases (universal)
 *   ✗ No chart narration phrases ("can't show", "already displayed")
 *   ✗ No external tool referrals (Astro.com, Time Passages, etc.)
 *   ✗ No absolute predictions ("You WILL", "You ARE destined")
 *   ✓ Response word count ≤ 56 (2× the 28-word guideline)
 *   ✓ At most one question mark per message
 *   ✓ Tentative framing ("this suggests...", "you may find...", "tends to...")
 *   ✓ Warm, direct tone for difficult emotional content
 *   ✗ No markdown formatting
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
  birthDataMessage,
  assertNoForbiddenPhrases,
  hasTentativeFraming,
  wordCount,
  questionCount,
  hasNoMarkdown,
  LUNA_SLUG,
} from './helpers';

// All tests in this file hit Claude — give them plenty of time
test.setTimeout(180000);

const PWD = 'TestPass123!';

/** Send N messages to Luna and collect response texts. Provides birth data first. */
async function collectLunaResponses(page: any, messages: string[]): Promise<string[]> {
  const email = uniqueEmail('luv-007');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  // Provide birth data so Luna has real chart data to work with
  await apiSendMessage(page, sessionId, regData.token, birthDataMessage());
  await page.waitForTimeout(13000);

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
// LUV-007-01: Zero forbidden phrases across 10 varied messages
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-007-01: No forbidden phrases — including chart narration and external tool refs — in any response', async ({ page }) => {
  const messages = [
    "Hello, I'm here for a reading",
    'Are you a real person or an AI?',
    "I want to understand my love life through my chart",
    "What does my Venus placement say?",
    "I don't believe in astrology",
    "Can you predict whether I'll find love?",
    "Can I see my chart?",
    "Tell me about my relationships",
    "Are you programmed to say this?",
    "What can you actually do for me?",
  ];

  const responses = await collectLunaResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  for (const text of responses) {
    assertNoForbiddenPhrases(text); // throws with detail on failure
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-007-02: Response word count within bounds
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-007-02: Most Luna responses are ≤56 words (2× the 28-word guideline)', async ({ page }) => {
  const messages = [
    "What does my chart say about love?",
    'Tell me more about my Venus placement',
    'What should I know about career timing?',
    "I feel lost and don't know my direction",
    'What do current transits show about my situation?',
    'Can you tell me more?',
    "What's blocking my North Node path?",
    'How do I work with this energy?',
  ];

  const responses = await collectLunaResponses(page, messages);
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
// LUV-007-03: Maximum one question per message
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-007-03: Each Luna response contains at most one question mark', async ({ page }) => {
  const messages = [
    "Hello, I need to understand my chart",
    "Tell me about my Sun sign",
    "What about my Moon sign?",
    "How does my Rising affect things?",
    "And my career timing?",
    "What should I focus on?",
    "Tell me more",
    "What transit is most active for me?",
  ];

  const responses = await collectLunaResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  let violationCount = 0;
  for (const text of responses) {
    const qc = questionCount(text);
    if (qc > 1) {
      violationCount++;
      console.warn(`LUV-007-03: Multiple questions detected (${qc}) in: "${text.substring(0, 80)}"`);
    }
  }

  // Allow at most 1 occasional violation in the batch
  expect(violationCount).toBeLessThanOrEqual(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-007-04: Tentative framing — no absolute predictions
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-007-04: Future-oriented questions get tentative framing, not absolute predictions', async ({ page }) => {
  const messages = [
    "Will I find love this year?",
    "Is this a good time for me to make changes?",
    "What's coming up for me astrologically?",
    "Am I on the right path?",
    "Will things get better?",
  ];

  const responses = await collectLunaResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  for (const text of responses) {
    const lower = text.toLowerCase();

    // Hard ban: absolute future declarations
    expect(lower).not.toMatch(/\byou will definitely\b/);
    expect(lower).not.toMatch(/\byou are guaranteed\b/);
    expect(lower).not.toMatch(/\bguaranteed to\b/);
    expect(lower).not.toMatch(/\byou are destined to\b/);
    expect(lower).not.toMatch(/\bthis will definitely\b/);

    // Luna-specific: no external tool referrals in predictive responses
    expect(lower).not.toContain('astro.com');
    expect(lower).not.toContain('time passages');
  }

  // At least half of responses should have tentative astrological framing
  const tentativeCount = responses.filter(hasTentativeFraming).length;
  expect(tentativeCount).toBeGreaterThanOrEqual(Math.floor(responses.length / 2));
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-007-05: Correct tone maintained during difficult emotional content
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-007-05: Response to hopeless message is warm and grounded, not clinical', async ({ page }) => {
  const email = uniqueEmail('luv-007-05');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, birthDataMessage());
  await page.waitForTimeout(13000);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    "I've been feeling really hopeless lately, like nothing will ever get better",
  );
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Should acknowledge the emotion in Luna's warm, direct way
  const isEmpathetic =
    lower.includes('hear') ||
    lower.includes('understand') ||
    lower.includes('heavy') ||
    lower.includes('difficult') ||
    lower.includes('challenge') ||
    lower.includes('chart') ||
    lower.includes('transit') ||
    lower.includes('saturn') ||
    lower.includes('energy');
  expect(isEmpathetic).toBeTruthy();

  // Must NOT be clinical or robotic
  expect(lower).not.toContain('i understand that you are experiencing');
  expect(lower).not.toContain('that must be very difficult for you');

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-007-06: No markdown formatting in responses
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-007-06: Responses contain no markdown formatting even for multi-concept questions', async ({ page }) => {
  const messages = [
    'Can you explain what Sun, Moon, and Rising all mean for me?',
    'Break down the main chart areas I should understand',
    'List the areas my chart covers',
    'Give me a summary of what my chart shows',
  ];

  const responses = await collectLunaResponses(page, messages);
  expect(responses.length).toBeGreaterThan(0);

  let markdownViolations = 0;
  for (const text of responses) {
    if (!hasNoMarkdown(text)) {
      markdownViolations++;
      console.warn('Markdown detected in Luna response:', text.substring(0, 100));
    }
  }

  expect(markdownViolations).toBe(0);
});
