// Chat Engine: Connects persona system, memory, credit tracking,
// universal safety, and persona intent into a unified chat flow.

import { db } from './db';
import {
  users,
  personas,
  personaPrompts,
  chatSessions,
  chatMessages,
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { loadUserContext, summarizeSession } from './memoryManager';
import { loadCrossPersonaMemories, formatTransferContext } from './memoryTransfer';
import { startChatSession, endChatSession, checkpointSession } from './creditTracking';
import { checkAndLogSafety } from './universalSafety';
import {
  loadPersonaIntentConfig,
  detectIntent,
  getConversationState,
  initConversationState,
  updateConversationState,
  validateResponse,
  buildIntentContext,
} from './personaIntent';
import { getModelForOperation } from './modelConfig';
import logger from './logger';
import { fireWithBreaker, anthropicBreaker, isCircuitOpenError } from './circuitBreaker';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface ChatResponse {
  sessionId: string;
  message: string;
  topic: string | null;
  creditsRemaining: number;
  sessionActive: boolean;
  blocked?: boolean; // true when safety check intercepted the message
  tarotDraw?: boolean; // true when Marcus wants the user to draw a card
}

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

interface PersonaConfig {
  id: string;
  displayName: string;
  baseSystemPrompt: string;
  personality: string | null;
}

/**
 * Load the persona configuration for a chat session.
 */
async function loadPersonaConfig(personaId: string): Promise<PersonaConfig | null> {
  const persona = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.isActive, true)))
    .limit(1);

  if (!persona[0]) return null;

  return {
    id: persona[0].id,
    displayName: persona[0].displayName,
    baseSystemPrompt: persona[0].baseSystemPrompt,
    personality: persona[0].personality,
  };
}

/**
 * Build the full context for a chat message, including:
 * - Persona system prompt
 * - User's memory/history
 * - Cross-persona context
 * - Recent messages in current session
 */
interface MessageContext {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

async function buildMessageContext(
  personaConfig: PersonaConfig,
  userId: string,
  sessionId: string,
  currentTopic?: string,
  intentContext?: string,
): Promise<MessageContext> {
  const memoryContext = await loadUserContext(userId, personaConfig.id);

  // Cross-persona memory sharing is intentionally disabled.
  // Each guide maintains their own independent relationship with the user.
  const transferContext = '';

  const recentMessages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.sentAt)
    .limit(20);

  // Inject interactive tarot draw instruction for tarot-capable personas
  const isTarotPersona = personaConfig.baseSystemPrompt.toLowerCase().includes('tarot');
  const tarotInstruction = isTarotPersona
    ? `## INTERACTIVE TAROT CARD DRAWS — CRITICAL INSTRUCTIONS\nWhen you want to do a card draw, you MUST output the token [TAROT_DRAW] as the very last thing in your message, on its own line. Do NOT say "let me pull cards", "let me draw a card", or describe pulling cards in words — that does nothing. The ONLY way to trigger the card picker is to literally output [TAROT_DRAW] at the end of your message.\n\nExample of correct usage:\n"Something is shifting for you right now. Let's see what the cards reveal.\n[TAROT_DRAW]"\n\nAfter the user draws a card, interpret that specific card in the context of their situation. You may trigger [TAROT_DRAW] multiple times per session at natural turning points.`
    : '';

