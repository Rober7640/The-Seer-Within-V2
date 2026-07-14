// V1 price split test — the PURE half: variant shape, pool parsing/validation,
// and eligibility scoping. No DB, no cache, no side effects, so it can be unit
// tested offline (`npm run test:price`). The stateful half (cache, assignment,
// persistence) lives in ./priceVariant.
//
// Two scoping dimensions, and they behave DIFFERENTLY on purpose:
//
//   funnel  — a PARTITION. If any variant is scoped to the request's funnel,
//             ONLY those are eligible (v1-palm traffic never sees root variants).
//
//   signs   — an additive FILTER over the palm ad "sign" (which physical tell the
//             ad quizzed: thumb / hand-size / finger-shape / …). A variant with no
//             `signs` serves every sign; a variant WITH `signs` serves only those.
//             Crucially it does not remove the unscoped control from the pool — so
//             `55-35_palm` + `"signs":["thumb"]` gives thumb a 50/50 while every
//             other palm sign stays 100% on the `35_palm_u47` control.
//
// Why sign-scoping exists (Joel, 2026-07-14 call): "we should never put new tests
// onto a new lander… the test should go on to thumb, and then once Ruby has
// confirmed hand size or the decode-him or finger shape is working, then we will
// make sure the test also goes to those." Extending the test to another sign is
// therefore a pure CONFIG edit — append to the `signs` array. No code, no deploy.

export interface PriceVariant {
  id: string;
  priceCents: number;
  downsellCents: number;
  weight: number;
  // Upsell 1 (Protection Ritual) price for this variant. Optional so older config
  // rows without it fall back to DEFAULT_UPSELL1_CENTS at read time.
  upsell1Cents?: number;
  // Funnel this variant is scoped to (e.g. 'v1-fb'). Omitted / null = serves any
  // funnel that has no funnel-specific variant of its own.
  funnel?: string | null;
  // Palm ad signs this variant may serve. Omitted / empty = every sign (which is
  // every variant that exists today → no behaviour change). See header.
  signs?: string[] | null;
}

export interface ParsedPool {
  variants: PriceVariant[];
  // Variants rejected by validation, with why. Callers MUST log these — a silently
  // dropped variant is exactly how the root $45 test died for two weeks (§3.3 of
  // docs/sliding-close-preflight-2026-07-13.md).
  dropped: Array<{ id: string; reason: string }>;
  // Keys we don't recognise, e.g. the live row's `"down  sellCents"` /
  // `"upsell1Ce  nts"` corruption. Not fatal on their own, but they are the
  // fingerprint of a typo that silently nulls out a price — always log them.
  unknownKeys: Array<{ id: string; key: string }>;
}

export const DEFAULT_UPSELL1_CENTS = 4700;

export const FALLBACK_VARIANT: PriceVariant = {
  id: '35',
  priceCents: 3500,
  downsellCents: 2500,
  weight: 1,
  upsell1Cents: DEFAULT_UPSELL1_CENTS,
};

// The fb-palm funnel + the sign its bridge serves when the URL carries no ?sign=.
// Mirrors DEFAULT_SIGN in client/src/content/palmReads.ts: a bare /fb-palm visit
// IS the thumb lander, and PalmBridge deliberately omits `&sign=` on the handoff
// for thumb — so "palm traffic with no sign" means thumb, not "unknown".
export const PALM_FUNNEL = 'v1-palm';
export const DEFAULT_PALM_SIGN = 'thumb';

const KNOWN_VARIANT_KEYS = new Set([
  'id',
  'priceCents',
  'downsellCents',
  'weight',
  'upsell1Cents',
  'funnel',
  'signs',
]);

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/**
 * Parse + validate a variant pool from raw JSON (the system_config row, or the
 * V1_PRICE_VARIANTS_JSON dev override).
 *
 * A variant is DROPPED unless it has a non-empty id, priceCents > 0,
 * downsellCents > 0 and a finite weight >= 0.
 *
 * `downsellCents > 0` is the hardening that §3.3 asked for. The old validator
 * only checked id/priceCents/weight, so the corrupted key `"down  sellCents"`
 * left downsellCents undefined, the variant passed, NULL landed on the
 * conversation row, and getVariantForEmail silently fell back to $35/$25 — the
 * root `45` test was dead for two weeks and nobody could see it. Under the
 * sliding close the same typo on `55-35_palm` would break the $35 GRACE CHARGE,
 * so this must be loud, not silent.
 */
