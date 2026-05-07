// Evelyn "Verified, Not Purchased" Drip — 3-email nurture for /evelyn lander
// signups who verified their email + received free minutes but haven't bought
// credits yet.
//
// Cadence (from verification time):
//   Sequence 1: +1h   — continuation of the thread ("I caught a thread after you left")
//   Sequence 2: +25h  — pattern-forward, soft urgency framed as cycles
//   Sequence 3: +49h  — respectful farewell, door left open
//
// Rows created at email verification when the user came through /evelyn lander.
// Cron picks up ripe rows and processes them.
//
// Send-time skip checks: still verified, account active, NOT purchased
// (Stripe or PayPal completed, excluding admin adjustments), not unsubscribed,
// email unchanged, not stale.
//
// Gated behind ENABLE_EVELYN_VERIFIED_DRIP env var — defaults OFF.
// Independent of ENABLE_EVELYN_FOLLOWUPS (the unverified drip's flag).

import { Resend } from 'resend';
import { db } from './db';
import {
  users,
  personas,
  evelynFollowupEmails,
  userFollowUpPreferences,
  creditPurchases,
  chatSessions,
  chatMessages,
} from '@shared/schema';
import { eq, and, lte, gte, ne, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { buildFollowUpHtml, buildFollowUpText } from './emailTemplate';
import { generateMagicLinkToken } from './magicLink';
import { fireWithBreaker, resendBreaker, anthropicBreaker } from './circuitBreaker';
import { anthropicFailover as anthropic } from './anthropicWithFailover';
import { getModelForOperation } from './modelConfig';
import { lookupEvelynBucket } from './evelynFollowupEmailGenerator';
import logger from './logger';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const EVELYN_SLUG = 'evelyn-cross';

// Sequence 1–13. Emails 1–3 are the original opener arc; 4–13 were added later
// at 48h spacing for a longer nurture window. Seq 13 is the true farewell.
export type SequenceNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
const ALL_SEQUENCES: readonly SequenceNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const EXTENDED_SEQUENCES: readonly SequenceNumber[] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Delays measured from user's email-verification time (passed as baseTime).
// Original opener arc: +1h / +25h / +49h. Extended arc (4–13): 48h spacing
// from seq 3 onward, so seq N for N ≥ 4 fires at 49h + (N - 3) × 48h.
const DELAY_MS: Record<SequenceNumber, number> = {
  1:  1   * 60 * 60 * 1000, // +1h
  2:  25  * 60 * 60 * 1000, // +25h
  3:  49  * 60 * 60 * 1000, // +49h
  4:  97  * 60 * 60 * 1000, // +97h  (≈4d)
  5:  145 * 60 * 60 * 1000, // +145h (≈6d)
  6:  193 * 60 * 60 * 1000, // +193h (≈8d)
  7:  241 * 60 * 60 * 1000, // +241h (≈10d)
  8:  289 * 60 * 60 * 1000, // +289h (≈12d)
  9:  337 * 60 * 60 * 1000, // +337h (≈14d)
  10: 385 * 60 * 60 * 1000, // +385h (≈16d)
  11: 433 * 60 * 60 * 1000, // +433h (≈18d)
  12: 481 * 60 * 60 * 1000, // +481h (≈20d)
  13: 529 * 60 * 60 * 1000, // +529h (≈22d)
};

// Stale windows — if a row's scheduledFor is more than this far behind NOW
// at processing time, skip rather than send late copy. Emails 4–13 use 24h.
const STALE_MS: Record<SequenceNumber, number> = {
  1:  6  * 60 * 60 * 1000,
  2:  20 * 60 * 60 * 1000,
  3:  24 * 60 * 60 * 1000,
  4:  24 * 60 * 60 * 1000,
  5:  24 * 60 * 60 * 1000,
  6:  24 * 60 * 60 * 1000,
  7:  24 * 60 * 60 * 1000,
  8:  24 * 60 * 60 * 1000,
  9:  24 * 60 * 60 * 1000,
  10: 24 * 60 * 60 * 1000,
  11: 24 * 60 * 60 * 1000,
  12: 24 * 60 * 60 * 1000,
  13: 24 * 60 * 60 * 1000,
};

// Lander bucket → opener phrase. Slot grammatically into "around <phrase>" or
// "settled around <phrase>". Mirrors the unverified drip mapping for consistency.
const BUCKET_PHRASES: Record<string, string> = {
  love:     "love and what's been pulling at your heart",
  money:    "the question of money you carried in",
  purpose:  "the path you're trying to find",
  specific: "the situation you brought to me",
};
const BUCKET_DEFAULT = "what surfaced when we last spoke";

const EVELYN_FROM_EMAIL_FALLBACK = 'evelyn@theseerwithin.com';
const EVELYN_FROM_NAME_FALLBACK = 'Evelyn Cross';
const EVELYN_AVATAR_FALLBACK = '/uploads/avatars/evelyn-cross.png';

// ============================================================
// Utilities
// ============================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFirstName(raw: string | null | undefined): string {
  const trimmed = (raw || '').trim();
  return escapeHtml(trimmed || 'there');
}