  const system = [
    personaConfig.baseSystemPrompt,
    memoryContext ? `## Known Context About This Client\n${memoryContext}` : '',
    transferContext,
    intentContext ?? '',
    tarotInstruction,
  ].filter(Boolean).join('\n\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of recentMessages) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  return { system, messages };
}

/**
 * Start a new chat session.
 */
/**
 * Generate a personalized greeting for a user+persona pair without creating a session.
 * Used by the free greeting endpoint so users don't get charged just for landing on chat.
 */
export async function generateGreeting(config: {
  userId: string;
  personaId: string;
}): Promise<{ greeting: string; personaName: string }> {
  const user = await db.select().from(users).where(eq(users.id, config.userId)).limit(1);
  if (!user[0]) throw new Error('USER_NOT_FOUND');

  const personaConfig = await loadPersonaConfig(config.personaId);
  if (!personaConfig) throw new Error('PERSONA_NOT_FOUND');

  const memoryContext = await loadUserContext(config.userId, config.personaId);
  const isReturning = memoryContext.length > 0;

  // Build the greeting prompt.
  // IMPORTANT: Do NOT include the base system prompt here — it contains
  // Barnum statement techniques ("There's a decision you've been avoiding")
  // that cause Claude to fabricate specific-sounding fake past topics when
  // asked to "reference something from their previous session."
  const personaVoice = `You are ${personaConfig.displayName}, a warm and grounded spiritual guide. Speak naturally in 1-3 short sentences.`;

  const greetingPrompt = isReturning
    ? `${personaVoice}

Generate a warm, personal welcome-back greeting for ${user[0].firstName}.

STRICT RULES:
- Do NOT reference any specific topic, person, or situation from their past — not even indirectly. The right moment for that is later in the conversation, once they've settled in.
- Simply acknowledge it's good to see them again and invite them to share what's on their heart today.
- Sound like a real person who is genuinely happy they came back — warm but unhurried.
- Keep it to 1-2 sentences maximum.

Return JSON: {"message": "your greeting"}`
    : `${personaVoice}

Generate a warm greeting for a new client named ${user[0].firstName}. Welcome them and ask what brought them here today. Keep it to 1-2 sentences.

Return JSON: {"message": "your greeting"}`;

  let greeting: string;
  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: getModelForOperation('greeting'),
        max_tokens: 200,
        messages: [{ role: 'user', content: greetingPrompt }],
      }),
    );
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    greeting = jsonMatch ? (JSON.parse(jsonMatch[0]).message || text) : text.trim();
  } catch (error) {
    if (isCircuitOpenError(error)) {
      logger.warn('Anthropic circuit open, using fallback greeting', { userId: config.userId });
    } else {
      logger.error('Failed to generate greeting', { error: (error as Error).message });
    }
    greeting = isReturning
      ? `${user[0].firstName}, it's so good to see you again. What's on your heart today?`
      : `Hello, ${user[0].firstName}. I'm ${personaConfig.displayName}. What brings you to me today?`;
  }

  return { greeting, personaName: personaConfig.displayName };
}

export async function initSession(config: {
  userId: string;
  personaId: string;
  /** Pre-generated greeting from the free /greeting endpoint — stored for conversation continuity */
  priorGreeting?: string;
}): Promise<{
  sessionId: string;
  personaName: string;
  greeting: string;
  creditsRemaining: number;
}> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, config.userId))
    .limit(1);

  if (!user[0]) throw new Error('USER_NOT_FOUND');
  if (user[0].coinBalance <= 0) throw new Error('OUT_OF_CREDITS');

  const personaConfig = await loadPersonaConfig(config.personaId);
  if (!personaConfig) throw new Error('PERSONA_NOT_FOUND');

  const sessionId = await startChatSession(config.userId, config.personaId);

  // Initialize conversation state for intent tracking
  const memoryContext = await loadUserContext(config.userId, config.personaId);
  const isReturning = memoryContext.length > 0;

  const intentConfig = await loadPersonaIntentConfig(config.personaId);
  await initConversationState(sessionId, config.personaId, config.userId, intentConfig, isReturning);

  // Use pre-generated greeting if provided, otherwise generate one
  let greeting: string;
  if (config.priorGreeting) {
    greeting = config.priorGreeting;
  } else {
    const generated = await generateGreeting({ userId: config.userId, personaId: config.personaId });
    greeting = generated.greeting;
  }

  await db.insert(chatMessages).values({
    sessionId,
    userId: config.userId,
    role: 'assistant',
    content: greeting,
  });

  return {
    sessionId,
    personaName: personaConfig.displayName,
    greeting,
    creditsRemaining: user[0].coinBalance,
  };
}

