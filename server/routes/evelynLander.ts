// Evelyn Lander backend — segment resolution, anonymous chat, auth handoff.
//
//   POST /api/evelyn-lander/start  → resolve segment, insert session row,
//                                    return Evelyn's static opener. Reads an
//                                    optional `Authorization: Bearer <jwt>`:
//                                    a verified, active account resolves to
//                                    'v2_active'. Precedence is
//                                    magic token > JWT > email param.
//   POST /api/evelyn-lander/turn   → run safety + Haiku for one chat turn,
//                                    enforce 2-user-message hard cap
//   POST /api/evelyn-lander/cta    → handoff (mint JWT only for token-magic path)
//   POST /api/evelyn-lander/reply  → park a reader-typed reply on the session row
//                                    before they have an account
//   POST /api/evelyn-lander/check-email
//                                  → account detection at the email ask; three
//                                    outcomes (verified / unverified / none)
//
// Security note: JWTs are ONLY issued when a server-validated magic-link token is
// present. Email-param-only segments redirect to /login, which is the existing
// gatekeeper for password / NO_PASSWORD / unknown-email cases.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createHash } from 'crypto';
import { isIP } from 'node:net';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { evelynLanderSessions, personas, users } from '@shared/schema';
import { extractClientIp, extractUserAgent } from '../lib/fraudDetection';
import { generateMagicLinkToken, verifyMagicLinkToken } from '../lib/magicLink';
import { escapeHtml, reissueVerificationEmail } from '../lib/verificationEmail';
import { resolveWelcomeGrantTier } from '../lib/welcomeGrantTier';
import { generateToken, verifyToken } from '../lib/auth';
import { accountDetectionLimiter, landerLimiter, landerTurnLimiter } from '../lib/rateLimiter';
import { checkAndLogSafety } from '../lib/universalSafety';
import { getCountryFromIP } from '../lib/crisisHotlines';
import { verifyTurnstileToken } from '../lib/turnstile';
import {
  selectStaticOpener,
  generateTurnReply,
  type Bucket,
  type ChatMessage,
} from '../lib/evelynLanderEngine';
import logger from '../lib/logger';

// Hard cap on user messages allowed in the lander chat (PRD §6.3 — turn 5 = CTA).
const MAX_USER_MESSAGES = 2;

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

