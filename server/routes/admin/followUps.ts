// Admin Follow-Up Emails Routes
// Provides endpoints for viewing email stats, managing follow-ups, and exporting data

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { followUpEmails, userFollowUpPreferences, users, personas } from '@shared/schema';
import { eq, and, desc, gte, lte, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import logger from '../../lib/logger';
import { processFollowUpQueue } from '../../lib/followUpEmailGenerator';
import { processTopupQueue } from '../../lib/topupEmailGenerator';
import { generateMagicLinkToken } from '../../lib/magicLink';
import { sendMigrationEmail1, getMigrationDripStats } from '../../lib/migrationDripProcessor';

const router = Router();

// POST /api/admin/follow-ups/generate-token - Generate a magic link token for testing
router.post('/generate-token', async (req: Request, res: Response) => {
  try {
    const { userId, personaSlug } = req.body;
    if (!userId || !personaSlug) {
      return res.status(400).json({ error: 'userId and personaSlug are required' });
    }

    // Look up the persona by slug to get its ID
    const persona = await db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.slug, personaSlug))
      .limit(1);

    if (!persona[0]) {
      return res.status(404).json({ error: `Persona '${personaSlug}' not found` });
    }

    const token = await generateMagicLinkToken(userId, persona[0].id, personaSlug);
    return res.json({ token });
  } catch (error: any) {
    logger.error('Admin generate-token error:', error);
    return res.status(500).json({ error: 'Failed to generate magic link token' });
  }
});

// POST /api/admin/follow-ups/trigger - Manually trigger the follow-up queue
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    logger.info('Admin: manually triggering follow-up email queue', { adminId: req.adminId });
    const stats = await processFollowUpQueue();
    return res.json({ success: true, stats });
  } catch (error: any) {
    logger.error('Admin follow-ups trigger error:', error);
    return res.status(500).json({ error: 'Failed to process follow-up queue' });
  }
});

// POST /api/admin/follow-ups/trigger-topup - Manually trigger the top-up email queue
router.post('/trigger-topup', async (req: Request, res: Response) => {
  try {
    logger.info('Admin: manually triggering top-up email queue', { adminId: req.adminId });
    const stats = await processTopupQueue();
    return res.json({ success: true, stats });
  } catch (error: any) {
    logger.error('Admin top-up trigger error:', error);
    return res.status(500).json({ error: 'Failed to process top-up queue' });
  }
});

// POST /api/admin/follow-ups/trigger-migration - Manually trigger migration Email 1
router.post('/trigger-migration', async (req: Request, res: Response) => {
  try {
    const limit = req.body.limit ? parseInt(req.body.limit) : undefined;
    logger.info('Admin: manually triggering migration drip Email 1', { adminId: req.adminId, limit });
    const stats = await sendMigrationEmail1(limit);
    return res.json({ success: true, stats });
  } catch (error: any) {
    logger.error('Admin migration trigger error:', error);
    return res.status(500).json({ error: 'Failed to process migration queue' });
  }
});

// GET /api/admin/follow-ups/migration-stats - Migration drip statistics
router.get('/migration-stats', async (req: Request, res: Response) => {
  try {
    const stats = await getMigrationDripStats();
    return res.json(stats);
  } catch (error: any) {
    logger.error('Admin migration stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch migration stats' });
  }
});

