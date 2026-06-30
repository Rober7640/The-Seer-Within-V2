// Admin Analytics Dashboard API Routes
// Real-time and historical data with date range filters

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import {
  users,
  chatSessions,
  chatMessages,
  creditPurchases,
  personas,
  checkoutViews,
} from '@shared/schema';
import { eq, and, sql, desc, count, gte, lte } from 'drizzle-orm';
import logger from '../../lib/logger';

const router = Router();

// Helper: Parse date range from query params
function parseDateRange(req: Request): { start: Date; end: Date } {
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(now.getDate() - 30); // Default: last 30 days

  return {
    start: req.query.startDate ? new Date(req.query.startDate as string) : defaultStart,
    end: req.query.endDate ? new Date(req.query.endDate as string) : now,
  };
}

// ============================================
// GET /api/admin/analytics/overview - Global stats
// ============================================

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req);

    // Total users
    const totalUsers = await db
      .select({ count: count() })
      .from(users);

    // New users in range
    const newUsers = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          gte(users.createdAt, start),
          lte(users.createdAt, end),
        ),
      );

    // Total sessions in range
    const sessionStats = await db
      .select({
        totalSessions: count(),
        totalCoins: sql<number>`COALESCE(SUM(${chatSessions.coinsCharged}), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(${chatSessions.durationSeconds}), 0)`,
      })
      .from(chatSessions)
      .where(
        and(
          gte(chatSessions.startedAt, start),
          lte(chatSessions.startedAt, end),
        ),
      );

    // Total revenue in range
    const revenueStats = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${creditPurchases.priceUsd}), 0)`,
        totalPurchases: count(),
      })
      .from(creditPurchases)
      .where(
        and(
          eq(creditPurchases.status, 'completed'),
          gte(creditPurchases.createdAt, start),
          lte(creditPurchases.createdAt, end),
        ),
      );

    // Active users (with sessions in range)
    const activeUsers = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${chatSessions.userId})`,
      })
      .from(chatSessions)
      .where(
        and(
          gte(chatSessions.startedAt, start),
          lte(chatSessions.startedAt, end),
        ),
      );

    // Active personas count
    const activePersonas = await db
      .select({ count: count() })
      .from(personas)
      .where(eq(personas.isActive, true));

    return res.json({
      overview: {
        totalUsers: totalUsers[0]?.count || 0,
        newUsers: newUsers[0]?.count || 0,
        activeUsers: Number(activeUsers[0]?.count || 0),
        totalSessions: sessionStats[0]?.totalSessions || 0,
        totalCoinsUsed: Number(sessionStats[0]?.totalCoins || 0),
        averageSessionDuration: Number(sessionStats[0]?.avgDuration || 0),
        totalRevenue: Number(revenueStats[0]?.totalRevenue || 0),
        totalPurchases: revenueStats[0]?.totalPurchases || 0,
        activePersonas: activePersonas[0]?.count || 0,
      },
      dateRange: { start, end },
    });
  } catch (error: any) {
    logger.error('Analytics overview error:', error);
    return res.status(500).json({ error: 'Failed to get overview' });
  }
});

// ============================================
// GET /api/admin/analytics/personas - Comparative persona performance
// ============================================

router.get('/personas', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req);

    // Get all personas with their stats
    const allPersonas = await db
      .select({
        id: personas.id,
        name: personas.displayName,
        isActive: personas.isActive,
      })
      .from(personas);

    const personaStats = await Promise.all(
      allPersonas.map(async (persona) => {
        // Sessions in range
        const sessions = await db
          .select({
            totalSessions: count(),
            totalCoins: sql<number>`COALESCE(SUM(${chatSessions.coinsCharged}), 0)`,
            uniqueUsers: sql<number>`COUNT(DISTINCT ${chatSessions.userId})`,
            avgDuration: sql<number>`COALESCE(AVG(${chatSessions.durationSeconds}), 0)`,
          })
          .from(chatSessions)
          .where(
            and(
              eq(chatSessions.personaId, persona.id),
              gte(chatSessions.startedAt, start),
              lte(chatSessions.startedAt, end),
            ),
          );

        // Messages in range
        const messages = await db
          .select({ count: count() })
          .from(chatMessages)
          .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
          .where(
            and(
              eq(chatSessions.personaId, persona.id),
              gte(chatMessages.sentAt, start),
              lte(chatMessages.sentAt, end),
            ),
          );

        return {
          id: persona.id,
          name: persona.name,
          isActive: persona.isActive,
          totalSessions: sessions[0]?.totalSessions || 0,
          totalCoins: Number(sessions[0]?.totalCoins || 0),
          uniqueUsers: Number(sessions[0]?.uniqueUsers || 0),
          avgSessionDuration: Number(sessions[0]?.avgDuration || 0),
          totalMessages: messages[0]?.count || 0,
        };
      }),
    );

    // Sort by total sessions descending
    personaStats.sort((a, b) => b.totalSessions - a.totalSessions);

    return res.json({
      personas: personaStats,
      dateRange: { start, end },
    });
  } catch (error: any) {
    logger.error('Analytics personas error:', error);
    return res.status(500).json({ error: 'Failed to get persona analytics' });
  }
});

