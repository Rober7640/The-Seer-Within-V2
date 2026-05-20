// Soulmate lander → V2 account handoff.
//
// Triggered fire-and-forget from POST /api/soulmate/lead the moment the
// /soulmate landing form is submitted, regardless of whether the user later
// purchases. Mirrors the /evelyn lander pattern:
//   - New email   → passwordless V2 user (defaultPersonaId=evelyn-cross,
//                   signupFunnel='soulmate'), standard verification email.
//                   5-min (300-coin) grant lands at /verify-email via
//                   isFromSoulmateLander() check in auth.ts.
//   - Existing    → no duplicate, no re-grant; send a magic-link to the
//                   existing account scoped to Evelyn.
//
// Errors are caught and logged here so the AWeber-lead path in /api/soulmate/lead
// never blocks the form-submit response.

import { randomUUID } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import { soulmateLanderSessions, users, personas } from '@shared/schema';
import { sendVerificationEmail } from './verificationEmail';
import { generateMagicLinkToken } from './magicLink';
import logger from './logger';

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

interface CreateArgs {
  email: string;
  firstName: string;
  landerPath?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createSoulmateLanderV2Account(args: CreateArgs): Promise<void> {
  const emailLc = args.email.trim().toLowerCase();
  const firstName = args.firstName.trim();

  try {
    // Resolve Evelyn persona once — all soulmate handoffs route to her.
    const evelynRow = await db.select({ id: personas.id })
      .from(personas)
      .where(eq(personas.slug, 'evelyn-cross'))
      .limit(1);
    const evelynId = evelynRow[0]?.id;
    if (!evelynId) {
      logger.error('[soulmate-handoff] evelyn-cross persona not found — aborting V2 account creation');
      return;
    }

    // Existing user? Send magic-link, link the session row, return.
    const existing = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      accountStatus: users.accountStatus,
    })
      .from(users)
      .where(eq(users.email, emailLc))
      .limit(1);

    if (existing[0]) {
      const user = existing[0];

      // Always record the lander touch — useful for attribution even when
      // the user already had a V2 account.
      await db.insert(soulmateLanderSessions).values({
        email: emailLc,
        firstName,
        resolvedUserId: user.id,
        landerPath: args.landerPath,
        utmSource: args.utmSource,
        utmCampaign: args.utmCampaign,
        utmMedium: args.utmMedium,
        ipAddress: args.ipAddress ?? null,
        userAgent: args.userAgent ?? null,
      });

      if (user.accountStatus === 'banned') {
        logger.info('[soulmate-handoff] existing account banned — skipping magic link', { userId: user.id });
        return;
      }

      const magicToken = await generateMagicLinkToken(user.id, evelynId, 'evelyn-cross');
      const magicUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/magic-auth?t=${magicToken}`;

      const { Resend } = await import('resend');
      const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
      if (resendClient) {
        await resendClient.emails.send({
          from: `The Seer Within <${process.env.FOLLOW_UP_FROM_EMAIL || 'noreply@theseerwithin.com'}>`,
          to: user.email ?? emailLc,
          subject: 'Your Evelyn chat is ready',
          html: `<p>Hi ${user.firstName || firstName || 'there'},</p><p>Your soulmate sketch is on its way. While you wait, Evelyn would like to talk with you — click below to open your free chat:</p><p style="margin:24px 0"><a href="${magicUrl}" style="background:#6d28d9;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Open Evelyn Chat</a></p><p style="color:#888;font-size:13px">This link expires in 30 days.</p>`,
        });
        logger.info('[soulmate-handoff] magic-link sent to existing account', { userId: user.id });
      } else {
        logger.warn('[soulmate-handoff] Resend not configured — magic URL:', magicUrl);
      }
      return;
    }

    // New user: passwordless registration mirroring /magic-register, with
    // persona=evelyn-cross and signupFunnel='soulmate'. Coin grant deferred
    // to /verify-email/:token where isFromSoulmateLander() applies 300 coins.
    const verificationToken = randomUUID();
    const newUser = await db.insert(users).values({
      email: emailLc,
      passwordHash: null,
      firstName,
      coinBalance: 0,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiry: sql`NOW() + INTERVAL '${sql.raw(String(VERIFICATION_TOKEN_EXPIRY_HOURS))} hours'`,
      registrationIp: args.ipAddress ?? null,
      registrationUserAgent: args.userAgent ?? null,
      defaultPersonaId: evelynId,
      signupFunnel: 'soulmate',
    }).returning({ id: users.id, email: users.email });

    const user = newUser[0];

    await db.insert(soulmateLanderSessions).values({
      email: emailLc,
      firstName,
      resolvedUserId: user.id,
      landerPath: args.landerPath,
      utmSource: args.utmSource,
      utmCampaign: args.utmCampaign,
      utmMedium: args.utmMedium,
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
    });

    await sendVerificationEmail(user.email, firstName, verificationToken, 'evelyn-cross', 'soulmate-lander');
    logger.info('[soulmate-handoff] new V2 user created + verification email sent', { userId: user.id });
  } catch (err: any) {
    logger.error('[soulmate-handoff] V2 account creation failed (non-blocking)', { err: err?.message });
  }
}
