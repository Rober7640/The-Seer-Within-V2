// Cross-persona memory transfer system
// Allows memory context to flow between different personas for the same user
// Example: Evelyn Cross reads about love, then a career persona can reference
// that the user recently got clarity on their relationship

import { db } from './db';
import { userMemory, personas, chatSessions } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import logger from './logger';
import { getModelForOperation } from './modelConfig';
import { fireWithBreaker, anthropicBreaker } from './circuitBreaker';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface TransferableMemory {
  id: string;
  summary: string;
  fullContext: string | null;
  category: string | null;
  importance: number;
  sourcePersonaName: string | null;
  createdAt: Date;
}

interface TransferredContext {
  relevantMemories: TransferableMemory[];
  contextSummary: string;
}

/**
 * Load memories from other personas that may be relevant to the current persona's session.
 * This enables cross-persona awareness without breaking character boundaries.
 */
export async function loadCrossPersonaMemories(
  userId: string,
  currentPersonaId: string,
  currentTopic?: string,
  maxMemories: number = 3,
): Promise<TransferredContext> {
  // Fetch memories from sessions with OTHER personas
  const memories = await db
    .select({
      id: userMemory.id,
      summary: userMemory.summary,
      fullContext: userMemory.fullContext,
      category: userMemory.category,
      importance: userMemory.importance,
      createdAt: userMemory.createdAt,
      sourceSessionId: userMemory.sourceSessionId,
      personaId: userMemory.personaId,
    })
    .from(userMemory)
    .where(eq(userMemory.userId, userId))
    .orderBy(desc(userMemory.importance), desc(userMemory.createdAt))
    .limit(20);

  const memoriesWithPersona: TransferableMemory[] = [];

  for (const memory of memories) {
    // Skip memories from the current persona (they're already loaded via loadUserContext)
    if (memory.personaId === currentPersonaId) continue;

    let sourcePersonaName: string | null = null;

    if (memory.personaId) {
      const persona = await db
        .select({ displayName: personas.displayName })
        .from(personas)
        .where(eq(personas.id, memory.personaId))
        .limit(1);

      sourcePersonaName = persona[0]?.displayName || 'another guide';
    } else if (memory.sourceSessionId) {
      // Fall back to looking up persona via session
      const session = await db
        .select({ personaId: chatSessions.personaId })
        .from(chatSessions)
        .where(eq(chatSessions.id, memory.sourceSessionId))
        .limit(1);

      if (session[0]?.personaId && session[0].personaId !== currentPersonaId) {
        const persona = await db
          .select({ displayName: personas.displayName })
          .from(personas)
          .where(eq(personas.id, session[0].personaId))
          .limit(1);

        sourcePersonaName = persona[0]?.displayName || 'another guide';
      } else if (session[0]?.personaId === currentPersonaId) {
        continue;
      }
    }

    memoriesWithPersona.push({
      id: memory.id,
      summary: memory.summary,
      fullContext: memory.fullContext,
      category: memory.category,
      importance: memory.importance,
      sourcePersonaName,
      createdAt: memory.createdAt,
    });

    if (memoriesWithPersona.length >= maxMemories) break;
  }

  let contextSummary = '';
  if (memoriesWithPersona.length > 0) {
    contextSummary = await generateTransferSummary(memoriesWithPersona, currentTopic);
  }

  return {
    relevantMemories: memoriesWithPersona,
    contextSummary,
  };
}

/**
 * Generate a summary of cross-persona memories suitable for injecting into
 * a persona's system prompt.
 */
async function generateTransferSummary(
  memories: TransferableMemory[],
  currentTopic?: string,
): Promise<string> {
  const memoryDescriptions = memories.map((m) => {
    const source = m.sourcePersonaName ? ` (from session with ${m.sourcePersonaName})` : '';
    return `- ${m.summary}${source} [${m.category || 'general'}]`;
  });

  const prompt = `You are helping a spiritual guide prepare for a session with a returning client.

The client has had sessions with other guides. Here is what was discussed:

${memoryDescriptions.join('\n')}

${currentTopic ? `The current topic is: ${currentTopic}` : ''}

Write a brief 2-3 sentence context note for the current guide. Focus on:
1. Key life details the guide should be aware of
2. Emotional state and recent developments
3. Any relevant connections to the current topic

Do NOT mention other guides by name or reference "other sessions" directly.
Frame it as general awareness of the client's situation.
Keep it under 100 words.`;

  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: getModelForOperation('summarization'),
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return text.trim();
  } catch (error) {
    logger.error('Failed to generate transfer summary', { error: (error as Error).message });
    return memories.map((m) => m.summary).join('. ');
  }
}

/**
 * Format cross-persona context for injection into a persona's system prompt.
 */
export function formatTransferContext(context: TransferredContext): string {
  if (!context.contextSummary && context.relevantMemories.length === 0) {
    return '';
  }

  return `
## Client Background (from prior interactions)
${context.contextSummary}

Use this context naturally in conversation. Do not mention other guides or sessions.
Reference these details as if you intuitively sense them about the client.`;
}