// ============================================
// GET /api/admin/analytics/revenue - Revenue breakdown by persona, time period
// ============================================

router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req);
    const groupBy = (req.query.groupBy as string) || 'day'; // day, week, month

    // Revenue by package type
    const byPackage = await db
      .select({
        packageType: creditPurchases.packageType,
        totalRevenue: sql<number>`COALESCE(SUM(${creditPurchases.priceUsd}), 0)`,
        totalPurchases: count(),
        totalCoins: sql<number>`COALESCE(SUM(${creditPurchases.coinsPurchased}), 0)`,
      })
      .from(creditPurchases)
      .where(
        and(
          eq(creditPurchases.status, 'completed'),
          gte(creditPurchases.createdAt, start),
          lte(creditPurchases.createdAt, end),
        ),
      )
      .groupBy(creditPurchases.packageType);

    // Daily revenue trend
    const dailyRevenue = await db
      .select({
        date: sql<string>`DATE(${creditPurchases.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${creditPurchases.priceUsd}), 0)`,
        purchases: count(),
      })
      .from(creditPurchases)
      .where(
        and(
          eq(creditPurchases.status, 'completed'),
          gte(creditPurchases.createdAt, start),
          lte(creditPurchases.createdAt, end),
        ),
      )
      .groupBy(sql`DATE(${creditPurchases.createdAt})`)
      .orderBy(sql`DATE(${creditPurchases.createdAt})`);

    // Total revenue
    const totalRevenue = byPackage.reduce(
      (sum, pkg) => sum + Number(pkg.totalRevenue),
      0,
    );

    return res.json({
      revenue: {
        total: totalRevenue,
        byPackage: byPackage.map((p) => ({
          packageType: p.packageType,
          revenue: Number(p.totalRevenue),
          purchases: p.totalPurchases,
          coins: Number(p.totalCoins),
        })),
        daily: dailyRevenue.map((d) => ({
          date: d.date,
          revenue: Number(d.revenue),
          purchases: d.purchases,
        })),
      },
      dateRange: { start, end },
    });
  } catch (error: any) {
    logger.error('Analytics revenue error:', error);
    return res.status(500).json({ error: 'Failed to get revenue analytics' });
  }
});

// ============================================
// GET /api/admin/analytics/users - User growth, retention, churn by persona
// ============================================

