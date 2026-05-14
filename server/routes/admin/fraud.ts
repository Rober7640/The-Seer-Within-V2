// Admin Fraud Detection Dashboard Routes
// View flagged accounts, inspect IP clusters, clear/add flags

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getFlaggedUsers,
  getUsersByIp,
  clearFraudFlags,
  addFraudFlag,
  type FraudFlag,
} from '../../lib/fraudDetection';
import { db } from '../../lib/db';
import { users } from '@shared/schema';
import { eq, sql, count } from 'drizzle-orm';
import logger from '../../lib/logger';

const router = Router();

// ============================================
// GET /api/admin/fraud/flagged - List all flagged accounts
// ============================================

router.get('/flagged', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const result = await getFlaggedUsers(page, limit);
    return res.json(result);
  } catch (error: any) {
    logger.error('Get flagged users error:', error);
    return res.status(500).json({ error: 'Failed to get flagged users' });
  }
});

// ============================================
// GET /api/admin/fraud/ip/:ip - Get all accounts from an IP
// ============================================

router.get('/ip/:ip', async (req: Request, res: Response) => {
  try {
    const ip = req.params.ip as string;
    const accounts = await getUsersByIp(ip);

    return res.json({
      ip,
      accountCount: accounts.length,
      accounts,
    });
  } catch (error: any) {
    logger.error('Get users by IP error:', error);
    return res.status(500).json({ error: 'Failed to get users by IP' });
  }
});

// ============================================
// GET /api/admin/fraud/stats - Fraud overview statistics
// ============================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Total flagged accounts
    const flaggedResult = await db
      .select({ count: count() })
      .from(users)
      .where(
        sql`${users.accountFlags} IS NOT NULL AND ${users.accountFlags} != '[]'`,
      );

    // IPs with 3+ registrations (suspicious clusters)
    const ipClustersResult = await db
      .select({
        ip: users.registrationIp,
        accountCount: count(),
      })
      .from(users)
      .where(sql`${users.registrationIp} IS NOT NULL`)
      .groupBy(users.registrationIp)
      .having(sql`COUNT(*) >= 3`)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(20);

    return res.json({
      totalFlagged: flaggedResult[0]?.count || 0,
      suspiciousIpClusters: ipClustersResult.map(r => ({
        ip: r.ip,
        accountCount: Number(r.accountCount),
      })),
    });
  } catch (error: any) {
    logger.error('Get fraud stats error:', error);
    return res.status(500).json({ error: 'Failed to get fraud stats' });
  }
});

// ============================================
// POST /api/admin/fraud/:userId/clear - Clear fraud flags
// ============================================

router.post('/:userId/clear', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    // Verify user exists
    const user = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await clearFraudFlags(userId);

    logger.info(`Admin ${req.adminEmail} cleared fraud flags for user ${user[0].email}`);

    return res.json({ success: true, userId, message: 'Fraud flags cleared' });
  } catch (error: any) {
    logger.error('Clear fraud flags error:', error);
    return res.status(500).json({ error: 'Failed to clear fraud flags' });
  }
});

// ============================================
// POST /api/admin/fraud/:userId/flag - Add a fraud flag
// ============================================

const addFlagSchema = z.object({
  flag: z.enum(['ip_flagged', 'manual_review', 'fingerprint_flagged']),
});

router.post('/:userId/flag', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    const parseResult = addFlagSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid flag type' });
    }

    // Verify user exists
    const user = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    await addFraudFlag(userId, parseResult.data.flag as FraudFlag);

    logger.info(`Admin ${req.adminEmail} added flag "${parseResult.data.flag}" to user ${user[0].email}`);

    return res.json({ success: true, userId, flag: parseResult.data.flag });
  } catch (error: any) {
    logger.error('Add fraud flag error:', error);
    return res.status(500).json({ error: 'Failed to add fraud flag' });
  }
});

export default router;
