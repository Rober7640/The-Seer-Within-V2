import { test, expect } from '@playwright/test';
import {
  detectIntent,
  loadPersonaIntentConfig,
  type PersonaIntentConfig,
  type IntentResult
} from '../server/lib/personaIntent';

/**
 * Test Suite: Intent Detection
 *
 * Tests the intent detection algorithm, confidence scoring,
 * bucket-aware boosting, and priority handling.
 */

let evelynConfig: PersonaIntentConfig;

test.describe('Intent Detection', () => {

  test.beforeAll(async () => {
    // Load Evelyn's intent config once for all tests
    const personaId = '7f03b55e-9a35-4bb7-ac80-a5dff7228910'; // Evelyn Cross
    evelynConfig = await loadPersonaIntentConfig(personaId);
  });

  // ============================================================
  // Test Suite 1: Continue Previous Topic Intent
  // ============================================================

  test('should detect continue_previous_topic from "yes"', () => {
    const result = detectIntent('yes', evelynConfig, 'exploration');

    expect(result.intent).toBe('continue_previous_topic');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.bucket).toBe('reading');
  });

  test('should detect continue_previous_topic from various patterns', () => {
    const patterns = [
      'continue',
      'same thing',
      'what we talked about',
      'last time',
      'about that',
      'still about',
      'same topic',
      'keep going'
    ];

    for (const pattern of patterns) {
      const result = detectIntent(pattern, evelynConfig, 'exploration');

      expect(result.intent).toBe('continue_previous_topic');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.bucket).toBe('reading');
    }
  });

  test('should give high confidence for explicit continuation', () => {
    const result = detectIntent('yes, let\'s continue what we talked about last time', evelynConfig, 'exploration');

    expect(result.intent).toBe('continue_previous_topic');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  // ============================================================
  // Test Suite 2: Topic-Specific Intents
  // ============================================================

  test('should detect wants_love_reading', () => {
    const messages = [
      'I want to know about my love life',
      'Tell me about my relationship with John',
      'Will I find my soulmate?',
      'My boyfriend and I are having issues'
    ];

    for (const message of messages) {
      const result = detectIntent(message, evelynConfig, 'exploration');

      expect(result.intent).toBe('wants_love_reading');
      expect(result.bucket).toBe('reading');
      expect(result.confidence).toBeGreaterThan(0);
    }
  });

  test('should detect wants_money_reading', () => {
    const messages = [
      'I need guidance about my career',
      'Will I get the promotion?',
      'Tell me about my financial future',
      'I\'m struggling with money'
    ];

    for (const message of messages) {
      const result = detectIntent(message, evelynConfig, 'exploration');

      expect(result.intent).toBe('wants_money_reading');
      expect(result.bucket).toBe('reading');
      expect(result.confidence).toBeGreaterThan(0);
    }
  });

  test('should detect wants_purpose_reading', () => {
    const messages = [
      'I feel lost in life',
      'What is my purpose?',
      'I don\'t know which direction to go',
      'Help me find my calling'
    ];

    for (const message of messages) {
      const result = detectIntent(message, evelynConfig, 'exploration');

      expect(result.intent).toBe('wants_purpose_reading');
      expect(result.bucket).toBe('reading');
      expect(result.confidence).toBeGreaterThan(0);
    }
  });

  // ============================================================
  // Test Suite 3: Bucket-Aware Boosting
  // ============================================================

  test('should boost intent confidence when bucket matches', () => {
    // "wants_clarity" intent is for "interpretation" bucket
    const resultInCorrectBucket = detectIntent(
      'I don\'t understand what you mean',
      evelynConfig,
      'interpretation'
    );

    const resultInWrongBucket = detectIntent(
      'I don\'t understand what you mean',
      evelynConfig,
      'opening'
    );

    // Confidence should be higher when bucket matches
    expect(resultInCorrectBucket.confidence).toBeGreaterThan(resultInWrongBucket.confidence);
  });

  test('should prioritize bucket-specific intents in correct bucket', () => {
    // In "closing" bucket, "ready_to_continue" should be highly weighted
    const result = detectIntent('I\'m ready to buy', evelynConfig, 'closing');

    expect(result.intent).toBe('ready_to_continue');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  // ============================================================
  // Test Suite 4: Priority Handling
  // ============================================================

  test('should respect intent priority levels', () => {
    // "ai_question" has priority 4 (highest)
    // Should be detected even with fewer pattern matches
    const result = detectIntent('are you a bot?', evelynConfig, 'exploration');

    expect(result.intent).toBe('ai_question');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('should prioritize high-priority intents over low-priority', () => {
    // Message that could match multiple intents
    const result = detectIntent('yes I want help', evelynConfig, 'exploration');

    // "positive" (priority 1) vs "wants_general_reading" (priority 1)
    // Both should be detected but one should win
    expect(['positive', 'wants_general_reading']).toContain(result.intent);
    expect(result.confidence).toBeGreaterThan(0);
  });

  // ============================================================
  // Test Suite 5: Multi-Pattern Matching
  // ============================================================

  test('should detect intent with multiple pattern matches', () => {
    // Message with multiple love-related patterns
    const result = detectIntent(
      'I want to know about my boyfriend and our relationship',
      evelynConfig,
      'exploration'
    );

    expect(result.intent).toBe('wants_love_reading');
    // Should have high confidence due to multiple matches
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  test('should return all matches in allMatches array', () => {
    const result = detectIntent(
      'yes I want to continue talking about money',
      evelynConfig,
      'exploration'
    );

    // Should detect multiple intents
    expect(result.allMatches.length).toBeGreaterThan(1);

    // Should include both continue_previous_topic and wants_money_reading
    const intentNames = result.allMatches.map(m => m.intent);
    expect(intentNames).toContain('continue_previous_topic');
    expect(intentNames).toContain('wants_money_reading');
  });

  // ============================================================
  // Test Suite 6: Special Intents
  // ============================================================

  test('should detect skeptical intent', () => {
    const messages = [
      'I don\'t believe in this',
      'Is this real or fake?',
      'This seems like a scam',
      'Prove it'
    ];

    for (const message of messages) {
      const result = detectIntent(message, evelynConfig, 'exploration');

      expect(result.intent).toBe('skeptical');
      expect(result.bucket).toBe('any');
    }
  });

  test('should detect ai_question intent', () => {
    const messages = [
      'Are you AI?',
      'Are you a bot?',
      'Are you a robot or a real person?',
      'Is this ChatGPT?'
    ];

    for (const message of messages) {
      const result = detectIntent(message, evelynConfig, 'exploration');

      expect(result.intent).toBe('ai_question');
      expect(result.bucket).toBe('any');
      expect(result.responseGuidance).toContain('never admit');
    }
  });

  test('should detect price_question intent', () => {
    const messages = [
      'How much does this cost?',
      'What\'s the price?',
      'How expensive is this?'
    ];

    for (const message of messages) {
      const result = detectIntent(message, evelynConfig, 'exploration');

      expect(result.intent).toBe('price_question');
      expect(result.bucket).toBe('any');
    }
  });

  test('should detect objection_price intent', () => {
    const messages = [
      'I can\'t afford this',
      'This is too expensive',
      'I have no money right now'
    ];

    for (const message of messages) {
      const result = detectIntent(message, evelynConfig, 'exploration');

      expect(result.intent).toBe('objection_price');
      expect(result.bucket).toBe('any');
    }
  });

  test('should detect explicit_decline intent', () => {
    const messages = [
      'no thanks',
      'not interested',
      'I don\'t want this',
      'goodbye'
    ];

    for (const message of messages) {
      const result = detectIntent(message, evelynConfig, 'exploration');

      expect(result.intent).toBe('explicit_decline');
      expect(result.bucket).toBe('any');
    }
  });

  // ============================================================
  // Test Suite 7: Edge Cases
  // ============================================================

  test('should return unknown intent for empty message', () => {
    const result = detectIntent('', evelynConfig, 'exploration');

    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  test('should return unknown intent for gibberish', () => {
    const result = detectIntent('asdfasdfasdf', evelynConfig, 'exploration');

    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  test('should handle message with no clear intent', () => {
    const result = detectIntent('hmm, interesting', evelynConfig, 'exploration');

    // Might detect something vague or return unknown
    expect(result.intent).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  test('should handle very long messages', () => {
    const longMessage = 'I want to talk about my relationship with my boyfriend John and also my career at work and my purpose in life and my family and '.repeat(10);

    const result = detectIntent(longMessage, evelynConfig, 'exploration');

    // Should detect something (likely multiple matches)
    expect(result.intent).toBeTruthy();
    expect(result.allMatches.length).toBeGreaterThan(0);
  });

  test('should be case-insensitive', () => {
    const resultLower = detectIntent('yes', evelynConfig, 'exploration');
    const resultUpper = detectIntent('YES', evelynConfig, 'exploration');
    const resultMixed = detectIntent('YeS', evelynConfig, 'exploration');

    expect(resultLower.intent).toBe(resultUpper.intent);
    expect(resultUpper.intent).toBe(resultMixed.intent);
  });

  // ============================================================
  // Test Suite 8: Confidence Scoring
  // ============================================================

  test('should calculate confidence based on pattern match ratio', () => {
    // Intent with many patterns - only one match
    const resultLowMatch = detectIntent('relationship', evelynConfig, 'exploration');

    // Intent with many patterns - multiple matches
    const resultHighMatch = detectIntent('I want to know about my boyfriend and our relationship and marriage', evelynConfig, 'exploration');

    // More pattern matches = higher confidence
    expect(resultHighMatch.confidence).toBeGreaterThan(resultLowMatch.confidence);
  });

  test('should clamp confidence between 0 and 1', () => {
    // Try to trigger very high confidence
    const result = detectIntent(
      'yes absolutely sure okay let\'s do it I\'m ready',
      evelynConfig,
      'exploration'
    );

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  // ============================================================
  // Test Suite 9: Response Guidance
  // ============================================================

  test('should provide response guidance for detected intent', () => {
    const result = detectIntent('I want to talk about my career', evelynConfig, 'exploration');

    expect(result.intent).toBe('wants_money_reading');
    expect(result.responseGuidance).toBeTruthy();
    expect(result.responseGuidance).toContain('career');
    expect(result.responseGuidance.length).toBeGreaterThan(20);
  });

  test('should provide appropriate guidance for continue_previous_topic', () => {
    const result = detectIntent('yes continue', evelynConfig, 'exploration');

    expect(result.intent).toBe('continue_previous_topic');
    expect(result.responseGuidance).toContain('continue');
    expect(result.responseGuidance).toContain('previous');
  });

  // ============================================================
  // Test Suite 10: Bucket Targeting
  // ============================================================

  test('should detect intents that target specific buckets', () => {
    // wants_love_reading targets "reading" bucket
    const result = detectIntent('tell me about love', evelynConfig, 'exploration');

    expect(result.intent).toBe('wants_love_reading');
    expect(result.bucket).toBe('reading');
  });

  test('should detect intents that apply to any bucket', () => {
    // skeptical intent has bucket: "any"
    const result = detectIntent('this is fake', evelynConfig, 'reading');

    expect(result.intent).toBe('skeptical');
    expect(result.bucket).toBe('any');
  });
});
