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
import { db } from '../../lib/db';
import { experiments, experimentExposures } from '@shared/schema';
import { desc, eq, sql } from 'drizzle-orm';
import logger from '../../lib/logger';
import { tally, twoSidedP } from '../../lib/experiments';

const router = Router();

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
  const wA = variants?.find((v) => v.key === 'A')?.weight ?? 0;
  const wB = variants?.find((v) => v.key === 'B')?.weight ?? 0;
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

    const result = await tally(key, { startISO, windowDays, personaId });
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

export default router;
