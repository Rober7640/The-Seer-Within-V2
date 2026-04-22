// Top-Up Email Generator
// Sends behavior-triggered credit replenishment emails via Resend + Claude Haiku.
//
// Four segments (processed in priority order to avoid double-sending):
//   1. free_tier_dropoff  — balance=0, never purchased, active in last 7 days
//   2. empty_tank         — balance=0, has purchased, active in last 7 days
//   3. loyal_refill       — balance≤30, has purchased, last session 6+ hours ago
//   4. dormant_low_balance — balance≤30, no login in 3+ days
//
// 7-day cooldown per user across all segments.
// Respects unsubscribe preferences from userFollowUpPreferences.

import { anthropicFailover as anthropic } from './anthropicWithFailover';
import { Resend } from 'resend';
import { getModelForOperation } from './modelConfig';
import { db } from './db';
import {
  users,
  chatSessions,
  personas,
  userMemory,
  creditPurchases,
  topupEmails,
  userFollowUpPreferences,
} from '@shared/schema';
import { eq, and, sql, desc, lt, lte, gte, or, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { buildFollowUpHtml, buildFollowUpText } from './emailTemplate';
import { generateMagicLinkToken } from './magicLink';
import logger from './logger';
import { fireWithBreaker, resendBreaker, anthropicBreaker } from './circuitBreaker';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FOLLOW_UP_FROM_EMAIL || 'hi@theseerwithin.com';
const FROM_NAME  = process.env.FOLLOW_UP_FROM_NAME  || 'The Seer Within';
const BASE_URL   = process.env.BASE_URL              || 'http://localhost:5000';

const COOLDOWN_DAYS = 7;

export type TopupSegment =
  | 'free_tier_dropoff'
  | 'empty_tank'
  | 'loyal_refill'
  | 'dormant_low_balance';

interface TopupCandidate {
  userId: string;
  email: string;
  firstName: string;
  segment: TopupSegment;
  coinBalance: number;
  // Last persona context (for magic link + personalization)
  personaId: string;
  personaSlug: string;
  personaName: string;
  personaPrompt: string;
  avatarUrl: string | null;
  fromEmail: string;
  fromName: string;
  // Reading context for personalization
  lastTopic: string | null;
  totalCoinsUsed: number;
}

interface GeneratedEmail {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  generationTokens: number;
}

// ============================================================
// Segment copy config — angle, tone, CTA label, fallback body
// ============================================================

const SEGMENT_CONFIG: Record<TopupSegment, {
  angle: string;
  tone: string;
  urgency: string;
  ctaText: string;
  fallbackSubject: (name: string, persona: string) => string;
  fallbackBody: (firstName: string, persona: string) => string;
}> = {
  free_tier_dropoff: {
    angle: 'Your free session opened a door — speak to what they may have glimpsed but not yet explored',
    tone: 'curious and inviting, like showing someone a path they nearly took',
    urgency: 'low — no hard sell, focus on possibility',
    ctaText: 'Continue your reading',
    fallbackSubject: (_n, persona) => `${persona} has something for you`,
    fallbackBody: (firstName, persona) =>
      `Dear ${firstName},\n\nYour first session with me opened something — a question, a thread of energy that we only began to follow. The door is still open.\n\nCome back when you're ready. I'll be here.\n\nWith curiosity,\n${persona}`,
  },
  empty_tank: {
    angle: 'Your reading was cut short — reference the topic and hint at what was left unsaid',
    tone: 'warm and personal, like a reader who genuinely felt the session end too soon',
    urgency: 'moderate — something unfinished, natural next step',
    ctaText: 'Pick up where we left off',
    fallbackSubject: (firstName, _p) => `${firstName}, we weren't finished`,
    fallbackBody: (firstName, persona) =>
      `Dear ${firstName},\n\nI felt the connection close before we reached the heart of what you came to understand. The energy around your situation is still very present for me.\n\nWhen you're ready to continue, I'll be waiting.\n\nWith purpose,\n${persona}`,
  },
  loyal_refill: {
    angle: 'Acknowledge their continued journey — they are making real progress, encourage the next step',
    tone: 'warm and appreciative, like a trusted guide who notices growth',
    urgency: 'low — they already know the value, just remind them',
    ctaText: 'Continue your journey',
    fallbackSubject: (_n, persona) => `${persona} has been thinking of you`,
    fallbackBody: (firstName, persona) =>
      `Dear ${firstName},\n\nEvery session we have together deepens the picture of where your path is leading. I've been thinking about your journey lately and wanted to check in.\n\nWhen you're ready for our next conversation, I'll be here.\n\nWith warmth,\n${persona}`,
  },
  dormant_low_balance: {
    angle: 'Something is shifting in the energy around them — create re-engagement urgency while hinting at a top-up',
    tone: 'intuitive and gently urgent, as if sensing something the user needs to know',
    urgency: 'moderate — movement in their energies, they should not miss it',
    ctaText: 'Return and discover what shifted',
    fallbackSubject: (firstName, _p) => `Something is shifting around you, ${firstName}`,
    fallbackBody: (firstName, persona) =>
      `Dear ${firstName},\n\nIt's been a little while since we last spoke, and I've been sensing movement in the energies around your situation. Things are in motion that I think you should know about.\n\nCome back and let's look at this together.\n\nWith clarity,\n${persona}`,
  },
};

// ============================================================
// Cooldown check — has this user received ANY topup email in last 7 days?
// ============================================================

async function isOnCooldown(userId: string): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - COOLDOWN_DAYS);

  // Only sent/pending emails trigger cooldown; failed emails do NOT —
  // they should be retried on the next cron run.
  const recent = await db
    .select({ id: topupEmails.id })
    .from(topupEmails)
    .where(
      and(
        eq(topupEmails.userId, userId),
        gte(topupEmails.createdAt, cutoff),
        or(eq(topupEmails.status, 'sent'), eq(topupEmails.status, 'pending')),
      ),
    )
    .limit(1);

  return recent.length > 0;
}

