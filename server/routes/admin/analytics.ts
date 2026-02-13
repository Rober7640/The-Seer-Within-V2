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
  personaPrompts,
} from '@shared/schema';
import { eq, and, sql, desc, count, gte, lte } from 'drizzle-orm';

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
        totalMinutes: sql<number>`COALESCE(SUM(${chatSessions.minutesCharged}), 0)`,
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
        totalMinutesUsed: Number(sessionStats[0]?.totalMinutes || 0),
        averageSessionDuration: Number(sessionStats[0]?.avgDuration || 0),
        totalRevenue: Number(revenueStats[0]?.totalRevenue || 0),
        totalPurchases: revenueStats[0]?.totalPurchases || 0,
        activePersonas: activePersonas[0]?.count || 0,
      },
      dateRange: { start, end },
    });
  } catch (error: any) {
    console.error('Analytics overview error:', error);
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
            totalMinutes: sql<number>`COALESCE(SUM(${chatSessions.minutesCharged}), 0)`,
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
          totalMinutes: Number(sessions[0]?.totalMinutes || 0),
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
    console.error('Analytics personas error:', error);
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
        totalMinutes: sql<number>`COALESCE(SUM(${creditPurchases.minutesPurchased}), 0)`,
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
          minutes: Number(p.totalMinutes),
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
    console.error('Analytics revenue error:', error);
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
    console.error('Analytics users error:', error);
    return res.status(500).json({ error: 'Failed to get user analytics' });
  }
});

// ============================================
// GET /api/admin/analytics/prompts - A/B test performance data
// ============================================

router.get('/prompts', async (req: Request, res: Response) => {
  try {
    // Get all prompts that are part of A/B tests (have variantLabel set)
    const abTestPrompts = await db
      .select({
        id: personaPrompts.id,
        personaId: personaPrompts.personaId,
        personaName: personas.displayName,
        promptType: personaPrompts.promptType,
        version: personaPrompts.version,
        variantLabel: personaPrompts.variantLabel,
        trafficPercent: personaPrompts.trafficPercent,
        isActive: personaPrompts.isActive,
      })
      .from(personaPrompts)
      .leftJoin(personas, eq(personaPrompts.personaId, personas.id))
      .where(sql`${personaPrompts.variantLabel} IS NOT NULL`)
      .orderBy(
        personaPrompts.personaId,
        personaPrompts.promptType,
        personaPrompts.variantLabel,
      );

    // For each variant, count sessions that used it via promptVariantId
    const grouped: Record<string, {
      personaId: string;
      personaName: string;
      promptType: string;
      variants: Array<{
        id: string;
        variantLabel: string;
        version: number;
        trafficPercent: number;
        sessionCount: number;
        isActive: boolean;
      }>;
    }> = {};

    for (const prompt of abTestPrompts) {
      const key = `${prompt.personaId}:${prompt.promptType}`;
      if (!grouped[key]) {
        grouped[key] = {
          personaId: prompt.personaId,
          personaName: prompt.personaName || 'Unknown',
          promptType: prompt.promptType,
          variants: [],
        };
      }

      // Count sessions that used this prompt variant
      const sessionCount = await db
        .select({ count: count() })
        .from(chatSessions)
        .where(eq(chatSessions.promptVariantId, prompt.id));

      grouped[key].variants.push({
        id: prompt.id,
        variantLabel: prompt.variantLabel || '',
        version: prompt.version,
        trafficPercent: prompt.trafficPercent,
        sessionCount: sessionCount[0]?.count || 0,
        isActive: prompt.isActive,
      });
    }

    // Overall prompt stats
    const overallStats = await db
      .select({
        totalPrompts: count(),
        activePrompts: sql<number>`SUM(CASE WHEN ${personaPrompts.isActive} THEN 1 ELSE 0 END)`,
      })
      .from(personaPrompts);

    return res.json({
      prompts: {
        abTests: Object.values(grouped),
        overall: {
          totalPrompts: overallStats[0]?.totalPrompts || 0,
          activePrompts: Number(overallStats[0]?.activePrompts || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Analytics prompts error:', error);
    return res.status(500).json({ error: 'Failed to get prompt analytics' });
  }
});

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
        totalMinutes: sql<number>`COALESCE(SUM(${chatSessions.minutesCharged}), 0)`,
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
          minutes: Number(b.totalMinutes),
        })),
        overall: overallBuckets.map((b) => ({
          bucket: b.bucket,
          sessions: b.sessionCount,
        })),
      },
      dateRange: { start, end },
    });
  } catch (error: any) {
    console.error('Analytics buckets error:', error);
    return res.status(500).json({ error: 'Failed to get bucket analytics' });
  }
});

export default router;
