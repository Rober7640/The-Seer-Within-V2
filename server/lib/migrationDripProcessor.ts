// Migration Drip Email Processor
//
// Handles the 3-email migration sequence for V1 funnel users migrated to V2.
// - Email 1: Sent manually via admin trigger (or immediately for new funnel users)
// - Email 2: Sent 24 hours after Email 1 (via cron)
// - Email 3: Sent 24 hours after Email 2 (via cron)
//
// Stops if user logs into V2 (lastLoginAt gets set).

import Anthropic from '@anthropic-ai/sdk';
import { getModelForOperation } from './modelConfig';
import { Resend } from 'resend';
import { db } from './db';
import {
  users,
  conversations,
  personas,
  userMemory,
  migrationDripEmails,
  userFollowUpPreferences,
} from '@shared/schema';
import { eq, and, isNull, sql, desc, count } from 'drizzle-orm';
import { randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { buildFollowUpHtml, buildFollowUpText } from './emailTemplate';
import { generateMagicLinkToken } from './magicLink';
import logger from './logger';
import { fireWithBreaker, resendBreaker, anthropicBreaker } from './circuitBreaker';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const FREE_COINS = 180;
const EVELYN_SLUG = 'evelyn-cross';

// Hours after previous email before next one fires
const EMAIL2_DELAY_HOURS = 24;
const EMAIL3_DELAY_HOURS = 24; // 24h after Email 2

// Sequence-specific guidance for Haiku
const SEQUENCE_CONTEXT = {
  1: {
    tone: 'warm and personal, like a friend reaching out',
    angle: 'reference their specific concern from the reading, invite them to a new space to continue',
    signOff: 'With light, Evelyn',
  },
  2: {
    tone: 'intuitive and sensing, as if you feel unfinished energy',
    angle: 'hint that the energies around their topic are shifting and there is more to uncover',
    signOff: 'The signs are becoming clearer, Evelyn',
  },
  3: {
    tone: 'direct and personal, a final heartfelt message',
    angle: 'a specific feeling or vision you have been holding for them — this is your last message',
    signOff: 'I will be here when you are ready, Evelyn',
  },
} as const;

interface MigrationCandidate {
  userId: string;
  email: string;
  firstName: string;
  conversationId: string;
  bucket: string | null;
  concern: string | null;
  vision: string | null;
  deeperResponse: string | null;
  emotionalResponse: string | null;
  location: string | null;
}

interface EvelynConfig {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  fromEmail: string | null;
  fromName: string | null;
}

/**
 * Send Email 1 to all eligible migrated users who haven't received it yet.
 * Called manually from admin dashboard.
 */
export async function sendMigrationEmail1(
  limit?: number,
): Promise<{ processed: number; sent: number; failed: number; skipped: number; errors: string[] }> {
  const stats = { processed: 0, sent: 0, failed: 0, skipped: 0, errors: [] as string[] };

  const evelyn = await getEvelynConfig();
  if (!evelyn) {
    stats.errors.push('Evelyn Cross persona not found');
    return stats;
  }

  // Find migrated users with concern + vision who:
  // - Haven't logged into V2 yet
  // - Haven't received Email 1 yet
  const candidates = await db
    .select({
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      conversationId: users.migratedFromConversationId,
    })
    .from(users)
    .where(
      and(
        sql`${users.migratedFromConversationId} IS NOT NULL`,
        isNull(users.lastLoginAt),
        eq(users.accountStatus, 'active'),
        sql`${users.email} NOT LIKE '%@example.com' AND ${users.email} NOT LIKE '%@test.com'`,
        // No Email 1 sent yet
        sql`${users.id} NOT IN (SELECT user_id FROM migration_drip_emails WHERE sequence_number = 1)`,
      ),
    )
    .limit(limit || 10000);

  // Filter by concern + vision
  const eligible: MigrationCandidate[] = [];
  for (const c of candidates) {
    if (!c.conversationId) continue;
    const convo = await db
      .select({
        bucket: conversations.bucket,
        concern: conversations.concern,
        vision: conversations.vision,
        deeperResponse: conversations.deeperResponse,
        emotionalResponse: conversations.emotionalResponse,
        location: conversations.location,
      })
      .from(conversations)
      .where(eq(conversations.id, c.conversationId))
      .limit(1);

    if (convo[0]?.concern && convo[0]?.vision) {
      eligible.push({
        userId: c.userId,
        email: c.email,
        firstName: c.firstName,
        conversationId: c.conversationId,
        ...convo[0],
      });
    }
  }

  logger.info('Migration Email 1: candidates found', { total: candidates.length, eligible: eligible.length });

  for (const candidate of eligible) {
    stats.processed++;
    try {
      // Re-check lastLoginAt (user may have logged in during processing)
      const freshUser = await db
        .select({ lastLoginAt: users.lastLoginAt })
        .from(users)
        .where(eq(users.id, candidate.userId))
        .limit(1);

      if (freshUser[0]?.lastLoginAt) {
        stats.skipped++;
        continue;
      }

      await sendDripEmail(candidate, 1, evelyn);
      stats.sent++;
    } catch (error: any) {
      stats.failed++;
      stats.errors.push(`${candidate.email}: ${error?.message}`);
    }

    // Rate limit: 100ms between emails
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger.info('Migration Email 1 complete', stats);
  return stats;
}

/**
 * Process Email 2 and Email 3 for users who haven't logged in.
 * Called by the 6-hour cron.
 */
export async function processMigrationDripQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const stats = { processed: 0, sent: 0, failed: 0, skipped: 0, errors: [] as string[] };

  const evelyn = await getEvelynConfig();
  if (!evelyn) {
    stats.errors.push('Evelyn Cross persona not found');
    return stats;
  }

  const now = new Date();

  // Find users who need Email 2: Email 1 sent 24+ hours ago, no Email 2 yet, not logged in
  const email2Candidates = await db
    .select({
      userId: migrationDripEmails.userId,
      sentAt: migrationDripEmails.sentAt,
    })
    .from(migrationDripEmails)
    .innerJoin(users, eq(users.id, migrationDripEmails.userId))
    .where(
      and(
        eq(migrationDripEmails.sequenceNumber, 1),
        eq(migrationDripEmails.status, 'sent'),
        isNull(users.lastLoginAt),
        eq(users.accountStatus, 'active'),
        // Email 1 sent 24+ hours ago
        sql`${migrationDripEmails.sentAt} <= NOW() - INTERVAL '${sql.raw(String(EMAIL2_DELAY_HOURS))} hours'`,
        // No Email 2 yet
        sql`${migrationDripEmails.userId} NOT IN (SELECT user_id FROM migration_drip_emails WHERE sequence_number = 2)`,
      ),
    );

  for (const row of email2Candidates) {
    stats.processed++;
    try {
      const candidate = await loadCandidate(row.userId);
      if (!candidate) { stats.skipped++; continue; }
      await sendDripEmail(candidate, 2, evelyn);
      stats.sent++;
    } catch (error: any) {
      stats.failed++;
      stats.errors.push(`Email 2 - ${row.userId}: ${error?.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Find users who need Email 3: Email 2 sent 24+ hours ago, no Email 3 yet, not logged in
  const email3Candidates = await db
    .select({
      userId: migrationDripEmails.userId,
      sentAt: migrationDripEmails.sentAt,
    })
    .from(migrationDripEmails)
    .innerJoin(users, eq(users.id, migrationDripEmails.userId))
    .where(
      and(
        eq(migrationDripEmails.sequenceNumber, 2),
        eq(migrationDripEmails.status, 'sent'),
        isNull(users.lastLoginAt),
        eq(users.accountStatus, 'active'),
        // Email 2 sent 24+ hours ago
        sql`${migrationDripEmails.sentAt} <= NOW() - INTERVAL '${sql.raw(String(EMAIL3_DELAY_HOURS))} hours'`,
        // No Email 3 yet
        sql`${migrationDripEmails.userId} NOT IN (SELECT user_id FROM migration_drip_emails WHERE sequence_number = 3)`,
      ),
    );

  for (const row of email3Candidates) {
    stats.processed++;
    try {
      const candidate = await loadCandidate(row.userId);
      if (!candidate) { stats.skipped++; continue; }
      await sendDripEmail(candidate, 3, evelyn);
      stats.sent++;
    } catch (error: any) {
      stats.failed++;
      stats.errors.push(`Email 3 - ${row.userId}: ${error?.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger.info('Migration drip queue complete', stats);
  return stats;
}

/**
 * Load a migration candidate's full data from the DB.
 */
async function loadCandidate(userId: string): Promise<MigrationCandidate | null> {
  const user = await db
    .select({
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      conversationId: users.migratedFromConversationId,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0] || user[0].lastLoginAt || !user[0].conversationId) return null;

  // Skip if user has unsubscribed
  const prefs = await db
    .select({ unsubscribedAt: userFollowUpPreferences.unsubscribedAt, enableFollowUps: userFollowUpPreferences.enableFollowUps })
    .from(userFollowUpPreferences)
    .where(eq(userFollowUpPreferences.userId, userId))
    .limit(1);

  if (prefs[0]?.unsubscribedAt || (prefs[0] && !prefs[0].enableFollowUps)) return null;

  const convo = await db
    .select({
      bucket: conversations.bucket,
      concern: conversations.concern,
      vision: conversations.vision,
      deeperResponse: conversations.deeperResponse,
      emotionalResponse: conversations.emotionalResponse,
      location: conversations.location,
    })
    .from(conversations)
    .where(eq(conversations.id, user[0].conversationId))
    .limit(1);

  if (!convo[0]) return null;

  return {
    userId: user[0].userId,
    email: user[0].email,
    firstName: user[0].firstName,
    conversationId: user[0].conversationId,
    ...convo[0],
  };
}

/**
 * Generate and send a single drip email.
 */
async function sendDripEmail(
  candidate: MigrationCandidate,
  sequenceNumber: 1 | 2 | 3,
  evelyn: EvelynConfig,
): Promise<void> {
  // Generate email content via Haiku
  const emailContent = await generateDripEmail(candidate, sequenceNumber, evelyn.displayName);

  // Generate magic link
  const magicToken = await generateMagicLinkToken(candidate.userId, evelyn.id, EVELYN_SLUG);
  const magicUrl = `${BASE_URL}/magic-auth?t=${magicToken}`;

  const avatarUrl = evelyn.avatarUrl
    ? (evelyn.avatarUrl.startsWith('http') ? evelyn.avatarUrl : `${BASE_URL}${evelyn.avatarUrl}`)
    : undefined;

  const ctaLabels = {
    1: 'Pick Up Where You Left Off',
    2: 'Evelyn Has Something to Tell You',
    3: 'Hear Evelyn\'s Final Message',
  };

  const unsubscribeToken = randomUUID();
  const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${unsubscribeToken}`;

  const fullHtml = buildFollowUpHtml({
    personaName: evelyn.displayName,
    emailBody: emailContent.bodyHtml,
    ctaUrl: magicUrl,
    ctaText: ctaLabels[sequenceNumber],
    unsubscribeUrl,
    privacyUrl: `${BASE_URL}/privacy`,
    avatarUrl,
  });

  const fullText = buildFollowUpText({
    personaName: evelyn.displayName,
    emailBody: emailContent.bodyText,
    ctaUrl: magicUrl,
    unsubscribeUrl,
  });

  // Save to DB as pending
  const record = await db
    .insert(migrationDripEmails)
    .values({
      userId: candidate.userId,
      sequenceNumber,
      recipientEmail: candidate.email,
      subject: emailContent.subject,
      bodyHtml: fullHtml,
      bodyText: fullText,
      status: 'pending',
      generatedBy: 'claude-haiku',
      generationTokens: emailContent.tokens,
      unsubscribeToken,
    })
    .returning({ id: migrationDripEmails.id });

  const recordId = record[0]?.id;

  if (!resend) {
    logger.warn('Migration drip: Resend not configured', { email: candidate.email, seq: sequenceNumber });
    return;
  }

  const fromEmail = evelyn.fromEmail || 'evelyn@theseerwithin.com';
  const fromName = evelyn.fromName || 'Evelyn Cross';

  try {
    const result = await fireWithBreaker(resendBreaker, () =>
      resend!.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: candidate.email,
        replyTo: fromEmail,
        subject: emailContent.subject,
        html: fullHtml,
        text: fullText,
        tags: [
          { name: 'type', value: 'migration_drip' },
          { name: 'sequence', value: String(sequenceNumber) },
          { name: 'user_id', value: candidate.userId },
        ],
      }),
    );

    if (result.error) {
      if (recordId) {
        await db.update(migrationDripEmails)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(migrationDripEmails.id, recordId));
      }
      throw new Error(result.error.message);
    }

    if (recordId) {
      await db.update(migrationDripEmails)
        .set({ status: 'sent', sentAt: new Date(), resendEmailId: result.data?.id || null, updatedAt: new Date() })
        .where(eq(migrationDripEmails.id, recordId));
    }

    logger.info('Migration drip sent', { email: candidate.email, seq: sequenceNumber, resendId: result.data?.id });
  } catch (error: any) {
    if (recordId) {
      await db.update(migrationDripEmails)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(migrationDripEmails.id, recordId));
    }
    throw error;
  }
}

/**
 * Generate personalized email content using Haiku.
 */
async function generateDripEmail(
  candidate: MigrationCandidate,
  sequenceNumber: 1 | 2 | 3,
  personaName: string,
): Promise<{ subject: string; bodyHtml: string; bodyText: string; tokens: number }> {
  const ctx = SEQUENCE_CONTEXT[sequenceNumber];

  const prompt = `You are ${personaName}, a warm and gifted spiritual guide.

${candidate.firstName} had a reading with you. Here is what you know:
- Area of focus: ${candidate.bucket || 'general guidance'}
${candidate.concern ? `- Their concern: ${candidate.concern}` : ''}
${candidate.deeperResponse ? `- Deeper context: ${candidate.deeperResponse}` : ''}
${candidate.vision ? `- Their vision/desires: ${candidate.vision}` : ''}
${candidate.emotionalResponse ? `- Emotional state: ${candidate.emotionalResponse}` : ''}
${candidate.location ? `- Location: ${candidate.location}` : ''}

This is email #${sequenceNumber} of 3 in a re-engagement sequence.
Tone: ${ctx.tone}
Angle: ${ctx.angle}
Sign off with: "${ctx.signOff}"

Rules:
- Stay fully in character as ${personaName}
- Use ${candidate.firstName}'s name at least once
- Reference something specific from their reading (concern, vision, or emotional state)
- Do NOT be pushy or use sales language — this is a spiritual message
- Do NOT mention "platform", "app", "website", or "account" — say "a new space" or "a place I've created"
${sequenceNumber === 1 ? '- Mention they have 3 free minutes waiting for them' : ''}
- Body: 80-150 words
- Subject line: under 60 characters, personal, not clickbait

Return ONLY valid JSON:
{
  "subject": "Your email subject line",
  "bodyText": "Plain text version",
  "bodyHtml": "<p>HTML version with basic formatting</p>"
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
    const tokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject || `${personaName} has a message for you`,
        bodyText: parsed.bodyText || '',
        bodyHtml: parsed.bodyHtml || `<p>${parsed.bodyText || ''}</p>`,
        tokens,
      };
    }
    throw new Error('Failed to parse Haiku response');
  } catch (error) {
    logger.error('Migration drip email generation failed, using fallback', {
      error: (error as Error).message,
      seq: sequenceNumber,
    });

    const bucketRef = candidate.bucket ? `our conversation about ${candidate.bucket}` : 'our reading together';

    const fallbacks = {
      1: {
        subject: `I've been thinking about you, ${candidate.firstName}`,
        body: `Dear ${candidate.firstName},\n\nIt's Evelyn. Since ${bucketRef}, I've been sensing there's more we need to explore. I've created a new space where we can continue our journey — and I've set aside 3 free minutes for you.\n\nI'll be here when you're ready.\n\nWith light,\nEvelyn`,
      },
      2: {
        subject: `Something is shifting around you, ${candidate.firstName}`,
        body: `Dear ${candidate.firstName},\n\nThe energies from ${bucketRef} have been speaking to me. There are shifts happening around what we explored together — things I sense you should know about.\n\nCome back when you can.\n\nThe signs are becoming clearer,\nEvelyn`,
      },
      3: {
        subject: `A final message from Evelyn`,
        body: `Dear ${candidate.firstName},\n\nI have held a feeling for you since our reading. I don't share such things lightly, but this one has stayed with me.\n\nWhenever you are ready to hear it, I will be waiting.\n\nI will be here when you are ready,\nEvelyn`,
      },
    };

    const fb = fallbacks[sequenceNumber];
    return {
      subject: fb.subject,
      bodyText: fb.body,
      bodyHtml: fb.body.split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join(''),
      tokens: 0,
    };
  }
}

/**
 * Get Evelyn Cross persona config.
 */
async function getEvelynConfig(): Promise<EvelynConfig | null> {
  const rows = await db
    .select({
      id: personas.id,
      displayName: personas.displayName,
      avatarUrl: personas.avatarUrl,
      fromEmail: personas.fromEmail,
      fromName: personas.fromName,
    })
    .from(personas)
    .where(eq(personas.slug, EVELYN_SLUG))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get migration drip stats for admin dashboard.
 * Only counts bulk-migrated users (V1 conversation created before 2026-03-18).
 */
export async function getMigrationDripStats(): Promise<{
  totalEligible: number;
  email1Sent: number;
  email2Sent: number;
  email3Sent: number;
  opened: number;
  clicked: number;
  loggedIn: number;
}> {
  // Migrated V1 = users whose linked conversation was created before the migration date
  const MIGRATION_DATE = '2026-03-18';
  const migratedUserFilter = sql`${users.migratedFromConversationId} IN (SELECT id FROM conversations WHERE created_at < ${MIGRATION_DATE})`;
  // Eligible = migrated users whose conversation has both concern AND vision filled (matches sendMigrationEmail1 filter)
  const eligibleFilter = sql`${users.migratedFromConversationId} IN (SELECT id FROM conversations WHERE created_at < ${MIGRATION_DATE} AND concern IS NOT NULL AND concern != '' AND vision IS NOT NULL AND vision != '')`;

  const [eligible, e1, e2, e3, opened, clicked, loggedIn] = await Promise.all([
    db.select({ c: count() }).from(users).where(
      and(eligibleFilter, isNull(users.lastLoginAt)),
    ),
    db.select({ c: count() }).from(migrationDripEmails)
      .innerJoin(users, eq(users.id, migrationDripEmails.userId))
      .where(and(migratedUserFilter, eq(migrationDripEmails.sequenceNumber, 1), eq(migrationDripEmails.status, 'sent'))),
    db.select({ c: count() }).from(migrationDripEmails)
      .innerJoin(users, eq(users.id, migrationDripEmails.userId))
      .where(and(migratedUserFilter, eq(migrationDripEmails.sequenceNumber, 2), eq(migrationDripEmails.status, 'sent'))),
    db.select({ c: count() }).from(migrationDripEmails)
      .innerJoin(users, eq(users.id, migrationDripEmails.userId))
      .where(and(migratedUserFilter, eq(migrationDripEmails.sequenceNumber, 3), eq(migrationDripEmails.status, 'sent'))),
    db.select({ c: count() }).from(migrationDripEmails)
      .innerJoin(users, eq(users.id, migrationDripEmails.userId))
      .where(and(migratedUserFilter, sql`${migrationDripEmails.openedAt} IS NOT NULL`)),
    db.select({ c: count() }).from(migrationDripEmails)
      .innerJoin(users, eq(users.id, migrationDripEmails.userId))
      .where(and(migratedUserFilter, sql`${migrationDripEmails.clickedAt} IS NOT NULL`)),
    db.select({ c: count() }).from(users).where(
      and(migratedUserFilter, sql`${users.lastLoginAt} IS NOT NULL`),
    ),
  ]);

  return {
    totalEligible: eligible[0]?.c ?? 0,
    email1Sent: e1[0]?.c ?? 0,
    email2Sent: e2[0]?.c ?? 0,
    email3Sent: e3[0]?.c ?? 0,
    opened: opened[0]?.c ?? 0,
    clicked: clicked[0]?.c ?? 0,
    loggedIn: loggedIn[0]?.c ?? 0,
  };
}
