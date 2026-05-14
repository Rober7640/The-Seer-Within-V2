// Evelyn "Post-Purchase" Pastoral-Care Drip — 10-email pastoral nurture for
// users who completed their first purchase with Evelyn (or default persona).
//
// Cadence (from purchase completion time, 48h spacing):
//   Sequence 1:  +48h   (~2d)  — Just thinking of you
//   Sequence 2:  +96h   (~4d)  — Something stayed with me
//   Sequence 3:  +144h  (~6d)  — Slow and steady
//   Sequence 4:  +192h  (~8d)  — The quiet answer
//   Sequence 5:  +240h  (~10d) — A small marker
//   Sequence 6:  +288h  (~12d) — I keep coming back to this
//   Sequence 7:  +336h  (~14d) — Faith in the unseen
//   Sequence 8:  +384h  (~16d) — What's stirring for you?
//   Sequence 9:  +432h  (~18d) — The longer view
//   Sequence 10: +480h  (~20d) — Still here, always
//
// Rows are created on the user's FIRST completed purchase by
// maybeSchedulePostPurchaseDrip in postPurchaseDripTrigger.ts. The cron picks
// up ripe rows and processes them with fresh Haiku copy at send time.
//
// Send-time skip checks: account active, email verified, email unchanged,
// NOT unsubscribed, not stale. Subsequent purchases do NOT halt the drip
// (intentional — these are pastoral, not pitch emails, per product spec).
//
// Gated behind ENABLE_POST_PURCHASE_DRIP env var — defaults OFF.
// Rows live in evelyn_followup_emails with sequence_type='post_purchase'.

import { Resend } from 'resend';
import { db } from './db';
import {
  users,
  personas,
  evelynFollowupEmails,
  userFollowUpPreferences,
  chatSessions,
  chatMessages,
} from '@shared/schema';
import { eq, and, lte, desc, sql } from 'drizzle-orm';
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

export type SequenceNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
const ALL_SEQUENCES: readonly SequenceNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Fixed 48h spacing from purchase completion time.
const HOUR_MS = 60 * 60 * 1000;
const DELAY_MS: Record<SequenceNumber, number> = {
  1:  48  * HOUR_MS,
  2:  96  * HOUR_MS,
  3:  144 * HOUR_MS,
  4:  192 * HOUR_MS,
  5:  240 * HOUR_MS,
  6:  288 * HOUR_MS,
  7:  336 * HOUR_MS,
  8:  384 * HOUR_MS,
  9:  432 * HOUR_MS,
  10: 480 * HOUR_MS,
};

