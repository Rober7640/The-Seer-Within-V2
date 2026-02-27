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
 * Parse a raw timestamp from PostgreSQL as UTC.
 * Raw SQL queries return `timestamp without time zone` as a bare string like
 * "2026-02-26 10:00:07.589215". JavaScript's `new Date()` treats that as local
 * time, causing a timezone-offset billing error. Appending "Z" forces UTC.
 */
function parseUtc(raw: Date | string): Date {
  const str = typeof raw === 'string' ? raw : raw.toISOString();
  // If the string already has timezone info (ends with Z or +/-offset), parse as-is
  if (/[Zz]$/.test(str) || /[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }
  // Otherwise append Z to treat as UTC
  return new Date(str.replace(' ', 'T') + 'Z');
}

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

  logger.info('startChatSession: starting', { userId, personaId, currentBalance: user[0].coinBalance });

  // End ALL active sessions for this user (any persona). This prevents
  // orphaned sessions from accumulating unbounded billing time.
  const existing = await db.select({ id: chatSessions.id, startedAt: chatSessions.startedAt, personaId: chatSessions.personaId })
    .from(chatSessions)
    .where(and(
      eq(chatSessions.userId, userId),
      eq(chatSessions.status, 'active'),
      isNull(chatSessions.endedAt),
    ));

  logger.info('startChatSession: found existing active sessions', { count: existing.length, sessions: existing.map(s => ({ id: s.id, personaId: s.personaId, startedAt: s.startedAt })) });

  for (const old of existing) {
    try {
      await endChatSession(old.id);
      logger.info('startChatSession: ended stale session', { sessionId: old.id, userId });
    } catch (err) {
      logger.error('startChatSession: failed to end stale session', { sessionId: old.id, error: (err as Error).message });
    }
  }

  // Check balance after cleanup
  const userAfterCleanup = await db.select({ coinBalance: users.coinBalance }).from(users).where(eq(users.id, userId)).limit(1);
  logger.info('startChatSession: balance after cleanup', { userId, balanceBefore: user[0].coinBalance, balanceAfter: userAfterCleanup[0]?.coinBalance });

  const [pricing, personaRow] = await Promise.all([
    getPersonaPricing(personaId),
    db.select({ coinsPerMinute: personas.coinsPerMinute }).from(personas).where(eq(personas.id, personaId)).limit(1),
  ]);

  const now = new Date();
  const session = await db.insert(chatSessions).values({
    userId,
    personaId,
    status: 'active',
    pricingApplied: JSON.stringify({ ...pricing, coinsPerMinute: personaRow[0]?.coinsPerMinute ?? 60 }),
    lastHeartbeatAt: now,
    durationSeconds: 0,
    coinsCharged: 0,
  }).returning();

  return session[0].id;
}

export async function checkpointSession(sessionId: string): Promise<void> {
  // Fetch persona config before entering the transaction to minimise lock hold time
  const precheck = await db.select({ personaId: chatSessions.personaId })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.status, 'active')))
    .limit(1);

  if (!precheck[0]) return;

  const { coinsPerMinute } = await getPersonaConfig(precheck[0].personaId);

  await db.transaction(async (tx) => {
    // Lock the session row — prevents concurrent checkpoints from double-billing
    const locked = await tx.execute(
      sql`SELECT id, user_id, started_at::text as started_at, coins_charged FROM chat_sessions WHERE id = ${sessionId} AND status = 'active' FOR UPDATE`
    );
    if (locked.rows.length === 0) return;
    const row = locked.rows[0] as { id: string; user_id: string; started_at: string; coins_charged: number };

    const now = new Date();
    const startedAtParsed = parseUtc(row.started_at);
    const accumulatedSeconds = Math.floor((now.getTime() - startedAtParsed.getTime()) / 1000);

    // Deduct only completed full minutes (Math.floor avoids billing partial minutes early)
    const completedMinutes = Math.floor(accumulatedSeconds / 60);
    const newTotalCharged = completedMinutes * coinsPerMinute;
    const coinsToDeductNow = Math.max(0, newTotalCharged - Number(row.coins_charged));

    logger.info('checkpointSession', {
      sessionId,
      startedAtRaw: String(row.started_at),
      startedAtParsed: startedAtParsed.toISOString(),
      now: now.toISOString(),
      accumulatedSeconds,
      completedMinutes,
      coinsPerMinute,
      newTotalCharged,
      previouslyCharged: Number(row.coins_charged),
      coinsToDeductNow,
    });

    if (coinsToDeductNow > 0) {
      await tx.update(users)
        .set({
          coinBalance: sql`GREATEST(0, coin_balance - ${coinsToDeductNow})`,
          totalCoinsUsed: sql`total_coins_used + ${coinsToDeductNow}`,
          updatedAt: now,
        })
        .where(eq(users.id, row.user_id));
    }

    await tx.update(chatSessions)
      .set({
        durationSeconds: accumulatedSeconds,
        coinsCharged: newTotalCharged,
        lastHeartbeatAt: now,
        updatedAt: now,
      })
      .where(eq(chatSessions.id, sessionId));
  });
}

