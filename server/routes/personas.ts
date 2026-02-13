// Public Persona Directory API
// No authentication required - serves the "Choose Your Guide" experience

import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { personas, chatSessions } from '@shared/schema';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import { getPersonaPricing } from '../lib/personaPricing';

const router = Router();

// GET /api/personas - List active personas for public directory
router.get('/', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const sortBy = (req.query.sort as string) || 'sortOrder';
    const includesPricing = req.query.pricing !== 'false';

    // Fetch all active personas
    const activePersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.isActive, true))
      .orderBy(personas.sortOrder, personas.displayName);

    let results = activePersonas.map((p) => {
      let parsedCategories: string[] = [];
      try {
        parsedCategories = p.categories ? JSON.parse(p.categories) : [];
      } catch {
        parsedCategories = [];
      }

      let parsedPricing = null;
      if (includesPricing && p.customPricing) {
        try {
          parsedPricing = JSON.parse(p.customPricing);
        } catch {
          parsedPricing = null;
        }
      }

      return {
        id: p.id,
        slug: p.slug,
        displayName: p.displayName,
        tagline: p.tagline,
        description: p.description,
        avatarUrl: p.avatarUrl,
        isDefault: p.isDefault,
        freeMinutes: p.freeMinutes,
        categories: parsedCategories,
        customPricing: p.customPricing,
        ...(includesPricing && parsedPricing ? { pricingTiers: parsedPricing } : {}),
      };
    });

    // Filter by category
    if (category) {
      results = results.filter((p) =>
        p.categories.includes(category)
      );
    }

    // Sort
    if (sortBy === 'name') {
      results.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    // Default sort is already by sortOrder from the query

    res.json(results);
  } catch (error) {
    console.error('Public personas list error:', error);
    res.status(500).json({ error: 'Failed to load guides' });
  }
});

// GET /api/personas/:slug - Get single persona detail by slug (public)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;

    const persona = await db
      .select()
      .from(personas)
      .where(and(eq(personas.slug, slug), eq(personas.isActive, true)))
      .limit(1);

    if (!persona[0]) {
      res.status(404).json({ error: 'Guide not found' });
      return;
    }

    const p = persona[0];

    // Get pricing
    const pricing = await getPersonaPricing(p.id);

    // Get session stats (public-facing: just total sessions for social proof)
    const stats = await db
      .select({
        totalSessions: count(),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${chatSessions.userId})`,
      })
      .from(chatSessions)
      .where(eq(chatSessions.personaId, p.id));

    let parsedCategories: string[] = [];
    try {
      parsedCategories = p.categories ? JSON.parse(p.categories) : [];
    } catch {
      parsedCategories = [];
    }

    let parsedPersonality = null;
    try {
      parsedPersonality = p.personality ? JSON.parse(p.personality) : null;
    } catch {
      parsedPersonality = null;
    }

    res.json({
      id: p.id,
      slug: p.slug,
      displayName: p.displayName,
      tagline: p.tagline,
      description: p.description,
      avatarUrl: p.avatarUrl,
      isDefault: p.isDefault,
      freeMinutes: pricing.freeMinutes,
      categories: parsedCategories,
      pricing: {
        freeMinutes: pricing.freeMinutes,
        tiers: pricing.tiers.map((t) => ({
          ...t,
          pricePerMinute: Math.round(t.priceUsd / t.minutes),
        })),
      },
      specialties: parsedPersonality?.specialties || [],
      sampleGreeting: parsedPersonality?.sampleGreeting || null,
      stats: {
        totalReadings: stats[0]?.totalSessions || 0,
        uniqueClients: Number(stats[0]?.uniqueUsers || 0),
      },
    });
  } catch (error) {
    console.error('Public persona detail error:', error);
    res.status(500).json({ error: 'Failed to load guide details' });
  }
});

export default router;
