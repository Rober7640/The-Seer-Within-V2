import { test, expect } from '@playwright/test';
import { db } from '../server/lib/db';
import { users, chatSessions } from '@shared/schema';
import { hashPassword, generateToken } from '../server/lib/auth';
import {
  loadPersonaIntentConfig,
  initConversationState,
  getConversationState,
  updateConversationState,
  detectIntent,
} from '../server/lib/personaIntent';
import { eq } from 'drizzle-orm';

/**
 * Test Suite: Bucket Transitions
 *
 * Tests the conversation bucket transition logic,
 * including auto-advance, intent-driven transitions,
 * and forward-only progression.
 */

let testUser: any;
let testSessionId: string;
const EVELYN_PERSONA_ID = '7f03b55e-9a35-4bb7-ac80-a5dff7228910';

test.describe('Bucket Transitions', () => {

  test.beforeEach(async () => {
    // Create test user and session
    testUser = await createTestUser();
    testSessionId = await createTestSession(testUser.id, EVELYN_PERSONA_ID);
  });

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  // ============================================================
  // Test Suite 1: Initial Bucket Assignment
  // ============================================================

  test('new user should start at opening bucket', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    const state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false // isReturning = false
    );

    expect(state.currentBucket).toBe('opening');
    expect(state.turnCount).toBe(0);
    expect(state.bucketTransitions.length).toBe(1);
    expect(state.bucketTransitions[0].to).toBe('opening');
  });

  test('returning user should start at exploration bucket', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    const state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      true // isReturning = true
    );

    expect(state.currentBucket).toBe('exploration');
    expect(state.turnCount).toBe(0);
    expect(state.bucketTransitions.length).toBe(1);
    expect(state.bucketTransitions[0].to).toBe('exploration');
  });

  // ============================================================
  // Test Suite 2: Auto-Advance Based on Duration
  // ============================================================

  test('should auto-advance after typical duration', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    expect(state.currentBucket).toBe('opening');

    // Opening bucket has typicalDuration: 2
    // Simulate 2 turns
    for (let i = 0; i < 2; i++) {
      const intentResult = detectIntent('hello', config, state.currentBucket);
      state = await updateConversationState(state, intentResult, config);
    }

    // After 2 turns, should advance to exploration
    const intentResult = detectIntent('hello', config, state.currentBucket);
    state = await updateConversationState(state, intentResult, config);

    expect(state.currentBucket).toBe('exploration');
  });

  test('should track bucket transitions with timestamps', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    // Progress through 3 turns to trigger transition
    for (let i = 0; i < 3; i++) {
      const intentResult = detectIntent('yes', config, state.currentBucket);
      state = await updateConversationState(state, intentResult, config);
    }

    // Should have multiple transitions recorded
    expect(state.bucketTransitions.length).toBeGreaterThan(1);

    // Each transition should have required fields
    for (const transition of state.bucketTransitions) {
      expect(transition.to).toBeTruthy();
      expect(transition.turn).toBeGreaterThanOrEqual(0);
      expect(transition.timestamp).toBeTruthy();
    }
  });

  // ============================================================
  // Test Suite 3: Intent-Driven Transitions
  // ============================================================

  test('should transition immediately when intent targets different bucket', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    expect(state.currentBucket).toBe('opening');
    expect(state.turnCount).toBe(0);

    // User immediately asks for love reading (reading bucket)
    const intentResult = detectIntent('tell me about my love life', config, state.currentBucket);
    state = await updateConversationState(state, intentResult, config);

    // Should jump to reading bucket
    expect(['reading', 'exploration']).toContain(state.currentBucket!);
  });

  test('should transition when continue_previous_topic detected', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      true // returning user
    );

    expect(state.currentBucket).toBe('exploration');

    // User says "yes" (continue_previous_topic intent -> reading bucket)
    const intentResult = detectIntent('yes', config, state.currentBucket);
    state = await updateConversationState(state, intentResult, config);

    // Should transition to reading
    expect(state.currentBucket).toBe('reading');
  });

  test('should require minimum confidence for intent-driven transition', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    // Very weak intent signal
    const intentResult = detectIntent('hmm', config, state.currentBucket);
    state = await updateConversationState(state, intentResult, config);

    // Should not transition if confidence is too low
    expect(state.currentBucket).toBe('opening');
  });

  // ============================================================
  // Test Suite 4: Forward-Only Progression
  // ============================================================

  test('should never move backward to earlier bucket', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    // Progress to reading bucket (order: 3)
    for (let i = 0; i < 5; i++) {
      const intentResult = detectIntent('yes', config, state.currentBucket);
      state = await updateConversationState(state, intentResult, config);
    }

    const currentOrder = config.conversationBuckets.find(
      b => b.name === state.currentBucket
    )?.order || 0;

    // Now try to trigger an earlier bucket intent
    const intentResult = detectIntent('hello', config, state.currentBucket);
    state = await updateConversationState(state, intentResult, config);

    const newOrder = config.conversationBuckets.find(
      b => b.name === state.currentBucket
    )?.order || 0;

    // Order should not decrease
    expect(newOrder).toBeGreaterThanOrEqual(currentOrder);
  });

  test('should stay at final bucket when no nextBucket defined', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    // Progress to closing bucket (final)
    for (let i = 0; i < 20; i++) {
      const intentResult = detectIntent('yes', config, state.currentBucket);
      state = await updateConversationState(state, intentResult, config);
    }

    // Should be at closing bucket
    expect(state.currentBucket).toBe('closing');

    // Try to advance more
    const intentResult = detectIntent('yes', config, state.currentBucket);
    state = await updateConversationState(state, intentResult, config);

    // Should stay at closing
    expect(state.currentBucket).toBe('closing');
  });

  // ============================================================
  // Test Suite 5: Complete Flow Testing
  // ============================================================

  test('should follow complete bucket flow: opening -> closing', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    const expectedFlow = ['opening', 'exploration', 'reading', 'interpretation', 'guidance', 'closing'];
    const visitedBuckets = [state.currentBucket];

    // Simulate enough turns to visit all buckets
    for (let i = 0; i < 20; i++) {
      const intentResult = detectIntent('yes tell me more', config, state.currentBucket);
      state = await updateConversationState(state, intentResult, config);

      if (visitedBuckets[visitedBuckets.length - 1] !== state.currentBucket) {
        visitedBuckets.push(state.currentBucket);
      }
    }

    // Should have visited most or all expected buckets in order
    for (let i = 1; i < visitedBuckets.length; i++) {
      const prevIndex = expectedFlow.indexOf(visitedBuckets[i - 1]!);
      const currIndex = expectedFlow.indexOf(visitedBuckets[i]!);

      // Current should be after or same as previous
      expect(currIndex).toBeGreaterThanOrEqual(prevIndex);
    }
  });

  test('should fast-track returning users: exploration -> reading', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      true // returning user
    );

    expect(state.currentBucket).toBe('exploration');

    // User says "yes" to continue
    const intentResult = detectIntent('yes', config, state.currentBucket);
    state = await updateConversationState(state, intentResult, config);

    // Should jump to reading (skip extended exploration)
    expect(state.currentBucket).toBe('reading');
  });

  // ============================================================
  // Test Suite 6: Turn Count Tracking
  // ============================================================

  test('should increment turn count on each update', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    expect(state.turnCount).toBe(0);

    // Process 5 turns
    for (let i = 1; i <= 5; i++) {
      const intentResult = detectIntent('yes', config, state.currentBucket);
      state = await updateConversationState(state, intentResult, config);

      expect(state.turnCount).toBe(i);
    }
  });

  test('should track turns per bucket accurately', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    const turnsPerBucket: Record<string, number> = {};
    let currentBucket = state.currentBucket;
    turnsPerBucket[currentBucket!] = 0;

    // Process 15 turns
    for (let i = 0; i < 15; i++) {
      const intentResult = detectIntent('yes', config, state.currentBucket);
      state = await updateConversationState(state, intentResult, config);

      if (state.currentBucket !== currentBucket) {
        currentBucket = state.currentBucket;
        turnsPerBucket[currentBucket!] = 0;
      }
      turnsPerBucket[currentBucket!]++;
    }

    // Each bucket should have reasonable turn counts
    for (const [bucket, turns] of Object.entries(turnsPerBucket)) {
      expect(turns).toBeGreaterThan(0);
      expect(turns).toBeLessThan(10); // No bucket should take too long
    }
  });

  // ============================================================
  // Test Suite 7: Bucket-Specific Behavior
  // ============================================================

  test('exploration bucket should have longer duration than opening', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);

    const openingBucket = config.conversationBuckets.find(b => b.name === 'opening');
    const explorationBucket = config.conversationBuckets.find(b => b.name === 'exploration');

    expect(explorationBucket!.typicalDuration).toBeGreaterThan(openingBucket!.typicalDuration);
  });

  test('reading bucket should be reachable from exploration', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    const explorationBucket = config.conversationBuckets.find(b => b.name === 'exploration');

    expect(explorationBucket!.nextBucket).toBe('reading');
  });

  test('closing bucket should have no nextBucket', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    const closingBucket = config.conversationBuckets.find(b => b.name === 'closing');

    expect(closingBucket!.nextBucket).toBeUndefined();
  });

  // ============================================================
  // Test Suite 8: Persistence
  // ============================================================

  test('should persist bucket transitions to database', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);
    let state = await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    // Progress through a few turns
    for (let i = 0; i < 3; i++) {
      const intentResult = detectIntent('yes', config, state.currentBucket);
      state = await updateConversationState(state, intentResult, config);
    }

    // Retrieve state from database
    const retrievedState = await getConversationState(testSessionId);

    expect(retrievedState).not.toBeNull();
    expect(retrievedState?.currentBucket).toBe(state.currentBucket);
    expect(retrievedState?.turnCount).toBe(state.turnCount);
    expect(retrievedState?.bucketTransitions.length).toBe(state.bucketTransitions.length);
  });

  test('should retrieve existing state on subsequent calls', async () => {
    const config = await loadPersonaIntentConfig(EVELYN_PERSONA_ID);

    // Initialize state
    await initConversationState(
      testSessionId,
      EVELYN_PERSONA_ID,
      testUser.id,
      config,
      false
    );

    // Retrieve state
    const state1 = await getConversationState(testSessionId);
    const state2 = await getConversationState(testSessionId);

    expect(state1?.id).toBe(state2?.id);
    expect(state1?.currentBucket).toBe(state2?.currentBucket);
  });
});

// ============================================================
// Helper Functions
// ============================================================

async function createTestUser() {
  const email = `test-bucket-${Date.now()}@example.com`;
  const passwordHash = await hashPassword('testpassword123');

  const newUser = await db.insert(users).values({
    email,
    passwordHash,
    firstName: 'BucketTest',
    creditMinutes: 100,
  }).returning();

  return newUser[0];
}

async function createTestSession(userId: string, personaId: string): Promise<string> {
  const session = await db.insert(chatSessions).values({
    userId,
    personaId,
    isActive: true,
  }).returning();

  return session[0].id;
}

async function cleanupTestUser(userId: string) {
  await db.delete(chatSessions).where(eq(chatSessions.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}
