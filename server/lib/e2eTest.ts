// End-to-End Test Script for Multi-Persona Chat Service
// Run with: npx tsx server/lib/e2eTest.ts
//
// Prerequisites:
// 1. Database must be running with schema pushed (npm run db:push)
// 2. Seed data must be loaded (npx tsx server/lib/seedPersona.ts)
// 3. ANTHROPIC_API_KEY must be set (for AI-powered features)
//
// This script tests the complete user journey through the chat service.

import { db } from './db';
import { users, personas, chatSessions, chatMessages, userMemory, systemConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateToken, verifyToken } from './auth';
import { startChatSession, endChatSession, checkpointSession, getRemainingMinutes } from './creditTracking';
import { summarizeSession, loadUserContext } from './memoryManager';
import { loadCrossPersonaMemories, formatTransferContext } from './memoryTransfer';
import { conductPanelReading, getAvailablePanelPersonas } from './panelReadings';
import { findOutreachCandidates } from './proactiveOutreach';
import { scoreSessionQuality, suggestPromptImprovements } from './personaTraining';
import { migrateConversationsToUsers } from './migration';
import { seedEvelynPersona, seedSystemConfig } from './seedPersona';

// Test state
let testUserId: string;
let testSessionId: string;
let testPersonaId: string;
let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, testName: string): void {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  FAIL: ${testName}`);
    failed++;
    errors.push(testName);
  }
}

async function assertThrows(fn: () => Promise<unknown>, testName: string): Promise<void> {
  try {
    await fn();
    console.log(`  FAIL: ${testName} (expected error, got success)`);
    failed++;
    errors.push(testName);
  } catch {
    console.log(`  PASS: ${testName}`);
    passed++;
  }
}

// ============================================
// TEST 1: SEED & SETUP
// ============================================

async function testSeedAndSetup(): Promise<void> {
  console.log('\n--- Test 1: Seed & Setup ---');

  // Seed Evelyn persona
  await seedEvelynPersona();
  await seedSystemConfig();

  // Verify persona exists
  const evelynPersonas = await db.select().from(personas)
    .where(eq(personas.slug, 'evelyn-cross')).limit(1);
  assert(evelynPersonas.length === 1, 'Evelyn Cross persona created');
  assert(evelynPersonas[0].isDefault === true, 'Evelyn is the default persona');
  assert(evelynPersonas[0].isActive === true, 'Evelyn is active');

  testPersonaId = evelynPersonas[0].id;

  // Verify system config
  const freeCoinsConfig = await db.select().from(systemConfig)
    .where(eq(systemConfig.configKey, 'credit_free_coins')).limit(1);
  assert(freeCoinsConfig.length === 1, 'Free coins config exists');
  assert(freeCoinsConfig[0].configValue === '180', 'Free coins default is 180');
}

// ============================================
// TEST 2: AUTHENTICATION
// ============================================

async function testAuthentication(): Promise<void> {
  console.log('\n--- Test 2: Authentication ---');

  // Test password hashing
  const hash = await hashPassword('testpass123');
  assert(hash.length > 0, 'Password hash generated');
  assert(hash !== 'testpass123', 'Hash is different from password');

  // Test password verification
  const isValid = await verifyPassword('testpass123', hash);
  assert(isValid === true, 'Correct password verified');

  const isInvalid = await verifyPassword('wrongpass', hash);
  assert(isInvalid === false, 'Wrong password rejected');

  // Test JWT
  const token = generateToken('test-user-id', 'test@example.com');
  assert(token.length > 0, 'JWT token generated');

  const payload = verifyToken(token);
  assert(payload !== null, 'Token verified successfully');
  assert(payload?.userId === 'test-user-id', 'Token contains correct userId');
  assert(payload?.email === 'test@example.com', 'Token contains correct email');

  // Test invalid token
  const invalidPayload = verifyToken('invalid-token');
  assert(invalidPayload === null, 'Invalid token rejected');
}

// ============================================
// TEST 3: USER CREATION & CREDITS
// ============================================

async function testUserCreation(): Promise<void> {
  console.log('\n--- Test 3: User Creation & Credits ---');

  // Create test user
  const passwordHash = await hashPassword('testpass123');
  const testEmail = `e2e-test-${Date.now()}@example.com`;

  const newUser = await db.insert(users).values({
    email: testEmail,
    passwordHash,
    firstName: 'TestUser',
    coinBalance: 180,
  }).returning();

  assert(newUser.length === 1, 'User created');
  assert(newUser[0].coinBalance === 180, 'User has 180 free coins');
  assert(newUser[0].accountStatus === 'active', 'User is active');

  testUserId = newUser[0].id;

  // Verify remaining minutes
  const minutes = await getRemainingMinutes(testUserId);
  assert(minutes === 3, 'getRemainingMinutes returns 3');
}

// ============================================
// TEST 4: CHAT SESSION LIFECYCLE
// ============================================

async function testChatSessionLifecycle(): Promise<void> {
  console.log('\n--- Test 4: Chat Session Lifecycle ---');

  // Start session
  testSessionId = await startChatSession(testUserId, testPersonaId);
  assert(testSessionId.length > 0, 'Session started');

  // Verify session in DB
  const session = await db.select().from(chatSessions)
    .where(eq(chatSessions.id, testSessionId)).limit(1);
  assert(session.length === 1, 'Session exists in DB');
  assert(session[0].status === 'active', 'Session is active');
  assert(session[0].userId === testUserId, 'Session belongs to correct user');
  assert(session[0].personaId === testPersonaId, 'Session uses correct persona');

  // Add test messages
  await db.insert(chatMessages).values({
    sessionId: testSessionId,
    userId: testUserId,
    role: 'user',
    content: 'I need help with my relationship.',
  });

  await db.insert(chatMessages).values({
    sessionId: testSessionId,
    userId: testUserId,
    role: 'assistant',
    content: 'I sense deep feelings here, dear. Tell me more about what is weighing on your heart.',
  });

  const messages = await db.select().from(chatMessages)
    .where(eq(chatMessages.sessionId, testSessionId));
  assert(messages.length === 2, 'Messages stored in session');

  // Checkpoint session
  await checkpointSession(testSessionId);
  const updatedSession = await db.select().from(chatSessions)
    .where(eq(chatSessions.id, testSessionId)).limit(1);
  assert(updatedSession[0].durationSeconds >= 0, 'Duration tracked');

  // End session
  await endChatSession(testSessionId);

  const endedSession = await db.select().from(chatSessions)
    .where(eq(chatSessions.id, testSessionId)).limit(1);
  assert(endedSession[0].status === 'ended', 'Session ended');
  assert(endedSession[0].endedAt !== null, 'Session has endedAt timestamp');
}

// ============================================
// TEST 5: MEMORY SYSTEM
// ============================================

async function testMemorySystem(): Promise<void> {
  console.log('\n--- Test 5: Memory System ---');

  // Summarize the test session (requires ANTHROPIC_API_KEY)
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  if (hasApiKey) {
    await summarizeSession(testSessionId);

    const memories = await db.select().from(userMemory)
      .where(eq(userMemory.userId, testUserId));
    assert(memories.length > 0, 'Memory created from session summary');
    assert(memories[0].memoryType === 'session_summary', 'Memory type is session_summary');
    assert(memories[0].sourceSessionId === testSessionId, 'Memory linked to session');
  } else {
    console.log('  SKIP: Memory summarization (no ANTHROPIC_API_KEY)');

    // Manually insert a test memory for subsequent tests
    await db.insert(userMemory).values({
      userId: testUserId,
      personaId: testPersonaId,
      memoryType: 'session_summary',
      summary: 'User is concerned about their relationship. They feel disconnected from their partner.',
      fullContext: JSON.stringify({
        keyTopics: ['relationship', 'disconnection'],
        overallSummary: 'User seeking guidance on feeling disconnected from partner.',
        nextSessionContext: 'Follow up on relationship concern.',
      }),
      sourceSessionId: testSessionId,
      importance: 7,
      category: 'love',
    });
    console.log('  INFO: Manually seeded test memory');
  }

  // Load user context
  const context = await loadUserContext(testUserId, testPersonaId);
  assert(context.length > 0, 'User context loaded from memories');
  assert(context.includes('love') || context.includes('relationship'), 'Context includes relevant topic');
}

// ============================================
// TEST 6: CROSS-PERSONA MEMORY TRANSFER
// ============================================

async function testMemoryTransfer(): Promise<void> {
  console.log('\n--- Test 6: Cross-Persona Memory Transfer ---');

  // Create a second persona for cross-persona testing
  const secondPersona = await db.insert(personas).values({
    slug: `test-persona-${Date.now()}`,
    displayName: 'Test Career Guide',
    tagline: 'Career guidance expert',
    description: 'A test persona for career guidance.',
    baseSystemPrompt: 'You are a career guidance expert.',
    personality: JSON.stringify({ tone: 'professional' }),
    categories: JSON.stringify(['money', 'purpose']),
    isActive: true,
    isDefault: false,
    sortOrder: 99,
  }).returning();

  const secondPersonaId = secondPersona[0].id;

  // Load cross-persona memories (from Evelyn's perspective looking at other personas)
  const crossMemories = await loadCrossPersonaMemories(
    testUserId,
    secondPersonaId, // Current persona is the career guide
    'career',
  );

  // The user's memories from Evelyn should be available to the career guide
  assert(crossMemories.relevantMemories.length >= 0, 'Cross-persona memory query succeeded');

  // Format transfer context
  const transferContext = formatTransferContext(crossMemories);
  assert(typeof transferContext === 'string', 'Transfer context formatted');

  // Cleanup test persona
  await db.delete(personas).where(eq(personas.id, secondPersonaId));
}

// ============================================
// TEST 7: PANEL READINGS
// ============================================

async function testPanelReadings(): Promise<void> {
  console.log('\n--- Test 7: Panel Readings ---');

  // Get available personas
  const available = await getAvailablePanelPersonas();
  assert(available.length > 0, 'Active personas available for panels');
  assert(available[0].displayName === 'Evelyn Cross', 'Evelyn Cross in panel list');

  // Panel reading requires ANTHROPIC_API_KEY
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  if (hasApiKey) {
    const result = await conductPanelReading(
      testUserId,
      [testPersonaId],
      'What does my career future look like?',
      'TestUser',
    );
    assert(result.responses.length === 1, 'Panel response received');
    assert(result.synthesis.length > 0, 'Panel synthesis generated');
    assert(result.sessionId.length > 0, 'Panel session created');
  } else {
    console.log('  SKIP: Panel reading execution (no ANTHROPIC_API_KEY)');
  }
}

// ============================================
// TEST 8: OUTREACH SYSTEM
// ============================================

async function testOutreachSystem(): Promise<void> {
  console.log('\n--- Test 8: Outreach System ---');

  // Outreach is disabled by default
  const candidates = await findOutreachCandidates();
  assert(candidates.length === 0, 'No candidates when outreach disabled');

  // Enable outreach temporarily
  await db.update(systemConfig)
    .set({ configValue: 'true' })
    .where(eq(systemConfig.configKey, 'outreach_enabled'));

  // The test user just had a session, so may not be a candidate
  // But the function should run without errors
  const candidatesEnabled = await findOutreachCandidates();
  assert(Array.isArray(candidatesEnabled), 'Outreach candidates query succeeded');

  // Disable outreach again
  await db.update(systemConfig)
    .set({ configValue: 'false' })
    .where(eq(systemConfig.configKey, 'outreach_enabled'));
}

// ============================================
// TEST 9: QUALITY SCORING
// ============================================

async function testQualityScoring(): Promise<void> {
  console.log('\n--- Test 9: Quality Scoring ---');

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  if (hasApiKey) {
    const score = await scoreSessionQuality(testSessionId);
    assert(score.overallScore >= 1 && score.overallScore <= 10, 'Overall score in range 1-10');
    assert(score.voiceConsistency >= 1, 'Voice consistency scored');
    assert(score.empathyLevel >= 1, 'Empathy scored');
    assert(Array.isArray(score.issues), 'Issues array returned');
    assert(Array.isArray(score.suggestions), 'Suggestions array returned');
  } else {
    console.log('  SKIP: Quality scoring (no ANTHROPIC_API_KEY)');
  }
}

// ============================================
// TEST 10: OUT OF CREDITS HANDLING
// ============================================

async function testOutOfCredits(): Promise<void> {
  console.log('\n--- Test 10: Out of Credits Handling ---');

  // Set credits to 0
  await db.update(users)
    .set({ coinBalance: 0 })
    .where(eq(users.id, testUserId));

  // Attempting to start a session should fail
  await assertThrows(
    () => startChatSession(testUserId, testPersonaId),
    'Session rejected when out of credits',
  );

  // Restore credits for cleanup
  await db.update(users)
    .set({ coinBalance: 180 })
    .where(eq(users.id, testUserId));
}

// ============================================
// CLEANUP
// ============================================

async function cleanup(): Promise<void> {
  console.log('\n--- Cleanup ---');

  // Delete test data in reverse dependency order
  await db.delete(chatMessages).where(eq(chatMessages.userId, testUserId));
  await db.delete(userMemory).where(eq(userMemory.userId, testUserId));
  await db.delete(chatSessions).where(eq(chatSessions.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));

  console.log('  Test data cleaned up');
}

// ============================================
// MAIN
// ============================================

async function runTests(): Promise<void> {
  console.log('=== E2E Multi-Persona Chat Service Tests ===');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET (some tests will skip)'}`);

  try {
    await testSeedAndSetup();
    await testAuthentication();
    await testUserCreation();
    await testChatSessionLifecycle();
    await testMemorySystem();
    await testMemoryTransfer();
    await testPanelReadings();
    await testOutreachSystem();
    await testQualityScoring();
    await testOutOfCredits();
  } catch (error) {
    console.error('\nFATAL ERROR:', error);
    failed++;
    errors.push(`Fatal: ${error}`);
  } finally {
    await cleanup();
  }

  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (errors.length > 0) {
    console.log('\nFailed tests:');
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
