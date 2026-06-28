// A/B Testing Routes - Admin + Public
// Admin routes: CRUD for tests, results
// Public routes: variant assignment, conversion tracking

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import {
  abTests,
  abEvents,
  experiments,
  experimentExposures,
  experimentConversions,
} from '@shared/schema';
import { eq, and, or, sql, desc, isNotNull } from 'drizzle-orm';
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

const router = Router();

// ============================================
// ADMIN ROUTES (protected by admin middleware in index.ts)
// ============================================

// GET / — List all tests
router.get('/', async (_req: Request, res: Response) => {
  try {
    const tests = await db
      .select()
      .from(abTests)
      .orderBy(desc(abTests.createdAt));

    return res.json({ tests });
  } catch (error) {
    logger.error('AB Testing: List tests error:', error);
    return res.status(500).json({ error: 'Failed to list tests' });
  }
});

// POST / — Create test
router.post('/', async (req: Request, res: Response) => {
  try {
    const { page, element, name, variants, trafficSplit, status } = req.body;

    if (!page || !element || !name || !variants) {
      return res.status(400).json({ error: 'Missing required fields: page, element, name, variants' });
    }

    const [newTest] = await db
      .insert(abTests)
      .values({
        page,
        element,
        name,
        variants: typeof variants === 'string' ? variants : JSON.stringify(variants),
        trafficSplit: trafficSplit || '50/50',
        status: status || 'draft',
      })
      .returning();

    return res.json({ test: newTest });
  } catch (error) {
    logger.error('AB Testing: Create test error:', error);
    return res.status(500).json({ error: 'Failed to create test' });
  }
});

// PUT /:id — Update test
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, variants, trafficSplit, status, winnerVariantId } = req.body;

    const updateData: Partial<typeof abTests.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (variants !== undefined) updateData.variants = typeof variants === 'string' ? variants : JSON.stringify(variants);
    if (trafficSplit !== undefined) updateData.trafficSplit = trafficSplit;
    if (status !== undefined) updateData.status = status;
    if (winnerVariantId !== undefined) updateData.winnerVariantId = winnerVariantId;

    const [updated] = await db
      .update(abTests)
      .set(updateData)
      .where(eq(abTests.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Test not found' });
    }

    return res.json({ test: updated });
  } catch (error) {
    logger.error('AB Testing: Update test error:', error);
    return res.status(500).json({ error: 'Failed to update test' });
  }
});

// DELETE /:id — Delete test
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(abTests)
      .where(eq(abTests.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Test not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('AB Testing: Delete test error:', error);
    return res.status(500).json({ error: 'Failed to delete test' });
  }
});

// GET /:id/results — Get test results
router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Fetch the test
    const [test] = await db
      .select()
      .from(abTests)
      .where(eq(abTests.id, id))
      .limit(1);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Parse variants for labels
    let variantConfigs: Array<{ id: string; label: string; value: string }> = [];
    try {
      variantConfigs = JSON.parse(test.variants);
    } catch {
      variantConfigs = [];
    }

    const labelMap = new Map(variantConfigs.map((v) => [v.id, v.label]));

    // Query aggregated events
    const eventCounts = await db
      .select({
        variantId: abEvents.variantId,
        eventType: abEvents.eventType,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(abEvents)
      .where(eq(abEvents.testId, id))
      .groupBy(abEvents.variantId, abEvents.eventType);

    // Build results per variant
    const resultMap = new Map<string, { impressions: number; conversions: number }>();
    for (const row of eventCounts) {
      if (!resultMap.has(row.variantId)) {
        resultMap.set(row.variantId, { impressions: 0, conversions: 0 });
      }
      const entry = resultMap.get(row.variantId)!;
      if (row.eventType === 'impression') {
        entry.impressions = row.count;
      } else if (row.eventType === 'conversion') {
        entry.conversions = row.count;
      }
    }

    // Ensure all configured variants appear even with zero data
    for (const vc of variantConfigs) {
      if (!resultMap.has(vc.id)) {
        resultMap.set(vc.id, { impressions: 0, conversions: 0 });
      }
    }

    const results = Array.from(resultMap.entries()).map(([variantId, data]) => ({
      variantId,
      label: labelMap.get(variantId) || variantId,
      impressions: data.impressions,
      conversions: data.conversions,
      conversionRate: data.impressions > 0
        ? +((data.conversions / data.impressions) * 100).toFixed(2)
        : 0,
    }));

    return res.json({ test, results });
  } catch (error) {
    logger.error('AB Testing: Get results error:', error);
    return res.status(500).json({ error: 'Failed to get test results' });
  }
});

// ============================================
// PUBLIC ROUTES (no admin auth)
// ============================================

export const publicRouter = Router();

// Page-copy A/B for anonymous visitors, now on the UNIFIED framework (Phase 4a).
// A visitor is identified by the `ab_vid` cookie (subjectType='visitor'). A
// page-copy experiment is visitor-scoped with scope={ route:<page>, element:<el> }
// and variant payloads={ value:<copy> }. Assignment + sticky bucketing + exposure
// logging come from the framework; conversions write experiment_conversions (the
// 'event' metric). Gated OFF ⇒ no running visitor test ⇒ the lander shows its
// default copy. (The legacy ab_tests/ab_events path is retired in Phase 5.)

// Visitor page-copy experiments that should drive copy for a page: those running,
// OR concluded with a declared winner (so the winning copy keeps rolling out via
// assign()'s winner path). scope.route must match the page.
async function runningVisitorTests(page: string) {
  return db
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

export default router;
