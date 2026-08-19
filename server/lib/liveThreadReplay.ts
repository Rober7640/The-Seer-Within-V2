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
// very grant this feature exists to hand them. Measured on Evelyn (299¢/min, against
// the 2990¢ Live Thread grant of the time — halved to 1495¢ on 2026-08-19, which only
// makes each figure below a bigger share of the gift): a 60-second gap cost 299¢, four
// minutes cost 897¢ and tripped BILLING_ANOMALY, and a reader returning later inside
// the 30-minute reattach window was drained 2990 → 0 in four checkpoint cycles. Replaying here,
// inside initSession, means the clock starts when the reader really starts. See
// .superpowers/sdd/lt-task-10-report.md for the full measurements.
//
// ORDERING. initSession calls this AFTER inserting the persona's greeting, so the
// session reads [assistant greeting][reader's parked reply] — the reply is the
// last message, which is what makes the next response answer it.
//
// AND THE ANSWER, WHEN THERE IS ONE (Task 14). Before any session exists, the
// reader's first /reading load shows them [greeting][their reply][the persona's
// answer], generated free by liveThreadPreview.ts and stored on
// pending_reply_response. When the session finally starts, this module inserts BOTH
// rows, so the session reads exactly what the reader has been looking at. Insert the
// reply without the answer and the model would not know it had already replied — it
// would answer the same disclosure twice, and the reader would watch it happen.
//
// ⚠ pending_reply IS NEVER CLEARED. That column is also the durable evidence
// behind the 10-minute welcome grant, re-derived at verification time and on every
// /check-email resend (liveThreadEngagement.ts's header spells this out). Consumption
// is recorded in the SEPARATE pending_reply_consumed_at marker instead; nulling the
// text would silently drop those readers back to 5 minutes with no error anywhere.

