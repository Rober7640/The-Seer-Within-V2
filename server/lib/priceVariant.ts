// V1 funnel price split test — variant assignment + lookup.
//
// Variants and weights live in system_config under key 'v1_price_variants'.
// If the config is missing (or every weight is zero), behavior reverts to the
// historical $35 / $25 default — so this module ships dark and is "turned on"
// by inserting/editing the config row.

import { db } from './db';
import { conversations, systemConfig } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import logger from './logger';

export interface PriceVariant {
  id: string;
  priceCents: number;
  downsellCents: number;
  weight: number;
}

export interface AssignedVariant {
  variant: string;
  priceCents: number;
  downsellCents: number;
}

const FALLBACK_VARIANT: PriceVariant = {
  id: '35',
  priceCents: 3500,
  downsellCents: 2500,
  weight: 1,
};

interface CachedVariants {
  variants: PriceVariant[];
  fetchedAt: number;
}

let cache: CachedVariants | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchVariantsFromDb(): Promise<PriceVariant[]> {
  try {
    const rows = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'v1_price_variants'))
      .limit(1);

    const raw = rows[0]?.configValue;
    if (!raw) return [FALLBACK_VARIANT];

    const parsed = JSON.parse(raw);
    const variants: PriceVariant[] = Array.isArray(parsed?.variants) ? parsed.variants : [];
    const usable = variants.filter(
      (v) => typeof v.id === 'string' && v.priceCents > 0 && v.weight >= 0
    );

    if (usable.length === 0) return [FALLBACK_VARIANT];
    if (usable.every((v) => v.weight === 0)) return [FALLBACK_VARIANT];
    return usable;
  } catch (err) {
    logger.error('priceVariant: failed to read v1_price_variants config', { err });
    return [FALLBACK_VARIANT];
  }
}

export async function getActiveVariants(): Promise<PriceVariant[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.variants;
  }
  const variants = await fetchVariantsFromDb();
  cache = { variants, fetchedAt: Date.now() };
  return variants;
}

export function invalidatePriceVariantCache(): void {
  cache = null;
}

export function pickWeighted(variants: PriceVariant[]): PriceVariant {
  const totalWeight = variants.reduce((sum, v) => sum + Math.max(0, v.weight), 0);
  if (totalWeight <= 0) return variants[0] ?? FALLBACK_VARIANT;

  let roll = Math.random() * totalWeight;
  for (const v of variants) {
    roll -= Math.max(0, v.weight);
    if (roll <= 0) return v;
  }
  return variants[variants.length - 1];
}

export function resolveVariantById(
  variants: PriceVariant[],
  id: string | null | undefined
): PriceVariant | null {
  if (!id) return null;
  return variants.find((v) => v.id === id) ?? null;
}

/**
 * Assign a variant to a conversation if it doesn't already have one.
 * Idempotent: same email always sees the same variant once assigned.
 * Returns null if no conversation row exists for this email yet.
 */
export async function assignVariantIfMissing(email: string): Promise<AssignedVariant | null> {
  try {
    const existing = await db
      .select({
        id: conversations.id,
        priceVariant: conversations.priceVariant,
        priceAmountCents: conversations.priceAmountCents,
        downsellAmountCents: conversations.downsellAmountCents,
      })
      .from(conversations)
      .where(eq(conversations.email, email))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    if (existing.length === 0) {
      logger.warn('priceVariant: no conversation row for email yet, cannot assign', { email });
      return null;
    }

    const row = existing[0];
    if (row.priceVariant && row.priceAmountCents && row.downsellAmountCents) {
      return {
        variant: row.priceVariant,
        priceCents: row.priceAmountCents,
        downsellCents: row.downsellAmountCents,
      };
    }

    const variants = await getActiveVariants();
    const picked = pickWeighted(variants);

    await db
      .update(conversations)
      .set({
        priceVariant: picked.id,
        priceAmountCents: picked.priceCents,
        downsellAmountCents: picked.downsellCents,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, row.id));

    logger.info('priceVariant: assigned', { email, variant: picked.id, priceCents: picked.priceCents });

    return {
      variant: picked.id,
      priceCents: picked.priceCents,
      downsellCents: picked.downsellCents,
    };
  } catch (err) {
    logger.error('priceVariant: assignVariantIfMissing failed', { email, err });
    return null;
  }
}

/**
 * Read the variant already on a conversation row.
 * Returns the historical default ($35/$25) if no variant has been assigned —
 * this is the safety fallback that lets old conversations keep working.
 */
export async function getVariantForEmail(email: string): Promise<AssignedVariant> {
  try {
    const rows = await db
      .select({
        priceVariant: conversations.priceVariant,
        priceAmountCents: conversations.priceAmountCents,
        downsellAmountCents: conversations.downsellAmountCents,
      })
      .from(conversations)
      .where(eq(conversations.email, email))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    const row = rows[0];
    if (row?.priceVariant && row.priceAmountCents && row.downsellAmountCents) {
      return {
        variant: row.priceVariant,
        priceCents: row.priceAmountCents,
        downsellCents: row.downsellAmountCents,
      };
    }
  } catch (err) {
    logger.error('priceVariant: getVariantForEmail failed', { email, err });
  }
  return {
    variant: FALLBACK_VARIANT.id,
    priceCents: FALLBACK_VARIANT.priceCents,
    downsellCents: FALLBACK_VARIANT.downsellCents,
  };
}

// Pre-warm cache on module load
getActiveVariants().catch(() => {});