// GET /api/admin/follow-ups - List follow-up emails with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    const status = req.query.status as string | undefined;
    const personaId = req.query.personaId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const conditions = [];
    if (status) {
      conditions.push(eq(followUpEmails.status, status));
    }
    if (personaId) {
      conditions.push(eq(followUpEmails.personaId, personaId));
    }
    if (startDate) {
      conditions.push(gte(followUpEmails.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(followUpEmails.createdAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [emails, totalResult] = await Promise.all([
      db
        .select({
          id: followUpEmails.id,
          userId: followUpEmails.userId,
          personaId: followUpEmails.personaId,
          recipientEmail: followUpEmails.recipientEmail,
          subject: followUpEmails.subject,
          status: followUpEmails.status,
          sentAt: followUpEmails.sentAt,
          opened: followUpEmails.opened,
          clicked: followUpEmails.clicked,
          openedAt: followUpEmails.openedAt,
          clickedAt: followUpEmails.clickedAt,
          generatedBy: followUpEmails.generatedBy,
          daysSinceLastSession: followUpEmails.daysSinceLastSession,
          createdAt: followUpEmails.createdAt,
        })
        .from(followUpEmails)
        .where(whereClause)
        .orderBy(desc(followUpEmails.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(followUpEmails)
        .where(whereClause),
    ]);

    return res.json({
      emails,
      total: totalResult[0]?.total ?? 0,
      page,
      pageSize,
    });
  } catch (error: any) {
    logger.error('Admin follow-ups list error:', error);
    return res.status(500).json({ error: 'Failed to fetch follow-up emails' });
  }
});

// GET /api/admin/follow-ups/stats - Follow-up email statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const conditions = [];
    if (startDate) conditions.push(gte(followUpEmails.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(followUpEmails.createdAt, new Date(endDate)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get counts by status
    const statusCounts = await db
      .select({
        status: followUpEmails.status,
        count: count(),
      })
      .from(followUpEmails)
      .where(whereClause)
      .groupBy(followUpEmails.status);

    // Get engagement counts
    const sentCondition = whereClause
      ? and(whereClause, eq(followUpEmails.status, 'sent'))
      : eq(followUpEmails.status, 'sent');

    const [totalResult, openedResult, clickedResult] = await Promise.all([
      db.select({ total: count() }).from(followUpEmails).where(whereClause),
      db.select({ total: count() }).from(followUpEmails).where(
        whereClause
          ? and(whereClause, eq(followUpEmails.opened, true))
          : eq(followUpEmails.opened, true)
      ),
      db.select({ total: count() }).from(followUpEmails).where(
        whereClause
          ? and(whereClause, eq(followUpEmails.clicked, true))
          : eq(followUpEmails.clicked, true)
      ),
    ]);

    const total = totalResult[0]?.total ?? 0;
    const opened = openedResult[0]?.total ?? 0;
    const clicked = clickedResult[0]?.total ?? 0;
    const sentCount = statusCounts.find(s => s.status === 'sent')?.count ?? 0;

    return res.json({
      total,
      byStatus: Object.fromEntries(statusCounts.map(s => [s.status, s.count])),
      engagement: {
        sent: sentCount,
        opened,
        clicked,
        openRate: sentCount > 0 ? ((opened / sentCount) * 100).toFixed(1) : '0.0',
        clickRate: sentCount > 0 ? ((clicked / sentCount) * 100).toFixed(1) : '0.0',
      },
    });
  } catch (error: any) {
    logger.error('Admin follow-ups stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/follow-ups/export - Export as CSV (must be before /:id)
router.get('/export', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const conditions = [];
    if (status) conditions.push(eq(followUpEmails.status, status));
    if (startDate) conditions.push(gte(followUpEmails.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(followUpEmails.createdAt, new Date(endDate)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const emails = await db
      .select({
        id: followUpEmails.id,
        recipientEmail: followUpEmails.recipientEmail,
        subject: followUpEmails.subject,
        status: followUpEmails.status,
        sentAt: followUpEmails.sentAt,
        opened: followUpEmails.opened,
        clicked: followUpEmails.clicked,
        daysSinceLastSession: followUpEmails.daysSinceLastSession,
        createdAt: followUpEmails.createdAt,
      })
      .from(followUpEmails)
      .where(whereClause)
      .orderBy(desc(followUpEmails.createdAt));

    const headers = ['id', 'recipientEmail', 'subject', 'status', 'sentAt', 'opened', 'clicked', 'daysSinceLastSession', 'createdAt'];
    const csvRows = [
      headers.join(','),
      ...emails.map(e =>
        headers.map(h => {
          const val = (e as any)[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=follow_up_emails.csv');
    return res.send(csvRows.join('\n'));
  } catch (error: any) {
    logger.error('Admin follow-ups export error:', error);
    return res.status(500).json({ error: 'Failed to export' });
  }
});

// GET /api/admin/follow-ups/:id - Get single follow-up email with full content
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const email = await db
      .select()
      .from(followUpEmails)
      .where(eq(followUpEmails.id, id) as any)
      .limit(1);

    if (!email[0]) {
      return res.status(404).json({ error: 'Follow-up email not found' });
    }

    return res.json({ email: email[0] });
  } catch (error: any) {
    logger.error('Admin follow-up get error:', error);
    return res.status(500).json({ error: 'Failed to fetch follow-up email' });
  }
});

// GET /api/admin/follow-ups/preferences - List user preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const prefs = await db
      .select({
        id: userFollowUpPreferences.id,
        userId: userFollowUpPreferences.userId,
        enableFollowUps: userFollowUpPreferences.enableFollowUps,
        followUpDays: userFollowUpPreferences.followUpDays,
        maxFollowUpsPerMonth: userFollowUpPreferences.maxFollowUpsPerMonth,
        followUpsSentThisMonth: userFollowUpPreferences.followUpsSentThisMonth,
        lastFollowUpSentAt: userFollowUpPreferences.lastFollowUpSentAt,
        unsubscribedAt: userFollowUpPreferences.unsubscribedAt,
      })
      .from(userFollowUpPreferences)
      .orderBy(desc(userFollowUpPreferences.lastFollowUpSentAt));

    return res.json({ preferences: prefs });
  } catch (error: any) {
    logger.error('Admin follow-up preferences error:', error);
    return res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

export default router;