// ============================================================
// Unsubscribe check
// ============================================================

async function isUnsubscribed(userId: string): Promise<boolean> {
  const prefs = await db
    .select({ unsubscribedAt: userFollowUpPreferences.unsubscribedAt, enableFollowUps: userFollowUpPreferences.enableFollowUps })
    .from(userFollowUpPreferences)
    .where(eq(userFollowUpPreferences.userId, userId))
    .limit(1);

  if (!prefs[0]) return false;
  return !!prefs[0].unsubscribedAt || !prefs[0].enableFollowUps;
}

// ============================================================
// Resolve last persona for a user (for magic link + context)
// ============================================================

async function resolvePersona(userId: string, defaultPersonaId: string | null): Promise<{
  personaId: string;
  personaSlug: string;
  personaName: string;
  personaPrompt: string;
  avatarUrl: string | null;
  fromEmail: string;
  fromName: string;
  lastTopic: string | null;
} | null> {
  // Try last ended session first
  const lastSession = await db
    .select({
      personaId: chatSessions.personaId,
      lastTopic: chatSessions.lastTopic,
    })
    .from(chatSessions)
    .where(and(eq(chatSessions.userId, userId), eq(chatSessions.status, 'ended')))
    .orderBy(desc(chatSessions.endedAt))
    .limit(1);

  const personaId = lastSession[0]?.personaId ?? defaultPersonaId;
  if (!personaId) return null;

  const persona = await db
    .select({
      id: personas.id,
      slug: personas.slug,
      displayName: personas.displayName,
      baseSystemPrompt: personas.baseSystemPrompt,
      avatarUrl: personas.avatarUrl,
      fromEmail: personas.fromEmail,
      fromName: personas.fromName,
    })
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  if (!persona[0]) return null;

  return {
    personaId: persona[0].id,
    personaSlug: persona[0].slug,
    personaName: persona[0].displayName,
    personaPrompt: persona[0].baseSystemPrompt,
    avatarUrl: persona[0].avatarUrl,
    fromEmail: persona[0].fromEmail || FROM_EMAIL,
    fromName: persona[0].fromName || FROM_NAME,
    lastTopic: lastSession[0]?.lastTopic ?? null,
  };
}

