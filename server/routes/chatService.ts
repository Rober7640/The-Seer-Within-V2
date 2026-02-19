import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { pool } from '../lib/db';
import { chatSessions, chatMessages, personas, users } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
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

const startSessionSchema = z.object({
  personaId: z.string().min(1, 'Persona ID is required'),
  /** Pre-generated greeting from the free /greeting endpoint */
  greeting: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
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

    const result = await generateGreeting({ userId: req.userId!, personaId: persona[0].id });
    const pricing = await getPersonaPricing(persona[0].id);

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

    // Use the chat engine which handles persona validation, credit check,
    // greeting generation, and conversation state initialization
    const result = await initSession({
      userId: req.userId!,
      personaId,
      priorGreeting: greeting,
    });

    const pricing = await getPersonaPricing(personaId);

    res.status(201).json({
      sessionId: result.sessionId,
      personaId,
      personaName: result.personaName,
      greeting: result.greeting,
      remainingCoins: result.creditsRemaining,
      pricing,
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

    // Use the chat engine which handles safety checks, intent detection,
    // conversation state, Claude API call, and response validation
    const result = await sendMessage(sessionId, req.userId!, content, {
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.json({
      message: result.message,
      remainingCoins: result.creditsRemaining,
      sessionStatus: result.sessionActive ? 'active' : 'ended',
      blocked: result.blocked || false,
      tarotDraw: result.tarotDraw || false,
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
      res.status(402).json({ error: 'Out of coins', remainingCoins: 0 });
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
    const prompt = `${persona[0].baseSystemPrompt}

## Task: Proactive Teaser Message
You want to reach out to ${firstName || 'a seeker'} who hasn't started a reading yet.
Write a warm, intriguing 2-sentence message hinting that you have something important to share with them.
DO NOT mention credits, payments, coins, or any technical/system details.
Be personal, mystical, and leave them wanting to know more.
Return only the message text, no quotes or labels.`;

    let teaserText = '';
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 120,
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

export default router;
