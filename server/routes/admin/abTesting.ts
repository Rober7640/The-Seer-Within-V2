// Public A/B routes — visitor page-copy / structural assignment + conversion.
// The legacy admin CRUD (ab_tests / ab_events) was retired in Phase 5; all A/B
// tests now run on the unified `experiments` framework. This file holds ONLY the
// public router mounted at /api/ab.

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import {
  experiments,
  experimentExposures,
  experimentConversions,
} from '@shared/schema';
import { eq, and, or, sql, isNotNull, inArray } from 'drizzle-orm';
import { assign, logExposure } from '../../lib/experiments';
import logger from '../../lib/logger';
import crypto from 'crypto';

// Helper to parse cookies from raw Cookie header (no cookie-parser dependency)
function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((pair) => {
    const [key, ...rest] = pair.split('=');
    if (key) {
      cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
    }
  });
  return cookies;
}

// ============================================
// PUBLIC ROUTES (no admin auth)
// ============================================

export const publicRouter = Router();

// Page-copy / structural A/B for anonymous visitors, on the UNIFIED framework
// (Phase 4a/4c). A visitor is identified by the `ab_vid` cookie
// (subjectType='visitor'). A visitor experiment is scoped with
// scope={ route:<page>, element:<el> }; variant payloads carry { value:<copy> }
// for copy tests (the variant KEY drives structural branches). Assignment + sticky
// bucketing + exposure logging come from the framework; conversions write
// experiment_conversions (the 'event' metric). Gated OFF ⇒ no running visitor test
// ⇒ the lander shows its default.

// Visitor experiments that should drive a page: those running, OR concluded with a
// declared winner (so the winning variant keeps rolling out via assign()'s winner
// path). scope.route must match the page.
async function runningVisitorTests(page: string) {
  const rows = await db
    .select()
    .from(experiments)
    .where(
      and(
        eq(experiments.subjectType, 'visitor'),
        sql`${experiments.scope}->>'route' = ${page}`,
        or(
          eq(experiments.status, 'running'),
          and(eq(experiments.status, 'done'), isNotNull(experiments.winnerVariant)),
        ),
      ),
    );

  // DEV/QA isolation: also surface DRAFT visitor tests on this page that are
  // force-run for THIS service via EXPERIMENT_FORCE_RUNNING, so their real
  // assignment path (assign() force-enrols a listed draft key — see
  // shouldForceRunning()) can be verified WITHOUT flipping the shared-DB status to
  // 'running' (which would enrol prod too). Prod never sets the env var ⇒ this
  // block is a no-op there (the query only runs when the var is non-empty, and it
  // only ever ADDS draft rows whose key was explicitly listed). Mirrors the
  // status-gate exception already honoured inside assign().
  const forced = (process.env.EXPERIMENT_FORCE_RUNNING || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (forced.length > 0) {
    const already = new Set(rows.map((r) => r.key));
    const draftForced = await db
      .select()
      .from(experiments)
      .where(
        and(
          eq(experiments.subjectType, 'visitor'),
          sql`${experiments.scope}->>'route' = ${page}`,
          eq(experiments.status, 'draft'),
          inArray(experiments.key, forced),
        ),
      );
    for (const r of draftForced) {
      if (!already.has(r.key)) rows.push(r);
    }
  }
  return rows;
}

// GET /api/ab/assign?page= — sticky variant copy for this visitor on the page.
publicRouter.get('/assign', async (req: Request, res: Response) => {
  try {
    const page = req.query.page as string;
    if (!page) {
      return res.status(400).json({ error: 'Missing required query param: page' });
    }

    const cookies = parseCookies(req);
    let visitorId = cookies.ab_vid;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      res.cookie('ab_vid', visitorId, {
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        path: '/',
        sameSite: 'lax',
      });
    }

    const assignments: Record<string, { variantId: string; value: string | null }> = {};
    for (const test of await runningVisitorTests(page)) {
      const element = (test.scope as { element?: string } | null)?.element;
      if (!element) continue;
      const a = await assign(test.key, visitorId);
      if (!a) continue;
      const raw = (a.payload as { value?: unknown })?.value;
      assignments[element] = { variantId: a.variant, value: raw == null ? null : String(raw) };
      if (a.enrolled) {
        await logExposure(test.key, visitorId, a.variant, 'lander', { route: page, element });
      }
    }

    return res.json({ assignments });
  } catch (error) {
    logger.error('AB assign error:', error);
    return res.status(500).json({ error: 'Failed to assign variants' });
  }
});

// POST /api/ab/convert { page, value? } — log a conversion for the visitor's
// assigned page-copy tests on this page (idempotent per experiment + visitor).
publicRouter.post('/convert', async (req: Request, res: Response) => {
  try {
    const { page } = req.body;
    if (!page) {
      return res.status(400).json({ error: 'Missing required field: page' });
    }
    // Conversions are count-only (value stays 0) — never trust a client-supplied
    // revenue amount on a public, unauthenticated endpoint. Revenue-bearing events
    // would set `value` server-side from a trusted source.

    const cookies = parseCookies(req);
    const visitorId = cookies.ab_vid || req.body.visitorId;
    if (!visitorId) {
      return res.status(400).json({ error: 'No visitor ID found' });
    }

    for (const test of await runningVisitorTests(page)) {
      // Must have been assigned (has an exposure) to count as a conversion.
      const [exposure] = await db
        .select({ variant: experimentExposures.variant })
        .from(experimentExposures)
        .where(
          and(
            eq(experimentExposures.experimentKey, test.key),
            eq(experimentExposures.subjectId, visitorId),
          ),
        )
        .limit(1);
      if (!exposure) continue;

      // One conversion per visitor per test.
      const [existing] = await db
        .select({ id: experimentConversions.id })
        .from(experimentConversions)
        .where(
          and(
            eq(experimentConversions.experimentKey, test.key),
            eq(experimentConversions.subjectId, visitorId),
          ),
        )
        .limit(1);
      if (existing) continue;

      await db.insert(experimentConversions).values({
        experimentKey: test.key,
        subjectId: visitorId,
        variant: exposure.variant,
        event: page,
        // value defaults to 0 (count-only conversion).
      });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('AB convert error:', error);
    return res.status(500).json({ error: 'Failed to record conversion' });
  }
});
