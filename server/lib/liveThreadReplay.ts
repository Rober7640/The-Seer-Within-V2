// "The Live Thread" — replaying the reader's parked reply into their real chat.
//
// A reader who clicked a marketing email types something into the lander thread
// BEFORE they have an account (POST /api/evelyn-lander/reply parks it on
// evelyn_lander_sessions.pending_reply). This module is where those words become
// a real chat_messages row, so the persona answers what the reader actually said
// instead of greeting them from scratch.
//
// WHY THIS RUNS AT SESSION START AND NOT AT VERIFICATION.
// The original design seeded the chat from the two auth routes, at the moment the
// reader clicked their verification / magic link. Measured against the real
// billing code, that is a money bug: startChatSession stamps started_at = NOW()
// and chat billing is wall-clock from that stamp (creditTracking.ts:174-199), so
// everything between the click and the reader's first typed word — the redirect
// chain, greeting generation, reading, typing, any distraction — is billed to the
// very grant this feature exists to hand them. Measured on Evelyn (299¢/min, a
// 2990¢ Live Thread grant): a 60-second gap cost 299¢, four minutes cost 897¢ and
// tripped BILLING_ANOMALY, and a reader returning later inside the 30-minute
// reattach window was drained 2990 → 0 in four checkpoint cycles. Replaying here,
// inside initSession, means the clock starts when the reader really starts. See
// .superpowers/sdd/lt-task-10-report.md for the full measurements.
//
// ORDERING. initSession calls this AFTER inserting the persona's greeting, so the
// session reads [assistant greeting][reader's parked reply] — the reply is the
// last message, which is what makes the next response answer it.
//
// ⚠ pending_reply IS NEVER CLEARED. That column is also the durable evidence
// behind the 10-minute welcome grant, re-derived at verification time and on every
// /check-email resend (liveThreadEngagement.ts's header spells this out). Consumption
// is recorded in the SEPARATE pending_reply_consumed_at marker instead; nulling the
// text would silently drop those readers back to 5 minutes with no error anywhere.

import { sql } from 'drizzle-orm';
import { db } from './db';
import { chatMessages } from '@shared/schema';
import { MAGIC_LINK_EXPIRY_DAYS } from './magicLink';
import logger from './logger';

/** Only Evelyn has a lander that can park a reply (evelyn_lander_sessions is Evelyn-only). */
const EVELYN_SLUG = 'evelyn-cross';

/**
 * How stale a parked reply may be and still be replayed, measured from the lander
 * session's started_at (when the reader typed it).
 *
 * WHY 30 DAYS AND NOT 24 HOURS. The obvious precedent is
 * ARRIVAL_READING_WINDOW_HOURS = 24 (arrivalReading.ts:14), but that window answers
 * a different question — "did this reader JUST arrive from an email?" — and 24h is
 * wrong for this one. Two of the three ways a reader reaches their first chat
 * outlive it:
 *   - an existing VERIFIED account is sent a magic link, valid 30 days
 *     (magicLink.ts), which is exactly the reader Task 7's verified_match path
 *     serves. A 24h window would silently drop the reply for anyone who clicks on
 *     day 3 — the single most likely person to have one parked;
 *   - a new account that misses its 24h verification token can request a resend,
 *     which mints a fresh 24h token days later (VERIFICATION_TOKEN_EXPIRY_HOURS).
 * So the window is pinned to the longest-lived link this flow hands out, imported
 * rather than re-declared. Past it, no link that could carry the reader here still
 * works, so a surviving reply can only belong to some other visit.
 *
 * The cost of the longer window is bounded and small: a reply is replayed at most
 * ONCE (pending_reply_consumed_at), so the worst case is one reader seeing a line
 * they typed a few weeks ago at the top of their first reading — mildly odd, not
 * harmful, and strictly better than losing it.
 */
export const LIVE_THREAD_REPLAY_WINDOW_DAYS = MAGIC_LINK_EXPIRY_DAYS;

/**
 * Claim this user's newest unconsumed parked reply and insert it as a real user
 * message in `sessionId`. Returns the replayed text, or null when there is nothing
 * to replay.
 *
 * The claim is ONE atomic statement, not a read-then-write: two concurrent session
 * starts (a re-clicked link, two tabs) both run it, the second blocks on the row
 * lock and then re-evaluates `pending_reply_consumed_at IS NULL` against the
 * committed new version, matches nothing, and returns zero rows. So a second replay
 * is a no-op without any application-level locking.
 *
 * Silent-fails to null, mirroring every other lander lookup in this feature: a DB
 * hiccup must never stop a reader from starting their chat. The reply stays
 * unconsumed and is replayed on their next session start.
 */
export async function replayPendingReply(config: {
  userId: string;
  personaSlug: string;
  sessionId: string;
}): Promise<string | null> {
  if (config.personaSlug !== EVELYN_SLUG) return null;

  try {
    const cutoff = new Date(Date.now() - LIVE_THREAD_REPLAY_WINDOW_DAYS * 24 * 3_600_000);

    // Claim and insert in ONE transaction: if the message insert fails, the claim
    // rolls back with it. A reply must never end up marked consumed but unspoken —
    // that is the one failure mode that loses the reader's words for good.
    const reply = await db.transaction(async (tx) => {
      const claimed = await tx.execute(sql`
        UPDATE evelyn_lander_sessions
        SET pending_reply_consumed_at = NOW()
        WHERE id = (
          SELECT id FROM evelyn_lander_sessions
          WHERE resolved_user_id = ${config.userId}
            AND pending_reply IS NOT NULL
            AND pending_reply_consumed_at IS NULL
            AND started_at >= ${cutoff}
          ORDER BY started_at DESC
          LIMIT 1
        )
          AND pending_reply_consumed_at IS NULL
        RETURNING pending_reply
      `);

      const text = (claimed.rows[0] as { pending_reply: string } | undefined)?.pending_reply;
      if (!text) return null;

      await tx.insert(chatMessages).values({
        sessionId: config.sessionId,
        userId: config.userId,
        role: 'user',
        content: text,
      });
      return text;
    });

    if (!reply) return null;

    logger.info('live-thread: replayed parked lander reply into chat', {
      userId: config.userId,
      sessionId: config.sessionId,
    });
    return reply;
  } catch (error: any) {
    logger.warn('live-thread: parked reply replay failed', { error: error?.message });
    return null;
  }
}
