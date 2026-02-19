// Persona Intent Framework
// Detects user intent from messages using per-persona configurations,
// manages conversation state (buckets, transitions, engagement), and
// provides context for the chat engine to guide Claude responses.

import { db } from './db';
import { personaIntentConfigs, conversationStates } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import logger from './logger';

// ============================================================
// Interfaces
// ============================================================

export interface ConversationBucket {
  name: string;
  order: number;
  typicalDuration: number; // expected turns in this bucket
  nextBucket?: string;
}

export interface Intent {
  name: string;
  patterns: string[];      // keywords/phrases to match
  bucket?: string;         // which bucket this applies to ("any" for all)
  responseGuidance: string;
  priority?: number;       // higher = more important (default 1)
}

export interface CharacterRules {
  forbiddenPhrases: string[];
  requiredElements: string[];
  maxWordsPerMessage: number;
  speakingStyle: string;
}

export interface PersonaIntentConfig {
  id: string;
  personaId: string;
  specialty: string;
  conversationBuckets: ConversationBucket[];
  intents: Intent[];
  characterRules: CharacterRules;
  version: number;
  isActive: boolean;
}

export interface ConversationState {
  id: string;
  sessionId: string;
  personaId: string;
  userId: string;
  currentBucket: string | null;
  turnCount: number;
  detectedIntents: DetectedIntentRecord[];
  userEngagement: 'high' | 'medium' | 'low';
  lastIntentConfidence: number;
  bucketTransitions: BucketTransition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DetectedIntentRecord {
  intentName: string;
  confidence: number;
  turn: number;
  timestamp: string;
}

export interface BucketTransition {
  from: string | null;
  to: string;
  turn: number;
  timestamp: string;
}

export interface IntentResult {
  intent: string;
  confidence: number;
  bucket: string | undefined;
  responseGuidance: string;
  allMatches: Array<{ intent: string; confidence: number }>;
}

// ============================================================
// Default Fallback Config
// ============================================================

const DEFAULT_CHARACTER_RULES: CharacterRules = {
  forbiddenPhrases: ['As an AI', "I'm programmed", 'I cannot', 'language model'],
  requiredElements: ['warm', 'insightful'],
  maxWordsPerMessage: 200,
  speakingStyle: 'Warm and conversational.',
};

const DEFAULT_BUCKETS: ConversationBucket[] = [
  { name: 'opening', order: 1, typicalDuration: 2, nextBucket: 'exploration' },
  { name: 'exploration', order: 2, typicalDuration: 4, nextBucket: 'guidance' },
  { name: 'guidance', order: 3, typicalDuration: 3, nextBucket: 'closing' },
  { name: 'closing', order: 4, typicalDuration: 2 },
];

const DEFAULT_INTENTS: Intent[] = [
  {
    name: 'greeting',
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
    bucket: 'opening',
    responseGuidance: 'Welcome the user warmly and ask what brings them here.',
    priority: 1,
  },
  {
    name: 'wants_guidance',
    patterns: ['help me', 'guide me', 'what should i do', 'advice', 'guidance'],
    bucket: 'exploration',
    responseGuidance: 'Ask clarifying questions to understand their situation better.',
    priority: 2,
  },
  {
    name: 'skeptical',
    patterns: ["don't believe", 'is this real', 'prove it', 'fake', 'scam'],
    bucket: 'any',
    responseGuidance: 'Acknowledge skepticism gently. Offer a small demonstration. Focus on what resonates.',
    priority: 3,
  },
  {
    name: 'positive',
    patterns: ['yes', 'sure', 'okay', "let's do it", "i'm ready", 'absolutely'],
    bucket: 'any',
    responseGuidance: 'Affirm their readiness and proceed with the conversation flow.',
    priority: 1,
  },
];

const DEFAULT_CONFIG: Omit<PersonaIntentConfig, 'id' | 'personaId'> = {
  specialty: 'general',
  conversationBuckets: DEFAULT_BUCKETS,
  intents: DEFAULT_INTENTS,
  characterRules: DEFAULT_CHARACTER_RULES,
  version: 1,
  isActive: true,
};

// ============================================================
// In-memory config cache (avoids repeated DB reads)
// ============================================================

const configCache = new Map<string, { config: PersonaIntentConfig; loadedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function clearConfigCache(personaId?: string): void {
  if (personaId) {
    configCache.delete(personaId);
  } else {
    configCache.clear();
  }
}

// ============================================================
// Load Persona Intent Config
// ============================================================

/**
 * Load the active intent configuration for a persona.
 * Falls back to a sensible default if none is found in the database.
 */
export async function loadPersonaIntentConfig(
  personaId: string,
): Promise<PersonaIntentConfig> {
  // Check cache first
  const cached = configCache.get(personaId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.config;
  }

  try {
    // Query the persona_intent_configs table for the active config
    const rows = await db
      .select({
        id: personaIntentConfigs.id,
        persona_id: personaIntentConfigs.personaId,
        specialty: personaIntentConfigs.specialty,
        conversation_buckets: personaIntentConfigs.conversationBuckets,
        intents: personaIntentConfigs.intents,
        character_rules: personaIntentConfigs.characterRules,
        version: personaIntentConfigs.version,
        is_active: personaIntentConfigs.isActive,
      })
      .from(personaIntentConfigs)
      .where(
        and(
          eq(personaIntentConfigs.personaId, personaId),
          eq(personaIntentConfigs.isActive, true)
        )
      )
      .orderBy(desc(personaIntentConfigs.version))
      .limit(1);

    const row = rows[0];

    if (row) {
      const config: PersonaIntentConfig = {
        id: row.id,
        personaId: row.persona_id,
        specialty: row.specialty,
        conversationBuckets: JSON.parse(row.conversation_buckets),
        intents: JSON.parse(row.intents),
        characterRules: JSON.parse(row.character_rules),
        version: row.version,
        isActive: row.is_active,
      };
      configCache.set(personaId, { config, loadedAt: Date.now() });
      return config;
    }
  } catch (error) {
    logger.warn('Could not load intent config, using defaults', { personaId, error: (error as Error).message });
  }

  // Return default config when DB table doesn't exist yet or no config found
  const fallback: PersonaIntentConfig = {
    id: 'default',
    personaId,
    ...DEFAULT_CONFIG,
  };
  configCache.set(personaId, { config: fallback, loadedAt: Date.now() });
  return fallback;
}

// ============================================================
// Intent Detection
// ============================================================

/**
 * Detect the most likely user intent from a message, using the persona's
 * configured intent patterns.
 *
 * Scoring algorithm:
 *   base score = (matched keywords / total keywords in pattern) * 100
 *   + bucket boost (+15) if intent's bucket matches currentBucket
 *   + priority bonus (priority * 5)
 *
 * Returns the highest-scoring intent, or a fallback "unknown" intent.
 */
export function detectIntent(
  message: string,
  config: PersonaIntentConfig,
  currentBucket?: string | null,
): IntentResult {
  const lower = message.toLowerCase().trim();

  if (!lower) {
    return {
      intent: 'unknown',
      confidence: 0,
      bucket: undefined,
      responseGuidance: '',
      allMatches: [],
    };
  }

  const scored: Array<{
    intent: Intent;
    confidence: number;
  }> = [];

  for (const intentDef of config.intents) {
    const matchCount = countPatternMatches(lower, intentDef.patterns);

    if (matchCount === 0) continue;

    // Base confidence: proportion of patterns matched, scaled 0-1
    let confidence = matchCount / intentDef.patterns.length;

    // Bucket-aware boosting: intents whose bucket matches the current bucket
    // get a significant boost so the conversation flows naturally
    if (
      currentBucket &&
      intentDef.bucket &&
      intentDef.bucket !== 'any' &&
      intentDef.bucket === currentBucket
    ) {
      confidence += 0.15;
    }

    // Priority bonus: higher-priority intents get a small edge
    const priority = intentDef.priority ?? 1;
    confidence += priority * 0.05;

    // Clamp to [0, 1]
    confidence = Math.min(1, Math.max(0, confidence));

    scored.push({ intent: intentDef, confidence });
  }

  if (scored.length === 0) {
    return {
      intent: 'unknown',
      confidence: 0,
      bucket: undefined,
      responseGuidance: '',
      allMatches: [],
    };
  }

  // Sort descending by confidence, then by priority
  scored.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (b.intent.priority ?? 1) - (a.intent.priority ?? 1);
  });

