// Aiden "Verified, Not Purchased" Drip — 3-email nurture for users who verified
// their email + received free minutes but haven't purchased credits yet.
//
// Cadence (from verification time):
//   Sequence 1: +1h   — observant / fresh read ("I just finished pulling your chart")
//   Sequence 2: +25h  — pattern-forward / gentle urgency ("A number keeps repeating")
//   Sequence 3: +49h  — respectful farewell ("I don't re-run the same chart twice")
//
// Rows created at email verification (both /verify-email/:token and /magic-verify).
// Cron (every 5 min) picks up ripe rows.
// Send-time checks: still verified, active account, NOT purchased (Stripe or PayPal
// completed, excluding admin adjustments), not unsubscribed, email unchanged,
// not stale.
//
// Gated behind ENABLE_AIDEN_VERIFIED_DRIP env var — defaults OFF.
// Independent of ENABLE_AIDEN_FOLLOWUPS (the unverified drip's flag).
//
// Rows share the `aiden_followup_emails` table with sequence_type='verified_nopurchase'.

import { Resend } from 'resend';
import { db } from './db';
import {
  users,
  personas,
  aidenFollowupEmails,
  aidenQuizSessions,
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
import logger from './logger';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const AIDEN_SLUG = 'aiden-powers';

// Sequence 1–13. Emails 1–3 are the original opener arc; 4–13 were added later
// at 48h spacing for a longer nurture window. Seq 13 is the true farewell.
export type SequenceNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
const ALL_SEQUENCES: readonly SequenceNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const EXTENDED_SEQUENCES: readonly SequenceNumber[] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Delays measured from user's email-verification time (passed in as baseTime).
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

// Stale windows — if scheduledFor is more than this behind NOW, skip the email
// rather than send something that no longer makes sense. Emails 4–13 use 24h.
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

// Quiz topic → personalization phrase (second-person, fits in any email body).
// Mirrors the mapping used by the unverified drip for consistency.
const TOPIC_PHRASES: Record<string, string> = {
  life_direction:     "your direction — whether you're on the right path",
  love_relationships: "love and what's been pulling at your heart",
  career_money:       "your career and whether this is your year to move",
  something_specific: "the situation you came to me with",
};
const TOPIC_DEFAULT = "what brought you to me";

// Fallbacks if the personas row is somehow unavailable.
const AIDEN_FROM_EMAIL_FALLBACK = 'aiden@theseerwithin.com';
const AIDEN_FROM_NAME_FALLBACK = 'Aiden Powers';
const AIDEN_AVATAR_FALLBACK = '/uploads/avatars/aiden-powers.png';

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
// Tone per PRD §2: observant / pattern-forward / respectful farewell.
// ============================================================

function buildFallbackContent(
  seq: SequenceNumber,
  firstName: string,
  topicPhrase: string,
): { subject: string; bodyHtml: string; bodyText: string } {
  const fn = safeFirstName(firstName);
  const topic = escapeHtml(topicPhrase);

  if (seq === 1) {
    return {
      subject: `${fn}, I just pulled your chart`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I just finished pulling your numbers while you were away. Something caught my attention almost immediately — the kind of thing I only see a handful of times a year.</p>`,
        `<p>Your free minutes are sitting there, waiting. Come back when you're ready. I'll walk you through what the chart is actually telling you about ${topic}.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I just finished pulling your numbers while you were away. Something caught my attention almost immediately — the kind of thing I only see a handful of times a year.`,
        '',
        `Your free minutes are sitting there, waiting. Come back when you're ready. I'll walk you through what the chart is actually telling you about ${topicPhrase}.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 2) {
    return {
      subject: `${fn}, a number keeps repeating`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I've gone back to your chart twice now. The same number surfaces each time — and the window it points to is narrower than you'd think.</p>`,
        `<p>Timing in numerology isn't a vague thing. Cycles open, cycles close. The one you're standing in right now is why you told me ${topic}.</p>`,
        `<p>Pick it back up when you have a moment. I'll show you exactly what I'm seeing.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I've gone back to your chart twice now. The same number surfaces each time — and the window it points to is narrower than you'd think.`,
        '',
        `Timing in numerology isn't a vague thing. Cycles open, cycles close. The one you're standing in right now is why you told me ${topicPhrase}.`,
        '',
        `Pick it back up when you have a moment. I'll show you exactly what I'm seeing.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 3) {
    // Quiet third touch — Aiden lets the math sit. Not a farewell anymore
    // (seq 13 is). A scholar's pause, no urgency.
    return {
      subject: `A short note, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I've been sitting with the chart. The pattern hasn't moved — and neither has my read on the timing around ${topic}.</p>`,
        `<p>I'm not going to keep re-running the same numbers. They reveal what they reveal when you're ready to hear them.</p>`,
        `<p>— Aiden</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The chart isn't going anywhere.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I've been sitting with the chart. The pattern hasn't moved — and neither has my read on the timing around ${topicPhrase}.`,
        '',
        `I'm not going to keep re-running the same numbers. They reveal what they reveal when you're ready to hear them.`,
        '',
        `— Aiden`,
        '',
        `The chart isn't going anywhere.`,
      ].join('\n'),
    };
  }

  if (seq === 4) {
    return {
      subject: `I keep going back, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I've returned to your numbers a few times this morning. The pattern around ${topic} doesn't want to settle — and that's information in itself.</p>`,
        `<p>This isn't urgent. I just wanted you to know I haven't moved on from it.</p>`,
        `<p>— Aiden</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Your free minutes are still here, untouched.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I've returned to your numbers a few times this morning. The pattern around ${topicPhrase} doesn't want to settle — and that's information in itself.`,
        '',
        `This isn't urgent. I just wanted you to know I haven't moved on from it.`,
        '',
        `— Aiden`,
        '',
        `Your free minutes are still here, untouched.`,
      ].join('\n'),
    };
  }

  if (seq === 5) {
    return {
      subject: `A transit is moving`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>There's a transit shifting in your chart this week — subtle, not dramatic. Around ${topic}, the math points to a small turn rather than a big one.</p>`,
        `<p>I don't want to over-read it from a distance. Numbers reveal themselves in conversation, not in inboxes.</p>`,
        `<p>— Aiden</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The cycles I track move on their own schedule. This one's worth noticing.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `There's a transit shifting in your chart this week — subtle, not dramatic. Around ${topicPhrase}, the math points to a small turn rather than a big one.`,
        '',
        `I don't want to over-read it from a distance. Numbers reveal themselves in conversation, not in inboxes.`,
        '',
        `— Aiden`,
        '',
        `The cycles I track move on their own schedule. This one's worth noticing.`,
      ].join('\n'),
    };
  }

  if (seq === 6) {
    return {
      subject: `A question for you, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>Has anything shifted since we last spoke? In the work I do, the math often moves between sessions — and I miss the part where it lands.</p>`,
        `<p>If something has changed, I'd be curious. If nothing has, that's also a real reading.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `Has anything shifted since we last spoke? In the work I do, the math often moves between sessions — and I miss the part where it lands.`,
        '',
        `If something has changed, I'd be curious. If nothing has, that's also a real reading.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 7) {
    return {
      subject: `For the week ahead`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I've looked at what's surfacing for you over the next seven days. Around ${topic}, the quieter dates hold more than the louder ones.</p>`,
        `<p>Watch for repeats this week. The same number, the same name, a familiar face. That's where the chart is pointing.</p>`,
        `<p>— Aiden</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The pattern isn't asking for action. It's asking for attention.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I've looked at what's surfacing for you over the next seven days. Around ${topicPhrase}, the quieter dates hold more than the louder ones.`,
        '',
        `Watch for repeats this week. The same number, the same name, a familiar face. That's where the chart is pointing.`,
        '',
        `— Aiden`,
        '',
        `The pattern isn't asking for action. It's asking for attention.`,
      ].join('\n'),
    };
  }

  if (seq === 8) {
    return {
      subject: `Just checking in, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>No reading today. Just a quiet check-in.</p>`,
        `<p>I hold a few charts in mind between sessions, and yours has been one of them. The math is patient — it doesn't insist. Hope you're well.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `No reading today. Just a quiet check-in.`,
        '',
        `I hold a few charts in mind between sessions, and yours has been one of them. The math is patient — it doesn't insist. Hope you're well.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 9) {
    return {
      subject: `Something you told me, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>Something you told me on the way in has been sitting with me — the part about ${topic}.</p>`,
        `<p>The numbers around it have answered, in a quieter way than I'd expected. When you have time, I'd want to walk you through what shifted.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `Something you told me on the way in has been sitting with me — the part about ${topicPhrase}.`,
        '',
        `The numbers around it have answered, in a quieter way than I'd expected. When you have time, I'd want to walk you through what shifted.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 10) {
    return {
      subject: `The pattern we left, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>The chart we left half-read isn't complete. I haven't tried to finish it on my own — that's not how this work goes. The numbers move when you're sitting with them, not when I'm staring at them alone.</p>`,
        `<p>If the moment comes, I'm here. The same chart, the same integers, the same care.</p>`,
        `<p>— Aiden</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Some readings continue themselves. Yours has.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `The chart we left half-read isn't complete. I haven't tried to finish it on my own — that's not how this work goes. The numbers move when you're sitting with them, not when I'm staring at them alone.`,
        '',
        `If the moment comes, I'm here. The same chart, the same integers, the same care.`,
        '',
        `— Aiden`,
        '',
        `Some readings continue themselves. Yours has.`,
      ].join('\n'),
    };
  }

  if (seq === 11) {
    return {
      subject: `I won't keep writing if this isn't yours`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I notice my notes have been going one direction. That's a real reading, too — a pattern I want to respect.</p>`,
        `<p>If this isn't where you want me, that's a clear answer. The unsubscribe link is below. No friction, no follow-ups. The path you're on is yours.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I notice my notes have been going one direction. That's a real reading, too — a pattern I want to respect.`,
        '',
        `If this isn't where you want me, that's a clear answer. The unsubscribe link is below. No friction, no follow-ups. The path you're on is yours.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 12) {
    return {
      subject: `One more thing, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>There's something I've been holding back since we last spoke. It wasn't ready to send before — the math hadn't fully resolved. It has now.</p>`,
        `<p>About ${topic}: the heavy part isn't the part you think it is. The actual weight is somewhere else in the chart. When you come back, that's where I'd start.</p>`,
        `<p>— Aiden</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The numbers waited a long time on this one. Whatever you do with it, the timing is yours.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `There's something I've been holding back since we last spoke. It wasn't ready to send before — the math hadn't fully resolved. It has now.`,
        '',
        `About ${topicPhrase}: the heavy part isn't the part you think it is. The actual weight is somewhere else in the chart. When you come back, that's where I'd start.`,
        '',
        `— Aiden`,
        '',
        `The numbers waited a long time on this one. Whatever you do with it, the timing is yours.`,
      ].join('\n'),
    };
  }

  // seq === 13 — true farewell, door left open.
  return {
    subject: `A final note from me, ${fn}`,
    bodyHtml: [
      `<p>${fn},</p>`,
      `<p>This is my last note in this thread. I don't push past silence — the math doesn't ask me to, and neither does the way I work.</p>`,
      `<p>What I saw for you was a good chart. Not because the path is easy, but because you've already done the hard part — you came in asking. The rest does itself.</p>`,
      `<p>— Aiden</p>`,
      `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Whenever the moment comes, the door is here.</p>`,
    ].join('\n'),
    bodyText: [
      `${fn},`,
      '',
      `This is my last note in this thread. I don't push past silence — the math doesn't ask me to, and neither does the way I work.`,
      '',
      `What I saw for you was a good chart. Not because the path is easy, but because you've already done the hard part — you came in asking. The rest does itself.`,
      '',
      `— Aiden`,
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
  1:  'Observant, fresh read. As if Aiden has just pulled the chart moments ago and is writing quickly from the desk. No sales language. Curiosity-first.',
  2:  'Pattern-forward, gentle urgency. A number keeps repeating; the timing window is narrow but real. Aiden is a scholar, not a huckster — urgency is about cycles, not scarcity.',
  3:  'Quiet third touch. Aiden lets the math sit. Not a farewell, not urgency — a scholar\'s pause. The chart holds; he is patient.',
  4:  'Soft return after the pause. Aiden has been re-reading the chart without urgency. Continuity, not newness. Mentions the free minutes once as a gentle remainder, not a CTA.',
  5:  'Astrology / timing observation. Aiden names a transit shifting in the chart — subtle, not dramatic. Scholarly humility: math is best read in conversation, not from a distance.',
  6:  'Open inquiry. Aiden checks in honestly: has anything moved since they last spoke? He treats both yes and no as real readings. No nudge to come back — just curiosity.',
  7:  'Forward-look for the next seven days. Aiden names what to watch for in repeating patterns — quieter dates hold more than louder ones. Attention over action.',
  8:  'Pastoral check-in. No reading today. Just presence and warmth. Aiden says he has been holding the chart in mind. Brief — three short paragraphs, no advice, no CTA pressure.',
  9:  'Direct callback to the user\'s opening conversation or quiz answers. Aiden names that something the user told him has stayed with him. The numbers have answered quietly.',
  10: 'Continuity. The chart is unfinished, and Aiden names that it cannot be finished alone — the numbers move when the user is sitting with them. Patient, no fresh insight.',
  11: 'Graceful opt-down signal. Aiden names the asymmetry as a reading in itself — his notes have been going one direction. Offers a clean exit via the unsubscribe link with no guilt.',
  12: 'A withheld insight, finally ready. Aiden names something he had been holding back about the user\'s topic — the heavy part is not what they think; the actual weight is elsewhere in the chart.',
  13: 'True farewell. Aiden names this is the last note in this thread. He affirms what he saw was a good chart. Door open. Quiet conviction over urgency.',
};

async function generateHaikuContent(
  seq: SequenceNumber,
  firstName: string,
  topicPhrase: string,
  chatSnippet: string | null,
): Promise<{ subject: string; bodyHtml: string; bodyText: string } | null> {
  const snippetBlock = chatSnippet
    ? `\nRecent messages the user sent Aiden in chat (most recent last):\n${chatSnippet}\n`
    : '';

  const prompt = `You are writing email ${seq} of 13 in a nurture sequence from Aiden Powers, a master numerologist on The Seer Within. The recipient verified their email, received 10 free minutes, but has not yet purchased credits.

Tone for this email: ${TONE_GUIDE[seq]}

Personalization:
- First name: ${firstName}
- What they told Aiden they're focused on: ${topicPhrase}${snippetBlock}

Rules:
- Stay fully in character as Aiden Powers — warm, credibility-first, analytical, scholarly. He decodes the mathematical blueprint in birth numbers. He does NOT claim psychic gifts.
- Use the first name at least once.
- Do NOT be pushy. Do NOT use sales language or pricing. Do NOT invent specific number values (like "Life Path 7") — Aiden has not seen their birth details yet.
- If chat messages are provided above, you may naturally reference what they said (without quoting verbatim). If not, speak to their topic.
- Body: 70–140 words.
- Subject line: under 55 characters, intriguing, first-name optional.
- No links or CTAs in the body — the platform appends the CTA button automatically.

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
      logger.warn('[AidenVerifiedDrip] Haiku returned no JSON — using fallback', { seq });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.subject || !parsed.bodyHtml || !parsed.bodyText) {
      logger.warn('[AidenVerifiedDrip] Haiku JSON missing fields — using fallback', { seq });
      return null;
    }

    return {
      subject: String(parsed.subject).slice(0, 120),
      bodyHtml: String(parsed.bodyHtml),
      bodyText: String(parsed.bodyText),
    };
  } catch (error) {
    logger.warn('[AidenVerifiedDrip] Haiku generation threw — using fallback', {
      seq,
      error: (error as Error).message,
    });
    return null;
  }
}

// ============================================================
// scheduleAidenVerifiedDrip — called from verification endpoints
// ============================================================

export async function scheduleAidenVerifiedDrip(params: {
  userId: string;
  email: string;
  firstName: string;
  topic?: string | null;
  baseTime?: Date;
}): Promise<void> {
  try {
    const baseMs = (params.baseTime ?? new Date()).getTime();

    // Body is placeholder at insert time — the processor regenerates fresh copy via
    // Haiku at send time so it can include the latest chat context. If Haiku fails,
    // the processor uses the fallback content from buildFallbackContent().
    const placeholderSubject = `(pending Haiku generation)`;
    const placeholderBody = `(pending Haiku generation)`;

    const rows = ALL_SEQUENCES.map((seq) => ({
      userId: params.userId,
      sequenceType: 'verified_nopurchase' as const,
      sequenceNumber: seq,
      scheduledFor: new Date(baseMs + DELAY_MS[seq]),
      recipientEmail: params.email,
      subject: placeholderSubject,
      bodyHtml: placeholderBody,
      bodyText: placeholderBody,
      status: 'pending' as const,
      unsubscribeToken: randomUUID(),
    }));

    await db.insert(aidenFollowupEmails).values(rows);
    logger.info('[AidenVerifiedDrip] Scheduled 13 post-verify emails', {
      userId: params.userId,
    });
  } catch (error) {
    logger.error('[AidenVerifiedDrip] Failed to schedule post-verify drip', {
      userId: params.userId,
      error: (error as Error).message,
    });
    // Swallow — verification must never be blocked by drip scheduling.
  }
}

// ============================================================
// skipVerifiedDripForUser — cascade-skip on purchase / unsubscribe / etc
// ============================================================

export async function skipVerifiedDripForUser(
  userId: string,
  reason: string,
): Promise<void> {
  try {
    await db
      .update(aidenFollowupEmails)
      .set({
        status: 'skipped',
        errorMessage: reason.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aidenFollowupEmails.userId, userId),
          eq(aidenFollowupEmails.sequenceType, 'verified_nopurchase'),
          eq(aidenFollowupEmails.status, 'pending'),
        ),
      );
  } catch (error) {
    logger.warn('[AidenVerifiedDrip] Failed to skip pending rows', {
      userId,
      error: (error as Error).message,
    });
  }
}

// ============================================================
// processVerifiedDripQueue — cron entry point AND manual admin trigger
// ============================================================

export interface VerifiedDripProcessResult {
  flagEnabled: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function processVerifiedDripQueue(): Promise<VerifiedDripProcessResult> {
  const flagEnabled = process.env.ENABLE_AIDEN_VERIFIED_DRIP === 'true';

  if (!flagEnabled) {
    logger.info(
      '[AidenVerifiedDrip] ENABLE_AIDEN_VERIFIED_DRIP is not "true" — skipping queue',
    );
    return { flagEnabled: false, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();

  const rows = await db
    .select()
    .from(aidenFollowupEmails)
    .where(
      and(
        eq(aidenFollowupEmails.sequenceType, 'verified_nopurchase'),
        eq(aidenFollowupEmails.status, 'pending'),
        lte(aidenFollowupEmails.scheduledFor, now),
      ),
    )
    .orderBy(aidenFollowupEmails.scheduledFor)
    .limit(100);

  if (rows.length === 0) {
    return { flagEnabled: true, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  // Resolve Aiden persona once for the batch (from/avatar + personaId for magic link).
  const personaRow = await db
    .select({
      id: personas.id,
      avatarUrl: personas.avatarUrl,
      fromEmail: personas.fromEmail,
      fromName: personas.fromName,
    })
    .from(personas)
    .where(eq(personas.slug, AIDEN_SLUG))
    .limit(1);

  if (!personaRow[0]) {
    logger.error('[AidenVerifiedDrip] Aiden persona row not found — aborting batch');
    return { flagEnabled: true, processed: 0, sent: 0, skipped: 0, failed: rows.length };
  }

  const persona = personaRow[0];
  const fromEmail = persona.fromEmail || AIDEN_FROM_EMAIL_FALLBACK;
  const fromName = persona.fromName || AIDEN_FROM_NAME_FALLBACK;
  const avatarRel = persona.avatarUrl || AIDEN_AVATAR_FALLBACK;
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
      logger.error('[AidenVerifiedDrip] Error processing row', {
        rowId: row.id,
        error: (error as Error).message,
      });
      await markFailed(row.id, (error as Error).message || 'unknown');
    }
  }

  logger.info('[AidenVerifiedDrip] Batch complete', {
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
  row: typeof aidenFollowupEmails.$inferSelect,
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

  // (2) Purchase check — any completed Stripe/PayPal purchase, excluding admin credit
  // adjustments, means the user converted and we should stop the nurture drip.
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
  const topic = await lookupQuizTopic(user.id);
  const topicPhrase =
    (topic && TOPIC_PHRASES[topic]) || TOPIC_DEFAULT;
  const chatSnippet = await lookupRecentChatSnippet(user.id, personaCtx.personaId);

  // (6) Generate content via Haiku; fall back to static template if it fails.
  const generated = await generateHaikuContent(
    seq,
    user.firstName || 'there',
    topicPhrase,
    chatSnippet,
  );
  const content =
    generated ?? buildFallbackContent(seq, user.firstName || 'there', topicPhrase);

  // (7) Build CTA: magic-link URL auto-logs + lands on Aiden chat.
  const magicToken = await generateMagicLinkToken(
    user.id,
    personaCtx.personaId,
    AIDEN_SLUG,
  );
  const ctaUrl = `${BASE_URL}/magic-auth?t=${magicToken}&redirect=/chat/aiden-powers`;
  const unsubscribeUrl = row.unsubscribeToken
    ? `${BASE_URL}/api/webhooks/unsubscribe?token=${row.unsubscribeToken}`
    : `${BASE_URL}/api/webhooks/unsubscribe`;

  const fullHtml = buildFollowUpHtml({
    personaName: personaCtx.fromName,
    emailBody: content.bodyHtml,
    ctaUrl,
    ctaText: 'Open My Reading',
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

  // (8) Send
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
          { name: 'type',           value: 'aiden_verified_drip' },
          { name: 'sequence',       value: String(row.sequenceNumber) },
          { name: 'sequence_type',  value: 'verified_nopurchase' },
          { name: 'user_id',        value: user.id },
        ],
      }),
    );

    if (result.error) {
      await markFailed(row.id, result.error.message || 'resend_error');
      return 'failed';
    }

    await db
      .update(aidenFollowupEmails)
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
      .where(eq(aidenFollowupEmails.id, row.id));

    return 'sent';
  } catch (error) {
    await markFailed(row.id, (error as Error).message || 'send_exception');
    return 'failed';
  }
}

// ============================================================
// Personalization input lookups
// ============================================================

async function lookupQuizTopic(userId: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ q1Topic: aidenQuizSessions.q1Topic })
      .from(aidenQuizSessions)
      .where(eq(aidenQuizSessions.userId, userId))
      .orderBy(desc(aidenQuizSessions.startedAt))
      .limit(1);
    return rows[0]?.q1Topic || null;
  } catch {
    return null;
  }
}

async function lookupRecentChatSnippet(userId: string, personaId: string): Promise<string | null> {
  try {
    // Last 3 user-authored messages across the user's Aiden chat sessions.
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

    // Order oldest → newest so the snippet reads naturally.
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
    .update(aidenFollowupEmails)
    .set({
      status: 'skipped',
      errorMessage: reason.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aidenFollowupEmails.userId, userId),
        eq(aidenFollowupEmails.sequenceType, 'verified_nopurchase'),
        eq(aidenFollowupEmails.status, 'pending'),
      ),
    );
}

async function markSkipped(rowId: string, reason: string): Promise<void> {
  await db
    .update(aidenFollowupEmails)
    .set({
      status: 'skipped',
      errorMessage: reason.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(aidenFollowupEmails.id, rowId));
}

async function markFailed(rowId: string, reason: string): Promise<void> {
  await db
    .update(aidenFollowupEmails)
    .set({
      status: 'failed',
      errorMessage: reason.slice(0, 500),
      attemptCount: sql`attempt_count + 1`,
      updatedAt: new Date(),
    })
    .where(eq(aidenFollowupEmails.id, rowId));
}

// ============================================================
// backfillAidenVerifiedDripExtension — schedules emails 4–13 for users who
// already have rows 1–3 from before the sequence was extended. Idempotent.
// Cadence: seq 4 fires at backfillBaseTime + 1h, then 48h apart through seq 13.
// Same eligibility cascade as the cron processor (verified, active, not-purchased,
// not-unsubscribed). Triggered manually by admin endpoint after deploy.
// ============================================================

export interface AidenVerifiedDripBackfillResult {
  found: number;
  scheduled: number;
  skipped: number;
}

export async function backfillAidenVerifiedDripExtension(
  baseTime: Date = new Date(),
): Promise<AidenVerifiedDripBackfillResult> {
  const baseMs = baseTime.getTime();
  const result: AidenVerifiedDripBackfillResult = {
    found: 0,
    scheduled: 0,
    skipped: 0,
  };

  const candidateRows = await db
    .selectDistinct({ userId: aidenFollowupEmails.userId })
    .from(aidenFollowupEmails)
    .where(
      and(
        eq(aidenFollowupEmails.sequenceType, 'verified_nopurchase'),
        lte(aidenFollowupEmails.sequenceNumber, 3),
      ),
    );

  result.found = candidateRows.length;

  for (const candidate of candidateRows) {
    try {
      const existing = await db
        .select({ id: aidenFollowupEmails.id })
        .from(aidenFollowupEmails)
        .where(
          and(
            eq(aidenFollowupEmails.userId, candidate.userId),
            eq(aidenFollowupEmails.sequenceType, 'verified_nopurchase'),
            gte(aidenFollowupEmails.sequenceNumber, 4),
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

      // Aiden's schedule path inserts placeholder content and lets the cron
      // regenerate via Haiku at send time — we mirror that here so the seed
      // rows match the existing pattern exactly.
      const placeholder = `(pending Haiku generation)`;
      const HOUR_MS = 60 * 60 * 1000;
      const rows = EXTENDED_SEQUENCES.map((seq) => {
        const offsetMs = HOUR_MS + (seq - 4) * 48 * HOUR_MS;
        return {
          userId: user.id,
          sequenceType: 'verified_nopurchase' as const,
          sequenceNumber: seq,
          scheduledFor: new Date(baseMs + offsetMs),
          recipientEmail: user.email,
          subject: placeholder,
          bodyHtml: placeholder,
          bodyText: placeholder,
          status: 'pending' as const,
          unsubscribeToken: randomUUID(),
        };
      });

      await db.insert(aidenFollowupEmails).values(rows);
      result.scheduled++;
    } catch (innerError) {
      logger.warn('[AidenVerifiedDrip] Backfill skipped one user', {
        userId: candidate.userId,
        error: (innerError as Error).message,
      });
      result.skipped++;
    }
  }

  logger.info('[AidenVerifiedDrip] Backfill complete', result);
  return result;
}