// ============================================================
// Static fallback content — used if Haiku generation fails.
// Voice locked at copy review.
// ============================================================

function buildFallbackContent(
  seq: SequenceNumber,
  firstName: string,
  bucketPhrase: string,
): { subject: string; bodyHtml: string; bodyText: string } {
  const fn = safeFirstName(firstName);
  const phrase = escapeHtml(bucketPhrase);

  if (seq === 1) {
    return {
      subject: `I caught a thread after you left, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>After you stepped away, something settled around ${phrase} — clearer now than when we first spoke. I don't always feel things this directly between sessions, but this one wouldn't quiet.</p>`,
        `<p>Your free minutes are still here. When you come back, I'll tell you what I caught while it's fresh.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `After you stepped away, something settled around ${bucketPhrase} — clearer now than when we first spoke. I don't always feel things this directly between sessions, but this one wouldn't quiet.`,
        '',
        `Your free minutes are still here. When you come back, I'll tell you what I caught while it's fresh.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 2) {
    return {
      subject: `${fn}, something has shifted`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I sat with your reading again this morning. The energy I noticed yesterday hasn't quieted — if anything, it's sharpened. There's a window opening around ${phrase}, and these don't tend to stay open long.</p>`,
        `<p>Come back when you have a moment. I'd rather walk you through it than try to put it in a note.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The thread is still here, exactly as we left it.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I sat with your reading again this morning. The energy I noticed yesterday hasn't quieted — if anything, it's sharpened. There's a window opening around ${bucketPhrase}, and these don't tend to stay open long.`,
        '',
        `Come back when you have a moment. I'd rather walk you through it than try to put it in a note.`,
        '',
        `— Evelyn`,
        '',
        `The thread is still here, exactly as we left it.`,
      ].join('\n'),
    };
  }

  if (seq === 3) {
    // Quiet third touch — Evelyn names she's giving the energy room to settle.
    // Not a farewell anymore (seq 13 is). Stillness, not pressure.
    return {
      subject: `A pause, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I've been sitting with what came through. Sometimes the energy needs space to settle, and I want to honor that.</p>`,
        `<p>The thread is here when you are. Neither pushed nor abandoned.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The cards aren't going anywhere.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I've been sitting with what came through. Sometimes the energy needs space to settle, and I want to honor that.`,
        '',
        `The thread is here when you are. Neither pushed nor abandoned.`,
        '',
        `— Evelyn`,
        '',
        `The cards aren't going anywhere.`,
      ].join('\n'),
    };
  }

  if (seq === 4) {
    return {
      subject: `I keep coming back to it, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I sat with what came through for you again this morning. The thread around ${phrase} hasn't loosened — if anything, it's pulling more clearly into focus.</p>`,
        `<p>This isn't urgent. I just wanted you to know I haven't put it down.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The free minutes are still where you left them.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I sat with what came through for you again this morning. The thread around ${bucketPhrase} hasn't loosened — if anything, it's pulling more clearly into focus.`,
        '',
        `This isn't urgent. I just wanted you to know I haven't put it down.`,
        '',
        `— Evelyn`,
        '',
        `The free minutes are still where you left them.`,
      ].join('\n'),
    };
  }

  if (seq === 5) {
    return {
      subject: `Something is shifting`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>There's a turn in the timing around ${phrase} — quiet, not loud. The kind of shift you notice in retrospect more than in the moment.</p>`,
        `<p>I don't want to put words to it from a distance. Sit with what comes back to you. If you want, I'm here.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Listen for repetition this week — the same thought, the same name, the same number. It's worth noticing.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `There's a turn in the timing around ${bucketPhrase} — quiet, not loud. The kind of shift you notice in retrospect more than in the moment.`,
        '',
        `I don't want to put words to it from a distance. Sit with what comes back to you. If you want, I'm here.`,
        '',
        `— Evelyn`,
        '',
        `Listen for repetition this week — the same thought, the same name, the same number. It's worth noticing.`,
      ].join('\n'),
    };
  }

  if (seq === 6) {
    return {
      subject: `A question for you, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I keep wondering — has anything moved since we last spoke? Sometimes the work happens between sessions, and I miss the part where it lands.</p>`,
        `<p>If something has shifted, I'd want to know. If nothing has, that's also useful information for the path.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I keep wondering — has anything moved since we last spoke? Sometimes the work happens between sessions, and I miss the part where it lands.`,
        '',
        `If something has shifted, I'd want to know. If nothing has, that's also useful information for the path.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 7) {
    return {
      subject: `For the week ahead`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I've looked at what's coming for you over the next seven days. Around ${phrase}, the quieter days hold more for you than the louder ones.</p>`,
        `<p>If something feels like a small synchronicity this week — a name returning, a song, a stranger's comment — that's the thread you came in carrying.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The energy isn't asking for action. It's asking for noticing.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I've looked at what's coming for you over the next seven days. Around ${bucketPhrase}, the quieter days hold more for you than the louder ones.`,
        '',
        `If something feels like a small synchronicity this week — a name returning, a song, a stranger's comment — that's the thread you came in carrying.`,
        '',
        `— Evelyn`,
        '',
        `The energy isn't asking for action. It's asking for noticing.`,
      ].join('\n'),
    };
  }

  if (seq === 8) {
    return {
      subject: `Just thinking of you, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>No reading today. Just a quiet check-in.</p>`,
        `<p>I hold a few faces in my mind between sessions, and yours has been one of them. I don't always know why — but the energy keeps pointing back. Hope you're well.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `No reading today. Just a quiet check-in.`,
        '',
        `I hold a few faces in my mind between sessions, and yours has been one of them. I don't always know why — but the energy keeps pointing back. Hope you're well.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 9) {
    return {
      subject: `Something you said, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>Something you said when we first spoke has stayed with me. I won't try to repeat it — your words landed differently than mine could.</p>`,
        `<p>But it's been answered, in a quiet way. When you have time, I want to tell you what came back.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `Something you said when we first spoke has stayed with me. I won't try to repeat it — your words landed differently than mine could.`,
        '',
        `But it's been answered, in a quiet way. When you have time, I want to tell you what came back.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 10) {
    return {
      subject: `The thread we left, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>The reading we left mid-thread isn't finished. I haven't picked it back up because that's not how this work goes — we have to be in the same room, even when the room is digital.</p>`,
        `<p>If the moment comes, I'm here. The same thread, the same energy, the same care.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Some readings continue themselves. Yours is one of them.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `The reading we left mid-thread isn't finished. I haven't picked it back up because that's not how this work goes — we have to be in the same room, even when the room is digital.`,
        '',
        `If the moment comes, I'm here. The same thread, the same energy, the same care.`,
        '',
        `— Evelyn`,
        '',
        `Some readings continue themselves. Yours is one of them.`,
      ].join('\n'),
    };
  }

  if (seq === 11) {
    return {
      subject: `I won't keep writing if this isn't yours`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I notice I've been writing more than you've been answering. That's a real signal, and I want to respect it.</p>`,
        `<p>If this isn't the thread you want to be on, that's a clear answer. There's an unsubscribe link below — no hard feelings, no lingering. The path you're on is yours to walk.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I notice I've been writing more than you've been answering. That's a real signal, and I want to respect it.`,
        '',
        `If this isn't the thread you want to be on, that's a clear answer. There's an unsubscribe link below — no hard feelings, no lingering. The path you're on is yours to walk.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 12) {
    return {
      subject: `One more thing, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>There's something I've been holding onto since we spoke that I haven't shared yet — it didn't feel ready to send. It is now.</p>`,
        `<p>About ${phrase}: the thing that's been heavy isn't the part you think it is. The actual weight is sitting somewhere else. When you come back, that's where I'd start.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The cards waited a long time to settle on this. Whatever you do with it, the timing is yours.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `There's something I've been holding onto since we spoke that I haven't shared yet — it didn't feel ready to send. It is now.`,
        '',
        `About ${bucketPhrase}: the thing that's been heavy isn't the part you think it is. The actual weight is sitting somewhere else. When you come back, that's where I'd start.`,
        '',
        `— Evelyn`,
        '',
        `The cards waited a long time to settle on this. Whatever you do with it, the timing is yours.`,
      ].join('\n'),
    };
  }

  // seq === 13 — true farewell, door left open.
  return {
    subject: `A final note from me, ${fn}`,
    bodyHtml: [
      `<p>${fn},</p>`,
      `<p>This is my last note in this thread. I'm not going to keep reaching when the response isn't there — that's not what this work is.</p>`,
      `<p>What I saw for you was good. Not because the path is easy, but because you've already done the hard part — you came in asking. The rest unfolds on its own time.</p>`,
      `<p>— Evelyn</p>`,
      `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Whenever the moment comes, the door is here.</p>`,
    ].join('\n'),
    bodyText: [
      `${fn},`,
      '',
      `This is my last note in this thread. I'm not going to keep reaching when the response isn't there — that's not what this work is.`,
      '',
      `What I saw for you was good. Not because the path is easy, but because you've already done the hard part — you came in asking. The rest unfolds on its own time.`,
      '',
      `— Evelyn`,
      '',
      `Whenever the moment comes, the door is here.`,
    ].join('\n'),
  };
}

