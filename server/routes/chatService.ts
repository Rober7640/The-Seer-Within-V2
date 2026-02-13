import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { chatSessions, chatMessages, personas } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../lib/auth';
import {
  startChatSession,
  endChatSession,
  checkpointSession,
  getRemainingMinutes,
} from '../lib/creditTracking';
import { loadUserContext, summarizeSession } from '../lib/memoryManager';
import { getPersonaPricing } from '../lib/personaPricing';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const startSessionSchema = z.object({
  personaId: z.string().min(1, 'Persona ID is required'),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
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

    const { personaId } = parseResult.data;

    // Verify persona exists and is active
    const persona = await db.select()
      .from(personas)
      .where(and(eq(personas.id, personaId), eq(personas.isActive, true)))
      .limit(1);

    if (!persona[0]) {
      res.status(404).json({ error: 'Persona not found or inactive' });
      return;
    }

    const sessionId = await startChatSession(req.userId!, personaId);
    const remainingMinutes = await getRemainingMinutes(req.userId!);
    const pricing = await getPersonaPricing(personaId);

    res.status(201).json({
      sessionId,
      personaId,
      personaName: persona[0].displayName,
      remainingMinutes,
      pricing,
    });
  } catch (error: any) {
    if (error.message === 'OUT_OF_CREDITS') {
      res.status(402).json({ error: 'Out of credits. Please purchase more time.' });
      return;
    }
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// POST /api/chat-service/session/:id/message
router.post('/session/:id/message', requireAuth, async (req: Request, res: Response) => {
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

    // Verify session belongs to user and is active
    const session = await db.select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, req.userId!),
        eq(chatSessions.status, 'active'),
      ))
      .limit(1);

    if (!session[0]) {
      res.status(404).json({ error: 'Active session not found' });
      return;
    }

    // Check remaining credits
    const remainingMinutes = await getRemainingMinutes(req.userId!);
    if (remainingMinutes <= 0) {
      await endChatSession(sessionId);
      res.status(402).json({ error: 'Out of credits', remainingMinutes: 0 });
      return;
    }

    // Save user message
    await db.insert(chatMessages).values({
      sessionId,
      userId: req.userId!,
      role: 'user',
      content,
    });

    // Checkpoint the session timer
    await checkpointSession(sessionId);

    // Load persona
    const persona = await db.select()
      .from(personas)
      .where(eq(personas.id, session[0].personaId))
      .limit(1);

    // Load conversation history for this session
    const history = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.sentAt);

    // Load user context from memory
    const userContext = await loadUserContext(req.userId!, session[0].personaId);

    // Build messages for Claude
    const systemPrompt = persona[0]?.baseSystemPrompt || 'You are a helpful spiritual guide.';
    const contextBlock = userContext
      ? `\n\n[MEMORY FROM PREVIOUS SESSIONS]\n${userContext}\n[END MEMORY]`
      : '';

    const claudeMessages = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt + contextBlock,
      messages: claudeMessages,
    });

    const assistantContent = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Save assistant message
    await db.insert(chatMessages).values({
      sessionId,
      userId: req.userId!,
      role: 'assistant',
      content: assistantContent,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    });

    const updatedMinutes = await getRemainingMinutes(req.userId!);

    res.json({
      message: assistantContent,
      remainingMinutes: updatedMinutes,
      sessionStatus: 'active',
    });
  } catch (error) {
    console.error('Send message error:', error);
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
      console.error('Session summarization failed:', err)
    );

    const remainingMinutes = await getRemainingMinutes(req.userId!);

    res.json({
      sessionStatus: 'ended',
      remainingMinutes,
    });
  } catch (error) {
    console.error('End session error:', error);
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
    console.error('List sessions error:', error);
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
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

export default router;
