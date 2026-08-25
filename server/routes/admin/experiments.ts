// Admin — unified A/B experiment framework, Phase 2 (READ-ONLY).
// PRD: docs/ab-testing-framework-prd.md §3.5–3.6, §7 Phase 2.
//
//   GET /api/admin/experiments              list the experiment registry
//   GET /api/admin/experiments/:key/results DB-sourced tally + SRM + significance
//
// No write paths here (create/edit/start/pause/declare-winner = Phase 3). Both
// routes are auto-protected by requireAdmin (applied in admin/index.ts). Results
// are sourced entirely from Postgres via the Phase-1 tally() — never PostHog.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db';
import { experiments, experimentExposures, type ExperimentScope, type ExperimentConversion } from '@shared/schema';
import { desc, eq, sql } from 'drizzle-orm';
import logger from '../../lib/logger';
import {
  tally,
  tallyUpsell1,
  tallyEvent,
  tallyV1Main,
  tallyV1MainBySign,
  tallyV1MainByTarotLander,
  tallyV1MainByVisitor,
  tallyV1MainByTarotHook,
  tallyV1BumpTakeRate,
  type TallyBySignRow,
  type TallyByTarotLanderRow,
  type TallyByHookRow,
  type BumpTakeRateRow,
  twoSidedP,
  minArmExposures,
  invalidateExperiment,
  U1_PRICE_EXPERIMENT_KEY,
  V1_MAIN_EXPERIMENT_KEY,
  PALM_GATE_EXPERIMENT_KEY,
  V1_BUMP_EXPERIMENT_KEY,
  V1_DOWNSELL_BUMP_PRICE_KEY,
  V1_TAROT_VERSION_EXPERIMENT_KEY,
  V1_CLOSE_DEPTH_EXPERIMENT_KEY,
  PERSONA_PROMPT_KEY_PREFIX,
  isPersonaPromptKey,
} from '../../lib/experiments';

const router = Router();

// ── Validation (Phase 3 self-serve write paths) ───────────────────────────────

const variantSchema = z.object({
  key: z.string().min(1).max(40),
  weight: z.number().int().min(0).max(1_000_000),
  payload: z.record(z.unknown()).optional(),
});

const variantsSchema = z
  .array(variantSchema)
  .min(2, 'an experiment needs at least 2 variants')
  .refine((vs) => new Set(vs.map((v) => v.key)).size === vs.length, 'variant keys must be unique')
  .refine((vs) => vs.some((v) => v.weight > 0), 'at least one variant must have weight > 0');

const scopeSchema = z
  .object({
    personaId: z.string().nullable().optional(),
    // Typed so a non-string funnel can't silently start an inert test. An ARRAY enrols
    // several funnels in one pooled test (fb-palm commitment gate + /fb-tarot, 7/31);
    // `.min(1)` because [] would scope the test to no traffic at all.
    funnel: z.union([z.string(), z.array(z.string().min(1)).min(1)]).optional(),
    sign: z.string().optional(),   // same reason: a non-string sign would scope the test to nothing
    route: z.string().optional(),
    // Enrolled /fb-tarot ad URLs as (hook, deck) PAIRS. Both halves required: a
    // half-written entry can't identify a lander, and several hooks run on more than
    // one deck (`cards-return` runs clean AND on &deck=arcana-mfh). `.min(1)` for the
    // same reason as `funnel` — [] would scope the test to no traffic at all.
    landers: z
      .array(z.object({ hook: z.string().min(1).max(60), deck: z.string().min(1).max(60) }))
      .min(1)
      .refine(
        (ls) => new Set(ls.map((l) => `${l.hook}|${l.deck}`)).size === ls.length,
        'landers must be unique (hook, deck) pairs',
      )
      .optional(),
    // Pin subjects to their first-exposure variant. Required before weights can be
    // edited on a RUNNING test — see the live-edit guard in PATCH below.
    freezeAssignment: z.boolean().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const conversionSchema = z
  .object({
    type: z.enum(['credit_purchase', 'upsell1_funnel', 'v1_main_funnel', 'event']),
    windowDays: z.number().int().positive().max(365).optional(),
    name: z.string().optional(),
    targetN: z.number().int().nonnegative().max(10_000_000).optional(), // pre-registered per-arm N
  })
  .nullable()
  .optional();

const createSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{1,63}$/, 'key must be a lowercase slug (a-z, 0-9, _, -)'),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  subjectType: z.enum(['user', 'visitor', 'email']).default('user'),
  variants: variantsSchema,
  scope: scopeSchema,
  conversion: conversionSchema,
});

const editSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  subjectType: z.enum(['user', 'visitor', 'email']).optional(),
  variants: variantsSchema.optional(),
  scope: scopeSchema,
  conversion: conversionSchema,
});

// An upsell1_funnel test reads each arm's `upsell1Cents` payload to price the
// Upsell-1 — every arm needs a valid positive price so a typo can't silently
// charge the legacy $47 and drop that arm's denominator. Returns an error message
// or null. Checked in the route where the EFFECTIVE conversion type is known
// (request body OR the stored experiment), so an edit that omits conversion is
// still validated.
function u1PayloadError(variants: Array<{ key: string; payload?: Record<string, unknown> }>): string | null {
  for (const v of variants) {
    const c = Number((v.payload as { upsell1Cents?: unknown } | undefined)?.upsell1Cents);
    if (!Number.isFinite(c) || c <= 0) {
      return `variant '${v.key}': an upsell1_funnel arm needs a positive upsell1Cents payload`;
    }
  }
  return null;
}

