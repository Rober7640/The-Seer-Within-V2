// Unified A/B experiment framework — server core (Phase 1).
// PRD: docs/ab-testing-framework-prd.md §3. Generalizes the Problem-4 paywall
// test (formerly `paywallVariant()` + `paywall_views` + `tallyPaywall.ts`) into
// reusable primitives:
//
//   assign(key, subjectId, context?)  — sticky, config-gated, scope-aware variant
//   logExposure(key, subjectId, ...)  — idempotent first-in-test exposure row
//   tally(key, opts)                  — DB-sourced per-variant results + stats
//
// SAFETY: every experiment ships in status 'draft'. assign() returns the control
// arm (variants[0], e.g. 'A') for everyone unless status='running' AND the
// subject is in scope — so a disabled test is byte-identical to today's UI and
// no exposures are logged. Flipping status away from 'running' is the kill-switch;
// it reverts everyone to control within the config-cache TTL (~30s, CACHE_TTL_MS).
// A DB-read error also fails safe to control (getExperiment returns null on error).

import crypto from 'crypto';
import { db } from './db';
import {
  experiments,
  experimentExposures,
  type Experiment,
  type ExperimentVariant,
} from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import logger from './logger';
import type { PaywallVariant } from '@shared/paywall';

// ── Paywall test constants (the one experiment Phase 1 folds in) ──────────────
export const PAYWALL_EXPERIMENT_KEY = 'paywall_copy_2026';

// ── Pure assignment primitives (no DB — unit-testable in isolation) ───────────

/**
 * Deterministic 0..99 bucket for a subject within an experiment. Stable across
 * sessions/processes (sha256, no per-call randomness) — this is what makes
 * assignment sticky. Identical formula to the original `paywallBucket`.
 */
export function experimentBucket(subjectId: string, experimentKey: string): number {
  const hex = crypto
    .createHash('sha256')
    .update(subjectId + experimentKey)
    .digest('hex')
    .slice(0, 8);
  return parseInt(hex, 16) % 100;
}

/**
 * Map a 0..99 bucket to a variant key by walking variant weights in listed
 * order (variants[0] = control). Weights are relative shares and need not sum
 * to 100. Zero/negative weights are never assigned. Falls back to the control
 * key when there are no positive weights.
 */
export function pickVariant(bucket: number, variants: ExperimentVariant[]): string {
  if (!variants.length) return 'A';
  const total = variants.reduce((s, v) => s + (v.weight > 0 ? v.weight : 0), 0);
  if (total <= 0) return variants[0].key;
  const threshold = (bucket / 100) * total; // scale 0..99 into 0..total
  let cum = 0;
  for (const v of variants) {
    cum += Math.max(0, v.weight);
    if (threshold < cum) return v.key;
  }
  return variants[variants.length - 1].key;
}

// ── Experiment config loader (short cache so assign() isn't a DB hit per call) ─

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: Experiment | null; at: number }>();

async function getExperiment(key: string): Promise<Experiment | null> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;
  try {
    const rows = await db.select().from(experiments).where(eq(experiments.key, key)).limit(1);
    const value = rows[0] ?? null;
    cache.set(key, { value, at: now });
    return value;
  } catch (err) {
    logger.error('experiment config read failed', { key, error: (err as Error).message });
    // Fail safe to CONTROL: on a read error we return null (→ assign() yields the
    // control arm for everyone), never a stale 'running' config. This preserves
    // the kill-switch under transient DB errors — uncertainty always renders A.
    return null;
  }
}

/**
 * Drop one experiment from the config cache so the next assign() reads fresh.
 * Call after any admin write (edit/start/pause/declare-winner) so changes —
 * including the pause kill-switch — take effect immediately, not after the TTL.
 */
export function invalidateExperiment(key: string): void {
  cache.delete(key);
}

/** Test seam: clear the in-process experiment cache. */
export function _resetExperimentCache(): void {
  cache.clear();
}

// ── Assignment ────────────────────────────────────────────────────────────────

export interface AssignContext {
  personaId?: string | null;
  [k: string]: unknown;
}

export interface Assignment {
  variant: string;                       // the variant to RENDER
  payload: Record<string, unknown>;      // that variant's config payload
  enrolled: boolean;                      // running + in scope (=> log an exposure)
  applied: boolean;                       // the variant's payload should DRIVE behaviour:
                                          //   enrolled (running) OR a concluded winner rollout
}