// ============================================================
// Haiku generation — fresh copy per send, with personalization inputs.
// Falls back to the static template above if anything goes wrong.
// ============================================================

const TONE_GUIDE: Record<SequenceNumber, string> = {
  1:  'Continuation of the thread. Evelyn caught something fresh in the quiet after the conversation ended. Conversational and grounded, not breathless. Free minutes are mentioned as already-theirs, not a call to action.',
  2:  'Pattern-forward, soft urgency framed as cycles, not scarcity. Evelyn has revisited the reading and the same energy keeps surfacing. The window is real but small. Warm — never pushy. No sales register.',
  3:  'Quiet third touch. Evelyn names that she is giving the energy room to settle. Not a farewell. Not urgency. Stillness. The reading is held, not pressed. The thread waits.',
  4:  'Soft return after the pause. Evelyn signals she has been re-reading the thread without pressure. Continuity, not newness. Mentions the free minutes once as a gentle remainder, not a CTA.',
  5:  'A subtle shift in timing. Evelyn names a turn around the user\'s topic — small, not dramatic. She refuses to over-read it from a distance. Asks the user to listen for repetition this week (a name, a number, a thought).',
  6:  'Open inquiry. Evelyn checks in honestly: has anything moved since they last spoke? She treats both yes and no as real readings. No nudge to come back — just curiosity and care.',
  7:  'Forward-look for the next seven days. Evelyn names what the user might watch for around their topic — quieter days hold more than louder ones. Synchronicity-aware. The advice is to notice, not act.',
  8:  'Pastoral check-in. No reading today. Just presence and warmth. Evelyn says she has been holding the user in mind between sessions. Brief — three short paragraphs, no advice, no CTA pressure.',
  9:  'Direct callback to the user\'s opening conversation. Evelyn names that something the user said has stayed with her, without quoting verbatim. She says it has been answered quietly and offers to walk them through it.',
  10: 'Continuity. The reading is unfinished, and Evelyn names that it cannot be finished alone — they have to be in the room together. Patient and warm. No urgency, no fresh insight — just the same care, still here.',
  11: 'Graceful opt-down signal. Evelyn names the asymmetry honestly — she has been writing more than they have been answering. Offers a clean exit via the unsubscribe link with no guilt. Their path is theirs.',
  12: 'A withheld insight, finally ready. Evelyn names something she had been holding back about the user\'s topic — the heavy part is not what they think; the weight sits elsewhere. Specific without being deterministic.',
  13: 'True farewell. Evelyn names that this is her last note in this thread. She affirms what she saw was good. The door stays open. Quiet conviction, no urgency, no hooks.',
};