// Keys legitimately measured by `v1_main_funnel` (exposure log ⋈ conversations,
// confirmed main/downsell purchase + revenue).
//
// The original rule was "this conversion type belongs to V1_MAIN_EXPERIMENT_KEY
// and nothing else", because resolveV1Price only consults that key, so any other
// key carrying it would be INERT — assigned but never applied. That reasoning is
// about applying a PRICE. The commitment gate has its own resolver
// (resolvePalmGate) and its own exposure logging, so it is not inert; it just
// happens to be scored by the same funnel outcome. Both keys still have to keep
// this conversion type (enforced below) and set scope.funnel before starting.
//
// The ORDER BUMP joins on the same terms: its own resolver (resolveV1Bump) and its
// own exposure logging, scored by the same funnel outcome — with the bump's line
// item added back into revenue by tallyV1Main, since mainPurchaseAmount stays the
// main offer alone. Like the gate it carries no price payload (see below).
// The /fb-tarot VERSION test joins on the same terms again — its own resolver
// (resolveTarotVersion), its own exposure logging, scored by the same funnel
// outcome, and no price payload. It is the first one whose subject is a VISITOR
// COOKIE rather than a hashed email, so it is tallied through
// conversations.ab_visitor_id (tallyV1MainByVisitor) instead of the exposure's
// conversationId — see VISITOR_KEYED_V1_MAIN_KEYS below.
// CLOSE DEPTH joins on the gate/bump terms, not the tarot-version ones: its own
// resolver (resolveV1CloseDepth), its own exposure logging with a conversationId,
// no price payload, and an EMAIL subject assigned at lead capture — so it tallies
// through tallyV1Main like the first three, and its per-lander split comes free
// from the tarot labels on its exposures.
// THE DOWNSELL BUMP PRICE joins on the gate/bump/close-depth terms: its own resolver
// (resolveV1DownsellBumpPrice), its own exposure logging, an EMAIL subject, and a
// conversationId on the exposure — so it tallies through tallyV1Main like the rest and
// its bump take-rate block comes free from conversations.bump_offered.
//
// 🔴 IT IS ALLOWLISTED HERE BECAUSE conversion.type MUST BE SET AT ALL. With it NULL
// the results endpoint falls through to its default, `credit_purchase` — the V2 CHAT
// conversion — and the page renders a table of zeros counted from chat-minute
// purchases. That is worse than an empty dashboard: it looks like a result.
//
// ⚠️ ITS DENOMINATOR IS NOT THE OTHERS'. Every other key here enrols at LEAD capture,
// so "exposed" means "was a lead". This one enrols at the OFFER, so "exposed" means
// "was offered the downsell bump" — roughly 3% as many rows, and a conversion rate an
// order of magnitude higher. The arms are comparable with each other and NOT with the
// other tests' numbers. Read the two side by side and you will think this test is
// converting spectacularly.
const V1_MAIN_FUNNEL_KEYS: readonly string[] = [
  V1_MAIN_EXPERIMENT_KEY,
  PALM_GATE_EXPERIMENT_KEY,
  V1_BUMP_EXPERIMENT_KEY,
  V1_TAROT_VERSION_EXPERIMENT_KEY,
  V1_CLOSE_DEPTH_EXPERIMENT_KEY,
  V1_DOWNSELL_BUMP_PRICE_KEY,
];

// Which v1_main_funnel tests are keyed on a VISITOR COOKIE assigned at the lander
// rather than a hashed email assigned at lead capture. These reach the purchase
// through conversations.ab_visitor_id, so their denominator is landers rather than
// leads and their numbers are NOT arm-for-arm comparable with the email-keyed tests.
const VISITOR_KEYED_V1_MAIN_KEYS: readonly string[] = [V1_TAROT_VERSION_EXPERIMENT_KEY];

// Only the PRICE test's arms carry a price payload. The commitment gate and the
// order bump are UI-only tests measured by the same funnel outcome, so their arms
// carry no cents — requiring them would force a fake price onto a test that never
// applies one. (The bump's $12.77 is a fixed constant, V1_BUMP_CENTS, not an arm
// payload: both arms charge the same main price, they differ only in whether the
// extra line item is offered at all.)
function needsV1MainPricePayload(key: string): boolean {
  return key === V1_MAIN_EXPERIMENT_KEY;
}

// A v1_main_funnel arm reads BOTH mainCents and downsellCents to price the V1 main
// + downsell — both must be valid positive ints so a typo can't half-apply a price
// (resolveV1Price falls back to the legacy price unless BOTH are present).
function v1MainPayloadError(
  variants: Array<{ key: string; payload?: Record<string, unknown> }>,
): string | null {
  for (const v of variants) {
    const p = v.payload as { mainCents?: unknown; downsellCents?: unknown } | undefined;
    const m = Number(p?.mainCents);
    const d = Number(p?.downsellCents);
    if (!Number.isFinite(m) || m <= 0) return `variant '${v.key}': a v1_main_funnel arm needs a positive mainCents payload`;
    if (!Number.isFinite(d) || d <= 0) return `variant '${v.key}': a v1_main_funnel arm needs a positive downsellCents payload`;
  }
  return null;
}

// A persona_prompt_* experiment drives the live AI system prompt, so it must be
// scoped to exactly one persona (assign()'s scope check then enrols only that
// persona's users) and measured by credit_purchase (the chat conversion). Checked
// against the EFFECTIVE scope/conversion (request body OR the stored row). Returns
// an error message or null.
function personaPromptConfigError(
  scope: { personaId?: string | null } | null | undefined,
  conversion: { type?: string } | null | undefined,
): string | null {
  if (!scope?.personaId) {
    return `a '${PERSONA_PROMPT_KEY_PREFIX}*' experiment must be scoped to a persona (scope.personaId)`;
  }
  const type = conversion?.type ?? 'credit_purchase';
  if (type !== 'credit_purchase') {
    return `a '${PERSONA_PROMPT_KEY_PREFIX}*' experiment must use conversion type 'credit_purchase'`;
  }
  return null;
}

/** Read a variant's payload.systemPrompt as a trimmed string ('' if absent/blank). */
function armPrompt(v: { payload?: Record<string, unknown> } | undefined): string {
  const sp = (v?.payload as { systemPrompt?: unknown } | undefined)?.systemPrompt;
  return typeof sp === 'string' ? sp.trim() : '';
}

// Before STARTING a persona-prompt test: the CONTROL arm (variants[0]) must carry NO
// systemPrompt (it must render the live base prompt byte-identical — that's the valid
// A/B baseline), and every TREATMENT arm (variants[1..]) must carry a non-empty one
// (an empty treatment == control == base, an inert test). Drafts may hold an empty
// placeholder treatment, authored before start. Returns an error message or null.
function personaPromptArmsError(
  variants: Array<{ key: string; payload?: Record<string, unknown> }>,
): string | null {
  if (armPrompt(variants[0])) {
    return `variant '${variants[0].key}': the control arm must use the base prompt — leave payload.systemPrompt empty`;
  }
  for (let i = 1; i < variants.length; i++) {
    if (!armPrompt(variants[i])) {
      return `variant '${variants[i].key}': a persona-prompt treatment arm needs a non-empty payload.systemPrompt before starting`;
    }
  }
  return null;
}

// A payload.systemPrompt is only honoured for persona_prompt_* keys (resolvePersonaPrompt
// + getActivePromptExperimentKey gate on the prefix). Carrying one on any other key would
// run a silently-inert "prompt test" that changes nothing. Reject at create/edit so the
// operator renames the key instead. Returns an error message or null.
function strayPromptPayloadError(
  key: string,
  variants: Array<{ key: string; payload?: Record<string, unknown> }> | undefined,
): string | null {
  if (isPersonaPromptKey(key) || !variants) return null;
  for (const v of variants) {
    if (armPrompt(v)) {
      return `variant '${v.key}': payload.systemPrompt is only used by '${PERSONA_PROMPT_KEY_PREFIX}*' experiments — rename the key to start with '${PERSONA_PROMPT_KEY_PREFIX}'`;
    }
  }
  return null;
}

