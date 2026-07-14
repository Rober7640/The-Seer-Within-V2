// V1 funnel price split test — variant assignment + lookup (the STATEFUL half:
// config source, cache, assignment, persistence). The pure shape/parse/scoping
// logic lives in ./priceVariantPool and is unit tested offline.
//
// Variants and weights live in system_config under key 'v1_price_variants'.
// If the config is missing (or every weight is zero), behavior reverts to the
// historical $35 / $25 default — so this module ships dark and is "turned on"
// by inserting/editing the config row.
//
// ── Testing a config flip before it is live (V1_PRICE_VARIANTS_JSON) ─────────
// Dev and production SHARE ONE DATABASE. There is no staging DB. So editing the
// system_config row to start a price test is INSTANTLY live to real traffic
// (~620 fb-palm conversations/day) and can never be rehearsed first — which is
// how a corrupted key silently killed the root $45 test for two weeks.
//
// V1_PRICE_VARIANTS_JSON fixes that: when set, it REPLACES the DB pool for this
// process only. Set it on the Railway DEV service (and/or locally) to serve the
// exact pool you intend to ship while production's system_config row — and
// therefore production traffic — stays completely untouched. Verify on dev, THEN
// deploy the code, THEN run the SQL.
//
// ⚠ It must never be set on the production service. It is logged loudly at every
// pool refresh and surfaced as `variantsSource: 'env'` on /api/admin/price-test.

import { db } from './db';
import { conversations, systemConfig } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import logger from './logger';
import {
  resolveUpsell1Cents,
  resolveV1Price,
  logExposure,
  hashEmail,
  U1_PRICE_EXPERIMENT_KEY,
  V1_MAIN_EXPERIMENT_KEY,
} from './experiments';
import {
  DEFAULT_UPSELL1_CENTS,
  FALLBACK_VARIANT,
  normalizeSign,
  parseVariantPool,
  pickWeighted,
  resolveVariantById,
  scopeVariantsToFunnel,
  scopeVariantsToSign,
  selectVariant,
  type PriceVariant,
} from './priceVariantPool';

// Re-exported so existing importers keep working and the pure helpers stay
// reachable from one place.
export {
  pickWeighted,
  resolveVariantById,
  scopeVariantsToFunnel,
  scopeVariantsToSign,
  selectVariant,
  normalizeSign,
  type PriceVariant,
};

export interface AssignedVariant {
  variant: string;
  priceCents: number;
  downsellCents: number;
  upsell1Cents: number;
}

const ENV_OVERRIDE_KEY = 'V1_PRICE_VARIANTS_JSON';

export type VariantsSource = 'env' | 'db' | 'fallback';
let lastSource: VariantsSource = 'db';

/** Which pool the process is currently serving. Surfaced on the admin dashboard
 *  so "is the dev override accidentally on?" is answerable at a glance. */
export function getVariantsSource(): VariantsSource {
  return lastSource;
}

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

// Parse a raw pool and LOG everything the validator rejected. A silently dropped
// variant is how the root $45 test died — never swallow these.
function usablePool(raw: string, source: 'env' | 'db'): PriceVariant[] {
  const { variants, dropped, unknownKeys } = parseVariantPool(raw);

  for (const d of dropped) {
    logger.error('priceVariant: DROPPED invalid variant — it will not be served', {
      source,
      variant: d.id,
      reason: d.reason,
    });
  }
  for (const u of unknownKeys) {
    logger.warn('priceVariant: unknown key in variant config (typo? a mistyped price key nulls out that price)', {
      source,
      variant: u.id,
      key: u.key,
    });
  }

  if (variants.length === 0) return [FALLBACK_VARIANT];
  if (variants.every((v) => v.weight === 0)) return [FALLBACK_VARIANT];
  return variants;
}

async function fetchVariants(): Promise<PriceVariant[]> {
  // Dev/staging override — see the header. Replaces the shared-DB pool for this
  // process only, so a config flip can be rehearsed without touching production.
  const override = process.env[ENV_OVERRIDE_KEY]?.trim();
  if (override) {
    try {
      const variants = usablePool(override, 'env');
      lastSource = 'env';
      logger.warn(
        `priceVariant: ⚠ pool is OVERRIDDEN by ${ENV_OVERRIDE_KEY} — the system_config row is being IGNORED. This must only ever be set on dev/local.`,
        { variants: variants.map((v) => `${v.funnel ?? 'root'}:${v.id}=w${v.weight}${v.signs?.length ? `[${v.signs.join(',')}]` : ''}`) },
      );
      return variants;
    } catch (err) {
      // A malformed override must NOT silently fall back to the shared prod pool —
      // the whole point is that dev serves exactly what you think it serves.
      lastSource = 'fallback';
      logger.error(`priceVariant: ${ENV_OVERRIDE_KEY} is set but unparseable — serving the $35/$25 fallback, NOT the DB pool`, { err });
      return [FALLBACK_VARIANT];
    }
  }

  try {
    const rows = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'v1_price_variants'))
      .limit(1);

    const raw = rows[0]?.configValue;
    if (!raw) {
      lastSource = 'fallback';
      return [FALLBACK_VARIANT];
    }

    const variants = usablePool(raw, 'db');
    lastSource = 'db';
    return variants;
  } catch (err) {
    lastSource = 'fallback';
    logger.error('priceVariant: failed to read v1_price_variants config', { err });
    return [FALLBACK_VARIANT];
  }
}