  const best = scored[0];

  return {
    intent: best.intent.name,
    confidence: Math.round(best.confidence * 100) / 100,
    bucket: best.intent.bucket,
    responseGuidance: best.intent.responseGuidance,
    allMatches: scored.map((s) => ({
      intent: s.intent.name,
      confidence: Math.round(s.confidence * 100) / 100,
    })),
  };
}

/**
 * Count how many patterns from the list appear in the message.
 * Patterns are treated as literal substrings (case-insensitive).
 */
function countPatternMatches(lowerMessage: string, patterns: string[]): number {
  let count = 0;
  for (const pattern of patterns) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      count++;
    }
  }
  return count;
}

// ============================================================
// Conversation State Management
// ============================================================

/**
 * Retrieve the conversation state for a given session.
 * Returns null if no state exists yet.
 */
export async function getConversationState(
  sessionId: string,
): Promise<ConversationState | null> {
  try {
    const rows = await db
      .select()
      .from(conversationStates)
      .where(eq(conversationStates.sessionId, sessionId))
      .limit(1);

    const row = rows[0];

    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.sessionId,
      personaId: row.personaId,
      userId: row.userId,
      currentBucket: row.currentBucket,
      turnCount: row.turnCount,
      detectedIntents: row.detectedIntents ? JSON.parse(row.detectedIntents) : [],
      userEngagement: row.userEngagement as 'high' | 'medium' | 'low',
      lastIntentConfidence: row.lastIntentConfidence,
      bucketTransitions: row.bucketTransitions ? JSON.parse(row.bucketTransitions) : [],
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  } catch (error) {
    logger.warn('Could not get conversation state', { sessionId, error: (error as Error).message });
    return null;
  }
}

