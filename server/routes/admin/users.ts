// Admin Users Management API Routes
// Multi-persona user management with cross-persona analytics

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db';
import { users, chatSessions, chatMessages, userMemory, creditPurchases, personas } from '@shared/schema';
import { eq, and, desc, sql, count, like, or } from 'drizzle-orm';
import logger from '../../lib/logger';

const router = Router();

// Zod schemas
const adjustCreditsSchema = z.object({
  coins: z.number().int(),   // Positive to add, negative to deduct
  reason: z.string().min(1),
});

const editMemorySchema = z.object({
  summary: z.string().min(1).optional(),
  importance: z.number().int().min(1).max(10).optional(),
  category: z.string().optional(),
});

const transferPersonaSchema = z.object({
  fromPersonaId: z.string(),
  toPersonaId: z.string(),
  transferMemory: z.boolean().default(true),
});

// ============================================
// GET /api/admin/users - List users with multi-persona stats
// ============================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sort as string) || 'createdAt';
    const order = (req.query.order as string) || 'desc';

    // Build search conditions
    let searchCondition;
    if (search) {
      searchCondition = or(
        like(users.email, `%${search}%`),
        like(users.firstName, `%${search}%`),
      );
    }

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(users)
      .where(searchCondition);
    const total = totalResult[0]?.count || 0;

    // Get users with basic info
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        coinBalance: users.coinBalance,
        totalCoinsUsed: users.totalCoinsUsed,
        accountStatus: users.accountStatus,
        suspensionReason: users.suspensionReason,
        suspendedAt: users.suspendedAt,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(searchCondition)
      .orderBy(order === 'desc' ? desc(users.createdAt) : users.createdAt)
      .limit(limit)
      .offset(offset);

    // For each user, get session count and persona interaction count
    const enrichedUsers = await Promise.all(
      userList.map(async (user) => {
        const sessionStats = await db
          .select({
            totalSessions: count(),
            personaCount: sql<number>`COUNT(DISTINCT ${chatSessions.personaId})`,
          })
          .from(chatSessions)
          .where(eq(chatSessions.userId, user.id));

        return {
          ...user,
          totalSessions: sessionStats[0]?.totalSessions || 0,
          personasUsed: Number(sessionStats[0]?.personaCount || 0),
        };
      }),
    );

    return res.json({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error('List users error:', error);
    return res.status(500).json({ error: 'Failed to list users' });
  }
});

// ============================================
// GET /api/admin/users/:id - User details with persona interactions breakdown
// ============================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get persona interaction breakdown
    const personaBreakdown = await db
      .select({
        personaId: chatSessions.personaId,
        personaName: personas.displayName,
        sessionCount: count(),
        totalCoins: sql<number>`COALESCE(SUM(${chatSessions.coinsCharged}), 0)`,
        lastSession: sql<string>`MAX(${chatSessions.startedAt})`,
      })
      .from(chatSessions)
      .leftJoin(personas, eq(chatSessions.personaId, personas.id))
      .where(eq(chatSessions.userId, userId))
      .groupBy(chatSessions.personaId, personas.displayName);

    // Get credit purchase history
    const purchases = await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.userId, userId))
      .orderBy(desc(creditPurchases.createdAt))
      .limit(20);

    // Get memory count
    const memoryCount = await db
      .select({ count: count() })
      .from(userMemory)
      .where(eq(userMemory.userId, userId));

    return res.json({
      user: user[0],
      personaBreakdown,
      recentPurchases: purchases,
      memoryCount: memoryCount[0]?.count || 0,
    });
  } catch (error: any) {
    logger.error('Get user details error:', error);
    return res.status(500).json({ error: 'Failed to get user details' });
  }
});

// ============================================
// PATCH /api/admin/users/:id/credits - Adjust credits manually
// ============================================

router.patch('/:id/credits', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    const parseResult = adjustCreditsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const { coins, reason } = parseResult.data;

    // Get current user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent negative balance
    const newBalance = user[0].coinBalance + coins;
    if (newBalance < 0) {
      return res.status(400).json({
        error: `Cannot deduct ${Math.abs(coins)} coins. User only has ${user[0].coinBalance} coins.`,
      });
    }

    // Update credits
    await db
      .update(users)
      .set({
        coinBalance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Log the adjustment as a credit purchase with "admin_adjustment" status
    await db.insert(creditPurchases).values({
      userId,
      packageType: 'admin_adjustment',
      coinsPurchased: coins,
      priceUsd: 0,
      status: 'completed',
    });

    logger.info(`Admin adjusted coins for ${user[0].email}: ${coins > 0 ? '+' : ''}${coins} (reason: ${reason})`);

    return res.json({
      user: {
        id: userId,
        email: user[0].email,
        previousBalance: user[0].coinBalance,
        newBalance,
        adjustment: coins,
        reason,
      },
    });
  } catch (error: any) {
    logger.error('Adjust credits error:', error);
    return res.status(500).json({ error: 'Failed to adjust credits' });
  }
});

