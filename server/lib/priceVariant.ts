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
import { resolveUpsell1Cents, logExposure, hashEmail, U1_PRICE_EXPERIMENT_KEY } from './experiments';

export interface PriceVariant {
  id: string;
  priceCents: number;
  downsellCents: number;
  weight: number;
  // Upsell 1 (Protection Ritual) price for this variant. Optional so older
  // config rows without it fall back to the historical 4700 at read time.
  upsell1Cents?: number;
  // Funnel this variant is scoped to (e.g. 'v1-fb'). Omitted / null = serves
  // any funnel that has no funnel-specific variant of its own.
  funnel?: string | null;
}

export interface AssignedVariant {
  variant: string;
  priceCents: number;
  downsellCents: number;
  upsell1Cents: number;
}

const DEFAULT_UPSELL1_CENTS = 4700;

const FALLBACK_VARIANT: PriceVariant = {
  id: '35',
  priceCents: 3500,
  downsellCents: 2500,
  weight: 1,
  upsell1Cents: DEFAULT_UPSELL1_CENTS,
};

// Funnels that run a single FIXED price (no A/B). assignVariantIfMissing stamps
// these directly instead of drawing from the weighted system_config pool — so
// the funnel ships with correct pricing without a config row, and never pulls
// another funnel's variant via the scopeVariantsToFunnel full-pool fallback.
//
// NOTE: empty by design. /fb2 used to be fixed-price here, but now runs the
// same weighted price split test as /fb via funnel-scoped variants
// ('v1-fb2': 35_fb2 / 45_fb2) in the system_config 'v1_price_variants' pool.
// Add an entry here only for a NEW funnel that should ship single-price; if you
// do, make sure NOT to also add matching weighted variants (the fixed entry
// takes precedence and would silently shadow them).
const FIXED_FUNNEL_PRICES: Record<string, { id: string; priceCents: number; downsellCents: number; upsell1Cents: number }> = {};

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
 * Restrict the variant pool to those matching the given funnel.
 * If any variant is scoped to this exact funnel, only those are eligible
 * (so FB traffic only sees the *_fb variants, and non-FB traffic only sees
 * null-funnel variants). If none match, fall back to the full pool so the
 * feature degrades to current behavior before any funnel-scoped variant is
 * configured.
 */
export function scopeVariantsToFunnel(
  variants: PriceVariant[],
  funnel?: string | null,
): PriceVariant[] {
  const target = funnel ?? null;
  const matching = variants.filter((v) => (v.funnel ?? null) === target);
  return matching.length ? matching : variants;
}

/**
 * Assign a variant to a conversation if it doesn't already have one.
 * Idempotent: same email always sees the same variant once assigned.
 * Returns null if no conversation row exists for this email yet.
 */
export async function assignVariantIfMissing(
  email: string,
  funnel?: string | null,
): Promise<AssignedVariant | null> {
  try {
    const existing = await db
      .select({
        id: conversations.id,
        priceVariant: conversations.priceVariant,
        priceAmountCents: conversations.priceAmountCents,
        downsellAmountCents: conversations.downsellAmountCents,
        upsell1AmountCents: conversations.upsell1AmountCents,
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
        upsell1Cents: row.upsell1AmountCents ?? DEFAULT_UPSELL1_CENTS,
      };
    }

    const fixed = funnel ? FIXED_FUNNEL_PRICES[funnel] : undefined;
    const picked: PriceVariant = fixed
      ? {
          id: fixed.id,
          priceCents: fixed.priceCents,
          downsellCents: fixed.downsellCents,
          upsell1Cents: fixed.upsell1Cents,
          weight: 1,
          funnel,
        }
      : pickWeighted(scopeVariantsToFunnel(await getActiveVariants(), funnel));
    // Upsell-1 price A/B test (framework, Phase 3b). Fold in only where the legacy
    // Upsell-1 price is the DEFAULT $47 (the control price the test compares $37
    // against) — a funnel configured at a different custom price keeps it. The
    // default ships-dark state (FALLBACK_VARIANT, $47) IS testable. When the
    // experiment applies, the price comes from the assigned arm; assigned ONCE here
    // (idempotent guard above) and stored on the row, so display + both charge
    // sites (which read upsell1AmountCents) stay consistent and never flip
    // mid-funnel. Gated OFF ⇒ legacy $47, no behaviour change.
    const legacyUpsell1Cents = picked.upsell1Cents ?? DEFAULT_UPSELL1_CENTS;
    let upsell1Cents = legacyUpsell1Cents;
    let u1Assignment: { variant: string | null; enrolled: boolean } | null = null;
    if (legacyUpsell1Cents === DEFAULT_UPSELL1_CENTS) {
      const u1 = await resolveUpsell1Cents(email, DEFAULT_UPSELL1_CENTS);
      upsell1Cents = u1.cents;
      u1Assignment = u1;
    }

    // Persist the price FIRST (display + charge read upsell1AmountCents), THEN log
    // the exposure — so an exposure is only ever recorded once the assigned price
    // is actually stored (no orphan exposure / mispriced-but-counted subject).
    await db
      .update(conversations)
      .set({
        priceVariant: picked.id,
        priceAmountCents: picked.priceCents,
        downsellAmountCents: picked.downsellCents,
        upsell1AmountCents: upsell1Cents,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, row.id));
    if (u1Assignment?.enrolled && u1Assignment.variant) {
      await logExposure(U1_PRICE_EXPERIMENT_KEY, hashEmail(email), u1Assignment.variant, 'upsell1_assigned', {
        conversationId: row.id,
      });
    }

    logger.info('priceVariant: assigned', { email, variant: picked.id, priceCents: picked.priceCents, funnel: funnel ?? null });

    return {
      variant: picked.id,
      priceCents: picked.priceCents,
      downsellCents: picked.downsellCents,
      upsell1Cents,
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
        upsell1AmountCents: conversations.upsell1AmountCents,
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
        upsell1Cents: row.upsell1AmountCents ?? DEFAULT_UPSELL1_CENTS,
      };
    }
  } catch (err) {
    logger.error('priceVariant: getVariantForEmail failed', { email, err });
  }
  return {
    variant: FALLBACK_VARIANT.id,
    priceCents: FALLBACK_VARIANT.priceCents,
    downsellCents: FALLBACK_VARIANT.downsellCents,
    upsell1Cents: FALLBACK_VARIANT.upsell1Cents ?? DEFAULT_UPSELL1_CENTS,
  };
}

// Pre-warm cache on module load
getActiveVariants().catch(() => {});
