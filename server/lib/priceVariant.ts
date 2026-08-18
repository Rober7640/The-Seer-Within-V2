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
import type { BumpCopyVariant } from '@shared/orderBump';
import {
  resolveUpsell1Cents,
  resolveV1Price,
  resolvePalmGate,
  resolveV1Bump,
  resolveV1CloseDepth,
  logExposure,
  hashEmail,
  experimentFunnel,
  U1_PRICE_EXPERIMENT_KEY,
  V1_MAIN_EXPERIMENT_KEY,
  PALM_GATE_EXPERIMENT_KEY,
  V1_BUMP_EXPERIMENT_KEY,
  V1_CLOSE_DEPTH_EXPERIMENT_KEY,
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
  storedVariantIsServable,
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
  storedVariantIsServable,
  normalizeSign,
  type PriceVariant,
};

export interface AssignedVariant {
  variant: string;
  priceCents: number;
  downsellCents: number;
  upsell1Cents: number;
  // fb-palm commitment-gate arm (UI only — never affects price). Absent on the
  // read-only getVariantForEmail path, which is a pure price lookup.
  commitmentGate?: boolean;
  // Order-bump arm — whether this lead is OFFERED the "double reading" turn
  // between the CTA and the Stripe redirect. Like commitmentGate this is UI only
  // and never affects the MAIN price; the bump is a SEPARATE line item, and
  // /api/checkout re-resolves this server-side before charging (a stale client
  // can never add one). Absent on the read-only getVariantForEmail path.
  orderBump?: boolean;
  // Which COPY arm the bump renders ('control' | 'A' | 'B'). Separate from the
  // experiment's own variant id — see bumpCopyFromPayload. The CLIENT renders the
  // offer card from this and /api/checkout re-resolves the SAME value server-side
  // for the Stripe line item, so the words she reads and the line she is billed
  // for always come from one table. Absent ⇒ control.
  bumpCopy?: BumpCopyVariant;
  // Close-depth arm — 'deep' ⇒ the thickened pitch (five extra blocks of chat
  // copy). The purest UI-only arm of the three: it changes only which bubbles are
  // sent at the close, so no price, line item or CTA depends on it, and nothing
  // downstream of this object re-resolves it. Absent ⇒ today's close.
  closeDepth?: 'deep';
}

/**
 * Which /fb-tarot lander a visitor arrived through — the tarot counterpart of the
 * fb-palm `sign`. A LABEL ONLY: it is recorded on the commitment-gate exposure and
 * never participates in variant selection (tarot pricing is the fixed 35_tarot).
 *
 * `facing` and `angle` arrive already derived from the client registry
 * (tarotAttribution.toProps) rather than being recomputed here — the server has no
 * tarot deck/hook registry and adding a 4th one would be one more roster to drift.
 */
