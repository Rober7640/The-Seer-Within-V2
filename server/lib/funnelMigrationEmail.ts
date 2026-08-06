// Funnel-to-V2 Migration Email: When a V1 funnel user reaches DEEPENING_2
// or later, auto-create a V2 account and send a Haiku-personalized email
// from Evelyn Cross inviting them to continue on the new platform.
//
// Trigger: called from POST /api/save-progress when conversationState is
// DEEPENING_2 or beyond.

import { anthropicFailover as anthropic } from './anthropicWithFailover';
import { getModelForOperation } from './modelConfig';
import { Resend } from 'resend';
import { db } from './db';
import { users, personas, userMemory, conversations, migrationDripEmails } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { buildFollowUpHtml, buildFollowUpText } from './emailTemplate';
import { generateMagicLinkToken } from './magicLink';
import logger from './logger';
import { fireWithBreaker, resendBreaker, anthropicBreaker } from './circuitBreaker';
import { buildFunnelTags } from './resendFunnelTags';
import { minutesToCoins } from '@shared/types';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
// 3 minutes. Dollar-wallet: a coin is a cent, so 3:00 at the default rate = 897¢
// (was 180 coins/3min @ 60/min — missed at the 2026-07-28 flip, which handed every
// migrated V1 customer 36 seconds instead of 3 minutes until 2026-08-03).
const FREE_COINS = minutesToCoins(3);
const EVELYN_SLUG = 'evelyn-cross';

// States that qualify for Tier 1 migration (DEEPENING_2 and beyond)
const TIER1_STATES = new Set([
  'DEEPENING_2',
  'FUTURE_PACING',
  'FUTURE_VALIDATION',
  'CRISIS_REVEAL',
  'CRISIS_COST',
  'PERMISSION_ASK',
  'PITCH',
  'OBJECTION_HANDLING',
  'DOWNSELL',
  'END',
  'COMPLETE',
]);

interface FunnelUserData {
  email: string;
  firstName: string;
  bucket?: string;
  subBucket?: string;
  concern?: string;
  deeperResponse?: string;
  vision?: string;
  emotionalResponse?: string;
  blockSource?: string;
  personName?: string;
  location?: string;
  timeOfDay?: string;
}

/**
 * Check if a conversation state qualifies for Tier 1 migration.
 */
export function isTier1State(state: string): boolean {
  return TIER1_STATES.has(state);
}

/**
 * Auto-create a V2 account for a V1 funnel user and send a personalized
 * migration email from Evelyn Cross. Non-blocking — errors are logged,
 * not thrown.
 */
