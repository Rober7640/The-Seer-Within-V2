import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '../lib/db';
import { users, personas, chatSessions } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateToken, requireAuth } from '../lib/auth';
import { verifyMagicLinkToken } from '../lib/magicLink';
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

function createVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);
  return expiry;
}

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

    const { email, password, firstName } = parseResult.data;

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
    const verificationTokenExpiry = createVerificationExpiry();

    const newUser = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      coinBalance: isTestEnv ? FREE_COINS_ON_VERIFY : 0,
      emailVerified: isTestEnv,
      verificationToken: isTestEnv ? null : verificationToken,
      verificationTokenExpiry: isTestEnv ? null : verificationTokenExpiry,
      registrationIp: clientIp,
      registrationUserAgent: userAgent,
      deviceFingerprint: fingerprint,
      accountFlags: fraudCheck.flagged ? serializeAccountFlags(fraudCheck.flags) : null,
    }).returning();

    const user = newUser[0];
    const token = generateToken(user.id, user.email);

    // Send verification email only in non-test environments
    if (!isTestEnv) {
      sendVerificationEmail(user.email, user.firstName, verificationToken).catch((err) => {
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
      res.status(404).json({ error: 'Invalid or expired verification link' });
      return;
    }

    // Check if already verified
    if (user.emailVerified) {
      // Redirect to login page with success message
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      res.redirect(`${baseUrl}/login?verified=already`);
      return;
    }

    // Check token expiry
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      res.status(410).json({ error: 'Verification link has expired. Please request a new one.' });
      return;
    }

    // Mark email as verified and grant free credits
    await db.update(users)
      .set({
        emailVerified: true,
        coinBalance: user.coinBalance + FREE_COINS_ON_VERIFY,
        verificationToken: null,
        verificationTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Redirect to login page with verification success
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    res.redirect(`${baseUrl}/login?verified=success`);
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
    const verificationTokenExpiry = createVerificationExpiry();

    await db.update(users)
      .set({
        verificationToken,
        verificationTokenExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await sendVerificationEmail(user.email, user.firstName, verificationToken);

    res.json({ success: true, message: 'If an unverified account exists, a verification email has been sent.' });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
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
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + PASSWORD_RESET_EXPIRY_HOURS);

    await db.update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
        updatedAt: new Date(),
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
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      res.status(410).json({ error: 'Reset link has expired. Please request a new one.' });
      return;
    }

    // Hash new password and update
    const newHash = await hashPassword(password);
    const now = new Date();

    await db.update(users)
      .set({
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        passwordChangedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    logger.info('Password reset completed', { email: user.email });

    res.json({ success: true, message: 'Password has been reset successfully. You can now sign in with your new password.' });
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
      })
      .from(users)
      .where(eq(users.id, result.userId))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const jwtToken = generateToken(user.id, user.email);

    return res.json({
      token: jwtToken,
      personaSlug: result.personaSlug,
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
