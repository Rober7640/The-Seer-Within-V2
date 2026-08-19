// "The Live Thread" — the FREE, pre-session view of the reader's own words.
//
// THE PROBLEM THIS SOLVES. A reader typed something into the Evelyn lander before
// they had an account; liveThreadReplay.ts turns those words into a real chat message
// — but only when a chat session is created, and a session is only created when the
// reader types (ChatServicePage's sendMessage → POST /session/start → initSession).
// So on the load that matters, the one straight off the verification / magic link,
// there is no session, nothing to restore, and the reader sees a generic greeting and
// has to say it all again. The whole promise of the feature dies on that screen. The
// full trace is in .superpowers/sdd/lt-task-14-report.md.
//
// WHY THIS IS FREE AND SESSIONLESS. The obvious fix — start the session on page load
// so the reply and an answer can be rendered from it — restarts the wall-clock meter
// at arrival instead of at the reader's first word. On Evelyn that is 299¢/min against
// a 1495¢ grant: a minute of reading time is 20% of the gift, spent before they say
// anything. (That was 10% when this was written against the old 2990¢ Live Thread
// grant; halving the grant on 2026-08-19 doubled the damage, so the argument for
// staying sessionless got stronger, not weaker.) Task 10 was redesigned to remove exactly that charge (see
// liveThreadReplay.ts's header for the measurements) and this must not put it back.
// So this module makes ONE unbilled model call and creates NO session — the shape
// GET /api/chat-service/greeting already establishes for every visitor. Billing still
// begins at the reader's first typed message, unchanged.
//
// COST IS SELF-LIMITING, unlike /greeting's. The answer is written back to
// pending_reply_response, so a reload, a persona switch and back, or a second device
// re-reads it instead of regenerating. At most one generation per parked reply, ever
// — and readers with no parked reply (everyone else on the platform) never reach the
// model here at all.
//
// SAFETY. Eligibility comes from findEligibleParkedReply(), which already excludes a
// reply the lander's safety gate flagged. That is load-bearing in BOTH directions
// here: it keeps withheld text away from the model, and it stops us echoing a
// crisis-flagged or non-English disclosure back into the reader's own thread.

import { and, eq, isNull } from 'drizzle-orm';
import { db } from './db';
import { evelynLanderSessions, personas, users } from '@shared/schema';
import { findEligibleParkedReply } from './liveThreadReplay';
import { anthropicFailover as anthropic } from './anthropicWithFailover';
import { fireWithBreaker, anthropicBreaker, isCircuitOpenError } from './circuitBreaker';
import { getConversationModel } from './modelConfig';
import logger from './logger';

/** What the client renders above the composer, before any session exists. */
export interface LiveThreadPreview {
  /** The reader's own parked words, shown back to them as their bubble. */
  reply: string;
  /** The persona's answer. Null when generation failed — the reply still shows. */
  response: string | null;
}

/**
 * Runtime markers the chat pipeline substitutes inside buildMessageContext() before a
 * prompt is ever sent. This module does not run that pipeline, so it strips them by
 * name rather than shipping the literal text "[RUNTIME_CONTEXT]" to the model.
 *
 * Listed explicitly instead of stripping /\[[A-Z_]+\]/g: a persona prompt is authored
 * prose and may legitimately contain bracketed capitals, and silently deleting an
 * author's words would change the voice in a way nobody could see in a diff.
 */
const RUNTIME_MARKERS = [
  '[RUNTIME_CONTEXT]',
  '[CARD_DRAW_TOOL]',
  '[ASTROLOGY_PERSONA]',
  '[VEDIC_ASTROLOGY_PERSONA]',
  '[NUMEROLOGY_PERSONA]',
];

/** Control tokens the chat UI acts on. Pre-session bubbles cannot, so they must not survive. */
const OUTPUT_TOKENS = /\[TAROT_DRAW\]|\[SHOW_CHART\]/g;

function stripMarkers(prompt: string): string {
  let out = prompt;
  for (const marker of RUNTIME_MARKERS) out = out.split(marker).join('');
  return out;
}

/**
 * Generate the persona's answer to a parked reply. One unbilled model call.
 * Returns null on any failure — the caller then shows the reply on its own, which is
 * still the continuity the reader came for.
 */