/**
 * Initialize a new conversation state for a session.
 * Sets the current bucket based on whether the user is returning:
 * - New users: Start at "opening" (first bucket)
 * - Returning users: Start at "exploration" (second bucket, or first if no exploration exists)
 */
export async function initConversationState(
  sessionId: string,
  personaId: string,
  userId: string,
  config: PersonaIntentConfig,
  isReturning: boolean = false,
): Promise<ConversationState> {
  const sortedBuckets = [...config.conversationBuckets].sort(
    (a, b) => a.order - b.order,
  );

  // For returning users, start at "exploration" bucket (or second bucket if exploration doesn't exist)
  // This gives them the choice to continue previous topic or discuss something new
  let firstBucket: string | null;
  if (isReturning) {
    const explorationBucket = sortedBuckets.find(b => b.name === 'exploration');
    firstBucket = explorationBucket?.name ?? sortedBuckets[1]?.name ?? sortedBuckets[0]?.name ?? null;
  } else {
    firstBucket = sortedBuckets[0]?.name ?? null;
  }

  const now = new Date();
  const initialTransitions: BucketTransition[] = firstBucket
    ? [{ from: null, to: firstBucket, turn: 0, timestamp: now.toISOString() }]
    : [];

  try{
    const rows = await db
      .insert(conversationStates)
      .values({
        sessionId,
        personaId,
        userId,
        currentBucket: firstBucket,
        turnCount: 0,
        detectedIntents: JSON.stringify([]),
        userEngagement: 'medium',
        lastIntentConfidence: 0.5,
        bucketTransitions: JSON.stringify(initialTransitions),
      })
      .returning({ id: conversationStates.id });

    const row = rows[0];

    return {
      id: row?.id ?? 'temp',
      sessionId,
      personaId,
      userId,
      currentBucket: firstBucket,
      turnCount: 0,
      detectedIntents: [],
      userEngagement: 'medium',
      lastIntentConfidence: 0.5,
      bucketTransitions: initialTransitions,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    logger.warn('Could not init conversation state', { sessionId, error: (error as Error).message });

    // Return an in-memory fallback so the chat engine can continue
    return {
      id: 'in-memory',
      sessionId,
      personaId,
      userId,
      currentBucket: firstBucket,
      turnCount: 0,
      detectedIntents: [],
      userEngagement: 'medium',
      lastIntentConfidence: 0.5,
      bucketTransitions: initialTransitions,
      createdAt: now,
      updatedAt: now,
    };
  }
}

/**
 * Update conversation state after a user message has been processed.
 * Handles:
 *   - Incrementing turn count
 *   - Recording detected intent
 *   - Automatic bucket progression
 *   - Engagement level estimation
 */
export async function updateConversationState(
  state: ConversationState,
  intentResult: IntentResult,
  config: PersonaIntentConfig,
): Promise<ConversationState> {
  const newTurnCount = state.turnCount + 1;

  // Record this intent
  const intentRecord: DetectedIntentRecord = {
    intentName: intentResult.intent,
    confidence: intentResult.confidence,
    turn: newTurnCount,
    timestamp: new Date().toISOString(),
  };
  const updatedIntents = [...state.detectedIntents, intentRecord];

  // Determine whether we should transition to the next bucket
  const { newBucket, transition } = evaluateBucketTransition(
    state,
    intentResult,
    config,
    newTurnCount,
  );

  const updatedTransitions = transition
    ? [...state.bucketTransitions, transition]
    : state.bucketTransitions;

  // Estimate engagement level from recent intents
  const engagement = estimateEngagement(updatedIntents);

  const updated: ConversationState = {
    ...state,
    turnCount: newTurnCount,
    currentBucket: newBucket,
    detectedIntents: updatedIntents,
    userEngagement: engagement,
    lastIntentConfidence: intentResult.confidence,
    bucketTransitions: updatedTransitions,
    updatedAt: new Date(),
  };

  // Persist to DB
  try {
    await db
      .update(conversationStates)
      .set({
        currentBucket: updated.currentBucket,
        turnCount: updated.turnCount,
        detectedIntents: JSON.stringify(updated.detectedIntents),
        userEngagement: updated.userEngagement,
        lastIntentConfidence: updated.lastIntentConfidence,
        bucketTransitions: JSON.stringify(updated.bucketTransitions),
        updatedAt: sql`NOW()`,
      })
      .where(eq(conversationStates.sessionId, updated.sessionId));
  } catch (error) {
    logger.warn('Could not persist conversation state', { sessionId: state.sessionId, error: (error as Error).message });
  }

  return updated;
}

// ============================================================
// Bucket Transition Logic
// ============================================================

/**
 * Determine whether the conversation should progress to the next bucket.
 * Transitions happen when:
 *   1. Turn count in current bucket >= typicalDuration, OR
 *   2. Detected intent explicitly belongs to a different bucket
 */
function evaluateBucketTransition(
  state: ConversationState,
  intentResult: IntentResult,
  config: PersonaIntentConfig,
  newTurnCount: number,
): { newBucket: string | null; transition: BucketTransition | null } {
  const currentBucket = state.currentBucket;
  if (!currentBucket) {
    return { newBucket: null, transition: null };
  }

  const bucketDef = config.conversationBuckets.find(
    (b) => b.name === currentBucket,
  );

  if (!bucketDef) {
    return { newBucket: currentBucket, transition: null };
  }

  // Count turns spent in the current bucket
  const lastTransitionTurn =
    state.bucketTransitions.length > 0
      ? state.bucketTransitions[state.bucketTransitions.length - 1].turn
      : 0;
  const turnsInCurrentBucket = newTurnCount - lastTransitionTurn;

  // Case 1: Intent explicitly targets a different, later bucket
  if (
    intentResult.bucket &&
    intentResult.bucket !== 'any' &&
    intentResult.bucket !== currentBucket &&
    intentResult.confidence >= 0.3
  ) {
    const targetBucketDef = config.conversationBuckets.find(
      (b) => b.name === intentResult.bucket,
    );
    // Only advance forward, not backward
    if (targetBucketDef && targetBucketDef.order > bucketDef.order) {
      const transition: BucketTransition = {
        from: currentBucket,
        to: intentResult.bucket,
        turn: newTurnCount,
        timestamp: new Date().toISOString(),
      };
      return { newBucket: intentResult.bucket, transition };
    }
  }

  // Case 2: Spent enough turns in the current bucket, auto-advance
  if (turnsInCurrentBucket >= bucketDef.typicalDuration && bucketDef.nextBucket) {
    const nextExists = config.conversationBuckets.find(
      (b) => b.name === bucketDef.nextBucket,
    );
    if (nextExists) {
      const transition: BucketTransition = {
        from: currentBucket,
        to: bucketDef.nextBucket,
        turn: newTurnCount,
        timestamp: new Date().toISOString(),
      };
      return { newBucket: bucketDef.nextBucket, transition };
    }
  }

  return { newBucket: currentBucket, transition: null };
}

// ============================================================
// Engagement Estimation
// ============================================================

/**
 * Estimate user engagement level from recent intents.
 * High: strong intent signals, many recognized intents
 * Low: mostly unknown intents, low confidence
 * Medium: everything in between
 */
function estimateEngagement(
  intents: DetectedIntentRecord[],
): 'high' | 'medium' | 'low' {
  // Look at the last 5 intents
  const recent = intents.slice(-5);
  if (recent.length === 0) return 'medium';

  const avgConfidence =
    recent.reduce((sum, i) => sum + i.confidence, 0) / recent.length;
  const unknownRatio =
    recent.filter((i) => i.intentName === 'unknown').length / recent.length;

  if (avgConfidence >= 0.5 && unknownRatio <= 0.2) return 'high';
  if (avgConfidence < 0.25 || unknownRatio >= 0.6) return 'low';
  return 'medium';
}

// ============================================================
// Character Rule Validation
// ============================================================

/**
 * Validate an assistant response against the persona's character rules.
 * Returns a list of violations (empty array = valid).
 */
export function validateResponse(
  response: string,
  rules: CharacterRules,
): string[] {
  const violations: string[] = [];

  // Check forbidden phrases
  const lowerResponse = response.toLowerCase();
  for (const phrase of rules.forbiddenPhrases) {
    if (lowerResponse.includes(phrase.toLowerCase())) {
      violations.push(`Contains forbidden phrase: "${phrase}"`);
    }
  }

  // Check word count
  const wordCount = response.split(/\s+/).filter(Boolean).length;
  if (wordCount > rules.maxWordsPerMessage) {
    violations.push(
      `Response too long: ${wordCount} words (max ${rules.maxWordsPerMessage})`,
    );
  }

  return violations;
}

// ============================================================
// Context Builder (for Claude system prompt enrichment)
// ============================================================

/**
 * Build an intent context string to inject into the Claude system prompt.
 * Gives Claude information about detected intent, current conversation
 * stage, and response guidance.
 */
export function buildIntentContext(
  intentResult: IntentResult,
  state: ConversationState,
  config: PersonaIntentConfig,
): string {
  const parts: string[] = [];

  parts.push(`## Conversation Intent Context`);
  parts.push(`Turn: ${state.turnCount + 1}`);
  parts.push(`Current stage: ${state.currentBucket ?? 'unknown'}`);
  parts.push(`User engagement: ${state.userEngagement}`);

  if (intentResult.intent !== 'unknown') {
    parts.push(`Detected intent: ${intentResult.intent} (confidence: ${intentResult.confidence})`);
    if (intentResult.responseGuidance) {
      parts.push(`Guidance: ${intentResult.responseGuidance}`);
    }
  }

  // Add character rules reminder
  if (config.characterRules.speakingStyle) {
    parts.push(`\nSpeaking style: ${config.characterRules.speakingStyle}`);
  }
  if (config.characterRules.maxWordsPerMessage) {
    parts.push(`Keep response under ${config.characterRules.maxWordsPerMessage} words.`);
  }
  if (config.characterRules.forbiddenPhrases.length > 0) {
    parts.push(
      `Never use these phrases: ${config.characterRules.forbiddenPhrases.join(', ')}`,
    );
  }

  return parts.join('\n');
}

// ============================================================
// Exports for testing / cache management
// ============================================================

export { clearConfigCache, countPatternMatches, estimateEngagement, evaluateBucketTransition };
export { DEFAULT_CONFIG, DEFAULT_BUCKETS, DEFAULT_INTENTS, DEFAULT_CHARACTER_RULES };
