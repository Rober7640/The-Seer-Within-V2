// Follow-Up Email Generator: Finds inactive users, generates personalized
// emails using Claude Haiku, and sends them via Resend.

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { db } from './db';
import {
  users,
  chatSessions,
  personas,
  userMemory,
  followUpEmails,
  userFollowUpPreferences,
} from '@shared/schema';
import { eq, and, lt, desc, sql, isNull, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { buildFollowUpHtml, buildFollowUpText } from './emailTemplate';
import logger from './logger';
import { fireWithBreaker, resendBreaker, anthropicBreaker } from './circuitBreaker';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Initialize Resend only if API key is provided
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FOLLOW_UP_FROM_EMAIL || 'noreply@theseerwithin.com';
const FROM_NAME = process.env.FOLLOW_UP_FROM_NAME || 'Spiritual Guidance';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface FollowUpCandidate {
  userId: string;
  email: string;
  firstName: string;
  lastSessionId: string;
  personaId: string;
  personaName: string;
  personaPrompt: string;
  specialty: string;
  daysSinceLastSession: number;
  lastTopic: string | null;
}

interface GeneratedEmail {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  generationTokens: number;
}

/**
 * Find users who haven't had a session in N+ days and are eligible for follow-up.
 */
export async function findUsersNeedingFollowUp(
  daysSinceLastSession: number = 2,
): Promise<FollowUpCandidate[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastSession);

  // Find users with their most recent ended session that is older than the cutoff
  const candidates = await db
    .select({
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      sessionId: chatSessions.id,
      personaId: chatSessions.personaId,
      lastTopic: chatSessions.lastTopic,
      endedAt: chatSessions.endedAt,
    })
    .from(users)
    .innerJoin(chatSessions, eq(chatSessions.userId, users.id))
    .where(
      and(
        eq(users.accountStatus, 'active'),
        eq(chatSessions.status, 'ended'),
        lt(chatSessions.endedAt, cutoffDate),
      ),
    )
    .orderBy(desc(chatSessions.endedAt));

  // Deduplicate: keep only the most recent session per user
  const userMap = new Map<string, typeof candidates[0]>();
  for (const c of candidates) {
    if (!userMap.has(c.userId)) {
      userMap.set(c.userId, c);
    }
  }

  // Filter out users who should not receive follow-ups
  const results: FollowUpCandidate[] = [];
  const userEntries = Array.from(userMap.entries());
  for (const [userId, candidate] of userEntries) {
    // Check user preferences
    const prefs = await db
      .select()
      .from(userFollowUpPreferences)
      .where(eq(userFollowUpPreferences.userId, userId))
      .limit(1);

    const pref = prefs[0];
    if (pref) {
      // User has opted out
      if (!pref.enableFollowUps || pref.unsubscribedAt) continue;

      // Over monthly limit
      if (pref.followUpsSentThisMonth >= pref.maxFollowUpsPerMonth) continue;

      // Custom follow-up days not met
      if (pref.followUpDays > 0) {
        const customCutoff = new Date();
        customCutoff.setDate(customCutoff.getDate() - pref.followUpDays);
        if (candidate.endedAt && candidate.endedAt > customCutoff) continue;
      }

      // Already sent a follow-up recently (within last 3 days)
      if (pref.lastFollowUpSentAt) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        if (pref.lastFollowUpSentAt > threeDaysAgo) continue;
      }
    }

    // Check no pending/sent follow-up exists for this user recently
    const recentFollowUps = await db
      .select({ id: followUpEmails.id })
      .from(followUpEmails)
      .where(
        and(
          eq(followUpEmails.userId, userId),
          or(
            eq(followUpEmails.status, 'pending'),
            eq(followUpEmails.status, 'sent'),
          ),
        ),
      )
      .limit(1);

    // Skip if there's a recent pending/sent follow-up
    // (allow if none found, or only failed/bounced)
    if (recentFollowUps.length > 0) continue;

    // Check user has credits (exclude users with 0 credits)
    const user = await db
      .select({ coinBalance: users.coinBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0] || user[0].coinBalance <= 0) continue;

    // Load persona info
    const persona = await db
      .select({
        displayName: personas.displayName,
        baseSystemPrompt: personas.baseSystemPrompt,
        personality: personas.personality,
      })
      .from(personas)
      .where(eq(personas.id, candidate.personaId))
      .limit(1);

    if (!persona[0]) continue;

    // Parse specialty from personality JSON
    let specialty = 'spiritual guidance';
    if (persona[0].personality) {
      try {
        const parsed = JSON.parse(persona[0].personality);
        specialty = parsed.specialty || parsed.specialties?.[0] || 'spiritual guidance';
      } catch {
        // use default
      }
    }

    const daysDiff = candidate.endedAt
      ? Math.floor((Date.now() - candidate.endedAt.getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceLastSession;

    results.push({
      userId,
      email: candidate.email,
      firstName: candidate.firstName,
      lastSessionId: candidate.sessionId,
      personaId: candidate.personaId,
      personaName: persona[0].displayName,
      personaPrompt: persona[0].baseSystemPrompt,
      specialty,
      daysSinceLastSession: daysDiff,
      lastTopic: candidate.lastTopic,
    });
  }

  return results;
}

/**
 * Generate a personalized follow-up email using Claude Haiku.
 */
export async function generateFollowUpEmail(
  candidate: FollowUpCandidate,
): Promise<GeneratedEmail> {
  // Load memory context for personalization
  const memories = await db
    .select()
    .from(userMemory)
    .where(
      and(
        eq(userMemory.userId, candidate.userId),
        eq(userMemory.personaId, candidate.personaId),
      ),
    )
    .orderBy(desc(userMemory.importance), desc(userMemory.lastAccessedAt))
    .limit(3);

  const memoryContext = memories
    .map((m) => {
      let details: { keyTopics?: string[]; nextSessionContext?: string } | null = null;
      try {
        details = m.fullContext ? JSON.parse(m.fullContext) : null;
      } catch {
        // ignore
      }
      return `${m.summary}${details?.keyTopics ? ` (Topics: ${details.keyTopics.join(', ')})` : ''}`;
    })
    .join('\n');

  const prompt = `You are ${candidate.personaName}, a ${candidate.specialty} consultant.

${candidate.firstName} had a session with you ${candidate.daysSinceLastSession} days ago.

Memory context:
${memoryContext || 'No previous memory context available.'}

Last topic discussed: ${candidate.lastTopic || 'General guidance'}

Write a warm, personalized follow-up email to bring them back:
- Stay in character as ${candidate.personaName}
- Reference something specific from memory if available
- Be warm but not pushy
- Include a clear call-to-action to return for another session
- Under 150 words for the body
- Make the subject line compelling (under 60 characters)

Return ONLY valid JSON with this exact structure:
{
  "subject": "Your email subject line",
  "bodyText": "Plain text version of the email body",
  "bodyHtml": "<p>HTML version of the email body with basic formatting</p>"
}`;

  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject || `${candidate.personaName} is thinking of you`,
        bodyText: parsed.bodyText || '',
        bodyHtml: parsed.bodyHtml || `<p>${parsed.bodyText || ''}</p>`,
        generationTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      };
    }

    throw new Error('Failed to parse Claude response as JSON');
  } catch (error) {
    logger.error('Follow-up email generation failed, using fallback', { error: (error as Error).message });

    // Fallback template
    return {
      subject: `${candidate.personaName} has a message for you`,
      bodyText: `Dear ${candidate.firstName},\n\nIt's been ${candidate.daysSinceLastSession} days since our last session, and I've been thinking about our conversation. The energies are shifting, and I sense there's more we need to explore together.\n\nWhen you're ready, I'm here.\n\nWith light,\n${candidate.personaName}`,
      bodyHtml: `<p>Dear ${candidate.firstName},</p><p>It's been ${candidate.daysSinceLastSession} days since our last session, and I've been thinking about our conversation. The energies are shifting, and I sense there's more we need to explore together.</p><p>When you're ready, I'm here.</p><p>With light,<br>${candidate.personaName}</p>`,
      generationTokens: 0,
    };
  }
}