export function parseVariantPool(raw: string): ParsedPool {
  const dropped: ParsedPool['dropped'] = [];
  const unknownKeys: ParsedPool['unknownKeys'] = [];

  const parsed = JSON.parse(raw) as unknown;
  const list = (parsed as { variants?: unknown })?.variants;
  if (!Array.isArray(list)) {
    throw new Error('price variant pool: expected { "variants": [...] }');
  }

  const variants: PriceVariant[] = [];
  for (const entry of list as Array<Record<string, unknown>>) {
    const id = typeof entry?.id === 'string' ? entry.id : '';
    const label = id || '(missing id)';

    for (const key of Object.keys(entry ?? {})) {
      if (!KNOWN_VARIANT_KEYS.has(key)) unknownKeys.push({ id: label, key });
    }

    if (!id) {
      dropped.push({ id: label, reason: 'missing or non-string id' });
      continue;
    }
    if (!isPositiveInt(entry.priceCents)) {
      dropped.push({ id: label, reason: `priceCents must be > 0 (got ${JSON.stringify(entry.priceCents)})` });
      continue;
    }
    if (!isPositiveInt(entry.downsellCents)) {
      dropped.push({ id: label, reason: `downsellCents must be > 0 (got ${JSON.stringify(entry.downsellCents)}) — check for a corrupted key` });
      continue;
    }
    const weight = entry.weight;
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) {
      dropped.push({ id: label, reason: `weight must be a finite number >= 0 (got ${JSON.stringify(weight)})` });
      continue;
    }
    if (entry.upsell1Cents !== undefined && !isPositiveInt(entry.upsell1Cents)) {
      dropped.push({ id: label, reason: `upsell1Cents, when present, must be > 0 (got ${JSON.stringify(entry.upsell1Cents)})` });
      continue;
    }

    let signs: string[] | null = null;
    if (entry.signs !== undefined && entry.signs !== null) {
      if (!Array.isArray(entry.signs) || entry.signs.some((s) => typeof s !== 'string' || !s.trim())) {
        dropped.push({ id: label, reason: 'signs, when present, must be an array of non-empty strings' });
        continue;
      }
      signs = (entry.signs as string[]).map((s) => s.trim().toLowerCase());
    }

    variants.push({
      id,
      priceCents: entry.priceCents,
      downsellCents: entry.downsellCents,
      weight,
      upsell1Cents: entry.upsell1Cents as number | undefined,
      funnel: (entry.funnel as string | null | undefined) ?? null,
      signs,
    });
  }

  return { variants, dropped, unknownKeys };
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
  id: string | null | undefined,
): PriceVariant | null {
  if (!id) return null;
  return variants.find((v) => v.id === id) ?? null;
}

/**
 * PARTITION by funnel. If any variant is scoped to this exact funnel, only those
 * are eligible (so FB traffic only sees the *_fb variants, and non-FB traffic only
 * sees null-funnel variants). If none match, fall back to the full pool so the
 * feature degrades to current behaviour before any funnel-scoped variant exists.
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
 * FILTER by palm sign. Unscoped variants (no `signs`) always survive; a
 * sign-scoped variant survives only for the signs it lists. Never returns an
 * empty pool.
 *
 * This is what keeps the sliding close on thumb ONLY: with
 *   35_palm_u47  (no signs)          → eligible for every sign
 *   55-35_palm   (signs: ["thumb"])  → eligible for thumb only
 * thumb sees a 2-variant 50/50 pool, and hand-size / finger-shape / decode-him
 * see a 1-variant pool → 100% control. To extend the test to a new sign later,
 * append it to `signs` in system_config. No code change.
 */
export function scopeVariantsToSign(
  variants: PriceVariant[],
  sign?: string | null,
): PriceVariant[] {
  const target = sign ? sign.trim().toLowerCase() : null;
  const eligible = variants.filter((v) => {
    if (!v.signs || v.signs.length === 0) return true;
    return target !== null && v.signs.includes(target);
  });
  return eligible.length ? eligible : variants;
}

/**
 * Resolve the sign to scope by. Palm traffic that sends no sign is THUMB (the
 * bridge's DEFAULT_SIGN — a bare /fb-palm visit is the thumb lander, and the
 * bridge omits `&sign=` on the thumb handoff). Non-palm funnels have no sign, and
 * no non-palm variant carries `signs`, so they are unaffected either way.
 */
export function normalizeSign(funnel?: string | null, sign?: string | null): string | null {
  const s = typeof sign === 'string' ? sign.trim().toLowerCase().slice(0, 40) : '';
  if (s) return s;
  return funnel === PALM_FUNNEL ? DEFAULT_PALM_SIGN : null;
}

/**
 * The full eligibility walk: partition by funnel, filter by sign, then draw.
 * Single source of truth for "which price does this visitor get?".
 */
export function selectVariant(
  variants: PriceVariant[],
  funnel?: string | null,
  sign?: string | null,
): PriceVariant {
  const byFunnel = scopeVariantsToFunnel(variants, funnel);
  const bySign = scopeVariantsToSign(byFunnel, normalizeSign(funnel, sign));
  return pickWeighted(bySign);
}