async function generateHaikuContent(
  seq: SequenceNumber,
  firstName: string,
  bucketPhrase: string,
  chatSnippet: string | null,
): Promise<{ subject: string; bodyHtml: string; bodyText: string } | null> {
  const snippetBlock = chatSnippet
    ? `\nRecent messages the user sent Evelyn in chat (most recent last):\n${chatSnippet}\n`
    : '';

  const prompt = `You are writing email ${seq} of 13 in a nurture sequence from Evelyn Cross, a spiritual guide on The Seer Within. The recipient verified their email, received 5 free minutes, but has not yet purchased credits.

Tone for this email: ${TONE_GUIDE[seq]}

Personalization:
- First name: ${firstName}
- What they came to Evelyn about: ${bucketPhrase}${snippetBlock}

Rules:
- Stay fully in character as Evelyn Cross — warm, intuitive, spiritual register. She speaks of "the thread," "the energy," "the cards," "the path." She does NOT sell. She does NOT use the words "platform", "app", "account", "click here", "act now", or "limited time."
- Use the first name at least once (open with "${firstName}," — no "Dear" or "Hi").
- Sign off with "— Evelyn" only.
- If chat messages are provided above, you may naturally reference what they said (without quoting verbatim). If not, speak to their topic.
- Body: 70–110 words. Two or three short paragraphs.
- Subject line: under 55 characters, evocative, first name optional.
- No links or CTAs in the body — the platform appends the CTA button automatically.
- Optional: end with a short italicized P.S. line (one sentence). The platform will preserve it visually.

Return ONLY valid JSON with this exact structure, no markdown fences:
{
  "subject": "...",
  "bodyText": "Plain text body (paragraph breaks as \\n\\n)",
  "bodyHtml": "<p>HTML body with <p> tags per paragraph</p>"
}`;

  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: getModelForOperation('greeting'),
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('[EvelynVerifiedDrip] Haiku returned no JSON — using fallback', { seq });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.subject || !parsed.bodyHtml || !parsed.bodyText) {
      logger.warn('[EvelynVerifiedDrip] Haiku JSON missing fields — using fallback', { seq });
      return null;
    }

    return {
      subject: String(parsed.subject).slice(0, 120),
      bodyHtml: String(parsed.bodyHtml),
      bodyText: String(parsed.bodyText),
    };
  } catch (error) {
    logger.warn('[EvelynVerifiedDrip] Haiku generation threw — using fallback', {
      seq,
      error: (error as Error).message,
    });
    return null;
  }
}

