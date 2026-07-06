// Generalized persona lander backend — one router serving every additional
// persona's chat lander (Marcus, Luna, Nova, Maren, ...). Persona-agnostic port of
// routes/evelynLander.ts; the persona is taken from the :persona path segment and
// resolved against personaLanderConfig. Writes to the shared persona_lander_sessions
// table (discriminated by persona_slug). Evelyn/Aiden keep their own routes.
//
//   POST /api/persona-lander/:persona/start  → resolve segment, insert session row,
//                                              return the persona's static opener
//   POST /api/persona-lander/:persona/turn   → safety + Haiku for one chat turn,
//                                              enforce 2-user-message hard cap
//   POST /api/persona-lander/:persona/cta    → handoff (mint JWT only for token-magic)
//
// Security note: JWTs are ONLY issued when a server-validated magic-link token is
// present. Email-param-only segments redirect to /login (the existing gatekeeper).

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createHash } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { personaLanderSessions, users } from '@shared/schema';
import { extractClientIp, extractUserAgent } from '../lib/fraudDetection';
import { verifyMagicLinkToken } from '../lib/magicLink';
import { generateToken } from '../lib/auth';
import { landerLimiter, landerTurnLimiter } from '../lib/rateLimiter';
import { checkAndLogSafety } from '../lib/universalSafety';
import { verifyTurnstileToken } from '../lib/turnstile';
import { selectStaticOpener, generateTurnReply } from '../lib/personaLanderEngine';
import { claimLunaTyGift } from '../lib/lunaThankyouGift';
import {
  getPersonaLanderConfig,
  type Bucket,
  type ChatMessage,
  type PersonaLanderConfig,
} from '../lib/personaLanderConfig';
import logger from '../lib/logger';

// Hard cap on user messages allowed in the lander chat (turn 2 = CTA).
const MAX_USER_MESSAGES = 2;

// mergeParams so the :persona segment from the parent mount is visible here.
const router = Router({ mergeParams: true });

// Resolve + attach the persona config for every route; 404 on unknown persona.
router.use((req: Request, res: Response, next) => {
  const slug = String((req.params as any).persona || '');
  const config = getPersonaLanderConfig(slug);
  if (!config) {
    return res.status(404).json({ error: 'Unknown persona lander' });
  }
  (req as any).landerConfig = config;
  next();
});

function cfg(req: Request): PersonaLanderConfig {
  return (req as any).landerConfig as PersonaLanderConfig;
}

// ---------- Schemas ----------

const startSchema = z.object({
  sessionToken: z.string().min(8).max(128),
  email: z.string().email().max(254).optional(),
  token: z.string().min(16).max(128).optional(),
  bucket: z.enum(['love', 'money', 'purpose', 'specific']).optional(),
  src: z.string().max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  campaign: z.string().max(64).optional(),
  name: z
    .string()
    .max(32)
    .regex(/^[^\d!@#$%^&*()+=\[\]{}|\\:;"<>,.?/]+$/)
    .optional(),
});

const ctaSchema = z.object({
  sessionToken: z.string().min(8).max(128),
  token: z.string().min(16).max(128).optional(),
});

const turnSchema = z.object({
  sessionToken: z.string().min(8).max(128),
  userMessage: z.string().min(1).max(2000),
  // No length cap: real Cloudflare Turnstile tokens can exceed 2048 chars, and a
  // .max(2048) here rejected valid tokens as "Invalid payload" (breaking the
  // lander's first message). Matches the uncapped magic-register schema (auth.ts).
  turnstileToken: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      }),
    )
    .max(10)
    .optional()
    .default([]),
});

// ---------- Helpers ----------

function hashEmailForAnalytics(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(-8);
}

type Segment = 'v2_active' | 'v2_password' | 'v1_migrated' | 'brand_new' | 'token_magic';

interface ResolvedSegment {
  segment: Segment;
  resolvedUserId: string | null;
  firstName: string | null;
  isReturning: boolean;
}

