// Admin Persona Pricing Management Routes
// GET/PATCH per-persona pricing (free minutes + credit packages)

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db';
import { personas } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getPersonaPricing, updatePersonaPricing } from '../../lib/personaPricing';

const router = Router();

const pricingTierSchema = z.object({
  packageType: z.string().min(1),
  minutes: z.number().int().positive(),
  priceUsd: z.number().int().positive(), // in cents
  label: z.string().min(1),
});

const updatePricingSchema = z.object({
  freeMinutes: z.number().int().min(0).optional(),
  tiers: z.array(pricingTierSchema).optional(),
});

// GET /api/admin/personas/:personaId/pricing
router.get('/:personaId/pricing', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.personaId as string;

    // Verify persona exists
    const persona = await db.select({
      id: personas.id,
      displayName: personas.displayName,
      slug: personas.slug,
    })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);

    if (!persona[0]) {
      res.status(404).json({ error: 'Persona not found' });
      return;
    }

    const pricing = await getPersonaPricing(personaId);

    // Calculate price per minute for each tier
    const tiersWithRate = pricing.tiers.map(t => ({
      ...t,
      pricePerMinute: Math.round(t.priceUsd / t.minutes),
    }));

    res.json({
      personaId: persona[0].id,
      personaName: persona[0].displayName,
      personaSlug: persona[0].slug,
      freeMinutes: pricing.freeMinutes,
      tiers: tiersWithRate,
    });
  } catch (error) {
    console.error('Get persona pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing' });
  }
});

// PATCH /api/admin/personas/:personaId/pricing
router.patch('/:personaId/pricing', async (req: Request, res: Response) => {
  try {
    const personaId = req.params.personaId as string;

    // Verify persona exists
    const persona = await db.select({ id: personas.id })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);

    if (!persona[0]) {
      res.status(404).json({ error: 'Persona not found' });
      return;
    }

    const parseResult = updatePricingSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      });
      return;
    }

    await updatePersonaPricing(personaId, parseResult.data);

    // Return the updated pricing
    const updatedPricing = await getPersonaPricing(personaId);
    const tiersWithRate = updatedPricing.tiers.map(t => ({
      ...t,
      pricePerMinute: Math.round(t.priceUsd / t.minutes),
    }));

    res.json({
      personaId,
      freeMinutes: updatedPricing.freeMinutes,
      tiers: tiersWithRate,
    });
  } catch (error) {
    console.error('Update persona pricing error:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});

// GET /api/admin/pricing/all - Get pricing for all personas (overview)
router.get('/all', async (_req: Request, res: Response) => {
  try {
    const allPersonas = await db.select({
      id: personas.id,
      displayName: personas.displayName,
      slug: personas.slug,
      freeMinutes: personas.freeMinutes,
      customPricing: personas.customPricing,
      isActive: personas.isActive,
    })
      .from(personas)
      .orderBy(personas.sortOrder);

    const result = allPersonas.map(p => {
      let tiers;
      if (p.customPricing) {
        try {
          tiers = JSON.parse(p.customPricing);
        } catch {
          tiers = null;
        }
      }

      return {
        personaId: p.id,
        personaName: p.displayName,
        personaSlug: p.slug,
        isActive: p.isActive,
        freeMinutes: p.freeMinutes,
        tiers: tiers || null,
        usingDefaults: !tiers,
      };
    });

    res.json({ personas: result });
  } catch (error) {
    console.error('Get all pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing overview' });
  }
});

export default router;
