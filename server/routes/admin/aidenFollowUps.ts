// Admin routes for Aiden follow-up emails (/aiden unverified signups).
// Separate from existing /admin/follow-ups to avoid mixing with the persona-aware follow-up system.

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { aidenFollowupEmails, users } from '@shared/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import logger from '../../lib/logger';
import { processAidenFollowupQueue } from '../../lib/aidenFollowupEmailGenerator';

const router = Router();

// ============================================
// GET /api/admin/aiden-follow-ups/stats
// ============================================
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        status: aidenFollowupEmails.status,
        sequenceNumber: aidenFollowupEmails.sequenceNumber,
        total: count(),
      })
      .from(aidenFollowupEmails)
      .groupBy(aidenFollowupEmails.status, aidenFollowupEmails.sequenceNumber);

    const opened = await db
      .select({ total: count() })
      .from(aidenFollowupEmails)
      .where(sql`${aidenFollowupEmails.openedAt} IS NOT NULL`);

    const clicked = await db
      .select({ total: count() })
      .from(aidenFollowupEmails)
      .where(sql`${aidenFollowupEmails.clickedAt} IS NOT NULL`);

    const flagEnabled = process.env.ENABLE_AIDEN_FOLLOWUPS === 'true';

    return res.json({
      flagEnabled,
      breakdown: rows,
      openedTotal: opened[0]?.total ?? 0,
      clickedTotal: clicked[0]?.total ?? 0,
    });
  } catch (error: any) {
    logger.error('Admin aiden-follow-ups stats error:', error);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ============================================
// GET /api/admin/aiden-follow-ups
// Paginated list with user info
// ============================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 25));
    const offset = (page - 1) * pageSize;

    const statusFilter = req.query.status as string | undefined;
    const seqFilter = req.query.sequence as string | undefined;

    const conditions = [];
    if (statusFilter && ['pending', 'sent', 'failed', 'skipped'].includes(statusFilter)) {
      conditions.push(eq(aidenFollowupEmails.status, statusFilter));
    }
    if (seqFilter && ['1', '2', '3'].includes(seqFilter)) {
      conditions.push(eq(aidenFollowupEmails.sequenceNumber, parseInt(seqFilter)));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rowsQuery = db
      .select({
        id: aidenFollowupEmails.id,
        userId: aidenFollowupEmails.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        emailVerified: users.emailVerified,
        sequenceNumber: aidenFollowupEmails.sequenceNumber,
        scheduledFor: aidenFollowupEmails.scheduledFor,
        status: aidenFollowupEmails.status,
        sentAt: aidenFollowupEmails.sentAt,
        openedAt: aidenFollowupEmails.openedAt,
        clickedAt: aidenFollowupEmails.clickedAt,
        errorMessage: aidenFollowupEmails.errorMessage,
        subject: aidenFollowupEmails.subject,
        createdAt: aidenFollowupEmails.createdAt,
      })
      .from(aidenFollowupEmails)
      .leftJoin(users, eq(aidenFollowupEmails.userId, users.id));

    const rows = whereClause
      ? await rowsQuery.where(whereClause).orderBy(desc(aidenFollowupEmails.scheduledFor)).limit(pageSize).offset(offset)
      : await rowsQuery.orderBy(desc(aidenFollowupEmails.scheduledFor)).limit(pageSize).offset(offset);

    const totalCountQuery = db.select({ total: count() }).from(aidenFollowupEmails);
    const totalCountRow = whereClause
      ? await totalCountQuery.where(whereClause)
      : await totalCountQuery;

    const total = totalCountRow[0]?.total ?? 0;

    return res.json({
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    logger.error('Admin aiden-follow-ups list error:', error);
    return res.status(500).json({ error: 'Failed to load follow-ups' });
  }
});

// ============================================
// POST /api/admin/aiden-follow-ups/trigger
// Manually process the queue. Respects ENABLE_AIDEN_FOLLOWUPS flag.
// ============================================
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    logger.info('Admin: manually triggering Aiden follow-up queue', { adminId: req.adminId });
    const stats = await processAidenFollowupQueue();
    return res.json({
      success: true,
      stats,
      note: stats.flagEnabled
        ? 'Queue processed. Check stats for send counts.'
        : 'ENABLE_AIDEN_FOLLOWUPS flag is OFF — no emails were sent. Set env var to "true" on Railway to enable.',
    });
  } catch (error: any) {
    logger.error('Admin aiden-follow-ups trigger error:', error);
    return res.status(500).json({ error: 'Failed to process Aiden follow-up queue' });
  }
});

// ============================================
// GET /api/admin/aiden-follow-ups/preview/:id
// Return the stored HTML for eye-icon preview.
// ============================================
router.get('/preview/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await db
      .select({
        subject: aidenFollowupEmails.subject,
        bodyHtml: aidenFollowupEmails.bodyHtml,
        bodyText: aidenFollowupEmails.bodyText,
        recipientEmail: aidenFollowupEmails.recipientEmail,
        sequenceNumber: aidenFollowupEmails.sequenceNumber,
      })
      .from(aidenFollowupEmails)
      .where(eq(aidenFollowupEmails.id, id))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(rows[0]);
  } catch (error: any) {
    logger.error('Admin aiden-follow-ups preview error:', error);
    return res.status(500).json({ error: 'Failed to load preview' });
  }
});

export default router;
