import { db, pool } from './db';
import { users, chatSessions, personas } from '@shared/schema';
import { eq, sql, and, isNull, lt, or } from 'drizzle-orm';
import { getPersonaPricing } from './personaPricing';
import { sendSessionTimeoutEmail } from './sessionTimeoutEmail';
import { COINS_PER_MINUTE, BILLING_INTERVAL_SECONDS, secondsToCoins } from '@shared/types';
import logger from './logger';

const DEFAULT_TIMEOUT_MINUTES = 5;
const DEFAULT_INACTIVE_THRESHOLD_MS = DEFAULT_TIMEOUT_MINUTES * 60 * 1000;

// Safety cap: never bill more than 30 minutes per session regardless of elapsed time.
// If elapsed_seconds exceeds this, something is wrong (timezone drift, orphan, clock skew).
// At 60 coins/min, 30 min = 1800 coins — prevents draining large balances in one shot.
const MAX_BILLABLE_SECONDS = 30 * 60; // 30 minutes

// Per-checkpoint deduction guard: never deduct more than 3 minutes' worth in a single
// checkpoint/heartbeat cycle (heartbeat runs every 30s, so even 2 min is generous).
const MAX_COINS_PER_DEDUCTION = 3 * 60; // 180 coins

function capBillableSeconds(seconds: number, sessionId: string): number {
  if (seconds > MAX_BILLABLE_SECONDS) {
    logger.error('BILLING_ANOMALY: elapsed seconds exceeds safety cap', {
      sessionId,
      rawSeconds: seconds,
      cappedTo: MAX_BILLABLE_SECONDS,
    });
    return MAX_BILLABLE_SECONDS;
  }
  return seconds;
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
  // Verify balance with direct pool query to prevent stale reads from pgbouncer
  const { rows: startBalRows } = await pool.query(
    'SELECT coin_balance FROM users WHERE id = $1', [userId]
  );
  const startPoolBalance = Number(startBalRows[0]?.coin_balance ?? 0);
  const startEffBalance = Math.max(user[0]?.coinBalance ?? 0, startPoolBalance);

  if (!user[0] || startEffBalance <= 0) {
    throw new Error('OUT_OF_CREDITS');
  }

  logger.info('startChatSession: starting', { userId, personaId, drizzleBalance: user[0].coinBalance, poolBalance: startPoolBalance });

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

  // Force-close stale sessions WITHOUT additional billing.
  // The checkpoint system already billed what it could during each session's lifetime.
  // Using endChatSession here would compute "catch-up" billing on orphaned sessions
  // that have been stuck as "active" for hours/days, draining all the user's credits.
  if (existing.length > 0) {
    for (const old of existing) {
      try {
        await db.execute(
          sql`UPDATE chat_sessions SET
                status = 'ended',
                ended_at = COALESCE(last_message_at, started_at, (NOW() AT TIME ZONE 'UTC')),
                updated_at = (NOW() AT TIME ZONE 'UTC')
              WHERE id = ${old.id} AND status = 'active'`
        );
        logger.info('startChatSession: force-closed stale session (no extra billing)', { sessionId: old.id, userId });
      } catch (err) {
        logger.error('startChatSession: failed to close stale session', { sessionId: old.id, error: (err as Error).message });
      }
    }
  }

  const [pricing, personaRow] = await Promise.all([
    getPersonaPricing(personaId),
    db.select({ coinsPerMinute: personas.coinsPerMinute }).from(personas).where(eq(personas.id, personaId)).limit(1),
  ]);

  // Use raw SQL to ensure started_at is always in UTC, regardless of connection timezone.
  // This prevents timezone drift on Supabase's pgbouncer transaction pooler.
  const session = await db.execute(
    sql`INSERT INTO chat_sessions (user_id, persona_id, status, pricing_applied, last_heartbeat_at, duration_seconds, coins_charged, started_at, created_at)
        VALUES (${userId}, ${personaId}, 'active',
                ${JSON.stringify({ ...pricing, coinsPerMinute: personaRow[0]?.coinsPerMinute ?? 60 })},
                (NOW() AT TIME ZONE 'UTC'), 0, 0,
                (NOW() AT TIME ZONE 'UTC'), (NOW() AT TIME ZONE 'UTC'))
        RETURNING id`
  );

  const sessionId = (session.rows[0] as any)?.id;
  if (!sessionId) throw new Error('Failed to create chat session');

  logger.info('startChatSession: created session', { sessionId, userId, personaId });
  return sessionId;
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

  const { coinsPerMinute, timeoutMs } = await getPersonaConfig(precheck[0].personaId);
  const timeoutSeconds = Math.floor(timeoutMs / 1000);

  await db.transaction(async (tx) => {
    // Lock the session row — prevents concurrent checkpoints from double-billing.
    // Compute both total elapsed and idle time so we can cap billing at last_message_at
    // when the user has gone idle beyond the timeout threshold.
    const locked = await tx.execute(
      sql`SELECT id, user_id, coins_charged,
                 EXTRACT(EPOCH FROM (NOW() - (started_at AT TIME ZONE 'UTC')))::int as total_elapsed,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (NOW() - (last_message_at AT TIME ZONE 'UTC')))::int
                      ELSE EXTRACT(EPOCH FROM (NOW() - (started_at AT TIME ZONE 'UTC')))::int
                 END as idle_seconds,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM ((last_message_at AT TIME ZONE 'UTC') - (started_at AT TIME ZONE 'UTC')))::int
                      ELSE 0 END as active_seconds
          FROM chat_sessions
          WHERE id = ${sessionId} AND status = 'active'
          FOR UPDATE`
    );
    if (locked.rows.length === 0) return;
    const row = locked.rows[0] as {
      id: string; user_id: string; coins_charged: number;
      total_elapsed: number; idle_seconds: number; active_seconds: number;
    };

    // If idle beyond timeout, only bill up to last_message_at (active time).
    // This prevents the heartbeat from endlessly billing idle/orphaned sessions.
    const rawBillable = row.idle_seconds > timeoutSeconds
      ? Math.max(0, row.active_seconds)
      : Math.max(0, row.total_elapsed);
    const accumulatedSeconds = capBillableSeconds(rawBillable, sessionId);

    // Bill in 15-second blocks (e.g. 15 coins per 15s at 60 coins/min)
    const newTotalCharged = secondsToCoins(accumulatedSeconds, coinsPerMinute);
    const coinsToDeductNow = Math.max(0, newTotalCharged - Number(row.coins_charged));

    logger.info('checkpointSession', {
      sessionId,
      totalElapsed: row.total_elapsed,
      idleSeconds: row.idle_seconds,
      activeSeconds: row.active_seconds,
      idleCapped: row.idle_seconds > timeoutSeconds,
      accumulatedSeconds,
      billingIntervalSeconds: BILLING_INTERVAL_SECONDS,
      coinsPerMinute,
      newTotalCharged,
      previouslyCharged: Number(row.coins_charged),
      coinsToDeductNow,
    });

    let actualDeduction = 0;
    if (coinsToDeductNow > 0) {
      // Safety guard: if a single deduction exceeds MAX_COINS_PER_DEDUCTION, something is
      // wrong (timezone drift, orphan session). Log an anomaly and cap the deduction.
      let safeDeduction = coinsToDeductNow;
      if (coinsToDeductNow > MAX_COINS_PER_DEDUCTION) {
        logger.error('BILLING_ANOMALY: checkpoint deduction exceeds per-cycle cap', {
          sessionId,
          requestedDeduction: coinsToDeductNow,
          cappedTo: MAX_COINS_PER_DEDUCTION,
          rawElapsed: row.total_elapsed,
          previouslyCharged: Number(row.coins_charged),
        });
        safeDeduction = MAX_COINS_PER_DEDUCTION;
      }

      // Read and lock user balance — FOR UPDATE prevents concurrent deductions
      const beforeBalance = await tx.execute(
        sql`SELECT coin_balance FROM users WHERE id = ${row.user_id} FOR UPDATE`
      );
      const balanceBefore = Number((beforeBalance.rows[0] as any)?.coin_balance ?? 0);

      // Cap deduction at user's actual balance — never charge more than they have
      actualDeduction = Math.min(safeDeduction, balanceBefore);

      if (actualDeduction > 0) {
        await tx.execute(
          sql`UPDATE users SET
                coin_balance = coin_balance - ${actualDeduction},
                total_coins_used = total_coins_used + ${actualDeduction},
                updated_at = (NOW() AT TIME ZONE 'UTC')
              WHERE id = ${row.user_id}`
        );
      }

      logger.info('checkpointSession: deducted coins', {
        sessionId,
        userId: row.user_id,
        balanceBefore,
        requested: safeDeduction,
        actualDeduction,
        cappedByBalance: safeDeduction > balanceBefore,
      });
    }

    // Track the ACTUAL amount deducted (not the theoretical target) so future
    // checkpoints correctly compute the delta. This prevents over-counting when
    // deduction was capped by MAX_COINS_PER_DEDUCTION or user balance.
    const actualTotalCharged = Number(row.coins_charged) + actualDeduction;

    // Use raw SQL (NOT Drizzle ORM) to bypass potential ORM serialization bugs.
    // Drizzle's .set() was suspected of writing wrong values for integer columns
    // when mixed with sql`` template literals for timestamp columns.
    await tx.execute(
      sql`UPDATE chat_sessions SET
            duration_seconds = ${accumulatedSeconds},
            coins_charged = ${actualTotalCharged},
            last_heartbeat_at = (NOW() AT TIME ZONE 'UTC'),
            updated_at = (NOW() AT TIME ZONE 'UTC')
          WHERE id = ${sessionId}`
    );

    // Verify within transaction
    const verify = await tx.execute(
      sql`SELECT coins_charged, duration_seconds FROM chat_sessions WHERE id = ${sessionId}`
    );
    logger.info('checkpointSession VERIFY after write', {
      sessionId,
      wrote: { duration: accumulatedSeconds, coins: actualTotalCharged },
      readBack: verify.rows[0],
    });
  });

  // POST-COMMIT verification: read back OUTSIDE the transaction to catch any
  // external actor (trigger, replication, ORM bug) that modifies values after commit.
  const postCommit = await db.execute(
    sql`SELECT coins_charged, duration_seconds FROM chat_sessions WHERE id = ${sessionId}`
  );
  const pc = postCommit.rows[0] as { coins_charged: number; duration_seconds: number } | undefined;
  const maxBillableCoins = secondsToCoins(MAX_BILLABLE_SECONDS);
  if (pc && (pc.coins_charged > maxBillableCoins || pc.duration_seconds > MAX_BILLABLE_SECONDS)) {
    logger.error('BILLING_CORRUPTION_DETECTED: post-commit values exceed safety cap', {
      sessionId,
      postCommitCoins: pc.coins_charged,
      postCommitDuration: pc.duration_seconds,
      maxAllowedCoins: maxBillableCoins,
      maxAllowedSeconds: MAX_BILLABLE_SECONDS,
    });
    // NUCLEAR FIX: force correct the corrupted values
    await db.execute(
      sql`UPDATE chat_sessions SET
            coins_charged = LEAST(coins_charged, ${maxBillableCoins}),
            duration_seconds = LEAST(duration_seconds, ${MAX_BILLABLE_SECONDS})
          WHERE id = ${sessionId}`
    );
    logger.info('BILLING_CORRUPTION_FIXED: capped values to safety max', { sessionId });
  }
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
    // Lock the session row. Use NOW() (timestamptz) for subtractions so both sides
    // are the same type — avoids session-timezone conversion bugs with pgbouncer.
    // (col AT TIME ZONE 'UTC') converts timestamp→timestamptz, so
    // NOW() - (col AT TIME ZONE 'UTC') is always timestamptz - timestamptz = correct interval.
    const locked = await tx.execute(
      sql`SELECT id, user_id, coins_charged,
                 EXTRACT(EPOCH FROM (NOW() - (started_at AT TIME ZONE 'UTC')))::int as elapsed_seconds,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (NOW() - (last_message_at AT TIME ZONE 'UTC')))::int
                      ELSE NULL END as idle_seconds,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM ((last_message_at AT TIME ZONE 'UTC') - (started_at AT TIME ZONE 'UTC')))::int
                      ELSE 0 END as active_seconds
          FROM chat_sessions
          WHERE id = ${sessionId} AND status = 'active'
          FOR UPDATE`
    );
    if (locked.rows.length === 0) return;
    const rawRow = locked.rows[0] as Record<string, unknown>;
    logger.info('endChatSession DEBUG: raw row from DB', { sessionId, rawRow: JSON.stringify(rawRow) });
    const row = rawRow as {
      id: string; user_id: string; coins_charged: number;
      elapsed_seconds: number; idle_seconds: number | null; active_seconds: number;
    };

    // Bill up to last activity if idle beyond timeout, otherwise bill full elapsed time
    const idleSeconds = row.idle_seconds ?? row.elapsed_seconds;
    const rawBillable = idleSeconds > timeoutSeconds
      ? Math.max(0, row.active_seconds)  // idle too long — bill only active time
      : Math.max(0, row.elapsed_seconds); // still active — bill full elapsed
    const billableSeconds = capBillableSeconds(rawBillable, sessionId);

    // Bill in 15-second blocks — consistent with checkpointSession
    const finalCharge = secondsToCoins(billableSeconds, coinsPerMinute);
    const previouslyCharged = Number(row.coins_charged);

    // Read and lock user balance
    const beforeBalance = await tx.execute(
      sql`SELECT coin_balance FROM users WHERE id = ${row.user_id} FOR UPDATE`
    );
    const balanceBefore = Number((beforeBalance.rows[0] as any)?.coin_balance ?? 0);

    let actualSessionCharged = previouslyCharged;
    if (finalCharge > previouslyCharged) {
      // Deduct remaining owed — cap at user's actual balance
      const remainingToDeduct = finalCharge - previouslyCharged;
      const actualDeduction = Math.min(remainingToDeduct, balanceBefore);

      if (actualDeduction > 0) {
        await tx.execute(
          sql`UPDATE users SET
                coin_balance = coin_balance - ${actualDeduction},
                total_coins_used = total_coins_used + ${actualDeduction},
                updated_at = (NOW() AT TIME ZONE 'UTC')
              WHERE id = ${row.user_id}`
        );
      }
      actualSessionCharged = previouslyCharged + actualDeduction;

      logger.info('endChatSession: deducted coins', {
        sessionId, userId: row.user_id, balanceBefore,
        requested: remainingToDeduct, actualDeduction,
        cappedByBalance: remainingToDeduct > balanceBefore,
      });
    } else if (finalCharge < previouslyCharged) {
      // Checkpoint over-billed — refund the difference
      const refund = previouslyCharged - finalCharge;
      await tx.execute(
        sql`UPDATE users SET
              coin_balance = coin_balance + ${refund},
              total_coins_used = GREATEST(0, total_coins_used - ${refund}),
              updated_at = (NOW() AT TIME ZONE 'UTC')
            WHERE id = ${row.user_id}`
      );
      actualSessionCharged = finalCharge;
      logger.info('endChatSession: refunding over-billed coins', {
        sessionId, refund, previouslyCharged, finalCharge, balanceBefore,
      });
    }

    logger.info('endChatSession: final billing', {
      sessionId,
      userId: row.user_id,
      balanceBefore,
      elapsedSeconds: row.elapsed_seconds,
      idleSeconds,
      activeSeconds: row.active_seconds,
      billableSeconds,
      billingIntervalSeconds: BILLING_INTERVAL_SECONDS,
      coinsPerMinute,
      finalCharge,
      previouslyCharged,
      actualSessionCharged,
    });

    // Use CASE to set ended_at to last_message_at (if idle timed out) or NOW()
    // coins_charged reflects only what was actually deducted from the user
    await tx.execute(
      sql`UPDATE chat_sessions SET
            status = 'ended',
            ended_at = CASE
              WHEN last_message_at IS NOT NULL
                   AND EXTRACT(EPOCH FROM (NOW() - (last_message_at AT TIME ZONE 'UTC'))) > ${timeoutSeconds}
              THEN last_message_at
              ELSE (NOW() AT TIME ZONE 'UTC')
            END,
            duration_seconds = ${billableSeconds},
            coins_charged = ${actualSessionCharged},
            last_heartbeat_at = (NOW() AT TIME ZONE 'UTC'),
            updated_at = (NOW() AT TIME ZONE 'UTC')
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
 * Force-closes all orphaned sessions WITHOUT additional billing.
 * The checkpoint system already billed incrementally during each session's lifetime.
 * Attempting "catch-up" billing on old sessions risks draining users' credits due to
 * timezone issues, stale timestamps, or sessions orphaned for hours/days.
 */
export async function recoverActiveSessions(): Promise<void> {
  const active = await db.execute(
    sql`SELECT id, user_id, persona_id
        FROM chat_sessions
        WHERE status = 'active' AND ended_at IS NULL`
  );

  if (active.rows.length === 0) {
    logger.info('No active sessions to recover');
    return;
  }

  logger.info('Recovering active sessions (force-close, no extra billing)', { count: active.rows.length });

  for (const row of active.rows as Array<{ id: string; user_id: string; persona_id: string }>) {
    try {
      await db.execute(
        sql`UPDATE chat_sessions SET
              status = 'ended',
              ended_at = COALESCE(last_message_at, started_at, (NOW() AT TIME ZONE 'UTC')),
              updated_at = (NOW() AT TIME ZONE 'UTC')
            WHERE id = ${row.id} AND status = 'active'`
      );
      logger.info('Force-closed orphaned session on startup', { sessionId: row.id, userId: row.user_id });
    } catch (err) {
      logger.error('Failed to close orphaned session on startup', { sessionId: row.id, error: (err as Error).message });
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

    // Find sessions with idle time beyond the conservative cutoff.
    // Use NOW() (timestamptz) for subtractions — both sides are timestamptz, immune to session tz.
    const stale = await db.execute(
      sql`SELECT id, user_id, persona_id, coins_charged,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (NOW() - (last_message_at AT TIME ZONE 'UTC')))::int
                      ELSE EXTRACT(EPOCH FROM (NOW() - (started_at AT TIME ZONE 'UTC')))::int
                 END as idle_seconds,
                 CASE WHEN last_message_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM ((last_message_at AT TIME ZONE 'UTC') - (started_at AT TIME ZONE 'UTC')))::int
                      ELSE 0 END as active_seconds
          FROM chat_sessions
          WHERE status = 'active' AND ended_at IS NULL
            AND (
              (last_message_at IS NOT NULL AND EXTRACT(EPOCH FROM (NOW() - (last_message_at AT TIME ZONE 'UTC'))) > ${conservativeSeconds})
              OR
              (last_message_at IS NULL AND EXTRACT(EPOCH FROM (NOW() - (started_at AT TIME ZONE 'UTC'))) > ${conservativeSeconds})
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
          // ALL timestamp columns use AT TIME ZONE 'UTC' casts — immune to session timezone
          const locked = await tx.execute(
            sql`SELECT id, user_id, coins_charged,
                       CASE WHEN last_message_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM ((last_message_at AT TIME ZONE 'UTC') - (started_at AT TIME ZONE 'UTC')))::int
                            ELSE 0 END as active_seconds
                FROM chat_sessions
                WHERE id = ${row.id} AND status = 'active'
                FOR UPDATE`
          );
          if (locked.rows.length === 0) return; // already ended by another process

          const lockedRow = locked.rows[0] as { id: string; user_id: string; coins_charged: number; active_seconds: number };

          const billableSeconds = capBillableSeconds(Math.max(0, lockedRow.active_seconds), row.id);
          const totalMinutes = Math.floor(billableSeconds / 60);
          const totalCoins = totalMinutes * coinsPerMinute;
          const remainingToDeduct = Math.max(0, totalCoins - Number(lockedRow.coins_charged));

          // Read and lock user balance — cap deduction at what they actually have
          const userBalResult = await tx.execute(
            sql`SELECT coin_balance FROM users WHERE id = ${lockedRow.user_id} FOR UPDATE`
          );
          const userBalance = Number((userBalResult.rows[0] as any)?.coin_balance ?? 0);
          const actualDeduction = Math.min(remainingToDeduct, userBalance);

          if (actualDeduction > 0) {
            await tx.execute(
              sql`UPDATE users SET
                    coin_balance = coin_balance - ${actualDeduction},
                    total_coins_used = total_coins_used + ${actualDeduction},
                    updated_at = (NOW() AT TIME ZONE 'UTC')
                  WHERE id = ${lockedRow.user_id}`
            );
          }

          const actualSessionCharged = Number(lockedRow.coins_charged) + actualDeduction;
          await tx.execute(
            sql`UPDATE chat_sessions SET
                  status = 'ended',
                  ended_at = COALESCE(last_message_at, started_at),
                  duration_seconds = ${billableSeconds},
                  coins_charged = ${actualSessionCharged},
                  last_heartbeat_at = (NOW() AT TIME ZONE 'UTC'),
                  updated_at = (NOW() AT TIME ZONE 'UTC')
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
