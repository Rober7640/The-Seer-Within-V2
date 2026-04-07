// Admin Email Drip Routes
// Migrated V1 = bulk-imported users (conversation created before 2026-03-18)
// New V1 = real-time funnel users (conversation created on/after 2026-03-18)

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { migrationDripEmails, users, conversations } from '@shared/schema';
import { eq, and, desc, count, sql, lt, gte } from 'drizzle-orm';
import logger from '../../lib/logger';
import {
  sendMigrationEmail1,
  getMigrationDripStats,
  getBatchConfig,
  startBatchCampaign,
  pauseBatchCampaign,
  resumeBatchCampaign,
  updateBatchSize,
} from '../../lib/migrationDripProcessor';

const router = Router();

// V1 conversations were imported with their original dates (Jan 29 - Mar 17, 2026).
// New funnel conversations are created on/after Mar 18 when the funnel runs on V2.
const MIGRATION_DATE = '2026-03-18';

// Shared select fields for email list queries
const emailSelectFields = {
  id: migrationDripEmails.id,
  userId: migrationDripEmails.userId,
  recipientEmail: migrationDripEmails.recipientEmail,
  firstName: users.firstName,
  sequenceNumber: migrationDripEmails.sequenceNumber,
  subject: migrationDripEmails.subject,
  status: migrationDripEmails.status,
  sentAt: migrationDripEmails.sentAt,
  openedAt: migrationDripEmails.openedAt,
  clickedAt: migrationDripEmails.clickedAt,
  resendEmailId: migrationDripEmails.resendEmailId,
  createdAt: migrationDripEmails.createdAt,
};

// Helper: build WHERE for migrated vs new, using the linked conversation's date
function migratedCondition() {
  return sql`${users.migratedFromConversationId} IN (SELECT id FROM conversations WHERE created_at < ${MIGRATION_DATE})`;
}

function newV1Condition() {
  return sql`${users.migratedFromConversationId} IN (SELECT id FROM conversations WHERE created_at >= ${MIGRATION_DATE})`;
}