// ============================================
// GET /api/admin/users/:id/sessions - Sessions grouped by persona
// ============================================

router.get('/:id/sessions', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const personaId = req.query.personaId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    let conditions = eq(chatSessions.userId, userId);
    if (personaId) {
      conditions = and(conditions, eq(chatSessions.personaId, personaId))!;
    }

    const sessions = await db
      .select({
        id: chatSessions.id,
        personaId: chatSessions.personaId,
        personaName: personas.displayName,
        startedAt: chatSessions.startedAt,
        endedAt: chatSessions.endedAt,
        durationSeconds: chatSessions.durationSeconds,
        coinsCharged: chatSessions.coinsCharged,
        status: chatSessions.status,
        lastTopic: chatSessions.lastTopic,
        lastBucket: chatSessions.lastBucket,
      })
      .from(chatSessions)
      .leftJoin(personas, eq(chatSessions.personaId, personas.id))
      .where(conditions)
      .orderBy(desc(chatSessions.startedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(conditions);

    return res.json({
      sessions,
      pagination: {
        page,
        limit,
        total: totalResult[0]?.count || 0,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      },
    });
  } catch (error: any) {
    logger.error('Get user sessions error:', error);
    return res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// ============================================
// GET /api/admin/users/:id/memory - Memory entries across all personas
// ============================================

router.get('/:id/memory', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const category = req.query.category as string | undefined;

    let conditions = eq(userMemory.userId, userId);
    if (category) {
      conditions = and(conditions, eq(userMemory.category, category))!;
    }

    const memories = await db
      .select()
      .from(userMemory)
      .where(conditions)
      .orderBy(desc(userMemory.importance), desc(userMemory.createdAt));

    return res.json({ memories });
  } catch (error: any) {
    logger.error('Get user memory error:', error);
    return res.status(500).json({ error: 'Failed to get memory entries' });
  }
});

// ============================================
// PATCH /api/admin/users/:id/memory/:memoryId - Edit memory entry
// ============================================

router.patch('/:id/memory/:memoryId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const memoryId = req.params.memoryId as string;

    const parseResult = editMemorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    // Verify memory belongs to user
    const memory = await db
      .select()
      .from(userMemory)
      .where(
        and(
          eq(userMemory.id, memoryId),
          eq(userMemory.userId, userId),
        ),
      )
      .limit(1);

    if (!memory[0]) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parseResult.data.summary) updates.summary = parseResult.data.summary;
    if (parseResult.data.importance) updates.importance = parseResult.data.importance;
    if (parseResult.data.category) updates.category = parseResult.data.category;

    await db
      .update(userMemory)
      .set(updates)
      .where(eq(userMemory.id, memoryId));

    // Fetch updated
    const updated = await db
      .select()
      .from(userMemory)
      .where(eq(userMemory.id, memoryId))
      .limit(1);

    return res.json({ memory: updated[0] });
  } catch (error: any) {
    logger.error('Edit memory error:', error);
    return res.status(500).json({ error: 'Failed to edit memory' });
  }
});

// ============================================
// POST /api/admin/users/:id/transfer-persona - Migrate user to different persona
// ============================================

router.post('/:id/transfer-persona', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    const parseResult = transferPersonaSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const { fromPersonaId, toPersonaId, transferMemory } = parseResult.data;

    // Verify user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify both personas exist
    const [fromPersona, toPersona] = await Promise.all([
      db.select({ id: personas.id, name: personas.displayName }).from(personas).where(eq(personas.id, fromPersonaId)).limit(1),
      db.select({ id: personas.id, name: personas.displayName }).from(personas).where(eq(personas.id, toPersonaId)).limit(1),
    ]);

    if (!fromPersona[0]) return res.status(404).json({ error: 'Source persona not found' });
    if (!toPersona[0]) return res.status(404).json({ error: 'Target persona not found' });

    // Update user's default persona
    await db
      .update(users)
      .set({
        defaultPersonaId: toPersonaId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    let memoriesTransferred = 0;

    // Optionally transfer memory entries (mark them as transferred)
    if (transferMemory) {
      const sourceMemories = await db
        .select()
        .from(userMemory)
        .where(eq(userMemory.userId, userId));

      // Memory entries don't have a direct personaId, but we can add a note
      // about the transfer in the fullContext
      for (const mem of sourceMemories) {
        const context = mem.fullContext ? JSON.parse(mem.fullContext) : {};
        context.transferredFrom = fromPersonaId;
        context.transferredTo = toPersonaId;
        context.transferDate = new Date().toISOString();

        await db
          .update(userMemory)
          .set({
            fullContext: JSON.stringify(context),
            updatedAt: new Date(),
          })
          .where(eq(userMemory.id, mem.id));

        memoriesTransferred++;
      }
    }

    logger.info(
      `Transferred user ${user[0].email} from persona ${fromPersona[0].name} to ${toPersona[0].name}` +
      (transferMemory ? ` (${memoriesTransferred} memories transferred)` : ''),
    );

    return res.json({
      success: true,
      transfer: {
        userId,
        from: { id: fromPersonaId, name: fromPersona[0].name },
        to: { id: toPersonaId, name: toPersona[0].name },
        memoriesTransferred,
      },
    });
  } catch (error: any) {
    logger.error('Transfer persona error:', error);
    return res.status(500).json({ error: 'Failed to transfer persona' });
  }
});

