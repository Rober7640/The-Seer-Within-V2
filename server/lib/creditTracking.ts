import { db } from './db';
import { users, chatSessions, personas } from '@shared/schema';
import { eq, sql, and, isNull, lt, or } from 'drizzle-orm';
import { getPersonaPricing } from './personaPricing';
import { sendSessionTimeoutEmail } from './sessionTimeoutEmail';
import { COINS_PER_MINUTE } from '@shared/types';
import logger from './logger';

const DEFAULT_TIMEOUT_MINUTES = 5;
const DEFAULT_INACTIVE_THRESHOLD_MS = DEFAULT_TIMEOUT_MINUTES * 60 * 1000;

/**
 * Get an active session from the database.
 */
export async function getActiveSession(sessionId: string) {
  const session = await db.select()
    .from(chatSessions)
    .where(and(
      eq(chatSessions.id, sessionId),
      eq(chatSessions.status, 'active'),
      isNull(chatSessions.endedAt),
    ))
    .limit(1);

  return session[0] || undefined;
}

export async function startChatSession(userId: string, personaId: string): Promise<string> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0] || user[0].coinBalance <= 0) {
    throw new Error('OUT_OF_CREDITS');
  }

  // Return any existing active session for this user+persona instead of creating
  // a duplicate. This prevents orphaned billing sessions from page refreshes/tab switches.
  const existing = await db.select({ id: chatSessions.id })
    .from(chatSessions)
    .where(and(
      eq(chatSessions.userId, userId),
      eq(chatSessions.personaId, personaId),
      eq(chatSessions.status, 'active'),
      isNull(chatSessions.endedAt),
    ))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const pricing = await getPersonaPricing(personaId);

  const now = new Date();
  const session = await db.insert(chatSessions).values({
    userId,
    personaId,
    status: 'active',
    pricingApplied: JSON.stringify(pricing),
    lastHeartbeatAt: now,
    durationSeconds: 0,
    coinsCharged: 0,
  }).returning();

  return session[0].id;
}

export async function checkpointSession(sessionId: string): Promise<void> {
  const session = await db.select()
    .from(chatSessions)
    .where(and(
      eq(chatSessions.id, sessionId),
      eq(chatSessions.status, 'active'),
    ))
    .limit(1);

  if (!session[0]) return;

  const now = new Date();
  const accumulatedSeconds = Math.floor(
    (now.getTime() - session[0].startedAt.getTime()) / 1000
  );
  const totalCoins = Math.floor(accumulatedSeconds / 60) * COINS_PER_MINUTE;

  await db.update(chatSessions)
    .set({
      durationSeconds: accumulatedSeconds,
      coinsCharged: totalCoins,
      lastHeartbeatAt: now,
      updatedAt: now,
    })
    .where(eq(chatSessions.id, sessionId));
}

export async function endChatSession(sessionId: string): Promise<void> {
  const session = await db.select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session[0] || session[0].status !== 'active') return;

  const now = new Date();
  const accumulatedSeconds = Math.floor(
    (now.getTime() - session[0].startedAt.getTime()) / 1000
  );
  const totalCoins = Math.ceil(accumulatedSeconds / 60) * COINS_PER_MINUTE;

  await db.update(users)
    .set({
      coinBalance: sql`GREATEST(0, coin_balance - ${totalCoins})`,
      totalCoinsUsed: sql`total_coins_used + ${totalCoins}`,
      updatedAt: now,
    })
    .where(eq(users.id, session[0].userId));

  await db.update(chatSessions)
    .set({
      status: 'ended',
      endedAt: now,
      durationSeconds: accumulatedSeconds,
      coinsCharged: totalCoins,
      lastHeartbeatAt: now,
      updatedAt: now,
    })
    .where(eq(chatSessions.id, sessionId));
}

