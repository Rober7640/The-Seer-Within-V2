// A/B Testing Routes - Admin + Public
// Admin routes: CRUD for tests, results
// Public routes: variant assignment, conversion tracking

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { abTests, abEvents } from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
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

// Helper: deterministic variant assignment based on visitorId + testId
function assignVariant(
  visitorId: string,
  testId: string,
  variants: Array<{ id: string; label: string; value: string }>,
  trafficSplit: string,
): { variantId: string; value: string } {
  // Parse traffic split into percentages
  const splitParts = trafficSplit.split('/').map((s) => parseInt(s.trim(), 10));

  // If split parts don't match variant count, fall back to equal split
  const effectiveSplit = splitParts.length === variants.length
    ? splitParts
    : variants.map(() => Math.floor(100 / variants.length));

  // Hash visitorId + testId for deterministic assignment
  const hash = crypto
    .createHash('md5')
    .update(visitorId + testId)
    .digest('hex');

  // Convert first 8 hex chars to a number, mod 100 for a 0-99 bucket
  const bucket = parseInt(hash.substring(0, 8), 16) % 100;

  // Walk through cumulative split to find which variant this bucket falls into
  let cumulative = 0;
  for (let i = 0; i < variants.length; i++) {
    cumulative += effectiveSplit[i];
    if (bucket < cumulative) {
      return { variantId: variants[i].id, value: variants[i].value };
    }
  }

  // Fallback to last variant (handles rounding edge cases)
  const last = variants[variants.length - 1];
  return { variantId: last.id, value: last.value };
}

// GET /api/ab/assign — Assign variants for a visitor
publicRouter.get('/assign', async (req: Request, res: Response) => {
  try {
    const page = req.query.page as string;
    if (!page) {
      return res.status(400).json({ error: 'Missing required query param: page' });
    }

    // Read or create visitor ID from cookie
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

    // Find all running tests for this page
    const runningTests = await db
      .select()
      .from(abTests)
      .where(and(eq(abTests.page, page), eq(abTests.status, 'running')));

    const assignments: Record<string, { variantId: string; value: string }> = {};

    for (const test of runningTests) {
      let variantConfigs: Array<{ id: string; label: string; value: string }> = [];
      try {
        variantConfigs = JSON.parse(test.variants);
      } catch {
        continue; // Skip tests with invalid variants JSON
      }

      if (variantConfigs.length === 0) continue;

      const assignment = assignVariant(visitorId, test.id, variantConfigs, test.trafficSplit);
      assignments[test.id] = assignment;

      // Record impression if not already recorded for this visitor+test
      const existing = await db
        .select({ id: abEvents.id })
        .from(abEvents)
        .where(
          and(
            eq(abEvents.testId, test.id),
            eq(abEvents.visitorId, visitorId),
            eq(abEvents.eventType, 'impression'),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(abEvents).values({
          testId: test.id,
          variantId: assignment.variantId,
          visitorId,
          eventType: 'impression',
          page,
        });
      }
    }

    return res.json({ assignments });
  } catch (error) {
    logger.error('AB Testing: Assign error:', error);
    return res.status(500).json({ error: 'Failed to assign variants' });
  }
});

// POST /api/ab/convert — Record conversion
publicRouter.post('/convert', async (req: Request, res: Response) => {
  try {
    const { page, metadata } = req.body;

    if (!page) {
      return res.status(400).json({ error: 'Missing required field: page' });
    }

    // Read visitor ID from cookie or body
    const cookies = parseCookies(req);
    const visitorId = cookies.ab_vid || req.body.visitorId;
    if (!visitorId) {
      return res.status(400).json({ error: 'No visitor ID found' });
    }

    // Find all running tests for this page
    const runningTests = await db
      .select()
      .from(abTests)
      .where(and(eq(abTests.page, page), eq(abTests.status, 'running')));

    for (const test of runningTests) {
      // Find the visitor's assigned variant from their impression event
      const [impression] = await db
        .select({ variantId: abEvents.variantId })
        .from(abEvents)
        .where(
          and(
            eq(abEvents.testId, test.id),
            eq(abEvents.visitorId, visitorId),
            eq(abEvents.eventType, 'impression'),
          ),
        )
        .limit(1);

      if (!impression) continue; // No impression = visitor was never assigned

      // Check if conversion already recorded for this visitor+test
      const [existingConversion] = await db
        .select({ id: abEvents.id })
        .from(abEvents)
        .where(
          and(
            eq(abEvents.testId, test.id),
            eq(abEvents.visitorId, visitorId),
            eq(abEvents.eventType, 'conversion'),
          ),
        )
        .limit(1);

      if (existingConversion) continue; // Already converted

      // Record conversion
      await db.insert(abEvents).values({
        testId: test.id,
        variantId: impression.variantId,
        visitorId,
        eventType: 'conversion',
        page,
        metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('AB Testing: Convert error:', error);
    return res.status(500).json({ error: 'Failed to record conversion' });
  }
});

export default router;