/**
 * Authoritative variant for (experiment, subject) — sticky, config-gated,
 * scope-aware. Returns:
 *   - null                              if the experiment/subject is unknown
 *   - { ..., enrolled:false }           if not running or out of scope → control
 *     arm for rendering, but NOT enrolled (no exposure logged)
 *   - { ..., enrolled:true }            running + in scope → bucketed variant
 *
 * Because exposures are only logged when `enrolled`, the first exposure row is
 * always a subject's first IN-TEST exposure (matches the legacy window-filter).
 *
 * STICKINESS UNDER RAMP: the bucket (sha256) is permanently sticky, but the
 * bucket→variant map depends on the CURRENT weights. With control listed first,
 * ramping a treatment's weight UP only ever moves subjects control→treatment
 * (monotonic, "once B always B"), which is the safe rollout direction. Shrinking
 * a treatment mid-flight (a rollback) can move treatment→control — fine as a
 * kill, but it diverges from a subject's frozen first-exposure variant, so the
 * v1 rule (matches the locked fixed-horizon stats model) is: set the split once
 * and hold; only ramp the treatment up. Per-subject assignment freezing is a
 * Phase-3 concern when ramp controls get a UI.
 */
export async function assign(
  key: string,
  subjectId: string | null | undefined,
  context?: AssignContext,
): Promise<Assignment | null> {
  if (!subjectId) return null;
  const exp = await getExperiment(key);
  if (!exp) return null;

  const variants = Array.isArray(exp.variants) ? exp.variants : [];
  const control = variants[0];
  const controlArm: Assignment | null = control
    ? { variant: control.key, payload: control.payload ?? {}, enrolled: false, applied: false }
    : null;

  // Scope FIRST: an out-of-scope subject NEVER gets the experiment — control,
  // whether the test is running OR concluded. (This must precede the winner
  // rollout so a concluded persona-scoped test doesn't leak its winner to other
  // personas.)
  if (exp.scope?.personaId && context?.personaId !== exp.scope.personaId) return controlArm;

  // Concluded test → roll the declared winner out to the in-scope population:
  // not enrolled (test is over, no more exposures) but its payload IS applied,
  // so a declared winner keeps driving behaviour instead of reverting to control.
  if (exp.status === 'done' && exp.winnerVariant) {
    const w = variants.find((v) => v.key === exp.winnerVariant) ?? control;
    return w ? { variant: w.key, payload: w.payload ?? {}, enrolled: false, applied: true } : controlArm;
  }

  if (exp.status !== 'running') return controlArm;

  const bucket = experimentBucket(subjectId, key);
  const variantKey = pickVariant(bucket, variants);
  const chosen = variants.find((v) => v.key === variantKey) ?? control;
  if (!chosen) return null;
  return { variant: chosen.key, payload: chosen.payload ?? {}, enrolled: true, applied: true };
}

/**
 * Idempotent first-exposure log. unique(experiment_key, subject_id) means later
 * opens are no-ops, so this records the subject's first in-test exposure only.
 * Non-blocking: never throws into the request path. `context` must be PII-free.
 */
export async function logExposure(
  key: string,
  subjectId: string,
  variant: string,
  surface: string,
  context?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await db
      .insert(experimentExposures)
      .values({ experimentKey: key, subjectId, variant, surface, context: context ?? null })
      .onConflictDoNothing({
        target: [experimentExposures.experimentKey, experimentExposures.subjectId],
      });
  } catch (err) {
    logger.error('experiment exposure insert failed', { key, error: (err as Error).message });
  }
}

// ── Measurement (generalizes tallyPaywall.ts) ─────────────────────────────────

export interface TallyVariantRow {
  variant: string;
  viewers: number;
  buyers: number;
  conversionPct: number;
  revenueUsd: number;
  revPerViewerUsd: number;
  arppuUsd: number;
  liftPct: number | null; // conversion lift vs the control arm (raw); null for control / no data
}

export interface TallyResult {
  rows: TallyVariantRow[];
  // Control-vs-treatment summary (present only when both arms have viewers).
  srm?: { aViewers: number; bViewers: number; bSharePct: number };
  significance?: { z: number; p: number; liftPct: number; significant: boolean };
}

/** Standard-normal two-sided p-value (Abramowitz–Stegun erf approximation). */
export function twoSidedP(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 2 * (1 - 0.5 * (1 + erf));
}