const replySchema = z.object({
  sessionToken: z.string().min(8).max(128),
  // Matches turnSchema's userMessage cap — reader-typed free text, later rendered
  // as a chat message. No sanitisation here: it's stored/rendered exactly like
  // /turn's userMessage, so the same downstream layer (React's default escaping)
  // is responsible; duplicating it here would just be the wrong layer.
  reply: z.string().min(1).max(2000),
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
  authHeader?: string;
  email?: string;
  token?: string;
  fallbackName?: string;
}): Promise<ResolvedSegment> {
  // Token wins per PRD §9 ("Token wins. Email param ignored.") — and it also
  // outranks a JWT already in localStorage (operator decision 2026-08-02).
  // Rationale: if a reader signed in as account A clicks a magic link minted for
  // account B, they clicked THAT link seconds ago, so it is the fresher and more
  // deliberate statement of who they mean to be — and a magic link that silently
  // did nothing would look broken. When both point at the same account the
  // outcome is identical either way.
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
    // Token invalid/expired — silently fall through. Note this is a fall-through
    // and NOT a return: an authenticated reader whose link has gone stale must
    // still reach the auth branch below rather than being stranded on brand_new.
  }

  // An already-signed-in reader outranks the `?email=` param (which is just an
  // unauthenticated hint) but NOT a live magic token, handled above. They don't
  // need the lander's login/register handoff at all, they need their reading.
  // verifyToken() returns null (never throws) for malformed, expired, or forged
  // tokens, so any bad header falls through to the param-driven branches below
  // exactly as if it were absent.
  if (input.authHeader?.startsWith('Bearer ')) {
    const payload = verifyToken(input.authHeader.slice(7));
    if (payload?.userId) {
      const authedRows = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          emailVerified: users.emailVerified,
          accountStatus: users.accountStatus,
        })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);
      const authed = authedRows[0];
      // emailVerified is required: an unverified account is deliberately NOT
      // treated as active (locked decision — it still needs the verify flow).
      // accountStatus is free text ('active' | 'suspended' | 'banned' |
      // 'flagged_for_review'); only 'active' skips the lander, matching the
      // email branch below.
      if (authed && authed.emailVerified && authed.accountStatus === 'active') {
        return {
          segment: 'v2_active',
          resolvedUserId: authed.id,
          firstName: authed.firstName ?? input.fallbackName ?? null,
          isReturning: true,
        };
      }
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
    authHeader: req.headers.authorization,
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

  // Static opener (no Haiku call here — PRD §9 prefetcher protection).
  const opener = selectStaticOpener({
    firstName: resolved.firstName,
    bucket: (data.bucket as Bucket | undefined) ?? null,
    isReturning: resolved.isReturning,
  });

  res.json({
    segment: resolved.segment,
    firstName: resolved.firstName,
    isReturning: resolved.isReturning,
    opener,
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

// ---------- POST /reply ----------
// Parks a reader-typed reply on their session row before they have an account
// (PRD "Live Thread" flow). Task 10 reads pendingReply back and turns it into
// the first real chat message once the account is verified.
//
// Rate limit: landerTurnLimiter, not landerLimiter. landerLimiter (5/hr/IP)
// bounds NEW session creation (/start); this route never creates a session, it
// writes free text onto an existing one, same category of action as /turn's
// userMessage write. landerTurnLimiter (30/hr prod, 200/hr dev) matches that.
//
// Overwrite semantics: writes pendingReply unconditionally, so a second call
// replaces the first. This is intentional, not an oversight — a reader who
// edits their typed reply before submitting must have the latest version win;
// rejecting the second call would strand their edit, and appending would
// produce a garbled first chat message (the plan's intent is exactly one
// reply per lander session, not a transcript).
//
// Safety screening (round 2): this is the moment a reader is actually reaching
// out, possibly before they have any account, so the reply is run through the
// same checkAndLogSafety() gate /turn uses on userMessage — see the report for
// the full reasoning on storage-on-flag and the response shape.
//
// Round 3 fix: the operator ruled on CRISIS/SELF-HARM screening specifically,
// not the full 7-type violation taxonomy checkAndLogSafety() covers (crisis,
// inappropriate, prompt_injection, harassment, gibberish, non_english, minor —
// server/lib/universalSafety.ts:15-22). Only `violationType === 'crisis'` skips
// the store below; every other violation type still gets written to
// pendingReply and lets the reader through. See the report for why: /turn can
// safely block a non-crisis message because it stores nothing and the reader
// can just retype, but /reply blocking a non-crisis message would destroy the
// one artifact this whole feature exists to preserve, for a class of content
// that isn't a safety emergency.
router.post('/reply', landerTurnLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const { sessionToken, reply } = parsed.data;

    const rows = await db
      .select()
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.sessionToken, sessionToken))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const ipAddress = extractClientIp(req);
    // getCountryFromIP() makes an outbound HTTP call and keys an unbounded,
    // module-level cache (server/lib/crisisHotlines.ts) on this string. This
    // route is unauthenticated, and extractClientIp() trusts X-Forwarded-For
    // verbatim with no validation (server/lib/fraudDetection.ts) — so without
    // this check, an attacker could spray arbitrary header values to grow that
    // shared cache without bound and generate outbound traffic to a third
    // party. Only resolve country for syntactically valid IPs; anything else
    // (including the 'unknown' fallback) skips the lookup — countryCode stays
    // null, which getHotlineForCountry() already treats as "use the US
    // default," so this doesn't change behavior for any real caller.
    const countryCode = isIP(ipAddress) ? await getCountryFromIP(ipAddress) : null;
    const safety = await checkAndLogSafety(reply, {
      userId: row.resolvedUserId ?? undefined,
      ipAddress,
      userAgent: extractUserAgent(req),
      countryCode,
    });

    if (safety.violationType === 'crisis' && !safety.safe && safety.response) {
      // Hard crisis ONLY: mirrors /turn's precedent — the flagged text does NOT
      // proceed into the normal downstream flow (there, no generateTurnReply
      // call; here, no pendingReply write, so Task 10 never replays it as a
      // cheerful first chat message). checkAndLogSafety() has already fired a
      // (fire-and-forget) write to safetyViolations, flagged for review — this
      // response doesn't wait on or guarantee that write landed, so treat it as
      // best-effort capture for the review queue, not a hard persistence
      // guarantee, when reasoning about "is the content really preserved."
      return res.json({
        ok: false,
        blocked: 'safety',
        reply: safety.response,
        crisisDisclaimer: safety.crisisDisclaimer ?? null,
      });
    }

    // Safe, soft-crisis-but-safe, OR any non-crisis violation (inappropriate,
    // prompt_injection, harassment, gibberish, non_english, minor). All of
    // these proceed to the normal store: /turn treats a soft crisis signal the
    // same way (silently continues to generateTurnReply), and a non-crisis
    // violation is a content-moderation signal, not a safety emergency — it's
    // already logged via checkAndLogSafety() for review, and losing the
    // reader's only artifact over it would be a worse outcome than storing it.
    //
    // The verdict is stored ALONGSIDE the text. Storing it does not change what
    // happens here — the reply is written and the reader is let through either way,
    // exactly as the operator ruled — it changes what happens LATER: the replay
    // (server/lib/liveThreadReplay.ts) withholds a flagged reply from the model,
    // because the normal chat path would have intercepted those same words with a
    // canned response instead of generating against them (chatEngine.ts's step-1
    // safety gate). Without this, typing a jailbreak into the lander would reach the
    // model when typing it in chat would not.
    //
    // The condition mirrors that gate exactly (`!safe && response`) so the two paths
    // agree by construction rather than by two lists that happen to match today.
    // Written unconditionally, including the null: /reply is an UPDATE a reader can
    // repeat, so a clean reply replacing a flagged one must clear the old verdict.
    //
    // pending_reply_response is cleared for the same reason and it matters just as
    // much: it holds the persona's answer to the PREVIOUS text (Task 14 —
    // liveThreadPreview.ts). Leave it and a reader who rewrites their reply is shown,
    // and later replayed, an answer to words they deliberately replaced. Nulling it
    // makes the next /reading load regenerate against what they actually said.
    const violationType = !safety.safe && safety.response ? safety.violationType : null;
    const result = await db
      .update(evelynLanderSessions)
      .set({
        pendingReply: reply,
        pendingReplyViolationType: violationType,
        pendingReplyResponse: null,
      })
      .where(eq(evelynLanderSessions.sessionToken, sessionToken))
      .returning({ id: evelynLanderSessions.id });

    // Belt-and-suspenders: the row existed a moment ago (checked above); this
    // only fires on a genuine race (deleted between the select and this update).
    if (result.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ ok: true });
  } catch (error: any) {
    logger.error('evelyn-lander reply error', { error: error?.message });
    res.status(500).json({ error: 'Failed to store reply' });
  }
});

