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

  logger.info('startChatSession: found existing active sessions', { count: existing.length, sessions: existing.map(s => ({ id: s.id, personaId: s.personaId })) });

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

/**
 * Checkpoint: compute elapsed time ENTIRELY in PostgreSQL and bill accordingly.
 * This avoids ALL JavaScript timestamp parsing — PostgreSQL handles the math.
 */
export async function checkpointSession(sessionId: string): Promise<void> {
  // Fetch persona config before entering the transaction to minimise lock hold time
  const precheck = await db.select({ personaId: chatSessions.personaId })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.status, 'active')))
    .limit(1);

  if (!precheck[0]) return;

  const { coinsPerMinute } = await getPersonaConfig(precheck[0].personaId);

  await db.transaction(async (tx) => {
    // Lock the session row — prevents concurrent checkpoints from double-billing.
    // EXTRACT(EPOCH FROM ...) computes elapsed seconds IN POSTGRESQL — no JS timestamp parsing.
    const locked = await tx.execute(
      sql`SELECT id, user_id, coins_charged,
                 EXTRACT(EPOCH FROM (NOW() - started_at))::int as elapsed_seconds
          FROM chat_sessions
          WHERE id = ${sessionId} AND status = 'active'
          FOR UPDATE`
    );
    if (locked.rows.length === 0) return;
    const row = locked.rows[0] as { id: string; user_id: string; coins_charged: number; elapsed_seconds: number };

    const accumulatedSeconds = Math.max(0, row.elapsed_seconds);

    // Deduct only completed full minutes (Math.floor avoids billing partial minutes early)
    const completedMinutes = Math.floor(accumulatedSeconds / 60);
    const newTotalCharged = completedMinutes * coinsPerMinute;
    const coinsToDeductNow = Math.max(0, newTotalCharged - Number(row.coins_charged));

    logger.info('checkpointSession', {
      sessionId,
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
          updatedAt: sql`NOW()`,
        })
        .where(eq(users.id, row.user_id));
    }

    await tx.update(chatSessions)
      .set({
        durationSeconds: accumulatedSeconds,
        coinsCharged: newTotalCharged,
        lastHeartbeatAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(chatSessions.id, sessionId));
  });
}

/**
 * End a chat session. Computes final billing ENTIRELY in PostgreSQL.
 * If checkpoint over-billed, refunds the difference.
 */
