import { db } from './db';
import { personas } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { PersonaPricing, PricingTier } from '../../shared/types';
import { DEFAULT_PRICING } from '../../shared/types';

/**
 * Load pricing for a specific persona from the database.
 * Falls back to DEFAULT_PRICING if persona has no custom pricing set.
 */
export async function getPersonaPricing(personaId: string): Promise<PersonaPricing> {
  const result = await db.select({
    freeMinutes: personas.freeMinutes,
    customPricing: personas.customPricing,
  })
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  if (!result[0]) {
    return DEFAULT_PRICING;
  }

  const freeMinutes = result[0].freeMinutes;
  let tiers: PricingTier[];

  if (result[0].customPricing) {
    try {
      const parsed = JSON.parse(result[0].customPricing);
      if (Array.isArray(parsed) && parsed.length > 0) {
        tiers = parsed;
      } else {
        tiers = DEFAULT_PRICING.tiers;
      }
    } catch {
      tiers = DEFAULT_PRICING.tiers;
    }
  } else {
    tiers = DEFAULT_PRICING.tiers;
  }

  return { freeMinutes, tiers };
}

/**
 * Find a specific pricing tier for a persona by packageType.
 */
export async function getPersonaTier(
  personaId: string,
  packageType: string,
): Promise<PricingTier | null> {
  const pricing = await getPersonaPricing(personaId);
  return pricing.tiers.find(t => t.packageType === packageType) || null;
}

/**
 * Update a persona's custom pricing tiers.
 * Pass null to clear custom pricing (revert to defaults).
 */
export async function updatePersonaPricing(
  personaId: string,
  pricing: { freeMinutes?: number; tiers?: PricingTier[] },
): Promise<void> {
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (pricing.freeMinutes !== undefined) {
    updates.freeMinutes = pricing.freeMinutes;
  }

  if (pricing.tiers !== undefined) {
    updates.customPricing = pricing.tiers.length > 0
      ? JSON.stringify(pricing.tiers)
      : null;
  }

  await db.update(personas)
    .set(updates)
    .where(eq(personas.id, personaId));
}