// ---------- POST /turn ----------
// Accepts a single user message + the conversation so far, runs universal
// safety, calls Haiku for Evelyn's reply, and increments the server-side
// turn counter. Hard caps user messages at MAX_USER_MESSAGES.
//
// Response shape:
//   { reply: string, ctaReady: boolean, blocked?: 'cap'|'safety' }
const turnSchema = z.object({
  sessionToken: z.string().min(8).max(128),
  userMessage: z.string().min(1).max(2000),
  // Cloudflare Turnstile token. Required server-side only on the first user
  // message (turnCount === 0); the widget caches a single fresh token per send.
  // No length cap: real Cloudflare Turnstile tokens can exceed 2048 chars, and a
  // .max(2048) here rejected valid tokens as "Invalid payload" (breaking the
  // chatbox first message). Matches the uncapped magic-register schema (auth.ts).
  turnstileToken: z.string().optional(),
  // Full conversation so far, including the static opener as the first
  // assistant message. Server uses this verbatim to seed Haiku — server-side
  // turnCount in the DB is the authoritative cap, so a tampered client
  // history can't extend the chat.
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

router.post('/turn', landerTurnLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = turnSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const { sessionToken, userMessage, turnstileToken, history } = parsed.data;

    const rows = await db
      .select()
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.sessionToken, sessionToken))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Hard cap: server is authoritative on turn count.
    if (row.turnCount >= MAX_USER_MESSAGES) {
      return res.json({
        reply:
          'Continue your reading to keep going with Evelyn — there\'s more here than fits this moment.',
        ctaReady: true,
        blocked: 'cap',
      });
    }

    // Turnstile required on first user message only (PRD §7.3). verifyTurnstileToken
    // fails open when TURNSTILE_SECRET_KEY is unset — same posture as the Aiden flow.
    // Do NOT increment turnCount on failure so the user can retry with a fresh token.
    if (row.turnCount === 0) {
      const ok = await verifyTurnstileToken(turnstileToken ?? '', extractClientIp(req));
      if (!ok) {
        return res.status(400).json({
          error: 'Security verification failed. Please refresh the page and try again.',
          code: 'TURNSTILE_FAILED',
        });
      }
    }

    // Universal safety on the new user message. We pass userId only when
    // resolved — sessionId is intentionally omitted because it FKs to
    // chat_sessions (lander has its own table).
    const safety = await checkAndLogSafety(userMessage, {
      userId: row.resolvedUserId ?? undefined,
      ipAddress: extractClientIp(req),
      userAgent: extractUserAgent(req),
    });
    if (!safety.safe && safety.response) {
      // Increment turn count even on safety blocks so a probe can't loop.
      await db
        .update(evelynLanderSessions)
        .set({ turnCount: sql`${evelynLanderSessions.turnCount} + 1` })
        .where(eq(evelynLanderSessions.sessionToken, sessionToken));
      const newCount = row.turnCount + 1;
      return res.json({
        reply: safety.response,
        ctaReady: newCount >= MAX_USER_MESSAGES,
        blocked: 'safety',
      });
    }

    // Resolve user/bucket context for Haiku.
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

    const { reply } = await generateTurnReply({
      messages,
      firstName,
      bucket: (row.bucket as Bucket | null) ?? null,
      isFinalTurn: willBeFinalTurn,
    });

    await db
      .update(evelynLanderSessions)
      .set({ turnCount: sql`${evelynLanderSessions.turnCount} + 1` })
      .where(eq(evelynLanderSessions.sessionToken, sessionToken));

    res.json({
      reply,
      ctaReady: willBeFinalTurn,
    });
  } catch (error: any) {
    logger.error('evelyn-lander turn error', { error: error?.message });
    res.status(500).json({ error: 'Failed to generate reply' });
  }
});