export async function migrateAndEmailFunnelUser(
  userData: FunnelUserData,
  conversationId?: string,
): Promise<void> {
  const email = userData.email.toLowerCase();

  try {
    // Skip if user already has a V2 account
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      return; // Already migrated — nothing to do
    }

    // Get Evelyn Cross persona
    const evelynRows = await db
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

    if (!evelynRows[0]) {
      logger.error('Funnel migration: Evelyn Cross persona not found');
      return;
    }

    const evelyn = evelynRows[0];

    // Find the conversation ID if not provided, and read its price_variant so
    // the migration email can be tagged with the owning ad-funnel (see
    // buildFunnelTags — flag-gated, additive only).
    let priceVariant: string | null = null;
    if (!conversationId) {
      const convoRows = await db
        .select({ id: conversations.id, priceVariant: conversations.priceVariant })
        .from(conversations)
        .where(eq(conversations.email, userData.email))
        .limit(1);
      conversationId = convoRows[0]?.id;
      priceVariant = convoRows[0]?.priceVariant ?? null;
    } else {
      const convoRows = await db
        .select({ priceVariant: conversations.priceVariant })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      priceVariant = convoRows[0]?.priceVariant ?? null;
    }

    // ─── Step 1: Create V2 user account ────────────────────────
    const tempPassword = randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const inserted = await db
      .insert(users)
      .values({
        email: userData.email, // preserve original casing
        passwordHash,
        firstName: userData.firstName || 'Friend',
        location: userData.location || null,
        emailVerified: true,
        coinBalance: FREE_COINS,
        totalCoinsUsed: 0,
        defaultPersonaId: evelyn.id,
        accountStatus: 'active',
        migratedFromConversationId: conversationId || null,
      })
      .returning({ id: users.id });

    const userId = inserted[0]?.id;
    if (!userId) {
      logger.error('Funnel migration: failed to create user', { email });
      return;
    }

    logger.info('Funnel migration: user created', { email, userId });

    // ─── Step 2: Seed memory ───────────────────────────────────
    const summaryParts: string[] = [];
    if (userData.bucket) summaryParts.push(`Area of focus: ${userData.bucket}`);
    if (userData.concern) summaryParts.push(`Main concern: ${userData.concern}`);
    if (userData.personName) summaryParts.push(`Important person: ${userData.personName}`);
    if (userData.vision) summaryParts.push(`Vision/desires: ${userData.vision}`);
    if (userData.emotionalResponse) summaryParts.push(`Emotional state: ${userData.emotionalResponse}`);
    if (userData.location) summaryParts.push(`Location: ${userData.location}`);

    if (summaryParts.length > 0) {
      const fullContext: Record<string, unknown> = {
        source: 'v1_funnel_realtime',
        bucket: userData.bucket,
        subBucket: userData.subBucket,
        concern: userData.concern,
        personName: userData.personName,
        vision: userData.vision,
        deeperResponse: userData.deeperResponse,
        emotionalResponse: userData.emotionalResponse,
        blockSource: userData.blockSource,
        location: userData.location,
        timeOfDay: userData.timeOfDay,
        keyTopics: [userData.bucket, userData.subBucket].filter(Boolean),
        nextSessionContext: userData.concern
          ? `User previously discussed: ${userData.concern}. Pick up where you left off naturally.`
          : undefined,
      };

      await db.insert(userMemory).values({
        userId,
        personaId: evelyn.id,
        memoryType: 'long_term_context',
        summary: `From initial reading: ${summaryParts.join('. ')}`,
        fullContext: JSON.stringify(fullContext),
        importance: 8,
        category: userData.bucket || 'general',
      });
    }

    // ─── Step 3: Generate personalized email via Haiku ─────────
    const emailContent = await generateMigrationEmail(userData, evelyn.displayName);

    // ─── Step 4: Send via Resend ───────────────────────────────
    const magicToken = await generateMagicLinkToken(userId, evelyn.id, EVELYN_SLUG);
    const magicUrl = `${BASE_URL}/magic-auth?t=${magicToken}`;

    const avatarUrl = evelyn.avatarUrl
      ? (evelyn.avatarUrl.startsWith('http') ? evelyn.avatarUrl : `${BASE_URL}${evelyn.avatarUrl}`)
      : undefined;

    const unsubscribeToken = randomUUID();
    const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${unsubscribeToken}`;

    const fullHtml = buildFollowUpHtml({
      personaName: evelyn.displayName,
      emailBody: emailContent.bodyHtml,
      ctaUrl: magicUrl,
      ctaText: 'Pick Up Where You Left Off',
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

    // Track in migration_drip_emails table (Email 1)
    const record = await db
      .insert(migrationDripEmails)
      .values({
        userId,
        sequenceNumber: 1,
        recipientEmail: userData.email,
        subject: emailContent.subject,
        bodyHtml: fullHtml,
        bodyText: fullText,
        status: 'pending',
        generatedBy: 'claude-haiku',
        unsubscribeToken,
      })
      .returning({ id: migrationDripEmails.id });

    const recordId = record[0]?.id;

    if (!resend) {
      logger.warn('Funnel migration: Resend not configured, email not sent', { email });
      return;
    }

    const fromEmail = evelyn.fromEmail || 'evelyn@theseerwithin.com';
    const fromName = evelyn.fromName || 'Evelyn Cross';

    const result = await fireWithBreaker(resendBreaker, () =>
      resend!.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: userData.email,
        replyTo: fromEmail,
        subject: emailContent.subject,
        html: fullHtml,
        text: fullText,
        tags: [
          { name: 'type', value: 'funnel_migration' },
          { name: 'sequence', value: '1' },
          { name: 'user_id', value: userId },
          ...buildFunnelTags(priceVariant),
        ],
      }),
    );

    if (result.error) {
      if (recordId) {
        await db.update(migrationDripEmails)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(migrationDripEmails.id, recordId));
      }
      logger.error('Funnel migration: email send failed', {
        email,
        error: result.error.message,
      });
    } else {
      if (recordId) {
        await db.update(migrationDripEmails)
          .set({ status: 'sent', sentAt: new Date(), resendEmailId: result.data?.id || null, updatedAt: new Date() })
          .where(eq(migrationDripEmails.id, recordId));
      }
      logger.info('Funnel migration: email sent', {
        email,
        resendId: result.data?.id,
      });
    }
  } catch (error: any) {
    // Non-blocking — log and move on
    logger.error('Funnel migration error', {
      email,
      error: error?.message,
    });
  }
}

/**
 * Generate a personalized migration email using Claude Haiku.
 */
async function generateMigrationEmail(
  userData: FunnelUserData,
  personaName: string,
): Promise<{ subject: string; bodyHtml: string; bodyText: string }> {
  const prompt = `You are ${personaName}, a warm and gifted spiritual guide.

${userData.firstName} just had a reading with you. Here is what you know about them:
- Area of focus: ${userData.bucket || 'general guidance'}
${userData.concern ? `- Their concern: ${userData.concern}` : ''}
${userData.deeperResponse ? `- Deeper context: ${userData.deeperResponse}` : ''}
${userData.vision ? `- Their vision/desires: ${userData.vision}` : ''}
${userData.emotionalResponse ? `- Emotional state: ${userData.emotionalResponse}` : ''}
${userData.location ? `- Location: ${userData.location}` : ''}

Write a warm, personal email inviting ${userData.firstName} to continue their journey with you on a new platform where they can chat with you anytime. Include this exact sentence somewhere in the body: "I've set aside 3 minutes for you to ask anything and explore today's insights. Start your private conversation."

Rules:
- Stay fully in character as ${personaName}
- Reference ONE specific detail from their reading naturally (their concern or emotional state)
- Do NOT be pushy or use sales language — this is a spiritual message
- Do NOT mention "platform", "app", "website", or "account" — say "a new space" or "a place I've created"
- Body: 80-150 words
- Subject line: under 60 characters, personal, references their situation

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

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject || `${personaName} has a message for you, ${userData.firstName}`,
        bodyText: parsed.bodyText || '',
        bodyHtml: parsed.bodyHtml || `<p>${parsed.bodyText || ''}</p>`,
      };
    }

    throw new Error('Failed to parse Haiku response');
  } catch (error) {
    logger.error('Funnel migration email generation failed, using fallback', {
      error: (error as Error).message,
    });

    // Fallback — still references their bucket if available
    const bucketRef = userData.bucket
      ? `our conversation about ${userData.bucket}`
      : 'our reading together';

    const fallbackBody = `Dear ${userData.firstName},

It's Evelyn. I hope this message finds you well.

Since ${bucketRef}, I've been sensing that there's more we need to explore. That feeling hasn't faded — if anything, it's grown stronger.

I've created a new space where we can continue our journey together — a place where you can return to me anytime, and even connect with other gifted advisors who each bring their own unique sight.

I've set aside 3 minutes for you to ask anything and explore today's insights. Start your private conversation.

I'll be here when you're ready.

With light,
Evelyn`;

    return {
      subject: `I've been thinking about you, ${userData.firstName}`,
      bodyText: fallbackBody,
      bodyHtml: fallbackBody
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join(''),
    };
  }
}