import { and, desc, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from './db';
import { chatMessages, evelynLanderSessions } from '@shared/schema';
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
 * rather than re-declared.
 *
 * IT IS NOT A COMPLETE BOUND, and shouldn't be read as one. Verification resends
 * have no upper limit, so a reader who requests one on day 40 still arrives with a
 * working link and still has their reply silently dropped — the same failure 24h was
 * rejected for, at a much rarer point on the curve. This is a deliberate trade, not
 * an oversight: the alternative is no window at all, and dropping is the safe
 * direction (the reader gets a normal reading; nothing is corrupted, and the text
 * stays in the row). If day-40 resends turn out to matter, the fix is to measure the
 * window from the LATER of started_at and the /check-email linkage — i.e. from the
 * reader's most recent proof of intent — rather than to lengthen this constant.
 *
 * The cost of the longer window is bounded and small: a reply is replayed at most
 * ONCE (pending_reply_consumed_at), so the worst case is one reader seeing a line
 * they typed a few weeks ago at the top of their first reading — mildly odd, not
 * harmful, and strictly better than losing it.
 */
export const LIVE_THREAD_REPLAY_WINDOW_DAYS = MAGIC_LINK_EXPIRY_DAYS;

/** A parked reply that is still eligible to be shown and replayed. */
export interface EligibleParkedReply {
  /** evelyn_lander_sessions.id — the row to write a generated answer back to. */
  landerSessionId: string;
  /** What the reader typed into the lander before they had an account. */
  reply: string;
  /** The persona's pre-session answer, once generated. Null until then. */
  response: string | null;
}

/**
 * THE ONE DEFINITION of "this reader has a parked reply we may act on".
 *
 * Both consumers read through here: this module's own pre-check, and
 * liveThreadPreview.ts, which shows the reply back to the reader before any session
 * exists. They MUST agree. If the preview showed a reply the replay later refuses —
 * a flagged one, an already-consumed one, one outside the window — the reader would
 * see words in their thread that the persona never receives, and in the flagged case
 * we would be echoing back text the safety gate deliberately withheld (crisis and
 * non-English replies both land here). One function, so the two cannot drift.
 *
 * The claim statement in replayPendingReply() repeats these predicates in raw SQL and
 * cannot call this — it has to be a single atomic UPDATE, and its outer WHERE has to
 * be re-evaluable under EvalPlanQual. That mirror is deliberate and commented at the
 * call site; keep the two in step.
 */
export async function findEligibleParkedReply(config: {
  userId: string;
  personaSlug: string;
}): Promise<EligibleParkedReply | null> {
  if (config.personaSlug !== EVELYN_SLUG) return null;

  const cutoff = new Date(Date.now() - LIVE_THREAD_REPLAY_WINDOW_DAYS * 24 * 3_600_000);

  const [row] = await db
    .select({
      id: evelynLanderSessions.id,
      pendingReply: evelynLanderSessions.pendingReply,
      pendingReplyResponse: evelynLanderSessions.pendingReplyResponse,
    })
    .from(evelynLanderSessions)
    .where(and(
      eq(evelynLanderSessions.resolvedUserId, config.userId),
      isNotNull(evelynLanderSessions.pendingReply),
      isNull(evelynLanderSessions.pendingReplyConsumedAt),
      isNull(evelynLanderSessions.pendingReplyViolationType),
      gte(evelynLanderSessions.startedAt, cutoff),
    ))
    // Newest first — the same ordering the claim uses, so the row the reader is shown
    // is the row that will later be replayed.
    .orderBy(desc(evelynLanderSessions.startedAt))
    .limit(1);

  if (!row?.pendingReply) return null;
  return {
    landerSessionId: row.id,
    reply: row.pendingReply,
    response: row.pendingReplyResponse ?? null,
  };
}

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
 * SAFETY. A reply POST /reply flagged as unsafe is never selected — the filter is a
 * predicate on the claim, not a check afterwards, so a withheld reply is not claimed,
 * not consumed, and needs no rollback. See the pending_reply_violation_type note in
 * the body. Withheld replies stay eligible forever, which is intentional: the verdict
 * can be corrected in place (or the rule relaxed) and the reader's words are still
 * there to replay.
 *
 * CONVERSATION STATE. The replayed message deliberately does NOT run detectIntent /
 * updateConversationState, unlike a message sent through sendMessage(). So turnCount,
 * bucket and engagement do not count it. That is the intended reading of what this
 * row is — words carried in from before the session existed, not a turn taken inside
 * it — and it is inert in practice: the reader's next real turn recomputes all of it
 * with the full history, including this message, in context. Documented because it is
 * a divergence from the normal path, not because it needs fixing.
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

    // Cheap pre-check through the ONE shared eligibility definition. The overwhelming
    // majority of Evelyn session starts belong to readers with no lander row at all,
    // and they should not pay a BEGIN/UPDATE/COMMIT round trip to learn that. Purely
    // an optimisation: it does not decide anything. A false positive (the row is
    // claimed by someone else between this and the transaction) just means the claim
    // below matches nothing, which is already a supported outcome.
    const candidate = await findEligibleParkedReply(config);
    if (!candidate) return null;

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
            -- The safety filter, as a predicate rather than a post-check: text the
            -- normal chat path would have intercepted (chatEngine.ts's step-1 gate
            -- stores it, answers with a canned response, and generates nothing) must
            -- not reach the model by being replayed as the last message instead.
            -- POST /reply records that verdict at park time; see migration 022.
            AND pending_reply_violation_type IS NULL
            AND started_at >= ${cutoff}
          ORDER BY started_at DESC
          LIMIT 1
        )
          AND pending_reply_consumed_at IS NULL
          -- Both predicates are repeated OUT HERE deliberately. Under READ COMMITTED,
          -- an UPDATE that blocks on a concurrent write re-evaluates only this outer
          -- WHERE against the new row version (EvalPlanQual) — the subselect above is
          -- NOT re-run. Re-checking consumed-at alone is not enough: the same reader
          -- can POST a second, FLAGGED reply to /reply inside this row-lock window,
          -- and RETURNING would then hand back the new flagged text, putting into the
          -- chat exactly what the subselect's filter exists to keep out.
          AND pending_reply_violation_type IS NULL
        RETURNING pending_reply, pending_reply_response
      `);

      const claimedRow = claimed.rows[0] as
        | { pending_reply: string; pending_reply_response: string | null }
        | undefined;
      const text = claimedRow?.pending_reply;
      if (!text) return null;

      // sent_at is set from clock_timestamp(), NOT the column's DEFAULT now().
      // now() is the TRANSACTION timestamp, so these two inserts would receive the
      // identical value and the reply/answer pair would have no defined order — the
      // history window sorts on (sent_at, id) and the tie would break on a random
      // uuid, i.e. the answer could be fed to the model above the question it
      // answers. clock_timestamp() advances within the transaction, and is still
      // strictly later than the greeting row committed just before us.
      await tx.insert(chatMessages).values({
        sessionId: config.sessionId,
        userId: config.userId,
        role: 'user',
        content: text,
        sentAt: sql`clock_timestamp()`,
      });

      // The answer the reader was ALREADY shown, pre-session, by
      // liveThreadPreview.ts. It goes in with the reply so the thread in the
      // database is the thread on their screen; without it the persona's next turn
      // would not know she had answered, and would answer the same words twice.
      // Null when they never opened /reading, or when generation failed — then this
      // is exactly the pre-023 behaviour, the reply alone.
      if (claimedRow?.pending_reply_response) {
        await tx.insert(chatMessages).values({
          sessionId: config.sessionId,
          userId: config.userId,
          role: 'assistant',
          content: claimedRow.pending_reply_response,
          sentAt: sql`clock_timestamp()`,
        });
      }
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
