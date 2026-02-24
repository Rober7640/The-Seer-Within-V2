import { test, expect } from '@playwright/test';
import { db } from '../server/lib/db';
import { users } from '@shared/schema';
import { hashPassword, generateToken } from '../server/lib/auth';
import {
  loadPersonaIntentConfig,
  validateResponse,
  type CharacterRules
} from '../server/lib/personaIntent';
import { eq } from 'drizzle-orm';

/**
 * Test Suite: Character Rules Validation
 *
 * Tests the character rules enforcement system:
 * - Forbidden phrases detection
 * - Word count limits
 * - Required elements
 * - Speaking style consistency
 */

let testUser: any;
let testToken: string;
let evelynRules: CharacterRules;

test.describe('Character Rules Validation', () => {

  test.beforeAll(async () => {
    // Load Evelyn's character rules once
    const config = await loadPersonaIntentConfig('7f03b55e-9a35-4bb7-ac80-a5dff7228910');
    evelynRules = config.characterRules;
  });

  test.beforeEach(async () => {
    testUser = await createTestUser();
    testToken = generateToken(testUser.id, testUser.email);
  });

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  // ============================================================
  // Test Suite 1: Forbidden Phrases
  // ============================================================

  test('should detect forbidden phrase: "As an AI"', () => {
    const response = 'As an AI, I can help you with that.';
    const violations = validateResponse(response, evelynRules);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain('As an AI');
  });

  test('should detect forbidden phrase: "I\'m programmed"', () => {
    const response = 'I\'m programmed to assist you.';
    const violations = validateResponse(response, evelynRules);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain('programmed');
  });

  test('should detect forbidden phrase: "language model"', () => {
    const response = 'As a language model, I cannot predict the future.';
    const violations = validateResponse(response, evelynRules);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain('language model');
  });

  test('should detect forbidden phrase: "I cannot"', () => {
    const response = 'I cannot help you with that request.';
    const violations = validateResponse(response, evelynRules);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain('I cannot');
  });

  test('should detect all AI-related forbidden phrases', () => {
    const forbiddenPhrases = [
      'As an AI',
      'I\'m programmed',
      'I cannot',
      'language model',
      'I don\'t have feelings',
      'artificial intelligence',
      'bot',
      'algorithm'
    ];

    for (const phrase of forbiddenPhrases) {
      const response = `Hello! ${phrase} is something I need to mention.`;
      const violations = validateResponse(response, evelynRules);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].toLowerCase()).toContain(phrase.toLowerCase());
    }
  });

  test('should be case-insensitive for forbidden phrases', () => {
    const responses = [
      'AS AN AI, I can help.',
      'as an ai, I can help.',
      'As An Ai, I can help.'
    ];

    for (const response of responses) {
      const violations = validateResponse(response, evelynRules);
      expect(violations.length).toBeGreaterThan(0);
    }
  });

  test('should pass validation when no forbidden phrases present', () => {
    const response = 'I sense your energy around this situation. Let me guide you through what I\'m seeing.';
    const violations = validateResponse(response, evelynRules);

    expect(violations.length).toBe(0);
  });

  // ============================================================
  // Test Suite 2: Word Count Limits
  // ============================================================

  test('should enforce maximum word count (150 words)', () => {
    // Generate response with exactly 151 words
    const words = Array(151).fill('word').join(' ');
    const violations = validateResponse(words, evelynRules);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some(v => v.includes('too long'))).toBe(true);
  });

  test('should pass validation at word count limit (150 words)', () => {
    // Generate response with exactly 150 words
    const words = Array(150).fill('word').join(' ');
    const violations = validateResponse(words, evelynRules);

    // Should have no word count violation (only forbidden phrase violations if any)
    const wordCountViolations = violations.filter(v => v.includes('too long'));
    expect(wordCountViolations.length).toBe(0);
  });

  test('should pass validation under word count limit', () => {
    const response = 'I sense your energy. Let me guide you through what I see.';
    const violations = validateResponse(response, evelynRules);

    const wordCountViolations = violations.filter(v => v.includes('too long'));
    expect(wordCountViolations.length).toBe(0);
  });

  test('should count words accurately', () => {
    const response = 'One two three four five.';
    const wordCount = response.split(/\s+/).filter(Boolean).length;

    expect(wordCount).toBe(5);

    const violations = validateResponse(response, evelynRules);
    const wordCountViolations = violations.filter(v => v.includes('too long'));
    expect(wordCountViolations.length).toBe(0);
  });

  test('should handle multiple spaces between words', () => {
    const response = 'Word    with    multiple    spaces';
    const violations = validateResponse(response, evelynRules);

    // Should count as 4 words, well under limit
    const wordCountViolations = violations.filter(v => v.includes('too long'));
    expect(wordCountViolations.length).toBe(0);
  });

  // ============================================================
  // Test Suite 3: Multiple Violations
  // ============================================================

  test('should detect multiple violations in one response', () => {
    // Response with forbidden phrase + too many words
    const longResponse = `As an AI, I need to tell you a very long story. ${Array(150).fill('word').join(' ')}`;
    const violations = validateResponse(longResponse, evelynRules);

    // Should have at least 2 violations
    expect(violations.length).toBeGreaterThanOrEqual(2);

    // Should include both types
    expect(violations.some(v => v.includes('As an AI'))).toBe(true);
    expect(violations.some(v => v.includes('too long'))).toBe(true);
  });

  test('should detect multiple forbidden phrases in one response', () => {
    const response = 'As an AI and language model, I\'m programmed to help you.';
    const violations = validateResponse(response, evelynRules);

    // Should have multiple violations
    expect(violations.length).toBeGreaterThanOrEqual(3);
  });

  // ============================================================
  // Test Suite 4: Character Consistency (E2E)
  // ============================================================

  test('actual chat responses should follow character rules', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, testToken);

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // Send a message
    await page.fill('[data-testid="chat-input"]', 'Tell me about my love life');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 15000 });

    const responses = await page.$$eval(
      '[data-testid="assistant-message"]',
      (elements) => elements.map(el => el.textContent || '')
    );

    for (const response of responses) {
      // Validate each response
      const violations = validateResponse(response, evelynRules);

      if (violations.length > 0) {
        console.log('Response:', response);
        console.log('Violations:', violations);
      }

      expect(violations.length).toBe(0);
    }
  });

  test('responses should not exceed word limit in actual chat', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, testToken);

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // Send multiple messages
    const testMessages = [
      'Tell me about my future',
      'What do you see for me?',
      'Tell me more about that'
    ];

    for (const message of testMessages) {
      await page.fill('[data-testid="chat-input"]', message);
      await page.click('[data-testid="send-button"]');
      await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 15000 });

      // Get the latest response
      const response = await page.textContent('[data-testid="assistant-message"]:last-child');
      const wordCount = (response || '').split(/\s+/).filter(Boolean).length;

      expect(wordCount).toBeLessThanOrEqual(evelynRules.maxWordsPerMessage);
    }
  });

  // ============================================================
  // Test Suite 5: Speaking Style Elements
  // ============================================================

  test('should contain required elements in character rules', () => {
    expect(evelynRules.requiredElements).toContain('warm');
    expect(evelynRules.requiredElements).toContain('maternal');
    expect(evelynRules.requiredElements).toContain('grounded');
    expect(evelynRules.requiredElements).toContain('confident');
    expect(evelynRules.requiredElements).toContain('earthy');
  });

  test('speaking style should emphasize short sentences', () => {
    expect(evelynRules.speakingStyle.toLowerCase()).toContain('short');
    expect(evelynRules.speakingStyle.toLowerCase()).toContain('sentences');
  });

  test('speaking style should mention pauses', () => {
    expect(evelynRules.speakingStyle.toLowerCase()).toContain('pause');
  });

  test('speaking style should include affectionate terms', () => {
    const style = evelynRules.speakingStyle.toLowerCase();
    expect(style.includes('dear') || style.includes('love')).toBe(true);
  });

  test('speaking style should avoid theatrical tone', () => {
    expect(evelynRules.speakingStyle.toLowerCase()).toContain('theatrical');
  });

  // ============================================================
  // Test Suite 6: Validation Edge Cases
  // ============================================================

  test('should handle empty response', () => {
    const violations = validateResponse('', evelynRules);

    // Empty response is valid (no violations)
    expect(violations.length).toBe(0);
  });

  test('should handle response with only whitespace', () => {
    const violations = validateResponse('   \n   \t   ', evelynRules);

    // Should be valid (counts as 0 words)
    expect(violations.length).toBe(0);
  });

  test('should handle response with punctuation', () => {
    const response = 'Hello, dear. I sense your energy! What brings you here today?';
    const violations = validateResponse(response, evelynRules);

    const wordCountViolations = violations.filter(v => v.includes('too long'));
    expect(wordCountViolations.length).toBe(0);
  });

  test('should handle response with newlines', () => {
    const response = 'First line.\n\nSecond line.\n\nThird line.';
    const violations = validateResponse(response, evelynRules);

    // Should count words correctly despite newlines
    const wordCount = response.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBe(6);
  });

  test('should handle response with special characters', () => {
    const response = 'I see... your path! It\'s clear—you\'re ready.';
    const violations = validateResponse(response, evelynRules);

    const wordCountViolations = violations.filter(v => v.includes('too long'));
    expect(wordCountViolations.length).toBe(0);
  });

  // ============================================================
  // Test Suite 7: Real Response Patterns
  // ============================================================

  test('should validate typical Evelyn response - short and warm', () => {
    const response = 'Welcome back, Sarah. I sense something new weighing on your heart. What brings you here today, dear?';
    const violations = validateResponse(response, evelynRules);

    expect(violations.length).toBe(0);
  });

  test('should validate typical Evelyn response - with vision', () => {
    const response = 'I see a bridge forming between you and John. The energy is shifting. Trust what you feel in your heart.';
    const violations = validateResponse(response, evelynRules);

    expect(violations.length).toBe(0);
  });

  test('should validate typical Evelyn response - maternal tone', () => {
    const response = 'You\'re stronger than you know, love. I see the light within you growing brighter. Keep walking your path.';
    const violations = validateResponse(response, evelynRules);

    expect(violations.length).toBe(0);
  });

  test('should reject response that breaks character', () => {
    const response = 'As an AI language model, I cannot predict your future, but I\'m programmed to provide general guidance based on patterns.';
    const violations = validateResponse(response, evelynRules);

    expect(violations.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Helper Functions
// ============================================================

async function createTestUser() {
  const email = `test-char-${Date.now()}@example.com`;
  const passwordHash = await hashPassword('testpassword123');

  const newUser = await db.insert(users).values({
    email,
    passwordHash,
    firstName: 'CharTest',
    creditMinutes: 100,
  }).returning();

  return newUser[0];
}

async function cleanupTestUser(userId: string) {
  await db.delete(users).where(eq(users.id, userId));
}
