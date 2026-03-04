// Unit tests for server/lib/personaIntent.ts
// Run with: npx tsx --test tests/personaIntent.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectIntent,
  validateResponse,
  buildIntentContext,
  estimateEngagement,
  DEFAULT_CONFIG,
  type PersonaIntentConfig,
  type ConversationState,
  type DetectedIntentRecord,
  type IntentResult,
} from '../server/lib/personaIntent.js';

import {
  EVELYN_BUCKETS,
  EVELYN_INTENTS,
  EVELYN_CHARACTER_RULES,
} from '../server/lib/seedIntentConfigs.js';

// ============================================================
// Test Helpers
// ============================================================

function makeConfig(overrides?: Partial<PersonaIntentConfig>): PersonaIntentConfig {
  return {
    id: 'test-config',
    personaId: 'test-persona',
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}

function makeEvelynConfig(): PersonaIntentConfig {
  return {
    id: 'evelyn-config',
    personaId: 'evelyn-cross-001',
    specialty: 'spiritual-reading',
    conversationBuckets: EVELYN_BUCKETS,
    intents: EVELYN_INTENTS,
    characterRules: EVELYN_CHARACTER_RULES,
    version: 1,
    isActive: true,
  };
}

function makeState(overrides?: Partial<ConversationState>): ConversationState {
  return {
    id: 'test-state',
    sessionId: 'test-session',
    personaId: 'test-persona',
    userId: 'test-user',
    currentBucket: 'opening',
    turnCount: 0,
    detectedIntents: [],
    userEngagement: 'medium',
    lastIntentConfidence: 0.5,
    bucketTransitions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================
// detectIntent Tests
// ============================================================

describe('detectIntent', () => {
  it('should detect a greeting intent from default config', () => {
    const config = makeConfig();
    const result = detectIntent('hello there', config);
    assert.equal(result.intent, 'greeting');
    assert.ok(result.confidence > 0, 'Confidence should be > 0');
  });

  it('should return unknown for empty message', () => {
    const config = makeConfig();
    const result = detectIntent('', config);
    assert.equal(result.intent, 'unknown');
    assert.equal(result.confidence, 0);
  });

  it('should return unknown for unrecognized message', () => {
    const config = makeConfig();
    const result = detectIntent('the quick brown fox jumps over the lazy dog', config);
    assert.equal(result.intent, 'unknown');
  });

  it('should detect skepticism intent', () => {
    const config = makeConfig();
    const result = detectIntent("I don't believe in this", config);
    assert.equal(result.intent, 'skeptical');
    assert.ok(result.confidence > 0);
  });

  it('should detect positive intent', () => {
    const config = makeConfig();
    const result = detectIntent("yes, I'm ready", config);
    assert.equal(result.intent, 'positive');
  });

  it('should boost confidence when intent matches current bucket', () => {
    const config = makeConfig();
    const resultWithBucket = detectIntent('hello friend', config, 'opening');
    const resultWithoutBucket = detectIntent('hello friend', config, 'reading');
    // When in the "opening" bucket, greeting intent should get a bucket boost
    assert.ok(
      resultWithBucket.confidence >= resultWithoutBucket.confidence,
      `Bucket-matched confidence (${resultWithBucket.confidence}) should be >= non-matched (${resultWithoutBucket.confidence})`,
    );
  });

  it('should prefer higher-priority intents when confidence is close', () => {
    const config = makeConfig();
    const result = detectIntent("I don't believe this is real, prove it", config);
    // "skeptical" has priority 3, so it should win
    assert.equal(result.intent, 'skeptical');
  });

  it('should return allMatches when multiple intents match', () => {
    const config = makeConfig();
    // "guidance" matches both wants_guidance and greeting won't match
    const result = detectIntent('I need guidance and help me please', config);
    assert.ok(result.allMatches.length >= 1, 'Should have at least one match');
  });

  it('should handle whitespace-only messages as unknown', () => {
    const config = makeConfig();
    const result = detectIntent('   ', config);
    assert.equal(result.intent, 'unknown');
    assert.equal(result.confidence, 0);
  });
});

// ============================================================
// detectIntent with Evelyn Cross Config
// ============================================================

describe('detectIntent - Evelyn Cross', () => {
  it('should detect love reading intent', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('I want to know about my love life and relationship', config);
    assert.equal(result.intent, 'wants_love_reading');
    assert.ok(result.confidence > 0);
  });

  it('should detect money/career intent', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('What do you see for my career and finances?', config);
    assert.equal(result.intent, 'wants_money_reading');
  });

  it('should detect purpose/life path intent', () => {
    const config = makeEvelynConfig();
    const result = detectIntent("I feel lost and need to find my purpose", config);
    assert.equal(result.intent, 'wants_purpose_reading');
  });

  it('should detect AI question intent with high priority', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('are you ai or a real person?', config);
    assert.equal(result.intent, 'ai_question');
    // AI question has priority 4 so should rank highly
    assert.ok(result.confidence > 0.3);
  });

  it('should detect skepticism from "this is a scam"', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('this is a scam', config);
    assert.equal(result.intent, 'skeptical');
  });

  it('should detect explicit decline', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('no thanks, not interested', config);
    assert.equal(result.intent, 'explicit_decline');
  });

  it('should detect price question', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('how much does a reading cost?', config);
    assert.equal(result.intent, 'price_question');
  });

  it('should detect clarity/explanation request in interpretation bucket', () => {
    const config = makeEvelynConfig();
    const result = detectIntent("what does that mean? I'm confused", config, 'interpretation');
    assert.equal(result.intent, 'wants_clarity');
    // Should get bucket boost since we're in interpretation
    assert.ok(result.confidence > 0.3);
  });

  it('should handle ambiguous messages by picking highest confidence', () => {
    const config = makeEvelynConfig();
    // "love" matches love reading, but "lost" matches purpose reading
    const result = detectIntent("I'm lost in love", config);
    assert.ok(
      result.intent === 'wants_love_reading' || result.intent === 'wants_purpose_reading',
      `Should match love or purpose reading, got: ${result.intent}`,
    );
    assert.ok(result.allMatches.length >= 2, 'Should have multiple matches for ambiguous input');
  });

  it('should detect someone/spirit reading intent', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('can you connect with someone who passed away?', config);
    assert.equal(result.intent, 'wants_someone_reading');
  });

  it('should provide response guidance for detected intent', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('I want a reading about my love life and romance', config);
    assert.equal(result.intent, 'wants_love_reading');
    assert.ok(result.responseGuidance.length > 0, 'Should have response guidance');
    assert.ok(result.responseGuidance.includes('love') || result.responseGuidance.includes('relationship'),
      'Response guidance should be relevant to love reading');
  });
});

