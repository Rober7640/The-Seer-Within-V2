// Follow-Up Email Generator: Finds inactive users, generates personalized
// 3-email re-engagement sequences using Claude Haiku, and sends via Resend.
//
// Sequence: email #1 at day 2, #2 at day 5, #3 at day 7.
// Max 3 emails per user lifetime. Stops if user returns between sends.

import Anthropic from '@anthropic-ai/sdk';
import { getModelForOperation } from './modelConfig';
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
import { eq, and, lt, gt, desc, or, count, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { buildFollowUpHtml, buildFollowUpText } from './emailTemplate';
import { generateMagicLinkToken } from './magicLink';
import logger from './logger';
import { fireWithBreaker, resendBreaker, anthropicBreaker } from './circuitBreaker';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Initialize Resend only if API key is provided
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FOLLOW_UP_FROM_EMAIL || 'hi@theseerwithin.com';
const FROM_NAME = process.env.FOLLOW_UP_FROM_NAME || 'The Seer Within';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Day thresholds for each sequence email (days since last session)
const SEQUENCE_DAYS = [2, 5, 7] as const;
const MAX_FOLLOW_UPS = 3;

// Sequence-specific email guidance for Claude
const SEQUENCE_CONTEXT = {
  1: {
    tone: 'warm and curious, like a friend checking in',
    angle: 'gently reference what was discussed and wonder if there are updates',
    urgency: 'low — no pressure, just warmth',
    signOff: 'I\'ve been thinking about you',
  },
  2: {
    tone: 'intuitive and revealing, as if sensing unfinished energy',
    angle: 'hint at a new insight or shift in the energies around their topic',
    urgency: 'moderate — something is stirring and they should know',
    signOff: 'the signs are becoming clearer',
  },
  3: {
    tone: 'direct and personal, a final message that must be delivered',
    angle: 'a specific vision or message that has been waiting for them',
    urgency: 'high — this is the last attempt, make it count',
    signOff: 'I have one final message for you',
  },
} as const;

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
  sequenceNumber: 1 | 2 | 3;
  fromEmail: string;    // resolved: persona-specific or global fallback
  fromName: string;     // resolved: persona-specific or global fallback
  personaSlug: string;  // for magic link redirect target
  avatarUrl: string | null;
}

interface GeneratedEmail {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  generationTokens: number;
}

/**
 * Find users who are due for a follow-up email based on the 3-email sequence.
 * - Seq #1: 2+ days since last session, 0 prior follow-ups
 * - Seq #2: 5+ days since last session, exactly 1 prior follow-up
 * - Seq #3: 7+ days since last session, exactly 2 prior follow-ups
 * Stops if the user has returned since their last session.
 */
