// Panel Readings: Multi-persona collaboration system
// Allows multiple personas to participate in a single reading session,
// each providing their unique perspective on the user's question.

import { db } from './db';
import { personas, personaPrompts, chatSessions, chatMessages } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { loadUserContext } from './memoryManager';
import Anthropic from '@anthropic-ai/sdk';
import logger from './logger';
import { fireWithBreaker, anthropicBreaker } from './circuitBreaker';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface PanelPersona {
  id: string;
  displayName: string;
  tagline: string | null;
  baseSystemPrompt: string;
  personality: string | null;
}

interface PanelResponse {
  personaId: string;
  personaName: string;
  message: string;
  topic: string | null;
}

interface PanelReadingResult {
  sessionId: string;
  question: string;
  responses: PanelResponse[];
  synthesis: string;
}

/**
 * Load persona data for panel participation.
 */
async function loadPanelPersona(personaId: string): Promise<PanelPersona | null> {
  const persona = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.isActive, true)))
    .limit(1);

  if (!persona[0]) return null;

  return {
    id: persona[0].id,
    displayName: persona[0].displayName,
    tagline: persona[0].tagline,
    baseSystemPrompt: persona[0].baseSystemPrompt,
    personality: persona[0].personality,
  };
}

/**
 * Generate a single persona's response for the panel reading.
 */
async function generatePanelPersonaResponse(
  persona: PanelPersona,
  userId: string,
  question: string,
  userContext: string,
  otherResponses: PanelResponse[],
): Promise<PanelResponse> {
  const otherContext = otherResponses.length > 0
    ? `\n\nOther guides have shared their perspectives:\n${otherResponses.map(r => `${r.personaName}: "${r.message}"`).join('\n')}\n\nProvide your OWN unique perspective. Do not repeat what others said. Build on or offer a different angle.`
    : '';

  const prompt = `${persona.baseSystemPrompt}

## Panel Reading Session
You are participating in a panel reading with other spiritual guides. Each guide offers their unique perspective.

## Client Context
${userContext}

${otherContext}

## The Question
The client asks: "${question}"

## Instructions
- Provide YOUR unique perspective based on your specialty and voice
- Keep your response to 2-3 sentences (under 75 words)
- Stay in character
- If other guides have spoken, complement or contrast their views
- Do not repeat what others said

Return JSON:
{
  "message": "Your response",
  "topic": "the primary topic (love/money/purpose/someone/general)"
}`;

  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        personaId: persona.id,
        personaName: persona.displayName,
        message: parsed.message || text,
        topic: parsed.topic || null,
      };
    }

    return {
      personaId: persona.id,
      personaName: persona.displayName,
      message: text.trim(),
      topic: null,
    };
  } catch (error) {
    logger.error(`Panel response failed for ${persona.displayName}:`, error);
    return {
      personaId: persona.id,
      personaName: persona.displayName,
      message: 'The energy is unclear at this moment... I need a moment to focus.',
      topic: null,
    };
  }
}

/**
 * Generate a synthesis of all panel responses.
 */
async function generatePanelSynthesis(
  question: string,
  responses: PanelResponse[],
  userName: string,
): Promise<string> {
  const responseSummary = responses
    .map((r) => `${r.personaName}: "${r.message}"`)
    .join('\n');

  const prompt = `You are a narrator summarizing a panel reading by multiple spiritual guides.

The client "${userName}" asked: "${question}"

The guides responded:
${responseSummary}

Write a brief synthesis (2-3 sentences) that:
1. Identifies the common thread or theme across all responses
2. Highlights any unique insights
3. Offers a clear, actionable takeaway for the client

Keep it warm and encouraging. Under 75 words. Do not use "the guides" - say "the reading reveals" or similar.`;

  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    return response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : 'The energies converge on a single message for you.';
  } catch (error) {
    logger.error('Failed to generate panel synthesis:', error);
    return 'Multiple perspectives have been shared. Consider how each resonates with your heart.';
  }
}

/**
 * Conduct a full panel reading with multiple personas.
 */
export async function conductPanelReading(
  userId: string,
  personaIds: string[],
  question: string,
  userName: string,
): Promise<PanelReadingResult> {
  const panelPersonas: PanelPersona[] = [];
  for (const id of personaIds) {
    const persona = await loadPanelPersona(id);
    if (persona) panelPersonas.push(persona);
  }

  if (panelPersonas.length === 0) {
    throw new Error('No valid personas found for panel reading');
  }

  const userContext = await loadUserContext(userId);

  // Create a panel session
  const session = await db.insert(chatSessions).values({
    userId,
    personaId: panelPersonas[0].id,
    status: 'active',
    lastTopic: 'panel_reading',
    lastBucket: 'general',
  }).returning();

  const sessionId = session[0].id;

  // Store the user's question
  await db.insert(chatMessages).values({
    sessionId,
    userId,
    role: 'user',
    content: question,
  });

  // Generate responses sequentially so each persona can see previous responses
  const responses: PanelResponse[] = [];

  for (const persona of panelPersonas) {
    const response = await generatePanelPersonaResponse(
      persona,
      userId,
      question,
      userContext,
      responses,
    );
    responses.push(response);

    await db.insert(chatMessages).values({
      sessionId,
      userId,
      role: 'assistant',
      content: `[${persona.displayName}] ${response.message}`,
    });
  }

  const synthesis = await generatePanelSynthesis(question, responses, userName);

  await db.insert(chatMessages).values({
    sessionId,
    userId,
    role: 'assistant',
    content: `[Panel Synthesis] ${synthesis}`,
  });

  // End the session
  await db.update(chatSessions)
    .set({ status: 'ended', endedAt: new Date(), updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId));

  return { sessionId, question, responses, synthesis };
}

/**
 * Get available personas for panel readings.
 */
export async function getAvailablePanelPersonas(): Promise<Array<{
  id: string;
  displayName: string;
  tagline: string | null;
  categories: string | null;
}>> {
  return db
    .select({
      id: personas.id,
      displayName: personas.displayName,
      tagline: personas.tagline,
      categories: personas.categories,
    })
    .from(personas)
    .where(eq(personas.isActive, true));
}