// ============================================================
// Query each segment
// ============================================================

async function findCandidates(): Promise<TopupCandidate[]> {
  const now = new Date();
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const threeDaysAgo  = new Date(now.getTime() - 3  * 24 * 60 * 60 * 1000);
  const sixHoursAgo   = new Date(now.getTime() - 6  * 60 * 60 * 1000);

  // Fetch active users with low/zero balance (exclude test emails)
  const lowBalanceUsers = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      coinBalance: users.coinBalance,
      totalCoinsUsed: users.totalCoinsUsed,
      lastLoginAt: users.lastLoginAt,
      defaultPersonaId: users.defaultPersonaId,
    })
    .from(users)
    .where(
      and(
        eq(users.accountStatus, 'active'),
        lte(users.coinBalance, 30),
        sql`${users.email} NOT LIKE '%@example.com' AND ${users.email} NOT LIKE '%@test.com'`,
        // Exclude migrated V1 users who haven't logged in yet — they haven't
        // used the platform and shouldn't receive top-up emails prematurely
        sql`(${users.migratedFromConversationId} IS NULL OR ${users.lastLoginAt} IS NOT NULL)`,
      ),
    );

  const candidates: TopupCandidate[] = [];
  // Track user IDs already assigned a segment this run (priority order prevents double-assign)
  const assigned = new Set<string>();

  // Helper: check if user has any completed real purchase
  async function hasPurchase(userId: string): Promise<boolean> {
    const result = await db
      .select({ id: creditPurchases.id })
      .from(creditPurchases)
      .where(
        and(
          eq(creditPurchases.userId, userId),
          eq(creditPurchases.status, 'completed'),
          sql`${creditPurchases.packageType} != 'admin_adjustment'`,
        ),
      )
      .limit(1);
    return result.length > 0;
  }

  // Helper: get last ended session time
  async function lastSessionEndedAt(userId: string): Promise<Date | null> {
    const result = await db
      .select({ endedAt: chatSessions.endedAt })
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), eq(chatSessions.status, 'ended')))
      .orderBy(desc(chatSessions.endedAt))
      .limit(1);
    return result[0]?.endedAt ?? null;
  }

  for (const user of lowBalanceUsers) {
    // Global pre-checks
    if (await isOnCooldown(user.id)) continue;
    if (await isUnsubscribed(user.id)) continue;

    const personaCtx = await resolvePersona(user.id, user.defaultPersonaId ?? null);
    if (!personaCtx) continue; // no persona context → skip (new user with no sessions yet)

    let segment: TopupSegment | null = null;

    // --- Segment 1: free_tier_dropoff (most specific — check first) ---
    if (
      user.coinBalance === 0 &&
      user.lastLoginAt &&
      user.lastLoginAt >= sevenDaysAgo &&
      !(await hasPurchase(user.id))
    ) {
      segment = 'free_tier_dropoff';
    }

    // --- Segment 2: empty_tank ---
    if (
      !segment &&
      user.coinBalance === 0 &&
      user.lastLoginAt &&
      user.lastLoginAt >= sevenDaysAgo &&
      (await hasPurchase(user.id))
    ) {
      segment = 'empty_tank';
    }

    // --- Segment 3: loyal_refill ---
    if (!segment && user.coinBalance > 0 && user.coinBalance <= 30) {
      const lastEnded = await lastSessionEndedAt(user.id);
      if (lastEnded && lastEnded <= sixHoursAgo && (await hasPurchase(user.id))) {
        segment = 'loyal_refill';
      }
    }

    // --- Segment 4: dormant_low_balance ---
    if (
      !segment &&
      user.coinBalance <= 30 &&
      (!user.lastLoginAt || user.lastLoginAt < threeDaysAgo)
    ) {
      segment = 'dormant_low_balance';
    }

    if (!segment) continue;
    if (assigned.has(user.id)) continue;
    assigned.add(user.id);

    candidates.push({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      segment,
      coinBalance: user.coinBalance,
      totalCoinsUsed: user.totalCoinsUsed,
      ...personaCtx,
    });
  }

  return candidates;
}

