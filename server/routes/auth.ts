import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '../lib/db';
import { users, personas, chatSessions, userMemory, aidenQuizSessions, evelynLanderSessions, soulmateLanderSessions, personaLanderSessions } from '@shared/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateToken, requireAuth } from '../lib/auth';
import { verifyMagicLinkToken, generateMagicLinkToken } from '../lib/magicLink';
import { isFromLunaThankyouOffer, claimLunaTyGift } from '../lib/lunaThankyouGift';
import { authLimiter, passwordResetLimiter } from '../lib/rateLimiter';
import { sendVerificationEmail } from '../lib/verificationEmail';
import { sendPasswordResetEmail } from '../lib/passwordResetEmail';
import { isDisposableEmail } from '../lib/disposableEmailDomains';
import { verifyTurnstileToken } from '../lib/turnstile';
import { validateEmail } from '../lib/neverbounce';
import {
  checkRegistrationFraud,
  extractClientIp,
  extractUserAgent,
  extractFingerprint,
  serializeAccountFlags,
} from '../lib/fraudDetection';
import { isPersonaOnline } from '../lib/personaManager';
import { endChatSession } from '../lib/creditTracking';
import {
  scheduleAidenFollowups,
  skipAidenFollowupsForUser,
} from '../lib/aidenFollowupEmailGenerator';
import { scheduleAidenVerifiedDrip } from '../lib/aidenVerifiedDripGenerator';
import {
  scheduleEvelynFollowups,
  skipEvelynFollowupsForUser,
  lookupEvelynBucket,
} from '../lib/evelynFollowupEmailGenerator';
import { scheduleEvelynVerifiedDrip } from '../lib/evelynVerifiedDripGenerator';
import { schedulePersonaVerifiedDrip, PERSONA_DRIP_SLUGS } from '../lib/personaVerifiedDripGenerator';
import logger from '../lib/logger';
import { posthog } from '../lib/posthog';

// Default free-coin grant when the user has no default persona set or the
// persona row has no freeCoins override. Per-persona amounts live on
// `personas.freeCoins` and are read at verification time so policy changes
// (e.g. Aiden's 10-minute onboarding) flow through without touching this file.
const DEFAULT_FREE_COINS = 180;
// /evelyn lander signups get 5 minutes free instead of the default 3 — soft-launch test
// vs. competitors (Nebula 10 min, Astro 3 min). Eligibility = isFromEvelynLander() below.
const EVELYN_LANDER_FREE_COINS = 300;
// /soulmate lander signups mirror the /evelyn grant exactly (5 min). Same Evelyn
// persona, same drip enrollment downstream. Eligibility = isFromSoulmateLander() below.
const SOULMATE_LANDER_FREE_COINS = 300;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

async function getFreeCoinsForPersona(personaId: string | null | undefined): Promise<number> {
  if (!personaId) return DEFAULT_FREE_COINS;
  const row = await db.select({ freeCoins: personas.freeCoins })
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);
  return row[0]?.freeCoins ?? DEFAULT_FREE_COINS;
}

// Used by the verification endpoints to decide whether to enroll the user into
// the Aiden "verified, not purchased" nurture drip. Silent-fails to false so a
// schema/DB hiccup can never block verification itself.
async function isAidenUser(personaId: string | null | undefined): Promise<boolean> {
  if (!personaId) return false;
  try {
    const row = await db.select({ slug: personas.slug })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);
    return row[0]?.slug === 'aiden-powers';
  } catch {
    return false;
  }
}

// Used by verification endpoints to decide whether to enroll the user into the
// Evelyn "verified, not purchased" drip. Silent-fails to false so a DB hiccup
// can never block verification itself.
async function isEvelynUser(personaId: string | null | undefined): Promise<boolean> {
  if (!personaId) return false;
  try {
    const row = await db.select({ slug: personas.slug })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);
    return row[0]?.slug === 'evelyn-cross';
  } catch {
    return false;
  }
}

// True when the user (a) has Evelyn as their default persona AND (b) has a linked
// evelyn_lander_sessions row via resolved_user_id. Mirrors the eligibility check
// already used at /verify-email + /magic-verify for the verified-not-purchased drip,
// so the 5-min grant and the drip enrollment stay in lockstep. Silent-fails to false.
async function isFromEvelynLander(userId: string, personaId: string | null | undefined): Promise<boolean> {
  if (!(await isEvelynUser(personaId))) return false;
  try {
    const row = await db.select({ id: evelynLanderSessions.id })
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.resolvedUserId, userId))
      .limit(1);
    return !!row[0];
  } catch {
    return false;
  }
}

