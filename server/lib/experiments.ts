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
import { eq, sql, desc } from 'drizzle-orm';
import logger from './logger';
import type { PaywallVariant } from '@shared/paywall';

// ── Paywall test constants (the one experiment Phase 1 folds in) ──────────────
export const PAYWALL_EXPERIMENT_KEY = 'paywall_copy_2026';

// ── Persona prompt A/B (Phase 4b) ─────────────────────────────────────────────
// Every system-prompt experiment shares this key prefix so the chat engine can
// resolve "the active prompt test for this persona" at request time WITHOUT a
// hardcoded per-persona key — a fixed key would cap each persona at one test ever
// (a concluded key can't restart). A new prompt test = a new prefixed key
// (e.g. 'persona_prompt_evelyn_q3'); the resolver below always picks the current
// one. The treatment arm carries the full alternate prompt as payload.systemPrompt;
// the control arm (variants[0]) carries none → falls back to baseSystemPrompt.
export const PERSONA_PROMPT_KEY_PREFIX = 'persona_prompt_';
export function isPersonaPromptKey(key: string): boolean {
  return key.startsWith(PERSONA_PROMPT_KEY_PREFIX);
}

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
// Per-persona resolver cache: personaId → the active prompt-experiment key (or
// null when none). Cleared on every experiment write (a create/start/pause can
// change which key is active for a persona); see invalidateExperiment().
const promptKeyCache = new Map<string, { key: string | null; at: number }>();

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
  // A write to a persona_prompt_* experiment can change which prompt test is active
  // for a persona (started/paused), so drop the whole (tiny) per-persona resolver
  // cache. Writes to other experiments (paywall/u1/page-copy) can't, so skip it.
  if (isPersonaPromptKey(key)) promptKeyCache.clear();
}

/** Test seam: clear the in-process experiment caches. */
export function _resetExperimentCache(): void {
  cache.clear();
  promptKeyCache.clear();
}

/**
 * Resolve the currently-active prompt experiment KEY for a persona — the RUNNING
 * `persona_prompt_*` experiment scoped to this persona. Returns null when none
 * exists, so the chat path skips assign() entirely and uses the base prompt.
 * Cached ~30s per persona (promptKeyCache); reads fail safe to null.
 *
 * RUNNING-ONLY (deliberately no done+winner rollout): unlike a price/copy winner
 * (which lives only in the experiment), a prompt winner is a full system prompt the
 * operator bakes back into personas.baseSystemPrompt. So a concluded prompt test
 * reverts the live prompt to the (editable) base — it never silently overrides the
 * persona's prompt forever. The start guard forbids two concurrent running prompt
 * tests per persona, so the running match is unambiguous; ORDER BY started_at is a
 * belt-and-braces tie-break.
 */
