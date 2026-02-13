import { db } from './db';
import { users, chatSessions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { getPersonaPricing } from './personaPricing';

interface SessionTimer {
  sessionId: string;
  userId: string;
  personaId: string;
  startTime: Date;
  lastCheckpoint: Date;
  accumulatedSeconds: number;
}

// In-memory session state (use Redis in production for distributed systems)
const activeSessions = new Map<string, SessionTimer>();

export function getActiveSession(sessionId: string): SessionTimer | undefined {
  return activeSessions.get(sessionId);
}

export async function startChatSession(userId: string, personaId: string): Promise<string> {
  // Check credits
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0] || user[0].creditMinutes <= 0) {
    throw new Error('OUT_OF_CREDITS');
  }

  // Load persona pricing for audit trail
  const pricing = await getPersonaPricing(personaId);

  // Create session with pricing snapshot
  const session = await db.insert(chatSessions).values({
    userId,
    personaId,
    status: 'active',
    pricingApplied: JSON.stringify(pricing),
  }).returning();

  // Start timer
  const now = new Date();
  activeSessions.set(session[0].id, {
    sessionId: session[0].id,
    userId,
    personaId,
    startTime: now,
    lastCheckpoint: now,
    accumulatedSeconds: 0,
  });

  return session[0].id;
}

export async function checkpointSession(sessionId: string): Promise<void> {
  const timer = activeSessions.get(sessionId);
  if (!timer) return;

  const now = new Date();
  const elapsed = (now.getTime() - timer.lastCheckpoint.getTime()) / 1000;
  timer.accumulatedSeconds += elapsed;
  timer.lastCheckpoint = now;

  // Update DB every checkpoint (every 30 seconds via heartbeat)
  const totalMinutes = Math.floor(timer.accumulatedSeconds / 60);
  await db.update(chatSessions)
    .set({
      durationSeconds: Math.floor(timer.accumulatedSeconds),
      minutesCharged: totalMinutes,
      updatedAt: now,
    })
    .where(eq(chatSessions.id, sessionId));
}

export async function endChatSession(sessionId: string): Promise<void> {
  const timer = activeSessions.get(sessionId);
  if (!timer) return;

  // Final checkpoint
  await checkpointSession(sessionId);

  const totalMinutes = Math.ceil(timer.accumulatedSeconds / 60);

  // Deduct credits
  await db.update(users)
    .set({
      creditMinutes: sql`GREATEST(0, credit_minutes - ${totalMinutes})`,
      totalMinutesUsed: sql`total_minutes_used + ${totalMinutes}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, timer.userId));

  // Mark session ended
  const now = new Date();
  await db.update(chatSessions)
    .set({
      status: 'ended',
      endedAt: now,
      durationSeconds: Math.floor(timer.accumulatedSeconds),
      minutesCharged: totalMinutes,
      updatedAt: now,
    })
    .where(eq(chatSessions.id, sessionId));

  activeSessions.delete(sessionId);
}

export async function getRemainingMinutes(userId: string): Promise<number> {
  const user = await db.select({ creditMinutes: users.creditMinutes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user[0]?.creditMinutes ?? 0;
}

// Heartbeat: checkpoint all active sessions every 30 seconds
export function startHeartbeat() {
  setInterval(() => {
    activeSessions.forEach((_timer, sessionId) => {
      checkpointSession(sessionId).catch(err =>
        console.error(`Checkpoint failed for ${sessionId}:`, err)
      );
    });
  }, 30000);
}