export async function getRemainingCoins(userId: string): Promise<number> {
  const user = await db.select({ coinBalance: users.coinBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user[0]?.coinBalance ?? 0;
}

/**
 * Heartbeat: checkpoint all active sessions every 30 seconds.
 */
export function startHeartbeat() {
  setInterval(async () => {
    try {
      const active = await db.select({ id: chatSessions.id })
        .from(chatSessions)
        .where(and(
          eq(chatSessions.status, 'active'),
          isNull(chatSessions.endedAt),
        ));

      for (const session of active) {
        checkpointSession(session.id).catch(err =>
          logger.error('Checkpoint failed', { sessionId: session.id, error: (err as Error).message })
        );
      }
    } catch (err) {
      logger.error('Heartbeat query failed', { error: (err as Error).message });
    }
  }, 30000);
}

async function getPersonaTimeoutMs(personaId: string): Promise<number> {
  try {
    const persona = await db.select({ sessionTimeoutMinutes: personas.sessionTimeoutMinutes })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);
    const minutes = persona[0]?.sessionTimeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;
    return minutes * 60 * 1000;
  } catch {
    return DEFAULT_INACTIVE_THRESHOLD_MS;
  }
}

/**
 * Recover active sessions on server startup.
 */
export async function recoverActiveSessions(): Promise<void> {
  const active = await db.select()
    .from(chatSessions)
    .where(and(
      eq(chatSessions.status, 'active'),
      isNull(chatSessions.endedAt),
    ));

  if (active.length === 0) {
    logger.info('No active sessions to recover');
    return;
  }

  logger.info('Recovering active sessions', { count: active.length });

  const now = new Date();

  for (const session of active) {
    // Use lastMessageAt (real user activity) for idle detection.
    // Fall back to startedAt so brand-new sessions with no messages still time out.
    const lastActivity = session.lastMessageAt || session.startedAt;
    const inactiveDuration = now.getTime() - lastActivity.getTime();
    const timeoutMs = await getPersonaTimeoutMs(session.personaId);

    if (inactiveDuration > timeoutMs) {
      // Bill only up to the last real message, not wall-clock now.
      const accumulatedSeconds = Math.floor(
        (lastActivity.getTime() - session.startedAt.getTime()) / 1000
      );
      const totalCoins = Math.ceil(accumulatedSeconds / 60) * COINS_PER_MINUTE;

      await db.update(users)
        .set({
          coinBalance: sql`GREATEST(0, coin_balance - ${totalCoins})`,
          totalCoinsUsed: sql`total_coins_used + ${totalCoins}`,
          updatedAt: now,
        })
        .where(eq(users.id, session.userId));

      await db.update(chatSessions)
        .set({
          status: 'ended',
          endedAt: lastActivity,
          durationSeconds: accumulatedSeconds,
          coinsCharged: totalCoins,
          updatedAt: now,
        })
        .where(eq(chatSessions.id, session.id));

      logger.info('Auto-ended stale session', { sessionId: session.id, inactiveMinutes: Math.round(inactiveDuration / 60000) });

      sendTimeoutNotification(session.id).catch(err =>
        logger.error('Failed to send timeout email during recovery', { sessionId: session.id, error: (err as Error).message })
      );
    } else {
      await db.update(chatSessions)
        .set({ lastHeartbeatAt: now, updatedAt: now })
        .where(eq(chatSessions.id, session.id));

      logger.info('Recovered session', { sessionId: session.id });
    }
  }
}

/**
 * Background job: auto-end sessions that have exceeded their persona's timeout.
 */
export async function cleanupInactiveSessions(): Promise<number> {
  let endedCount = 0;

  try {
    const conservativeCutoff = new Date(Date.now() - DEFAULT_INACTIVE_THRESHOLD_MS);
    // Find sessions with no real user activity (lastMessageAt) for longer than the cutoff.
    // Also catch sessions that never had a message (lastMessageAt IS NULL) but were started
    // before the cutoff.
    const stale = await db.select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.status, 'active'),
        isNull(chatSessions.endedAt),
        or(
          lt(chatSessions.lastMessageAt, conservativeCutoff),
          and(isNull(chatSessions.lastMessageAt), lt(chatSessions.startedAt, conservativeCutoff)),
        )!,
      ));

    for (const session of stale) {
      // Real activity = lastMessageAt; fall back to startedAt for no-message sessions.
      const lastActivity = session.lastMessageAt || session.startedAt;
      const inactiveDuration = Date.now() - lastActivity.getTime();
      const timeoutMs = await getPersonaTimeoutMs(session.personaId);

      if (inactiveDuration < timeoutMs) {
        continue;
      }

      // Bill only up to the last real message (idle time is free).
      const accumulatedSeconds = Math.floor(
        (lastActivity.getTime() - session.startedAt.getTime()) / 1000
      );
      const totalCoins = Math.ceil(accumulatedSeconds / 60) * COINS_PER_MINUTE;

      const now = new Date();
      await db.update(users)
        .set({
          coinBalance: sql`GREATEST(0, coin_balance - ${totalCoins})`,
          totalCoinsUsed: sql`total_coins_used + ${totalCoins}`,
          updatedAt: now,
        })
        .where(eq(users.id, session.userId));

      await db.update(chatSessions)
        .set({
          status: 'ended',
          endedAt: lastActivity,
          durationSeconds: accumulatedSeconds,
          coinsCharged: totalCoins,
          updatedAt: now,
        })
        .where(eq(chatSessions.id, session.id));

      logger.info('Cleanup: auto-ended inactive session', {
        sessionId: session.id,
        personaId: session.personaId,
        inactiveMinutes: Math.round(inactiveDuration / 60000),
        coinsCharged: totalCoins,
      });

      sendTimeoutNotification(session.id).catch(err =>
        logger.error('Failed to send timeout email', { sessionId: session.id, error: (err as Error).message })
      );

      endedCount++;
    }
  } catch (err) {
    logger.error('Inactive session cleanup failed', { error: (err as Error).message });
  }

  return endedCount;
}

export function startInactiveSessionCleanup() {
  setInterval(() => {
    cleanupInactiveSessions().catch(err =>
      logger.error('Inactive session cleanup interval failed', { error: (err as Error).message })
    );
  }, 5 * 60 * 1000);
}

async function sendTimeoutNotification(sessionId: string): Promise<void> {
  await sendSessionTimeoutEmail(sessionId);
}
