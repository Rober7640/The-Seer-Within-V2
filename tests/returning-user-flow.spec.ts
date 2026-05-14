import { test, expect } from '@playwright/test';
import { db } from '../server/lib/db';
import { users, chatSessions, chatMessages, chatMemories } from '@shared/schema';
import { hashPassword, generateToken } from '../server/lib/auth';
import { eq } from 'drizzle-orm';

/**
 * Test Suite: Returning User Flow
 *
 * Tests the smart bucket initialization and enhanced greeting system
 * for returning users based on their previous session history.
 */

let testUser: any;
let testToken: string;

test.describe('Returning User Flow', () => {

  // ============================================================
  // Setup & Teardown
  // ============================================================

  test.beforeEach(async ({ page }) => {
    // Create a test user for returning user scenarios
    testUser = await createTestUser();
    testToken = generateToken(testUser.id, testUser.email);

    // Set auth token
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, testToken);
  });

  test.afterEach(async () => {
    // Clean up test data
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  // ============================================================
  // Test Suite 1: New User Baseline
  // ============================================================

  test('new user should start at opening bucket', async ({ page }) => {
    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // Verify greeting is for new user
    const greeting = await page.textContent('[data-testid="chat-greeting"]');
    expect(greeting).toMatch(/hello|welcome/i);
    expect(greeting).toMatch(/what brings you/i);

    // Verify conversation state
    const state = await getConversationState(testUser.id);
    expect(state).not.toBeNull();
    expect(state?.currentBucket).toBe('opening');
    expect(state?.turnCount).toBe(0);
  });

  test('new user should receive first-time greeting template', async ({ page }) => {
    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    const greeting = await page.textContent('[data-testid="chat-greeting"]');

    // Should NOT reference previous sessions
    expect(greeting).not.toMatch(/welcome back/i);
    expect(greeting).not.toMatch(/continue/i);
    expect(greeting).not.toMatch(/last time/i);

    // Should be welcoming and ask about their concern
    expect(greeting).toMatch(/evelyn/i);
    expect(greeting?.length).toBeGreaterThan(20);
    expect(greeting?.length).toBeLessThan(300);
  });

  // ============================================================
  // Test Suite 2: Returning User - Bucket Initialization
  // ============================================================

  test('returning user should start at exploration bucket', async ({ page }) => {
    // Create previous session history
    await createPreviousSession(testUser.id, {
      topic: 'love',
      personName: 'John',
      daysAgo: 3
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // Verify conversation state
    const state = await getConversationState(testUser.id);
    expect(state?.currentBucket).toBe('exploration');
    expect(state?.turnCount).toBe(0);
  });

  test('returning user greeting should reference memory', async ({ page }) => {
    // Create previous session with specific details
    await createPreviousSession(testUser.id, {
      topic: 'love',
      personName: 'John',
      concern: 'relationship anxiety',
      daysAgo: 2
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    const greeting = await page.textContent('[data-testid="chat-greeting"]');

    // Should reference previous session
    expect(greeting).toMatch(/welcome back/i);

    // Should mention specific details (John or relationship)
    const mentionsContext =
      greeting?.toLowerCase().includes('john') ||
      greeting?.toLowerCase().includes('relationship');
    expect(mentionsContext).toBe(true);

    // Should offer choice
    expect(greeting).toMatch(/continue|something new|on your heart/i);
  });

  test('returning user greeting should be 2-3 sentences', async ({ page }) => {
    await createPreviousSession(testUser.id, {
      topic: 'money',
      daysAgo: 1
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    const greeting = await page.textContent('[data-testid="chat-greeting"]');
    const sentenceCount = (greeting?.match(/[.!?]+/g) || []).length;

    expect(sentenceCount).toBeGreaterThanOrEqual(2);
    expect(sentenceCount).toBeLessThanOrEqual(4); // Allow some flexibility
  });

  // ============================================================
  // Test Suite 3: Continue Previous Topic Intent
  // ============================================================

  test('should detect continue_previous_topic when user says "yes"', async ({ page }) => {
    await createPreviousSession(testUser.id, {
      topic: 'love',
      personName: 'Sarah',
      daysAgo: 1
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // User says "yes"
    await page.fill('[data-testid="chat-input"]', 'yes');
    await page.click('[data-testid="send-button"]');

    // Wait for assistant response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    // Check conversation state
    const state = await getConversationState(testUser.id);
    expect(state?.turnCount).toBe(1);

    // Should be in or moving to reading bucket
    const isReadingOrHigher = ['reading', 'interpretation', 'guidance', 'closing'].includes(
      state?.currentBucket || ''
    );
    expect(isReadingOrHigher).toBe(true);
  });

  test('should detect continue_previous_topic with various patterns', async ({ page }) => {
    const patterns = ['continue', 'same thing', 'what we talked about', 'last time', 'about that'];

    for (const pattern of patterns) {
      // Reset for each test
      await cleanupTestUser(testUser.id);
      testUser = await createTestUser();
      await createPreviousSession(testUser.id, {
        topic: 'career',
        daysAgo: 2
      });

      await page.goto('/chat/evelyn-cross');
      await page.waitForSelector('[data-testid="chat-greeting"]');

      // User uses pattern
      await page.fill('[data-testid="chat-input"]', pattern);
      await page.click('[data-testid="send-button"]');

      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

      // Should transition toward reading
      const state = await getConversationState(testUser.id);
      expect(state?.turnCount).toBeGreaterThan(0);

      // Verify we're progressing through the flow
      expect(state?.currentBucket).toBeTruthy();
    }
  });

  test('should fast-track to reading bucket on continuation', async ({ page }) => {
    await createPreviousSession(testUser.id, {
      topic: 'love',
      personName: 'Michael',
      daysAgo: 1
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // User explicitly continues
    await page.fill('[data-testid="chat-input"]', 'yes, let\'s continue about Michael');
    await page.click('[data-testid="send-button"]');

    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    const response = await page.textContent('[data-testid="assistant-message"]:last-child');

    // Response should reference Michael and dive into reading
    expect(response?.toLowerCase()).toContain('michael');

    // Should skip exploration and go to reading
    const state = await getConversationState(testUser.id);
    expect(['reading', 'interpretation', 'guidance'].includes(state?.currentBucket || '')).toBe(true);
  });

  // ============================================================
  // Test Suite 4: New Topic (Pivot)
  // ============================================================

  test('should handle pivot to new topic', async ({ page }) => {
    await createPreviousSession(testUser.id, {
      topic: 'love',
      personName: 'John',
      daysAgo: 3
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // User pivots to new topic
    await page.fill('[data-testid="chat-input"]', 'Actually, I want to ask about my career');
    await page.click('[data-testid="send-button"]');

    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    const response = await page.textContent('[data-testid="assistant-message"]:last-child');

    // Should NOT reference John/love
    expect(response?.toLowerCase()).not.toContain('john');

    // Should focus on career
    expect(response?.toLowerCase()).toMatch(/career|work|job/);
  });

  test('should stay in exploration for unclear new topic', async ({ page }) => {
    await createPreviousSession(testUser.id, {
      topic: 'love',
      daysAgo: 2
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // User says something vague
    await page.fill('[data-testid="chat-input"]', 'no, something else');
    await page.click('[data-testid="send-button"]');

    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    const state = await getConversationState(testUser.id);

    // Should stay in exploration to clarify
    expect(state?.currentBucket).toBe('exploration');

    const response = await page.textContent('[data-testid="assistant-message"]:last-child');
    expect(response?.toLowerCase()).toMatch(/what|tell me|mind|heart/);
  });

  // ============================================================
  // Test Suite 5: Memory Integration
  // ============================================================

  test('should load memory for returning users', async ({ page }) => {
    // Create rich previous session
    await createPreviousSession(testUser.id, {
      topic: 'love',
      personName: 'Alex',
      concern: 'communication issues',
      vision: 'bridge of understanding',
      daysAgo: 5
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // Memory should be referenced in greeting or early responses
    const greeting = await page.textContent('[data-testid="chat-greeting"]');

    // Should show personalization
    expect(greeting?.length).toBeGreaterThan(50);
    expect(greeting).toMatch(/welcome back/i);
  });

  test('should handle returning user after long absence', async ({ page }) => {
    // Create session from 6 months ago
    await createPreviousSession(testUser.id, {
      topic: 'purpose',
      daysAgo: 180
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // Should still be treated as returning user
    const state = await getConversationState(testUser.id);
    expect(state?.currentBucket).toBe('exploration');

    const greeting = await page.textContent('[data-testid="chat-greeting"]');
    expect(greeting).toMatch(/welcome back/i);
  });

  // ============================================================
  // Test Suite 6: Edge Cases
  // ============================================================

  test('should handle ambiguous user response', async ({ page }) => {
    await createPreviousSession(testUser.id, {
      topic: 'money',
      daysAgo: 1
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // User is uncertain
    await page.fill('[data-testid="chat-input"]', 'I don\'t know, maybe');
    await page.click('[data-testid="send-button"]');

    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    const response = await page.textContent('[data-testid="assistant-message"]:last-child');

    // Should gently probe
    expect(response?.toLowerCase()).toMatch(/mind|heart|feeling|share/);

    const state = await getConversationState(testUser.id);
    expect(state?.currentBucket).toBe('exploration');
  });

  test('should handle user ignoring choice and jumping to topic', async ({ page }) => {
    await createPreviousSession(testUser.id, {
      topic: 'love',
      daysAgo: 2
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // User completely ignores the choice question
    await page.fill('[data-testid="chat-input"]', 'Tell me about my ex boyfriend');
    await page.click('[data-testid="send-button"]');

    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    // Should handle gracefully and proceed with love reading
    const response = await page.textContent('[data-testid="assistant-message"]:last-child');
    expect(response?.toLowerCase()).toMatch(/relationship|love|ex/);

    const state = await getConversationState(testUser.id);
    expect(['exploration', 'reading'].includes(state?.currentBucket || '')).toBe(true);
  });

  test('should handle mixed signals in one message', async ({ page }) => {
    await createPreviousSession(testUser.id, {
      topic: 'love',
      personName: 'Emma',
      daysAgo: 1
    });

    await page.goto('/chat/evelyn-cross');
    await page.waitForSelector('[data-testid="chat-greeting"]');

    // User says yes but then mentions new topic
    await page.fill('[data-testid="chat-input"]', 'yes but actually I want to talk about my career now');
    await page.click('[data-testid="send-button"]');

    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    const response = await page.textContent('[data-testid="assistant-message"]:last-child');

    // Should prioritize the explicit new topic (career)
    expect(response?.toLowerCase()).toMatch(/career|work|job/);
  });
});

// ============================================================
// Helper Functions
// ============================================================

async function createTestUser() {
  const email = `test-${Date.now()}@example.com`;
  const passwordHash = await hashPassword('testpassword123');

  const newUser = await db.insert(users).values({
    email,
    passwordHash,
    firstName: 'TestUser',
    creditMinutes: 100, // Give enough credits for testing
  }).returning();

  return newUser[0];
}

async function cleanupTestUser(userId: string) {
  // Delete user and all associated data
  await db.delete(chatMemories).where(eq(chatMemories.userId, userId));
  await db.delete(chatMessages).where(eq(chatMessages.sessionId, userId)); // Simplified
  await db.delete(chatSessions).where(eq(chatSessions.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

async function createPreviousSession(
  userId: string,
  options: {
    topic: string;
    personName?: string;
    concern?: string;
    vision?: string;
    daysAgo: number;
  }
) {
  const personaId = '7f03b55e-9a35-4bb7-ac80-a5dff7228910'; // Evelyn Cross

  // Create a previous session
  const sessionDate = new Date();
  sessionDate.setDate(sessionDate.getDate() - options.daysAgo);

  const session = await db.insert(chatSessions).values({
    userId,
    personaId,
    isActive: false,
    startedAt: sessionDate,
  }).returning();

  // Create chat messages to build context
  await db.insert(chatMessages).values([
    {
      sessionId: session[0].id,
      role: 'user',
      content: `I want to talk about my ${options.topic}${options.personName ? ` with ${options.personName}` : ''}`,
      createdAt: sessionDate,
    },
    {
      sessionId: session[0].id,
      role: 'assistant',
      content: `I sense your energy around ${options.topic}. Tell me more...`,
      createdAt: new Date(sessionDate.getTime() + 1000),
    },
  ]);

  // Create memory entry
  await db.insert(chatMemories).values({
    userId,
    personaId,
    memoryType: 'conversation',
    content: JSON.stringify({
      topic: options.topic,
      personName: options.personName,
      concern: options.concern,
      vision: options.vision,
      sessionDate: sessionDate.toISOString(),
    }),
    importance: 0.8,
    lastAccessedAt: sessionDate,
  });

  return session[0];
}

async function getConversationState(userId: string) {
  // Get the most recent active session for the user
  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(chatSessions.startedAt)
    .limit(1);

  if (sessions.length === 0) return null;

  // Import and use the actual conversation state functions
  const { getConversationState: getState } = await import('../server/lib/personaIntent');
  return await getState(sessions[0].id);
}
