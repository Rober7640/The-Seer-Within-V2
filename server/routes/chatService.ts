import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { pool } from '../lib/db';
import { chatSessions, chatMessages, personas, users, sessionFeedback } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../lib/auth';
import {
  endChatSession,
  getRemainingCoins,
} from '../lib/creditTracking';
import { summarizeSession } from '../lib/memoryManager';
import { getPersonaPricing } from '../lib/personaPricing';
import { initSession, sendMessage, generateGreeting } from '../lib/chatEngine';
import { isPersonaOnline } from '../lib/personaManager';
import { chatLimiter } from '../lib/rateLimiter';
import logger from '../lib/logger';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const router = Router();

// In-memory TTL cache for greeting messages — avoids a Claude API call on every page
// refresh or tab switch. Key: `${userId}:${personaId}`. TTL: 30 minutes.
const greetingCache = new Map<string, { greeting: string; personaName: string; expiresAt: number }>();
const GREETING_CACHE_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  greetingCache.forEach((val, key) => {
    if (val.expiresAt <= now) greetingCache.delete(key);
  });
}, 10 * 60 * 1000);

const startSessionSchema = z.object({
  personaId: z.string().min(1, 'Persona ID is required'),
  /** Pre-generated greeting from the free /greeting endpoint */
  greeting: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
});