// True when the user (a) has Evelyn as their default persona AND (b) has a linked
// soulmate_lander_sessions row. Mirrors isFromEvelynLander; both grant 5 free
// minutes and both enroll the user in scheduleEvelynVerifiedDrip downstream.
// Silent-fails to false so a DB hiccup can never block verification itself.
async function isFromSoulmateLander(userId: string, personaId: string | null | undefined): Promise<boolean> {
  if (!(await isEvelynUser(personaId))) return false;
  try {
    const row = await db.select({ id: soulmateLanderSessions.id })
      .from(soulmateLanderSessions)
      .where(eq(soulmateLanderSessions.resolvedUserId, userId))
      .limit(1);
    return !!row[0];
  } catch {
    return false;
  }
}

// Enroll the user in the generalized 10-email persona drip when they came through
// one of the new persona landers (Marcus/Luna/Nova/Maren). Eligibility: defaultPersona
// is a drip-configured persona AND a persona_lander_sessions row links to this user
// (proving the lander, not a /personas browse). Flag-gated at send time by
// ENABLE_PERSONA_VERIFIED_DRIP. Silent-fails so verification is never blocked.
async function maybeSchedulePersonaDrip(user: {
  id: string;
  email: string;
  firstName: string | null;
  defaultPersonaId: string | null;
}): Promise<void> {
  try {
    if (!user.defaultPersonaId) return;
    const personaRow = await db.select({ slug: personas.slug })
      .from(personas)
      .where(eq(personas.id, user.defaultPersonaId))
      .limit(1);
    const slug = personaRow[0]?.slug;
    if (!slug || !PERSONA_DRIP_SLUGS.includes(slug)) return;

    const landerRow = await db.select({ bucket: personaLanderSessions.bucket })
      .from(personaLanderSessions)
      .where(and(
        eq(personaLanderSessions.resolvedUserId, user.id),
        eq(personaLanderSessions.personaSlug, slug),
      ))
      .orderBy(desc(personaLanderSessions.startedAt))
      .limit(1);
    if (!landerRow[0]) return;

    await schedulePersonaVerifiedDrip({
      userId: user.id,
      email: user.email,
      firstName: user.firstName || 'there',
      personaSlug: slug,
      bucket: landerRow[0].bucket,
      baseTime: new Date(),
    });
  } catch (err) {
    logger.warn('Failed to schedule persona drip', { userId: user.id, err: (err as Error)?.message });
  }
}