/**
 * Send a message in an active chat session and get a response.
 *
 * Flow:
 * 1. Validate session
 * 2. Universal safety check (crisis, inappropriate, injection, harassment, gibberish)
 * 3. Credit check (after safety so crisis messages always get a response)
 * 4. Load persona intent config & conversation state
 * 5. Detect intent from user message
 * 6. Update conversation state (bucket, engagement, history)
 * 7. Build enhanced context with intent guidance
 * 8. Call Claude API
 * 9. Validate response against character rules
 * 10. Persist and return
 */
export async function sendMessage(
  sessionId: string,
  userId: string,
  userMessage: string,
  requestContext?: RequestContext,
): Promise<ChatResponse> {
  const session = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);

  if (!session[0]) throw new Error('SESSION_NOT_FOUND');
  if (session[0].status !== 'active') throw new Error('SESSION_ENDED');

  // ── Step 1: Universal safety check (BEFORE credit check -- crisis messages ──
  //    must always get a response even if user is out of credits)
  const safetyResult = await checkAndLogSafety(userMessage, {
    sessionId,
    userId,
    personaId: session[0].personaId,
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  });

  if (!safetyResult.safe && safetyResult.response) {
    // Store both the user message and the safety response
    await db.insert(chatMessages).values({
      sessionId,
      userId,
      role: 'user',
      content: userMessage,
    });
    await db.insert(chatMessages).values({
      sessionId,
      userId,
      role: 'assistant',
      content: safetyResult.response,
    });

    const blockedUser = await db
      .select({ coinBalance: users.coinBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      sessionId,
      message: safetyResult.response,
      topic: null,
      creditsRemaining: blockedUser[0]?.coinBalance || 0,
      sessionActive: true,
      blocked: true,
    };
  }

  // ── Step 2: Credit check (after safety, so crisis messages always get a response) ──
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0] || user[0].coinBalance <= 0) {
    await endChatSession(sessionId);
    throw new Error('OUT_OF_CREDITS');
  }

  const personaConfig = await loadPersonaConfig(session[0].personaId);
  if (!personaConfig) throw new Error('PERSONA_NOT_FOUND');

  // ── Step 3: Load intent config & conversation state ──
  const intentConfig = await loadPersonaIntentConfig(session[0].personaId);

  let convState = await getConversationState(sessionId);
  if (!convState) {
    // Check if user has previous memory to determine if they're returning
    const memoryContext = await loadUserContext(userId, session[0].personaId);
    const isReturning = memoryContext.length > 0;

    convState = await initConversationState(
      sessionId,
      session[0].personaId,
      userId,
      intentConfig,
      isReturning,
    );
  }

  // ── Step 4: Detect intent ──
  const intentResult = detectIntent(
    userMessage,
    intentConfig,
    convState.currentBucket,
  );

  // ── Step 5: Update conversation state ──
  convState = await updateConversationState(convState, intentResult, intentConfig);

  // ── Step 6: Build intent context for Claude ──
  const intentCtx = buildIntentContext(intentResult, convState, intentConfig);

  const now = new Date();
  await db.insert(chatMessages).values({
    sessionId,
    userId,
    role: 'user',
    content: userMessage,
  });

  // Record actual user activity so idle-timeout logic can distinguish
  // real usage from sessions left open with no messages.
  await db.update(chatSessions)
    .set({ lastMessageAt: now })
    .where(eq(chatSessions.id, sessionId));

  await checkpointSession(sessionId);

  const { system, messages: messageHistory } = await buildMessageContext(
    personaConfig,
    userId,
    sessionId,
    session[0].lastTopic || undefined,
    intentCtx,
  );

  messageHistory.push({ role: 'user', content: userMessage });

  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: getModelForOperation('conversation'),
        max_tokens: 1000,
        system,
        messages: messageHistory,
      }),
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let assistantMessage: string;
    let topic: string | null = null;
    let tarotDraw = false;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        assistantMessage = parsed.message || text;
        topic = parsed.topic || null;
      } else {
        assistantMessage = text.trim();
      }
    } catch {
      assistantMessage = text.trim();
    }

    // Detect and strip [TAROT_DRAW] marker
    if (assistantMessage.includes('[TAROT_DRAW]')) {
      tarotDraw = true;
      assistantMessage = assistantMessage.replace(/\[TAROT_DRAW\]/g, '').trim();
    }

    // ── Step 8: Validate response against character rules ──
    const violations = validateResponse(assistantMessage, intentConfig.characterRules);
    if (violations.length > 0) {
      logger.warn('Character rule violations detected', { sessionId, violations });
      // Log but don't block -- the response is still delivered.
      // A future enhancement could retry with stricter instructions.
    }

    await db.insert(chatMessages).values({
      sessionId,
      userId,
      role: 'assistant',
      content: assistantMessage,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    });

    // Update session topic and bucket from intent state
    const bucketForSession = convState.currentBucket || topic;
    if (topic || bucketForSession) {
      await db.update(chatSessions)
        .set({
          lastTopic: topic || session[0].lastTopic,
          lastBucket: bucketForSession || session[0].lastBucket,
          updatedAt: new Date(),
        })
        .where(eq(chatSessions.id, sessionId));
    }

    const updatedUser = await db
      .select({ coinBalance: users.coinBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      sessionId,
      message: assistantMessage,
      topic,
      creditsRemaining: updatedUser[0]?.coinBalance || 0,
      sessionActive: true,
      tarotDraw,
    };
  } catch (error) {
    if (isCircuitOpenError(error)) {
      logger.warn('Anthropic circuit open, using fallback response', { sessionId, userId });
    } else {
      logger.error('Chat engine error', { error: (error as Error).message, sessionId, userId });
    }

    const fallback = 'The energy is shifting... give me a moment to refocus.';
    await db.insert(chatMessages).values({
      sessionId,
      userId,
      role: 'assistant',
      content: fallback,
    });

    return {
      sessionId,
      message: fallback,
      topic: null,
      creditsRemaining: user[0].coinBalance,
      sessionActive: true,
    };
  }
}

