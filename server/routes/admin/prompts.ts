// Admin Prompts Management API Routes
// Versioned prompts with A/B testing support
// Aligned with schema: personaPrompts uses promptContent, variantLabel, trafficPercent

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createPrompt,
  updatePrompt,
  activatePrompt,
  listPromptsForPersona,
  getPromptPerformance,
  testPrompt,
} from '../../lib/promptManager';
import { getPersonaById } from '../../lib/personaManager';
import { personaPrompts } from '@shared/schema';
import { db } from '../../lib/db';
import { eq } from 'drizzle-orm';
import logger from '../../lib/logger';

const router = Router();

// Zod schemas
const createPromptSchema = z.object({
  promptType: z.string().min(1),
  promptContent: z.string().min(1),
  variantLabel: z.string().max(50).optional(),
  trafficPercent: z.number().int().min(0).max(100).optional(),
});

const updatePromptSchema = z.object({
  promptContent: z.string().min(1).optional(),
  variantLabel: z.string().max(50).optional(),
  trafficPercent: z.number().int().min(0).max(100).optional(),
});

const testPromptSchema = z.object({
  firstName: z.string().optional(),
  bucket: z.string().optional(),
  concern: z.string().optional(),
  personName: z.string().optional(),
});

// ============================================
// GET /api/admin/personas/:id/prompts - List all prompts with versions
// ============================================

router.get('/personas/:id/prompts', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;

    const persona = await getPersonaById(personaId);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    const promptType = req.query.type as string | undefined;
    const includeInactive = req.query.all === 'true';

    const prompts = await listPromptsForPersona(personaId, {
      promptType,
      includeInactive,
    });

    return res.json({ prompts });
  } catch (error: any) {
    logger.error('List prompts error:', error);
    return res.status(500).json({ error: 'Failed to list prompts' });
  }
});

// ============================================
// POST /api/admin/personas/:id/prompts - Create new prompt
// ============================================

router.post('/personas/:id/prompts', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;

    const persona = await getPersonaById(personaId);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    const parseResult = createPromptSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const promptId = await createPrompt({
      personaId,
      ...parseResult.data,
      createdBy: (req as any).adminId || undefined,
    });

    const created = await db
      .select()
      .from(personaPrompts)
      .where(eq(personaPrompts.id, promptId))
      .limit(1);

    return res.status(201).json({ prompt: created[0] });
  } catch (error: any) {
    logger.error('Create prompt error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create prompt' });
  }
});

// ============================================
// PATCH /api/admin/prompts/:promptId - Update prompt (creates new version)
// ============================================

router.patch('/prompts/:promptId', async (req: Request, res: Response) => {
  try {
    const promptId = req.params.promptId as string;

    const parseResult = updatePromptSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const newId = await updatePrompt(promptId, parseResult.data);

    const updated = await db
      .select()
      .from(personaPrompts)
      .where(eq(personaPrompts.id, newId))
      .limit(1);

    return res.json({
      prompt: updated[0],
      isNewVersion: newId !== promptId,
    });
  } catch (error: any) {
    logger.error('Update prompt error:', error);

    if (error.message === 'Prompt not found') {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    return res.status(500).json({ error: error.message || 'Failed to update prompt' });
  }
});

// ============================================
// POST /api/admin/prompts/:promptId/activate - Set as active
// ============================================

router.post('/prompts/:promptId/activate', async (req: Request, res: Response) => {
  try {
    const promptId = req.params.promptId as string;

    await activatePrompt(promptId);

    const prompt = await db
      .select()
      .from(personaPrompts)
      .where(eq(personaPrompts.id, promptId))
      .limit(1);

    return res.json({
      prompt: prompt[0],
      message: 'Prompt activated successfully',
    });
  } catch (error: any) {
    logger.error('Activate prompt error:', error);

    if (error.message === 'Prompt not found') {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    return res.status(500).json({ error: error.message || 'Failed to activate prompt' });
  }
});

// ============================================
// GET /api/admin/prompts/:promptId/performance - A/B test results
// ============================================

router.get('/prompts/:promptId/performance', async (req: Request, res: Response) => {
  try {
    const promptId = req.params.promptId as string;

    const prompt = await db
      .select()
      .from(personaPrompts)
      .where(eq(personaPrompts.id, promptId))
      .limit(1);

    if (!prompt[0]) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const performance = await getPromptPerformance(
      prompt[0].personaId,
      prompt[0].promptType,
    );

    return res.json({
      promptType: prompt[0].promptType,
      variants: performance,
    });
  } catch (error: any) {
    logger.error('Prompt performance error:', error);
    return res.status(500).json({ error: 'Failed to get performance data' });
  }
});

// ============================================
// POST /api/admin/prompts/:promptId/test - Test prompt with sample data
// ============================================

router.post('/prompts/:promptId/test', async (req: Request, res: Response) => {
  try {
    const promptId = req.params.promptId as string;

    const parseResult = testPromptSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const rendered = await testPrompt(promptId, parseResult.data);

    return res.json({
      rendered,
      promptId,
      sampleData: parseResult.data,
    });
  } catch (error: any) {
    logger.error('Test prompt error:', error);

    if (error.message === 'Prompt not found') {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    return res.status(500).json({ error: error.message || 'Failed to test prompt' });
  }
});

export default router;