// Stale window: skip if scheduledFor is more than 24h behind NOW. Prevents
// firing days-late copy if the cron was paused / flag was off when the row
// became ripe.
const STALE_MS = 24 * HOUR_MS;

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
// Static fallback content — used if Haiku generation fails at send time.
// These are the approved 10-email pastoral-care arc.
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
      subject: `Just thinking of you, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>A couple of days have passed since we spoke about ${phrase}. I wanted to send a small note — no agenda, just to say I'm holding what you shared.</p>`,
        `<p>Sometimes the most important things settle in slowly. The space between conversations can matter as much as the conversation itself.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `A couple of days have passed since we spoke about ${bucketPhrase}. I wanted to send a small note — no agenda, just to say I'm holding what you shared.`,
        '',
        `Sometimes the most important things settle in slowly. The space between conversations can matter as much as the conversation itself.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 2) {
    return {
      subject: `Something stayed with me`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>Something from our reading has stayed with me — a particular detail around ${phrase}. I won't try to put words to it from here. Some things land differently when they come back to you on their own.</p>`,
        `<p>Just wanted you to know I haven't put it down.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `Something from our reading has stayed with me — a particular detail around ${bucketPhrase}. I won't try to put words to it from here. Some things land differently when they come back to you on their own.`,
        '',
        `Just wanted you to know I haven't put it down.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 3) {
    return {
      subject: `Slow and steady, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>A reminder that the kind of work we touched together moves at its own pace. Don't push at it. Don't grasp.</p>`,
        `<p>The thread around ${phrase} is unfolding — not always where you can see it. Trust that the unfolding is happening.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `A reminder that the kind of work we touched together moves at its own pace. Don't push at it. Don't grasp.`,
        '',
        `The thread around ${bucketPhrase} is unfolding — not always where you can see it. Trust that the unfolding is happening.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 4) {
    return {
      subject: `The quiet answer`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>Sometimes the answer to ${phrase} doesn't arrive as a thunderbolt. It arrives as a quiet shift — something you barely notice until you look back and realize the ground has moved.</p>`,
        `<p>Listen for the small shifts this week. They are answers, even when they don't feel like ones.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The loud answers aren't always the true ones.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `Sometimes the answer to ${bucketPhrase} doesn't arrive as a thunderbolt. It arrives as a quiet shift — something you barely notice until you look back and realize the ground has moved.`,
        '',
        `Listen for the small shifts this week. They are answers, even when they don't feel like ones.`,
        '',
        `— Evelyn`,
        '',
        `The loud answers aren't always the true ones.`,
      ].join('\n'),
    };
  }

  if (seq === 5) {
    return {
      subject: `A small marker, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>It's been about ten days. I'm not writing because I think you should have figured anything out by now — quite the opposite. Some things take a season, and a season is longer than ten days.</p>`,
        `<p>What I want to say is this: you came to me with something real. ${phrase}. That hasn't changed shape in my mind. I'm still thinking about you.</p>`,
        `<p>No need to reply. Just wanted you to know.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `It's been about ten days. I'm not writing because I think you should have figured anything out by now — quite the opposite. Some things take a season, and a season is longer than ten days.`,
        '',
        `What I want to say is this: you came to me with something real. ${bucketPhrase}. That hasn't changed shape in my mind. I'm still thinking about you.`,
        '',
        `No need to reply. Just wanted you to know.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 6) {
    return {
      subject: `I keep coming back to this`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I keep coming back to a specific moment from our reading. I won't repeat it back to you — your words landed differently than mine could.</p>`,
        `<p>But it's still doing its work in my mind around ${phrase}. Whatever you said that day, I want you to know it mattered.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I keep coming back to a specific moment from our reading. I won't repeat it back to you — your words landed differently than mine could.`,
        '',
        `But it's still doing its work in my mind around ${bucketPhrase}. Whatever you said that day, I want you to know it mattered.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 7) {
    return {
      subject: `Faith in the unseen`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>The hardest part of this work is trusting what you can't see yet. ${phrase} is one of those threads — it's moving, but not always in places visible from where you're standing.</p>`,
        `<p>Faith in the unseen isn't naive. It's the practice of holding open the possibility while the picture is still developing.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `The hardest part of this work is trusting what you can't see yet. ${bucketPhrase} is one of those threads — it's moving, but not always in places visible from where you're standing.`,
        '',
        `Faith in the unseen isn't naive. It's the practice of holding open the possibility while the picture is still developing.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 8) {
    return {
      subject: `What's stirring for you?`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>A gentle wondering — what's stirring for you these days, around ${phrase} or anything else?</p>`,
        `<p>I'm not asking because I expect a particular answer. I'm asking because the noticing itself is where the work lives. If something is shifting, it's worth pausing to feel its shape.</p>`,
        `<p>— Evelyn</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `A gentle wondering — what's stirring for you these days, around ${bucketPhrase} or anything else?`,
        '',
        `I'm not asking because I expect a particular answer. I'm asking because the noticing itself is where the work lives. If something is shifting, it's worth pausing to feel its shape.`,
        '',
        `— Evelyn`,
      ].join('\n'),
    };
  }

  if (seq === 9) {
    return {
      subject: `The longer view, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>Looking back over the last few weeks: what felt impossible when we first spoke about ${phrase} may feel different now. Not solved — just different. Less heavy at the edges.</p>`,
        `<p>That's the longer view. The path you're walking has more shape than it looked like at the start.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Distance is its own kind of clarity.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `Looking back over the last few weeks: what felt impossible when we first spoke about ${bucketPhrase} may feel different now. Not solved — just different. Less heavy at the edges.`,
        '',
        `That's the longer view. The path you're walking has more shape than it looked like at the start.`,
        '',
        `— Evelyn`,
        '',
        `Distance is its own kind of clarity.`,
      ].join('\n'),
    };
  }

  // seq === 10 — soft close, presence not goodbye
  return {
    subject: `Still here, always`,
    bodyHtml: [
      `<p>${fn},</p>`,
      `<p>This is the last in a small handful of notes I wanted to send after we first spoke. Not because anything has ended — but because I don't want to clutter your inbox.</p>`,
      `<p>Whatever has shifted (or hasn't), ${phrase} was real, and it deserved attention. You gave it that.</p>`,
      `<p>I'll be here whenever you want to talk again. No clock, no expectation. Just here.</p>`,
      `<p>— Evelyn</p>`,
    ].join('\n'),
    bodyText: [
      `${fn},`,
      '',
      `This is the last in a small handful of notes I wanted to send after we first spoke. Not because anything has ended — but because I don't want to clutter your inbox.`,
      '',
      `Whatever has shifted (or hasn't), ${bucketPhrase} was real, and it deserved attention. You gave it that.`,
      '',
      `I'll be here whenever you want to talk again. No clock, no expectation. Just here.`,
      '',
      `— Evelyn`,
    ].join('\n'),
  };
}

