// Admin Marketplace API
// Controls "Voted Most Accurate" ordering and "Guide of the Day" on the public personas directory

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { personas } from '@shared/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import logger from '../../lib/logger';

const router = Router();

// GET /api/admin/marketplace - Get all personas with marketplace fields
router.get('/', async (req: Request, res: Response) => {
  try {
    const all = await db
      .select({
        id: personas.id,
        displayName: personas.displayName,
        avatarUrl: personas.avatarUrl,
        isActive: personas.isActive,
        isFeatured: personas.isFeatured,
        accuracyRank: personas.accuracyRank,
        sortOrder: personas.sortOrder,
      })
      .from(personas)
      .where(eq(personas.isActive, true))
      .orderBy(asc(personas.sortOrder), asc(personas.displayName));

    res.json(all);
  } catch (error) {
    logger.error('Marketplace GET error:', error);
    res.status(500).json({ error: 'Failed to load marketplace data' });
  }
});

// PUT /api/admin/marketplace/accuracy-ranks - Save drag-and-drop order
// Body: [{ id: string, rank: number | null }]
const ranksSchema = z.array(z.object({
  id: z.string(),
  rank: z.number().int().positive().nullable(),
}));

router.put('/accuracy-ranks', async (req: Request, res: Response) => {
  try {
    const parsed = ranksSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.issues });
    }

    await Promise.all(
      parsed.data.map(({ id, rank }) =>
        db.update(personas).set({ accuracyRank: rank }).where(eq(personas.id, id))
      )
    );

    res.json({ ok: true });
  } catch (error) {
    logger.error('Accuracy ranks update error:', error);
    res.status(500).json({ error: 'Failed to save accuracy ranks' });
  }
});

// PUT /api/admin/marketplace/featured - Set Guide of the Day
// Body: { id: string | null }  — null clears the featured guide
const featuredSchema = z.object({ id: z.string().nullable() });

router.put('/featured', async (req: Request, res: Response) => {
  try {
    const parsed = featuredSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body' });
    }

    // Clear all featured flags first
    await db.update(personas).set({ isFeatured: false });

    // Set the chosen one
    if (parsed.data.id) {
      await db.update(personas).set({ isFeatured: true }).where(eq(personas.id, parsed.data.id));
    }

    res.json({ ok: true });
  } catch (error) {
    logger.error('Featured update error:', error);
    res.status(500).json({ error: 'Failed to save featured guide' });
  }
});

export default router;
