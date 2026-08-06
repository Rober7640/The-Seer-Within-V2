// Funnel-to-Chat-Service migration bridge.
// Allows System 1 (funnel) customers to auto-create System 2 (chat service) accounts.

import { db } from './db';
import { conversations, users, userMemory } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from './auth';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import logger from './logger';
import { fireWithBreaker, resendBreaker } from './circuitBreaker';
import { minutesToCoins } from '@shared/types';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FOLLOW_UP_FROM_EMAIL || 'noreply@theseerwithin.com';
const FROM_NAME = process.env.FOLLOW_UP_FROM_NAME || 'The Seer Within';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface MigrationEligibility {
  eligible: boolean;
  reason?: string;
  alreadyMigrated?: boolean;
  conversationId?: string;
  firstName?: string;
  purchased?: boolean;
}

interface MigrationResult {
  success: boolean;
  userId?: string;
  tempPassword?: string;
  coinBalance?: number;
  error?: string;
}

/**
 * Check if a funnel email is eligible for migration to chat service.
 */
export async function checkMigrationEligibility(email: string): Promise<MigrationEligibility> {
  const normalizedEmail = email.toLowerCase();

  // Check if already has a chat service account
  const existingUser = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      eligible: false,
      reason: 'Account already exists for this email',
      alreadyMigrated: true,
    };
  }

  // Check if they have a funnel conversation with a purchase
  const conversation = await db.select()
    .from(conversations)
    .where(eq(conversations.email, normalizedEmail))
    .limit(1);

  if (conversation.length === 0) {
    return {
      eligible: false,
      reason: 'No purchase found for this email',
    };
  }

  const conv = conversation[0];

  if (!conv.purchased) {
    return {
      eligible: false,
      reason: 'No completed purchase found',
    };
  }

  return {
    eligible: true,
    conversationId: conv.id,
    firstName: conv.firstName,
    purchased: conv.purchased ?? false,
  };
}

/**
 * Migrate a funnel customer to a chat service account.
 * Creates account with secure random password, bonus credits, and seeds memory.
 */
export async function migrateFunnelCustomer(email: string): Promise<MigrationResult> {
  const normalizedEmail = email.toLowerCase();

  // Verify eligibility
  const eligibility = await checkMigrationEligibility(normalizedEmail);
  if (!eligibility.eligible) {
    if (eligibility.alreadyMigrated) {
      return { success: false, error: 'Account already exists. Please sign in.' };
    }
    return { success: false, error: eligibility.reason || 'Not eligible for migration' };
  }

  // Load the full conversation
  const convResult = await db.select()
    .from(conversations)
    .where(eq(conversations.id, eligibility.conversationId!))
    .limit(1);

  const conv = convResult[0];
  if (!conv) {
    return { success: false, error: 'Conversation not found' };
  }

  // Generate secure temporary password
  const tempPassword = randomBytes(12).toString('base64url').slice(0, 16);
  const passwordHash = await hashPassword(tempPassword);

  // Calculate bonus credits based on purchase tier. Expressed in MINUTES so the
  // coin amounts follow the wallet rate — the literals here (900/300/600) were
  // 15/5/10 minutes at the pre-2026-07-28 rate of 60 coins/min and were missed at
  // the flip, so a full-stack buyer got 1,800 coins = 6 minutes instead of 30.
  let bonusCoins = minutesToCoins(15); // base bonus for any purchase (was 900 @ 60/min)
  if (conv.upsellPurchased) bonusCoins += minutesToCoins(5);   // was 300 @ 60/min
  if (conv.upsell2Purchased) bonusCoins += minutesToCoins(10); // was 600 @ 60/min
  const totalCredits = bonusCoins;

  try {
    // Create user account (email already verified since they're a paid customer)
    const newUser = await db.insert(users).values({
      email: normalizedEmail,
      passwordHash,
      firstName: conv.firstName || 'Friend',
      location: conv.location || null,
      coinBalance: totalCredits,
      emailVerified: true, // Bypass verification for paid customers
      migratedFromConversationId: conv.id,
    }).returning();

    const user = newUser[0];
    if (!user) {
      return { success: false, error: 'Failed to create account' };
    }

    // Seed memory from funnel conversation data
    if (conv.concern || conv.personName || conv.bucket) {
      const fullContext: Record<string, unknown> = {
        source: 'funnel_migration',
        bucket: conv.bucket,
        subBucket: conv.subBucket,
        concern: conv.concern,
        personName: conv.personName,
        vision: conv.vision,
        deeperResponse: conv.deeperResponse,
        emotionalResponse: conv.emotionalResponse,
        funnelDate: conv.createdAt,
        purchased: conv.purchased,
      };

      const summaryParts: string[] = [];
      if (conv.bucket) summaryParts.push(`Area of focus: ${conv.bucket}`);
      if (conv.concern) summaryParts.push(`Main concern: ${conv.concern}`);
      if (conv.personName) summaryParts.push(`Important person: ${conv.personName}`);
      if (conv.vision) summaryParts.push(`Vision/desires: ${conv.vision}`);

      const summary = summaryParts.length > 0
        ? `From initial reading: ${summaryParts.join('. ')}`
        : 'User went through initial reading funnel';

      await db.insert(userMemory).values({
        userId: user.id,
        memoryType: 'long_term_context',
        summary,
        fullContext: JSON.stringify(fullContext),
        importance: 8,
        category: conv.bucket || 'general',
      });
    }

    // Send welcome email with password reset link (non-blocking)
    sendWelcomeEmail(normalizedEmail, conv.firstName || 'Friend', tempPassword, totalCredits)
      .catch((err) => logger.error('Failed to send migration welcome email:', err));

    return {
      success: true,
      userId: user.id,
      tempPassword,
      coinBalance: totalCredits,
    };
  } catch (error: any) {
    logger.error('Migration error:', error);
    return { success: false, error: 'Migration failed. Please try again.' };
  }
}

