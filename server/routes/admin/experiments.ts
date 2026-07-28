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
  twoSidedP,
  minArmExposures,
  invalidateExperiment,
  U1_PRICE_EXPERIMENT_KEY,
  V1_MAIN_EXPERIMENT_KEY,
  PALM_GATE_EXPERIMENT_KEY,
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
    funnel: z.string().optional(), // typed so a non-string funnel can't silently start an inert test
    sign: z.string().optional(),   // same reason: a non-string sign would scope the test to nothing
    route: z.string().optional(),
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
const V1_MAIN_FUNNEL_KEYS: readonly string[] = [V1_MAIN_EXPERIMENT_KEY, PALM_GATE_EXPERIMENT_KEY];

// Only the PRICE test's arms carry a price payload. The commitment gate is a
// UI-only test measured by the same funnel outcome, so its arms carry no cents —
// requiring them would force a fake price onto a test that never applies one.
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

// Augment tally()'s observed split with an SRM (sample-ratio mismatch) check
// against the configured A/B weights — a chi-square (df=1) test of observed vs
// expected counts. `ok:false` ⇒ assignment is skewed and the results are suspect.
function augmentSrm(
  srm: { aViewers: number; bViewers: number; bSharePct: number } | undefined,
  variants: Array<{ key: string; weight: number }> | null | undefined,
) {
  if (!srm) return undefined;
  // Control/treatment = the first two arms (matches tally()'s controlKey/treatmentKey).
  const wA = variants?.[0]?.weight ?? 0;
  const wB = variants?.[1]?.weight ?? 0;
  if (wA <= 0 || wB <= 0) return srm; // no configured weights to compare against
  const n = srm.aViewers + srm.bViewers;
  const expectedBSharePct = (wB / (wA + wB)) * 100;
  if (n === 0) return { ...srm, expectedBSharePct, chiSquareP: 1, ok: true };
  const expA = (n * wA) / (wA + wB);
  const expB = (n * wB) / (wA + wB);
  const chi2 = (srm.aViewers - expA) ** 2 / expA + (srm.bViewers - expB) ** 2 / expB;
  // χ²₁ = Z², so its upper-tail p equals the two-sided normal p at sqrt(chi2).
  const chiSquareP = twoSidedP(Math.sqrt(chi2));
  return { ...srm, expectedBSharePct, chiSquareP, ok: chiSquareP >= 0.001 };
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
      result = await tallyV1Main({ key, startISO, controlKey, treatmentKey });
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
    const srm = augmentSrm(result.srm, exp.variants);

    // Pre-registered-N gating (fixed-horizon, no peeking): progress toward the
    // pre-registered per-arm exposure target, measured over the CANONICAL cohort
    // start (not the ?start tally override) and the positive-weight arms — so this
    // display always matches the server-side declare-winner gate. `reached` once
    // every such arm has ≥ targetN exposures (the smallest governs).
    const targetN = targetNOf(exp);
    let progress: { targetN: number; minExposures: number; reached: boolean } | undefined;
    if (targetN) {
      const gateStart = await cohortStartISO(exp);
      const minCount = gateStart ? await minArmExposures(key, gateStart, gateArmKeys(exp.variants)) : 0;
      progress = { targetN, minExposures: minCount, reached: minCount >= targetN };
    }

    return res.json({
      experiment: meta,
      started: true,
      params,
      rows: result.rows,
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
    // assignment-affecting fields — variants (keys/weights/order/payload), scope,
    // subjectType — and its measurement definition (conversion) are FROZEN. Any of
    // them would re-bucket or re-partition already-enrolled subjects, or retro-
    // change the metric, corrupting a fixed-horizon test (set the split once, hold;
    // §6 locked stats model). Only name/description stay editable. To change these,
    // create a new experiment (a new key). Drafts are fully editable.
    if (exp.status !== 'draft') {
      const changed: string[] = [];
      const norm = (vs: Array<{ key: string; weight: number; payload?: unknown }> | null | undefined) =>
        JSON.stringify((vs ?? []).map((v) => ({ key: v.key, weight: v.weight, payload: v.payload ?? {} })));
      if (data.variants !== undefined && norm(data.variants) !== norm(exp.variants)) changed.push('variants');
      if (data.subjectType !== undefined && data.subjectType !== exp.subjectType) changed.push('subjectType');
      if (data.scope !== undefined && JSON.stringify(data.scope ?? null) !== JSON.stringify(exp.scope ?? null))
        changed.push('scope');
      if (
        data.conversion !== undefined &&
        JSON.stringify(data.conversion ?? null) !== JSON.stringify(exp.conversion ?? null)
      )
        changed.push('conversion');
      if (changed.length) {
        return res.status(409).json({
          error: `cannot change ${changed.join(', ')} once a test has started — only name/description are editable. Create a new experiment to change these.`,
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
    // Both v1_main_funnel keys drive live V1 funnel behaviour for whatever traffic
    // they enrol — the price key OVERRIDES the main price (resolveV1Price), the palm
    // gate REPLACES the purchase button (resolvePalmGate). Require scope.funnel so
    // each only touches ONE funnel; without it the price override would clobber every
    // live system_config split at once, and the gate would hit every V1 lander rather
    // than fb-palm. Keyed on the KEY (not conversion.type) so it can't be bypassed by
    // editing the draft's conversion type away from v1_main_funnel before /start.
    if (V1_MAIN_FUNNEL_KEYS.includes(key) && !exp.scope?.funnel) {
      return res.status(400).json({
        error: `the '${key}' test must set scope.funnel before starting (it applies to that one funnel only)`,
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