export async function endChatSession(sessionId: string): Promise<void> {
  // Fetch persona config before entering the transaction
  const precheck = await db.select({ personaId: chatSessions.personaId })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.status, 'active')))
    .limit(1);

  if (!precheck[0]) return;

  const { coinsPerMinute, timeoutMs } = await getPersonaConfig(precheck[0].personaId);

  await db.transaction(async (tx) => {
    // Lock the session row — prevents a concurrent checkpoint from billing after we've ended
    const locked = await tx.execute(
      sql`SELECT id, user_id, started_at::text as started_at, coins_charged, last_message_at::text as last_message_at FROM chat_sessions WHERE id = ${sessionId} AND status = 'active' FOR UPDATE`
    );
    if (locked.rows.length === 0) return;
    const row = locked.rows[0] as { id: string; user_id: string; started_at: string; coins_charged: number; last_message_at: string | null };

    const now = new Date();
    const startedAt = parseUtc(row.started_at);
    // Bill only up to the last real user activity — idle time beyond the timeout is free.
    const lastActivity = row.last_message_at ? parseUtc(row.last_message_at) : startedAt;
    const idleDuration = now.getTime() - lastActivity.getTime();
    const billingEnd = idleDuration > timeoutMs ? lastActivity : now;

    const accumulatedSeconds = Math.floor((billingEnd.getTime() - startedAt.getTime()) / 1000);

    // Round to nearest minute for the final charge (captures partial last minute)
    const totalMinutes = Math.round(accumulatedSeconds / 60);
    const finalCharge = totalMinutes * coinsPerMinute;
    const previouslyCharged = Number(row.coins_charged);

    if (finalCharge > previouslyCharged) {
      // Deduct remaining owed
      const remainingToDeduct = finalCharge - previouslyCharged;
      await tx.update(users)
        .set({
          coinBalance: sql`GREATEST(0, coin_balance - ${remainingToDeduct})`,
          totalCoinsUsed: sql`total_coins_used + ${remainingToDeduct}`,
          updatedAt: now,
        })
        .where(eq(users.id, row.user_id));
    } else if (finalCharge < previouslyCharged) {
      // Checkpoint over-billed (e.g. timezone bug) — refund the difference
      const refund = previouslyCharged - finalCharge;
      await tx.update(users)
        .set({
          coinBalance: sql`coin_balance + ${refund}`,
          totalCoinsUsed: sql`GREATEST(0, total_coins_used - ${refund})`,
          updatedAt: now,
        })
        .where(eq(users.id, row.user_id));
      logger.info('endChatSession: refunding over-billed coins', { sessionId, refund, previouslyCharged, finalCharge });
    }

    logger.info('endChatSession: final billing', {
      sessionId,
      startedAt: startedAt.toISOString(),
      lastActivity: lastActivity.toISOString(),
      billingEnd: billingEnd.toISOString(),
      accumulatedSeconds,
      totalMinutes,
      finalCharge,
      previouslyCharged,
      delta: finalCharge - previouslyCharged,
    });

    await tx.update(chatSessions)
      .set({
        status: 'ended',
        endedAt: billingEnd,
        durationSeconds: accumulatedSeconds,
        coinsCharged: finalCharge,
        lastHeartbeatAt: now,
        updatedAt: now,
      })
      .where(eq(chatSessions.id, sessionId));
  });
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
const HEARTBEAT_BATCH_SIZE = 50; // Max concurrent checkpoints — keeps DB connection use bounded
let heartbeatRunning = false;

export function startHeartbeat() {
  setInterval(async () => {
    if (heartbeatRunning) {
      logger.warn('Heartbeat: previous cycle still running, skipping');
      return;
    }
    heartbeatRunning = true;
    try {
      const active = await db.select({ id: chatSessions.id })
        .from(chatSessions)
        .where(and(
          eq(chatSessions.status, 'active'),
          isNull(chatSessions.endedAt),
        ));

      // Process in concurrent batches — avoids firing 200+ transactions simultaneously
      for (let i = 0; i < active.length; i += HEARTBEAT_BATCH_SIZE) {
        const batch = active.slice(i, i + HEARTBEAT_BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(s => checkpointSession(s.id)));
        results.forEach((result, idx) => {
          if (result.status === 'rejected') {
            logger.error('Heartbeat: checkpoint failed', {
              sessionId: batch[idx].id,
              error: (result.reason as Error).message,
            });
          }
        });
      }
    } catch (err) {
      logger.error('Heartbeat query failed', { error: (err as Error).message });
    } finally {
      heartbeatRunning = false;
    }
  }, 30000);
}

