// Session wall-clock limit — bounds how long ONE chat session may live.
//
// WHY THIS EXISTS
// ---------------
// MAX_BILLABLE_SECONDS (creditTracking.ts:18) caps BILLING at 30 minutes, not the
// session. Past that point coinsToDeductNow is permanently 0, so the customer's
// balance stops falling, so it never reaches zero, so the only gate on sending a
// message (playableBalance <= 0, chatEngine.ts) never trips. The chat runs free and
// unbounded while every turn still costs us a full Anthropic call.
//
// This module bounds that window WITHOUT touching the billing math: the session
// simply has a maximum life, after which it closes and the customer is invited to
// begin a fresh reading. Nobody's price changes — billing is still capped at 30
// minutes by MAX_BILLABLE_SECONDS, which this deliberately does not go near.
//
// The value is read from system_config so it can be tuned (or switched off) from
// the database without a deploy — same cached-read pattern as modelConfig.ts.

import { db } from './db';
import { systemConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';
import logger from './logger';

const CONFIG_KEY = 'max_session_minutes';

// 60 minutes = the 30 billed minutes every customer already has, plus 30 free.
// Only 3 sessions in the platform's history ever ran past this, all pre-flip and
// all before the 2026-07-28 price rise made 30 minutes cost $89.70.
const DEFAULT_MAX_SESSION_MINUTES = 60;

// Set the config value to 0 to disable the limit entirely (sessions run unbounded
// again). This is the rollback: one UPDATE, no deploy.
const DISABLED = 0;

const CACHE_TTL_MS = 60_000;

let cached: { seconds: number; fetchedAt: number } | null = null;

/**
 * Maximum wall-clock life of a single chat session, in seconds.
 * Returns 0 when the limit is disabled.
 */
export async function getMaxSessionSeconds(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.seconds;
  }

  let minutes = DEFAULT_MAX_SESSION_MINUTES;
  try {
    const rows = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, CONFIG_KEY))
      .limit(1);

    const raw = rows[0]?.configValue;
    if (raw !== undefined && raw !== null && raw !== '') {
      const parsed = Number(raw);
      // A non-numeric or negative value must not silently disable the limit —
      // that is how a guard quietly becomes a no-op. Fall back to the default.
      if (Number.isFinite(parsed) && parsed >= 0) {
        minutes = parsed;
      } else {
        logger.error('SESSION_LIMIT_CONFIG_INVALID: falling back to default', {
          configKey: CONFIG_KEY,
          rawValue: raw,
          usingMinutes: DEFAULT_MAX_SESSION_MINUTES,
        });
      }
    }
  } catch {
    // DB not ready (e.g. during migration) — use the default rather than
    // failing open to an unbounded session.
    minutes = DEFAULT_MAX_SESSION_MINUTES;
  }

  const seconds = minutes === DISABLED ? DISABLED : Math.floor(minutes * 60);
  cached = { seconds, fetchedAt: Date.now() };
  return seconds;
}

/** Force-refresh the cached value (call after an admin/DB change). */
export function invalidateSessionLimitCache(): void {
  cached = null;
}

/**
 * What the persona says as the reading closes. Persona-agnostic on purpose — it is
 * served for every advisor, so it carries no voice, no claims, and no upsell push.
 * It should read as a natural ending, not a door closing: the customer has just had
 * a full hour, and starting again is offered as the next step rather than a demand.
 */
export const SESSION_LIMIT_TEMPLATE =
  "We've been sitting together for a full hour now, and that's a complete reading. " +
  "Let what came through settle for a while before you reach for it again — the quiet " +
  "afterwards is part of the work. When you're ready to pick the thread back up, " +
  "begin a new reading and I'll be right here waiting for you.";
