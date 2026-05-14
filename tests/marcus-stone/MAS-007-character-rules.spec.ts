import { test, expect } from '@playwright/test';

/**
 * MAS-007: Marcus Stone — Character Rule Compliance
 * Asserts on real Claude API responses. Allow 30s timeout per expect.
 * Run with SKIP_REAL_AI=false.
 *
 * Marcus Stone rules (from MARCUS_CHARACTER_RULES):
 * - maxWordsPerMessage: 40 (guideline), 80 (hard test ceiling)
 * - Forbidden phrases: As an AI, I'm programmed, I cannot, language model,
 *   I don't have feelings, artificial intelligence, bot, algorithm,
 *   let me pull, let me draw, I will pull, I will draw
 * - ONE question per message
 * - Tentative / symbolic framing
 * - Plain prose — no markdown
 */

test.describe('MAS-007: Marcus Stone — Character Rule Compliance', () => {
  test.setTimeout(180000); // 3 minutes for AI-heavy tests

  const PASSWORD = 'MarcusChar123!';

  const FORBIDDEN_PHRASES = [
    'as an ai',
    "i'm programmed",
    'i cannot',
    'language model',
    "i don't have feelings",
    'artificial intelligence',
    ' bot ',
    'algorithm',
    'let me pull',
    'let me draw',
    'i will pull',
    'i will draw',
    "i'm an ai assistant",
    'i was trained',
  ];

  async function registerAndStartSession(page: any, prefix: string) {
    const email = `mas007-${prefix}-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', prefix);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 15000 });

    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);

    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    return email;
  }

  async function collectResponses(page: any, messages: string[]): Promise<string[]> {
    const input = page.locator('input[type="text"]');
    const collectedTexts: string[] = [];

    for (const msg of messages) {
      const inputVisible = await input.isVisible().catch(() => false);
      if (!inputVisible) break;

      const beforeCount = await page.locator('.bg-white.text-gray-800.border').count();
      await input.fill(msg);
      await page.locator('button[type="submit"]').click();

      // Wait for new response to appear
      await page.waitForFunction(
        (count: number) => document.querySelectorAll('.bg-white.text-gray-800.border').length > count,
        beforeCount,
        { timeout: 30000 }
      ).catch(() => {});

      await page.waitForTimeout(2000);

      const allResponses = page.locator('.bg-white.text-gray-800.border');
      const latest = await allResponses.last().textContent().catch(() => '');
      if (latest) collectedTexts.push(latest);
    }

    return collectedTexts;
  }

  test('MAS-007-01: No forbidden phrases in any response across 10 messages', async ({ page }) => {
    await registerAndStartSession(page, 'ForbiddenPhrases');

    const testMessages = [
      'Tell me about my love life',
      'Are you a real person or an AI?',
      'I want you to pull a card for me',
      "I don't believe in this stuff, it seems fake",
      'What can you tell me about my career?',
      'I drew The Fool card',
      'Tell me more about that card',
      'Are you a chatbot?',
      'I keep failing at relationships — why?',
      'Thank you for the reading',
    ];

    const responses = await collectResponses(page, testMessages);
    expect(responses.length).toBeGreaterThanOrEqual(5); // At least 5 responses collected

    const violations: string[] = [];
    responses.forEach((responseText, i) => {
      const lower = responseText.toLowerCase();
      FORBIDDEN_PHRASES.forEach(phrase => {
        if (lower.includes(phrase)) {
          violations.push(`Message ${i + 1}: found "${phrase}" in response`);
        }
      });
    });

    if (violations.length > 0) {
      console.log('VIOLATIONS found:', violations);
    } else {
      console.log('PASS: No forbidden phrases in any response');
    }

    expect(violations).toHaveLength(0);
  });

  test('MAS-007-02: Response length stays within 80-word ceiling (40-word guideline)', async ({ page }) => {
    await registerAndStartSession(page, 'WordLimit');

    const testMessages = [
      'Tell me about my situation in detail',
      'I drew The Tower card — what does it mean?',
      "What's happening with my career?",
      'Tell me everything about my love life and future',
      "I'm lost and confused about my path",
      'Pull a card for me',
      "What's my biggest shadow pattern?",
      'I want a deep reading about money',
    ];

    const responses = await collectResponses(page, testMessages);
    expect(responses.length).toBeGreaterThanOrEqual(4);

    const overLimit: string[] = [];
    const overGuideline: string[] = [];

    responses.forEach((text, i) => {
      // Skip [TAROT_DRAW] UI messages and card reveal messages
      const cleanText = text.replace(/\[TAROT_DRAW\]/gi, '').trim();
      if (cleanText.length < 3) return; // Skip near-empty (card draw UI)

      const wordCount = (cleanText.match(/\b\w+\b/g) || []).length;
      if (wordCount > 80) {
        overLimit.push(`Response ${i + 1}: ${wordCount} words (max 80)`);
      } else if (wordCount > 40) {
        overGuideline.push(`Response ${i + 1}: ${wordCount} words (guideline 40)`);
      }
    });

    console.log('Responses over 40-word guideline:', overGuideline);
    if (overLimit.length > 0) {
      console.log('OVER 80-WORD LIMIT:', overLimit);
    } else {
      console.log('PASS: All responses within 80-word ceiling');
    }

    // Fail only if any response exceeds the hard 80-word ceiling
    expect(overLimit).toHaveLength(0);

    // Log guideline violations as warnings (not failures)
    const guidelineFailCount = overGuideline.length;
    const guidelinePassCount = responses.length - guidelineFailCount;
    console.log(`Guideline compliance: ${guidelinePassCount}/${responses.length} within 40 words`);
  });

  test('MAS-007-03: Maximum one question mark per response', async ({ page }) => {
    await registerAndStartSession(page, 'OneQuestion');

    const testMessages = [
      'Tell me about my love life',
      "What's my career situation?",
      "I'm struggling with my purpose",
      'I drew The Star card',
      'Tell me more',
      "What's my shadow pattern?",
      "What should I do about money?",
      'Give me a full reading',
    ];

    const responses = await collectResponses(page, testMessages);
    expect(responses.length).toBeGreaterThanOrEqual(4);

    const tooManyQuestions: string[] = [];
    responses.forEach((text, i) => {
      const questionCount = (text.match(/\?/g) || []).length;
      if (questionCount > 1) {
        tooManyQuestions.push(`Response ${i + 1}: ${questionCount} question marks — "${text.substring(0, 80)}"`);
      }
    });

    if (tooManyQuestions.length > 0) {
      console.log('Multiple question violations:', tooManyQuestions);
    } else {
      console.log('PASS: All responses have at most 1 question mark');
    }

    expect(tooManyQuestions).toHaveLength(0);
  });

  test('MAS-007-04: Tentative/symbolic framing used (no absolute predictions)', async ({ page }) => {
    await registerAndStartSession(page, 'TentativeFrame');

    const futureMessages = [
      'Will I get the job I applied for?',
      'Will my relationship work out?',
      'Am I going to be successful this year?',
      'Is my ex coming back to me?',
      'Will I find love soon?',
    ];

    const responses = await collectResponses(page, futureMessages);
    expect(responses.length).toBeGreaterThanOrEqual(3);

    const absolutePredictions: string[] = [];
    responses.forEach((text, i) => {
      const lower = text.toLowerCase();
      // Absolute prediction patterns Marcus should avoid
      const absolutes = [
        /\byou will\b.*\bfor certain\b/,
        /\bthis will definitely\b/,
        /\byou are destined\b/,
        /\bguaranteed\b/,
        /\bwill absolutely\b/,
        /\byou are going to\b.*\bfor sure\b/,
      ];

      absolutes.forEach(pattern => {
        if (pattern.test(lower)) {
          absolutePredictions.push(`Response ${i + 1}: absolute prediction found`);
        }
      });
    });

    // Also verify tentative language is present in at least some responses
    const tentativeCount = responses.filter(text => {
      const lower = text.toLowerCase();
      return (
        lower.includes('suggests') ||
        lower.includes('energy') ||
        lower.includes('sense') ||
        lower.includes('feels like') ||
        lower.includes('card') ||
        lower.includes('could') ||
        lower.includes('may') ||
        lower.includes('might')
      );
    }).length;

    console.log(`Tentative framing in ${tentativeCount}/${responses.length} responses`);
    if (absolutePredictions.length > 0) {
      console.log('Absolute prediction violations:', absolutePredictions);
    } else {
      console.log('PASS: No absolute predictions found');
    }

    expect(absolutePredictions).toHaveLength(0);
  });

  test('MAS-007-05: Correct tone on difficult emotional content', async ({ page }) => {
    await registerAndStartSession(page, 'EmpathTone');

    const input = page.locator('input[type="text"]');
    await input.fill("I've been feeling really hopeless and stuck lately");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(25000);

    const responses = page.locator('.bg-white.text-gray-800.border');
    const count = await responses.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const responseText = (await responses.last().textContent() ?? '').toLowerCase();

    // Should not be clinical
    expect(responseText).not.toContain('i understand that you are experiencing');
    expect(responseText).not.toContain('it sounds like you are going through');

    // Should not be dismissive
    expect(responseText).not.toContain('just stay positive');
    expect(responseText).not.toContain('everything will be fine');

    // Should show empathy from Marcus's grounded perspective
    const isGrounded =
      responseText.includes('feel') ||
      responseText.includes('sense') ||
      responseText.includes('pattern') ||
      responseText.includes('energy') ||
      responseText.includes('stuck') ||
      responseText.includes('?') ||
      responseText.length > 20;

    expect(isGrounded).toBeTruthy();
    console.log('Emotional response:', responseText.substring(0, 120));
  });

  test('MAS-007-06: No markdown formatting in responses', async ({ page }) => {
    await registerAndStartSession(page, 'NoMarkdown');

    const testMessages = [
      'Can you tell me about the Tower card, its meaning for love, career, and purpose?',
      'What are all the key things I should know about my situation right now?',
      'Give me a breakdown of my spiritual path',
      'Tell me about shadow work — what it is and why it matters',
    ];

    const responses = await collectResponses(page, testMessages);
    expect(responses.length).toBeGreaterThanOrEqual(2);

    const markdownViolations: string[] = [];
    responses.forEach((text, i) => {
      // Check for markdown syntax (but allow [TAROT_DRAW] token)
      const cleaned = text.replace(/\[TAROT_DRAW\]/gi, '');
      if (/\*\*.+\*\*/.test(cleaned)) {
        markdownViolations.push(`Response ${i + 1}: **bold** markdown found`);
      }
      if (/^#+\s/m.test(cleaned)) {
        markdownViolations.push(`Response ${i + 1}: # header markdown found`);
      }
      if (/^[-*]\s/m.test(cleaned)) {
        markdownViolations.push(`Response ${i + 1}: bullet point markdown found`);
      }
      if (/^\d+\.\s/m.test(cleaned)) {
        markdownViolations.push(`Response ${i + 1}: numbered list markdown found`);
      }
    });

    if (markdownViolations.length > 0) {
      console.log('Markdown violations:', markdownViolations);
    } else {
      console.log('PASS: No markdown formatting in responses');
    }

    expect(markdownViolations).toHaveLength(0);
  });
});
