// Chat Engine: Connects persona system, memory, and credit tracking
// into a unified chat flow for the ongoing chat service.

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
async function buildMessageContext(
  personaConfig: PersonaConfig,
  userId: string,
  sessionId: string,
  currentTopic?: string,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const memoryContext = await loadUserContext(userId, personaConfig.id);

  const crossPersonaContext = await loadCrossPersonaMemories(
    userId,
    personaConfig.id,
    currentTopic,
  );
  const transferContext = formatTransferContext(crossPersonaContext);

  const recentMessages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.sentAt)
    .limit(20);

  const systemContext = `${personaConfig.baseSystemPrompt}

${memoryContext ? `## Known Context About This Client\n${memoryContext}` : ''}
${transferContext}`;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: systemContext },
    { role: 'assistant', content: `I understand my role as ${personaConfig.displayName}. I'm ready to help this client.` },
  ];

  for (const msg of recentMessages) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  return messages;
}

/**
 * Start a new chat session.
 */
export async function initSession(config: {
  userId: string;
  personaId: string;
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
  if (user[0].creditMinutes <= 0) throw new Error('OUT_OF_CREDITS');

  const personaConfig = await loadPersonaConfig(config.personaId);
  if (!personaConfig) throw new Error('PERSONA_NOT_FOUND');

  // Start credit tracking session (actual schema requires personaId)
  const sessionId = await startChatSession(config.userId, config.personaId);

  // Generate personalized greeting
  const memoryContext = await loadUserContext(config.userId, config.personaId);
  const isReturning = memoryContext.length > 0;

  const greetingPrompt = isReturning
    ? `${personaConfig.baseSystemPrompt}

## Context
${memoryContext}

Generate a warm greeting for a RETURNING client named ${user[0].firstName}. Reference something specific from their previous sessions. Keep it to 1-2 sentences.

Return JSON: {"message": "your greeting"}`
    : `${personaConfig.baseSystemPrompt}

Generate a warm greeting for a NEW client named ${user[0].firstName}. Welcome them and ask what brought them here today. Keep it to 1-2 sentences.

Return JSON: {"message": "your greeting"}`;

  let greeting: string;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: greetingPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      greeting = parsed.message || text;
    } else {
      greeting = text.trim();
    }
  } catch (error) {
    console.error('Failed to generate greeting:', error);
    greeting = isReturning
      ? `Welcome back, ${user[0].firstName}. I've been thinking about you.`
      : `Hello, ${user[0].firstName}. I'm ${personaConfig.displayName}. What brings you to me today?`;
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
    creditsRemaining: user[0].creditMinutes,
  };
}

/**
 * Send a message in an active chat session and get a response.
 */
export async function sendMessage(
  sessionId: string,
  userId: string,
  userMessage: string,
): Promise<ChatResponse> {
  const session = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);

  if (!session[0]) throw new Error('SESSION_NOT_FOUND');
  if (session[0].status !== 'active') throw new Error('SESSION_ENDED');

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0] || user[0].creditMinutes <= 0) {
    await endChatSession(sessionId);
    throw new Error('OUT_OF_CREDITS');
  }

  const personaConfig = await loadPersonaConfig(session[0].personaId);
  if (!personaConfig) throw new Error('PERSONA_NOT_FOUND');

  await db.insert(chatMessages).values({
    sessionId,
    userId,
    role: 'user',
    content: userMessage,
  });

  await checkpointSession(sessionId);

  const messageHistory = await buildMessageContext(
    personaConfig,
    userId,
    sessionId,
    session[0].lastTopic || undefined,
  );

  messageHistory.push({ role: 'user', content: userMessage });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: messageHistory,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let assistantMessage: string;
    let topic: string | null = null;

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

    await db.insert(chatMessages).values({
      sessionId,
      userId,
      role: 'assistant',
      content: assistantMessage,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    });

    if (topic) {
      await db.update(chatSessions)
        .set({ lastTopic: topic, lastBucket: topic, updatedAt: new Date() })
        .where(eq(chatSessions.id, sessionId));
    }

    const updatedUser = await db
      .select({ creditMinutes: users.creditMinutes })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      sessionId,
      message: assistantMessage,
      topic,
      creditsRemaining: updatedUser[0]?.creditMinutes || 0,
      sessionActive: true,
    };
  } catch (error) {
    console.error('Chat engine error:', error);

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
      creditsRemaining: user[0].creditMinutes,
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
): Promise<{ minutesUsed: number; creditsRemaining: number }> {
  await endChatSession(sessionId);

  summarizeSession(sessionId).catch((err) =>
    console.error(`Memory summarization failed for session ${sessionId}:`, err)
  );

  const session = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  const user = await db
    .select({ creditMinutes: users.creditMinutes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    minutesUsed: session[0]?.minutesCharged || 0,
    creditsRemaining: user[0]?.creditMinutes || 0,
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
  minutesCharged: number;
  lastTopic: string | null;
  status: string;
}>> {
  const sessions = await db
    .select({
      id: chatSessions.id,
      personaId: chatSessions.personaId,
      startedAt: chatSessions.startedAt,
      endedAt: chatSessions.endedAt,
      minutesCharged: chatSessions.minutesCharged,
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
      minutesCharged: session.minutesCharged,
      lastTopic: session.lastTopic,
      status: session.status,
    });
  }

  return result;
}
