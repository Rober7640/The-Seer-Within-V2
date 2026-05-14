// Admin Safety Violations Routes
// Provides endpoints for viewing, filtering, reviewing, and exporting safety violations

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { safetyViolations, users, personas } from '@shared/schema';
import { eq, and, desc, sql, gte, lte, count } from 'drizzle-orm';
import { z } from 'zod';
import logger from '../../lib/logger';

const router = Router();

// GET /api/admin/safety/violations - List violations with filtering and pagination
router.get('/violations', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    const violationType = req.query.violationType as string | undefined;
    const flaggedOnly = req.query.flaggedOnly === 'true';
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // Build conditions
    const conditions = [];
    if (violationType) {
      conditions.push(eq(safetyViolations.violationType, violationType));
    }
    if (flaggedOnly) {
      conditions.push(eq(safetyViolations.flaggedForReview, true));
    }
    if (startDate) {
      conditions.push(gte(safetyViolations.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(safetyViolations.createdAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [violations, totalResult] = await Promise.all([
      db
        .select({
          id: safetyViolations.id,
          sessionId: safetyViolations.sessionId,
          userId: safetyViolations.userId,
          personaId: safetyViolations.personaId,
          violationType: safetyViolations.violationType,
          userMessage: safetyViolations.userMessage,
          systemResponse: safetyViolations.systemResponse,
          ipAddress: safetyViolations.ipAddress,
          flaggedForReview: safetyViolations.flaggedForReview,
          reviewedAt: safetyViolations.reviewedAt,
          reviewNotes: safetyViolations.reviewNotes,
          createdAt: safetyViolations.createdAt,
        })
        .from(safetyViolations)
        .where(whereClause)
        .orderBy(desc(safetyViolations.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(safetyViolations)
        .where(whereClause),
    ]);

    return res.json({
      violations,
      total: totalResult[0]?.total ?? 0,
      page,
      pageSize,
    });
  } catch (error: any) {
    logger.error('Admin safety violations error:', error);
    return res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

// GET /api/admin/safety/stats - Violation statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const conditions = [];
    if (startDate) {
      conditions.push(gte(safetyViolations.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(safetyViolations.createdAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get counts by violation type
    const typeCounts = await db
      .select({
        violationType: safetyViolations.violationType,
        count: count(),
      })
      .from(safetyViolations)
      .where(whereClause)
      .groupBy(safetyViolations.violationType);

    // Get total and flagged counts
    const [totalResult, flaggedResult] = await Promise.all([
      db.select({ total: count() }).from(safetyViolations).where(whereClause),
      db.select({ total: count() }).from(safetyViolations).where(
        whereClause
          ? and(whereClause, eq(safetyViolations.flaggedForReview, true))
          : eq(safetyViolations.flaggedForReview, true)
      ),
    ]);

    return res.json({
      total: totalResult[0]?.total ?? 0,
      flaggedForReview: flaggedResult[0]?.total ?? 0,
      byType: Object.fromEntries(typeCounts.map(t => [t.violationType, t.count])),
    });
  } catch (error: any) {
    logger.error('Admin safety stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// PATCH /api/admin/safety/violations/:id/review - Mark a violation as reviewed
const reviewSchema = z.object({
  flaggedForReview: z.boolean().optional(),
  reviewNotes: z.string().optional(),
});

router.patch('/violations/:id/review', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parseResult = reviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const updateData: Record<string, any> = {
      reviewedAt: new Date(),
    };
    if (parseResult.data.flaggedForReview !== undefined) {
      updateData.flaggedForReview = parseResult.data.flaggedForReview;
    }
    if (parseResult.data.reviewNotes !== undefined) {
      updateData.reviewNotes = parseResult.data.reviewNotes;
    }

    const updated = await db
      .update(safetyViolations)
      .set(updateData)
      .where(eq(safetyViolations.id, id) as any)
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Violation not found' });
    }

    return res.json({ violation: updated[0] });
  } catch (error: any) {
    logger.error('Admin safety review error:', error);
    return res.status(500).json({ error: 'Failed to update violation' });
  }
});

// GET /api/admin/safety/export - Export violations as CSV
router.get('/export', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const conditions = [];
    if (startDate) conditions.push(gte(safetyViolations.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(safetyViolations.createdAt, new Date(endDate)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const violations = await db
      .select()
      .from(safetyViolations)
      .where(whereClause)
      .orderBy(desc(safetyViolations.createdAt));

    // Build CSV
    const headers = ['id', 'violationType', 'userMessage', 'systemResponse', 'ipAddress', 'flaggedForReview', 'reviewNotes', 'createdAt'];
    const csvRows = [
      headers.join(','),
      ...violations.map(v =>
        headers.map(h => {
          const val = (v as any)[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=safety_violations.csv');
    return res.send(csvRows.join('\n'));
  } catch (error: any) {
    logger.error('Admin safety export error:', error);
    return res.status(500).json({ error: 'Failed to export violations' });
  }
});

export default router;
