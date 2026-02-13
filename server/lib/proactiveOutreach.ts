// Proactive Outreach System
// AI-initiated check-ins that reach out to users based on patterns,
// session history, and significant dates/events.

import { db } from './db';
import { users, userMemory, chatSessions, personas, personaPrompts, systemConfig } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface OutreachCandidate {
  userId: string;
  email: string;
  firstName: string;
  reason: OutreachReason;
  lastSessionDate: Date | null;
  creditMinutes: number;
  recentMemories: string[];
}

type OutreachReason =
  | 'inactive_7_days'
  | 'inactive_30_days'
  | 'low_credits'
  | 'session_followup'
  | 'new_user_nurture'
  | 'memory_trigger';

interface OutreachMessage {
  userId: string;
  personaId: string;
  personaName: string;
  subject: string;
  message: string;
  reason: OutreachReason;
  channel: 'in_app' | 'email';
}

/**
 * Check if outreach is enabled in system config.
 */
async function isOutreachEnabled(): Promise<boolean> {
  const config = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, 'outreach_enabled'))
    .limit(1);

  return config[0]?.configValue === 'true';
}

/**
 * Find users who are candidates for proactive outreach.
 */
export async function findOutreachCandidates(): Promise<OutreachCandidate[]> {
  const enabled = await isOutreachEnabled();
  if (!enabled) return [];

  const candidates: OutreachCandidate[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const activeUsers = await db
    .select()
    .from(users)
    .where(eq(users.accountStatus, 'active'));

  for (const user of activeUsers) {
    const lastSession = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id))
      .orderBy(desc(chatSessions.createdAt))
      .limit(1);

    const lastSessionDate = lastSession[0]?.createdAt || null;

    const memories = await db
      .select({ summary: userMemory.summary })
      .from(userMemory)
      .where(eq(userMemory.userId, user.id))
      .orderBy(desc(userMemory.createdAt))
      .limit(3);

    const recentMemories = memories.map((m) => m.summary);

    let reason: OutreachReason | null = null;

    if (!lastSessionDate) {
      if (user.createdAt < threeDaysAgo) {
        reason = 'new_user_nurture';
      }
    } else if (lastSessionDate < thirtyDaysAgo) {
      reason = 'inactive_30_days';
    } else if (lastSessionDate < sevenDaysAgo) {
      reason = 'inactive_7_days';
    } else if (user.creditMinutes <= 1 && user.creditMinutes > 0) {
      reason = 'low_credits';
    } else if (lastSessionDate > sevenDaysAgo && recentMemories.length > 0) {
      reason = 'session_followup';
    }

    if (reason) {
      candidates.push({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        reason,
        lastSessionDate,
        creditMinutes: user.creditMinutes,
        recentMemories,
      });
    }
  }

  return candidates;
}

/**
 * Generate a personalized outreach message for a candidate.
 */
export async function generateOutreachMessage(
  candidate: OutreachCandidate,
): Promise<OutreachMessage | null> {
  // Find the user's preferred persona (most sessions with)
  const preferredPersona = await db
    .select({
      personaId: chatSessions.personaId,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(chatSessions)
    .where(eq(chatSessions.userId, candidate.userId))
    .groupBy(chatSessions.personaId)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  let personaId: string;
  if (preferredPersona[0]?.personaId) {
    personaId = preferredPersona[0].personaId;
  } else {
    const defaultPersona = await db
      .select()
      .from(personas)
      .where(and(eq(personas.isDefault, true), eq(personas.isActive, true)))
      .limit(1);

    if (!defaultPersona[0]) return null;
    personaId = defaultPersona[0].id;
  }

  const persona = await db
    .select()
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  if (!persona[0]) return null;

  const reasonContext: Record<OutreachReason, string> = {
    inactive_7_days: `It's been about a week since your last session with ${candidate.firstName}. Reach out warmly, asking how things have been since last time.`,
    inactive_30_days: `It's been about a month since ${candidate.firstName} last connected. Express that you've been sensing their energy and wanted to check in.`,
    low_credits: `${candidate.firstName} is running low on session time. Do NOT mention credits or purchasing directly. Express that there's more to explore.`,
    session_followup: `${candidate.firstName} had a recent session. Follow up on what was discussed. Reference their memories naturally.`,
    new_user_nurture: `${candidate.firstName} signed up but hasn't had a full session yet. Introduce yourself warmly and invite them to chat.`,
    memory_trigger: `Something in ${candidate.firstName}'s stored memories suggests a check-in would be valuable.`,
  };

  const memoryContext = candidate.recentMemories.length > 0
    ? `\nRecent context about this person:\n${candidate.recentMemories.join('\n')}`
    : '';

  const prompt = `${persona[0].baseSystemPrompt}

## Outreach Task
You are reaching out to a client proactively. Write a short, warm check-in message.

Client: ${candidate.firstName}
${reasonContext[candidate.reason]}
${memoryContext}

## Rules
- Keep it to 2-3 short sentences
- Be warm and personal, not generic
- Do NOT mention AI, system, or technology
- Do NOT mention credits, payments, or purchasing
- Make them want to come back and chat
- End with an inviting question or gentle prompt

Return JSON:
{
  "subject": "Brief subject line (under 50 chars)",
  "message": "Your outreach message"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        userId: candidate.userId,
        personaId: persona[0].id,
        personaName: persona[0].displayName,
        subject: parsed.subject || `${persona[0].displayName} is thinking of you`,
        message: parsed.message || text,
        reason: candidate.reason,
        channel: 'in_app',
      };
    }

    return null;
  } catch (error) {
    console.error(`Failed to generate outreach for ${candidate.firstName}:`, error);
    return null;
  }
}

/**
 * Run the outreach cycle: find candidates and generate messages.
 */
export async function runOutreachCycle(): Promise<OutreachMessage[]> {
  console.log('Running proactive outreach cycle...');

  const candidates = await findOutreachCandidates();
  console.log(`Found ${candidates.length} outreach candidates`);

  const messages: OutreachMessage[] = [];

  for (const candidate of candidates) {
    const message = await generateOutreachMessage(candidate);
    if (message) {
      messages.push(message);
      console.log(`Generated outreach for ${candidate.firstName} (${candidate.reason})`);
    }
  }

  console.log(`Generated ${messages.length} outreach messages`);
  return messages;
}

/**
 * Start a periodic outreach check.
 */
export function startOutreachScheduler(intervalMs: number = 24 * 60 * 60 * 1000): NodeJS.Timeout {
  console.log('Starting proactive outreach scheduler');

  runOutreachCycle().catch((err) =>
    console.error('Outreach cycle error:', err)
  );

  return setInterval(() => {
    runOutreachCycle().catch((err) =>
      console.error('Outreach cycle error:', err)
    );
  }, intervalMs);
}
