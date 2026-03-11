// Persona Training & Fine-Tuning System
// Allows admins and consultants to improve persona behavior through:
// 1. Example conversations (few-shot learning)
// 2. Feedback loops from real sessions
// 3. Quality scoring of responses
// 4. Prompt improvement suggestions

import { db } from './db';
import { personas, personaPrompts, chatSessions, chatMessages } from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { getModelForOperation } from './modelConfig';
import Anthropic from '@anthropic-ai/sdk';
import logger from './logger';
import { fireWithBreaker, anthropicBreaker } from './circuitBreaker';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// ============================================
// EXAMPLE CONVERSATIONS (Few-Shot Learning)
// ============================================

interface ExampleExchange {
  userMessage: string;
  idealResponse: string;
  category: string;
  notes?: string;
}

/**
 * Generate an enhanced system prompt that includes few-shot examples.
 */
export function buildFewShotPrompt(
  basePrompt: string,
  examples: ExampleExchange[],
): string {
  if (examples.length === 0) return basePrompt;

  const exampleSection = examples.map((ex, i) => `
Example ${i + 1} (${ex.category}):
User: "${ex.userMessage}"
Response: "${ex.idealResponse}"
${ex.notes ? `Note: ${ex.notes}` : ''}`
  ).join('\n');

  return `${basePrompt}

## Example Conversations
These show the ideal tone and style for responses:
${exampleSection}

Follow the style and tone demonstrated in these examples.`;
}

// ============================================
// SESSION QUALITY SCORING
// ============================================

interface QualityScore {
  sessionId: string;
  overallScore: number;
  voiceConsistency: number;
  empathyLevel: number;
  insightQuality: number;
  conversationFlow: number;
  issues: string[];
  suggestions: string[];
}

/**
 * Analyze a completed session and score the persona's performance.
 */
export async function scoreSessionQuality(sessionId: string): Promise<QualityScore> {
  const session = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session[0]) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.sentAt);

  if (messages.length === 0) {
    throw new Error(`No messages found for session ${sessionId}`);
  }

  const persona = await db
    .select()
    .from(personas)
    .where(eq(personas.id, session[0].personaId))
    .limit(1);

  const personaName = persona[0]?.displayName || 'Unknown Persona';
  const personality = persona[0]?.personality || '{}';

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'Client' : personaName}: ${m.content}`)
    .join('\n\n');

  const prompt = `You are a quality assurance reviewer for a spiritual guidance platform.

Review this conversation between a client and the persona "${personaName}".

Personality Profile: ${personality}

Transcript:
${transcript}

Score the following on a 1-10 scale and provide feedback:

1. **Voice Consistency**: Does the persona maintain a consistent character throughout?
2. **Empathy Level**: How well does the persona show understanding and compassion?
3. **Insight Quality**: Are the readings/insights specific and personal (not generic)?
4. **Conversation Flow**: Does the conversation progress naturally? Good pacing?

Return JSON:
{
  "overallScore": 7,
  "voiceConsistency": 8,
  "empathyLevel": 7,
  "insightQuality": 6,
  "conversationFlow": 7,
  "issues": ["List any specific problems"],
  "suggestions": ["Specific improvements to make"]
}`;

  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: getModelForOperation('conversation'),
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sessionId,
        overallScore: parsed.overallScore || 5,
        voiceConsistency: parsed.voiceConsistency || 5,
        empathyLevel: parsed.empathyLevel || 5,
        insightQuality: parsed.insightQuality || 5,
        conversationFlow: parsed.conversationFlow || 5,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
      };
    }
  } catch (error) {
    logger.error('Failed to score session quality', { sessionId, error: (error as Error).message });
  }

  return {
    sessionId,
    overallScore: 5,
    voiceConsistency: 5,
    empathyLevel: 5,
    insightQuality: 5,
    conversationFlow: 5,
    issues: ['Quality scoring failed - manual review needed'],
    suggestions: [],
  };
}

// ============================================
// PROMPT IMPROVEMENT SUGGESTIONS
// ============================================

/**
 * Analyze recent sessions for a persona and suggest prompt improvements.
 */
export async function suggestPromptImprovements(
  personaId: string,
  recentDays: number = 7,
): Promise<{
  currentStrengths: string[];
  areasForImprovement: string[];
  suggestedPromptAdditions: string[];
}> {
  const persona = await db
    .select()
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  const since = new Date();
  since.setDate(since.getDate() - recentDays);

  const recentSessions = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.personaId, personaId),
        gte(chatSessions.createdAt, since)
      )
    )
    .orderBy(desc(chatSessions.createdAt))
    .limit(10);

  if (recentSessions.length === 0) {
    return {
      currentStrengths: ['No recent sessions to analyze'],
      areasForImprovement: [],
      suggestedPromptAdditions: [],
    };
  }

  const sampleMessages: string[] = [];
  for (const session of recentSessions.slice(0, 5)) {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.sessionId, session.id),
          eq(chatMessages.role, 'assistant')
        )
      )
      .limit(3);

    sampleMessages.push(...messages.map((m) => m.content));
  }

  const prompt = `You are a prompt engineering expert reviewing a spiritual guidance persona.

Current Base System Prompt:
${persona[0]?.baseSystemPrompt || 'Not available'}

Sample Responses from Recent Sessions:
${sampleMessages.slice(0, 10).map((m, i) => `${i + 1}. "${m}"`).join('\n')}

Analyze the persona's performance and provide:
1. Current strengths (what the prompt does well)
2. Areas for improvement (where responses could be better)
3. Specific prompt additions or modifications to suggest

Return JSON:
{
  "currentStrengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"],
  "suggestedPromptAdditions": ["addition1", "addition2"]
}`;

  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: getModelForOperation('conversation'),
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        currentStrengths: parsed.currentStrengths || [],
        areasForImprovement: parsed.areasForImprovement || [],
        suggestedPromptAdditions: parsed.suggestedPromptAdditions || [],
      };
    }
  } catch (error) {
    logger.error('Failed to generate prompt improvement suggestions', { personaId, error: (error as Error).message });
  }

  return {
    currentStrengths: ['Analysis failed'],
    areasForImprovement: [],
    suggestedPromptAdditions: [],
  };
}

/**
 * Create a new prompt version with improvements (inactive until admin approves).
 */
export async function createImprovedPromptVersion(
  personaId: string,
  promptType: string,
  improvedText: string,
): Promise<{ version: number }> {
  const latestPrompt = await db
    .select({ version: personaPrompts.version })
    .from(personaPrompts)
    .where(
      and(
        eq(personaPrompts.personaId, personaId),
        eq(personaPrompts.promptType, promptType)
      )
    )
    .orderBy(desc(personaPrompts.version))
    .limit(1);

  const newVersion = (latestPrompt[0]?.version || 0) + 1;

  await db.insert(personaPrompts).values({
    personaId,
    promptType,
    promptContent: improvedText,
    version: newVersion,
    isActive: false,
    trafficPercent: 100,
  });

  return { version: newVersion };
}
