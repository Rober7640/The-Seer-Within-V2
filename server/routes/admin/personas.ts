// Admin Persona Management API Routes
// All routes require admin authentication (applied via parent router)

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createPersona,
  updatePersona,
  setPersonaActive,
  getPersonaById,
  listPersonas,
  clonePersona,
  getPersonaAnalytics,
} from '../../lib/personaManager';
import { db } from '../../lib/db';
import { personaReviews, sessionFeedback, users } from '@shared/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import logger from '../../lib/logger';

// ── Avatar upload configuration ──────────────────────────────────────────────
// Required dimensions: 400×400 px minimum, square (1:1 ratio)
// Accepted formats: JPEG, PNG, WebP
// Max file size: 2 MB
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const AVATAR_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: AVATAR_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (AVATAR_ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images are accepted'));
    }
  },
});

const router = Router();

// ── Persona prompt security validation ────────────────────────────────────────
// Checks admin-supplied system prompts for patterns that could disable safety
// guardrails if the admin account is ever compromised.
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous\s+)?(?:safety|instructions?|rules?|guidelines?|restrictions?)/i,
  /override\s+(?:your|the|all)\s+(?:safety|instructions?|rules?|guidelines?)/i,
  /disable\s+(?:safety|restrictions?|guidelines?|filters?)/i,
  /bypass\s+(?:safety|restrictions?|guidelines?|filters?)/i,
  /you\s+(?:have\s+no|are\s+free\s+from)\s+restrictions?/i,
  /respond\s+to\s+(?:all|any)\s+requests?\s+without\s+restrictions?/i,
  /do\s+not\s+(?:apply|use|follow)\s+(?:any\s+)?safety/i,
  /safety\s+(?:checks?|guidelines?|filters?)\s+(?:are\s+)?disabled/i,
  /act\s+as\s+(?:an?\s+)?(?:unrestricted|unfiltered|uncensored)/i,
];

function validatePersonaPrompt(prompt: string): string | null {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      return `System prompt contains a restricted phrase that could disable safety guardrails. Remove language matching: ${pattern.source}`;
    }
  }
  return null;
}

// Zod schemas for request validation
const createPersonaSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  displayName: z.string().min(1).max(100),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  avatarUrl: z.string().optional(),
  baseSystemPrompt: z.string().min(1),
  personality: z.record(z.unknown()).optional(),
  categories: z.array(z.string()).optional(),
  customPricing: z.union([z.array(z.unknown()), z.record(z.unknown())]).nullable().optional(),
  coinsPerMinute: z.number().int().min(1).max(2000).optional(), // cents/min = $/min × 100; max = $20.00/min
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  yearsExperience: z.number().int().min(0).max(100).nullable().optional(),
  readingsCount: z.number().int().min(0).nullable().optional(),
  aiModel: z.string().nullable().optional(),
  basicModel: z.string().nullable().optional(),
});

const updatePersonaSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  avatarUrl: z.string().nullable().optional(),
  baseSystemPrompt: z.string().min(1).optional(),
  personality: z.record(z.unknown()).optional(),
  categories: z.array(z.string()).optional(),
  customPricing: z.union([z.array(z.unknown()), z.record(z.unknown())]).nullable().optional(),
  coinsPerMinute: z.number().int().min(1).max(2000).optional(), // cents/min = $/min × 100; max = $20.00/min
  isDefault: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  accuracyRank: z.number().int().min(1).nullable().optional(),
  freeCoins: z.number().int().min(0).optional(),
  sessionTimeoutMinutes: z.number().int().min(1).max(120).optional(),
  availabilitySchedule: z.object({
    timezone: z.string(),
    windows: z.array(z.object({
      days: z.array(z.number().int().min(0).max(6)),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
    })),
  }).nullable().optional(),
  onlineOverride: z.enum(['online', 'offline']).nullable().optional(),
  overrideExpiresAt: z.string().datetime().nullable().optional(),
  cyclicBreakSchedule: z.object({
    enabled: z.boolean(),
    availableMinutes: z.number().int().min(1).max(120),
    breakMinutes: z.number().int().min(1).max(60),
  }).nullable().optional(),
  overallRating: z.number().min(0).max(5).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(100).nullable().optional(),
  readingsCount: z.number().int().min(0).nullable().optional(),
  aiModel: z.string().nullable().optional(),
  basicModel: z.string().nullable().optional(),
});

const createReviewSchema = z.object({
  reviewerName: z.string().min(1).max(100),
  reviewText: z.string().max(2000).optional(),
  starRating: z.number().int().min(1).max(5),
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
    logger.error('List personas error:', error);
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

    const promptError = validatePersonaPrompt(parseResult.data.baseSystemPrompt);
    if (promptError) {
      return res.status(400).json({ error: promptError });
    }

    const personaId = await createPersona(parseResult.data as any);
    const persona = await getPersonaById(personaId);

    return res.status(201).json({ persona });
  } catch (error: any) {
    // PostgreSQL unique constraint violation (slug must be unique)
    if (error.code === '23505' || error.message?.toLowerCase().includes('unique')) {
      return res.status(409).json({ error: 'A persona with this slug already exists' });
    }
    logger.error('Create persona error:', error);
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
    logger.error('Get persona error:', error);
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

    if (parseResult.data.baseSystemPrompt) {
      const promptError = validatePersonaPrompt(parseResult.data.baseSystemPrompt);
      if (promptError) {
        return res.status(400).json({ error: promptError });
      }
    }

    await updatePersona(personaId, parseResult.data as any);
    const updated = await getPersonaById(personaId);

    return res.json({ persona: updated });
  } catch (error: any) {
    logger.error('Update persona error:', error);
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
    logger.error('Set persona status error:', error);

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
    logger.error('Persona analytics error:', error);
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
    logger.error('Clone persona error:', error);
    return res.status(500).json({ error: error.message || 'Failed to clone persona' });
  }
});

