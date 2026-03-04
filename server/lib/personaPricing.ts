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
    freeCoins: personas.freeCoins,
    customPricing: personas.customPricing,
  })
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  if (!result[0]) {
    return DEFAULT_PRICING;
  }

  const freeCoins = result[0].freeCoins;
  let tiers: PricingTier[];

  if (result[0].customPricing) {
    try {
      const parsed = JSON.parse(result[0].customPricing);
      // Validate each tier has the required coins fields (guards against pre-migration format)
      const isValid = Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every((t: any) => t.packageType && typeof t.totalCoins === 'number' && typeof t.priceUsd === 'number');
      if (isValid) {
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

  return { freeCoins, tiers };
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
  pricing: { freeCoins?: number; tiers?: PricingTier[] },
): Promise<void> {
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (pricing.freeCoins !== undefined) {
    updates.freeCoins = pricing.freeCoins;
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
