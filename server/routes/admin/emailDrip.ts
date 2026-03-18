// Admin Email Drip Routes
// Provides endpoints for managing migration drip emails (Migrated V1 and New V1)

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { migrationDripEmails, users, conversations, userMemory } from '@shared/schema';
import { eq, and, desc, count, sql, isNull } from 'drizzle-orm';
import logger from '../../lib/logger';
import {
  sendMigrationEmail1,
  getMigrationDripStats,
} from '../../lib/migrationDripProcessor';

const router = Router();

// Bulk migration happened on 2026-03-18. Users created by the migration script
// have userMemory with source = 'v1_migration'. Users created by the real-time
// funnel trigger have source = 'v1_funnel_realtime'. We use this to distinguish.
// Fallback: if no memory exists, check if user was created before the cutoff.
const BULK_MIGRATION_CUTOFF = new Date('2026-03-18T12:00:00Z');

// Helper: build conditions for migrated vs new V1
function migratedV1Condition() {
  // Migrated V1 = user created on or before migration date
  return sql`${users.createdAt} <= ${BULK_MIGRATION_CUTOFF}`;
}

function newV1Condition() {
  // New V1 = user created after migration date
  return sql`${users.createdAt} > ${BULK_MIGRATION_CUTOFF}`;
}

// GET /api/admin/email-drip/migrated-stats - Stats for migrated V1 users
router.get('/migrated-stats', async (req: Request, res: Response) => {
  try {
    const stats = await getMigrationDripStats();
    return res.json(stats);
  } catch (error: any) {
    logger.error('Admin migrated stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/email-drip/new-v1-stats - Stats for new V1 funnel users
router.get('/new-v1-stats', async (req: Request, res: Response) => {
  try {
    const [totalNewV1, email1Sent, email2Sent, email3Sent] = await Promise.all([
      db.select({ c: count() }).from(users)
        .where(
          and(
            sql`${users.migratedFromConversationId} IS NOT NULL`,
            newV1Condition(),
          ),
        ),
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(
          and(
            eq(migrationDripEmails.sequenceNumber, 1),
            eq(migrationDripEmails.status, 'sent'),
            newV1Condition(),
          ),
        ),
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(
          and(
            eq(migrationDripEmails.sequenceNumber, 2),
            eq(migrationDripEmails.status, 'sent'),
            newV1Condition(),
          ),
        ),
      db.select({ c: count() }).from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(
          and(
            eq(migrationDripEmails.sequenceNumber, 3),
            eq(migrationDripEmails.status, 'sent'),
            newV1Condition(),
          ),
        ),
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

// POST /api/admin/email-drip/trigger-migration - Manually trigger Email 1 for migrated users
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

// GET /api/admin/email-drip/migrated-emails - List migration drip emails for migrated V1
router.get('/migrated-emails', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;
    const seqFilter = req.query.sequence ? parseInt(req.query.sequence as string) : undefined;
    const statusFilter = req.query.status as string | undefined;

    const conditions: any[] = [migratedV1Condition()];
    if (seqFilter) conditions.push(eq(migrationDripEmails.sequenceNumber, seqFilter));
    if (statusFilter) conditions.push(eq(migrationDripEmails.status, statusFilter));

    const [emails, totalResult] = await Promise.all([
      db
        .select({
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
        })
        .from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(...conditions))
        .orderBy(desc(migrationDripEmails.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
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

// GET /api/admin/email-drip/new-v1-emails - List emails for new V1 funnel users
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
      db
        .select({
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
        })
        .from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(and(...conditions))
        .orderBy(desc(migrationDripEmails.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
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

export default router;