// ============================================================
// validateResponse Tests
// ============================================================

describe('validateResponse', () => {
  it('should pass for a valid response', () => {
    const violations = validateResponse(
      'I sense a deep warmth in your heart, dear.',
      EVELYN_CHARACTER_RULES,
    );
    assert.equal(violations.length, 0);
  });

  it('should flag forbidden phrase "As an AI"', () => {
    const violations = validateResponse(
      'As an AI, I cannot help with that.',
      EVELYN_CHARACTER_RULES,
    );
    assert.ok(violations.length > 0, 'Should have at least one violation');
    assert.ok(violations.some((v) => v.includes('As an AI')));
  });

  it('should flag forbidden phrase "I\'m programmed"', () => {
    const violations = validateResponse(
      "I'm programmed to assist you in any way.",
      EVELYN_CHARACTER_RULES,
    );
    assert.ok(violations.length > 0);
  });

  it('should flag response exceeding max word count', () => {
    const longResponse = Array(200).fill('word').join(' ');
    const violations = validateResponse(longResponse, EVELYN_CHARACTER_RULES);
    assert.ok(violations.some((v) => v.includes('too long')));
  });

  it('should not flag a response within word limit', () => {
    const shortResponse = 'I see something beautiful in your future, dear.';
    const violations = validateResponse(shortResponse, EVELYN_CHARACTER_RULES);
    const wordViolations = violations.filter((v) => v.includes('too long'));
    assert.equal(wordViolations.length, 0);
  });

  it('should detect multiple forbidden phrases in one response', () => {
    const violations = validateResponse(
      'As an AI language model, I cannot help because I\'m programmed differently.',
      EVELYN_CHARACTER_RULES,
    );
    // Should flag "As an AI", "language model", "I cannot", "I'm programmed"
    assert.ok(violations.length >= 3, `Expected >= 3 violations, got ${violations.length}`);
  });
});