export interface TallyOptions {
  startISO: string;            // cohort start = when the test was flipped on (REQUIRED)
  windowDays?: number;         // attribution window after first exposure (default 7)
  personaId?: string | null;   // scope filter on context->>'personaId' (null = all)
  controlKey?: string;         // control arm key for lift/SRM/significance (default 'A')
  treatmentKey?: string;       // treatment arm compared against control (default 'B')
}

/**
 * DB-sourced results for a `credit_purchase` experiment. Cohort = each subject's
 * FIRST in-window exposure; a subject "converted" if they have a completed
 * credit_purchases row within `windowDays` of that first exposure. This is the
 * exact method of tallyPaywall.ts, generalized to experiment_exposures.
 *
 * `startISO` is the cohort start; exposures before it are excluded. Because
 * exposures are deduped to one row per subject (unique key+subject), reuse a key
 * for ONE run only — a second run under the same key with a later start would
 * drop returning subjects. A new test = a new key.
 *
 * NOTE (Phase 1): window/persona are passed by the caller, not read from the
 * experiment's stored `conversion`/`scope`; the Phase-2 dashboard will source
 * them from the row. SRM + significance below are the 2-arm A/B case.
 */
export async function tally(key: string, opts: TallyOptions): Promise<TallyResult> {
  // Guard against NaN/invalid windows (e.g. a non-numeric CLI arg) — `NaN ?? 7`
  // stays NaN and would build an invalid SQL interval. Coerce to a positive int.
  const wd =
    typeof opts.windowDays === 'number' && Number.isFinite(opts.windowDays) && opts.windowDays > 0
      ? Math.floor(opts.windowDays)
      : 7;
  const windowDays = String(wd);
  const personaId = opts.personaId ?? null;
  const start = opts.startISO;

  const result = await db.execute(sql`
    WITH first_exp AS (
      SELECT DISTINCT ON (subject_id) subject_id, variant, created_at AS first_at
      FROM experiment_exposures
      WHERE experiment_key = ${key}
        AND created_at >= ${start}
        AND (${personaId}::text IS NULL OR context->>'personaId' = ${personaId})
      ORDER BY subject_id, created_at
    ),
    conv AS (
      SELECT fe.variant,
             EXISTS (
               SELECT 1 FROM credit_purchases cp
               WHERE cp.user_id = fe.subject_id AND cp.status = 'completed'
                 AND cp.created_at >= fe.first_at
                 AND cp.created_at <  fe.first_at + (${windowDays} || ' days')::interval
             ) AS converted,
             COALESCE((
               SELECT sum(cp.price_usd) FROM credit_purchases cp
               WHERE cp.user_id = fe.subject_id AND cp.status = 'completed'
                 AND cp.created_at >= fe.first_at
                 AND cp.created_at <  fe.first_at + (${windowDays} || ' days')::interval
             ), 0) AS revenue_cents
      FROM first_exp fe
    )
    SELECT variant,
           count(*)                                   AS viewers,
           count(*) FILTER (WHERE converted)          AS buyers,
           round(100.0 * count(*) FILTER (WHERE converted) / NULLIF(count(*),0), 2) AS conversion_pct,
           round(sum(revenue_cents)/100.0, 2)         AS revenue_usd,
           round((sum(revenue_cents)/100.0) / NULLIF(count(*),0), 2) AS rev_per_viewer_usd,
           round((sum(revenue_cents)/100.0) / NULLIF(count(*) FILTER (WHERE converted),0), 2) AS arppu_usd
    FROM conv GROUP BY variant ORDER BY variant;
  `);

  // Keep this metric byte-exact with the legacy tallyPaywall CLI (SQL round()).
  const rows: TallyVariantRow[] = (result.rows as Record<string, unknown>[]).map((r) => ({
    variant: String(r.variant),
    viewers: Number(r.viewers) || 0,
    buyers: Number(r.buyers) || 0,
    conversionPct: Number(r.conversion_pct) || 0,
    revenueUsd: Number(r.revenue_usd) || 0,
    revPerViewerUsd: Number(r.rev_per_viewer_usd) || 0,
    arppuUsd: Number(r.arppu_usd) || 0,
    liftPct: null,
  }));

  return finalizeStats(rows, opts.controlKey ?? 'A', opts.treatmentKey ?? 'B');
}

