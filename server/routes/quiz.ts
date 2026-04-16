import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { aidenQuizSessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { extractClientIp, extractUserAgent } from '../lib/fraudDetection';
import logger from '../lib/logger';

const router = Router();

const startSchema = z.object({
  sessionToken: z.string().min(1),
  personaSlug: z.string().default('aiden-powers'),
});

const answerSchema = z.object({
  sessionToken: z.string().min(1),
  q1Topic: z.string().optional(),
  q2Feeling: z.string().optional(),
  q3Outcome: z.string().optional(),
  completedQuiz: z.boolean().optional(),
});

// POST /api/quiz/start — Create a quiz session row for analytics
router.post('/start', async (req: Request, res: Response) => {
  try {
    const parseResult = startSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors.map(e => e.message).join(', ') });
      return;
    }

    const { sessionToken, personaSlug } = parseResult.data;

    await db.insert(aidenQuizSessions).values({
      sessionToken,
      personaSlug,
      ipAddress: extractClientIp(req),
      userAgent: extractUserAgent(req),
    });

    res.json({ success: true });
  } catch (error: any) {
    // Ignore duplicate session token (user refreshed the page)
    if (error?.code === '23505') {
      res.json({ success: true });
      return;
    }
    logger.error('Quiz start error:', error);
    res.status(500).json({ error: 'Failed to start quiz session' });
  }
});

// POST /api/quiz/answer — Update quiz answers on the session row
router.post('/answer', async (req: Request, res: Response) => {
  try {
    const parseResult = answerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors.map(e => e.message).join(', ') });
      return;
    }

    const { sessionToken, ...answers } = parseResult.data;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (answers.q1Topic) updateData.q1Topic = answers.q1Topic;
    if (answers.q2Feeling) updateData.q2Feeling = answers.q2Feeling;
    if (answers.q3Outcome) updateData.q3Outcome = answers.q3Outcome;
    if (answers.completedQuiz) {
      updateData.completedQuiz = true;
      updateData.completedAt = new Date();
    }

    await db.update(aidenQuizSessions)
      .set(updateData)
      .where(eq(aidenQuizSessions.sessionToken, sessionToken));

    res.json({ success: true });
  } catch (error) {
    logger.error('Quiz answer error:', error);
    res.status(500).json({ error: 'Failed to save quiz answer' });
  }
});

export default router;
