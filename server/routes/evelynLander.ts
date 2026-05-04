// Evelyn Lander backend — segment resolution + auth handoff.
//
// Two endpoints (chat layer comes in a later phase):
//   POST /api/evelyn-lander/start  → resolve segment, insert session row
//   POST /api/evelyn-lander/cta    → handoff (mint JWT only for token-magic path)
//
// Security note: JWTs are ONLY issued when a server-validated magic-link token is
// present. Email-param-only segments redirect to /login, which is the existing
// gatekeeper for password / NO_PASSWORD / unknown-email cases.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { evelynLanderSessions, users } from '@shared/schema';
import { extractClientIp, extractUserAgent } from '../lib/fraudDetection';
import { verifyMagicLinkToken } from '../lib/magicLink';
import { generateToken } from '../lib/auth';
import { landerLimiter } from '../lib/rateLimiter';
import logger from '../lib/logger';

const router = Router();

// ---------- Schemas ----------

const startSchema = z.object({
  sessionToken: z.string().min(8).max(128),
  email: z.string().email().max(254).optional(),
  // Accept both `token` (PRD spec) and `t` (existing email-link convention)
  token: z.string().min(16).max(128).optional(),
  bucket: z.enum(['love', 'money', 'purpose', 'specific']).optional(),
  src: z
    .string()
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  campaign: z.string().max(64).optional(),
  name: z
    .string()
    .max(32)
    // Letters / spaces / hyphens / apostrophes only — accommodates non-ASCII names without
    // the Unicode regex flag (project TS target is below ES6 for that feature).
    .regex(/^[^\d!@#$%^&*()+=\[\]{}|\\:;"<>,.?/]+$/)
    .optional(),
});

const ctaSchema = z.object({
  sessionToken: z.string().min(8).max(128),
  // Frontend re-passes the magic token so we can re-validate at handoff time.
  token: z.string().min(16).max(128).optional(),
});

// ---------- Helpers ----------

function hashEmailForAnalytics(email: string): string {
  // SHA256 last-8 (PRD §4 validation rules). Lowercased for stability.
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
  // Token wins per PRD §9 ("Token wins. Email param ignored.")
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
    // Token invalid/expired — silently fall through to email/brand-new path.
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
      // Banned/disabled per PRD §3: treat as brand-new opener (no name reveal),
      // but DO record the lookup so analytics see it.
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
    // Email param doesn't match a user — brand-new flow.
  }

  return {
    segment: 'brand_new',
    resolvedUserId: null,
    firstName: input.fallbackName ?? null,
    isReturning: false,
  };
}

// ---------- POST /start ----------
// Validates URL params, resolves segment, inserts a session row, returns
// segment + display info (firstName, isReturning) for the lander UI.
router.post('/start', landerLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      // PRD §4: param validation failures fall through to defaults silently.
      // We log + treat as a bare /evelyn hit rather than 400'ing the user.
      logger.warn('evelyn-lander: invalid start payload, falling through', {
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
    logger.error('evelyn-lander start error', { error: error?.message });
    res.status(500).json({ error: 'Failed to start lander session' });
  }
});

async function resolveAndInsert(
  req: Request,
  res: Response,
  data: z.infer<typeof startSchema>,
) {
  const resolved = await resolveSegment({
    email: data.email,
    token: data.token,
    fallbackName: data.name,
  });

  try {
    await db.insert(evelynLanderSessions).values({
      sessionToken: data.sessionToken,
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
      logger.error('evelyn-lander insert failed', { error: error?.message });
      // Continue: do not block the user on a logging-table failure.
    }
  }

  res.json({
    segment: resolved.segment,
    firstName: resolved.firstName,
    isReturning: resolved.isReturning,
  });
}

// ---------- POST /cta ----------
// Resolves the handoff action. Re-validates magic token if present.
// Returns one of:
//   { action: 'magic_login', jwt }                 — token-magic path
//   { action: 'login_with_email' }                 — has-password V2 user; frontend builds /login?email=...
//   { action: 'login_no_password' }                — V1 migrated; same destination, frontend triggers magic-link send via existing /login NO_PASSWORD flow
//   { action: 'register' }                         — brand new
//   { action: 'already_logged_in' }                — defensive; frontend redirects to /reading
router.post('/cta', async (req: Request, res: Response) => {
  try {
    const parsed = ctaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const { sessionToken, token } = parsed.data;

    const rows = await db
      .select()
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.sessionToken, sessionToken))
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

    // Re-validate magic token freshly at CTA time. If the user originally arrived
    // with a valid token but it's now expired, silently downgrade.
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
        } else {
          action = 'login_with_email';
        }
      } else {
        // Token expired between /start and /cta — fall through to email login.
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
          // Came in token-magic but no token re-passed — defensive fallback.
          action = 'login_with_email';
          break;
        default:
          action = 'register';
      }
    }

    await db
      .update(evelynLanderSessions)
      .set({
        ctaClicked: true,
        ctaAction: action,
        ctaClickedAt: new Date(),
      })
      .where(eq(evelynLanderSessions.sessionToken, sessionToken));

    res.json({ action, ...(jwt ? { jwt } : {}) });
  } catch (error: any) {
    logger.error('evelyn-lander cta error', { error: error?.message });
    res.status(500).json({ error: 'Failed to resolve handoff' });
  }
});

export default router;