/**
 * Shared stats pass over per-variant rows (used by every tally variant): fills
 * each row's `liftPct` (raw conversion vs control) and computes the 2-arm
 * control-vs-treatment SRM split + two-proportion z-test. Control/treatment are
 * the first two arms by key, so it generalises to renamed arms and >2 arms.
 */
export function finalizeStats(
  rows: TallyVariantRow[],
  controlKey = 'A',
  treatmentKey = 'B',
  // SRM (randomization balance) denominator. Defaults to each arm's `viewers`,
  // but for metrics whose `viewers` is a post-randomization subset (e.g. U1's
  // offer-reached count) pass the FULL assigned population per arm here.
  srmDenoms?: { control: number; treatment: number },
): TallyResult {
  const control = rows.find((r) => r.variant === controlKey);
  const controlRate = control && control.viewers > 0 ? control.buyers / control.viewers : null;
  for (const r of rows) {
    if (r.variant === controlKey || controlRate === null || controlRate === 0) continue;
    const rate = r.viewers > 0 ? r.buyers / r.viewers : 0;
    r.liftPct = ((rate - controlRate) / controlRate) * 100;
  }

  const A = control;
  const B = rows.find((r) => r.variant === treatmentKey);
  const out: TallyResult = { rows };
  if (A && B) {
    // SRM (randomization balance) is gated on the FULL assigned population per arm
    // — independent of how many later reached the conversion step.
    const sA = srmDenoms?.control ?? A.viewers;
    const sB = srmDenoms?.treatment ?? B.viewers;
    if (sA > 0 && sB > 0) {
      out.srm = { aViewers: sA, bViewers: sB, bSharePct: (sB / (sA + sB)) * 100 };
    }
    // Significance: two-proportion z-test on the conversion rate (viewers = the
    // conversion denominator), only once both arms have conversion data.
    if (A.viewers > 0 && B.viewers > 0) {
      const nA = A.viewers, nB = B.viewers, xA = A.buyers, xB = B.buyers;
      const pA = xA / nA, pB = xB / nB, p = (xA + xB) / (nA + nB);
      const se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
      const z = se > 0 ? (pB - pA) / se : 0;
      const pv = twoSidedP(z);
      out.significance = {
        z,
        p: pv,
        liftPct: pA > 0 ? ((pB - pA) / pA) * 100 : 0,
        significant: pv < 0.05,
      };
    }
  }
  return out;
}

/** Build a per-variant row from raw counts (the JS counterpart of tally()'s SQL). */
function buildVariantRow(
  variant: string,
  viewers: number,
  buyers: number,
  revenueCents: number,
): TallyVariantRow {
  const revenueUsd = revenueCents / 100;
  return {
    variant,
    viewers,
    buyers,
    conversionPct: viewers ? +((buyers / viewers) * 100).toFixed(2) : 0,
    revenueUsd: +revenueUsd.toFixed(2),
    revPerViewerUsd: viewers ? +(revenueUsd / viewers).toFixed(2) : 0,
    arppuUsd: buyers ? +(revenueUsd / buyers).toFixed(2) : 0,
    liftPct: null,
  };
}

export interface Upsell1TallyOptions {
  key: string;                 // experiment key — exposures are scoped to it (no cross-test leak)
  startISO: string;            // cohort start = when the test started
  controlKey?: string;
  treatmentKey?: string;
}

/**
 * Results for the Upsell-1 price test. Arm membership is EXPLICIT — read from the
 * framework's `experiment_exposures` (logged with the assigned variant at lead
 * capture), NOT inferred from the stored price. This is what makes the metric
 * valid: legacy / paused / fallback $47 traffic has no exposure row, so it can't
 * contaminate the control arm, and two experiments never collide (scoped by key).
 * Conversion comes from the linked conversation: denominator = reached the offer
 * (`upsell_offered`), buyer = `upsell_purchased`, revenue = `upsell_amount`. SRM
 * uses the full exposure count per arm (LEFT JOIN), so randomization balance is
 * measured over everyone assigned, not just those who reached the offer.
 *
 * NOTE: one exposure per email (unique key+subject) links to the conversation it
 * was assigned on. In the rare case an email has multiple conversation rows and
 * buys the upsell on a different one, attribution follows the linked row.
 */