const winnerSchema = z.object({
  variant: z.string().min(1),
  // Explicit override of the pre-registered-N gate (early stop). Default false —
  // the gate enforces fixed-horizon "no peeking"; pausing is the emergency kill.
  force: z.boolean().optional(),
});

function badRequest(res: Response, parsed: z.SafeParseError<unknown>) {
  return res.status(400).json({
    error: 'Validation failed',
    details: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
  });
}

/** Parse a positive-int query param; null if absent/invalid. */
function parsePositiveInt(v: unknown): number | null {
  if (typeof v !== 'string' || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Pre-registered-N gate (fixed-horizon, no peeking) — shared by the results
// route (progress display) and the declare-winner gate (server enforcement), so
// the two NEVER disagree. ──────────────────────────────────────────────────────

/**
 * JSON with object keys sorted, recursively — an order-independent identity for
 * "is this value the same as that one".
 *
 * 🔴 WHY THIS IS NOT OPTIONAL TIDINESS. jsonb does not preserve key order: Postgres
 * stores keys sorted by length then bytewise, so `{type, windowDays, targetN}` comes
 * back as `{type, targetN, windowDays}`. The dashboard rebuilds the object from form
 * fields in ITS own order. A plain JSON.stringify comparison therefore reports a
 * change when nothing changed, and the frozen-field guard 409s an edit that touched
 * only the weights — which is precisely the thing live weight editing exists to do.
 *
 * Arrays keep their order (it is meaningful — variants[0] is the control arm).
 */
export function stableJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  const entries = Object.entries(v as Record<string, unknown>)
    .filter(([, val]) => val !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, val]) => `${JSON.stringify(k)}:${stableJson(val)}`).join(',')}}`;
}

/**
 * Is this scope edit allowed on a test that has already STARTED? Returns a label
 * for the offending field, or null if the edit is one of the two permitted live
 * changes (appending scope.landers, or switching scope.freezeAssignment on).
 */
export function scopeEditError(
  stored: ExperimentScope | null,
  incoming: ExperimentScope | null,
): string | null {
  // Everything OUTSIDE landers/freezeAssignment stays frozen — funnel, sign,
  // personaId, route, element all re-partition who is in the test.
  const stable = (s: ExperimentScope | null): string => {
    const { landers: _l, freezeAssignment: _f, ...rest } = (s ?? {}) as Record<string, unknown>;
    return stableJson(rest);
  };
  if (stable(stored) !== stable(incoming)) return 'scope';

  // freezeAssignment may be switched ON at any time (it can only ever stop future
  // drift), but never back OFF — that would re-expose the test to the reassignment
  // this whole mechanism exists to prevent.
  if (stored?.freezeAssignment === true && incoming?.freezeAssignment !== true) {
    return 'scope.freezeAssignment (it can be switched on mid-flight, never off)';
  }

  const storedLanders = stored?.landers;
  const incomingLanders = incoming?.landers;
  // Absent scope.landers means "every lander". Adding a list to a test that had none
  // NARROWS it, and dropping the list WIDENS it to traffic that was never enrolled —
  // both change the population mid-flight, so neither is an append.
  if (!storedLanders && incomingLanders) {
    return 'scope.landers (this test enrols every lander; adding a list would narrow it mid-flight)';
  }
  if (storedLanders && !incomingLanders) {
    return 'scope.landers (dropping the list would enrol every lander mid-flight)';
  }
  if (storedLanders && incomingLanders) {
    const id = (l: { hook: string; deck: string }) => `${l.hook}|${l.deck}`;
    const after = new Set(incomingLanders.map(id));
    const removed = storedLanders.map(id).filter((k) => !after.has(k));
    if (removed.length) {
      return `scope.landers (cannot remove ${removed.join(', ')} — landers are append-only once exposures exist)`;
    }
  }
  return null;
}

/** Pre-registered per-arm N from the experiment's conversion config; null = no gate. */
function targetNOf(exp: { conversion?: ExperimentConversion | null }): number | null {
  const t = exp.conversion?.targetN;
  return typeof t === 'number' && t > 0 ? t : null;
}

/** Positive-weight arm keys — the arms the gate is measured over. A weight-0 arm is
 *  never assigned, so it must NOT lock the gate; an enrolled arm still at 0 exposures
 *  MUST keep it locked (minArmExposures treats a missing arm as 0). */
function gateArmKeys(variants: Array<{ key: string; weight: number }> | null | undefined): string[] {
  return (variants ?? []).filter((v) => v.weight > 0).map((v) => v.key);
}

/** Canonical cohort start: when the test was flipped on (startedAt), else the first
 *  logged exposure. Independent of the ?start/?windowDays tally overrides, so the
 *  results-route progress and the declare-winner gate measure the SAME cohort. */
async function cohortStartISO(exp: { key: string; startedAt: Date | null }): Promise<string | null> {
  if (exp.startedAt) return exp.startedAt.toISOString();
  const rows = await db
    .select({ first: sql<string | null>`min(${experimentExposures.createdAt})` })
    .from(experimentExposures)
    .where(eq(experimentExposures.experimentKey, exp.key));
  const first = rows[0]?.first;
  return first ? new Date(first).toISOString() : null;
}

/**
 * Pre-registered-N gating (fixed-horizon, no peeking): progress toward the
 * pre-registered per-arm exposure target, measured over the CANONICAL cohort start
 * (not the ?start tally override) and the positive-weight arms — so this display
 * always matches the server-side declare-winner gate. `reached` once every such arm
 * has >= targetN exposures (the smallest governs). Undefined when no target is set.
 */
async function progressOf(
  exp: { key: string; startedAt: Date | null; conversion?: ExperimentConversion | null; variants: unknown },
  key: string,
): Promise<{ targetN: number; minExposures: number; reached: boolean } | undefined> {
  const targetN = targetNOf(exp);
  if (!targetN) return undefined;
  const gateStart = await cohortStartISO(exp);
  const arms = gateArmKeys(exp.variants as Array<{ key: string; weight: number }> | null);
  const minCount = gateStart ? await minArmExposures(key, gateStart, arms) : 0;
  return { targetN, minExposures: minCount, reached: minCount >= targetN };
}

/** Chi-square (df=1) SRM verdict for an observed a/b split against configured
 *  weights. `ok:false` ⇒ assignment is skewed and the results are suspect. */
export function srmVerdict(a: number, b: number, wA: number, wB: number) {
  const n = a + b;
  const expectedBSharePct = (wB / (wA + wB)) * 100;
  if (n === 0) return { expectedBSharePct, chiSquareP: 1, ok: true };
  const expA = (n * wA) / (wA + wB);
  const expB = (n * wB) / (wA + wB);
  const chi2 = (a - expA) ** 2 / expA + (b - expB) ** 2 / expB;
  // χ²₁ = Z², so its upper-tail p equals the two-sided normal p at sqrt(chi2).
  const chiSquareP = twoSidedP(Math.sqrt(chi2));
  return { expectedBSharePct, chiSquareP, ok: chiSquareP >= 0.001 };
}

/** Per-arm exposure counts split either side of a reweight instant, from ONE query
 *  so both eras come from the same source and always sum to the same total. */
async function armExposuresAroundReweight(
  key: string,
  sinceISO: string,
  controlKey: string,
  treatmentKey: string,
): Promise<{ sinceA: number; sinceB: number; priorA: number; priorB: number }> {
  const res = await db.execute(sql`
    SELECT variant,
           count(*) FILTER (WHERE created_at >= ${sinceISO}) AS since_n,
           count(*) FILTER (WHERE created_at <  ${sinceISO}) AS prior_n
    FROM experiment_exposures
    WHERE experiment_key = ${key}
    GROUP BY variant;
  `);
  const since: Record<string, number> = {};
  const prior: Record<string, number> = {};
  for (const r of res.rows as Record<string, unknown>[]) {
    since[String(r.variant)] = Number(r.since_n) || 0;
    prior[String(r.variant)] = Number(r.prior_n) || 0;
  }
  return {
    sinceA: since[controlKey] ?? 0,
    sinceB: since[treatmentKey] ?? 0,
    priorA: prior[controlKey] ?? 0,
    priorB: prior[treatmentKey] ?? 0,
  };
}

/**
 * Augment tally()'s observed split with an SRM (sample-ratio mismatch) check
 * against the configured A/B weights.
 *
 * 🔴 SCOPED TO THE CURRENT WEIGHTS. If the weights were changed mid-flight
 * (`weightsChangedAt`), every exposure BEFORE that instant was assigned under a
 * different ratio. Grading those against today's weights fails by construction, and
 * it can never recover: new traffic adds to both arms roughly equally, so the
 * imbalance the old era baked in never shrinks while only the denominator grows —
 * the chi-square bottoms out well above the threshold and then RISES. The banner
 * would therefore stay red for the rest of the run, which is worse than useless
 * because it hides a GENUINE randomisation failure behind a warning everyone has
 * learned to ignore. So the verdict is computed over the CURRENT-weights era only,
 * and the earlier era is reported separately for context.
 *
 * ⭐ Scoping to exposures is exactly right, not an approximation:
 * experiment_exposures is unique(experiment_key, subject_id), so every row is a
 * FIRST assignment. A visitor pinned by scope.freezeAssignment writes no second row,
 * and therefore cannot drag the post-reweight split away from the new ratio.
 *
 * `weightsChangedAt = null` (every test that has never been reweighted) ⇒ the exact
 * behaviour this had before, and no extra query.
 */
async function augmentSrm(
  srm: { aViewers: number; bViewers: number; bSharePct: number } | undefined,
  variants: Array<{ key: string; weight: number }> | null | undefined,
  exp: { key: string; weightsChangedAt: Date | null },
  controlKey: string | undefined,
  treatmentKey: string | undefined,
) {
  if (!srm) return undefined;
  // Control/treatment = the first two arms (matches tally()'s controlKey/treatmentKey).
  const wA = variants?.[0]?.weight ?? 0;
  const wB = variants?.[1]?.weight ?? 0;
  if (wA <= 0 || wB <= 0) return srm; // no configured weights to compare against

  // Fall back to the lifetime check when the reweight era cannot be resolved: no
  // stamp, or no arm keys to count exposures by. Never leave the caller with no
  // verdict at all — an absent banner reads as "randomisation is fine".
  if (!exp.weightsChangedAt || !controlKey || !treatmentKey) {
    return { ...srm, ...srmVerdict(srm.aViewers, srm.bViewers, wA, wB) };
  }

  const weightsChangedAt = exp.weightsChangedAt.toISOString();
  const eras = await armExposuresAroundReweight(exp.key, weightsChangedAt, controlKey, treatmentKey);
  const sinceN = eras.sinceA + eras.sinceB;
  const priorN = eras.priorA + eras.priorB;
  return {
    ...srm,
    ...srmVerdict(eras.sinceA, eras.sinceB, wA, wB),
    // Present ONLY on a reweighted test — the dashboard keys its two-era rendering
    // off this field, so its absence keeps every other test's display identical.
    weightsChangedAt,
    sinceA: eras.sinceA,
    sinceB: eras.sinceB,
    sinceBSharePct: sinceN > 0 ? (eras.sinceB / sinceN) * 100 : 0,
    priorA: eras.priorA,
    priorB: eras.priorB,
    priorBSharePct: priorN > 0 ? (eras.priorB / priorN) * 100 : 0,
  };
}

// GET /api/admin/experiments — the registry (newest first).
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(experiments).orderBy(desc(experiments.createdAt));
    return res.json({ experiments: rows });
  } catch (error: any) {
    logger.error('List experiments error:', error);
    return res.status(500).json({ error: 'Failed to list experiments' });
  }
});

// GET /api/admin/experiments/:key/results
// Cohort params default from the experiment row (startedAt / conversion.windowDays
// / scope.personaId) and may be overridden read-only via ?start / ?windowDays /
// ?personaId. A not-yet-started test (no startedAt and no ?start) returns an empty,
// `started:false` result rather than erroring.
router.get('/:key/results', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    const rows = await db.select().from(experiments).where(eq(experiments.key, key)).limit(1);
    const exp = rows[0];
    if (!exp) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const running = exp.status === 'running';
    const meta = {
      key: exp.key,
      name: exp.name,
      status: exp.status,
      running,
      subjectType: exp.subjectType,
      scope: exp.scope,
      conversion: exp.conversion,
      startedAt: exp.startedAt,
      endedAt: exp.endedAt,
      winnerVariant: exp.winnerVariant,
      variants: exp.variants,
    };

    // Validate the optional ?start override (else a bad value hits tally()'s SQL
    // and returns an opaque 500). Empty/absent = no override.
    const startRaw = typeof req.query.start === 'string' ? req.query.start.trim() : '';
    if (startRaw && Number.isNaN(Date.parse(startRaw))) {
      return res.status(400).json({ error: `invalid ?start date: "${startRaw}"` });
    }
    const startOverride = startRaw ? new Date(startRaw).toISOString() : null;

    // Cohort start: explicit ?start > experiment.startedAt > the first logged
    // exposure. The last fallback keeps results correct for a test "started" by
    // flipping status='running' (which is what enrolls users in assign()) without
    // also setting started_at — exposures only begin once running, so MIN(created_at)
    // is the true cohort start.
    let startISO = startOverride ?? (exp.startedAt ? exp.startedAt.toISOString() : null);
    if (!startISO) {
      const firstExposure = await db
        .select({ first: sql<string | null>`min(${experimentExposures.createdAt})` })
        .from(experimentExposures)
        .where(eq(experimentExposures.experimentKey, key));
      const first = firstExposure[0]?.first;
      if (first) startISO = new Date(first).toISOString();
    }

    const windowFromRow =
      typeof exp.conversion?.windowDays === 'number' && exp.conversion.windowDays > 0
        ? exp.conversion.windowDays
        : 7;
    const windowDays = parsePositiveInt(req.query.windowDays) ?? windowFromRow;

    const personaOverride =
      typeof req.query.personaId === 'string' && req.query.personaId ? req.query.personaId : null;
    const personaId = personaOverride ?? exp.scope?.personaId ?? null;

    const params = { startISO, windowDays, personaId };

    if (!startISO) {
      // No cohort yet — not running, or running with no exposures logged.
      return res.json({ experiment: meta, started: false, params, rows: [] });
    }

    const conversionType = exp.conversion?.type ?? 'credit_purchase';
    const controlKey = exp.variants?.[0]?.key;
    const treatmentKey = exp.variants?.[1]?.key;

    let result;
    let bySign: TallyBySignRow[] | undefined;
    let byTarotLander: TallyByTarotLanderRow[] | undefined;
    let byTarotHook: TallyByHookRow[] | undefined;
    let landerCount: number | undefined;
    let bumpTakeRate: BumpTakeRateRow[] | undefined;
    if (conversionType === 'credit_purchase') {
      result = await tally(key, { startISO, windowDays, personaId, controlKey, treatmentKey });
    } else if (conversionType === 'upsell1_funnel') {
      // Sourced from the exposure log ⋈ conversations funnel; window/persona don't
      // apply. Needs ≥2 arms to compare.
      if (!controlKey || !treatmentKey) {
        return res.json({
          experiment: meta,
          started: true,
          unsupported: 'experiment needs at least 2 arms to measure',
          params,
          rows: [],
        });
      }
      result = await tallyUpsell1({ key, startISO, controlKey, treatmentKey });
    } else if (conversionType === 'v1_main_funnel') {
      // Sourced from the exposure log ⋈ conversations (confirmed main/downsell
      // purchase). Needs ≥2 arms to compare.
      if (!controlKey || !treatmentKey) {
        return res.json({
          experiment: meta,
          started: true,
          unsupported: 'experiment needs at least 2 arms to measure',
          params,
          rows: [],
        });
      }
      // VISITOR-KEYED tests (the /fb-tarot version split) reach the purchase through
      // conversations.ab_visitor_id instead of the exposure's conversationId, because
      // they are assigned at the LANDER, before any email exists. Their denominator is
      // landers rather than leads, and their per-lander split is keyed on (hook, deck)
      // — the ad URL — rather than on palm sign or facing x angle, neither of which
      // their exposures carry. The sign / facing / bump-take-rate blocks below all
      // return [] for them anyway; branching keeps three pointless queries off the
      // request instead of relying on that.
      if (VISITOR_KEYED_V1_MAIN_KEYS.includes(key)) {
        result = await tallyV1MainByVisitor({ key, startISO, controlKey, treatmentKey });
        const hookRows = await tallyV1MainByTarotHook({ key, startISO, controlKey, treatmentKey });
        if (hookRows.length > 0) byTarotHook = hookRows;
        // Landers can be appended to a running test, so the pooled row above may blend
        // cohorts with different runtimes. Tell the dashboard how many distinct landers
        // are in play rather than leaving that inference to whoever reads the page.
        landerCount = hookRows.length;
        return res.json({
          experiment: meta,
          started: true,
          params,
          rows: result.rows,
          byTarotHook,
          landerCount,
          visitorKeyed: true,
          srm: await augmentSrm(result.srm, exp.variants, exp, controlKey, treatmentKey),
          significance: result.significance,
          progress: await progressOf(exp, key),
        });
      }
      result = await tallyV1Main({ key, startISO, controlKey, treatmentKey });
      // Per-fb-palm-sign split of the SAME numbers. Diagnostic only — see
      // tallyV1MainBySign. Empty for any test whose exposures carry no sign, so
      // non-palm v1_main tests are unaffected and the block is simply omitted.
      const signRows = await tallyV1MainBySign({ key, startISO, controlKey, treatmentKey });
      if (signRows.length > 1 || (signRows.length === 1 && signRows[0].sign !== '(unrecorded)')) {
        bySign = signRows;
      }
      // Per-/fb-tarot-lander split of the same numbers (facing x angle). Empty for
      // every test whose exposures carry no facing, so palm-only and non-V1 tests are
      // unaffected and the block is simply omitted.
      const tarotRows = await tallyV1MainByTarotLander({ key, startISO, controlKey, treatmentKey });
      if (tarotRows.length > 0) {
        byTarotLander = tarotRows;
      }
      // Order-bump take rate. Returns [] unless some arm was actually offered a
      // bump, so every other v1_main test omits the block entirely. This is the
      // number the pooled table structurally cannot show — there a bump order and
      // a plain order are both just "one buyer".
      const takeRows = await tallyV1BumpTakeRate({ key, startISO, controlKey, treatmentKey });
      if (takeRows.length > 0) {
        bumpTakeRate = takeRows;
      }
    } else if (conversionType === 'event') {
      // Generic event conversions (e.g. visitor page-copy lander tests).
      if (!controlKey || !treatmentKey) {
        return res.json({
          experiment: meta,
          started: true,
          unsupported: 'experiment needs at least 2 arms to measure',
          params,
          rows: [],
        });
      }
      result = await tallyEvent({ key, startISO, controlKey, treatmentKey });
    } else {
      return res.json({
        experiment: meta,
        started: true,
        unsupported: `conversion type '${conversionType}' is not measurable yet`,
        params,
        rows: [],
      });
    }
    const srm = await augmentSrm(result.srm, exp.variants, exp, controlKey, treatmentKey);

    const progress = await progressOf(exp, key);

    return res.json({
      experiment: meta,
      started: true,
      params,
      rows: result.rows,
      bySign,
      byTarotLander,
      bumpTakeRate,
      excluded: result.excluded,
      srm,
      significance: result.significance,
      progress,
    });
  } catch (error: any) {
    logger.error('Experiment results error:', error);
    return res.status(500).json({ error: 'Failed to compute experiment results' });
  }
});

// ── Write paths (Phase 3 — self-serve). Every write invalidates the assign()
// cache so changes (and the pause kill-switch) take effect immediately. ────────

// POST /api/admin/experiments — create a DRAFT experiment.
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed);
    const data = parsed.data;

    // upsell1_funnel is wired to ONE money key (the Upsell-1 charge path in
    // priceVariant.ts consults only u1_price_2026); a second one would run inert
    // (status=running but never pricing or logging). Reject it explicitly.
    if (data.conversion?.type === 'upsell1_funnel') {
      if (data.key !== U1_PRICE_EXPERIMENT_KEY) {
        return res.status(400).json({
          error: `conversion type 'upsell1_funnel' is only supported for the '${U1_PRICE_EXPERIMENT_KEY}' experiment`,
        });
      }
      const err = u1PayloadError(data.variants);
      if (err) return res.status(400).json({ error: err });
    }
    if (data.conversion?.type === 'v1_main_funnel') {
      if (!V1_MAIN_FUNNEL_KEYS.includes(data.key)) {
        return res.status(400).json({
          error: `conversion type 'v1_main_funnel' is only supported for: ${V1_MAIN_FUNNEL_KEYS.join(', ')}`,
        });
      }
      if (needsV1MainPricePayload(data.key)) {
        const err = v1MainPayloadError(data.variants);
        if (err) return res.status(400).json({ error: err });
      }
    }

    // persona_prompt_* keys are wired to the live AI path; enforce structural
    // requirements at create (arm prompts may still be empty placeholders on a
    // draft — they're required at start).
    if (isPersonaPromptKey(data.key)) {
      const err = personaPromptConfigError(data.scope, data.conversion);
      if (err) return res.status(400).json({ error: err });
    }
    // A systemPrompt payload on a non-persona_prompt key would be silently inert.
    const strayErr = strayPromptPayloadError(data.key, data.variants);
    if (strayErr) return res.status(400).json({ error: strayErr });

    // Uniqueness is enforced by the experiments.key UNIQUE constraint — let the DB
    // be the source of truth (no TOCTOU race) and map its violation to a 409.
    const inserted = await db
      .insert(experiments)
      .values({
        key: data.key,
        name: data.name,
        description: data.description ?? null,
        status: 'draft', // new experiments are always draft → off until explicitly started
        subjectType: data.subjectType,
        variants: data.variants,
        scope: (data.scope ?? null) as ExperimentScope | null,
        conversion: (data.conversion ?? null) as ExperimentConversion | null,
        createdBy: req.adminId,
        updatedBy: req.adminId,
      })
      .returning();
    return res.status(201).json({ experiment: inserted[0] });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: `experiment key '${req.body?.key}' already exists` });
    }
    logger.error('Create experiment error:', error);
    return res.status(500).json({ error: 'Failed to create experiment' });
  }
});

// PATCH /api/admin/experiments/:key — edit (variants/weights/payload/scope/conversion/name).
router.patch('/:key', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed);
    const data = parsed.data;

    const rows = await db.select().from(experiments).where(eq(experiments.key, key)).limit(1);
    const exp = rows[0];
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });

    // ASSIGNMENT FREEZE: once a test has been started (status != draft), its
    // assignment-affecting fields — variants (keys/order/payload), scope, subjectType
    // — and its measurement definition (conversion) are FROZEN. Any of them would
    // re-bucket or re-partition already-enrolled subjects, or retro-change the metric,
    // corrupting a fixed-horizon test. Drafts are fully editable.
    //
    // TWO NARROW EXCEPTIONS (2026-08-10), both live-editable from the dashboard:
    //
    //   1. VARIANT WEIGHTS — but ONLY on a test with scope.freezeAssignment. Weights
    //      alone are safe to move when subjects are pinned to their first-exposure
    //      variant; without that pin, re-weighting silently reassigns visitors who
    //      have already seen the other arm (the bucket is sticky, the bucket→variant
    //      MAP is not). Coupling the two makes the corrupting version unreachable
    //      through the API rather than merely discouraged.
    //
    //   2. APPENDING scope.landers — adding an ad URL to a running test. Append-only:
    //      a lander already accruing exposures can never be REMOVED, because its rows
    //      would stay in the tally with nothing left in scope to explain them, moving
    //      the denominator under a running test.
    //
    // Everything else still requires a new experiment. Note both exceptions change
    // WHO enters from now on, never what an already-enrolled subject sees — and both
    // make the pooled row a blend of cohorts with different runtimes, which is why
    // the per-lander table is the honest read (see tallyV1MainByTarotHook).
    // Set when this edit actually moves a STARTED test's weights, so the update below
    // can stamp weightsChangedAt. Drafts are excluded deliberately: they have no
    // exposures, so there is no earlier era to separate, and a stamp older than
    // startedAt would only be noise.
    let weightsChanged = false;

    if (exp.status !== 'draft') {
      const changed: string[] = [];
      // stableJson, not JSON.stringify: arm PAYLOADS are jsonb too, so a multi-key
      // payload comes back from the DB in a different key order than the dashboard
      // sends it — and that would read as "the payload changed" on a weight-only edit.
      const identity = (vs: Array<{ key: string; payload?: unknown }> | null | undefined) =>
        stableJson((vs ?? []).map((v) => ({ key: v.key, payload: v.payload ?? {} })));
      const weights = (vs: Array<{ key: string; weight: number }> | null | undefined) =>
        JSON.stringify((vs ?? []).map((v) => v.weight));

      const storedVariants = (exp.variants ?? []) as Array<{ key: string; weight: number; payload?: unknown }>;
      if (data.variants !== undefined) {
        // Keys, ORDER and payloads must be untouched. Order matters as much as the
        // keys: variants[0] is the control arm, and pickVariant walks the list in
        // order, so re-ordering re-maps every bucket.
        if (identity(data.variants) !== identity(storedVariants)) {
          changed.push('variant keys/order/payload');
        } else if (weights(data.variants) !== weights(storedVariants)) {
          const effFreeze =
            (data.scope !== undefined ? data.scope?.freezeAssignment : exp.scope?.freezeAssignment) === true;
          if (!effFreeze) {
            return res.status(409).json({
              error:
                'cannot change weights on a running test that does not pin assignments — ' +
                'set scope.freezeAssignment before starting it, so re-weighting only affects NEW subjects ' +
                'instead of reassigning visitors who have already seen the other arm.',
            });
          }
          // Allowed live reweight ⇒ mark the era boundary. Set only in this branch,
          // so an edit that re-sends identical weights (the dashboard always re-sends
          // `variants` on save) does NOT move the boundary and silently discard the
          // data collected since the real change.
          weightsChanged = true;
        }
      }

      if (data.subjectType !== undefined && data.subjectType !== exp.subjectType) changed.push('subjectType');

      if (data.scope !== undefined) {
        const err = scopeEditError(exp.scope ?? null, data.scope ?? null);
        if (err) changed.push(err);
      }

      // 🔴 stableJson, not JSON.stringify. The dashboard always re-sends `conversion`
      // on save, rebuilt as {type, windowDays, targetN}; jsonb returns it as
      // {type, targetN, windowDays}. Compared as raw strings those differ, so EVERY
      // live weight edit 409'd with "cannot change conversion" — blocking the one
      // thing this whole mechanism was built for, for a reason unrelated to weights.
      if (
        data.conversion !== undefined &&
        stableJson(data.conversion ?? null) !== stableJson(exp.conversion ?? null)
      )
        changed.push('conversion');

      if (changed.length) {
        return res.status(409).json({
          error: `cannot change ${changed.join(', ')} once a test has started. Weights (on a test that pins assignments) and appending scope.landers are the only live edits; everything else needs a new experiment.`,
        });
      }
    }

    // Validate Upsell-1 arm prices against the EFFECTIVE conversion type (the body's
    // override or the stored one), so an edit that re-sends variants without
    // conversion is still checked.
    const effectiveConvType = data.conversion?.type ?? exp.conversion?.type;
    if (effectiveConvType === 'upsell1_funnel' && data.variants) {
      const err = u1PayloadError(data.variants);
      if (err) return res.status(400).json({ error: err });
    }
    if (effectiveConvType === 'v1_main_funnel' && data.variants && needsV1MainPricePayload(key)) {
      const err = v1MainPayloadError(data.variants);
      if (err) return res.status(400).json({ error: err });
    }
    // v1_main_funnel ↔ its owning keys, enforced BOTH directions: an arbitrary key
    // can't become a v1_main test (nothing would resolve it, so it'd be inert), and
    // neither owning key can drop v1_main_funnel (it'd mis-measure + dodge the
    // funnel-scope start guard).
    if (effectiveConvType === 'v1_main_funnel' && !V1_MAIN_FUNNEL_KEYS.includes(key)) {
      return res.status(400).json({
        error: `conversion type 'v1_main_funnel' is only supported for: ${V1_MAIN_FUNNEL_KEYS.join(', ')}`,
      });
    }
    if (V1_MAIN_FUNNEL_KEYS.includes(key) && effectiveConvType && effectiveConvType !== 'v1_main_funnel') {
      return res.status(400).json({
        error: `the '${key}' experiment must keep conversion type 'v1_main_funnel'`,
      });
    }

    // Re-validate persona-prompt structure against the EFFECTIVE scope/conversion
    // (only reachable on a draft — started tests freeze scope/conversion above).
    if (isPersonaPromptKey(key)) {
      const effScope = data.scope !== undefined ? data.scope : exp.scope;
      const effConv = data.conversion !== undefined ? data.conversion : exp.conversion;
      const err = personaPromptConfigError(effScope, effConv);
      if (err) return res.status(400).json({ error: err });
    }
    // A systemPrompt payload on a non-persona_prompt key would be silently inert.
    const strayErr = strayPromptPayloadError(key, data.variants);
    if (strayErr) return res.status(400).json({ error: strayErr });

    const updated = await db
      .update(experiments)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.subjectType !== undefined ? { subjectType: data.subjectType } : {}),
        ...(data.variants !== undefined ? { variants: data.variants } : {}),
        ...(data.scope !== undefined ? { scope: (data.scope ?? null) as ExperimentScope | null } : {}),
        ...(data.conversion !== undefined
          ? { conversion: (data.conversion ?? null) as ExperimentConversion | null }
          : {}),
        // The SRM era boundary. NOT `updatedAt` — that moves on any edit (name,
        // description, appending scope.landers), so reusing it would silently
        // re-scope the check to zero exposures every time someone renamed a test.
        ...(weightsChanged ? { weightsChangedAt: new Date() } : {}),
        updatedBy: req.adminId,
        updatedAt: new Date(),
      })
      .where(eq(experiments.key, key))
      .returning();
    invalidateExperiment(key);
    return res.json({ experiment: updated[0] });
  } catch (error: any) {
    logger.error('Edit experiment error:', error);
    return res.status(500).json({ error: 'Failed to edit experiment' });
  }
});

// POST /api/admin/experiments/:key/start — draft|paused → running.
router.post('/:key/start', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    const rows = await db.select().from(experiments).where(eq(experiments.key, key)).limit(1);
    const exp = rows[0];
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });
    if (exp.status === 'done') {
      return res.status(409).json({ error: 'experiment is concluded — cannot restart' });
    }
    const variants = Array.isArray(exp.variants) ? exp.variants : [];
    if (variants.length < 2 || !variants.some((v) => v.weight > 0)) {
      return res
        .status(400)
        .json({ error: 'need at least 2 variants with a positive weight before starting' });
    }
    // Every v1_main_funnel key drives live V1 funnel behaviour for whatever traffic
    // it enrols — the price key OVERRIDES the main price (resolveV1Price), the palm
    // gate REPLACES the purchase button (resolvePalmGate), the order bump ADDS a
    // second line item to the checkout (resolveV1Bump). Require scope.funnel so each
    // only touches the funnels it names; without it the price override would clobber
    // every live system_config split at once, and the gate/bump would hit every V1
    // lander rather than the intended ones. Keyed on the KEY (not conversion.type) so it can't be bypassed by
    // editing the draft's conversion type away from v1_main_funnel before /start.
    // An ARRAY is accepted (a test run across several named funnels) but an EMPTY one is
    // not: it is truthy, so a bare `!scope.funnel` would wave through a test scoped to no
    // traffic at all. Reachable only via a direct DB write — the zod schema rejects [] —
    // which is exactly how these rows get edited once started (assignment freeze below).
    const scopedFunnels = exp.scope?.funnel;
    const hasFunnelScope = Array.isArray(scopedFunnels)
      ? scopedFunnels.some((f) => typeof f === 'string' && f.length > 0)
      : typeof scopedFunnels === 'string' && scopedFunnels.length > 0;
    if (V1_MAIN_FUNNEL_KEYS.includes(key) && !hasFunnelScope) {
      return res.status(400).json({
        error: `the '${key}' test must set scope.funnel before starting (it applies to those funnels only)`,
      });
    }
    // Same reasoning one level down for scope.landers, and the same escape hatch: []
    // (or a list of half-written entries) is truthy but matchesLanderScope treats it as
    // NO filter, so a lander scope that looks present but matches nothing would widen a
    // four-ad-URL test to every tarot lander running — silently, on live traffic.
    // Reachable only via a direct DB write; the zod schema rejects it on the API.
    const scopedLanders = exp.scope?.landers;
    if (
      scopedLanders !== undefined &&
      scopedLanders !== null &&
      !(
        Array.isArray(scopedLanders) &&
        scopedLanders.some(
          (l) => l && typeof l.hook === 'string' && l.hook && typeof l.deck === 'string' && l.deck,
        )
      )
    ) {
      return res.status(400).json({
        error:
          'scope.landers is present but contains no valid { hook, deck } pair — that would enrol EVERY lander on the funnel. Remove it to run funnel-wide, or fix the entries.',
      });
    }
    // A visitor-keyed v1_main test reaches the purchase through
    // conversations.ab_visitor_id, which only ever holds the ab_vid COOKIE. Started
    // with subjectType 'email' or 'user' its exposures would be keyed on a hashed
    // email, nothing would ever join, and the results page would show landers
    // accruing against zero buyers in both arms — a failure that looks exactly like
    // "neither version converts" and could run for weeks before anyone doubted it.
    if (VISITOR_KEYED_V1_MAIN_KEYS.includes(key) && exp.subjectType !== 'visitor') {
      return res.status(400).json({
        error: `the '${key}' test is tallied through conversations.ab_visitor_id, so it must have subjectType 'visitor' (currently '${exp.subjectType}')`,
      });
    }
    // persona_prompt_* tests drive the live AI prompt: arms must be authored, and
    // no two may run concurrently for one persona (the resolver would pick one
    // arbitrarily). Resuming THIS test from pause is allowed (key <> self). This
    // pre-check gives a friendly 409; the partial unique index
    // uq_running_persona_prompt_per_persona is the race-proof backstop (a concurrent
    // double-start hits a 23505 on the UPDATE below, mapped to 409 in the catch).
    if (isPersonaPromptKey(key)) {
      const cfgErr = personaPromptConfigError(exp.scope, exp.conversion);
      if (cfgErr) return res.status(400).json({ error: cfgErr });
      const armErr = personaPromptArmsError(variants);
      if (armErr) return res.status(400).json({ error: armErr });
      const personaId = exp.scope?.personaId ?? null;
      if (personaId) {
        const conflict = await db.execute(sql`
          SELECT key FROM experiments
          WHERE left(key, ${PERSONA_PROMPT_KEY_PREFIX.length}) = ${PERSONA_PROMPT_KEY_PREFIX}
            AND scope->>'personaId' = ${personaId}
            AND status = 'running'
            AND key <> ${key}
          LIMIT 1
        `);
        const other = (conflict.rows as Record<string, unknown>[])[0];
        if (other) {
          return res.status(409).json({
            error: `another persona-prompt test is already running for this persona ('${String(other.key)}') — pause it first`,
          });
        }
      }
    }
    // Set the cohort start once; resuming from pause keeps the original start.
    const startedAt = exp.startedAt ?? new Date();
    const updated = await db
      .update(experiments)
      .set({ status: 'running', startedAt, updatedBy: req.adminId, updatedAt: new Date() })
      .where(eq(experiments.key, key))
      .returning();
    invalidateExperiment(key);
    return res.json({ experiment: updated[0] });
  } catch (error: any) {
    // Partial unique index (uq_running_persona_prompt_per_persona) tripped by a
    // concurrent double-start for the same persona — the race-proof version of the
    // pre-check above.
    if (error?.code === '23505') {
      return res.status(409).json({
        error: 'another persona-prompt test is already running for this persona — pause it first',
      });
    }
    logger.error('Start experiment error:', error);
    return res.status(500).json({ error: 'Failed to start experiment' });
  }
});

// POST /api/admin/experiments/:key/pause — running → paused (kill-switch).
router.post('/:key/pause', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    const rows = await db.select().from(experiments).where(eq(experiments.key, key)).limit(1);
    const exp = rows[0];
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });
    if (exp.status !== 'running') {
      return res.status(409).json({ error: `cannot pause an experiment in status '${exp.status}'` });
    }
    const updated = await db
      .update(experiments)
      .set({ status: 'paused', updatedBy: req.adminId, updatedAt: new Date() })
      .where(eq(experiments.key, key))
      .returning();
    invalidateExperiment(key);
    return res.json({ experiment: updated[0] });
  } catch (error: any) {
    logger.error('Pause experiment error:', error);
    return res.status(500).json({ error: 'Failed to pause experiment' });
  }
});

// POST /api/admin/experiments/:key/declare-winner — set winner + status done.
router.post('/:key/declare-winner', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    const parsed = winnerSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed);

    const rows = await db.select().from(experiments).where(eq(experiments.key, key)).limit(1);
    const exp = rows[0];
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });
    // Only a test that has actually run can be concluded; never re-conclude a done
    // test (that would overwrite the original winner + endedAt record).
    if (exp.status === 'draft') {
      return res.status(409).json({ error: 'cannot declare a winner on a draft that never ran — start it first' });
    }
    if (exp.status === 'done') {
      return res.status(409).json({ error: `experiment already concluded (winner: ${exp.winnerVariant})` });
    }
    const variants = Array.isArray(exp.variants) ? exp.variants : [];
    if (!variants.some((v) => v.key === parsed.data.variant)) {
      return res
        .status(400)
        .json({ error: `variant '${parsed.data.variant}' is not one of this experiment's arms` });
    }
    // Pre-registered-N gate (fixed-horizon, no peeking): block concluding until every
    // positive-weight arm has reached the pre-registered per-arm target, measured
    // over the canonical cohort start (same helpers as the results-route progress, so
    // the lock state the dashboard shows always matches this 409). `force:true` is the
    // explicit early-stop override (needed because the conversion config — incl.
    // targetN — is frozen once started; pausing remains the no-override emergency kill).
    const targetN = targetNOf(exp);
    if (targetN) {
      const gateStart = await cohortStartISO(exp);
      const minCount = gateStart ? await minArmExposures(key, gateStart, gateArmKeys(exp.variants)) : 0;
      if (!parsed.data.force) {
        if (minCount < targetN) {
          return res.status(409).json({
            error: `pre-registered N not reached (smallest arm ${minCount}/${targetN}) — keep running (no peeking), pause to stop, or pass force:true to override`,
          });
        }
      } else if (minCount < targetN) {
        // Auditable record that the fixed-horizon gate was deliberately bypassed.
        logger.warn('declare-winner FORCED below pre-registered N', {
          key, winner: parsed.data.variant, minCount, targetN, adminId: req.adminId,
        });
      }
    }
    const updated = await db
      .update(experiments)
      .set({
        winnerVariant: parsed.data.variant,
        status: 'done',
        endedAt: new Date(),
        updatedBy: req.adminId,
        updatedAt: new Date(),
      })
      .where(eq(experiments.key, key))
      .returning();
    invalidateExperiment(key);
    return res.json({ experiment: updated[0] });
  } catch (error: any) {
    logger.error('Declare winner error:', error);
    return res.status(500).json({ error: 'Failed to declare winner' });
  }
});

export default router;