export async function findUsersNeedingFollowUp(): Promise<FollowUpCandidate[]> {
  const now = new Date();

  // Use the minimum threshold (2 days) to limit the initial query
  const minCutoff = new Date(now);
  minCutoff.setDate(minCutoff.getDate() - SEQUENCE_DAYS[0]);

  // Fetch active users with at least one ended session older than 2 days
  const rows = await db
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
        lt(chatSessions.endedAt, minCutoff),
        sql`${users.email} NOT LIKE '%@example.com' AND ${users.email} NOT LIKE '%@test.com'`,
        // Exclude migrated V1 users who haven't logged in yet
        sql`(${users.migratedFromConversationId} IS NULL OR ${users.lastLoginAt} IS NOT NULL)`,
      ),
    )
    .orderBy(desc(chatSessions.endedAt));

  // Keep only the most recent ended session per user
  const userMap = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    if (!userMap.has(row.userId)) {
      userMap.set(row.userId, row);
    }
  }

  const results: FollowUpCandidate[] = [];

  for (const [userId, candidate] of Array.from(userMap.entries())) {
    // Skip users who have opted out
    const prefs = await db
      .select()
      .from(userFollowUpPreferences)
      .where(eq(userFollowUpPreferences.userId, userId))
      .limit(1);

    const pref = prefs[0];
    if (pref?.unsubscribedAt || (pref && !pref.enableFollowUps)) continue;

    // Count lifetime follow-ups (sent or pending count toward cap; failed do NOT —
    // they will be retried on the next cron run)
    const countResult = await db
      .select({ total: count() })
      .from(followUpEmails)
      .where(
        and(
          eq(followUpEmails.userId, userId),
          or(
            eq(followUpEmails.status, 'sent'),
            eq(followUpEmails.status, 'pending'),
          ),
        ),
      );

    const totalSent = countResult[0]?.total ?? 0;
    if (totalSent >= MAX_FOLLOW_UPS) continue; // Lifetime cap reached

    // Determine which sequence number to send next
    const sequenceNumber = (totalSent + 1) as 1 | 2 | 3;
    const requiredDays = SEQUENCE_DAYS[sequenceNumber - 1];

    if (!candidate.endedAt) continue;

    const daysElapsed = Math.floor(
      (now.getTime() - candidate.endedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysElapsed < requiredDays) continue; // Not enough time has passed

    // Skip if user has returned since their last session ended
    const returned = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, userId),
          gt(chatSessions.startedAt, candidate.endedAt),
        ),
      )
      .limit(1);

    if (returned.length > 0) continue; // User came back — no need for follow-up

    // Skip if this specific sequence email was already sent or is pending.
    // Failed emails are NOT skipped — they will be retried on the next cron run.
    const alreadyQueued = await db
      .select({ id: followUpEmails.id })
      .from(followUpEmails)
      .where(
        and(
          eq(followUpEmails.userId, userId),
          eq(followUpEmails.sequenceNumber, sequenceNumber),
          or(
            eq(followUpEmails.status, 'sent'),
            eq(followUpEmails.status, 'pending'),
          ),
        ),
      )
      .limit(1);

    if (alreadyQueued.length > 0) continue;

    // If a previous attempt failed for this sequence, delete it so a fresh record is created
    await db
      .delete(followUpEmails)
      .where(
        and(
          eq(followUpEmails.userId, userId),
          eq(followUpEmails.sequenceNumber, sequenceNumber),
          eq(followUpEmails.status, 'failed'),
        ),
      );

    // Load persona info
    const personaRows = await db
      .select({
        slug: personas.slug,
        displayName: personas.displayName,
        baseSystemPrompt: personas.baseSystemPrompt,
        personality: personas.personality,
        fromEmail: personas.fromEmail,
        fromName: personas.fromName,
        avatarUrl: personas.avatarUrl,
      })
      .from(personas)
      .where(eq(personas.id, candidate.personaId))
      .limit(1);

    if (!personaRows[0]) continue;

    let specialty = 'spiritual guidance';
    if (personaRows[0].personality) {
      try {
        const parsed = JSON.parse(personaRows[0].personality);
        specialty = parsed.specialty || parsed.specialties?.[0] || 'spiritual guidance';
      } catch {
        // use default
      }
    }

    results.push({
      userId,
      email: candidate.email,
      firstName: candidate.firstName,
      lastSessionId: candidate.sessionId,
      personaId: candidate.personaId,
      personaName: personaRows[0].displayName,
      personaPrompt: personaRows[0].baseSystemPrompt,
      specialty,
      daysSinceLastSession: daysElapsed,
      lastTopic: candidate.lastTopic,
      sequenceNumber,
      fromEmail: personaRows[0].fromEmail || FROM_EMAIL,
      fromName: personaRows[0].fromName || FROM_NAME,
      personaSlug: personaRows[0].slug,
      avatarUrl: personaRows[0].avatarUrl,
    });
  }

  return results;
}