// ============================================================
// estimateEngagement Tests
// ============================================================

describe('estimateEngagement', () => {
  it('should return medium for empty intents', () => {
    const result = estimateEngagement([]);
    assert.equal(result, 'medium');
  });

  it('should return high for consistent strong intents', () => {
    const intents: DetectedIntentRecord[] = [
      { intentName: 'wants_love_reading', confidence: 0.8, turn: 1, timestamp: '' },
      { intentName: 'wants_clarity', confidence: 0.7, turn: 2, timestamp: '' },
      { intentName: 'positive', confidence: 0.6, turn: 3, timestamp: '' },
      { intentName: 'wants_more_detail', confidence: 0.65, turn: 4, timestamp: '' },
      { intentName: 'ready_to_continue', confidence: 0.7, turn: 5, timestamp: '' },
    ];
    const result = estimateEngagement(intents);
    assert.equal(result, 'high');
  });

  it('should return low for mostly unknown intents', () => {
    const intents: DetectedIntentRecord[] = [
      { intentName: 'unknown', confidence: 0.0, turn: 1, timestamp: '' },
      { intentName: 'unknown', confidence: 0.0, turn: 2, timestamp: '' },
      { intentName: 'unknown', confidence: 0.0, turn: 3, timestamp: '' },
      { intentName: 'greeting', confidence: 0.2, turn: 4, timestamp: '' },
      { intentName: 'unknown', confidence: 0.0, turn: 5, timestamp: '' },
    ];
    const result = estimateEngagement(intents);
    assert.equal(result, 'low');
  });

  it('should return medium for mixed engagement', () => {
    const intents: DetectedIntentRecord[] = [
      { intentName: 'greeting', confidence: 0.5, turn: 1, timestamp: '' },
      { intentName: 'unknown', confidence: 0.0, turn: 2, timestamp: '' },
      { intentName: 'wants_reading', confidence: 0.4, turn: 3, timestamp: '' },
    ];
    const result = estimateEngagement(intents);
    assert.equal(result, 'medium');
  });

  it('should only consider the last 5 intents', () => {
    // First 10 intents are all unknown (low engagement), but last 5 are strong
    const intents: DetectedIntentRecord[] = [
      ...Array(10).fill(null).map((_, i) => ({
        intentName: 'unknown', confidence: 0, turn: i + 1, timestamp: '',
      })),
      { intentName: 'wants_love_reading', confidence: 0.8, turn: 11, timestamp: '' },
      { intentName: 'wants_clarity', confidence: 0.7, turn: 12, timestamp: '' },
      { intentName: 'positive', confidence: 0.6, turn: 13, timestamp: '' },
      { intentName: 'wants_more_detail', confidence: 0.65, turn: 14, timestamp: '' },
      { intentName: 'ready_to_continue', confidence: 0.7, turn: 15, timestamp: '' },
    ];
    const result = estimateEngagement(intents);
    assert.equal(result, 'high');
  });
});

// ============================================================
// buildIntentContext Tests
// ============================================================