/**
 * End a chat session, finalize credits, and trigger memory summarization.
 */
export async function closeSession(
  sessionId: string,
  userId: string,
): Promise<{ coinsUsed: number; creditsRemaining: number }> {
  await endChatSession(sessionId);

  summarizeSession(sessionId).catch((err) =>
    logger.error('Memory summarization failed', { sessionId, error: (err as Error).message })
  );

  const session = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  const user = await db
    .select({ coinBalance: users.coinBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    coinsUsed: session[0]?.coinsCharged || 0,
    creditsRemaining: user[0]?.coinBalance || 0,
  };
}

/**
 * Get session history for a user.
 */
export async function getUserSessions(
  userId: string,
  limit: number = 20,
): Promise<Array<{
  id: string;
  personaName: string;
  startedAt: Date;
  endedAt: Date | null;
  coinsCharged: number;
  lastTopic: string | null;
  status: string;
}>> {
  const sessions = await db
    .select({
      id: chatSessions.id,
      personaId: chatSessions.personaId,
      startedAt: chatSessions.startedAt,
      endedAt: chatSessions.endedAt,
      coinsCharged: chatSessions.coinsCharged,
      lastTopic: chatSessions.lastTopic,
      status: chatSessions.status,
    })
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.createdAt))
    .limit(limit);

  const result = [];
  for (const session of sessions) {
    const persona = await db
      .select({ displayName: personas.displayName })
      .from(personas)
      .where(eq(personas.id, session.personaId))
      .limit(1);

    result.push({
      id: session.id,
      personaName: persona[0]?.displayName || 'Unknown',
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      coinsCharged: session.coinsCharged,
      lastTopic: session.lastTopic,
      status: session.status,
    });
  }

  return result;
}