export interface TarotLanderContext {
  deck?: string;    // 'return-mhf' (face-down) | 'arcana-mfh' (face-up)
  hook?: string;    // 'cards-return' | 'cards-who-he-is' | …
  facing?: string;  // 'down' | 'up'
  angle?: string;   // 'decode-him' | 'trust' | 'self-frame'
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
const FIXED_FUNNEL_PRICES: Record<string, { id: string; priceCents: number; downsellCents: number; upsell1Cents: number }> = {
  // Tarot "decode-him card" funnel launches at a flat single price (no A/B split,
  // like thumb-angle at launch). The '35_tarot' id carries the '-tarot' token so
  // funnelParamFromPriceVariant attributes it back to v1-tarot. To start a price
  // test later, add funnel-scoped weighted variants to the system_config pool and
  // REMOVE this entry (a fixed entry shadows any matching weighted variants).
  'v1-tarot': { id: '35_tarot', priceCents: 3500, downsellCents: 2500, upsell1Cents: 4700 },
};

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
 * narrows the pool for variants that declare `signs`. The sliding close
 * (`55-35_palm`, thumb-only) used to be that variant; it is now RETIRED and
 * parked at weight 0. The current live palm test, `35_palm_gate`, is
 * unscoped (no `signs` key) and runs across every sign, so `sign` currently has
 * no variant left to narrow against on this funnel — it is kept for the next
 * sign-scoped variant that declares `signs`. Every other funnel and every
 * unscoped variant behaves exactly as before. Palm traffic that sends no sign
 * is treated as thumb (see normalizeSign).
 *
 * `tarotLander` is the /fb-tarot equivalent of `sign` — which lander she came
 * through — recorded on the commitment-gate exposure so tarot breaks down per
 * lander the way palm breaks down per sign. It NEVER touches pricing (tarot is a
 * fixed variant, 35_tarot); it is a label only.
 */
export async function assignVariantIfMissing(
  email: string,
  funnel?: string | null,
  sign?: string | null,
  tarotLander?: TarotLanderContext | null,
  // Which fb-palm ad HOOK she came through (soulmate-timing / already-met / …).
  // Appended last so every existing call site keeps working untouched. A pure
  // LABEL — recorded on the order-bump exposure so palm breaks down per hook the
  // way tarot already does, and it never participates in pricing or assignment.
  palmHook?: string | null,
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

    // fb-palm COMMITMENT GATE — resolved here, DELIBERATELY ABOVE the price
    // idempotency guard, so it is assigned for EVERY lead including returning
    // visitors who already carry a stored price variant.
    //
    // This placement is the whole point of the test being an experiment rather
    // than a price-pool arm: a pool arm can only be drawn when no variant is
    // stored yet, so every repeat visitor would keep the incumbent control id.
    // On live fb-palm those repeat visitors are 23% of sessions but 57% of main
    // buys (14.5% vs 3.3% CR), so a pool-based gate would be measured against a
    // control inflated with all of them. Bucketing on the email hash re-splits
    // the entire population instead.
    //
    // Safe above the guard because the gate is UI-ONLY: it returns a boolean the
    // client uses to pick a component. It never touches priceCents /
    // downsellCents / upsell1Cents, so a returning visitor's stored price is
    // returned below completely unchanged.
    const gateSign = normalizeSign(funnel, sign);
    const palmGate = await resolvePalmGate(email, funnel, gateSign);
    if (palmGate.enrolled && palmGate.variant) {
      // conversationId is what tallyV1Main joins on to find the purchase.
      //
      // `sign` is captured here because it is the ONLY chance to: the test runs
      // across every fb-palm sign, `conversations` has no sign column, and an
      // exposure row is written exactly once per subject (unique(key, subject_id)),
      // so a sign not recorded now can never be back-filled. Without it the whole
      // test is readable only as one pooled number and "did the gate work better on
      // hand-size than on thumb?" becomes permanently unanswerable.
      // PII-free: an ad-sign slug, already normalised + length-capped.
      //
      // `funnel` is captured for the same reason, and became load-bearing when the
      // gate was extended past fb-palm to /fb-tarot (2026-07-31) as ONE pooled test.
      // The pooled A-vs-B number stays the decision metric, but without this the
      // palm-vs-tarot split is unrecoverable — `normalizeSign` returns null off palm,
      // so tarot rows carry no sign and would be indistinguishable from a palm row
      // whose sign failed to resolve. Same one-shot constraint as `sign`: exposures
      // are unique(key, subject_id), so what isn't written now can never be added.
      //
      // The tarot lander (deck/hook + the facing/angle the client derived) is the
      // /fb-tarot counterpart of `sign`, and is subject to the SAME one-shot rule:
      // recorded now or never. `facing`+`angle` are what the per-lander table groups
      // on — Face-Up/Face-Down × decode-him/trust, the four landers actually running
      // — while deck+hook keep a finer drill-down available later.
      await logExposure(PALM_GATE_EXPERIMENT_KEY, hashEmail(email), palmGate.variant, 'palm_gate_assigned', {
        conversationId: row.id,
        sign: gateSign,
        funnel: experimentFunnel(funnel),
        ...(tarotLander?.deck ? { deck: tarotLander.deck } : {}),
        ...(tarotLander?.hook ? { hook: tarotLander.hook } : {}),
        ...(tarotLander?.facing ? { facing: tarotLander.facing } : {}),
        ...(tarotLander?.angle ? { angle: tarotLander.angle } : {}),
      });
    }

    // V1 ORDER BUMP — resolved here for exactly the same reason as the gate above,
    // and deliberately ABOVE the price idempotency guard so returning visitors are
    // re-split into both arms instead of all landing in control. UI-only in the
    // same sense: it decides whether an EXTRA line item is offered and never
    // touches priceCents / downsellCents / upsell1Cents, so the stored main price
    // of a returning visitor is returned below completely unchanged.
    const bump = await resolveV1Bump(email, funnel, gateSign);
    if (bump.enrolled && bump.variant) {
      // 🔴 ONE-SHOT WRITE. experiment_exposures is unique(experiment_key, subject_id),
      // so every label here is recorded now or never — there is no back-fill. That
      // is why the whole lander identity goes in on the first exposure even though
      // only the pooled A-vs-B row decides the test.
      //
      // `hook` is the ONE field this test records that the commitment gate did not
      // (the gate captured a hook for tarot only). The bump runs pooled across
      // fb-palm AND fb-tarot, and on palm a single sign carries several ad hooks —
      // soulmate-timing, already-met, love-again … — so without this, "did the bump
      // do better on soulmate-timing than on the other hooks?" would be permanently
      // unanswerable, exactly as the per-sign split would have been without `sign`.
      await logExposure(V1_BUMP_EXPERIMENT_KEY, hashEmail(email), bump.variant, 'bump_assigned', {
        conversationId: row.id,
        sign: gateSign,
        funnel: experimentFunnel(funnel),
        // Palm hook. Normalised + length-capped by the caller; a label only, so an
        // unrecognised value can mislabel its own row and nothing else.
        ...(palmHook ? { hook: palmHook } : {}),
        // Tarot lander identity. `hook` here deliberately shares the key with the
        // palm hook above — the two funnels never both supply one (palmHook is
        // undefined off v1-palm, tarotLander is undefined off v1-tarot), and the
        // per-lander tables group on facing/angle, not hook.
        ...(tarotLander?.deck ? { deck: tarotLander.deck } : {}),
        ...(tarotLander?.hook ? { hook: tarotLander.hook } : {}),
        ...(tarotLander?.facing ? { facing: tarotLander.facing } : {}),
        ...(tarotLander?.angle ? { angle: tarotLander.angle } : {}),
      });
    }

    // V1 CLOSE DEPTH — resolved here for the same reason as the gate and the bump
    // above, and deliberately ABOVE the price idempotency guard so returning
    // visitors are re-split into both arms instead of all landing in control.
    // Safest of the three to put here: this arm decides only which chat bubbles the
    // pitch sends, so it cannot touch priceCents / downsellCents / upsell1Cents, and
    // a returning visitor's stored price is returned below completely unchanged.
    const closeDepth = await resolveV1CloseDepth(email, funnel);
    if (closeDepth.enrolled && closeDepth.variant) {
      // 🔴 ONE-SHOT WRITE — experiment_exposures is unique(experiment_key, subject_id),
      // so every label is recorded now or never. conversationId is what tallyV1Main
      // joins on to reach the purchase; without it the test has no numerator at all.
      //
      // The tarot lander identity rides along for the same reason it does on the bump:
      // this test is scoped to v1-tarot, ~13 landers deep, and "did the longer close
      // work on the trust angle but not on decode-him?" is unanswerable later if the
      // lander is not written now. The pooled A-vs-B row stays the decision metric —
      // per-lander slices are diagnostic only (multiple-comparisons trap).
      //
      // 🔴 SUBJECT MUST BE hashEmail(email) — the same string resolveV1CloseDepth
      // bucketed on. scope.freezeAssignment reads this row back by subject_id, so a
      // mismatch here would silently disable the freeze.
      await logExposure(V1_CLOSE_DEPTH_EXPERIMENT_KEY, hashEmail(email), closeDepth.variant, 'close_depth_assigned', {
        conversationId: row.id,
        funnel: experimentFunnel(funnel),
        ...(tarotLander?.deck ? { deck: tarotLander.deck } : {}),
        ...(tarotLander?.hook ? { hook: tarotLander.hook } : {}),
        ...(tarotLander?.facing ? { facing: tarotLander.facing } : {}),
        ...(tarotLander?.angle ? { angle: tarotLander.angle } : {}),
      });
    }

    // Idempotency / stickiness: once a variant id is stored, return the stored price
    // and never re-roll. Use `!= null` (not truthiness) on the amounts so a stored 0
    // still counts as "assigned" — otherwise a 0/NULL downsell would skip this guard
    // and pickWeighted (Math.random) could flip the customer's main price mid-funnel.
    //
    // 🔴 …but ONLY WHILE THIS FUNNEL WOULD STILL SERVE THAT VARIANT (2026-08-11
    // fix). `conversations` is keyed by email and reused forever, so without this
    // a visitor's very first price followed her into every other funnel she ever
    // came back through, and outlived the test that drew it — which is how a
    // /fb-tarot buyer (a FIXED $35 funnel that has never run a price test) was
    // charged the root $45 arm assigned to her in May, months after it was parked
    // at weight 0. See storedVariantIsServable for the full write-up. Inside a
    // live split both arms are servable, so behaviour there is unchanged.
    //
    // The fixed-price funnels are checked against their fixed id rather than the
    // pool: FIXED_FUNNEL_PRICES entries are stamped directly and deliberately do
    // not exist in system_config, so a pool lookup would never find them.
    const fixedForFunnel = funnel ? FIXED_FUNNEL_PRICES[funnel] : undefined;
    const storedIsServable = fixedForFunnel
      ? row.priceVariant === fixedForFunnel.id
      : storedVariantIsServable(row.priceVariant, await getActiveVariants(), funnel, sign);
    if (row.priceVariant && !storedIsServable) {
      // Loud, because it means real money was about to be charged at a price this
      // funnel does not offer — and because the re-draw below OVERWRITES the
      // stored price, so this line is the only record of what it used to be.
      logger.warn('priceVariant: stored variant is not servable on this funnel — re-assigning', {
        email,
        storedVariant: row.priceVariant,
        storedPriceCents: row.priceAmountCents,
        funnel: funnel ?? null,
        sign: normalizeSign(funnel, sign),
      });
    }
    if (row.priceVariant && storedIsServable && row.priceAmountCents != null && row.downsellAmountCents != null) {
      return {
        variant: row.priceVariant,
        priceCents: row.priceAmountCents,
        downsellCents: row.downsellAmountCents,
        upsell1Cents: row.upsell1AmountCents ?? DEFAULT_UPSELL1_CENTS,
        commitmentGate: palmGate.gate,
        orderBump: bump.bump,
        bumpCopy: bump.copy,
        ...(closeDepth.deep ? { closeDepth: 'deep' as const } : {}),
      };
    }

    const fixed = fixedForFunnel;
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
      // narrows the pool for variants that declare `signs`. The thumb-only sliding
      // close that used to rely on this is now retired (parked at weight 0); the
      // current palm test (`35_palm_gate`) is unscoped and runs on every sign, so
      // this scoping is presently a no-op on v1-palm — every other funnel/variant
      // draws exactly as before.
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
    // `sign` is passed so a price experiment can be scoped to ONE fb-palm lander
    // (scope.sign) instead of the whole funnel — that is how a new lander runs its
    // own $55/$35 test without touching the live thumb-only system_config 70/30.
    // Normalised (absent sign on v1-palm ⇒ 'thumb') so it matches the pool + the log line.
    const v1 = await resolveV1Price(
      email,
      picked.priceCents,
      picked.downsellCents,
      funnel,
      V1_MAIN_EXPERIMENT_KEY,
      normalizeSign(funnel, sign),
    );
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

    // `sign` is logged so any future sign-scoped variant's scoping is verifiable
    // straight from the logs the moment a config flips. The thumb-only sliding
    // close (`55-35_palm`) this comment used to describe is now retired (parked
    // at weight 0, no longer drawn). The current live palm test, `35_palm_gate`,
    // is unscoped and expected across every sign — there is no sign-specific grep
    // invariant to check for it.
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
      commitmentGate: palmGate.gate,
      orderBump: bump.bump,
      bumpCopy: bump.copy,
      // Emitted ONLY on the deep arm, so control's response shape is unchanged.
      ...(closeDepth.deep ? { closeDepth: 'deep' as const } : {}),
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
 *
 * `funnel` is OPTIONAL and is a pure SAFETY NET on the charge path: when it is
 * supplied, the funnel runs a single FIXED price, and the stored variant belongs
 * to a different funnel, this returns the fixed price instead of the stale one.
 *
 * Belt and braces, not the fix. The fix is in assignVariantIfMissing, which
 * re-stamps the row at lead capture so every reader (chat copy, checkout, both
 * upsells) already agrees. This exists because /api/checkout is where the money
 * actually moves, and on a fixed-price funnel the correct price is a constant —
 * it needs no draw, so it is safe to assert here without any risk of re-rolling a
 * live A/B arm. Funnels that run a real split are deliberately left alone: there
 * is no "correct" price to clamp to without drawing one, and drawing at checkout
 * could charge a price she was never quoted.
 */
export async function getVariantForEmail(
  email: string,
  funnel?: string | null,
): Promise<AssignedVariant> {
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
      const fixed = funnel ? FIXED_FUNNEL_PRICES[funnel] : undefined;
      if (fixed && row.priceVariant !== fixed.id) {
        logger.warn('priceVariant: stored variant is from another funnel on a FIXED-price funnel — serving the fixed price', {
          email,
          storedVariant: row.priceVariant,
          storedPriceCents: row.priceAmountCents,
          funnel,
          servedPriceCents: fixed.priceCents,
        });
        return {
          variant: fixed.id,
          priceCents: fixed.priceCents,
          downsellCents: fixed.downsellCents,
          upsell1Cents: fixed.upsell1Cents,
        };
      }
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