/**
 * Send a follow-up email via Resend and save tracking data.
 */
export async function sendFollowUpEmail(
  candidate: FollowUpCandidate,
  email: GeneratedEmail,
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const unsubscribeToken = randomUUID();
  const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${unsubscribeToken}`;
  const ctaUrl = `${BASE_URL}/chat`;

  // Wrap the generated HTML in the full email template
  const fullHtml = buildFollowUpHtml({
    personaName: candidate.personaName,
    emailBody: email.bodyHtml,
    ctaUrl,
    unsubscribeUrl,
    preferencesUrl: `${BASE_URL}/settings/email-preferences`,
    companyAddress: '123 Spiritual Way, Suite 100, New York, NY 10001',
    privacyUrl: `${BASE_URL}/privacy`,
  });

  const fullText = buildFollowUpText({
    personaName: candidate.personaName,
    emailBody: email.bodyText,
    ctaUrl,
    unsubscribeUrl,
  });

  // Save to database first (status: pending)
  const emailRecord = await db
    .insert(followUpEmails)
    .values({
      userId: candidate.userId,
      personaId: candidate.personaId,
      lastSessionId: candidate.lastSessionId,
      recipientEmail: candidate.email,
      subject: email.subject,
      bodyHtml: fullHtml,
      bodyText: fullText,
      status: 'pending',
      generatedBy: 'claude-haiku',
      generationTokens: email.generationTokens,
      daysSinceLastSession: candidate.daysSinceLastSession,
      unsubscribeToken,
    })
    .returning({ id: followUpEmails.id });

  const recordId = emailRecord[0]?.id;
  if (!recordId) {
    return { success: false, error: 'Failed to create email record' };
  }

  try {
    // Check if Resend is configured
    if (!resend) {
      logger.warn('Resend API key not configured - email not sent (development mode)');
      await db
        .update(followUpEmails)
        .set({ status: 'pending', updatedAt: new Date() })
        .where(eq(followUpEmails.id, recordId));
      return { success: false, error: 'Resend API key not configured' };
    }

    const result = await fireWithBreaker(resendBreaker, () =>
      resend!.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: candidate.email,
        subject: email.subject,
        html: fullHtml,
        text: fullText,
        tags: [
          { name: 'type', value: 'follow_up' },
          { name: 'persona_id', value: candidate.personaId },
          { name: 'user_id', value: candidate.userId },
        ],
      }),
    );

    if (result.error) {
      await db
        .update(followUpEmails)
        .set({ status: 'failed', deliveryStatus: result.error.message, updatedAt: new Date() })
        .where(eq(followUpEmails.id, recordId));

      return { success: false, error: result.error.message };
    }

    // Update record with Resend ID and sent status
    await db
      .update(followUpEmails)
      .set({
        status: 'sent',
        sentAt: new Date(),
        resendEmailId: result.data?.id || null,
        updatedAt: new Date(),
      })
      .where(eq(followUpEmails.id, recordId));

    // Update user preferences tracking
    await updateFollowUpTracking(candidate.userId);

    return { success: true, emailId: result.data?.id };
  } catch (error: any) {
    logger.error('Failed to send follow-up email', { email: candidate.email, error: (error as any)?.message });

    await db
      .update(followUpEmails)
      .set({
        status: 'failed',
        deliveryStatus: error?.message || 'Send failed',
        updatedAt: new Date(),
      })
      .where(eq(followUpEmails.id, recordId));

    return { success: false, error: error?.message || 'Send failed' };
  }
}

/**
 * Update the user's follow-up tracking counters.
 */
async function updateFollowUpTracking(userId: string): Promise<void> {
  const existing = await db
    .select()
    .from(userFollowUpPreferences)
    .where(eq(userFollowUpPreferences.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(userFollowUpPreferences)
      .set({
        followUpsSentThisMonth: existing[0].followUpsSentThisMonth + 1,
        lastFollowUpSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userFollowUpPreferences.userId, userId));
  } else {
    // Create default preferences with tracking
    await db.insert(userFollowUpPreferences).values({
      userId,
      enableFollowUps: true,
      followUpDays: 2,
      maxFollowUpsPerMonth: 4,
      followUpsSentThisMonth: 1,
      lastFollowUpSentAt: new Date(),
    });
  }
}

/**
 * Main orchestration: find inactive users, generate and send follow-up emails.
 * Rate-limited to 100ms between emails.
 */
export async function processFollowUpQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const stats = { processed: 0, sent: 0, failed: 0, errors: [] as string[] };

  try {
    const candidates = await findUsersNeedingFollowUp();
    logger.info('Follow-up queue: candidates found', { count: candidates.length });

    for (const candidate of candidates) {
      stats.processed++;

      try {
        // Generate personalized email
        const email = await generateFollowUpEmail(candidate);

        // Send via Resend
        const result = await sendFollowUpEmail(candidate, email);

        if (result.success) {
          stats.sent++;
          logger.info('Follow-up sent', { email: candidate.email, persona: candidate.personaName });
        } else {
          stats.failed++;
          stats.errors.push(`${candidate.email}: ${result.error}`);
          logger.error('Follow-up failed', { email: candidate.email, error: result.error });
        }

        // Rate limit: 100ms between emails
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        stats.failed++;
        stats.errors.push(`${candidate.email}: ${error?.message || 'Unknown error'}`);
        logger.error('Follow-up error', { email: candidate.email, error: (error as any)?.message });
      }
    }
  } catch (error: any) {
    logger.error('Follow-up queue processing error', { error: (error as any)?.message });
    stats.errors.push(`Queue error: ${error?.message || 'Unknown error'}`);
  }

  logger.info('Follow-up queue complete', { processed: stats.processed, sent: stats.sent, failed: stats.failed });

  return stats;
}

/**
 * Reset monthly follow-up counters (call on 1st of each month).
 */
export async function resetMonthlyCounters(): Promise<void> {
  await db
    .update(userFollowUpPreferences)
    .set({
      followUpsSentThisMonth: 0,
      updatedAt: new Date(),
    });

  logger.info('Follow-up: Monthly counters reset');
}
