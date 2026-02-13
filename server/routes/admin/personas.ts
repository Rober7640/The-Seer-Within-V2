// Admin Persona Management API Routes
// All routes require admin authentication (applied via parent router)

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createPersona,
  updatePersona,
  setPersonaActive,
  getPersonaById,
  listPersonas,
  clonePersona,
  getPersonaAnalytics,
} from '../../lib/personaManager';

const router = Router();

// Zod schemas for request validation
const createPersonaSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  displayName: z.string().min(1).max(100),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  baseSystemPrompt: z.string().min(1),
  personality: z.object({
    tone: z.string().min(1),
    speakingStyle: z.string().min(1),
    archetype: z.string().min(1),
    quirks: z.array(z.string()),
    forbiddenPhrases: z.array(z.string()),
    specialties: z.array(z.string()),
    sampleGreeting: z.string().min(1),
    maxWordsPerMessage: z.number().int().min(10).max(500).default(25),
    claudeModel: z.string().default('claude-sonnet-4-20250514'),
  }).optional(),
  categories: z.array(z.string()).optional(),
  customPricing: z.object({
    freeMinutes: z.number().int().min(0).max(60),
    '15min': z.number().int().min(0),
    '30min': z.number().int().min(0),
    customPackages: z.array(z.object({
      minutes: z.number().int().min(1),
      priceUsd: z.number().int().min(0),
      label: z.string(),
    })).optional(),
  }).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updatePersonaSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  baseSystemPrompt: z.string().min(1).optional(),
  personality: z.record(z.unknown()).optional(),
  categories: z.array(z.string()).optional(),
  customPricing: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const statusSchema = z.object({
  isActive: z.boolean(),
});

const cloneSchema = z.object({
  newSlug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  newDisplayName: z.string().min(1).max(100),
});

// ============================================
// GET /api/admin/personas - List all personas with stats
// ============================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const includeStats = req.query.stats === 'true';

    const result = await listPersonas({ activeOnly, includeStats });
    return res.json({ personas: result });
  } catch (error: any) {
    console.error('List personas error:', error);
    return res.status(500).json({ error: 'Failed to list personas' });
  }
});

// ============================================
// POST /api/admin/personas - Create new persona
// ============================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = createPersonaSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const personaId = await createPersona(parseResult.data);
    const persona = await getPersonaById(personaId);

    return res.status(201).json({ persona });
  } catch (error: any) {
    console.error('Create persona error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create persona' });
  }
});

// ============================================
// GET /api/admin/personas/:id - Get persona details
// ============================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;
    const persona = await getPersonaById(personaId);

    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    return res.json({ persona });
  } catch (error: any) {
    console.error('Get persona error:', error);
    return res.status(500).json({ error: 'Failed to get persona' });
  }
});

// ============================================
// PATCH /api/admin/personas/:id/config - Update persona config
// ============================================

router.patch('/:id/config', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;

    const existing = await getPersonaById(personaId);
    if (!existing) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    const parseResult = updatePersonaSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    await updatePersona(personaId, parseResult.data as any);
    const updated = await getPersonaById(personaId);

    return res.json({ persona: updated });
  } catch (error: any) {
    console.error('Update persona error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update persona' });
  }
});

// ============================================
// PATCH /api/admin/personas/:id/status - Activate/deactivate
// ============================================

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;

    const parseResult = statusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    await setPersonaActive(personaId, parseResult.data.isActive);
    const updated = await getPersonaById(personaId);

    return res.json({ persona: updated });
  } catch (error: any) {
    console.error('Set persona status error:', error);

    if (error.message?.includes('Cannot activate')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message || 'Failed to update status' });
  }
});

// ============================================
// GET /api/admin/personas/:id/analytics - Revenue & usage stats
// ============================================

router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;

    const existing = await getPersonaById(personaId);
    if (!existing) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    let dateRange: { start: Date; end: Date } | undefined;
    if (req.query.startDate && req.query.endDate) {
      dateRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      };
    }

    const analytics = await getPersonaAnalytics(personaId, dateRange);
    return res.json({ analytics });
  } catch (error: any) {
    console.error('Persona analytics error:', error);
    return res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ============================================
// POST /api/admin/personas/:id/clone - Duplicate persona as template
// ============================================

router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const sourceId = req.params.id as string;

    const parseResult = cloneSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const newId = await clonePersona(
      sourceId,
      parseResult.data.newSlug,
      parseResult.data.newDisplayName,
    );
    const newPersona = await getPersonaById(newId);

    return res.status(201).json({ persona: newPersona });
  } catch (error: any) {
    console.error('Clone persona error:', error);
    return res.status(500).json({ error: error.message || 'Failed to clone persona' });
  }
});

export default router;