async function getPersonaConfig(personaId: string): Promise<{ timeoutMs: number; coinsPerMinute: number }> {
  try {
    const persona = await db.select({
      sessionTimeoutMinutes: personas.sessionTimeoutMinutes,
      coinsPerMinute: personas.coinsPerMinute,
    })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);
    const minutes = persona[0]?.sessionTimeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;
    const rate = persona[0]?.coinsPerMinute ?? COINS_PER_MINUTE;
    return { timeoutMs: minutes * 60 * 1000, coinsPerMinute: rate };
  } catch {
    return { timeoutMs: DEFAULT_INACTIVE_THRESHOLD_MS, coinsPerMinute: COINS_PER_MINUTE };
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
    const { timeoutMs, coinsPerMinute } = await getPersonaConfig(session.personaId);

    if (inactiveDuration > timeoutMs) {
      // Bill only up to the last real message, not wall-clock now.
      const accumulatedSeconds = Math.floor(
        (lastActivity.getTime() - session.startedAt.getTime()) / 1000
      );
      const totalMinutes = Math.round(accumulatedSeconds / 60);
      const totalCoins = totalMinutes * coinsPerMinute;
      // Delta: only deduct what checkpoints haven't already billed
      const remainingToDeduct = Math.max(0, totalCoins - session.coinsCharged);

      if (remainingToDeduct > 0) {
        await db.update(users)
          .set({
            coinBalance: sql`GREATEST(0, coin_balance - ${remainingToDeduct})`,
            totalCoinsUsed: sql`total_coins_used + ${remainingToDeduct}`,
            updatedAt: now,
          })
          .where(eq(users.id, session.userId));
      }

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
      const { timeoutMs, coinsPerMinute } = await getPersonaConfig(session.personaId);

      if (inactiveDuration < timeoutMs) {
        continue;
      }

      let sessionEnded = false;
      try {
        await db.transaction(async (tx) => {
          // Lock the row — prevents a concurrent heartbeat checkpoint from billing at the same time
          const locked = await tx.execute(
            sql`SELECT id, user_id, started_at::text as started_at, coins_charged, last_message_at::text as last_message_at FROM chat_sessions WHERE id = ${session.id} AND status = 'active' FOR UPDATE`
          );
          if (locked.rows.length === 0) return; // already ended by another process

          const row = locked.rows[0] as { id: string; user_id: string; started_at: string; coins_charged: number; last_message_at: string | null };
          const rowLastActivity = row.last_message_at ? parseUtc(row.last_message_at) : parseUtc(row.started_at);

          // Bill only up to the last real message (idle time is free).
          const accumulatedSeconds = Math.floor(
            (rowLastActivity.getTime() - parseUtc(row.started_at).getTime()) / 1000
          );
          const totalMinutes = Math.round(accumulatedSeconds / 60);
          const totalCoins = totalMinutes * coinsPerMinute;
          // Delta: only deduct what checkpoints haven't already billed (use fresh locked value)
          const remainingToDeduct = Math.max(0, totalCoins - Number(row.coins_charged));

          const now = new Date();
          if (remainingToDeduct > 0) {
            await tx.update(users)
              .set({
                coinBalance: sql`GREATEST(0, coin_balance - ${remainingToDeduct})`,
                totalCoinsUsed: sql`total_coins_used + ${remainingToDeduct}`,
                updatedAt: now,
              })
              .where(eq(users.id, row.user_id));
          }

          await tx.update(chatSessions)
            .set({
              status: 'ended',
              endedAt: rowLastActivity,
              durationSeconds: accumulatedSeconds,
              coinsCharged: totalCoins,
              updatedAt: now,
            })
            .where(eq(chatSessions.id, session.id));

          sessionEnded = true;
        });
      } catch (txErr) {
        logger.error('Cleanup: transaction failed for session', { sessionId: session.id, error: (txErr as Error).message });
        continue;
      }

      if (!sessionEnded) continue;

      logger.info('Cleanup: auto-ended inactive session', {
        sessionId: session.id,
        personaId: session.personaId,
        inactiveMinutes: Math.round(inactiveDuration / 60000),
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