async function sendWelcomeEmail(
  email: string,
  firstName: string,
  tempPassword: string,
  coinBalance: number,
): Promise<void> {
  const loginUrl = `${BASE_URL}/login?migrated=true`;

  const safeFirstName = escapeHtml(firstName);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(tempPassword);
  const safeLoginUrl = escapeHtml(loginUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Chat Service Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0a1a; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0a1a;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #1a1128; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="text-align: center; padding: 30px 20px 20px; background: linear-gradient(180deg, #1a0a2e 0%, #1a1128 100%);">
              <div style="font-size: 24px; color: #c4a0ff; font-weight: normal; letter-spacing: 1px;">Welcome to Your Chat Service</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; line-height: 1.7; font-size: 16px; color: #e8e0f0;">
              <p>Dear ${safeFirstName},</p>
              <p>Thank you for your purchase! Your personal chat service account has been created with <strong>${coinBalance} bonus coins</strong> of guidance.</p>
              <p>Your temporary login credentials:</p>
              <div style="background: #0f0a1a; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
                <p style="margin: 0;"><strong>Temporary Password:</strong> ${safePassword}</p>
              </div>
              <p>Please sign in and change your password as soon as possible.</p>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding: 10px 20px 30px;">
              <a href="${safeLoginUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #4A148C 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Sign In Now</a>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding: 20px 30px; font-size: 12px; color: #8a7aa0;">
              <p style="margin: 0;">If you did not make this purchase, please contact support.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Welcome to Your Chat Service

Dear ${firstName},

Thank you for your purchase! Your personal chat service account has been created with ${coinBalance} bonus coins of guidance.

Your temporary login credentials:
Email: ${email}
Temporary Password: ${tempPassword}

Please sign in and change your password as soon as possible.

Sign in: ${loginUrl}

If you did not make this purchase, please contact support.`;

  if (!resend) {
    logger.warn(`[Migration] Resend not configured. Temp password for ${email}: ${tempPassword}`);
    return;
  }

  const result = await fireWithBreaker(resendBreaker, () =>
    resend!.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `Your Chat Service Account - ${coinBalance} Bonus Coins`,
      html,
      text,
      tags: [
        { name: 'type', value: 'migration_welcome' },
      ],
    }),
  );

  if (result.error) {
    logger.error(`[Migration] Email send error for ${email}:`, result.error);
  } else {
    logger.info(`[Migration] Welcome email sent to ${email}, id: ${result.data?.id}`);
  }
}