// ============================================
// Suspension / Ban Schemas
// ============================================

const suspendSchema = z.object({
  reason: z.string().min(1, 'Suspension reason is required'),
});

const banSchema = z.object({
  reason: z.string().min(1, 'Ban reason is required'),
});

// ============================================
// POST /api/admin/users/:id/suspend - Suspend a user account
// ============================================

router.post('/:id/suspend', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    const parseResult = suspendSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const { reason } = parseResult.data;

    // Get user
    const user = await db
      .select({ id: users.id, email: users.email, accountStatus: users.accountStatus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user[0].accountStatus === 'suspended') {
      return res.status(409).json({ error: 'User is already suspended' });
    }

    if (user[0].accountStatus === 'banned') {
      return res.status(409).json({ error: 'User is banned. Use unsuspend first to change status.' });
    }

    // Suspend the user
    await db
      .update(users)
      .set({
        accountStatus: 'suspended',
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: req.adminId!,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info(`Admin ${req.adminEmail} suspended user ${user[0].email}: ${reason}`);

    return res.json({
      success: true,
      user: {
        id: userId,
        email: user[0].email,
        accountStatus: 'suspended',
        suspensionReason: reason,
        suspendedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Suspend user error:', error);
    return res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// ============================================
// POST /api/admin/users/:id/ban - Permanently ban a user account
// ============================================

router.post('/:id/ban', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    const parseResult = banSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const { reason } = parseResult.data;

    // Get user
    const user = await db
      .select({ id: users.id, email: users.email, accountStatus: users.accountStatus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user[0].accountStatus === 'banned') {
      return res.status(409).json({ error: 'User is already banned' });
    }

    // Ban the user
    await db
      .update(users)
      .set({
        accountStatus: 'banned',
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: req.adminId!,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info(`Admin ${req.adminEmail} banned user ${user[0].email}: ${reason}`);

    return res.json({
      success: true,
      user: {
        id: userId,
        email: user[0].email,
        accountStatus: 'banned',
        suspensionReason: reason,
        bannedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Ban user error:', error);
    return res.status(500).json({ error: 'Failed to ban user' });
  }
});

// ============================================
// POST /api/admin/users/:id/unsuspend - Restore a suspended or banned user
// ============================================

router.post('/:id/unsuspend', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    // Get user
    const user = await db
      .select({ id: users.id, email: users.email, accountStatus: users.accountStatus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user[0].accountStatus === 'active') {
      return res.status(409).json({ error: 'User account is already active' });
    }

    const previousStatus = user[0].accountStatus;

    // Restore the user
    await db
      .update(users)
      .set({
        accountStatus: 'active',
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info(`Admin ${req.adminEmail} unsuspended user ${user[0].email} (was: ${previousStatus})`);

    return res.json({
      success: true,
      user: {
        id: userId,
        email: user[0].email,
        accountStatus: 'active',
        previousStatus,
      },
    });
  } catch (error: any) {
    logger.error('Unsuspend user error:', error);
    return res.status(500).json({ error: 'Failed to unsuspend user' });
  }
});

// ============================================
// POST /api/admin/users/:id/flag - Flag user for review
// ============================================

router.post('/:id/flag', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const reason = req.body.reason as string || 'Flagged for manual review';

    // Get user
    const user = await db
      .select({ id: users.id, email: users.email, accountStatus: users.accountStatus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user[0].accountStatus === 'banned') {
      return res.status(409).json({ error: 'User is banned; cannot flag for review' });
    }

    // Flag the user (does not block access, just marks for review)
    await db
      .update(users)
      .set({
        accountStatus: 'flagged_for_review',
        suspensionReason: reason,
        suspendedBy: req.adminId!,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info(`Admin ${req.adminEmail} flagged user ${user[0].email} for review: ${reason}`);

    return res.json({
      success: true,
      user: {
        id: userId,
        email: user[0].email,
        accountStatus: 'flagged_for_review',
        reason,
      },
    });
  } catch (error: any) {
    logger.error('Flag user error:', error);
    return res.status(500).json({ error: 'Failed to flag user' });
  }
});

export default router;
