// Admin Email Drip Routes
// Provides endpoints for managing migration drip emails (Migrated V1 and New V1)

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { migrationDripEmails, users } from '@shared/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import logger from '../../lib/logger';
import {
  sendMigrationEmail1,
  getMigrationDripStats,
} from '../../lib/migrationDripProcessor';

const router = Router();

// Migrated V1 = all drip emails (bulk migration + manual test sends)
// New V1 = drip emails for users created via the real-time DEEPENING_2 funnel trigger
// We distinguish using the conversation's created_at: V1 conversations imported during
// migration have dates from Jan-Mar 2026, while new funnel conversations are created
// after the migration. Simpler: check if the drip email's created_at is within seconds
// of the user's created_at (real-time trigger creates user + sends email together).
//
// Simplest reliable approach: Migrated V1 page shows ALL drip emails.
// New V1 page filters to users whose account was created AFTER the real-time
// funnel trigger was deployed (users not in the bulk migration batch).

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
    // Count all drip emails (same data as migrated, separate view for new funnel traffic)
    const [totalDrip, email1Sent, email2Sent, email3Sent] = await Promise.all([
      db.select({ c: count() }).from(migrationDripEmails),
      db.select({ c: count() }).from(migrationDripEmails).where(
        and(eq(migrationDripEmails.sequenceNumber, 1), eq(migrationDripEmails.status, 'sent')),
      ),
      db.select({ c: count() }).from(migrationDripEmails).where(
        and(eq(migrationDripEmails.sequenceNumber, 2), eq(migrationDripEmails.status, 'sent')),
      ),
      db.select({ c: count() }).from(migrationDripEmails).where(
        and(eq(migrationDripEmails.sequenceNumber, 3), eq(migrationDripEmails.status, 'sent')),
      ),
    ]);

    return res.json({
      totalNewV1: totalDrip[0]?.c ?? 0,
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

    const conditions: any[] = [];
    if (seqFilter) conditions.push(eq(migrationDripEmails.sequenceNumber, seqFilter));
    if (statusFilter) conditions.push(eq(migrationDripEmails.status, statusFilter));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
        .where(whereClause)
        .orderBy(desc(migrationDripEmails.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(whereClause),
    ]);

    return res.json({ emails, total: totalResult[0]?.total ?? 0, page, pageSize });
  } catch (error: any) {
    logger.error('Admin migrated emails list error:', error);
    return res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// GET /api/admin/email-drip/new-v1-emails - List emails for new V1 funnel users
// (Same data but provides a separate view for monitoring new funnel traffic)
router.get('/new-v1-emails', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;
    const seqFilter = req.query.sequence ? parseInt(req.query.sequence as string) : undefined;
    const statusFilter = req.query.status as string | undefined;

    const conditions: any[] = [];
    if (seqFilter) conditions.push(eq(migrationDripEmails.sequenceNumber, seqFilter));
    if (statusFilter) conditions.push(eq(migrationDripEmails.status, statusFilter));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
        .where(whereClause)
        .orderBy(desc(migrationDripEmails.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(migrationDripEmails)
        .innerJoin(users, eq(users.id, migrationDripEmails.userId))
        .where(whereClause),
    ]);

    return res.json({ emails, total: totalResult[0]?.total ?? 0, page, pageSize });
  } catch (error: any) {
    logger.error('Admin new V1 emails list error:', error);
    return res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

export default router;