// ---------- POST /check-email ----------
// Account detection at the moment the reader hands over their email (spec
// "Frame 1.5"). Exactly three outcomes drive three different in-thread
// confirmation bubbles on the client:
//
//   verified_match   → an existing, already-verified account. Mail a magic link
//                      so one tap brings them straight back into the reading.
//   unverified_match → an existing account that never verified. Resend/resume
//                      THAT account's verification — never a second account, and
//                      never a magic link (which would sign them in without ever
//                      verifying; spec §Decisions).
//   no_match         → nobody here. The client proceeds to the normal signup.
//
// On either match it also stamps the account onto the reader's lander session row
// (optional `sessionToken`), which is how the post-auth routes later find the
// pendingReply parked while they were anonymous — see linkSessionToUser below.
//
// ACCOUNT ENUMERATION IS ACCEPTED HERE, NOT A BUG. Unlike
// /api/auth/resend-verification and /api/auth/send-magic-login — which both
// return a deliberately uniform "if an account exists..." response — this route
// tells the caller which of the three cases it is, because the whole feature is
// showing the reader the right next step in the thread. That was decided
// explicitly; do not "fix" it by collapsing the outcomes. The agreed mitigation
// is accountDetectionLimiter (10/hr/IP — see rateLimiter.ts), which also bounds
// how much mail a caller can aim at an address they don't own.
//
// Repeat submissions of the same address DO re-send every time, matching both
// sibling auth routes (neither debounces per-address either). See the task
// report for the reasoning: a reader who lost the first mail needs the second,
// and a per-address cooldown is state this route doesn't have — the per-IP
// ceiling is the bound that actually applies.
const checkEmailSchema = z.object({
  // .max(254) matches /start's email field (RFC 5321 address limit).
  email: z.string().email().max(254),
  // Optional, and deliberately so: the reader's lander session, used to stamp
  // resolvedUserId once the email identifies them (see linkSessionToUser). A caller
  // that omits it still gets a normal outcome, so this is not a breaking change to
  // the contract Task 11 builds against. Bounds match every other sessionToken
  // field in this file.
  sessionToken: z.string().min(8).max(128).optional(),
});

