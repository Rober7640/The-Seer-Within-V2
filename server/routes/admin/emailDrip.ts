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
    const [totalNewV1, email1Sent, email2Sent, email3Sent] = await Promise.all([
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(base),
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(base, eq(migrationDripEmails.sequenceNumber, 1), eq(migrationDripEmails.status, 'sent'))),
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(base, eq(migrationDripEmails.sequenceNumber, 2), eq(migrationDripEmails.status, 'sent'))),
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(base, eq(migrationDripEmails.sequenceNumber, 3), eq(migrationDripEmails.status, 'sent'))),
    ]);

    return res.json({
      totalNewV1: totalNewV1[0]?.c ?? 0,
      email1Sent: email1Sent[0]?.c ?? 0,
      email2Sent: email2Sent[0]?.c ?? 0,
      email3Sent: email3Sent[0]?.c ?? 0,
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