describe('buildIntentContext', () => {
  it('should include conversation stage and turn count', () => {
    const config = makeEvelynConfig();
    const state = makeState({ currentBucket: 'reading', turnCount: 5 });
    const intentResult: IntentResult = {
      intent: 'wants_love_reading',
      confidence: 0.8,
      bucket: 'reading',
      responseGuidance: 'Focus on love guidance.',
      allMatches: [{ intent: 'wants_love_reading', confidence: 0.8 }],
    };

    const context = buildIntentContext(intentResult, state, config);

    assert.ok(context.includes('Turn: 6'), 'Should show turn count + 1');
    assert.ok(context.includes('reading'), 'Should include current bucket');
    assert.ok(context.includes('wants_love_reading'), 'Should include detected intent');
    assert.ok(context.includes('Focus on love guidance'), 'Should include response guidance');
  });

  it('should include character rules', () => {
    const config = makeEvelynConfig();
    const state = makeState();
    const intentResult: IntentResult = {
      intent: 'unknown',
      confidence: 0,
      bucket: undefined,
      responseGuidance: '',
      allMatches: [],
    };

    const context = buildIntentContext(intentResult, state, config);

    assert.ok(context.includes('Speaking style'), 'Should include speaking style');
    assert.ok(context.includes('150'), 'Should include word limit');
    assert.ok(context.includes('As an AI'), 'Should include forbidden phrases');
  });

  it('should not include guidance for unknown intent', () => {
    const config = makeEvelynConfig();
    const state = makeState();
    const intentResult: IntentResult = {
      intent: 'unknown',
      confidence: 0,
      bucket: undefined,
      responseGuidance: '',
      allMatches: [],
    };

    const context = buildIntentContext(intentResult, state, config);
    assert.ok(!context.includes('Detected intent'), 'Should not include detected intent for unknown');
  });

  it('should include engagement level', () => {
    const config = makeEvelynConfig();
    const state = makeState({ userEngagement: 'high' });
    const intentResult: IntentResult = {
      intent: 'positive',
      confidence: 0.6,
      bucket: 'any',
      responseGuidance: 'Affirm.',
      allMatches: [],
    };

    const context = buildIntentContext(intentResult, state, config);
    assert.ok(context.includes('high'), 'Should include engagement level');
  });
});

// ============================================================
// Edge Cases & Ambiguous Messages
// ============================================================

describe('Edge cases', () => {
  it('should handle very long messages gracefully', () => {
    const config = makeEvelynConfig();
    const longMsg = 'I need help with my relationship '.repeat(100);
    const result = detectIntent(longMsg, config);
    assert.ok(result.intent !== 'unknown', 'Should still detect intent from long messages');
  });

  it('should handle messages with special characters', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('what about my love life???!!!', config);
    assert.equal(result.intent, 'wants_love_reading');
  });

  it('should handle messages with mixed case', () => {
    const config = makeEvelynConfig();
    // "are you ai" is a direct pattern in ai_question
    const result = detectIntent('ARE YOU AI OR JUST A BOT?', config);
    assert.equal(result.intent, 'ai_question');
  });

  it('should handle messages with extra whitespace', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('  hello   there  ', config);
    assert.equal(result.intent, 'greeting');
  });

  it('should return responseGuidance for the winning intent', () => {
    const config = makeEvelynConfig();
    const result = detectIntent('this is fake and a scam', config);
    assert.ok(result.responseGuidance.length > 0);
    assert.ok(
      result.responseGuidance.toLowerCase().includes('skepticism') ||
      result.responseGuidance.toLowerCase().includes('gently'),
      'Guidance should be about handling skepticism',
    );
  });

  it('should handle a config with no intents', () => {
    const config = makeConfig({ intents: [] });
    const result = detectIntent('hello', config);
    assert.equal(result.intent, 'unknown');
    assert.equal(result.allMatches.length, 0);
  });

  it('should handle a config with no buckets', () => {
    const config = makeConfig({ conversationBuckets: [] });
    const result = detectIntent('hello', config);
    // Should still detect intent, just no bucket boosting
    assert.equal(result.intent, 'greeting');
  });
});