// GET /api/admin/email-drip/migrated-stats
router.get('/migrated-stats', async (req: Request, res: Response) => {
  try {
    const stats = await getMigrationDripStats();
    return res.json(stats);
  } catch (error: any) {
    logger.error('Admin migrated stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/email-drip/new-v1-stats
router.get('/new-v1-stats', async (req: Request, res: Response) => {
  try {
    const base = newV1Condition();

    // Build per-sequence count queries for all 8 emails
    const emailCountQueries = [];
    for (let seq = 1; seq <= 8; seq++) {
      emailCountQueries.push(
        db.select({ c: count() }).from(migrationDripEmails)
          .innerJoin(users, eq(users.id, migrationDripEmails.userId))
          .where(and(base, eq(migrationDripEmails.sequenceNumber, seq), eq(migrationDripEmails.status, 'sent'))),
      );
    }

    const [totalNewV1, ...emailCounts] = await Promise.all([
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(base),
      ...emailCountQueries,
    ]);

    const [opened, clicked, loggedIn] = await Promise.all([
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(base, sql`${migrationDripEmails.openedAt} IS NOT NULL`)),
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(base, sql`${migrationDripEmails.clickedAt} IS NOT NULL`)),
      db.select({ c: count() }).from(users)
        .where(and(newV1Condition(), sql`${users.lastLoginAt} IS NOT NULL`)),
    ]);

    const emailSent: Record<number, number> = {};
    for (let i = 0; i < 8; i++) {
      emailSent[i + 1] = emailCounts[i]?.[0]?.c ?? 0;
    }

    return res.json({
      totalNewV1: totalNewV1[0]?.c ?? 0,
      emailSent,
      // Legacy fields
      email1Sent: emailSent[1] ?? 0,
      email2Sent: emailSent[2] ?? 0,
      email3Sent: emailSent[3] ?? 0,
      opened: opened[0]?.c ?? 0,
      clicked: clicked[0]?.c ?? 0,
      loggedIn: loggedIn[0]?.c ?? 0,
    });
  } catch (error: any) {
    logger.error('Admin new V1 stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/admin/email-drip/trigger-migration
router.post('/trigger-migration', async (req: Request, res: Response) => {
  try {
    const limit = req.body.limit ? parseInt(req.body.limit) : undefined;
    logger.info('Admin: triggering migration drip Email 1', { adminId: req.adminId, limit });
    const stats = await sendMigrationEmail1(limit);
    return res.json({ success: true, stats });
  } catch (error: any) {
    logger.error('Admin migration trigger error:', error);
    return res.status(500).json({ error: 'Failed to process migration queue' });
  }
});

// GET /api/admin/email-drip/batch-status
router.get('/batch-status', async (req: Request, res: Response) => {
  try {
    const config = await getBatchConfig();
    const stats = await getMigrationDripStats();
    const remaining = stats.totalEligible - stats.email1Sent;
    const totalBatches = config.batchSize > 0 ? Math.ceil((stats.totalEligible) / config.batchSize) : 0;
    return res.json({ ...config, remaining, totalBatches, email1Sent: stats.email1Sent, totalEligible: stats.totalEligible });
  } catch (error: any) {
    logger.error('Admin batch status error:', error);
    return res.status(500).json({ error: 'Failed to fetch batch status' });
  }
});

// POST /api/admin/email-drip/start-campaign
router.post('/start-campaign', async (req: Request, res: Response) => {
  try {
    const batchSize = Math.max(1, parseInt(req.body.batchSize) || 500);
    logger.info('Admin: starting batch campaign', { adminId: req.adminId, batchSize });
    const result = await startBatchCampaign(batchSize);
    return res.json({ success: true, config: result.config, stats: result.stats });
  } catch (error: any) {
    logger.error('Admin start campaign error:', error);
    return res.status(500).json({ error: 'Failed to start campaign' });
  }
});

// POST /api/admin/email-drip/pause-campaign
router.post('/pause-campaign', async (req: Request, res: Response) => {
  try {
    logger.info('Admin: pausing batch campaign', { adminId: req.adminId });
    const config = await pauseBatchCampaign();
    return res.json({ success: true, config });
  } catch (error: any) {
    logger.error('Admin pause campaign error:', error);
    return res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

// POST /api/admin/email-drip/resume-campaign
router.post('/resume-campaign', async (req: Request, res: Response) => {
  try {
    logger.info('Admin: resuming batch campaign', { adminId: req.adminId });
    const config = await resumeBatchCampaign();
    return res.json({ success: true, config });
  } catch (error: any) {
    logger.error('Admin resume campaign error:', error);
    return res.status(500).json({ error: 'Failed to resume campaign' });
  }
});

// PATCH /api/admin/email-drip/batch-size
router.patch('/batch-size', async (req: Request, res: Response) => {
  try {
    const batchSize = Math.max(1, parseInt(req.body.batchSize) || 500);
    logger.info('Admin: updating batch size', { adminId: req.adminId, batchSize });
    const config = await updateBatchSize(batchSize);
    return res.json({ success: true, config });
  } catch (error: any) {
    logger.error('Admin batch size update error:', error);
    return res.status(500).json({ error: 'Failed to update batch size' });
  }
});

// GET /api/admin/email-drip/migrated-emails
router.get('/migrated-emails', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;
    const seqFilter = req.query.sequence ? parseInt(req.query.sequence as string) : undefined;
    const statusFilter = req.query.status as string | undefined;

    const conditions: any[] = [migratedCondition()];
    if (seqFilter) conditions.push(eq(migrationDripEmails.sequenceNumber, seqFilter));
    if (statusFilter) conditions.push(eq(migrationDripEmails.status, statusFilter));

    const [emails, totalResult] = await Promise.all([
      db.select(emailSelectFields)
        .from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(...conditions))
        .orderBy(desc(migrationDripEmails.createdAt))
        .limit(pageSize).offset(offset),
      db.select({ total: count() })
        .from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(...conditions)),
    ]);

    return res.json({ emails, total: totalResult[0]?.total ?? 0, page, pageSize });
  } catch (error: any) {
    logger.error('Admin migrated emails list error:', error);
    return res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// GET /api/admin/email-drip/new-v1-emails
router.get('/new-v1-emails', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;
    const seqFilter = req.query.sequence ? parseInt(req.query.sequence as string) : undefined;
    const statusFilter = req.query.status as string | undefined;

    const conditions: any[] = [newV1Condition()];
    if (seqFilter) conditions.push(eq(migrationDripEmails.sequenceNumber, seqFilter));
    if (statusFilter) conditions.push(eq(migrationDripEmails.status, statusFilter));

    const [emails, totalResult] = await Promise.all([
      db.select(emailSelectFields)
        .from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(...conditions))
        .orderBy(desc(migrationDripEmails.createdAt))
        .limit(pageSize).offset(offset),
      db.select({ total: count() })
        .from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(...conditions)),
    ]);

    return res.json({ emails, total: totalResult[0]?.total ?? 0, page, pageSize });
  } catch (error: any) {
    logger.error('Admin new V1 emails list error:', error);
    return res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// GET /api/admin/email-drip/:id - Get single email with full HTML content (for preview)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const email = await db
      .select()
      .from(migrationDripEmails)
      .where(eq(migrationDripEmails.id, req.params.id))
      .limit(1);

    if (!email[0]) {
      return res.status(404).json({ error: 'Email not found' });
    }

    return res.json({ email: email[0] });
  } catch (error: any) {
    logger.error('Admin email drip get error:', error);
    return res.status(500).json({ error: 'Failed to fetch email' });
  }
});

export default router;
