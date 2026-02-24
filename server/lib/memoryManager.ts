import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { chatMessages, chatSessions, userMemory, users } from '@shared/schema';
import { eq, and, or, isNull, lt, desc, ne, inArray } from 'drizzle-orm';
import { getModelForOperation } from './modelConfig';
import logger from './logger';
import { fireWithBreaker, anthropicBreaker } from './circuitBreaker';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

async function callClaudeForSummary(prompt: string): Promise<string> {
  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: getModelForOperation('summarization'),
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return text;
  } catch (error) {
    logger.error('Claude summary API error', { error: (error as Error).message });
    return '';
  }
}

export async function summarizeSession(sessionId: string): Promise<void> {
  const session = await db.select().from(chatSessions)
    .where(eq(chatSessions.id, sessionId)).limit(1);

  if (!session[0]) return;

  const messages = await db.select().from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.sentAt);

  if (messages.length === 0) return;

  const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

  const summaryPrompt = `
You are extracting factual memory from a conversation between a user and a spiritual guide.

TRANSCRIPT:
${transcript}

Your job is to record ONLY what the USER explicitly said — their own words, questions, concerns, names, and facts they shared.

STRICT RULES:
- Do NOT include anything the guide said, sensed, interpreted, or predicted
- Do NOT include phrases like "the guide sensed", "energy shifts", "crossroads", or any mystical interpretation
- Do NOT invent or infer facts the user did not explicitly state
- If the user said very little, record only what they actually said — even if it is just one sentence
- Names, relationships, places, timelines the user mentioned are valuable — capture those exactly

Generate a JSON summary with this exact structure:
{
  "keyTopics": ["topics the USER asked about or mentioned"],
  "userConcerns": ["specific worries or questions the USER expressed in their own words"],
  "importantDetails": {
    "names": ["names of people the user mentioned"],
    "emotions": ["emotions the user expressed about themselves — not what the guide projected"]
  },
  "overallSummary": "2-3 sentences describing what the USER said and asked, written as factual notes",
  "nextSessionContext": "Factual notes for next session — only things the user actually shared"
}

Respond ONLY with valid JSON.
  `;

  const responseText = await callClaudeForSummary(summaryPrompt);
  if (!responseText) return;

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const summary = JSON.parse(jsonMatch[0]);

    const MAX_SUMMARY_LEN = 500;
    const MAX_CONTEXT_LEN = 2000;
    await db.insert(userMemory).values({
      userId: session[0].userId,
      personaId: session[0].personaId,
      memoryType: 'session_summary',
      summary: (summary.overallSummary || 'Session summary').slice(0, MAX_SUMMARY_LEN),
      fullContext: JSON.stringify(summary).slice(0, MAX_CONTEXT_LEN),
      sourceSessionId: sessionId,
      importance: 7,
      category: session[0].lastBucket || 'general',
    });
  } catch (error) {
    logger.error('Failed to parse or save session summary', { error: (error as Error).message, sessionId });
  }
}

export async function loadUserContext(userId: string, personaId?: string): Promise<string> {
  // Memories persist as long as the user is active (activity-based retention).
  // Cleanup of inactive user memories is handled by cleanupInactiveUserMemories().
  const conditions = [
    eq(userMemory.userId, userId),
    // birth_chart and numerology_profile are handled separately and injected directly
    ne(userMemory.memoryType, 'birth_chart'),
    ne(userMemory.memoryType, 'numerology_profile'),
  ];

  if (personaId) {
    conditions.push(
      or(
        eq(userMemory.personaId, personaId),
        isNull(userMemory.personaId)
      )!
    );
  }

  const memories = await db.select().from(userMemory)
    .where(and(...conditions))
    .orderBy(desc(userMemory.importance), desc(userMemory.lastAccessedAt))
    .limit(5);

  // Batch-update access tracking in a single query instead of N separate UPDATEs
  if (memories.length > 0) {
    const now = new Date();
    await db.update(userMemory)
      .set({ lastAccessedAt: now, updatedAt: now })
      .where(inArray(userMemory.id, memories.map(m => m.id)));
  }

  if (memories.length === 0) return '';

  const contextParts = memories.map(m => {
    let details: { keyTopics?: string[]; nextSessionContext?: string } | null = null;
    try {
      details = m.fullContext ? JSON.parse(m.fullContext) : null;
    } catch {
      // ignore parse errors
    }
    return `[Previous Conversation - ${m.category || 'general'}]
${m.summary}
${details?.keyTopics ? `Topics: ${details.keyTopics.join(', ')}` : ''}
${details?.nextSessionContext || ''}`.trim();
  });

  return contextParts.join('\n\n---\n\n');
}

/**
 * Delete memories for users who have been inactive for 6+ months (no logins).
 * Active users keep all their memories indefinitely.
 * Run this as a scheduled job (e.g. daily cron).
 */
export async function cleanupInactiveUserMemories(): Promise<number> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Find users who haven't logged in for 6+ months
  const inactiveUsers = await db.select({ id: users.id })
    .from(users)
    .where(
      or(
        lt(users.lastLoginAt, sixMonthsAgo),
        isNull(users.lastLoginAt)
      )
    );

  if (inactiveUsers.length === 0) return 0;

  // Single batched delete instead of N sequential deletes
  const result = await db.delete(userMemory)
    .where(inArray(userMemory.userId, inactiveUsers.map(u => u.id)))
    .returning({ id: userMemory.id });

  const deletedCount = result.length;
  if (deletedCount > 0) {
    logger.info('Memory cleanup completed', { deletedCount, inactiveUsers: inactiveUsers.length });
  }

  return deletedCount;
}
