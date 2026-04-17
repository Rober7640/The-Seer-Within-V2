import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '../lib/db';
import { users, personas, chatSessions, userMemory, aidenQuizSessions } from '@shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateToken, requireAuth } from '../lib/auth';
import { verifyMagicLinkToken, generateMagicLinkToken } from '../lib/magicLink';
import { authLimiter, passwordResetLimiter } from '../lib/rateLimiter';
import { sendVerificationEmail } from '../lib/verificationEmail';
import { sendPasswordResetEmail } from '../lib/passwordResetEmail';
import {
  checkRegistrationFraud,
  extractClientIp,
  extractUserAgent,
  extractFingerprint,
  serializeAccountFlags,
} from '../lib/fraudDetection';
import { isPersonaOnline } from '../lib/personaManager';
import { endChatSession } from '../lib/creditTracking';
import logger from '../lib/logger';

const FREE_COINS_ON_VERIFY = 180;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  persona: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

// Verification expiry is computed in PostgreSQL via sql`NOW() + INTERVAL ...`
// to avoid JS timezone serialization bugs with "timestamp without timezone" columns.

// POST /api/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { email, password, firstName, persona } = parseResult.data;

    // Check if email already exists
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);

    // Extract fraud detection signals
    const clientIp = extractClientIp(req);
    const userAgent = extractUserAgent(req);
    const fingerprint = extractFingerprint(req);

    // Check for fraud patterns before creating account
    const fraudCheck = await checkRegistrationFraud(clientIp, fingerprint);

    // In test environments, auto-verify email and grant coins immediately
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

    // Generate email verification token
    const verificationToken = randomUUID();

    const newUser = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      coinBalance: isTestEnv ? FREE_COINS_ON_VERIFY : 0,
      emailVerified: isTestEnv,
      verificationToken: isTestEnv ? null : verificationToken,
      verificationTokenExpiry: isTestEnv ? null : sql`NOW() + INTERVAL '${sql.raw(String(VERIFICATION_TOKEN_EXPIRY_HOURS))} hours'`,
      registrationIp: clientIp,
      registrationUserAgent: userAgent,
      deviceFingerprint: fingerprint,
      accountFlags: fraudCheck.flagged ? serializeAccountFlags(fraudCheck.flags) : null,
    }).returning();

    const user = newUser[0];
    const token = generateToken(user.id, user.email);

    // Send verification email only in non-test environments
    if (!isTestEnv) {
      sendVerificationEmail(user.email, user.firstName, verificationToken, persona).catch((err) => {
        logger.error('Failed to send verification email:', err);
      });
    }

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        coinBalance: user.coinBalance,
        emailVerified: user.emailVerified,
      },
      requiresVerification: !isTestEnv,
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/magic-register - Passwordless registration for quiz funnel (Version B)
const magicRegisterSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, 'First name is required'),
  confirmed18Plus: z.boolean().refine(v => v === true, 'Must confirm you are 18 or older'),
  persona: z.string().optional().default('aiden-powers'),
  quizSessionToken: z.string().optional(),
  quizData: z.object({
    topic: z.string(),
    feeling: z.string(),
    outcome: z.string(),
  }).optional(),
});