export async function getActivePromptExperimentKey(
  personaId: string | null | undefined,
): Promise<string | null> {
  if (!personaId) return null;
  const now = Date.now();
  const hit = promptKeyCache.get(personaId);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.key;
  try {
    // DEV/QA ONLY (see shouldForceRunning): a draft prompt experiment listed in
    // EXPERIMENT_FORCE_RUNNING is resolvable in THIS process, so the eval harness
    // / dev deployment can exercise a treatment prompt while the shared-DB row
    // stays draft (production never sets the var → running-only, unchanged).
    const forcedKeys = (process.env.EXPERIMENT_FORCE_RUNNING ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const statusMatch = forcedKeys.length
      ? sql`(${experiments.status} = 'running'
             OR (${experiments.status} = 'draft' AND ${experiments.key} IN (${sql.join(forcedKeys.map((k) => sql`${k}`), sql`, `)})))`
      : sql`${experiments.status} = 'running'`;
    const rows = await db
      .select()
      .from(experiments)
      .where(
        sql`left(${experiments.key}, ${PERSONA_PROMPT_KEY_PREFIX.length}) = ${PERSONA_PROMPT_KEY_PREFIX}
            AND ${experiments.scope}->>'personaId' = ${personaId}
            AND ${statusMatch}`,
      )
      .orderBy(sql`(${experiments.status} = 'running') desc`, desc(experiments.startedAt))
      .limit(1);
    const row = rows[0] ?? null;
    promptKeyCache.set(personaId, { key: row?.key ?? null, at: now });
    // Prime getExperiment's row cache too, so the immediately-following assign()
    // is a cache hit — one DB query on a cold resolve instead of two.
    if (row) cache.set(row.key, { value: row, at: now });
    return row?.key ?? null;
  } catch (err) {
    logger.error('active prompt experiment lookup failed', {
      personaId,
      error: (err as Error).message,
    });
    return null; // fail safe to "no experiment" → base prompt
  }
}

// ── DEV/QA force-running gate (shared-DB dev verification) ────────────────────

/**
 * DEV/QA ONLY. Decide whether a still-`draft` experiment should behave as if it
 * were `running` — WITHOUT flipping its shared-DB status column — because the
 * deployment has been explicitly opted in via the `EXPERIMENT_FORCE_RUNNING`
 * env var (a comma-separated allowlist of experiment keys).
 *
 * WHY: dev/staging shares production's database, so there is exactly one status
 * column per experiment. Flipping it to `running` to verify a not-yet-launched
 * test would enrol PRODUCTION users too. This gate instead lets ONLY the service
 * that sets the env var (the dev Railway service — separate env vars from prod)
 * exercise the REAL assignment path (sticky bucketing + exposure logging) for a
 * listed draft test, while the row stays `draft`. Production never sets the var,
 * so `assign()` keeps returning the control arm there — byte-identical, no
 * exposures. Mirrors the existing `ALLOW_PAYWALL_QA_OVERRIDE` isolation model.
 *
 * Pure + inert by construction: only ever upgrades draft→running, and only for
 * keys explicitly listed. Unset/empty env, a non-draft status, or an unlisted
 * key ⇒ false (no effect at all). NEVER set EXPERIMENT_FORCE_RUNNING on prod.
 */
export function shouldForceRunning(
  key: string,
  status: string,
  rawEnv: string | undefined,
): boolean {
  if (status !== 'draft' || !rawEnv) return false;
  return rawEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(key);
}

// ── Assignment ────────────────────────────────────────────────────────────────

export interface AssignContext {
  personaId?: string | null;
  funnel?: string | null;
  sign?: string | null;
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
  // personas / other funnels.)
  if (exp.scope?.personaId && context?.personaId !== exp.scope.personaId) return controlArm;
  // Funnel scope (V1 price tests): a funnel-scoped test only enrols that funnel's
  // traffic, so migrating one funnel onto the framework never touches another
  // funnel's live system_config split. Absent scope.funnel = no funnel filter.
  if (exp.scope?.funnel && context?.funnel !== exp.scope.funnel) return controlArm;
  // Sign scope (per-LANDER V1 price tests): narrows a funnel-scoped test to ONE
  // fb-palm sign, so a price test on a single new lander never enrols the rest of
  // v1-palm — and in particular never disturbs the live thumb-only system_config
  // 70/30. Absent scope.sign = no sign filter (existing funnel-wide tests unchanged).
  if (exp.scope?.sign && context?.sign !== exp.scope.sign) return controlArm;

  // Concluded test → roll the declared winner out to the in-scope population:
  // not enrolled (test is over, no more exposures) but its payload IS applied,
  // so a declared winner keeps driving behaviour instead of reverting to control.
  if (exp.status === 'done' && exp.winnerVariant) {
    const w = variants.find((v) => v.key === exp.winnerVariant) ?? control;
    return w ? { variant: w.key, payload: w.payload ?? {}, enrolled: false, applied: true } : controlArm;
  }

  // Normally only a `running` test enrols anyone; everything else → control.
  // EXCEPTION (dev/QA only): a listed draft key is force-run for verification on
  // a shared-DB dev deployment — see shouldForceRunning(). Prod never sets the
  // env var, so this is false there and behaviour is unchanged.
  const forcedRunning = shouldForceRunning(key, exp.status, process.env.EXPERIMENT_FORCE_RUNNING);
  if (exp.status !== 'running' && !forcedRunning) return controlArm;

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

/**
 * Shape raw `{ variant, viewers, buyers, revenue_cents, ... }` query rows into
 * ordered per-arm TallyVariantRows (control + treatment first, then any extra
 * observed arms; missing arms render as zeros). Returns the byVariant map too so
 * callers can read other aggregates (e.g. a separate `total` for SRM).
 */
function assembleRows(
  queryRows: Record<string, unknown>[],
  controlKey: string,
  treatmentKey: string,
): { rows: TallyVariantRow[]; byVariant: Map<string, Record<string, unknown>> } {
  const byVariant = new Map(queryRows.map((r) => [String(r.variant), r]));
  const arms = [controlKey, treatmentKey];
  const seen = new Set(arms);
  for (const v of Array.from(byVariant.keys())) if (!seen.has(v)) arms.push(v);
  const rows = arms.map((variant) => {
    const r = byVariant.get(variant);
    return buildVariantRow(variant, Number(r?.viewers) || 0, Number(r?.buyers) || 0, Number(r?.revenue_cents) || 0);
  });
  return { rows, byVariant };
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

  const controlKey = opts.controlKey ?? 'A';
  const treatmentKey = opts.treatmentKey ?? 'B';
  const { rows, byVariant } = assembleRows(
    result.rows as Record<string, unknown>[],
    controlKey,
    treatmentKey,
  );
  // SRM uses TOTAL exposures per arm (full assigned population), not viewers
  // (offer-reached subset).
  const totalOf = (k: string) => Number(byVariant.get(k)?.total) || 0;
  return finalizeStats(rows, controlKey, treatmentKey, {
    control: totalOf(controlKey),
    treatment: totalOf(treatmentKey),
  });
}

export interface EventTallyOptions {
  key: string;
  startISO: string;
  controlKey?: string;
  treatmentKey?: string;
}

/**
 * Results for an 'event' conversion test (Phase 4 — e.g. visitor page-copy lander
 * tests). Denominator = exposures per arm; a subject "converted" if they have any
 * `experiment_conversions` row for this key; revenue = sum of conversion `value`
 * (0 for count-only events). Subject ids are framework-native (visitor cookie /
 * user id), so this needs no schema-specific join.
 */
export async function tallyEvent(opts: EventTallyOptions): Promise<TallyResult> {
  const result = await db.execute(sql`
    SELECT e.variant AS variant,
           count(*)                                           AS viewers,
           count(*) FILTER (WHERE c.subject_id IS NOT NULL)   AS buyers,
           COALESCE(sum(c.total_value) FILTER (WHERE c.subject_id IS NOT NULL), 0) AS revenue_cents
    FROM experiment_exposures e
    LEFT JOIN (
      SELECT subject_id, sum(value) AS total_value
      FROM experiment_conversions
      WHERE experiment_key = ${opts.key}
      GROUP BY subject_id
    ) c ON c.subject_id = e.subject_id
    WHERE e.experiment_key = ${opts.key}
      AND e.created_at >= ${opts.startISO}
    GROUP BY e.variant;
  `);

  const controlKey = opts.controlKey ?? 'A';
  const treatmentKey = opts.treatmentKey ?? 'B';
  // viewers = all exposures per arm (event tests have no offer-reached subset), so
  // finalizeStats' default SRM denominator (viewers) is already the full population.
  const { rows } = assembleRows(result.rows as Record<string, unknown>[], controlKey, treatmentKey);
  return finalizeStats(rows, controlKey, treatmentKey);
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

/**
 * Smallest per-arm exposure count across the given arms, for pre-registered-N
 * gating (fixed-horizon, no peeking — "every arm has reached N", so the smallest
 * arm governs). Exposures are the universal enrolment unit (unlike `viewers`, an
 * offer-reached subset for the funnel tallies).
 *
 * `armKeys` MUST be the arms the gate is measured over — pass the positive-weight
 * arms (a weight-0 arm is never assigned, so it would lock the gate forever). An
 * arm with NO exposure rows counts as 0 (a GROUP BY alone would omit it and let the
 * gate unlock with an arm at zero data). Empty armKeys ⇒ 0 (stays locked).
 */
export async function minArmExposures(
  key: string,
  startISO: string,
  armKeys: string[],
): Promise<number> {
  if (!armKeys.length) return 0;
  const res = await db.execute(sql`
    SELECT variant, count(*) AS n
    FROM experiment_exposures
    WHERE experiment_key = ${key} AND created_at >= ${startISO}
    GROUP BY variant;
  `);
  const byArm: Record<string, number> = {};
  for (const r of res.rows as Record<string, unknown>[]) byArm[String(r.variant)] = Number(r.n) || 0;
  return Math.min(...armKeys.map((k) => byArm[k] ?? 0));
}

// ── V1 MAIN/downsell price test (Phase 3b-rest) ──────────────────────────────
export const V1_MAIN_EXPERIMENT_KEY = 'v1_main_price_2026';

/**
 * Resolve the V1 MAIN + downsell price for an email via the framework, as a GATED
 * OVERRIDE over the legacy system_config `pickWeighted` result (`fallback*`). When
 * the experiment APPLIES (running+enrolled, or a concluded winner rollout) the
 * assigned arm's `mainCents`/`downsellCents` payload is used; otherwise the
 * fallback — so while the experiment is OFF (draft) the live system_config splits
 * run byte-identical and untouched. Funnel-scoped via `assign`'s scope.funnel, so
 * migrating one funnel never overrides another's price. The result is written once
 * to conversations.priceAmountCents/downsellAmountCents at lead capture (sticky per
 * email; the charge + display sites read those columns unchanged). `enrolled`
 * (running only) tells the caller to log the exposure (the denominator); both
 * arm prices must be present or it falls back (a typo can't half-apply a price).
 */
export async function resolveV1Price(
  email: string,
  fallbackMainCents: number,
  fallbackDownsellCents: number,
  funnel?: string | null,
  key: string = V1_MAIN_EXPERIMENT_KEY, // overridable so tests never touch the live experiment
  sign?: string | null,                 // fb-palm sign, for per-LANDER scoping (scope.sign)
): Promise<{ mainCents: number; downsellCents: number; variant: string | null; enrolled: boolean; applied: boolean }> {
  // Bucket on the NORMALISED email (matches the exposure dedup on hashEmail).
  const a = await assign(key, email.trim().toLowerCase(), { funnel: funnel ?? null, sign: sign ?? null });
  if (a?.applied) {
    const main = payloadCents(a.payload, 'mainCents');
    const downsell = payloadCents(a.payload, 'downsellCents');
    if (main !== null && downsell !== null) {
      return { mainCents: main, downsellCents: downsell, variant: a.variant, enrolled: a.enrolled, applied: true };
    }
  }
  return {
    mainCents: fallbackMainCents,
    downsellCents: fallbackDownsellCents,
    variant: a?.variant ?? null,
    enrolled: false,
    applied: false,
  };
}

export interface V1MainTallyOptions {
  key: string;
  startISO: string;
  controlKey?: string;
  treatmentKey?: string;
}

/**
 * Results for the V1 MAIN/downsell price test. Arm membership is EXPLICIT — read
 * from `experiment_exposures` (the assigned arm logged at lead capture), NOT from
 * the stored price. Conversion comes from the linked conversation, using the SAME
 * confirmed-purchase signal as the legacy /admin/price-test: a buyer is
 * `purchased = true AND upsell_offered = true` (purchased alone is set optimistically
 * at checkout; upsell_offered only flips after Stripe confirms payment), and revenue
 * = mainPurchaseAmount on confirmed buyers. Denominator = ALL exposures (everyone
 * assigned a price is a "viewer"), so the default SRM denominator (viewers) is the
 * full assigned population.
 *
 * KNOWN EDGES (same shape as tallyUpsell1, roughly symmetric across arms so they
 * don't bias the comparison): (a) attribution follows the conversation the exposure
 * was logged on (the lead-capture row) — if an email buys on a later, separate
 * conversation row, that purchase isn't attributed here; (b) a subject whose
 * exposure insert was swallowed (logExposure never throws/retries) is priced but
 * missing from both viewers and revenue.
 */
export async function tallyV1Main(opts: V1MainTallyOptions): Promise<TallyResult> {
  const result = await db.execute(sql`
    SELECT e.variant AS variant,
           count(*)                                                                   AS viewers,
           count(*) FILTER (WHERE c.purchased AND c.upsell_offered)                   AS buyers,
           COALESCE(sum(c.main_purchase_amount) FILTER (WHERE c.purchased AND c.upsell_offered), 0) AS revenue_cents
    FROM experiment_exposures e
    LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
    WHERE e.experiment_key = ${opts.key}
      AND e.created_at >= ${opts.startISO}
    GROUP BY e.variant;
  `);

  const controlKey = opts.controlKey ?? 'A';
  const treatmentKey = opts.treatmentKey ?? 'B';
  const { rows } = assembleRows(result.rows as Record<string, unknown>[], controlKey, treatmentKey);
  return finalizeStats(rows, controlKey, treatmentKey);
}

export interface TallyBySignRow {
  sign: string;
  rows: TallyVariantRow[];
  significance?: TallyResult['significance'];
}

/**
 * The SAME v1_main_funnel tally as tallyV1Main, split by the fb-palm ad sign
 * recorded on each exposure (`context->>'sign'`).
 *
 * ⚠ DIAGNOSTIC ONLY — the pooled tallyV1Main row is what decides the test.
 * A test running across ~11 signs will always throw up one sign with a large
 * apparent lift by chance alone (the multiple-comparisons trap), and each
 * per-sign arm is a fraction of the pre-registered targetN. This exists to
 * answer "did the gate behave differently on hand-size than on thumb?", not to
 * pick a winner from the best-looking lander.
 *
 * Identical join and identical buyer definition to tallyV1Main, so the per-sign
 * rows always sum to the pooled row — if they ever disagree, one of the two
 * queries has drifted.
 *
 * Signs come from the exposure context, so this is empty for experiments whose
 * exposures carry no sign (every non-palm test). The caller omits the block then.
 */
export async function tallyV1MainBySign(opts: V1MainTallyOptions): Promise<TallyBySignRow[]> {
  const result = await db.execute(sql`
    SELECT COALESCE(e.context->>'sign', '(unrecorded)')                          AS sign,
           e.variant                                                             AS variant,
           count(*)                                                              AS viewers,
           count(*) FILTER (WHERE c.purchased AND c.upsell_offered)              AS buyers,
           COALESCE(sum(c.main_purchase_amount) FILTER (WHERE c.purchased AND c.upsell_offered), 0) AS revenue_cents
    FROM experiment_exposures e
    LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
    WHERE e.experiment_key = ${opts.key}
      AND e.created_at >= ${opts.startISO}
    GROUP BY 1, 2;
  `);

  const controlKey = opts.controlKey ?? 'A';
  const treatmentKey = opts.treatmentKey ?? 'B';
  const all = result.rows as Record<string, unknown>[];

  const signs = Array.from(new Set(all.map((r) => String(r.sign)))).sort();
  return signs.map((sign) => {
    const forSign = all.filter((r) => String(r.sign) === sign);
    const { rows } = assembleRows(forSign, controlKey, treatmentKey);
    const stats = finalizeStats(rows, controlKey, treatmentKey);
    return { sign, rows: stats.rows, significance: stats.significance };
  });
}

// ── fb-palm COMMITMENT GATE (UI-only A/B) ────────────────────────────────────
// The 3-checkbox commitment card that replaces the purchase button on the gated
// arm. Measured with `v1_main_funnel` (same tally as the V1 main price test:
// exposure log ⋈ conversations, confirmed main/downsell purchase + revenue), so
// it reports in /admin/experiments next to every other test — arms, lift, SRM,
// p-value and the targetN no-peeking gate.
//
// WHY THIS IS AN EXPERIMENT AND NOT A PRICE-POOL ARM (2026-07-28):
// a pool arm can only ever be drawn for an email that has NO stored variant yet
// (assignVariantIfMissing returns early once one is stored). On live fb-palm,
// returning visitors are 23% of sessions but 57% of main buys and convert 4.4x
// better (14.5% vs 3.3%) — and they ALL keep the incumbent control's variant id.
// A pool-based gate arm therefore compares "new visitors only" against "new
// visitors + every repeat buyer", which makes the gate look ~2x worse than
// neutral before it has shown a single checkbox. Bucketing on a hash of the
// email under a NEW experiment key re-splits the whole population, repeat
// visitors included, so both arms are drawn from the same mix.
//
// Assigning a returning visitor is safe here precisely because this test is
// UI-only: it never re-prices anyone. The price still comes from their stored
// conversations row, untouched.
export const PALM_GATE_EXPERIMENT_KEY = 'v1_palm_commitment_gate_2026';

/**
 * Should this lead see the commitment gate?
 *
 * Bucketed on the NORMALISED email (matches the exposure dedup on hashEmail).
 * `gate` is true only when the assigned arm's payload says so AND the arm is
 * `applied` — so a draft/paused/out-of-scope test yields the plain purchase
 * button for everyone, and deploying the code changes nothing until the
 * experiment is started. `enrolled` (running + in scope) tells the caller to log
 * the exposure — the denominator.
 *
 * No email (the fb-palm `?noemail=1` arm) ⇒ no subject ⇒ control, never enrolled.
 */
export async function resolvePalmGate(
  email: string | null | undefined,
  funnel?: string | null,
  sign?: string | null,
  key: string = PALM_GATE_EXPERIMENT_KEY, // overridable so tests never touch the live experiment
): Promise<{ gate: boolean; variant: string | null; enrolled: boolean }> {
  const subject = typeof email === 'string' ? email.trim().toLowerCase() : null;
  const a = await assign(key, subject, { funnel: funnel ?? null, sign: sign ?? null });
  if (!a) return { gate: false, variant: null, enrolled: false };
  return {
    gate: a.applied && a.payload?.gate === true,
    variant: a.variant,
    enrolled: a.enrolled,
  };
}

// ── Persona prompt A/B resolution (Phase 4b — live AI path) ───────────────────

export interface PromptAssignment {
  systemPrompt: string;         // the prompt to USE (variant override, or base)
  variant: string | null;       // assigned arm (for the exposure log); null if no test
  enrolled: boolean;            // running + in scope → caller logs an exposure
  key: string | null;           // the active experiment key; null if no test
}

/**
 * Resolve a user's persona system prompt for THIS persona. When a RUNNING prompt
 * experiment is active for the persona AND the assigned arm carries a non-empty
 * `payload.systemPrompt`, that prompt is used; otherwise `baseSystemPrompt`.
 * (Only running tests resolve — a concluded test reverts to base; see
 * getActivePromptExperimentKey.)
 *
 * SAFETY: with no running prompt experiment, or a draft/paused/concluded/out-of-scope
 * test, or the control arm (empty payload — enforced by the start guard), this returns
 * `baseSystemPrompt` and `enrolled:false` — byte-identical to today, no exposure logged.
 * The control arm of a RUNNING test still returns `enrolled:true` (it's the denominator)
 * but the base prompt — so control users are counted yet see no behaviour change.
 */
export async function resolvePersonaPrompt(
  userId: string | null | undefined,
  personaId: string,
  baseSystemPrompt: string,
): Promise<PromptAssignment> {
  const off: PromptAssignment = { systemPrompt: baseSystemPrompt, variant: null, enrolled: false, key: null };
  if (!userId) return off;
  const key = await getActivePromptExperimentKey(personaId);
  if (!key) return off;
  const a = await assign(key, userId, { personaId });
  if (!a) return { ...off, key };
  let systemPrompt = baseSystemPrompt;
  if (a.applied) {
    const sp = (a.payload as { systemPrompt?: unknown }).systemPrompt;
    if (typeof sp === 'string' && sp.trim().length > 0) systemPrompt = sp;
  }
  return { systemPrompt, variant: a.variant, enrolled: a.enrolled, key };
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
 * The persona the paywall test is scoped to (its `scope.personaId`), or null if
 * unscoped/unknown. Cached ~30s via getExperiment. Used to resolve the paywall
 * variant on shared surfaces that carry no persona in the request (e.g. the
 * universal /credits nav tab) — a sensible fallback so an enrolled user still
 * sees THEIR arm there, without hardcoding a persona at the call site.
 */
export async function paywallScopePersonaId(): Promise<string | null> {
  const exp = await getExperiment(PAYWALL_EXPERIMENT_KEY);
  return (exp?.scope as { personaId?: string } | null | undefined)?.personaId ?? null;
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