const EVELYN_SLUG = 'evelyn-cross';

/**
 * Mail an existing VERIFIED account a magic link back into the Evelyn thread.
 *
 * Deliberately scoped to Evelyn by slug rather than the user's defaultPersonaId:
 * the token's personaSlug is what MagicAuthPage turns into
 * `/reading?persona=<slug>`, and this reader clicked an Evelyn email, so anything
 * else would land them in the wrong guide's chat. (This whole rollout is Evelyn-only.)
 *
 * Follows the same shape as the closest existing precedent — the /soulmate
 * lander's existing-account branch (soulmateLanderSignup.ts:103-123) — including
 * its RESEND_API_KEY guard, which is what makes this a no-op under test.
 */
async function sendLiveThreadMagicLink(user: {
  id: string;
  email: string;
  firstName: string;
  accountStatus: string;
}): Promise<void> {
  // verifyMagicLinkToken() refuses any non-'active' account (magicLink.ts:78), so
  // minting one here would mail a link that is guaranteed to fail on click.
  // Precedent: soulmateLanderSignup.ts:103-106 skips the send for banned accounts;
  // widened to "not active" to match the verifier's own gate. The OUTCOME is
  // unchanged, so this never becomes an account-status oracle.
  if (user.accountStatus !== 'active') {
    logger.info('evelyn-lander check-email: skipping magic link for non-active account', {
      userId: user.id,
      accountStatus: user.accountStatus,
    });
    return;
  }

  const personaRows = await db
    .select({ id: personas.id })
    .from(personas)
    .where(eq(personas.slug, EVELYN_SLUG))
    .limit(1);
  const evelynId = personaRows[0]?.id;
  if (!evelynId) {
    logger.error('evelyn-lander check-email: evelyn-cross persona not found — no magic link sent');
    return;
  }

  const magicToken = await generateMagicLinkToken(user.id, evelynId, EVELYN_SLUG);
  // No &redirect= — MagicAuthPage already defaults to /reading?persona=<personaSlug>
  // off the token itself, which is exactly where the thread continues.
  const magicUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/magic-auth?t=${magicToken}`;

  const { Resend } = await import('resend');
  const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resendClient) {
    logger.warn('evelyn-lander check-email: Resend not configured — magic URL:', magicUrl);
    return;
  }

  // firstName is user-supplied and goes into an HTML body, so it is escaped —
  // matching the sibling verification mail (verificationEmail.ts:50 escapes it) and
  // deliberately NOT matching the two magic-link senders that interpolate it raw
  // (soulmateLanderSignup.ts:118, auth.ts:992). Of the two precedents this follows
  // the safer one rather than adding a third unescaped site.
  const safeName = escapeHtml(user.firstName || 'there');

  // A Resend outage must not turn a successful detection into an error screen. The
  // unverified branch already cannot fail this way — sendVerificationEmail() catches
  // internally and returns { success: false } — so without this catch the two
  // branches behave asymmetrically: a returning verified reader would get a 500 (and
  // no confirmation bubble) for a transient third-party blip, while an unverified one
  // sees success. The magic-link row is already committed above and stays valid for
  // 30 days, so the outcome we return is still true; only the delivery is in doubt,
  // and the client already offers a resend.
  try {
    await resendClient.emails.send({
      from: `The Seer Within <${process.env.FOLLOW_UP_FROM_EMAIL || 'noreply@theseerwithin.com'}>`,
      to: user.email,
      subject: 'Your reading with Evelyn is open',
      html:
        `<p>Hi ${safeName},</p>` +
        `<p>You left something with Evelyn — click below to pick it back up where you left off:</p>` +
        `<p style="margin:24px 0"><a href="${magicUrl}" style="background:#6d28d9;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Open My Reading</a></p>` +
        `<p style="color:#888;font-size:13px">This link expires in 30 days.</p>`,
    });
    logger.info('evelyn-lander check-email: magic link sent', { userId: user.id });
  } catch (error: any) {
    logger.error('evelyn-lander check-email: magic link send failed', {
      userId: user.id,
      error: error?.message,
    });
  }
}