// ============================================
// GET /api/admin/personas/:id/reviews - List reviews for a persona
// ============================================

router.get('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;

    const existing = await getPersonaById(personaId);
    if (!existing) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    const reviews = await db
      .select()
      .from(personaReviews)
      .where(eq(personaReviews.personaId, personaId))
      .orderBy(asc(personaReviews.createdAt));

    return res.json({ reviews });
  } catch (error: any) {
    logger.error('List persona reviews error:', error);
    return res.status(500).json({ error: 'Failed to list reviews' });
  }
});

// ============================================
// POST /api/admin/personas/:id/reviews - Add a review
// ============================================

router.post('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;

    const existing = await getPersonaById(personaId);
    if (!existing) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    const parseResult = createReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { reviewerName, reviewText, starRating } = parseResult.data;
    const inserted = await db
      .insert(personaReviews)
      .values({ personaId, reviewerName, reviewText: reviewText ?? null, starRating })
      .returning();

    return res.status(201).json({ review: inserted[0] });
  } catch (error: any) {
    logger.error('Create persona review error:', error);
    return res.status(500).json({ error: 'Failed to create review' });
  }
});

// ============================================
// DELETE /api/admin/personas/:id/reviews/:reviewId - Delete a review
// ============================================

router.delete('/:id/reviews/:reviewId', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;
    const reviewId = req.params.reviewId as string;

    const deleted = await db
      .delete(personaReviews)
      .where(and(eq(personaReviews.id, reviewId), eq(personaReviews.personaId, personaId)))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Review not found' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete persona review error:', error);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ============================================
// GET /api/admin/personas/:id/session-feedback - List real user feedback for a persona
// ============================================

router.get('/:id/session-feedback', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;

    const existing = await getPersonaById(personaId);
    if (!existing) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    const items = await db
      .select({
        id: sessionFeedback.id,
        sessionId: sessionFeedback.sessionId,
        userId: sessionFeedback.userId,
        starRating: sessionFeedback.starRating,
        feedbackText: sessionFeedback.feedbackText,
        displayName: sessionFeedback.displayName,
        approved: sessionFeedback.approved,
        createdAt: sessionFeedback.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
      })
      .from(sessionFeedback)
      .leftJoin(users, eq(sessionFeedback.userId, users.id))
      .where(eq(sessionFeedback.personaId, personaId))
      .orderBy(desc(sessionFeedback.createdAt));

    return res.json({ feedback: items });
  } catch (error: any) {
    logger.error('List session feedback error:', error);
    return res.status(500).json({ error: 'Failed to list session feedback' });
  }
});

// ============================================
// PATCH /api/admin/personas/:id/session-feedback/:feedbackId/approve - Approve a feedback item
// ============================================

router.patch('/:id/session-feedback/:feedbackId/approve', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;
    const feedbackId = req.params.feedbackId as string;

    const updated = await db
      .update(sessionFeedback)
      .set({ approved: true })
      .where(and(eq(sessionFeedback.id, feedbackId), eq(sessionFeedback.personaId, personaId)))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    return res.json({ success: true, feedback: updated[0] });
  } catch (error: any) {
    logger.error('Approve session feedback error:', error);
    return res.status(500).json({ error: 'Failed to approve feedback' });
  }
});

// ============================================
// DELETE /api/admin/personas/:id/session-feedback/:feedbackId - Permanently delete feedback
// ============================================

router.delete('/:id/session-feedback/:feedbackId', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.id as string;
    const feedbackId = req.params.feedbackId as string;

    const deleted = await db
      .delete(sessionFeedback)
      .where(and(eq(sessionFeedback.id, feedbackId), eq(sessionFeedback.personaId, personaId)))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete session feedback error:', error);
    return res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// POST /api/admin/personas/upload-avatar
// Accepts a multipart file field named "avatar".
// Returns: { url: "/uploads/avatars/avatar-<timestamp>.ext" }
// Requirements: JPEG/PNG/WebP · max 2 MB · 400×400 px minimum (square recommended)
router.post('/upload-avatar', avatarUpload.single('avatar'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `/uploads/avatars/${req.file.filename}`;
  logger.info('Avatar uploaded', { filename: req.file.filename, size: req.file.size });
  return res.json({ url });
});

// Multer error handler for this route (file too large / wrong type)
router.use((err: any, _req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image must be 2 MB or smaller' });
  }
  if (err?.message) {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

export default router;