/**
 * Generate a personalized follow-up email using Claude Haiku.
 * The tone and angle vary by sequence number to avoid repetition.
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

  const ctx = SEQUENCE_CONTEXT[candidate.sequenceNumber];

  const prompt = `You are ${candidate.personaName}, a ${candidate.specialty} consultant.

${candidate.firstName} had a session with you ${candidate.daysSinceLastSession} days ago and has not returned.

Memory from that session:
${memoryContext || 'No detailed memory available — speak generally about their spiritual journey.'}

Last topic discussed: ${candidate.lastTopic || 'General guidance'}

This is follow-up email #${candidate.sequenceNumber} of 3 in a re-engagement sequence.

Your approach for this email:
- Tone: ${ctx.tone}
- Angle: ${ctx.angle}
- Urgency: ${ctx.urgency}
- Closing sentiment: "${ctx.signOff}"

Rules:
- Stay fully in character as ${candidate.personaName}
- Use ${candidate.firstName}'s first name at least once
- Reference something specific from memory if available, otherwise speak to their topic
- Do NOT be pushy or use sales language — this is a spiritual message
- Body: 80–150 words
- Subject line: under 60 characters, intriguing, not clickbait

Return ONLY valid JSON with this exact structure:
{
  "subject": "Your email subject line",
  "bodyText": "Plain text version of the email body",
  "bodyHtml": "<p>HTML version of the email body with basic <strong>formatting</strong> where appropriate</p>"
}`;

  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: getModelForOperation('greeting'),
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject || `${candidate.personaName} has a message for you`,
        bodyText: parsed.bodyText || '',
        bodyHtml: parsed.bodyHtml || `<p>${parsed.bodyText || ''}</p>`,
        generationTokens:
          (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      };
    }

    throw new Error('Failed to parse Claude response as JSON');
  } catch (error) {
    logger.error('Follow-up email generation failed, using fallback', {
      error: (error as Error).message,
      sequence: candidate.sequenceNumber,
    });

    // Sequence-appropriate fallbacks
    const fallbacks = {
      1: {
        subject: `${candidate.personaName} is thinking of you`,
        body: `Dear ${candidate.firstName},\n\nIt's been a couple of days since our session, and I've been thinking about what we discussed. The energies around you are still very much present. When you feel ready to explore them further, I'm here.\n\nWith light,\n${candidate.personaName}`,
      },
      2: {
        subject: `Something is shifting around you, ${candidate.firstName}`,
        body: `Dear ${candidate.firstName},\n\nThe energies from our last session have been speaking to me. There are shifts happening around the path we explored together — things I sense you should know about. Come back when you can.\n\nWith clarity,\n${candidate.personaName}`,
      },
      3: {
        subject: `A final message from ${candidate.personaName}`,
        body: `Dear ${candidate.firstName},\n\nI have held a vision for you since our last session. I don't share such things lightly. When you are ready to hear it, return — I will be waiting.\n\nWith purpose,\n${candidate.personaName}`,
      },
    };

    const fb = fallbacks[candidate.sequenceNumber];
    return {
      subject: fb.subject,
      bodyText: fb.body,
      bodyHtml: fb.body
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join(''),
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

  // Generate a 30-day magic link so the user is auto-logged in on click
  const magicToken = await generateMagicLinkToken(
    candidate.userId,
    candidate.personaId,
    candidate.personaSlug,
  );
  const ctaUrl = `${BASE_URL}/magic-auth?t=${magicToken}`;

  // Wrap the generated HTML in the full email template
  const fullHtml = buildFollowUpHtml({
    personaName: candidate.personaName,
    emailBody: email.bodyHtml,
    ctaUrl,
    ctaText: `Return to ${candidate.personaName}`,
    unsubscribeUrl,
    privacyUrl: `${BASE_URL}/privacy`,
    avatarUrl: candidate.avatarUrl
      ? (candidate.avatarUrl.startsWith('http') ? candidate.avatarUrl : `${BASE_URL}${candidate.avatarUrl}`)
      : undefined,
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
      sequenceNumber: candidate.sequenceNumber,
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

  // Bail early in development if Resend is not configured
  if (!resend) {
    logger.warn('Resend API key not configured — email queued but not sent (development mode)', {
      sequence: candidate.sequenceNumber,
      email: candidate.email,
    });
    return { success: false, error: 'Resend API key not configured' };
  }

  // Retry up to 3 times with exponential backoff for rate-limit (429) errors
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fireWithBreaker(resendBreaker, () =>
        resend!.emails.send({
          from: `${candidate.fromName} <${candidate.fromEmail}>`,
          to: candidate.email,
          replyTo: candidate.fromEmail,
          subject: email.subject,
          html: fullHtml,
          text: fullText,
          tags: [
            { name: 'type', value: 'follow_up' },
            { name: 'sequence', value: String(candidate.sequenceNumber) },
            { name: 'persona_id', value: candidate.personaId },
            { name: 'user_id', value: candidate.userId },
          ],
        }),
      );

      if (result.error) {
        const isRateLimit = result.error.message?.toLowerCase().includes('rate') ||
          result.error.name === 'rate_limit_exceeded';

        if (isRateLimit && attempt < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          logger.warn('Follow-up email rate-limited, retrying', {
            email: candidate.email, attempt, delay,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        await db
          .update(followUpEmails)
          .set({ status: 'failed', deliveryStatus: result.error.message, updatedAt: new Date() })
          .where(eq(followUpEmails.id, recordId));

        return { success: false, error: result.error.message };
      }

      // Mark as sent
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
      const isRateLimit = error?.statusCode === 429 ||
        error?.message?.toLowerCase().includes('rate');

      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        logger.warn('Follow-up email rate-limited (exception), retrying', {
          email: candidate.email, attempt, delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      logger.error('Failed to send follow-up email', {
        email: candidate.email,
        sequence: candidate.sequenceNumber,
        error: error?.message,
        attempt,
      });

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

  // Should not reach here, but just in case
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Update the user's follow-up tracking counters after a successful send.
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
 * Main orchestration: find inactive users due for a follow-up, generate and send.
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
        const email = await generateFollowUpEmail(candidate);
        const result = await sendFollowUpEmail(candidate, email);

        if (result.success) {
          stats.sent++;
          logger.info('Follow-up sent', {
            email: candidate.email,
            persona: candidate.personaName,
            sequence: candidate.sequenceNumber,
          });
        } else {
          stats.failed++;
          stats.errors.push(`${candidate.email} (seq${candidate.sequenceNumber}): ${result.error}`);
          logger.error('Follow-up failed', {
            email: candidate.email,
            sequence: candidate.sequenceNumber,
            error: result.error,
          });
        }

        // Rate limit: 100ms between emails
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        stats.failed++;
        stats.errors.push(
          `${candidate.email} (seq${candidate.sequenceNumber}): ${error?.message || 'Unknown error'}`,
        );
        logger.error('Follow-up error', {
          email: candidate.email,
          sequence: candidate.sequenceNumber,
          error: (error as any)?.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Follow-up queue processing error', { error: (error as any)?.message });
    stats.errors.push(`Queue error: ${error?.message || 'Unknown error'}`);
  }

  logger.info('Follow-up queue complete', {
    processed: stats.processed,
    sent: stats.sent,
    failed: stats.failed,
  });

  return stats;
}

/**
 * Reset monthly follow-up counters (call on 1st of each month).
 */
export async function resetMonthlyCounters(): Promise<void> {
  await db.update(userFollowUpPreferences).set({
    followUpsSentThisMonth: 0,
    updatedAt: new Date(),
  });

  logger.info('Follow-up: Monthly counters reset');
}