// ============================================================
// Haiku generation — fresh copy per send. Falls back to static templates above.
// ============================================================

const TONE_GUIDE: Record<SequenceNumber, string> = {
  1:  'Soft check-in, no agenda. Two days have passed since the conversation. Evelyn is sending a small note just to say she is holding what was shared. The tone is presence, not pitch. She does NOT mention the purchase, credits, or returning to chat.',
  2:  'Reflection on a specific detail. Evelyn names that something from the conversation has stayed with her. She does not quote it back; she lets it breathe. The tone is contemplative, not nostalgic.',
  3:  'Honor pace. Evelyn reminds the recipient that this kind of work moves at its own speed. Don\'t push, don\'t grasp. The thread is unfolding even when it is not visible.',
  4:  'The quiet answer. Subtle shifts vs. thunderbolts. Evelyn invites the user to listen for small shifts this week — they are answers even when they don\'t feel like ones.',
  5:  'Mid-point grounding. Ten days have passed. Evelyn is not measuring outcomes. She names the topic again with care and says she is still thinking about them. No reply expected.',
  6:  'Direct callback to a moment from the original reading without quoting verbatim. Evelyn names that whatever the user said that day mattered, and is still doing its work in her mind.',
  7:  'Trust beyond what is visible. Faith in the unseen is not naive — it is the practice of holding the possibility while the picture develops. Wisdom-of-elders register, gentle.',
  8:  'Gentle invitation, no pressure. A wondering: what is stirring for you these days? Asks because the noticing itself is where the work lives. Curiosity, not nudge.',
  9:  'Longer-view reflection. What felt impossible weeks ago may feel different now — not solved, just different. Less heavy at the edges. Honors the distance traveled.',
  10: 'Soft close. The last note. Not a goodbye — Evelyn names she does not want to clutter the inbox, and that she is still here whenever they want to talk. Presence, no expectation.',
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

  const prompt = `You are writing email ${seq} of 10 in a pastoral-care nurture sequence from Evelyn Cross, a spiritual guide on The Seer Within. The recipient has already purchased credits with Evelyn — this is a post-purchase pastoral check-in, NOT a sales sequence.

Tone for this email: ${TONE_GUIDE[seq]}

Personalization:
- First name: ${firstName}
- What they came to Evelyn about: ${bucketPhrase}${snippetBlock}

Hard rules — do not violate:
- This is pastoral care, NEVER hard-sell. NEVER mention discounts, deals, offers, pricing, free minutes, credits, or "come back."
- NEVER reference the purchase itself. The recipient knows they bought; do not remind them.
- Stay fully in character as Evelyn Cross — warm, intuitive, spiritual register. She speaks of "the thread," "the energy," "the path." She does NOT use the words "platform", "app", "account", "click here", "act now", or "limited time."
- Use the first name at least once (open with "${firstName}," — no "Dear" or "Hi").
- Sign off with "— Evelyn" only.
- If chat messages are provided above, you may naturally reference what they said (without quoting verbatim). If not, speak to their topic.
- Body: 70–110 words. Two or three short paragraphs.
- Subject line: under 55 characters, evocative, first name optional.
- No links or CTAs in the body — the platform appends a soft CTA button automatically.
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
      logger.warn('[EvelynPostPurchaseDrip] Haiku returned no JSON — using fallback', { seq });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.subject || !parsed.bodyHtml || !parsed.bodyText) {
      logger.warn('[EvelynPostPurchaseDrip] Haiku JSON missing fields — using fallback', { seq });
      return null;
    }

    return {
      subject: String(parsed.subject).slice(0, 120),
      bodyHtml: String(parsed.bodyHtml),
      bodyText: String(parsed.bodyText),
    };
  } catch (error) {
    logger.warn('[EvelynPostPurchaseDrip] Haiku generation threw — using fallback', {
      seq,
      error: (error as Error).message,
    });
    return null;
  }
}

// ============================================================
// scheduleEvelynPostPurchaseDrip — called from postPurchaseDripTrigger.ts
// when a user's FIRST completed purchase lands and their persona is Evelyn.
// ============================================================

export async function scheduleEvelynPostPurchaseDrip(params: {
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

    // Seed rows with static fallback content so admin previews are meaningful
    // before the cron has fired. The processor regenerates fresh Haiku copy at
    // send time and overwrites these fields on success.
    const rows = ALL_SEQUENCES.map((seq) => {
      const fallback = buildFallbackContent(seq, params.firstName, bucketPhrase);
      return {
        userId: params.userId,
        sequenceType: 'post_purchase' as const,
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
    logger.info('[EvelynPostPurchaseDrip] Scheduled 10 post-purchase emails', {
      userId: params.userId,
    });
  } catch (error) {
    logger.error('[EvelynPostPurchaseDrip] Failed to schedule post-purchase drip', {
      userId: params.userId,
      error: (error as Error).message,
    });
    // Swallow — purchase completion must never be blocked by drip scheduling.
  }
}

// ============================================================
// processEvelynPostPurchaseDripQueue — cron entry + manual admin trigger
// ============================================================

export interface EvelynPostPurchaseDripProcessResult {
  flagEnabled: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function processEvelynPostPurchaseDripQueue(): Promise<EvelynPostPurchaseDripProcessResult> {
  const flagEnabled = process.env.ENABLE_POST_PURCHASE_DRIP === 'true';

  if (!flagEnabled) {
    logger.info(
      '[EvelynPostPurchaseDrip] ENABLE_POST_PURCHASE_DRIP is not "true" — skipping queue',
    );
    return { flagEnabled: false, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();

  const rows = await db
    .select()
    .from(evelynFollowupEmails)
    .where(
      and(
        eq(evelynFollowupEmails.sequenceType, 'post_purchase'),
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
    logger.error('[EvelynPostPurchaseDrip] Evelyn persona row not found — aborting batch');
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
      const outcome = await processSingleRow(row, now, {
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
      logger.error('[EvelynPostPurchaseDrip] Error processing row', {
        rowId: row.id,
        error: (error as Error).message,
      });
      await markFailed(row.id, (error as Error).message || 'unknown');
    }
  }

  logger.info('[EvelynPostPurchaseDrip] Batch complete', {
    processed,
    sent,
    skipped,
    failed,
  });
  return { flagEnabled: true, processed, sent, skipped, failed };
}

// ============================================================
// processSingleRow — send-time skip checks + Haiku + Resend send
// ============================================================

async function processSingleRow(
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

  // Account must still be active. Pastoral care does not chase deactivated users.
  if (user.accountStatus !== 'active') {
    await markSkipped(row.id, `account_${user.accountStatus}`);
    return 'skipped';
  }

  // Email must still be verified (post-purchase users always are at trigger time,
  // but defensive check in case admin un-verified them).
  if (!user.emailVerified) {
    await cascadeSkip(row.userId, 'not_verified');
    return 'skipped';
  }

  // Email changed since schedule → drip stops (the content no longer applies).
  if (row.recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    await cascadeSkip(row.userId, 'email_changed');
    return 'skipped';
  }

  // (2) Unsubscribe check — the only stop condition for this drip
  // (subsequent purchases do NOT halt; this is pastoral, not pitch).
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

  // (3) Stale window
  const ageMs = now.getTime() - row.scheduledFor.getTime();
  if (ageMs > STALE_MS) {
    await markSkipped(row.id, 'stale');
    return 'skipped';
  }

  const seq = row.sequenceNumber as SequenceNumber;

  // (4) Personalization inputs
  const bucket = await lookupEvelynBucket(user.id);
  const bucketPhrase = (bucket && BUCKET_PHRASES[bucket]) || BUCKET_DEFAULT;
  const chatSnippet = await lookupRecentChatSnippet(user.id, personaCtx.personaId);

  // (5) Haiku generation, fall back to static template on failure
  const generated = await generateHaikuContent(
    seq,
    user.firstName || 'there',
    bucketPhrase,
    chatSnippet,
  );
  const content =
    generated ?? buildFallbackContent(seq, user.firstName || 'there', bucketPhrase);

  // (6) CTA: magic-link auto-logs and lands on Evelyn chat
  const magicToken = await generateMagicLinkToken(
    user.id,
    personaCtx.personaId,
    EVELYN_SLUG,
  );
  const ctaUrl = `${BASE_URL}/magic-auth?t=${magicToken}&redirect=/reading?persona=${EVELYN_SLUG}`;
  const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${row.unsubscribeToken}`;

  // (7) Render full HTML/text via shared template
  const fullHtml = buildFollowUpHtml({
    personaName: personaCtx.fromName,
    emailBody: content.bodyHtml,
    ctaUrl,
    ctaText: 'Talk with Evelyn',
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
          { name: 'type',     value: 'evelyn_post_purchase' },
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
        eq(evelynFollowupEmails.sequenceType, 'post_purchase'),
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
// generateEvelynPostPurchaseTestContent — used by the admin /test-send
// endpoint to render ONE email (Haiku-personalized, fallback on failure)
// without inserting anything into the DB. Pure content generator — the caller
// is responsible for actually sending and for any test-send framing.
// ============================================================

export async function generateEvelynPostPurchaseTestContent(
  sequenceNumber: number,
  firstName: string,
  bucket: string | null,
): Promise<{
  subject: string;
  bodyHtml: string;
  bodyText: string;
  generatedBy: 'claude-haiku' | 'static-fallback';
}> {
  if (sequenceNumber < 1 || sequenceNumber > 10) {
    throw new Error(`sequenceNumber must be 1-10 (got ${sequenceNumber})`);
  }
  const seq = sequenceNumber as SequenceNumber;
  const safeName = firstName?.trim() || 'there';
  const bucketPhrase = (bucket && BUCKET_PHRASES[bucket]) || BUCKET_DEFAULT;

  // Test sends do not pull live chat snippets — caller has not necessarily
  // provided a real user ID. Haiku generates from name + bucket alone.
  const generated = await generateHaikuContent(seq, safeName, bucketPhrase, null);
  if (generated) {
    return { ...generated, generatedBy: 'claude-haiku' };
  }
  const fallback = buildFallbackContent(seq, safeName, bucketPhrase);
  return { ...fallback, generatedBy: 'static-fallback' };
}