async function resolveSegment(input: {
  email?: string;
  token?: string;
  fallbackName?: string;
}): Promise<ResolvedSegment> {
  if (input.token) {
    const result = await verifyMagicLinkToken(input.token);
    if (result) {
      const userRows = await db
        .select({ firstName: users.firstName })
        .from(users)
        .where(eq(users.id, result.userId))
        .limit(1);
      return {
        segment: 'token_magic',
        resolvedUserId: result.userId,
        firstName: userRows[0]?.firstName ?? input.fallbackName ?? null,
        isReturning: true,
      };
    }
  }

  if (input.email) {
    const userRows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        passwordHash: users.passwordHash,
        accountStatus: users.accountStatus,
      })
      .from(users)
      .where(eq(users.email, input.email.trim().toLowerCase()))
      .limit(1);
    const user = userRows[0];
    if (user) {
      if (user.accountStatus !== 'active') {
        return {
          segment: 'brand_new',
          resolvedUserId: null,
          firstName: input.fallbackName ?? null,
          isReturning: false,
        };
      }
      const segment: Segment = user.passwordHash ? 'v2_password' : 'v1_migrated';
      return {
        segment,
        resolvedUserId: user.id,
        firstName: user.firstName ?? input.fallbackName ?? null,
        isReturning: true,
      };
    }
  }

  return {
    segment: 'brand_new',
    resolvedUserId: null,
    firstName: input.fallbackName ?? null,
    isReturning: false,
  };
}

// ---------- POST /:persona/start ----------
router.post('/start', landerLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn('persona-lander: invalid start payload, falling through', {
        persona: cfg(req).slug,
        issues: parsed.error.issues.map((i) => i.path.join('.')),
      });
      const fallbackToken =
        typeof req.body?.sessionToken === 'string' && req.body.sessionToken.length >= 8
          ? req.body.sessionToken
          : null;
      if (!fallbackToken) {
        return res.status(400).json({ error: 'sessionToken required' });
      }
      return resolveAndInsert(req, res, { sessionToken: fallbackToken });
    }
    return resolveAndInsert(req, res, parsed.data);
  } catch (error: any) {
    logger.error('persona-lander start error', { error: error?.message });
    res.status(500).json({ error: 'Failed to start lander session' });
  }
});

async function resolveAndInsert(
  req: Request,
  res: Response,
  data: z.infer<typeof startSchema>,
) {
  const config = cfg(req);
  const resolved = await resolveSegment({
    email: data.email,
    token: data.token,
    fallbackName: data.name,
  });

  try {
    await db.insert(personaLanderSessions).values({
      sessionToken: data.sessionToken,
      personaSlug: config.slug,
      resolvedSegment: resolved.segment,
      resolvedUserId: resolved.resolvedUserId,
      emailParamHash: data.email ? hashEmailForAnalytics(data.email) : null,
      bucket: data.bucket ?? null,
      src: data.src ?? null,
      campaign: data.campaign ?? null,
      hadToken: Boolean(data.token),
      ipAddress: extractClientIp(req),
      userAgent: extractUserAgent(req),
    });
  } catch (error: any) {
    // Duplicate sessionToken on refresh — treat as success and re-resolve.
    if (error?.code !== '23505') {
      logger.error('persona-lander insert failed', { error: error?.message });
    }
  }

  const opener = selectStaticOpener(config, {
    firstName: resolved.firstName,
    bucket: (data.bucket as Bucket | undefined) ?? null,
    isReturning: resolved.isReturning,
  });

  res.json({
    persona: {
      slug: config.slug,
      displayName: config.displayName,
      avatarUrl: config.avatarUrl,
    },
    segment: resolved.segment,
    firstName: resolved.firstName,
    isReturning: resolved.isReturning,
    opener,
    brandNewSubCopy: config.brandNewSubCopy,
  });
}