/**
 * Stamps the matched account onto the reader's lander session row, so the
 * verify-email / magic-verify handlers can find the `pendingReply` they parked
 * while still anonymous (Task 10). `resolvedUserId` and its index already exist
 * (schema.ts:1114, :1136) and /start already writes them for the segments it can
 * resolve — this is the same write, at the moment the email finally identifies them.
 *
 * `sessionToken` is OPTIONAL on the request, so a caller that omits it still gets a
 * normal outcome; this is best-effort linkage, never a reason to fail the response.
 * The `resolvedUserId IS NULL` guard means an identity /start already established
 * (a live magic token, or a JWT) is never clobbered by a different email typed into
 * the box afterwards.
 */
/**
 * Whether the verification grant will treat this reader as an Evelyn-lander signup.
 *
 * Deliberately the SAME existence check isFromEvelynLander() runs (auth.ts:132-143):
 * any evelyn_lander_sessions row whose resolved_user_id is this user. Two consequences
 * that are easy to get backwards, so they're spelled out:
 *
 *   - It asks whether a row EXISTS, not whether linkSessionToUser() just wrote one.
 *     When the session was already linked to this same user the UPDATE matches zero
 *     rows, but the row is still there and the grant still fires — keying off the
 *     update's row count would quote 3 while granting 5.
 *   - Any row counts, not only this visit's. A reader with an older linked session
 *     is already eligible even if no sessionToken was supplied this time.
 *
 * The persona half of the condition needs no handling here: reissueVerificationEmail()
 * resolves personaSlug from defaultPersonaId, and getFreeMinutesForSignup() only
 * returns 5 when that slug is 'evelyn-cross' (verificationEmail.ts:52-58) — precisely
 * when isEvelynUser() would be true. The two sides move together by construction.
 *
 * Silent-fails to false, mirroring isFromEvelynLander(): if the lookup errors, the
 * grant may still fire while the copy quotes 3. Under-promising is the safe direction.
 */
async function hasEvelynLanderLink(userId: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: evelynLanderSessions.id })
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.resolvedUserId, userId))
      .limit(1);
    return rows.length > 0;
  } catch (error: any) {
    logger.warn('evelyn-lander check-email: lander-link lookup failed', { error: error?.message });
    return false;
  }
}

async function linkSessionToUser(sessionToken: string | undefined, userId: string): Promise<void> {
  if (!sessionToken) return;
  try {
    await db
      .update(evelynLanderSessions)
      .set({ resolvedUserId: userId })
      .where(
        and(
          eq(evelynLanderSessions.sessionToken, sessionToken),
          isNull(evelynLanderSessions.resolvedUserId),
        ),
      );
  } catch (error: any) {
    logger.warn('evelyn-lander check-email: failed to link session to user', {
      error: error?.message,
    });
  }
}