export async function endChatSession(sessionId: string): Promise<void> {
  // Fetch persona config before entering the transaction
  const precheck = await db.select({ personaId: chatSessions.personaId })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.status, 'active')))
    .limit(1);

  if (!precheck[0]) return;

  const { coinsPerMinute, timeoutMs } = await getPersonaConfig(precheck[0].personaId);
  const timeoutSeconds = Math.floor(timeoutMs / 1000);

  await db.transaction(async (tx) => {
    // Lock the session row. All time math computed in PostgreSQL:
    // - elapsed_seconds: total wall-clock time since start
    // - idle_seconds: time since last message (NULL if no messages)
    // - active_seconds: time from start to last message (0 if no messages)
    const locked = await tx.execute(
      sql`SELECT id, user_id, coins_charged,
                 EXTRACT(EPOCH FROM (NOW() - started_at))::int as elapsed_seconds,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (NOW() - last_message_at))::int
                      ELSE NULL END as idle_seconds,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (last_message_at - started_at))::int
                      ELSE 0 END as active_seconds
          FROM chat_sessions
          WHERE id = ${sessionId} AND status = 'active'
          FOR UPDATE`
    );
    if (locked.rows.length === 0) return;
    const row = locked.rows[0] as {
      id: string; user_id: string; coins_charged: number;
      elapsed_seconds: number; idle_seconds: number | null; active_seconds: number;
    };

    // Bill up to last activity if idle beyond timeout, otherwise bill full elapsed time
    const idleSeconds = row.idle_seconds ?? row.elapsed_seconds;
    const billableSeconds = idleSeconds > timeoutSeconds
      ? Math.max(0, row.active_seconds)  // idle too long — bill only active time
      : Math.max(0, row.elapsed_seconds); // still active — bill full elapsed

    // Round to nearest minute for the final charge
    const totalMinutes = Math.round(billableSeconds / 60);
    const finalCharge = totalMinutes * coinsPerMinute;
    const previouslyCharged = Number(row.coins_charged);

    if (finalCharge > previouslyCharged) {
      // Deduct remaining owed
      const remainingToDeduct = finalCharge - previouslyCharged;
      await tx.update(users)
        .set({
          coinBalance: sql`GREATEST(0, coin_balance - ${remainingToDeduct})`,
          totalCoinsUsed: sql`total_coins_used + ${remainingToDeduct}`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(users.id, row.user_id));
    } else if (finalCharge < previouslyCharged) {
      // Checkpoint over-billed — refund the difference
      const refund = previouslyCharged - finalCharge;
      await tx.update(users)
        .set({
          coinBalance: sql`coin_balance + ${refund}`,
          totalCoinsUsed: sql`GREATEST(0, total_coins_used - ${refund})`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(users.id, row.user_id));
      logger.info('endChatSession: refunding over-billed coins', { sessionId, refund, previouslyCharged, finalCharge });
    }

    logger.info('endChatSession: final billing', {
      sessionId,
      elapsedSeconds: row.elapsed_seconds,
      idleSeconds,
      activeSeconds: row.active_seconds,
      billableSeconds,
      totalMinutes,
      finalCharge,
      previouslyCharged,
      delta: finalCharge - previouslyCharged,
    });

    // Use CASE to set ended_at to last_message_at (if idle timed out) or NOW()
    await tx.execute(
      sql`UPDATE chat_sessions SET
            status = 'ended',
            ended_at = CASE
              WHEN last_message_at IS NOT NULL
                   AND EXTRACT(EPOCH FROM (NOW() - last_message_at)) > ${timeoutSeconds}
              THEN last_message_at
              ELSE NOW()
            END,
            duration_seconds = ${billableSeconds},
            coins_charged = ${finalCharge},
            last_heartbeat_at = NOW(),
            updated_at = NOW()
          WHERE id = ${sessionId}`
    );
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
 * Uses PostgreSQL EXTRACT(EPOCH FROM ...) to avoid JS timestamp parsing.
 */
export async function recoverActiveSessions(): Promise<void> {
  // Use raw SQL to compute durations in PostgreSQL
  const active = await db.execute(
    sql`SELECT id, user_id, persona_id, coins_charged,
               EXTRACT(EPOCH FROM (NOW() - started_at))::int as elapsed_seconds,
               CASE WHEN last_message_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (NOW() - last_message_at))::int
                    ELSE EXTRACT(EPOCH FROM (NOW() - started_at))::int
               END as idle_seconds,
               CASE WHEN last_message_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (last_message_at - started_at))::int
                    ELSE 0 END as active_seconds
        FROM chat_sessions
        WHERE status = 'active' AND ended_at IS NULL`
  );

  if (active.rows.length === 0) {
    logger.info('No active sessions to recover');
    return;
  }

  logger.info('Recovering active sessions', { count: active.rows.length });

  for (const row of active.rows as Array<{
    id: string; user_id: string; persona_id: string; coins_charged: number;
    elapsed_seconds: number; idle_seconds: number; active_seconds: number;
  }>) {
    const { timeoutMs, coinsPerMinute } = await getPersonaConfig(row.persona_id);
    const timeoutSeconds = Math.floor(timeoutMs / 1000);

    if (row.idle_seconds > timeoutSeconds) {
      // Session timed out — bill only active time
      const billableSeconds = Math.max(0, row.active_seconds);
      const totalMinutes = Math.round(billableSeconds / 60);
      const totalCoins = totalMinutes * coinsPerMinute;
      const remainingToDeduct = Math.max(0, totalCoins - Number(row.coins_charged));

      if (remainingToDeduct > 0) {
        await db.update(users)
          .set({
            coinBalance: sql`GREATEST(0, coin_balance - ${remainingToDeduct})`,
            totalCoinsUsed: sql`total_coins_used + ${remainingToDeduct}`,
            updatedAt: sql`NOW()`,
          })
          .where(eq(users.id, row.user_id));
      }

      // Set ended_at to last_message_at (or started_at if no messages)
      await db.execute(
        sql`UPDATE chat_sessions SET
              status = 'ended',
              ended_at = COALESCE(last_message_at, started_at),
              duration_seconds = ${billableSeconds},
              coins_charged = ${totalCoins},
              updated_at = NOW()
            WHERE id = ${row.id}`
      );

      logger.info('Auto-ended stale session', {
        sessionId: row.id,
        idleSeconds: row.idle_seconds,
        billableSeconds,
        totalCoins,
        remainingToDeduct,
      });

      sendTimeoutNotification(row.id).catch(err =>
        logger.error('Failed to send timeout email during recovery', { sessionId: row.id, error: (err as Error).message })
      );
    } else {
      await db.execute(
        sql`UPDATE chat_sessions SET last_heartbeat_at = NOW(), updated_at = NOW() WHERE id = ${row.id}`
      );
      logger.info('Recovered session', { sessionId: row.id });
    }
  }
}

/**
 * Background job: auto-end sessions that have exceeded their persona's timeout.
 * Uses PostgreSQL EXTRACT(EPOCH FROM ...) for all time math.
 */
export async function cleanupInactiveSessions(): Promise<number> {
  let endedCount = 0;

  try {
    const conservativeSeconds = DEFAULT_TIMEOUT_MINUTES * 60;

    // Find sessions with idle time beyond the conservative cutoff
    const stale = await db.execute(
      sql`SELECT id, user_id, persona_id, coins_charged,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (NOW() - last_message_at))::int
                      ELSE EXTRACT(EPOCH FROM (NOW() - started_at))::int
                 END as idle_seconds,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (last_message_at - started_at))::int
                      ELSE 0 END as active_seconds
          FROM chat_sessions
          WHERE status = 'active' AND ended_at IS NULL
            AND (
              (last_message_at IS NOT NULL AND EXTRACT(EPOCH FROM (NOW() - last_message_at)) > ${conservativeSeconds})
              OR
              (last_message_at IS NULL AND EXTRACT(EPOCH FROM (NOW() - started_at)) > ${conservativeSeconds})
            )`
    );

    for (const row of stale.rows as Array<{
      id: string; user_id: string; persona_id: string; coins_charged: number;
      idle_seconds: number; active_seconds: number;
    }>) {
      const { timeoutMs, coinsPerMinute } = await getPersonaConfig(row.persona_id);
      const timeoutSeconds = Math.floor(timeoutMs / 1000);

      if (row.idle_seconds < timeoutSeconds) {
        continue;
      }

      try {
        await db.transaction(async (tx) => {
          // Lock the row — prevents a concurrent heartbeat checkpoint from billing at the same time
          const locked = await tx.execute(
            sql`SELECT id, user_id, coins_charged,
                       CASE WHEN last_message_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (last_message_at - started_at))::int
                            ELSE 0 END as active_seconds
                FROM chat_sessions
                WHERE id = ${row.id} AND status = 'active'
                FOR UPDATE`
          );
          if (locked.rows.length === 0) return; // already ended by another process

          const lockedRow = locked.rows[0] as { id: string; user_id: string; coins_charged: number; active_seconds: number };

          const billableSeconds = Math.max(0, lockedRow.active_seconds);
          const totalMinutes = Math.round(billableSeconds / 60);
          const totalCoins = totalMinutes * coinsPerMinute;
          const remainingToDeduct = Math.max(0, totalCoins - Number(lockedRow.coins_charged));

          if (remainingToDeduct > 0) {
            await tx.update(users)
              .set({
                coinBalance: sql`GREATEST(0, coin_balance - ${remainingToDeduct})`,
                totalCoinsUsed: sql`total_coins_used + ${remainingToDeduct}`,
                updatedAt: sql`NOW()`,
              })
              .where(eq(users.id, lockedRow.user_id));
          }

          await tx.execute(
            sql`UPDATE chat_sessions SET
                  status = 'ended',
                  ended_at = COALESCE(last_message_at, started_at),
                  duration_seconds = ${billableSeconds},
                  coins_charged = ${totalCoins},
                  last_heartbeat_at = NOW(),
                  updated_at = NOW()
                WHERE id = ${row.id}`
          );

          endedCount++;
        });
      } catch (txErr) {
        logger.error('Cleanup: transaction failed for session', { sessionId: row.id, error: (txErr as Error).message });
        continue;
      }

      logger.info('Cleanup: auto-ended inactive session', {
        sessionId: row.id,
        personaId: row.persona_id,
        idleSeconds: row.idle_seconds,
      });

      sendTimeoutNotification(row.id).catch(err =>
        logger.error('Failed to send timeout email', { sessionId: row.id, error: (err as Error).message })
      );
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