export async function tallyUpsell1(opts: Upsell1TallyOptions): Promise<TallyResult> {
  const result = await db.execute(sql`
    SELECT e.variant AS variant,
           count(*)                                                          AS total,
           count(*) FILTER (WHERE c.upsell_offered)                          AS viewers,
           count(*) FILTER (WHERE c.upsell_offered AND c.upsell_purchased)   AS buyers,
           COALESCE(sum(c.upsell_amount) FILTER (WHERE c.upsell_offered AND c.upsell_purchased), 0) AS revenue_cents
    FROM experiment_exposures e
    LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
    WHERE e.experiment_key = ${opts.key}
      AND e.created_at >= ${opts.startISO}
    GROUP BY e.variant;
  `);

  const byVariant = new Map(
    (result.rows as Record<string, unknown>[]).map((r) => [String(r.variant), r]),
  );
  const controlKey = opts.controlKey ?? 'A';
  const treatmentKey = opts.treatmentKey ?? 'B';
  // One row per configured arm (so an arm with no data shows as zeros, in order).
  const arms = [controlKey, treatmentKey];
  const seen = new Set(arms);
  for (const v of Array.from(byVariant.keys())) if (!seen.has(v)) arms.push(v); // include extra observed arms
  const rows = arms.map((variant) => {
    const r = byVariant.get(variant);
    return buildVariantRow(variant, Number(r?.viewers) || 0, Number(r?.buyers) || 0, Number(r?.revenue_cents) || 0);
  });

  const totalOf = (k: string) => Number(byVariant.get(k)?.total) || 0;
  return finalizeStats(rows, controlKey, treatmentKey, {
    control: totalOf(controlKey),
    treatment: totalOf(treatmentKey),
  });
}

// ── V1 Upsell-1 price test (Phase 3b) ────────────────────────────────────────
export const U1_PRICE_EXPERIMENT_KEY = 'u1_price_2026';

/** Stable, non-PII subject id for an email (sha256 of the normalised address). */
export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

/** Read a positive-int price (cents) from a variant payload, or null. */
function payloadCents(payload: Record<string, unknown> | undefined, field: string): number | null {
  const n = Number((payload as Record<string, unknown> | undefined)?.[field]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Resolve the Upsell-1 (Protection Ritual) price for an email via the framework.
 * When the experiment APPLIES (running+enrolled, or a concluded winner rollout)
 * the assigned arm's `upsell1Cents` payload is used; otherwise `fallbackCents`
 * (the legacy price) so the test is byte-identical to today while OFF. The result
 * is written once to conversations.upsell1AmountCents at lead capture, so it is
 * sticky per email and read by both the display and the charge sites unchanged.
 * `enrolled` (running only) tells the caller to log the exposure (the denominator).
 */
export async function resolveUpsell1Cents(
  email: string,
  fallbackCents: number,
  key: string = U1_PRICE_EXPERIMENT_KEY, // overridable so tests never touch the live experiment
): Promise<{ cents: number; variant: string | null; enrolled: boolean }> {
  // Bucket on the NORMALISED email so the sticky arm matches the exposure dedup
  // (which keys on hashEmail = sha256 of the same normalised address). Otherwise
  // 'Foo@x.com' and 'foo@x.com' could bucket to different arms / prices.
  // (The U1 test is global; funnel-scoped assignment is not wired yet.)
  const a = await assign(key, email.trim().toLowerCase(), { personaId: null });
  if (a?.applied) {
    const cents = payloadCents(a.payload, 'upsell1Cents');
    if (cents !== null) return { cents, variant: a.variant, enrolled: a.enrolled };
  }
  return { cents: fallbackCents, variant: a?.variant ?? null, enrolled: false };
}

// ── Paywall-specific wrappers (keep credits.ts + the test wiring stable) ──────

/** Authoritative paywall variant for a (user, persona) — thin wrapper over assign(). */
export async function paywallVariant(
  userId: string | null | undefined,
  personaId: string | null | undefined,
): Promise<PaywallVariant> {
  const res = await assign(PAYWALL_EXPERIMENT_KEY, userId, { personaId: personaId ?? null });
  return res?.variant === 'B' ? 'B' : 'A';
}

/**
 * Variant for a request, honouring a `?paywallVariant=A|B` QA override in
 * non-production only (so devs/QA can force a variant; inert for real prod users).
 */
export async function resolvePaywallVariant(opts: {
  userId?: string | null;
  personaId?: string | null;
  override?: string | null;
  allowOverride?: boolean;
}): Promise<PaywallVariant> {
  if (opts.allowOverride && (opts.override === 'A' || opts.override === 'B')) {
    return opts.override;
  }
  return paywallVariant(opts.userId, opts.personaId);
}