router.post('/check-email', accountDetectionLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = checkEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    // Same normalisation resolveSegment() uses above, which is the same
    // `.toLowerCase()` registration stores by (auth.ts:315). A mismatch here would
    // report no_match for an account that genuinely exists and push the reader into
    // a signup that then collides with the unique-email constraint.
    const email = parsed.data.email.trim().toLowerCase();

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        emailVerified: users.emailVerified,
        accountStatus: users.accountStatus,
        defaultPersonaId: users.defaultPersonaId,
        welcomeCoinsGrantedAt: users.welcomeCoinsGrantedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const existing = userRows[0];

    if (!existing) {
      return res.json({ outcome: 'no_match' });
    }

    // Any match — verified or not — is the moment this reader stops being anonymous,
    // so link the session either way. Both post-auth routes (verify-email and
    // magic-verify) need it to find their pendingReply.
    //
    // Gated on accountStatus for the same reason resolveSegment() returns
    // resolvedUserId: null for non-active accounts (:188-195 — "treat as brand-new
    // opener... but DO record the lookup"), and matching sendLiveThreadMagicLink()'s
    // own gate below: a banned/suspended reader has no way back in, so writing a link
    // that grants them lander minutes and enrols them in a nurture drip would be
    // wrong. The OUTCOME is unchanged either way, so this stays invisible to the
    // caller and the route never becomes an account-status oracle.
    if (existing.accountStatus === 'active') {
      await linkSessionToUser(parsed.data.sessionToken, existing.id);
    }

    if (existing.emailVerified) {
      await sendLiveThreadMagicLink(existing);
      return res.json({ outcome: 'verified_match' });
    }

    // Shared with POST /api/auth/resend-verification, so the 24-hour expiry has a
    // single definition.
    //
    // `source` is passed exactly when the reader will genuinely receive the
    // Evelyn-lander grant. The link written just above is what makes
    // isFromEvelynLander() true at verify time, selecting EVELYN_LANDER_FREE_COINS
    // (5 min) over the persona default (3) and enrolling them in the Evelyn verified
    // drip — so the copy has to quote 5 too, or it contradicts the write it just
    // caused. Evaluated AFTER the link, and by row existence rather than rows-updated:
    // see hasEvelynLanderLink() for why that distinction decides the answer.
    //
    // The Live Thread tier is the same argument one level up — but it must NOT be
    // re-derived here as "linked && has a pending_reply". That is what the grant chain
    // asks LAST, not first. It evaluates the soulmate tier BEFORE either Evelyn tier,
    // and a /soulmate signup is created unverified with defaultPersonaId=evelyn-cross
    // and a linked soulmate row (soulmateLanderSignup.ts:129-149) — so such a reader can
    // satisfy both Evelyn conditions here while the grant still resolves to soulmate's
    // 5 minutes. Quoting 10 there would promise a grant that never arrives.
    //
    // So the tier comes from the SAME resolver the grant sites read
    // (server/lib/welcomeGrantTier.ts), which owns the precedence. `landerLinked` still
    // drives `source`, unchanged, so the soulmate and Luna paths keep quoting exactly
    // what they quoted before the Live Thread tier existed.
    const landerLinked = await hasEvelynLanderLink(existing.id);
    const welcomeTier = await resolveWelcomeGrantTier(existing.id, existing.defaultPersonaId);
    const engagedViaLiveThread = welcomeTier === 'live-thread';
    const { freeMinutesQuoted } = await reissueVerificationEmail(
      existing,
      landerLinked ? { source: 'evelyn-lander', engagedViaLiveThread } : {},
    );
    // Logged because a minutes mismatch is otherwise invisible until a reader
    // complains: this records what the copy promised and why.
    logger.info('evelyn-lander check-email: verification reissued', {
      userId: existing.id,
      landerLinked,
      welcomeTier,
      engagedViaLiveThread,
      freeMinutesQuoted,
    });
    return res.json({ outcome: 'unverified_match' });
  } catch (error: any) {
    logger.error('evelyn-lander check-email error', { error: error?.message });
    res.status(500).json({ error: 'Failed to check email' });
  }
});

export default router;