// ---------- POST /:persona/cta ----------
router.post('/cta', async (req: Request, res: Response) => {
  try {
    const parsed = ctaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const { sessionToken, token } = parsed.data;

    const rows = await db
      .select()
      .from(personaLanderSessions)
      .where(eq(personaLanderSessions.sessionToken, sessionToken))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let action:
      | 'magic_login'
      | 'login_with_email'
      | 'login_no_password'
      | 'register'
      | 'already_logged_in';
    let jwt: string | undefined;

    if (row.resolvedSegment === 'token_magic' && token) {
      const reValidated = await verifyMagicLinkToken(token);
      if (reValidated) {
        const userRows = await db
          .select({ id: users.id, email: users.email, accountStatus: users.accountStatus })
          .from(users)
          .where(eq(users.id, reValidated.userId))
          .limit(1);
        const user = userRows[0];
        if (user && user.accountStatus === 'active') {
          jwt = generateToken(user.id, user.email);
          action = 'magic_login';
          // Luna $50/30-min thank-you gift: an existing buyer arriving via the magic-login
          // token from /success claims their 1,800 coins here (once, idempotent). No-op for
          // any other magic-login user. Non-blocking on the handoff.
          await claimLunaTyGift(user.id);
        } else {
          action = 'login_with_email';
        }
      } else {
        action = 'login_with_email';
      }
    } else {
      switch (row.resolvedSegment) {
        case 'v2_password':
          action = 'login_with_email';
          break;
        case 'v1_migrated':
          action = 'login_no_password';
          break;
        case 'brand_new':
          action = 'register';
          break;
        case 'v2_active':
          action = 'already_logged_in';
          break;
        case 'token_magic':
          action = 'login_with_email';
          break;
        default:
          action = 'register';
      }
    }

    await db
      .update(personaLanderSessions)
      .set({
        ctaClicked: true,
        ctaAction: action,
        ctaClickedAt: new Date(),
      })
      .where(eq(personaLanderSessions.sessionToken, sessionToken));

    res.json({ action, ...(jwt ? { jwt } : {}) });
  } catch (error: any) {
    logger.error('persona-lander cta error', { error: error?.message });
    res.status(500).json({ error: 'Failed to resolve handoff' });
  }
});

// ---------- POST /:persona/turn ----------
router.post('/turn', landerTurnLimiter, async (req: Request, res: Response) => {
  try {
    const config = cfg(req);
    const parsed = turnSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const { sessionToken, userMessage, turnstileToken, history } = parsed.data;

    const rows = await db
      .select()
      .from(personaLanderSessions)
      .where(eq(personaLanderSessions.sessionToken, sessionToken))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Hard cap: server is authoritative on turn count.
    if (row.turnCount >= MAX_USER_MESSAGES) {
      return res.json({
        reply: `Continue your reading to keep going with ${config.displayName} — there's more here than fits this moment.`,
        ctaReady: true,
        blocked: 'cap',
      });
    }

    // Turnstile required on first user message only. Fails open when unset.
    if (row.turnCount === 0) {
      const ok = await verifyTurnstileToken(turnstileToken ?? '', extractClientIp(req));
      if (!ok) {
        return res.status(400).json({
          error: 'Security verification failed. Please refresh the page and try again.',
          code: 'TURNSTILE_FAILED',
        });
      }
    }

    const safety = await checkAndLogSafety(userMessage, {
      userId: row.resolvedUserId ?? undefined,
      ipAddress: extractClientIp(req),
      userAgent: extractUserAgent(req),
    });
    if (!safety.safe && safety.response) {
      await db
        .update(personaLanderSessions)
        .set({ turnCount: sql`${personaLanderSessions.turnCount} + 1` })
        .where(eq(personaLanderSessions.sessionToken, sessionToken));
      const newCount = row.turnCount + 1;
      return res.json({
        reply: safety.response,
        ctaReady: newCount >= MAX_USER_MESSAGES,
        blocked: 'safety',
      });
    }

    let firstName: string | null = null;
    if (row.resolvedUserId) {
      const userRows = await db
        .select({ firstName: users.firstName })
        .from(users)
        .where(eq(users.id, row.resolvedUserId))
        .limit(1);
      firstName = userRows[0]?.firstName ?? null;
    }

    const willBeFinalTurn = row.turnCount + 1 >= MAX_USER_MESSAGES;
    const messages: ChatMessage[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    const { reply } = await generateTurnReply(config, {
      messages,
      firstName,
      bucket: (row.bucket as Bucket | null) ?? null,
      isFinalTurn: willBeFinalTurn,
    });

    await db
      .update(personaLanderSessions)
      .set({ turnCount: sql`${personaLanderSessions.turnCount} + 1` })
      .where(eq(personaLanderSessions.sessionToken, sessionToken));

    res.json({ reply, ctaReady: willBeFinalTurn });
  } catch (error: any) {
    logger.error('persona-lander turn error', { error: error?.message });
    res.status(500).json({ error: 'Failed to generate reply' });
  }
});

export default router;