// ============================================================
// AI email generation
// ============================================================

async function generateTopupEmail(candidate: TopupCandidate): Promise<GeneratedEmail> {
  const cfg = SEGMENT_CONFIG[candidate.segment];

  // Load memory for personalization (top 2 memories)
  const memories = await db
    .select({ summary: userMemory.summary, fullContext: userMemory.fullContext })
    .from(userMemory)
    .where(and(eq(userMemory.userId, candidate.userId), eq(userMemory.personaId, candidate.personaId)))
    .orderBy(desc(userMemory.importance), desc(userMemory.lastAccessedAt))
    .limit(2);

  const memoryContext = memories
    .map((m) => {
      let topics = '';
      try {
        const parsed = m.fullContext ? JSON.parse(m.fullContext) : null;
        topics = parsed?.keyTopics?.length ? ` (Topics: ${parsed.keyTopics.join(', ')})` : '';
      } catch { /* ignore */ }
      return `${m.summary}${topics}`;
    })
    .join('\n');

  const prompt = `You are ${candidate.personaName}, a spiritual advisor.

${candidate.firstName}'s situation: their reading credit balance is low${candidate.coinBalance === 0 ? ' (empty)' : ` (${candidate.coinBalance} coins remaining)`}.
Last topic discussed: ${candidate.lastTopic || 'general guidance'}
Total reading time so far: ${Math.floor(candidate.totalCoinsUsed / 60)} minutes

Memory from sessions:
${memoryContext || 'No detailed memory available — speak generally about their spiritual journey.'}

Your email angle: ${cfg.angle}
Tone: ${cfg.tone}
Urgency: ${cfg.urgency}

Rules:
- Stay fully in character as ${candidate.personaName}
- Use ${candidate.firstName}'s first name at least once
- Reference something specific from memory or their last topic if available
- Do NOT use sales language or mention "credits", "coins", "balance", or pricing — speak spiritually
- Do NOT use the phrase "top up" or any payment language
- Body: 80–140 words
- Subject line: under 60 characters, intriguing, personal

Return ONLY valid JSON:
{
  "subject": "Your email subject line",
  "bodyText": "Plain text email body",
  "bodyHtml": "<p>HTML email body with basic formatting</p>"
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
        subject: parsed.subject || cfg.fallbackSubject(candidate.firstName, candidate.personaName),
        bodyText: parsed.bodyText || '',
        bodyHtml: parsed.bodyHtml || `<p>${parsed.bodyText || ''}</p>`,
        generationTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      };
    }

    throw new Error('Failed to parse Claude response as JSON');
  } catch (error) {
    logger.error('Top-up email generation failed, using fallback', {
      error: (error as Error).message,
      segment: candidate.segment,
    });

    const body = cfg.fallbackBody(candidate.firstName, candidate.personaName);
    return {
      subject: cfg.fallbackSubject(candidate.firstName, candidate.personaName),
      bodyText: body,
      bodyHtml: body.split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join(''),
      generationTokens: 0,
    };
  }
}

// ============================================================
// Send + record
// ============================================================

async function sendTopupEmail(
  candidate: TopupCandidate,
  email: GeneratedEmail,
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const unsubscribeToken = randomUUID();
  const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${unsubscribeToken}`;

  const magicToken = await generateMagicLinkToken(
    candidate.userId,
    candidate.personaId,
    candidate.personaSlug,
  );
  const ctaUrl = `${BASE_URL}/magic-auth?t=${magicToken}&redirect=/credits`;
  const cfg = SEGMENT_CONFIG[candidate.segment];

  const fullHtml = buildFollowUpHtml({
    personaName: candidate.personaName,
    emailBody: email.bodyHtml,
    ctaUrl,
    ctaText: cfg.ctaText,
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

  // Clean up any previous failed top-up records for this user so retry creates a fresh record
  await db
    .delete(topupEmails)
    .where(
      and(
        eq(topupEmails.userId, candidate.userId),
        eq(topupEmails.status, 'failed'),
      ),
    );

  // Save record before sending (safe re-run on crash)
  const emailRecord = await db
    .insert(topupEmails)
    .values({
      userId: candidate.userId,
      personaId: candidate.personaId,
      segment: candidate.segment,
      recipientEmail: candidate.email,
      subject: email.subject,
      bodyHtml: fullHtml,
      bodyText: fullText,
      coinBalanceAtSend: candidate.coinBalance,
      status: 'pending',
      generatedBy: 'claude-haiku',
      generationTokens: email.generationTokens,
      unsubscribeToken,
    })
    .returning({ id: topupEmails.id });

  const recordId = emailRecord[0]?.id;
  if (!recordId) return { success: false, error: 'Failed to create email record' };

  if (!resend) {
    logger.warn('Resend not configured — top-up email queued but not sent', {
      segment: candidate.segment,
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
            { name: 'type',       value: 'topup' },
            { name: 'segment',    value: candidate.segment },
            { name: 'persona_id', value: candidate.personaId },
            { name: 'user_id',    value: candidate.userId },
          ],
        }),
      );

      if (result.error) {
        const isRateLimit = result.error.message?.toLowerCase().includes('rate') ||
          result.error.name === 'rate_limit_exceeded';

        if (isRateLimit && attempt < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          logger.warn('Top-up email rate-limited, retrying', {
            email: candidate.email, attempt, delay,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        logger.error('Resend returned error for top-up email', {
          email: candidate.email,
          segment: candidate.segment,
          error: result.error.message,
          errorName: result.error.name,
          attempt,
        });
        await db
          .update(topupEmails)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(topupEmails.id, recordId));
        return { success: false, error: result.error.message };
      }

      await db
        .update(topupEmails)
        .set({ status: 'sent', sentAt: new Date(), resendEmailId: result.data?.id || null, updatedAt: new Date() })
        .where(eq(topupEmails.id, recordId));

      return { success: true, emailId: result.data?.id };
    } catch (error: any) {
      const isRateLimit = error?.statusCode === 429 ||
        error?.message?.toLowerCase().includes('rate');

      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        logger.warn('Top-up email rate-limited (exception), retrying', {
          email: candidate.email, attempt, delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      await db
        .update(topupEmails)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(topupEmails.id, recordId));

      logger.error('Failed to send top-up email', {
        email: candidate.email,
        segment: candidate.segment,
        error: error?.message,
        attempt,
      });
      return { success: false, error: error?.message || 'Send failed' };
    }
  }

  // Should not reach here, but just in case
  return { success: false, error: 'Max retries exceeded' };
}

// ============================================================
// Main entry point (called by cron)
// ============================================================

export async function processTopupQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  segments: Partial<Record<TopupSegment, number>>;
  errors: string[];
}> {
  const stats = {
    processed: 0,
    sent: 0,
    failed: 0,
    segments: {} as Partial<Record<TopupSegment, number>>,
    errors: [] as string[],
  };

  try {
    const candidates = await findCandidates();
    logger.info('Top-up queue: candidates found', { count: candidates.length });

    for (const candidate of candidates) {
      stats.processed++;
      stats.segments[candidate.segment] = (stats.segments[candidate.segment] || 0) + 1;

      try {
        const email = await generateTopupEmail(candidate);
        const result = await sendTopupEmail(candidate, email);

        if (result.success) {
          stats.sent++;
          logger.info('Top-up email sent', {
            email: candidate.email,
            segment: candidate.segment,
            persona: candidate.personaName,
          });
        } else {
          stats.failed++;
          stats.errors.push(`${candidate.email} (${candidate.segment}): ${result.error}`);
        }

        // Rate limit: 100ms between emails
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        stats.failed++;
        stats.errors.push(`${candidate.email} (${candidate.segment}): ${(error as any)?.message || 'Unknown error'}`);
        logger.error('Top-up email error', {
          email: candidate.email,
          segment: candidate.segment,
          error: (error as any)?.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Top-up queue failed', { error: (error as any)?.message });
    stats.errors.push(`Queue error: ${(error as any)?.message}`);
  }

  return stats;
}