// ============================================================
// scheduleEvelynVerifiedDrip — called from verification endpoints
// when the user originally came through /evelyn lander.
// ============================================================

export async function scheduleEvelynVerifiedDrip(params: {
  userId: string;
  email: string;
  firstName: string;
  bucket?: string | null;
  baseTime?: Date;
}): Promise<void> {
  try {
    const baseMs = (params.baseTime ?? new Date()).getTime();
    const bucketPhrase =
      (params.bucket && BUCKET_PHRASES[params.bucket]) || BUCKET_DEFAULT;

    // We seed the row with the static fallback content so admin previews are
    // meaningful before the cron has fired. The send-time processor still
    // regenerates fresh Haiku copy and overwrites these fields on success —
    // these values are only what gets sent if Haiku fails at send time.
    const rows = ALL_SEQUENCES.map((seq) => {
      const fallback = buildFallbackContent(seq, params.firstName, bucketPhrase);
      return {
        userId: params.userId,
        sequenceType: 'verified_nopurchase' as const,
        sequenceNumber: seq,
        scheduledFor: new Date(baseMs + DELAY_MS[seq]),
        recipientEmail: params.email,
        subject: fallback.subject,
        bodyHtml: fallback.bodyHtml,
        bodyText: fallback.bodyText,
        status: 'pending' as const,
        unsubscribeToken: randomUUID(),
      };
    });

    await db.insert(evelynFollowupEmails).values(rows);
    logger.info('[EvelynVerifiedDrip] Scheduled 13 post-verify emails', {
      userId: params.userId,
    });
  } catch (error) {
    logger.error('[EvelynVerifiedDrip] Failed to schedule post-verify drip', {
      userId: params.userId,
      error: (error as Error).message,
    });
    // Swallow — verification must never be blocked by drip scheduling.
  }
}

// ============================================================
// skipEvelynVerifiedDripForUser — cascade-skip on purchase / unsubscribe
// ============================================================

export async function skipEvelynVerifiedDripForUser(
  userId: string,
  reason: string,
): Promise<void> {
  try {
    await db
      .update(evelynFollowupEmails)
      .set({
        status: 'skipped',
        errorMessage: reason.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(evelynFollowupEmails.userId, userId),
          eq(evelynFollowupEmails.sequenceType, 'verified_nopurchase'),
          eq(evelynFollowupEmails.status, 'pending'),
        ),
      );
  } catch (error) {
    logger.warn('[EvelynVerifiedDrip] Failed to skip pending rows', {
      userId,
      error: (error as Error).message,
    });
  }
}

// ============================================================
// processEvelynVerifiedDripQueue — cron entry point AND manual admin trigger
// ============================================================