export async function getActiveVariants(): Promise<PriceVariant[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.variants;
  }
  const variants = await fetchVariants();
  cache = { variants, fetchedAt: Date.now() };
  return variants;
}

export function invalidatePriceVariantCache(): void {
  cache = null;
}

/**
 * Assign a variant to a conversation if it doesn't already have one.
 * Idempotent: same email always sees the same variant once assigned.
 * Returns null if no conversation row exists for this email yet.
 *
 * `sign` is the fb-palm ad sign (thumb / hand-size / finger-shape / …). It only
 * narrows the pool for variants that declare `signs` — today that is the sliding
 * close (`55-35_palm`, thumb-only). Every other funnel and every unscoped variant
 * behaves exactly as before. Palm traffic that sends no sign is treated as thumb
 * (see normalizeSign).
 */
export async function assignVariantIfMissing(
  email: string,
  funnel?: string | null,
  sign?: string | null,
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
    // Idempotency / stickiness: once a variant id is stored, return the stored price
    // and never re-roll. Use `!= null` (not truthiness) on the amounts so a stored 0
    // still counts as "assigned" — otherwise a 0/NULL downsell would skip this guard
    // and pickWeighted (Math.random) could flip the customer's main price mid-funnel.
    if (row.priceVariant && row.priceAmountCents != null && row.downsellAmountCents != null) {
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
      // Partition by funnel, then filter by palm sign, then draw. `sign` only ever
      // narrows the pool for variants that declare `signs` (today: the thumb-only
      // sliding close) — every other funnel/variant draws exactly as before.
      : selectVariant(await getActiveVariants(), funnel, sign);
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

    // V1 MAIN/downsell price A/B test (framework, Phase 3b-rest). A GATED OVERRIDE
    // over the legacy system_config pickWeighted result: when the funnel-scoped
    // experiment applies, the main/downsell price comes from the assigned arm;
    // otherwise the picked legacy price (so OFF ⇒ byte-identical, every live
    // system_config split keeps running).
    //
    // priceVariant DELIBERATELY stays the system_config id (not the framework arm):
    // (a) measurement is exposure-based — tallyV1Main reads the arm from the exposure
    // row, never the stored price; (b) priceVariant is also consumed as a clean
    // funnel/price email tag (migrationDripProcessor / resendFunnelTags), which an
    // encoded framework value would pollute. The only reader that sees the resulting
    // id↔price decoupling is the /admin/price-test readout, and only once this
    // framework test is started for a funnel (until then the legacy split is what's
    // live and /admin/price-test reads it correctly) — an accepted, temporary tradeoff.
    const v1 = await resolveV1Price(email, picked.priceCents, picked.downsellCents, funnel);
    const mainCents = v1.mainCents;
    const downsellCents = v1.downsellCents;

    // Persist the price FIRST (display + charge read these columns), THEN log the
    // exposure — so an exposure is only ever recorded once the assigned price is
    // actually stored (no orphan exposure / mispriced-but-counted subject).
    await db
      .update(conversations)
      .set({
        priceVariant: picked.id,
        priceAmountCents: mainCents,
        downsellAmountCents: downsellCents,
        upsell1AmountCents: upsell1Cents,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, row.id));
    const subjectId = hashEmail(email);
    if (u1Assignment?.enrolled && u1Assignment.variant) {
      await logExposure(U1_PRICE_EXPERIMENT_KEY, subjectId, u1Assignment.variant, 'upsell1_assigned', {
        conversationId: row.id,
      });
    }
    if (v1.enrolled && v1.variant) {
      await logExposure(V1_MAIN_EXPERIMENT_KEY, subjectId, v1.variant, 'v1_main_assigned', {
        conversationId: row.id,
      });
    }

    // `sign` is logged so the thumb-only scoping is verifiable straight from the
    // logs the moment the config flips — grep for variant=55-35_palm and every hit
    // must carry sign=thumb. Any other sign on that variant = contamination.
    logger.info('priceVariant: assigned', {
      email,
      variant: picked.id,
      priceCents: mainCents,
      downsellCents,
      funnel: funnel ?? null,
      sign: normalizeSign(funnel, sign),
    });

    return {
      variant: picked.id,
      priceCents: mainCents,
      downsellCents: downsellCents,
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