router.post('/magic-register', authLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = magicRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { email, firstName, persona, quizSessionToken, quizData } = parseResult.data;

    // Check if email already exists
    const existing = await db.select({ id: users.id, firstName: users.firstName, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        error: 'An account with this email already exists.',
        code: 'EXISTING_ACCOUNT',
        firstName: existing[0].firstName,
        hasPassword: !!existing[0].passwordHash,
      });
      return;
    }

    // Extract fraud detection signals
    const clientIp = extractClientIp(req);
    const userAgent = extractUserAgent(req);
    const fingerprint = extractFingerprint(req);

    // Check for fraud patterns before creating account
    const fraudCheck = await checkRegistrationFraud(clientIp, fingerprint);

    // In test environments, auto-verify email and grant coins immediately
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

    // Generate email verification token
    const verificationToken = randomUUID();

    const newUser = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash: null,
      firstName,
      confirmed18Plus: true,
      confirmed18PlusAt: new Date(),
      coinBalance: isTestEnv ? FREE_COINS_ON_VERIFY : 0,
      emailVerified: isTestEnv,
      verificationToken: isTestEnv ? null : verificationToken,
      verificationTokenExpiry: isTestEnv ? null : sql`NOW() + INTERVAL '${sql.raw(String(VERIFICATION_TOKEN_EXPIRY_HOURS))} hours'`,
      registrationIp: clientIp,
      registrationUserAgent: userAgent,
      deviceFingerprint: fingerprint,
      accountFlags: fraudCheck.flagged ? serializeAccountFlags(fraudCheck.flags) : null,
    }).returning();

    const user = newUser[0];
    const token = generateToken(user.id, user.email);

    // Store quiz data as a user memory for system prompt injection
    if (quizData) {
      // Look up persona ID for the memory record
      const personaRow = await db.select({ id: personas.id })
        .from(personas)
        .where(eq(personas.slug, persona))
        .limit(1);

      const personaId = personaRow[0]?.id || null;

      await db.insert(userMemory).values({
        userId: user.id,
        personaId,
        memoryType: 'quiz_intake',
        summary: `User's quiz intake: Topic: ${quizData.topic}, Feeling: ${quizData.feeling}, Desired outcome: ${quizData.outcome}`,
        fullContext: JSON.stringify(quizData),
        importance: 9,
        category: quizData.topic === 'love_relationships' ? 'love' : quizData.topic === 'career_money' ? 'money' : 'general',
      });
    }

    // Link quiz session to user if token provided
    if (quizSessionToken) {
      await db.update(aidenQuizSessions)
        .set({
          userId: user.id,
          email: email.toLowerCase(),
          completedSignup: true,
          signedUpAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aidenQuizSessions.sessionToken, quizSessionToken));
    }

    // Send verification email only in non-test environments
    if (!isTestEnv) {
      sendVerificationEmail(user.email, user.firstName, verificationToken, persona).catch((err) => {
        logger.error('Failed to send verification email:', err);
      });
    }

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        coinBalance: user.coinBalance,
        emailVerified: user.emailVerified,
      },
      requiresVerification: !isTestEnv,
    });
  } catch (error) {
    logger.error('Magic register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/verify-email/:token - Verify email and grant free credits
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 10) {
      res.status(400).json({ error: 'Invalid verification token' });
      return;
    }

    const result = await db.select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);

    const user = result[0];
    if (!user) {
      // Token was already used (cleared after first verification) or never existed.
      // Redirect to login with a friendly message instead of raw JSON error.
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      res.redirect(`${baseUrl}/login?verified=already`);
      return;
    }

    // Check if already verified — still auto-login so the link works from any device
    if (user.emailVerified) {
      const jwtToken = generateToken(user.id, user.email);
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      res.redirect(`${baseUrl}/login?verified=already&token=${jwtToken}`);
      return;
    }

    // Check token expiry
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      res.status(410).json({ error: 'Verification link has expired. Please request a new one.' });
      return;
    }

    // Mark email as verified and grant free credits (atomic increment + guard against double-verify)
    await db.update(users)
      .set({
        emailVerified: true,
        coinBalance: sql`coin_balance + ${FREE_COINS_ON_VERIFY}`,
        verificationToken: null,
        verificationTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, user.id), eq(users.emailVerified, false)));

    // Generate JWT so the user is auto-logged-in (works even on a different device/browser)
    const jwtToken = generateToken(user.id, user.email);
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

    // Include persona slug so cross-device verification preserves persona context (BUG-3)
    // Priority: query param from signup link > user's default persona from DB
    let personaParam = '';
    const queryPersona = req.query.persona as string | undefined;
    if (queryPersona) {
      personaParam = `&persona=${encodeURIComponent(queryPersona)}`;
    } else if (user.defaultPersonaId) {
      const personaRow = await db.select({ slug: personas.slug })
        .from(personas)
        .where(eq(personas.id, user.defaultPersonaId))
        .limit(1);
      if (personaRow[0]?.slug) {
        personaParam = `&persona=${personaRow[0].slug}`;
      }
    }
    res.redirect(`${baseUrl}/login?verified=success&token=${jwtToken}${personaParam}`);
  } catch (error) {
    logger.error('Verify email error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/resend-verification - Resend verification email (rate limited)
router.post('/resend-verification', authLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = resendVerificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { email } = parseResult.data;

    const result = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const user = result[0];

    // Always return success to avoid leaking account existence
    if (!user || user.emailVerified) {
      res.json({ success: true, message: 'If an unverified account exists, a verification email has been sent.' });
      return;
    }

    // Generate new token
    const verificationToken = randomUUID();

    await db.update(users)
      .set({
        verificationToken,
        verificationTokenExpiry: sql`NOW() + INTERVAL '${sql.raw(String(VERIFICATION_TOKEN_EXPIRY_HOURS))} hours'`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(users.id, user.id));

    await sendVerificationEmail(user.email, user.firstName, verificationToken);

    res.json({ success: true, message: 'If an unverified account exists, a verification email has been sent.' });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// POST /api/auth/send-magic-login - Send a magic sign-in link for passwordless accounts
router.post('/send-magic-login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email required' });
      return;
    }

    const result = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      passwordHash: users.passwordHash,
      defaultPersonaId: users.defaultPersonaId,
      accountStatus: users.accountStatus,
    })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const user = result[0];

    // Always return success to avoid leaking account existence
    if (!user || user.accountStatus === 'banned') {
      res.json({ sent: true });
      return;
    }

    // Find the user's last persona or default to aiden-powers
    const lastSession = await db.select({ personaId: chatSessions.personaId })
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id))
      .orderBy(sql`created_at DESC`)
      .limit(1);

    let personaId = lastSession[0]?.personaId || user.defaultPersonaId;
    let personaSlug = 'aiden-powers';

    if (personaId) {
      const p = await db.select({ slug: personas.slug })
        .from(personas)
        .where(eq(personas.id, personaId))
        .limit(1);
      if (p[0]) personaSlug = p[0].slug;
    } else {
      const aiden = await db.select({ id: personas.id })
        .from(personas)
        .where(eq(personas.slug, 'aiden-powers'))
        .limit(1);
      if (aiden[0]) personaId = aiden[0].id;
    }

    if (personaId) {
      const magicToken = await generateMagicLinkToken(user.id, personaId, personaSlug);
      const magicUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/magic-auth?t=${magicToken}`;

      const { Resend } = await import('resend');
      const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
      if (resendClient) {
        await resendClient.emails.send({
          from: `The Seer Within <${process.env.FOLLOW_UP_FROM_EMAIL || 'noreply@theseerwithin.com'}>`,
          to: user.email,
          subject: 'Your sign-in link',
          html: `<p>Hi ${user.firstName || 'there'},</p><p>Click the button below to sign in to your reading:</p><p style="margin:24px 0"><a href="${magicUrl}" style="background:#6d28d9;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Sign In to My Reading</a></p><p style="color:#888;font-size:13px">This link expires in 30 days.</p>`,
        });
        logger.info('Magic sign-in link sent via send-magic-login', { email: user.email, personaSlug });
      } else {
        logger.warn('Resend not configured, magic link URL:', magicUrl);
      }
    }

    res.json({ sent: true });
  } catch (error) {
    logger.error('send-magic-login error:', error);
    res.status(500).json({ error: 'Failed to send sign-in link' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { email, password } = parseResult.data;

    const result = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const user = result[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Magic-register accounts have no password — send a magic sign-in link
    if (!user.passwordHash) {
      // Find the user's last persona (or default to aiden-powers for rescue hatch users)
      const lastSession = await db.select({ personaId: chatSessions.personaId })
        .from(chatSessions)
        .where(eq(chatSessions.userId, user.id))
        .orderBy(sql`created_at DESC`)
        .limit(1);

      let personaId = lastSession[0]?.personaId || user.defaultPersonaId;
      let personaSlug = 'aiden-powers';

      if (personaId) {
        const p = await db.select({ slug: personas.slug })
          .from(personas)
          .where(eq(personas.id, personaId))
          .limit(1);
        if (p[0]) personaSlug = p[0].slug;
      } else {
        // Fallback: look up Aiden's persona ID
        const aiden = await db.select({ id: personas.id })
          .from(personas)
          .where(eq(personas.slug, 'aiden-powers'))
          .limit(1);
        if (aiden[0]) personaId = aiden[0].id;
      }

      if (personaId) {
        try {
          const magicToken = await generateMagicLinkToken(user.id, personaId, personaSlug);
          const magicUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/magic-auth?t=${magicToken}`;

          // Send a simple sign-in email via Resend
          const { Resend } = await import('resend');
          const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
          if (resendClient) {
            await resendClient.emails.send({
              from: `The Seer Within <${process.env.FOLLOW_UP_FROM_EMAIL || 'noreply@theseerwithin.com'}>`,
              to: user.email,
              subject: 'Your sign-in link',
              html: `<p>Hi ${user.firstName || 'there'},</p><p>Click the button below to sign in to your reading:</p><p style="margin:24px 0"><a href="${magicUrl}" style="background:#6d28d9;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Sign In to My Reading</a></p><p style="color:#888;font-size:13px">This link expires in 30 days.</p>`,
            });
            logger.info('Magic sign-in link sent', { email: user.email, personaSlug });
          } else {
            logger.warn('Resend not configured, magic link URL:', magicUrl);
          }
        } catch (err) {
          logger.error('Failed to send magic sign-in link:', err);
        }
      }

      res.status(400).json({
        error: 'We just sent a sign-in link to your email. Click it to continue your reading.',
        code: 'NO_PASSWORD',
      });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check account status before issuing token
    if (user.accountStatus === 'suspended') {
      res.status(403).json({
        error: 'Account suspended. Contact support.',
        code: 'ACCOUNT_SUSPENDED',
        reason: user.suspensionReason || undefined,
      });
      return;
    }

    if (user.accountStatus === 'banned') {
      res.status(403).json({
        error: 'Account has been permanently banned.',
        code: 'ACCOUNT_BANNED',
      });
      return;
    }

    // Update last login with IP tracking
    const loginIp = extractClientIp(req);
    await db.update(users)
      .set({ lastLoginAt: new Date(), lastLoginIp: loginIp, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const token = generateToken(user.id, user.email);

    // Resolve default persona slug so the client can redirect without a second request.
    // Only return it if the persona is still active; otherwise clear it.
    let defaultPersonaSlug: string | null = null;
    let defaultPersonaAvailable = false;
    if (user.defaultPersonaId) {
      const personaRow = await db.select({
        slug: personas.slug,
        isActive: personas.isActive,
        availabilitySchedule: personas.availabilitySchedule,
        onlineOverride: personas.onlineOverride,
        overrideExpiresAt: personas.overrideExpiresAt,
      })
        .from(personas)
        .where(eq(personas.id, user.defaultPersonaId))
        .limit(1);
      if (personaRow[0] && personaRow[0].isActive) {
        defaultPersonaSlug = personaRow[0].slug;
        defaultPersonaAvailable = isPersonaOnline(personaRow[0]);
      }
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        coinBalance: user.coinBalance,
        defaultPersonaId: user.defaultPersonaId,
        defaultPersonaSlug,
        defaultPersonaAvailable,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    const user = result[0];
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      coinBalance: user.coinBalance,
      totalCoinsUsed: user.totalCoinsUsed,
      defaultPersonaId: user.defaultPersonaId,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { currentPassword, newPassword } = parseResult.data;

    const result = await db.select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    const user = result[0];
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.passwordHash) {
      res.status(400).json({
        error: 'This account uses magic link login. Set a password from your dashboard first.',
        code: 'NO_PASSWORD',
      });
      return;
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    const now = new Date();
    await db.update(users)
      .set({ passwordHash: newHash, passwordChangedAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    res.json({ success: true });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================
// PASSWORD RESET FLOW
// ============================================

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const PASSWORD_RESET_EXPIRY_HOURS = 1;

// POST /api/auth/forgot-password
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { email } = parseResult.data;

    // Always return success to avoid leaking account existence
    const successMsg = 'If an account with that email exists, a password reset link has been sent.';

    const result = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      accountStatus: users.accountStatus,
    })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const user = result[0];

    // If no user found or account is banned, silently succeed
    if (!user || user.accountStatus === 'banned') {
      res.json({ success: true, message: successMsg });
      return;
    }

    // Generate reset token
    const resetToken = randomUUID();

    await db.update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpiry: sql`NOW() + INTERVAL '${sql.raw(String(PASSWORD_RESET_EXPIRY_HOURS))} hours'`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(users.id, user.id));

    // Send reset email (non-blocking)
    sendPasswordResetEmail(user.email, user.firstName, resetToken).catch((err) => {
      logger.error('Failed to send password reset email:', err);
    });

    res.json({ success: true, message: successMsg });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;

    if (!token || token.length < 10) {
      res.status(400).json({ error: 'Invalid reset token' });
      return;
    }

    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { password } = parseResult.data;

    // Find user by reset token
    const result = await db.select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    const user = result[0];
    if (!user) {
      res.status(404).json({ error: 'Invalid or expired reset link. Please request a new one.' });
      return;
    }

    // Check token expiry
    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      // Clear expired token
      await db.update(users)
        .set({
          passwordResetToken: null,
          passwordResetExpiry: null,
          updatedAt: sql`NOW()`,
        })
        .where(eq(users.id, user.id));

      res.status(410).json({ error: 'Reset link has expired. Please request a new one.' });
      return;
    }

    // Hash new password and update
    const newHash = await hashPassword(password);

    await db.update(users)
      .set({
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        passwordChangedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(users.id, user.id));

    logger.info('Password reset completed', { email: user.email });

    // Return a JWT so the frontend can auto-login after password reset
    const jwtToken = generateToken(user.id, user.email);

    res.json({ success: true, token: jwtToken, message: 'Password has been reset successfully.' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/auth/reset-password/:token/validate - Check if token is valid
router.get('/reset-password/:token/validate', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;

    if (!token || token.length < 10) {
      res.json({ valid: false });
      return;
    }

    const result = await db.select({
      id: users.id,
      passwordResetExpiry: users.passwordResetExpiry,
    })
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    const user = result[0];
    if (!user) {
      res.json({ valid: false });
      return;
    }

    // Check expiry
    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      res.json({ valid: false });
      return;
    }

    res.json({ valid: true });
  } catch (error) {
    logger.error('Validate reset token error:', error);
    res.json({ valid: false });
  }
});

// POST /api/auth/magic-verify
// Exchange a magic link token for a full session JWT.
// Called by MagicAuthPage.tsx immediately on load.
router.post('/magic-verify', authLimiter, async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    const result = await verifyMagicLinkToken(token);
    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired magic link' });
    }

    // Load the user to build the session JWT
    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        coinBalance: users.coinBalance,
        totalCoinsUsed: users.totalCoinsUsed,
        defaultPersonaId: users.defaultPersonaId,
        accountStatus: users.accountStatus,
        emailVerified: users.emailVerified,
        migratedFromConversationId: users.migratedFromConversationId,
        passwordChangedAt: users.passwordChangedAt,
      })
      .from(users)
      .where(eq(users.id, result.userId))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Migrated V1 users who haven't set a password yet need to do so on first login
    const needsPasswordSetup = !!(user.migratedFromConversationId && !user.passwordChangedAt);

    const jwtToken = generateToken(user.id, user.email);

    return res.json({
      token: jwtToken,
      personaSlug: result.personaSlug,
      needsPasswordSetup,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        coinBalance: user.coinBalance,
        totalCoinsUsed: user.totalCoinsUsed,
        defaultPersonaId: user.defaultPersonaId,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error: any) {
    logger.error('Magic verify error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/set-password
// Allows migrated V1 users to set their password on first login via magic link.
// Requires a valid JWT (user is already authenticated via magic link).
router.post('/set-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const userId = req.userId!;

    // Verify user is a migrated user who hasn't set a password yet
    const userRows = await db
      .select({
        email: users.email,
        migratedFromConversationId: users.migratedFromConversationId,
        passwordChangedAt: users.passwordChangedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.migratedFromConversationId) {
      return res.status(400).json({ error: 'This endpoint is only for migrated accounts' });
    }

    if (user.passwordChangedAt) {
      return res.status(400).json({ error: 'Password has already been set' });
    }

    const newHash = await hashPassword(password);
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info('Migrated user set password', { userId });

    // Issue a fresh JWT so the old one (issued before password change) isn't rejected
    const freshToken = generateToken(userId, user.email);

    return res.json({ success: true, token: freshToken });
  } catch (error: any) {
    logger.error('Set password error:', error);
    return res.status(500).json({ error: 'Failed to set password' });
  }
});

// POST /api/auth/generate-magic-token - Test helper to generate magic link tokens
// Only available in development/test environments
router.post('/generate-magic-token', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { userId, personaSlug } = req.body;
    if (!userId || !personaSlug) {
      return res.status(400).json({ error: 'userId and personaSlug are required' });
    }
    const persona = await db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.slug, personaSlug))
      .limit(1);
    if (!persona[0]) {
      return res.status(404).json({ error: `Persona '${personaSlug}' not found` });
    }
    const token = await generateMagicLinkToken(userId, persona[0].id, personaSlug);
    return res.json({ token });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

// POST /api/auth/logout - End active sessions before logging out
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    // Find all active sessions for this user and end them properly
    const activeSessions = await db.select({ id: chatSessions.id })
      .from(chatSessions)
      .where(and(
        eq(chatSessions.userId, req.userId!),
        eq(chatSessions.status, 'active'),
        isNull(chatSessions.endedAt),
      ));

    for (const session of activeSessions) {
      try {
        await endChatSession(session.id);
        logger.info('Logout: ended active session', { userId: req.userId, sessionId: session.id });
      } catch (err) {
        logger.error('Logout: failed to end session', { sessionId: session.id, error: (err as Error).message });
      }
    }

    res.json({ success: true, sessionsEnded: activeSessions.length });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