router.get('/users', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req);

    // User growth (daily signups)
    const dailySignups = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})`,
        signups: count(),
      })
      .from(users)
      .where(
        and(
          gte(users.createdAt, start),
          lte(users.createdAt, end),
        ),
      )
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);

    // Users by account status
    const byStatus = await db
      .select({
        status: users.accountStatus,
        count: count(),
      })
      .from(users)
      .groupBy(users.accountStatus);

    // Users with purchases vs free-only
    const purchaseBreakdown = await db
      .select({
        hasPurchased: sql<boolean>`EXISTS(
          SELECT 1 FROM ${creditPurchases} cp
          WHERE cp.user_id = ${users.id}
          AND cp.status = 'completed'
          AND cp.package_type != 'admin_adjustment'
        )`,
        count: count(),
      })
      .from(users)
      .groupBy(sql`EXISTS(
        SELECT 1 FROM ${creditPurchases} cp
        WHERE cp.user_id = ${users.id}
        AND cp.status = 'completed'
        AND cp.package_type != 'admin_adjustment'
      )`);

    // Retention: users active in last 7 days vs last 30 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const retention7d = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${chatSessions.userId})`,
      })
      .from(chatSessions)
      .where(gte(chatSessions.startedAt, sevenDaysAgo));

    const retention30d = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${chatSessions.userId})`,
      })
      .from(chatSessions)
      .where(gte(chatSessions.startedAt, start));

    return res.json({
      users: {
        dailySignups: dailySignups.map((d) => ({
          date: d.date,
          signups: d.signups,
        })),
        byStatus: byStatus.map((s) => ({
          status: s.status,
          count: s.count,
        })),
        purchaseBreakdown: purchaseBreakdown.map((p) => ({
          hasPurchased: p.hasPurchased,
          count: p.count,
        })),
        retention: {
          activeIn7Days: Number(retention7d[0]?.count || 0),
          activeIn30Days: Number(retention30d[0]?.count || 0),
        },
      },
      dateRange: { start, end },
    });
  } catch (error: any) {
    logger.error('Analytics users error:', error);
    return res.status(500).json({ error: 'Failed to get user analytics' });
  }
});

// (The /api/admin/analytics/prompts session-count A/B view was retired in Phase 5 —
// prompt A/B now runs on the experiments framework, measured in /admin/experiments.)

// ============================================
// GET /api/admin/analytics/buckets - Popular reading topics by persona
// ============================================

router.get('/buckets', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req);

    // Bucket distribution across all personas
    const bucketStats = await db
      .select({
        personaId: chatSessions.personaId,
        personaName: personas.displayName,
        bucket: chatSessions.lastBucket,
        sessionCount: count(),
        totalCoins: sql<number>`COALESCE(SUM(${chatSessions.coinsCharged}), 0)`,
      })
      .from(chatSessions)
      .leftJoin(personas, eq(chatSessions.personaId, personas.id))
      .where(
        and(
          sql`${chatSessions.lastBucket} IS NOT NULL`,
          gte(chatSessions.startedAt, start),
          lte(chatSessions.startedAt, end),
        ),
      )
      .groupBy(
        chatSessions.personaId,
        personas.displayName,
        chatSessions.lastBucket,
      )
      .orderBy(desc(count()));

    // Overall bucket totals
    const overallBuckets = await db
      .select({
        bucket: chatSessions.lastBucket,
        sessionCount: count(),
      })
      .from(chatSessions)
      .where(
        and(
          sql`${chatSessions.lastBucket} IS NOT NULL`,
          gte(chatSessions.startedAt, start),
          lte(chatSessions.startedAt, end),
        ),
      )
      .groupBy(chatSessions.lastBucket)
      .orderBy(desc(count()));

    return res.json({
      buckets: {
        byPersona: bucketStats.map((b) => ({
          personaId: b.personaId,
          personaName: b.personaName || 'Unknown',
          bucket: b.bucket,
          sessions: b.sessionCount,
          coins: Number(b.totalCoins),
        })),
        overall: overallBuckets.map((b) => ({
          bucket: b.bucket,
          sessions: b.sessionCount,
        })),
      },
      dateRange: { start, end },
    });
  } catch (error: any) {
    logger.error('Analytics buckets error:', error);
    return res.status(500).json({ error: 'Failed to get bucket analytics' });
  }
});

// ============================================
// GET /api/admin/analytics/alerts - Users with low coin balance
// ============================================

router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 30; // default: 30 coins (~30 sec)

    const lowCreditUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        coinBalance: users.coinBalance,
        totalCoinsUsed: users.totalCoinsUsed,
        lastLoginAt: users.lastLoginAt,
        accountStatus: users.accountStatus,
      })
      .from(users)
      .where(
        and(
          sql`${users.coinBalance} <= ${threshold}`,
          eq(users.accountStatus, 'active'),
        ),
      )
      .orderBy(users.coinBalance)
      .limit(50);

    return res.json({
      alerts: lowCreditUsers,
      threshold,
      count: lowCreditUsers.length,
    });
  } catch (error: any) {
    logger.error('Analytics alerts error:', error);
    return res.status(500).json({ error: 'Failed to get low credit alerts' });
  }
});

// ============================================
// GET /api/admin/analytics/checkout-conversion
// ============================================

router.get('/checkout-conversion', async (req: Request, res: Response) => {
  try {
    const { start, end } = parseDateRange(req);

    // Views by source
    const viewsBySource = await db
      .select({
        source: checkoutViews.source,
        views: count(),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${checkoutViews.userId})`,
      })
      .from(checkoutViews)
      .where(
        and(
          gte(checkoutViews.createdAt, start),
          lte(checkoutViews.createdAt, end),
        ),
      )
      .groupBy(checkoutViews.source);

    // Unique users who purchased AFTER viewing per source
    const completedBySource = await db
      .select({
        source: checkoutViews.source,
        completed: sql<number>`COUNT(DISTINCT CASE WHEN EXISTS (
          SELECT 1 FROM ${creditPurchases}
          WHERE ${creditPurchases.userId} = ${checkoutViews.userId}
          AND ${creditPurchases.status} = 'completed'
          AND ${creditPurchases.packageType} != 'admin_adjustment'
          AND ${creditPurchases.createdAt} >= (
            SELECT MIN(cv2.created_at) FROM checkout_views cv2
            WHERE cv2.user_id = ${checkoutViews.userId}
            AND cv2.created_at >= ${start}
            AND cv2.created_at <= ${end}
          )
          AND ${creditPurchases.createdAt} <= ${end}
        ) THEN ${checkoutViews.userId} END)`,
      })
      .from(checkoutViews)
      .where(
        and(
          gte(checkoutViews.createdAt, start),
          lte(checkoutViews.createdAt, end),
        ),
      )
      .groupBy(checkoutViews.source);

    // Totals
    const totalViews = await db
      .select({
        total: count(),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${checkoutViews.userId})`,
      })
      .from(checkoutViews)
      .where(
        and(
          gte(checkoutViews.createdAt, start),
          lte(checkoutViews.createdAt, end),
        ),
      );

    // Unique users who purchased AFTER their first modal view (not before)
    const totalCompleted = await db
      .select({
        total: sql<number>`COUNT(DISTINCT ${checkoutViews.userId})`,
      })
      .from(checkoutViews)
      .where(
        and(
          gte(checkoutViews.createdAt, start),
          lte(checkoutViews.createdAt, end),
          sql`EXISTS (
            SELECT 1 FROM ${creditPurchases}
            WHERE ${creditPurchases.userId} = ${checkoutViews.userId}
            AND ${creditPurchases.status} = 'completed'
            AND ${creditPurchases.packageType} != 'admin_adjustment'
            AND ${creditPurchases.createdAt} >= (
              SELECT MIN(cv2.created_at) FROM checkout_views cv2
              WHERE cv2.user_id = ${checkoutViews.userId}
              AND cv2.created_at >= ${start}
              AND cv2.created_at <= ${end}
            )
            AND ${creditPurchases.createdAt} <= ${end}
          )`,
        ),
      );

    // Users who viewed but never purchased AFTER viewing (drop-offs)
    const dropOffUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastViewedAt: sql<string>`MAX(${checkoutViews.createdAt})`,
        viewCount: count(),
      })
      .from(checkoutViews)
      .innerJoin(users, eq(users.id, checkoutViews.userId))
      .where(
        and(
          gte(checkoutViews.createdAt, start),
          lte(checkoutViews.createdAt, end),
          sql`NOT EXISTS (
            SELECT 1 FROM ${creditPurchases}
            WHERE ${creditPurchases.userId} = ${checkoutViews.userId}
            AND ${creditPurchases.status} = 'completed'
            AND ${creditPurchases.packageType} != 'admin_adjustment'
            AND ${creditPurchases.createdAt} >= (
              SELECT MIN(cv2.created_at) FROM checkout_views cv2
              WHERE cv2.user_id = ${checkoutViews.userId}
              AND cv2.created_at >= ${start}
              AND cv2.created_at <= ${end}
            )
            AND ${creditPurchases.createdAt} <= ${end}
          )`,
        ),
      )
      .groupBy(users.id, users.email, users.firstName)
      .orderBy(sql`MAX(${checkoutViews.createdAt}) DESC`)
      .limit(50);

    // Build source breakdown (conversion = unique purchasers / unique viewers)
    const completedMap = new Map(completedBySource.map(c => [c.source, c.completed]));
    const bySource = viewsBySource.map(v => ({
      source: v.source,
      views: v.views,
      uniqueUsers: v.uniqueUsers,
      completed: completedMap.get(v.source) ?? 0,
      conversionRate: v.uniqueUsers > 0
        ? Math.round(((completedMap.get(v.source) ?? 0) / v.uniqueUsers) * 100)
        : 0,
    }));

    const uniqueViewers = totalViews[0]?.uniqueUsers ?? 0;
    const completed = totalCompleted[0]?.total ?? 0;

    return res.json({
      checkout: {
        totalViews: totalViews[0]?.total ?? 0,
        uniqueViewers,
        totalCompleted: completed,
        conversionRate: uniqueViewers > 0 ? Math.round((completed / uniqueViewers) * 100) : 0,
        bySource,
        dropOffUsers,
      },
      dateRange: { start, end },
    });
  } catch (error: any) {
    logger.error('Analytics checkout-conversion error:', error);
    return res.status(500).json({ error: 'Failed to get checkout conversion data' });
  }
});

export default router;