async function generateResponse(config: {
  baseSystemPrompt: string;
  aiModel: string | null;
  firstName: string;
  reply: string;
}): Promise<string | null> {
  // The persona's REAL system prompt, so this reads in her voice rather than in a
  // second, thinner one written here. The framing below is the only thing added, and
  // it exists because this turn is genuinely unusual: there is no conversation above
  // it, and the reader has already been greeted by the bubble sitting on top.
  const system = `${stripMarkers(config.baseSystemPrompt)}

## THIS TURN — the first thing you say to this client
${config.firstName} typed the message below into your thread before their reading was open. They have not spoken since. Answer THAT message, directly.

- Do NOT greet them, welcome them, or introduce yourself. They have already been greeted; opening with a greeting makes it obvious nobody read what they wrote.
- Do NOT tell them to say more first, and do not stall. Give them something real about what they actually said — one observation with substance in it.
- 2 to 4 sentences. Plain prose: no markdown, no bullet points, no headers.
- End with one question that opens the reading.
- Do not offer, promise, or mention anything they would have to pay for.`;

  try {
    // Same model resolution the real chat turn uses (chatEngine.ts's sendMessage), so
    // this bridging turn cannot come back in a different voice than the one that
    // continues it.
    const conversationModel = await getConversationModel(config.aiModel);
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: conversationModel,
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: config.reply }],
      }),
    );
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Persona prompts ask for a {"message": "...", "topic": "..."} envelope, and
    // sendMessage() unwraps it before anything is shown. Skipping this would print raw
    // JSON into the reader's very first bubble. Mirrors chatEngine.ts's handling,
    // including its fall-back-to-raw-text on a parse failure.
    let message = text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        message = JSON.parse(jsonMatch[0]).message || text.trim();
      } catch {
        message = text.trim();
      }
    }

    const cleaned = message.replace(OUTPUT_TOKENS, '').trim();
    return cleaned || null;
  } catch (error) {
    if (isCircuitOpenError(error)) {
      logger.warn('live-thread: anthropic circuit open, no pre-session answer');
    } else {
      logger.error('live-thread: failed to generate pre-session answer', {
        error: (error as Error).message,
      });
    }
    return null;
  }
}

/**
 * Resolve what to show this reader above the composer on a fresh /reading load.
 * Returns null — meaning "behave exactly as before this feature existed" — for
 * everyone without an eligible parked reply, which is every persona but Evelyn and
 * almost every Evelyn reader.
 *
 * NOTHING HERE CREATES A SESSION, WRITES A chat_messages ROW, OR TOUCHES A BALANCE.
 * The only write is the generated answer onto the lander row. Consumption still
 * happens in exactly one place, replayPendingReply()'s atomic claim, at session
 * start — so a reader who looks at this thread and never types keeps their parked
 * reply, keeps the 10-minute grant evidence that depends on it, and is shown the same
 * thread again next time.
 */
export async function resolveLiveThreadPreview(config: {
  userId: string;
  personaSlug: string;
}): Promise<LiveThreadPreview | null> {
  try {
    const eligible = await findEligibleParkedReply(config);
    if (!eligible) return null;

    // Already generated — return it verbatim and make no model call. This is the
    // common path for every load after the first, and it is what makes the reader's
    // thread stable across reloads instead of subtly rewriting itself.
    if (eligible.response) {
      return { reply: eligible.reply, response: eligible.response };
    }

    const [persona] = await db
      .select({ baseSystemPrompt: personas.baseSystemPrompt, aiModel: personas.aiModel })
      .from(personas)
      .where(and(eq(personas.slug, config.personaSlug), eq(personas.isActive, true)))
      .limit(1);
    if (!persona) return { reply: eligible.reply, response: null };

    const [reader] = await db
      .select({ firstName: users.firstName })
      .from(users)
      .where(eq(users.id, config.userId))
      .limit(1);

    const generated = await generateResponse({
      baseSystemPrompt: persona.baseSystemPrompt,
      aiModel: persona.aiModel ?? null,
      firstName: reader?.firstName || 'there',
      reply: eligible.reply,
    });
    if (!generated) return { reply: eligible.reply, response: null };

    // First writer wins. Two tabs opening at once both generate; only one answer can
    // be the one the replay carries, so the loser re-reads and shows the winner's
    // text. Without `pending_reply_response IS NULL` the last writer would win and a
    // reload could show different words than the load before it.
    //
    // The `pending_reply = eligible.reply` guard matters just as much: POST
    // /api/evelyn-lander/reply overwrites the parked text unconditionally, so a reader
    // who submits again mid-generation must not have an answer to their OLD words
    // stapled to their new ones.
    const written = await db
      .update(evelynLanderSessions)
      .set({ pendingReplyResponse: generated })
      .where(and(
        eq(evelynLanderSessions.id, eligible.landerSessionId),
        eq(evelynLanderSessions.pendingReply, eligible.reply),
        isNull(evelynLanderSessions.pendingReplyResponse),
        isNull(evelynLanderSessions.pendingReplyConsumedAt),
        // Re-checked here, not just at the read: eligibility was decided before a model
        // round-trip, and /reply can flag the row during it. Cheap, and it means a
        // flagged row can never end up carrying an answer we generated for it.
        isNull(evelynLanderSessions.pendingReplyViolationType),
      ))
      .returning({ id: evelynLanderSessions.id });

    if (written.length > 0) {
      logger.info('live-thread: generated pre-session answer to parked reply', {
        userId: config.userId,
      });
      return { reply: eligible.reply, response: generated };
    }

    // Our write did not take. Re-read through the same shared predicate and show
    // whatever is authoritative now, so the screen never disagrees with the row the
    // replay will read. If the row is gone/consumed/replaced, show nothing rather
    // than words that will not be in the thread.
    const fresh = await findEligibleParkedReply(config);
    if (!fresh) return null;
    return { reply: fresh.reply, response: fresh.response };
  } catch (error) {
    // Never break a chat opening over this. Falling through to null gives the reader
    // exactly today's experience: the greeting, and their reply still parked and still
    // replayed the moment their session starts.
    logger.warn('live-thread: pre-session preview failed', {
      error: (error as Error)?.message,
    });
    return null;
  }
}