// Best-effort lookup of the user's /aiden quiz topic for personalizing post-verify
// emails. Returns null when the user never took the quiz (e.g. migrated V1 users
// who got a default-persona of Aiden some other way).
async function lookupQuizTopicForUser(userId: string): Promise<string | null> {
  try {
    const row = await db.select({ q1Topic: aidenQuizSessions.q1Topic })
      .from(aidenQuizSessions)
      .where(eq(aidenQuizSessions.userId, userId))
      .orderBy(desc(aidenQuizSessions.startedAt))
      .limit(1);
    return row[0]?.q1Topic || null;
  } catch {
    return null;
  }
}

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  persona: z.string().optional(),
  // /evelyn lander signups pass these so we can stamp the lander linkage and
  // schedule the unverified-track drip. All optional — non-lander signups omit them.
  source: z.string().max(32).optional(),
  bucket: z.enum(['love', 'money', 'purpose', 'specific']).optional(),
  landerSessionToken: z.string().min(8).max(128).optional(),
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
  persona: z.string().optional(),
  // Forwarded so the resent email matches the original "5 free minutes"
  // copy for /evelyn lander signups (rather than reverting to the 3-min default).
  source: z.string().max(32).optional(),
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

    const { email, password, firstName, persona, source, bucket, landerSessionToken } = parseResult.data;

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

    // Resolve persona id so the user record stamps `defaultPersonaId`. Without it,
    // the verification email's persona-context fallback (and the post-verify drip
    // eligibility checks) wouldn't have a persona to fall back to. Mirrors the
    // magic-register pattern.
    let personaId: string | null = null;
    if (persona) {
      const personaRow = await db.select({ id: personas.id })
        .from(personas)
        .where(eq(personas.slug, persona))
        .limit(1);
      personaId = personaRow[0]?.id || null;
    }

    // /evelyn lander signups get 5 min free, everyone else gets the 3-min default.
    // Production grants happen at /verify-email; this branch only fires in test env
    // where verification is bypassed and coins are stamped at registration.
    const isLanderSignup = source === 'evelyn-lander' && persona === 'evelyn-cross';
    // Generalized chat landers (Marcus/Luna/Nova/Maren) all signal via source
    // 'persona-lander' + the persona slug. They grant the persona's own free coins
    // (handled at /verify-email via getFreeCoinsForPersona on defaultPersonaId), so
    // no special coin branch is needed here — only the funnel tag + session linkage.
    const isPersonaLanderSignup = source === 'persona-lander' && !!persona;
    const testEnvCoinGrant = isLanderSignup ? EVELYN_LANDER_FREE_COINS : DEFAULT_FREE_COINS;

    const newUser = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      coinBalance: isTestEnv ? testEnvCoinGrant : 0,
      emailVerified: isTestEnv,
      verificationToken: isTestEnv ? null : verificationToken,
      verificationTokenExpiry: isTestEnv ? null : sql`NOW() + INTERVAL '${sql.raw(String(VERIFICATION_TOKEN_EXPIRY_HOURS))} hours'`,
      registrationIp: clientIp,
      registrationUserAgent: userAgent,
      deviceFingerprint: fingerprint,
      accountFlags: fraudCheck.flagged ? serializeAccountFlags(fraudCheck.flags) : null,
      defaultPersonaId: personaId,
      signupFunnel: isLanderSignup ? 'evelyn' : (isPersonaLanderSignup ? persona! : null),
    }).returning();

    const user = newUser[0];
    const token = generateToken(user.id, user.email);

    // Send verification email only in non-test environments
    if (!isTestEnv) {
      sendVerificationEmail(user.email, user.firstName, verificationToken, persona, source).catch((err) => {
        logger.error('Failed to send verification email:', err);
      });
    }

    // Link the lander session row to this newly-created user so /verified drip
    // bucket lookups (queryed by resolved_user_id) work. Non-blocking — must not
    // fail registration. Only attempted when the lander explicitly handed us a token.
    if (landerSessionToken && source === 'evelyn-lander') {
      db.update(evelynLanderSessions)
        .set({ resolvedUserId: user.id })
        .where(eq(evelynLanderSessions.sessionToken, landerSessionToken))
        .catch((err) => {
          logger.warn('Failed to link evelyn_lander_session to user', { err: err?.message });
        });
    }

    // Same linkage for the generalized persona landers (Marcus/Luna/Nova/Maren).
    // The drip (Phase 2) reads resolved_user_id to enroll verified-not-purchased users.
    if (landerSessionToken && isPersonaLanderSignup) {
      db.update(personaLanderSessions)
        .set({ resolvedUserId: user.id })
        .where(eq(personaLanderSessions.sessionToken, landerSessionToken))
        .catch((err) => {
          logger.warn('Failed to link persona_lander_session to user', { err: err?.message });
        });
    }

    // Schedule Evelyn unverified-track follow-up drip (+10m / +24h / +48h). Only
    // for /evelyn lander signups, non-test env. Flag-gated at send time by
    // ENABLE_EVELYN_FOLLOWUPS. Non-blocking — swallowed inside the schedule fn.
    if (!isTestEnv && source === 'evelyn-lander' && persona === 'evelyn-cross') {
      scheduleEvelynFollowups({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        bucket: bucket ?? null,
        baseTime: user.createdAt ?? new Date(),
      }).catch(() => { /* logged inside */ });
    }

    posthog.identify({ distinctId: user.id, properties: { email: user.email, name: user.firstName, signup_funnel: isLanderSignup ? 'evelyn' : 'standard', $set_once: { first_seen: new Date().toISOString() } } });
    posthog.capture({ distinctId: user.id, event: 'user_registered', properties: { email: user.email, persona: persona ?? null, source: source ?? null, requires_verification: !isTestEnv } });

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
  // Lander context (Evelyn quiz + future personas). `source`='evelyn-lander' opts the
  // signup into Evelyn's funnel tag + drip + lander-session linkage, mirroring /register.
  source: z.string().optional(),
  bucket: z.string().optional(),
  landerSessionToken: z.string().min(8).max(128).optional(),
  quizSessionToken: z.string().optional(),
  quizData: z.object({
    topic: z.string(),
    feeling: z.string(),
    outcome: z.string(),
  }).optional(),
  turnstileToken: z.string().optional(),
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

    const { email, firstName, persona, source, bucket, landerSessionToken, quizSessionToken, quizData, turnstileToken } = parseResult.data;

    // Evelyn /evelyn-lander quiz signup: gets the 'evelyn' funnel tag, 5-min grant,
    // lander-session linkage, and the Evelyn drips — parity with the /register path.
    const isEvelynLanderSignup = source === 'evelyn-lander' && persona === 'evelyn-cross';
    // Funnel tag stamped on the user + emitted to PostHog. Aiden path unchanged.
    const signupFunnelTag = persona === 'aiden-powers' ? 'aiden' : (isEvelynLanderSignup ? 'evelyn' : null);

    // Layer 3: Verify Cloudflare Turnstile token (invisible CAPTCHA)
    const turnstileValid = await verifyTurnstileToken(turnstileToken || '', extractClientIp(req));
    if (!turnstileValid) {
      res.status(400).json({
        error: 'Security verification failed. Please refresh the page and try again.',
        code: 'TURNSTILE_FAILED',
      });
      return;
    }

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

    // Layer 1: Block disposable/temporary email domains (static blocklist)
    if (isDisposableEmail(email)) {
      res.status(400).json({
        error: 'Please use a permanent email address. Temporary email services are not accepted.',
        code: 'DISPOSABLE_EMAIL',
      });
      return;
    }

    // Layer 4: Validate email deliverability via NeverBounce
    const emailValidation = await validateEmail(email);
    if (!emailValidation.valid) {
      res.status(400).json({
        error: emailValidation.result === 'disposable'
          ? 'Please use a permanent email address. Temporary email services are not accepted.'
          : "This email address doesn't appear to be valid. Please double-check it.",
        code: 'INVALID_EMAIL',
        suggestedCorrection: emailValidation.suggestedCorrection,
      });
      return;
    }

    // Extract fraud detection signals
    const clientIp = extractClientIp(req);
    const userAgent = extractUserAgent(req);
    const fingerprint = extractFingerprint(req);

    // Check for fraud patterns before creating account
    const fraudCheck = await checkRegistrationFraud(clientIp, fingerprint);

    // Layer 2: Block registration if too many accounts from same IP
    if (fraudCheck.flagged && fraudCheck.flags.includes('ip_flagged')) {
      logger.warn(`[Abuse Prevention] Registration blocked — IP rate limit exceeded`, { ip: clientIp, recentAccounts: fraudCheck.recentAccountsFromIp });
      res.status(429).json({
        error: 'Too many accounts created from this location. Please try again tomorrow.',
        code: 'IP_RATE_LIMIT',
      });
      return;
    }

    // In test environments, auto-verify email and grant coins immediately
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

    // Generate email verification token
    const verificationToken = randomUUID();

    // Look up persona ID up-front so we can stamp defaultPersonaId on the user.
    // Without defaultPersonaId set, a resent verification link (which may lack
    // ?persona=...) would land the user on generic /login instead of the Aiden chat,
    // because verify-email's persona fallback reads defaultPersonaId.
    const personaRow = await db.select({ id: personas.id })
      .from(personas)
      .where(eq(personas.slug, persona))
      .limit(1);
    const personaId = personaRow[0]?.id || null;

    const newUser = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash: null,
      firstName,
      confirmed18Plus: true,
      confirmed18PlusAt: new Date(),
      coinBalance: isTestEnv ? (isEvelynLanderSignup ? EVELYN_LANDER_FREE_COINS : DEFAULT_FREE_COINS) : 0,
      emailVerified: isTestEnv,
      verificationToken: isTestEnv ? null : verificationToken,
      verificationTokenExpiry: isTestEnv ? null : sql`NOW() + INTERVAL '${sql.raw(String(VERIFICATION_TOKEN_EXPIRY_HOURS))} hours'`,
      registrationIp: clientIp,
      registrationUserAgent: userAgent,
      deviceFingerprint: fingerprint,
      accountFlags: fraudCheck.flagged ? serializeAccountFlags(fraudCheck.flags) : null,
      defaultPersonaId: personaId,
      signupFunnel: signupFunnelTag,
    }).returning();

    const user = newUser[0];
    const token = generateToken(user.id, user.email);

    // Store quiz data as a user memory for system prompt injection
    if (quizData) {
      await db.insert(userMemory).values({
        userId: user.id,
        personaId,
        memoryType: 'quiz_intake',
        summary: `User's quiz intake: Topic: ${quizData.topic}, Feeling: ${quizData.feeling}, Desired outcome: ${quizData.outcome}`,
        fullContext: JSON.stringify(quizData),
        importance: 9,
        // Accept both Aiden ('love_relationships'/'career_money') and Evelyn
        // ('love'/'money'/'purpose'/'someone') topic vocabularies.
        category: /love|relationship/.test(quizData.topic) ? 'love' : /money|career/.test(quizData.topic) ? 'money' : 'general',
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

    // Evelyn /evelyn-lander quiz signup: link the lander session row so the
    // post-verification /verified drip (keyed on resolved_user_id) fires, exactly
    // like the /register path. Non-blocking — must not fail registration.
    if (isEvelynLanderSignup && landerSessionToken) {
      db.update(evelynLanderSessions)
        .set({ resolvedUserId: user.id })
        .where(eq(evelynLanderSessions.sessionToken, landerSessionToken))
        .catch((err) => {
          logger.warn('Failed to link evelyn_lander_session to user (magic-register)', { err: err?.message });
        });
    }

    // Send verification email only in non-test environments. `source` drives the
    // free-minutes figure shown in the email (5 for the Evelyn lander).
    if (!isTestEnv) {
      sendVerificationEmail(user.email, user.firstName, verificationToken, persona, source).catch((err) => {
        logger.error('Failed to send verification email:', err);
      });
    }

    // Schedule Aiden follow-up nurture sequence (+10m/+24h/+48h).
    // Aiden persona only, non-test env only. Flag-gated at send time by ENABLE_AIDEN_FOLLOWUPS.
    // Never blocks registration — swallowed inside scheduleAidenFollowups.
    if (!isTestEnv && persona === 'aiden-powers') {
      scheduleAidenFollowups({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        topic: quizData?.topic ?? null,
        baseTime: user.createdAt ?? new Date(),
      }).catch(() => { /* already logged inside */ });
    }

    // Schedule Evelyn unverified-track drip (+10m/+24h/+48h). Evelyn lander only,
    // non-test env. Flag-gated at send time by ENABLE_EVELYN_FOLLOWUPS. Mirrors /register.
    if (!isTestEnv && isEvelynLanderSignup) {
      scheduleEvelynFollowups({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        bucket: bucket ?? null,
        baseTime: user.createdAt ?? new Date(),
      }).catch(() => { /* logged inside */ });
    }

    posthog.identify({ distinctId: user.id, properties: { email: user.email, name: user.firstName, signup_funnel: signupFunnelTag ?? 'standard', $set_once: { first_seen: new Date().toISOString() } } });
    posthog.capture({ distinctId: user.id, event: 'user_registered', properties: { email: user.email, persona, source: source ?? null, requires_verification: !isTestEnv, quiz_topic: quizData?.topic ?? null } });

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

    // Check if already verified — still auto-login so the link works from any device.
    // This branch is also hit when an email-scanner (Gmail/Outlook) prefetched the link
    // before the real user clicked it.
    if (user.emailVerified) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

      // If the original verification-token window has lapsed, don't auto-login via
      // a stale link — just show the "already verified" message on the login page.
      if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
        res.redirect(`${baseUrl}/login?verified=already`);
        return;
      }

      const jwtToken = generateToken(user.id, user.email);

      // Include persona slug so cross-device verification preserves persona context.
      // Same priority rule as the success branch below: query param > user's default persona.
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
      res.redirect(`${baseUrl}/login?verified=already&token=${jwtToken}${personaParam}`);
      return;
    }

    // Check token expiry
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      res.status(410).json({ error: 'Verification link has expired. Please request a new one.' });
      return;
    }

    // Mark email as verified and grant free credits (atomic increment + guard against double-verify).
    // Intentionally keep verificationToken/Expiry in place so that if an email-scanner
    // prefetches the link, the real user's later click still finds the token and auto-logs
    // in via the "already verified" branch above. Expiry check there prevents stale reuse.
    // /soulmate and /evelyn lander signups both get 5 min free; everyone else gets the
    // persona default (3 min). Soulmate is checked before Evelyn so it takes precedence
    // if a user somehow has both linkages (rare, would mean they hit both landers with
    // the same email pre-verify). The Luna $50/30-min thank-you gift is granted SEPARATELY
    // and additively by claimLunaTyGift() below (once, guarded), so a Luna-TY signup skips
    // the persona default here to avoid stacking a second small welcome grant on top.
    const isLunaTyOffer = await isFromLunaThankyouOffer(user.id);
    const isSoulmateLanderUser = !isLunaTyOffer && await isFromSoulmateLander(user.id, user.defaultPersonaId);
    const isEvelynLanderUser = !isLunaTyOffer && !isSoulmateLanderUser && await isFromEvelynLander(user.id, user.defaultPersonaId);
    const freeCoinsGrant = isLunaTyOffer
      ? 0
      : isSoulmateLanderUser
        ? SOULMATE_LANDER_FREE_COINS
        : isEvelynLanderUser
          ? EVELYN_LANDER_FREE_COINS
          : await getFreeCoinsForPersona(user.defaultPersonaId);
    await db.update(users)
      .set({
        emailVerified: true,
        coinBalance: sql`coin_balance + ${freeCoinsGrant}`,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, user.id), eq(users.emailVerified, false)));

    // Luna thank-you gift: grant the 1,800 coins once (idempotent via promo_grants).
    // Additive to whatever balance the account already holds. Non-fatal on error.
    if (isLunaTyOffer) {
      await claimLunaTyGift(user.id);
    }

    // Halt the Aiden follow-up drip (non-blocking — failure must not break verification).
    skipAidenFollowupsForUser(user.id, 'user_verified').catch(() => { /* logged inside */ });
    // Same for the Evelyn unverified-track drip.
    skipEvelynFollowupsForUser(user.id, 'user_verified').catch(() => { /* logged inside */ });

    // Stamp the verification step on the quiz-session funnel row (persona-generic —
    // covers Aiden + Evelyn quiz sessions) so DB-side funnel stats include verified,
    // matching PostHog for DB↔PostHog reconciliation. No-op for non-quiz users.
    db.update(aidenQuizSessions)
      .set({ completedVerification: true, verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(aidenQuizSessions.userId, user.id))
      .catch((err) => logger.warn('Failed to stamp quiz-session verification', { err: err?.message }));

    // Schedule the post-verification "verified, not purchased" nurture drip for Aiden users.
    // Non-blocking + flag-gated inside the processor (ENABLE_AIDEN_VERIFIED_DRIP).
    if (await isAidenUser(user.defaultPersonaId)) {
      const quizTopic = await lookupQuizTopicForUser(user.id);
      scheduleAidenVerifiedDrip({
        userId: user.id,
        email: user.email,
        firstName: user.firstName || 'there',
        topic: quizTopic,
        baseTime: new Date(),
      }).catch(() => { /* logged inside */ });
    }

    // Same drip for Evelyn lander signups. Eligibility = defaultPersonaId is
    // Evelyn AND we have a lander session row linked to this user (proving they
    // came through /evelyn rather than /personas browse). Flag-gated at send
    // time by ENABLE_EVELYN_VERIFIED_DRIP.
    if (await isEvelynUser(user.defaultPersonaId)) {
      const landerBucket = await lookupEvelynBucket(user.id);
      // Drip eligibility: linked to either the /evelyn or /soulmate lander.
      // Soulmate users have no bucket (the soulmate form doesn't ask one) so
      // they enter the drip with bucket=null — the generator handles that.
      const evelynLinked = await db
        .select({ id: evelynLanderSessions.id })
        .from(evelynLanderSessions)
        .where(eq(evelynLanderSessions.resolvedUserId, user.id))
        .limit(1);
      const soulmateLinked = evelynLinked[0] ? null : await db
        .select({ id: soulmateLanderSessions.id })
        .from(soulmateLanderSessions)
        .where(eq(soulmateLanderSessions.resolvedUserId, user.id))
        .limit(1);
      if (evelynLinked[0] || soulmateLinked?.[0]) {
        scheduleEvelynVerifiedDrip({
          userId: user.id,
          email: user.email,
          firstName: user.firstName || 'there',
          bucket: landerBucket,
          baseTime: new Date(),
        }).catch(() => { /* logged inside */ });
      }
    }

    // Generalized persona landers (Marcus/Luna/Nova/Maren) — non-blocking.
    maybeSchedulePersonaDrip(user).catch(() => { /* logged inside */ });

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
    posthog.capture({ distinctId: user.id, event: 'email_verified', properties: { free_coins_granted: freeCoinsGrant, is_evelyn_lander_user: isEvelynLanderUser, is_soulmate_lander_user: isSoulmateLanderUser } });

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

    const { email, persona: personaFromBody, source: sourceFromBody } = parseResult.data;

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

    // Preserve persona context on the resent link. Without this the verify-email
    // redirect loses the persona query and lands the user on /login instead of
    // the persona-specific chat. Priority: explicit body > user's defaultPersonaId.
    let personaSlug: string | undefined = personaFromBody;
    if (!personaSlug && user.defaultPersonaId) {
      const personaRow = await db.select({ slug: personas.slug })
        .from(personas)
        .where(eq(personas.id, user.defaultPersonaId))
        .limit(1);
      personaSlug = personaRow[0]?.slug;
    }

    await sendVerificationEmail(user.email, user.firstName, verificationToken, personaSlug, sourceFromBody);

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

    posthog.capture({ distinctId: user.id, event: 'magic_link_sent', properties: { persona_slug: personaSlug } });
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
          // Optional safe internal redirect (e.g. '/6-6') so the sign-in link returns the
          // user to where they started — needed so the 6/6 promo claim fires on /6-6.
          // Restricted to internal paths to prevent open-redirect.
          // Allow an internal path with an optional ?persona=<slug> so the 6/6 sign-in link
          // can land on /6-6 (where the promo claims) AND remember which guide the user
          // picked — so it forwards into that guide's chat even on a different device/browser
          // where localStorage isn't available. Kept tight to prevent open-redirect.
          const rawRedirect = typeof req.body?.redirect === 'string' ? req.body.redirect : '';
          const safeRedirect = /^\/[A-Za-z0-9\-_/]*(\?persona=[A-Za-z0-9\-]+)?$/.test(rawRedirect) ? rawRedirect : '';
          const magicUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/magic-auth?t=${magicToken}`
            + (safeRedirect ? `&redirect=${encodeURIComponent(safeRedirect)}` : '');

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

    posthog.identify({ distinctId: user.id, properties: { email: user.email, name: user.firstName } });
    posthog.capture({ distinctId: user.id, event: 'user_logged_in', properties: { email: user.email, email_verified: user.emailVerified, default_persona_slug: defaultPersonaSlug } });

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
      signupFunnel: user.signupFunnel,
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

    // If the magic-link arrives for a still-unverified user (e.g. Aiden follow-up CTA),
    // this click both verifies the email and grants the same free coins as the normal
    // /verify-email path. The WHERE guard prevents double-grant on concurrent clicks.
    let freshCoinBalance = user.coinBalance;
    let freshEmailVerified = user.emailVerified;
    if (!user.emailVerified) {
      // /soulmate and /evelyn landers get 5 min free; everyone else the persona default.
      // The Luna $50/30-min thank-you gift is granted separately + additively by
      // claimLunaTyGift() below (once, guarded), so a Luna-TY signup skips the persona
      // default here. Mirrors the /verify-email grant logic above.
      const isLunaTyOffer = await isFromLunaThankyouOffer(user.id);
      const isSoulmateLanderUser = !isLunaTyOffer && await isFromSoulmateLander(user.id, user.defaultPersonaId);
      const isEvelynLanderUser = !isLunaTyOffer && !isSoulmateLanderUser && await isFromEvelynLander(user.id, user.defaultPersonaId);
      const freeCoinsGrant = isLunaTyOffer
        ? 0
        : isSoulmateLanderUser
          ? SOULMATE_LANDER_FREE_COINS
          : isEvelynLanderUser
            ? EVELYN_LANDER_FREE_COINS
            : await getFreeCoinsForPersona(user.defaultPersonaId);
      const updated = await db
        .update(users)
        .set({
          emailVerified: true,
          coinBalance: sql`coin_balance + ${freeCoinsGrant}`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, user.id), eq(users.emailVerified, false)))
        .returning({
          coinBalance: users.coinBalance,
          emailVerified: users.emailVerified,
        });

      if (updated[0]) {
        freshCoinBalance = updated[0].coinBalance;
        freshEmailVerified = updated[0].emailVerified;

        // Luna thank-you gift: grant the 1,800 coins once (idempotent via promo_grants),
        // additive to the balance. Reflect it in the balance returned to the client.
        if (isLunaTyOffer) {
          const granted = await claimLunaTyGift(user.id);
          if (granted > 0) freshCoinBalance += granted;
        }

        // Halt the Aiden follow-up drip (non-blocking — must not fail the login).
        skipAidenFollowupsForUser(user.id, 'user_verified').catch(() => { /* logged inside */ });
        // Same for the Evelyn unverified-track drip.
        skipEvelynFollowupsForUser(user.id, 'user_verified').catch(() => { /* logged inside */ });

        // Stamp the verification step on the quiz-session funnel row (persona-generic).
        // Keeps DB funnel stats aligned with PostHog when a user verifies via magic-link.
        db.update(aidenQuizSessions)
          .set({ completedVerification: true, verifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(aidenQuizSessions.userId, user.id))
          .catch((err) => logger.warn('Failed to stamp quiz-session verification (magic-link)', { err: err?.message }));

        // Schedule the post-verification "verified, not purchased" drip. Users who
        // verify via a magic-link CTA (e.g. the +10m/+24h/+48h follow-up email click)
        // enter the same nurture funnel as users who verify via the normal email button.
        if (await isAidenUser(user.defaultPersonaId)) {
          const quizTopic = await lookupQuizTopicForUser(user.id);
          scheduleAidenVerifiedDrip({
            userId: user.id,
            email: user.email,
            firstName: user.firstName || 'there',
            topic: quizTopic,
            baseTime: new Date(),
          }).catch(() => { /* logged inside */ });
        }

        // Evelyn equivalent — lander linkage gated (evelyn OR soulmate).
        if (await isEvelynUser(user.defaultPersonaId)) {
          const landerBucket = await lookupEvelynBucket(user.id);
          const evelynLinked = await db
            .select({ id: evelynLanderSessions.id })
            .from(evelynLanderSessions)
            .where(eq(evelynLanderSessions.resolvedUserId, user.id))
            .limit(1);
          const soulmateLinked = evelynLinked[0] ? null : await db
            .select({ id: soulmateLanderSessions.id })
            .from(soulmateLanderSessions)
            .where(eq(soulmateLanderSessions.resolvedUserId, user.id))
            .limit(1);
          if (evelynLinked[0] || soulmateLinked?.[0]) {
            scheduleEvelynVerifiedDrip({
              userId: user.id,
              email: user.email,
              firstName: user.firstName || 'there',
              bucket: landerBucket,
              baseTime: new Date(),
            }).catch(() => { /* logged inside */ });
          }
        }

        // Generalized persona landers (Marcus/Luna/Nova/Maren) — non-blocking.
        maybeSchedulePersonaDrip(user).catch(() => { /* logged inside */ });

        logger.info('Magic-link verified email and granted free coins', {
          userId: user.id,
          coinBalance: freshCoinBalance,
        });
      }
    }

    // Migrated V1 users who haven't set a password yet need to do so on first login
    const needsPasswordSetup = !!(user.migratedFromConversationId && !user.passwordChangedAt);

    const jwtToken = generateToken(user.id, user.email);

    posthog.identify({ distinctId: user.id, properties: { email: user.email, name: user.firstName } });
    posthog.capture({ distinctId: user.id, event: 'magic_link_used', properties: { persona_slug: result.personaSlug, email_verified_via_magic_link: !user.emailVerified } });

    return res.json({
      token: jwtToken,
      personaSlug: result.personaSlug,
      needsPasswordSetup,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        coinBalance: freshCoinBalance,
        totalCoinsUsed: user.totalCoinsUsed,
        defaultPersonaId: user.defaultPersonaId,
        accountStatus: user.accountStatus,
        emailVerified: freshEmailVerified,
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
