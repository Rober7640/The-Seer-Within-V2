import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { users, chatSessions, creditPurchases, chatMessages, personas, savedMessages } from '@shared/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { requireAuth } from '../lib/auth';
import logger from '../lib/logger';

const router = Router();

// GET /api/user/stats
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Fetch user info
    const userResult = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      coinBalance: users.coinBalance,
      totalCoinsUsed: users.totalCoinsUsed,
      accountStatus: users.accountStatus,
      createdAt: users.createdAt,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult[0];

    // Fetch recent sessions (last 10) with persona info
    const recentSessions = await db.select({
      id: chatSessions.id,
      personaId: chatSessions.personaId,
      personaName: personas.displayName,
      personaAvatar: personas.avatarUrl,
      startedAt: chatSessions.startedAt,
      endedAt: chatSessions.endedAt,
      durationSeconds: chatSessions.durationSeconds,
      coinsCharged: chatSessions.coinsCharged,
      status: chatSessions.status,
      lastTopic: chatSessions.lastTopic,
    })
      .from(chatSessions)
      .leftJoin(personas, eq(chatSessions.personaId, personas.id))
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.startedAt))
      .limit(10);

    // Fetch purchase history
    const purchaseHistory = await db.select({
      id: creditPurchases.id,
      packageType: creditPurchases.packageType,
      coinsPurchased: creditPurchases.coinsPurchased,
      priceUsd: creditPurchases.priceUsd,
      status: creditPurchases.status,
      createdAt: creditPurchases.createdAt,
    })
      .from(creditPurchases)
      .where(eq(creditPurchases.userId, userId))
      .orderBy(desc(creditPurchases.createdAt))
      .limit(50);

    // Aggregate session stats
    const sessionAgg = await db.select({
      totalSessions: sql<number>`count(*)::int`,
      totalDurationSeconds: sql<number>`coalesce(sum(${chatSessions.durationSeconds}), 0)::int`,
      totalCoinsCharged: sql<number>`coalesce(sum(${chatSessions.coinsCharged}), 0)::int`,
    })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId));

    // Credit usage over time: group completed purchases by month
    const creditHistory = await db.select({
      month: sql<string>`to_char(${creditPurchases.createdAt}, 'YYYY-MM')`,
      totalCoins: sql<number>`coalesce(sum(${creditPurchases.coinsPurchased}), 0)::int`,
      totalSpent: sql<number>`coalesce(sum(${creditPurchases.priceUsd}), 0)::int`,
    })
      .from(creditPurchases)
      .where(and(
        eq(creditPurchases.userId, userId),
        eq(creditPurchases.status, 'completed'),
      ))
      .groupBy(sql`to_char(${creditPurchases.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${creditPurchases.createdAt}, 'YYYY-MM')`);

    // Saved messages (user bookmarks)
    const userSavedMessages = await db.select({
      messageId: savedMessages.messageId,
      sessionId: savedMessages.sessionId,
      content: chatMessages.content,
      role: chatMessages.role,
      savedAt: savedMessages.savedAt,
    })
      .from(savedMessages)
      .innerJoin(chatMessages, eq(savedMessages.messageId, chatMessages.id))
      .where(eq(savedMessages.userId, userId))
      .orderBy(desc(savedMessages.savedAt));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        coinBalance: user.coinBalance,
        totalCoinsUsed: user.totalCoinsUsed,
        accountStatus: user.accountStatus,
        memberSince: user.createdAt,
      },
      summary: {
        totalSessions: sessionAgg[0]?.totalSessions ?? 0,
        totalDurationSeconds: sessionAgg[0]?.totalDurationSeconds ?? 0,
        totalCoinsCharged: sessionAgg[0]?.totalCoinsCharged ?? 0,
      },
      recentSessions,
      purchaseHistory,
      savedMessages: userSavedMessages,
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// GET /api/user/session/:sessionId/transcript
router.get('/session/:sessionId/transcript', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;

    // Verify session belongs to user
    const sessionResult = await db.select({
      id: chatSessions.id,
      personaId: chatSessions.personaId,
      startedAt: chatSessions.startedAt,
    })
      .from(chatSessions)
      .where(and(
        eq(chatSessions.id, sessionId as string),
        eq(chatSessions.userId, userId),
      ))
      .limit(1);

    if (!sessionResult[0]) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Get persona name
    const personaResult = await db.select({ displayName: personas.displayName })
      .from(personas)
      .where(eq(personas.id, sessionResult[0].personaId))
      .limit(1);

    // Fetch all messages for the session
    const messages = await db.select({
      role: chatMessages.role,
      content: chatMessages.content,
      sentAt: chatMessages.sentAt,
    })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId as string))
      .orderBy(chatMessages.sentAt);

    const personaName = personaResult[0]?.displayName ?? 'Guide';
    const sessionDate = new Date(sessionResult[0].startedAt).toLocaleString();

    // Build plain text transcript
    const lines = [
      `Session Transcript`,
      `Guide: ${personaName}`,
      `Date: ${sessionDate}`,
      `---`,
      '',
    ];

    for (const msg of messages) {
      const speaker = msg.role === 'user' ? 'You' : personaName;
      const time = new Date(msg.sentAt).toLocaleTimeString();
      lines.push(`[${time}] ${speaker}:`);
      lines.push(msg.content);
      lines.push('');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transcript-${sessionId.slice(0, 8)}.txt"`);
    res.send(lines.join('\n'));
  } catch (error) {
    logger.error('Get transcript error:', error);
    res.status(500).json({ error: 'Failed to get transcript' });
  }
});

// POST /api/user/messages/:messageId/save
router.post('/messages/:messageId/save', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = req.params.messageId as string;

    // Verify the message belongs to this user
    const message = await db.select({ sessionId: chatMessages.sessionId })
      .from(chatMessages)
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)))
      .limit(1);

    if (!message[0]) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    await db.insert(savedMessages).values({
      userId,
      messageId,
      sessionId: message[0].sessionId,
    }).onConflictDoNothing();

    res.json({ saved: true });
  } catch (error) {
    logger.error('Save message error:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// DELETE /api/user/messages/:messageId/save
router.delete('/messages/:messageId/save', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = req.params.messageId as string;

    await db.delete(savedMessages)
      .where(and(
        eq(savedMessages.userId, userId),
        eq(savedMessages.messageId, messageId),
      ));

    res.json({ saved: false });
  } catch (error) {
    logger.error('Unsave message error:', error);
    res.status(500).json({ error: 'Failed to unsave message' });
  }
});

export default router;