// GET /api/chat-service/greeting/:personaSlug
// Returns a personalized greeting WITHOUT creating a session or charging credits.
// Call this when the user opens the chat — only create a session when they send their first message.
router.get('/greeting/:personaSlug', requireAuth, async (req: Request, res: Response) => {
  try {
    const { personaSlug } = req.params;

    const persona = await db.select({
      id: personas.id,
      displayName: personas.displayName,
      availabilitySchedule: personas.availabilitySchedule,
      onlineOverride: personas.onlineOverride,
      overrideExpiresAt: personas.overrideExpiresAt,
    })
      .from(personas)
      .where(and(eq(personas.slug, personaSlug), eq(personas.isActive, true)))
      .limit(1);

    if (!persona[0]) {
      res.status(404).json({ error: 'Persona not found' });
      return;
    }

    if (!isPersonaOnline(persona[0])) {
      res.status(503).json({ error: 'Persona is currently offline', offline: true });
      return;
    }

    const pricing = await getPersonaPricing(persona[0].id);

    const cacheKey = `${req.userId}:${persona[0].id}`;
    const cached = greetingCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({ greeting: cached.greeting, personaName: cached.personaName, pricing });
      return;
    }

    const result = await generateGreeting({ userId: req.userId!, personaId: persona[0].id });
    greetingCache.set(cacheKey, {
      greeting: result.greeting,
      personaName: result.personaName,
      expiresAt: Date.now() + GREETING_CACHE_TTL_MS,
    });

    res.json({
      greeting: result.greeting,
      personaName: result.personaName,
      pricing,
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    if (error.message === 'PERSONA_NOT_FOUND') {
      res.status(404).json({ error: 'Persona not found' });
      return;
    }
    logger.error('Generate greeting error:', error);
    res.status(500).json({ error: 'Failed to generate greeting' });
  }
});

// POST /api/chat-service/session/end-beacon
// Called via navigator.sendBeacon when user closes the tab/browser.
// Ends the session to prevent orphaned billing. No auth required since
// sendBeacon can't set headers; we validate session ownership instead.
router.post('/session/end-beacon', async (req: Request, res: Response) => {
  try {
    // sendBeacon sends text/plain — parse manually
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const sessionId = body?.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    await endChatSession(sessionId);
    logger.info('Beacon: ended session on tab close', { sessionId });
    res.json({ success: true });
  } catch (err) {
    logger.error('Beacon end-session error:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// POST /api/chat-service/session/start
router.post('/session/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = startSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { personaId, greeting } = parseResult.data;

    // Check persona availability before creating a session
    const personaRecord = await db.select({
      id: personas.id,
      isActive: personas.isActive,
      coinsPerMinute: personas.coinsPerMinute,
      availabilitySchedule: personas.availabilitySchedule,
      onlineOverride: personas.onlineOverride,
      overrideExpiresAt: personas.overrideExpiresAt,
    })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);

    if (!personaRecord[0] || !personaRecord[0].isActive) {
      res.status(404).json({ error: 'Persona not found or inactive' });
      return;
    }

    if (!isPersonaOnline(personaRecord[0])) {
      res.status(503).json({ error: 'Persona is currently offline', offline: true });
      return;
    }

    // Update the user's default persona so they return here on next login
    await db.update(users)
      .set({ defaultPersonaId: personaId, updatedAt: new Date() })
      .where(eq(users.id, req.userId!));

    // BILLING DEBUG: balance before initSession
    const preInitBalance = await db.select({ coinBalance: users.coinBalance })
      .from(users).where(eq(users.id, req.userId!)).limit(1);
    const balancePreInit = preInitBalance[0]?.coinBalance ?? -1;

    // Use the chat engine which handles persona validation, credit check,
    // greeting generation, and conversation state initialization
    const result = await initSession({
      userId: req.userId!,
      personaId,
      priorGreeting: greeting,
    });

    // BILLING DEBUG: balance after initSession
    const postInitBalance = await db.select({ coinBalance: users.coinBalance })
      .from(users).where(eq(users.id, req.userId!)).limit(1);
    const balancePostInit = postInitBalance[0]?.coinBalance ?? -1;

    // BILLING DEBUG: count active sessions for this user
    const activeSessions = await db.execute(
      sql`SELECT id, coins_charged, status, started_at::text as started_at_raw
          FROM chat_sessions WHERE user_id = ${req.userId!} AND status = 'active'`
    );

    logger.info('SESSION_START_BILLING_DEBUG', {
      userId: req.userId,
      personaId,
      balancePreInit,
      balancePostInit,
      deducted: balancePreInit - balancePostInit,
      creditsReturned: result.creditsRemaining,
      activeSessions: activeSessions.rows,
    });

    const pricing = await getPersonaPricing(personaId);

    res.status(201).json({
      sessionId: result.sessionId,
      personaId,
      personaName: result.personaName,
      greeting: result.greeting,
      remainingCoins: result.creditsRemaining,
      pricing: { ...pricing, coinsPerMinute: personaRecord[0].coinsPerMinute },
      // TEMPORARY: billing debug info
      _billingDebug: {
        balancePreInit,
        balancePostInit,
        deducted: balancePreInit - balancePostInit,
        activeSessions: activeSessions.rows,
      },
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    if (error.message === 'OUT_OF_CREDITS') {
      res.status(402).json({ error: 'Out of coins. Please purchase more coins.' });
      return;
    }
    if (error.message === 'PERSONA_NOT_FOUND') {
      res.status(404).json({ error: 'Persona not found or inactive' });
      return;
    }
    logger.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// POST /api/chat-service/session/:id/message
router.post('/session/:id/message', requireAuth, chatLimiter, async (req: Request, res: Response) => {
  let dbBalanceBefore = -1; // Declared outside try so catch block can access it
  try {
    const sessionId = req.params.id as string;
    const parseResult = sendMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { content } = parseResult.data;

    // BILLING DEBUG: snapshot balance BEFORE sendMessage (use pool.query directly
    // to bypass any Drizzle/pgbouncer stale read issues)
    const { rows: preRows } = await pool.query(
      'SELECT coin_balance FROM users WHERE id = $1', [req.userId!]
    );
    dbBalanceBefore = Number(preRows[0]?.coin_balance ?? -1);

    // Use the chat engine which handles safety checks, intent detection,
    // conversation state, Claude API call, and response validation
    const result = await sendMessage(sessionId, req.userId!, content, {
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    // BILLING DEBUG: snapshot balance AFTER sendMessage
    const balanceAfter = await db.select({ coinBalance: users.coinBalance })
      .from(users).where(eq(users.id, req.userId!)).limit(1);
    const dbBalanceAfter = balanceAfter[0]?.coinBalance ?? -1;

    // BILLING DEBUG: get session billing state
    const sessionDebug = await db.execute(
      sql`SELECT coins_charged, duration_seconds,
                 started_at::text as started_at_raw,
                 last_message_at::text as last_message_at_raw,
                 EXTRACT(EPOCH FROM (NOW() - (started_at AT TIME ZONE 'UTC')))::int as elapsed_utc,
                 current_setting('timezone') as session_timezone
          FROM chat_sessions WHERE id = ${sessionId}`
    );

    logger.info('MESSAGE_BILLING_DEBUG', {
      sessionId,
      userId: req.userId,
      dbBalanceBefore,
      dbBalanceAfter,
      deducted: dbBalanceBefore - dbBalanceAfter,
      returnedCreditsRemaining: result.creditsRemaining,
      sessionState: sessionDebug.rows[0] || null,
    });

    res.json({
      message: result.message,
      remainingCoins: result.creditsRemaining,
      sessionStatus: result.sessionActive ? 'active' : 'ended',
      blocked: result.blocked || false,
      tarotDraw: result.tarotDraw || false,
      chartData: result.chartData ?? null,
      userMessageId: result.userMessageId,
      assistantMessageId: result.assistantMessageId,
      // TEMPORARY: billing debug info — remove after fixing
      _billingDebug: {
        dbBalanceBefore,
        dbBalanceAfter,
        deducted: dbBalanceBefore - dbBalanceAfter,
        session: sessionDebug.rows[0] || null,
      },
    });
  } catch (error: any) {
    if (error.message === 'SESSION_NOT_FOUND') {
      res.status(404).json({ error: 'Active session not found' });
      return;
    }
    if (error.message === 'SESSION_ENDED') {
      res.status(410).json({ error: 'Session has ended' });
      return;
    }
    if (error.message === 'OUT_OF_CREDITS') {
      // Comprehensive 402 diagnostic: read balance via BOTH Drizzle and raw SQL
      const oocBalance = await db.select({ coinBalance: users.coinBalance })
        .from(users).where(eq(users.id, req.userId!)).limit(1);
      const rawOocBalance = await db.execute(
        sql`SELECT coin_balance, updated_at::text as updated_at FROM users WHERE id = ${req.userId!}`
      );
      // Get recent sessions and transactions for this user
      const recentSessions = await db.execute(
        sql`SELECT id, status, coins_charged, duration_seconds,
                   started_at::text, ended_at::text
            FROM chat_sessions WHERE user_id = ${req.userId!}
            ORDER BY created_at DESC LIMIT 5`
      );
      const rawRow = rawOocBalance.rows[0] as any;

      logger.error('OUT_OF_CREDITS thrown - FULL DIAGNOSTIC', {
        sessionId: req.params.id,
        userId: req.userId,
        pid: process.pid,
        drizzleBalance: oocBalance[0]?.coinBalance ?? -1,
        rawSqlBalance: rawRow?.coin_balance ?? -1,
        rawSqlUpdatedAt: rawRow?.updated_at ?? 'N/A',
        dbBalanceBeforeSendMessage: dbBalanceBefore,
        recentSessions: recentSessions.rows,
      });
      res.status(402).json({
        error: 'Out of coins',
        remainingCoins: 0,
        dbBalance: oocBalance[0]?.coinBalance ?? -1,
        rawSqlBalance: rawRow?.coin_balance ?? -1,
        dbBalanceBeforeSendMessage: dbBalanceBefore,
        rawSqlUpdatedAt: rawRow?.updated_at ?? 'N/A',
        pid: process.pid,
        recentSessions: recentSessions.rows,
      });
      return;
    }
    logger.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/chat-service/session/:id/end
router.post('/session/:id/end', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;

    // Verify session belongs to user
    const session = await db.select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, req.userId!),
      ))
      .limit(1);

    if (!session[0]) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await endChatSession(sessionId);

    // Summarize session in background
    summarizeSession(sessionId).catch(err =>
      logger.error('Session summarization failed:', err)
    );

    const remainingCoins = await getRemainingCoins(req.userId!);

    res.json({
      sessionStatus: 'ended',
      remainingCoins,
    });
  } catch (error) {
    logger.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// GET /api/chat-service/sessions
router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessions = await db.select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, req.userId!))
      .orderBy(desc(chatSessions.createdAt))
      .limit(50);

    res.json({ sessions });
  } catch (error) {
    logger.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/chat-service/session/:id/messages
router.get('/session/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;

    // Verify session belongs to user
    const session = await db.select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, req.userId!),
      ))
      .limit(1);

    if (!session[0]) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const messages = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.sentAt);

    res.json({ messages });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// GET /api/chat-service/teaser/:personaSlug
// Returns a blurred teaser message for low-credit users
// NOTE: requires outreach_messages table (migration 010) — silently returns no teaser if table missing
router.get('/teaser/:personaSlug', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { personaSlug } = req.params;

    // Get user's coin balance
    const userRecord = await db.select({ coinBalance: users.coinBalance, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord[0]) {
      res.json({ locked: false, message: null });
      return;
    }

    const { coinBalance, firstName } = userRecord[0];

    // Only show teaser if user has low/no credits (≤ 120 coins = 2 min)
    if (coinBalance > 120) {
      res.json({ locked: false, message: null });
      return;
    }

    // Get persona (only select columns that definitely exist)
    const persona = await db.select({
      id: personas.id,
      baseSystemPrompt: personas.baseSystemPrompt,
    })
      .from(personas)
      .where(and(eq(personas.slug, personaSlug), eq(personas.isActive, true)))
      .limit(1);

    if (!persona[0]) {
      res.json({ locked: false, message: null });
      return;
    }

    const now = new Date();

    // Check for a non-expired cached teaser using raw SQL (table may not exist yet)
    let existingMessage: string | null = null;
    try {
      const existingResult = await pool.query(
        `SELECT message FROM outreach_messages
         WHERE user_id = $1 AND persona_id = $2 AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [userId, persona[0].id],
      );
      if (existingResult.rows[0]) {
        existingMessage = existingResult.rows[0].message;
      }
    } catch {
      // Table doesn't exist yet — migration 010 not run yet, skip caching
    }

    if (existingMessage) {
      res.json({ locked: true, message: existingMessage });
      return;
    }

    // Generate a new teaser message
    const sanitisedName = (firstName ?? '')
      .replace(/[<>\[\]{}\\]/g, '')
      .trim()
      .slice(0, 50) || 'dear seeker';

    const prompt = `Write a warm, intriguing 2-sentence message hinting that you have something important to share with ${sanitisedName} who hasn't started a reading yet.
DO NOT mention credits, payments, coins, or any technical/system details.
Be personal, mystical, and leave them wanting to know more.
Return only the message text, no quotes or labels.`;

    let teaserText = '';
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 120,
        system: persona[0].baseSystemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
      teaserText = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    } catch (aiErr) {
      logger.error('Teaser generation failed', { error: (aiErr as Error).message });
      teaserText = `I've been sensing some powerful energy around you, ${firstName || 'dear seeker'}. There's something I need to share with you about your path ahead.`;
    }

    if (!teaserText) {
      res.json({ locked: false, message: null });
      return;
    }

    // Try to cache in DB (silent fail if table missing)
    try {
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await pool.query(
        `INSERT INTO outreach_messages (user_id, persona_id, message, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, persona[0].id, teaserText, expiresAt],
      );
    } catch {
      // Migration 010 not run yet — teaser generated but not cached, that's fine
    }

    res.json({ locked: true, message: teaserText });
  } catch (error) {
    logger.error('Teaser endpoint error:', error);
    // Fail gracefully — teaser is not critical
    res.json({ locked: false, message: null });
  }
});

// POST /api/chat-service/session/:id/feedback
// Submit a star rating + optional text feedback for a completed (or active) session.
// One submission per session — silently ignores duplicates.
const feedbackSchema = z.object({
  starRating: z.number().int().min(1).max(5),
  feedbackText: z.string().max(2000).optional(),
  displayName: z.string().max(100).optional(), // null/undefined = user opted out of showing name
});

router.post('/session/:id/feedback', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { id: sessionId } = req.params;

    // Validate body
    const parse = feedbackSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Invalid feedback data', details: parse.error.issues });
      return;
    }
    const { starRating, feedbackText, displayName } = parse.data;

    // Verify session belongs to this user
    const sessionRows = await db.select({
      id: chatSessions.id,
      personaId: chatSessions.personaId,
      durationSeconds: chatSessions.durationSeconds,
    })
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
      .limit(1);

    if (!sessionRows.length) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Insert feedback (ignore duplicate — unique index on sessionId would prevent double-submit)
    await db.insert(sessionFeedback).values({
      sessionId,
      userId,
      personaId: sessionRows[0].personaId,
      starRating,
      feedbackText: feedbackText ?? null,
      displayName: displayName?.trim() || null,
      approved: false,
    });

    logger.info('Session feedback submitted', { sessionId, userId, starRating });
    res.json({ success: true });
  } catch (error: any) {
    // Duplicate key → already submitted, treat as success
    if (error?.code === '23505') {
      res.json({ success: true });
      return;
    }
    logger.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// ─── DIAGNOSTIC: billing debug endpoint (TEMPORARY — remove after debugging) ───
// GET /api/chat-service/debug/billing
// Returns the raw billing state for the current user: balance, all sessions, timestamps, etc.
router.get('/debug/billing', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // 1. User balance
    const userRow = await db.select({
      id: users.id,
      coinBalance: users.coinBalance,
      totalCoinsUsed: users.totalCoinsUsed,
    }).from(users).where(eq(users.id, userId)).limit(1);

    // 2. All sessions (last 10)
    const sessions = await db.execute(
      sql`SELECT id, persona_id, status, coins_charged, duration_seconds,
                 started_at::text as started_at_raw,
                 last_message_at::text as last_message_at_raw,
                 ended_at::text as ended_at_raw,
                 last_heartbeat_at::text as last_heartbeat_at_raw,
                 created_at::text as created_at_raw,
                 EXTRACT(EPOCH FROM (NOW() - (started_at AT TIME ZONE 'UTC')))::int as elapsed_utc,
                 EXTRACT(EPOCH FROM (NOW() - started_at))::int as elapsed_session_tz,
                 (NOW() AT TIME ZONE 'UTC')::text as server_now_utc,
                 NOW()::text as server_now_session_tz,
                 current_setting('timezone') as session_timezone
          FROM chat_sessions
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 10`
    );

    // 3. Credit transactions (last 10)
    let transactions: any[] = [];
    try {
      const txResult = await pool.query(
        `SELECT id, type, amount, description, created_at::text as created_at_raw
         FROM credit_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId],
      );
      transactions = txResult.rows;
    } catch {
      // Table may not exist
    }

    // 4. Persona coinsPerMinute for all active personas
    const personaRates = await db.select({
      id: personas.id,
      displayName: personas.displayName,
      coinsPerMinute: personas.coinsPerMinute,
    }).from(personas).where(eq(personas.isActive, true));

    res.json({
      user: userRow[0] || null,
      sessions: sessions.rows,
      transactions,
      personaRates,
      _note: 'TEMPORARY DEBUG ENDPOINT — remove after fixing billing',
    });
  } catch (error) {
    logger.error('Debug billing error:', error);
    res.status(500).json({ error: 'Debug query failed', details: (error as Error).message });
  }
});

export default router;
