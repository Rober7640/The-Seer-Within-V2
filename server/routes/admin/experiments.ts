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
import { tally, twoSidedP, invalidateExperiment } from '../../lib/experiments';

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
  .object({ personaId: z.string().nullable().optional(), route: z.string().optional() })
  .passthrough()
  .nullable()
  .optional();

const conversionSchema = z
  .object({
    type: z.enum(['credit_purchase', 'event']),
    windowDays: z.number().int().positive().max(365).optional(),
    name: z.string().optional(),
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

const winnerSchema = z.object({ variant: z.string().min(1) });

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
    if (conversionType !== 'credit_purchase') {
      // Event-type conversions land in a later phase; don't silently mis-score.
      return res.json({
        experiment: meta,
        started: true,
        unsupported: `conversion type '${conversionType}' is not measurable yet (Phase 1 supports credit_purchase only)`,
        params,
        rows: [],
      });
    }

    const result = await tally(key, {
      startISO,
      windowDays,
      personaId,
      controlKey: exp.variants?.[0]?.key,
      treatmentKey: exp.variants?.[1]?.key,
    });
    const srm = augmentSrm(result.srm, exp.variants);
    return res.json({
      experiment: meta,
      started: true,
      params,
      rows: result.rows,
      srm,
      significance: result.significance,
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