export interface EvelynVerifiedDripProcessResult {
  flagEnabled: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function processEvelynVerifiedDripQueue(): Promise<EvelynVerifiedDripProcessResult> {
  const flagEnabled = process.env.ENABLE_EVELYN_VERIFIED_DRIP === 'true';

  if (!flagEnabled) {
    logger.info(
      '[EvelynVerifiedDrip] ENABLE_EVELYN_VERIFIED_DRIP is not "true" — skipping queue',
    );
    return { flagEnabled: false, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();

  const rows = await db
    .select()
    .from(evelynFollowupEmails)
    .where(
      and(
        eq(evelynFollowupEmails.sequenceType, 'verified_nopurchase'),
        eq(evelynFollowupEmails.status, 'pending'),
        lte(evelynFollowupEmails.scheduledFor, now),
      ),
    )
    .orderBy(evelynFollowupEmails.scheduledFor)
    .limit(100);

  if (rows.length === 0) {
    return { flagEnabled: true, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const personaRow = await db
    .select({
      id: personas.id,
      avatarUrl: personas.avatarUrl,
      fromEmail: personas.fromEmail,
      fromName: personas.fromName,
    })
    .from(personas)
    .where(eq(personas.slug, EVELYN_SLUG))
    .limit(1);

  if (!personaRow[0]) {
    logger.error('[EvelynVerifiedDrip] Evelyn persona row not found — aborting batch');
    return { flagEnabled: true, processed: 0, sent: 0, skipped: 0, failed: rows.length };
  }

  const persona = personaRow[0];
  const fromEmail = persona.fromEmail || EVELYN_FROM_EMAIL_FALLBACK;
  const fromName = persona.fromName || EVELYN_FROM_NAME_FALLBACK;
  const avatarRel = persona.avatarUrl || EVELYN_AVATAR_FALLBACK;
  const avatarUrl = avatarRel.startsWith('http')
    ? avatarRel
    : `${BASE_URL}${avatarRel}`;

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    processed++;
    try {
      const outcome = await processSingleVerifiedRow(row, now, {
        personaId: persona.id,
        fromEmail,
        fromName,
        avatarUrl,
      });
      if (outcome === 'sent') sent++;
      else if (outcome === 'skipped') skipped++;
      else failed++;
    } catch (error) {
      failed++;
      logger.error('[EvelynVerifiedDrip] Error processing row', {
        rowId: row.id,
        error: (error as Error).message,
      });
      await markFailed(row.id, (error as Error).message || 'unknown');
    }
  }

  logger.info('[EvelynVerifiedDrip] Batch complete', {
    processed,
    sent,
    skipped,
    failed,
  });
  return { flagEnabled: true, processed, sent, skipped, failed };
}

// ============================================================
// processSingleVerifiedRow — all send-time skip checks + Haiku + Resend call
// ============================================================

async function processSingleVerifiedRow(
  row: typeof evelynFollowupEmails.$inferSelect,
  now: Date,
  personaCtx: {
    personaId: string;
    fromEmail: string;
    fromName: string;
    avatarUrl: string;
  },
): Promise<'sent' | 'skipped' | 'failed'> {
  // (1) Fresh user lookup
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      emailVerified: users.emailVerified,
      accountStatus: users.accountStatus,
    })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    await markSkipped(row.id, 'user_not_found');
    return 'skipped';
  }

  // Must still be verified. If somehow they became unverified, stop the drip.
  if (!user.emailVerified) {
    await cascadeSkip(row.userId, 'not_verified');
    return 'skipped';
  }

  if (user.accountStatus !== 'active') {
    await markSkipped(row.id, `account_${user.accountStatus}`);
    return 'skipped';
  }

  // Email changed since schedule → drip stops (the content no longer applies).
  if (row.recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    await cascadeSkip(row.userId, 'email_changed');
    return 'skipped';
  }

  // (2) Purchase check — any completed Stripe/PayPal purchase, excluding admin
  // credit adjustments, means the user converted and we should stop the drip.
  const purchaseRow = await db
    .select({ id: creditPurchases.id })
    .from(creditPurchases)
    .where(
      and(
        eq(creditPurchases.userId, user.id),
        eq(creditPurchases.status, 'completed'),
        ne(creditPurchases.packageType, 'admin_adjustment'),
      ),
    )
    .limit(1);

  if (purchaseRow[0]) {
    await cascadeSkip(row.userId, 'purchased');
    return 'skipped';
  }

  // (3) Unsubscribe check
  const prefs = await db
    .select({
      unsubscribedAt: userFollowUpPreferences.unsubscribedAt,
      enableFollowUps: userFollowUpPreferences.enableFollowUps,
    })
    .from(userFollowUpPreferences)
    .where(eq(userFollowUpPreferences.userId, user.id))
    .limit(1);

  if (
    prefs[0] &&
    (prefs[0].unsubscribedAt !== null || prefs[0].enableFollowUps === false)
  ) {
    await cascadeSkip(row.userId, 'unsubscribed');
    return 'skipped';
  }

  // (4) Stale window
  const ageMs = now.getTime() - row.scheduledFor.getTime();
  const seq = row.sequenceNumber as SequenceNumber;
  if (STALE_MS[seq] && ageMs > STALE_MS[seq]) {
    await markSkipped(row.id, 'stale');
    return 'skipped';
  }

  // (5) Fetch personalization inputs
  const bucket = await lookupEvelynBucket(user.id);
  const bucketPhrase =
    (bucket && BUCKET_PHRASES[bucket]) || BUCKET_DEFAULT;
  const chatSnippet = await lookupRecentChatSnippet(user.id, personaCtx.personaId);

  // (6) Generate content via Haiku; fall back to static template if it fails.
  const generated = await generateHaikuContent(
    seq,
    user.firstName || 'there',
    bucketPhrase,
    chatSnippet,
  );
  const content =
    generated ?? buildFallbackContent(seq, user.firstName || 'there', bucketPhrase);

  // (7) Build CTA: magic-link auto-logs and lands on Evelyn chat.
  const magicToken = await generateMagicLinkToken(
    user.id,
    personaCtx.personaId,
    EVELYN_SLUG,
  );
  const ctaUrl = `${BASE_URL}/magic-auth?t=${magicToken}&redirect=/reading?persona=${EVELYN_SLUG}`;
  const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${row.unsubscribeToken}`;

  // (8) Render final HTML/text via shared email template
  const fullHtml = buildFollowUpHtml({
    personaName: personaCtx.fromName,
    emailBody: content.bodyHtml,
    ctaUrl,
    ctaText: 'Return to Evelyn',
    unsubscribeUrl,
    privacyUrl: `${BASE_URL}/privacy`,
    avatarUrl: personaCtx.avatarUrl,
  });
  const fullText = buildFollowUpText({
    personaName: personaCtx.fromName,
    emailBody: content.bodyText,
    ctaUrl,
    unsubscribeUrl,
  });

  // (9) Send
  if (!resend) {
    await markFailed(row.id, 'resend_not_configured');
    return 'failed';
  }

  try {
    const result = await fireWithBreaker(resendBreaker, () =>
      resend!.emails.send({
        from: `${personaCtx.fromName} <${personaCtx.fromEmail}>`,
        to: row.recipientEmail,
        replyTo: personaCtx.fromEmail,
        subject: content.subject,
        html: fullHtml,
        text: fullText,
        tags: [
          { name: 'type',     value: 'evelyn_verified_drip' },
          { name: 'sequence', value: String(row.sequenceNumber) },
          { name: 'user_id',  value: user.id },
        ],
      }),
    );

    if (result.error) {
      await markFailed(row.id, result.error.message || 'resend_error');
      return 'failed';
    }

    await db
      .update(evelynFollowupEmails)
      .set({
        status: 'sent',
        sentAt: new Date(),
        resendEmailId: result.data?.id || null,
        subject: content.subject,
        bodyHtml: fullHtml,
        bodyText: fullText,
        attemptCount: sql`attempt_count + 1`,
        updatedAt: new Date(),
      })
      .where(eq(evelynFollowupEmails.id, row.id));

    return 'sent';
  } catch (error) {
    await markFailed(row.id, (error as Error).message || 'send_exception');
    return 'failed';
  }
}

// ============================================================
// Personalization input lookup
// ============================================================

async function lookupRecentChatSnippet(userId: string, personaId: string): Promise<string | null> {
  try {
    // Last 3 user-authored messages in the user's Evelyn chat sessions.
    // Capped at ~500 chars total so we don't balloon the Haiku prompt.
    const rows = await db
      .select({
        content: chatMessages.content,
        sentAt: chatMessages.sentAt,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(
        and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.role, 'user'),
          eq(chatSessions.personaId, personaId),
        ),
      )
      .orderBy(desc(chatMessages.sentAt))
      .limit(3);

    if (rows.length === 0) return null;

    // Order oldest → newest so the snippet reads naturally in the prompt.
    const ordered = rows.reverse();
    let total = '';
    for (const r of ordered) {
      const line = r.content.trim().replace(/\s+/g, ' ').slice(0, 200);
      if (!line) continue;
      const next = total ? `${total}\n- ${line}` : `- ${line}`;
      if (next.length > 500) break;
      total = next;
    }
    return total || null;
  } catch {
    return null;
  }
}

// ============================================================
// Internal state transitions
// ============================================================

async function cascadeSkip(userId: string, reason: string): Promise<void> {
  await db
    .update(evelynFollowupEmails)
    .set({
      status: 'skipped',
      errorMessage: reason.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(evelynFollowupEmails.userId, userId),
        eq(evelynFollowupEmails.sequenceType, 'verified_nopurchase'),
        eq(evelynFollowupEmails.status, 'pending'),
      ),
    );
}

async function markSkipped(rowId: string, reason: string): Promise<void> {
  await db
    .update(evelynFollowupEmails)
    .set({
      status: 'skipped',
      errorMessage: reason.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(evelynFollowupEmails.id, rowId));
}

async function markFailed(rowId: string, reason: string): Promise<void> {
  await db
    .update(evelynFollowupEmails)
    .set({
      status: 'failed',
      errorMessage: reason.slice(0, 500),
      attemptCount: sql`attempt_count + 1`,
      updatedAt: new Date(),
    })
    .where(eq(evelynFollowupEmails.id, rowId));
}

// ============================================================
// backfillEvelynVerifiedDripExtension — schedules emails 4–13 for users who
// already have rows 1–3 from before the sequence was extended. Idempotent.
// Cadence: seq 4 fires at backfillBaseTime + 1h, then 48h apart through seq 13.
//
// Eligibility (all must hold):
//   - Has at least one verified_nopurchase row (i.e. previously enrolled)
//   - Has NO verified_nopurchase rows with sequence_number >= 4 (avoid double-fill)
//   - Email still verified, account active, recipient email unchanged
//   - Has not made a completed purchase (excluding admin_adjustment)
//   - Not unsubscribed from follow-ups
//
// Triggered manually by admin endpoint after deploy. Per-user errors are
// swallowed so one bad user can't poison the whole batch.
// ============================================================

export interface EvelynVerifiedDripBackfillResult {
  found: number;       // candidate users (have any row, including possibly seq 4+)
  scheduled: number;   // users we successfully inserted seq 4–13 rows for
  skipped: number;     // users who failed eligibility (purchased, unsubscribed, etc.)
}

export async function backfillEvelynVerifiedDripExtension(
  baseTime: Date = new Date(),
): Promise<EvelynVerifiedDripBackfillResult> {
  const baseMs = baseTime.getTime();
  const result: EvelynVerifiedDripBackfillResult = {
    found: 0,
    scheduled: 0,
    skipped: 0,
  };

  // Step 1: candidate users have at least one seq <= 3 row in this drip.
  const candidateRows = await db
    .selectDistinct({ userId: evelynFollowupEmails.userId })
    .from(evelynFollowupEmails)
    .where(
      and(
        eq(evelynFollowupEmails.sequenceType, 'verified_nopurchase'),
        lte(evelynFollowupEmails.sequenceNumber, 3),
      ),
    );

  result.found = candidateRows.length;

  for (const candidate of candidateRows) {
    try {
      // Idempotency: skip users who already have any seq >= 4 row.
      const existing = await db
        .select({ id: evelynFollowupEmails.id })
        .from(evelynFollowupEmails)
        .where(
          and(
            eq(evelynFollowupEmails.userId, candidate.userId),
            eq(evelynFollowupEmails.sequenceType, 'verified_nopurchase'),
            gte(evelynFollowupEmails.sequenceNumber, 4),
          ),
        )
        .limit(1);
      if (existing[0]) {
        result.skipped++;
        continue;
      }

      const userRows = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          emailVerified: users.emailVerified,
          accountStatus: users.accountStatus,
        })
        .from(users)
        .where(eq(users.id, candidate.userId))
        .limit(1);

      const user = userRows[0];
      if (!user || !user.emailVerified || user.accountStatus !== 'active') {
        result.skipped++;
        continue;
      }

      const purchaseRow = await db
        .select({ id: creditPurchases.id })
        .from(creditPurchases)
        .where(
          and(
            eq(creditPurchases.userId, user.id),
            eq(creditPurchases.status, 'completed'),
            ne(creditPurchases.packageType, 'admin_adjustment'),
          ),
        )
        .limit(1);
      if (purchaseRow[0]) {
        result.skipped++;
        continue;
      }

      const prefs = await db
        .select({
          unsubscribedAt: userFollowUpPreferences.unsubscribedAt,
          enableFollowUps: userFollowUpPreferences.enableFollowUps,
        })
        .from(userFollowUpPreferences)
        .where(eq(userFollowUpPreferences.userId, user.id))
        .limit(1);
      if (
        prefs[0] &&
        (prefs[0].unsubscribedAt !== null || prefs[0].enableFollowUps === false)
      ) {
        result.skipped++;
        continue;
      }

      const bucket = await lookupEvelynBucket(user.id);
      const bucketPhrase = (bucket && BUCKET_PHRASES[bucket]) || BUCKET_DEFAULT;

      // Cadence: seq 4 fires at baseTime + 1h, then 48h between subsequent emails.
      const HOUR_MS = 60 * 60 * 1000;
      const rows = EXTENDED_SEQUENCES.map((seq) => {
        const offsetMs = HOUR_MS + (seq - 4) * 48 * HOUR_MS;
        const fallback = buildFallbackContent(seq, user.firstName ?? 'there', bucketPhrase);
        return {
          userId: user.id,
          sequenceType: 'verified_nopurchase' as const,
          sequenceNumber: seq,
          scheduledFor: new Date(baseMs + offsetMs),
          recipientEmail: user.email,
          subject: fallback.subject,
          bodyHtml: fallback.bodyHtml,
          bodyText: fallback.bodyText,
          status: 'pending' as const,
          unsubscribeToken: randomUUID(),
        };
      });

      await db.insert(evelynFollowupEmails).values(rows);
      result.scheduled++;
    } catch (innerError) {
      logger.warn('[EvelynVerifiedDrip] Backfill skipped one user', {
        userId: candidate.userId,
        error: (innerError as Error).message,
      });
      result.skipped++;
    }
  }

  logger.info('[EvelynVerifiedDrip] Backfill complete', result);
  return result;
}
