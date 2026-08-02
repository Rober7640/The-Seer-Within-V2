// "The Live Thread" engagement signal.
//
// The Evelyn lander continues the marketing email a reader clicked. A reader who
// actually TYPED something into that thread before signing up is more engaged than
// one who only clicked through, so they earn a larger free-minute grant. The
// evidence is evelyn_lander_sessions.pending_reply, written by
// POST /api/evelyn-lander/reply and never cleared by anything (grep pending_reply
// — /reply is its only writer, and it only ever writes a non-null value).
//
// ⚠ CONSTRAINT FOR ANYTHING THAT CONSUMES pending_reply.
// `pending_reply IS NOT NULL` is not just a queue marker — it is the durable evidence
// that decides a MONEY tier. It is read at verification time, which can be days after
// it was written, and again on every /api/evelyn-lander/check-email resend. A consumer
// that replays the parked reply and then NULLs the column makes this signal disappear
// underneath both readers: a reader who verifies (or asks for another verification
// email) after the replay silently drops from 10 minutes to 5, with no error anywhere.
// Record consumption in a SEPARATE marker and leave the text in place — do not clear it.
//
// The one consumer today does exactly that: server/lib/liveThreadReplay.ts replays the
// reply into the reader's first chat session and stamps pending_reply_consumed_at,
// never touching pending_reply. Both helpers below deliberately ignore that marker —
// a reply that has already been spoken is still evidence the reader typed one, and the
// grant must not change depending on whether they have opened the chat yet.
//
// WHY THIS IS RECOMPUTED RATHER THAN PERSISTED AT REGISTRATION.
// The 5-minute lander grant it refines is already derived at grant time from DB
// state, not from a flag stamped on the user: isFromEvelynLander() (auth.ts) asks
// whether ANY evelyn_lander_sessions row points at this user. Registration and
// verification are separate requests, possibly days apart, and a reader can become
// lander-eligible AFTER registering (POST /api/evelyn-lander/check-email stamps
// resolved_user_id too). A boolean captured at registration could not see that,
// and would need a users column plus a migration to survive the gap. Deriving the
// Live Thread signal the same way keeps the two eligibility rules structurally
// identical — engagement is a strict subset of lander-linkage, so the pair can
// never disagree in a direction that grants the larger amount to someone the
// lander check would have refused.
//
// Both helpers silent-fail to false, mirroring isFromEvelynLander(). If the lookup
// errors the reader falls back to the smaller grant and the smaller quote, which
// is the safe direction to be wrong in.

import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from './db';
import { evelynLanderSessions } from '@shared/schema';
import logger from './logger';

/**
 * Free minutes granted to a reader who engaged with the Live Thread before
 * signing up. ONE definition, imported by both sides of the lockstep that
 * verificationEmail.ts:52 warns about:
 *   - the QUOTE — getFreeMinutesForSignup(), the number printed in the
 *     verification email;
 *   - the GRANT — auth.ts's LIVE_THREAD_FREE_COINS, which is
 *     minutesToCoins(this).
 * Changing it here moves both at once; there is no second copy to forget.
 */
export const LIVE_THREAD_FREE_MINUTES = 10;

/**
 * Did the reader type into THIS lander session? Keyed by session token, for the
 * registration handlers — they hold the token the lander sent them, and the row's
 * resolved_user_id has not been written yet at that point (auth.ts stamps it
 * fire-and-forget, after the account row exists).
 */
export async function sessionHasLiveThreadReply(sessionToken: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: evelynLanderSessions.id })
      .from(evelynLanderSessions)
      .where(
        and(
          eq(evelynLanderSessions.sessionToken, sessionToken),
          isNotNull(evelynLanderSessions.pendingReply),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch (error: any) {
    logger.warn('live-thread: session reply lookup failed', { error: error?.message });
    return false;
  }
}

/**
 * Did the reader type into ANY lander session linked to their account? Keyed by
 * user id, for the two verification handlers and for the lander's /check-email
 * quote — none of them have a session token, only the account.
 *
 * "Any row" matches isFromEvelynLander() exactly, including its consequence: an
 * older linked session with a reply counts, not only this visit's. Existence is
 * what both sides ask, so both sides answer the same.
 */
export async function userHasLiveThreadReply(userId: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: evelynLanderSessions.id })
      .from(evelynLanderSessions)
      .where(
        and(
          eq(evelynLanderSessions.resolvedUserId, userId),
          isNotNull(evelynLanderSessions.pendingReply),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch (error: any) {
    logger.warn('live-thread: user reply lookup failed', { error: error?.message });
    return false;
  }
}
