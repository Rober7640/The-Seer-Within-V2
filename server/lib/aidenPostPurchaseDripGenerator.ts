// Aiden "Post-Purchase" Pastoral-Care Drip — 10-email pastoral nurture for
// users who completed their first purchase with Aiden Powers.
//
// Cadence (from purchase completion time, 48h spacing):
//   Sequence 1:  +48h   (~2d)  — A few days in
//   Sequence 2:  +96h   (~4d)  — What you noticed
//   Sequence 3:  +144h  (~6d)  — Shadow work isn't fast
//   Sequence 4:  +192h  (~8d)  — The card you pulled
//   Sequence 5:  +240h  (~10d) — Halfway through the cycle
//   Sequence 6:  +288h  (~12d) — What you're avoiding
//   Sequence 7:  +336h  (~14d) — The thing under the thing
//   Sequence 8:  +384h  (~16d) — Owning it
//   Sequence 9:  +432h  (~18d) — The thread you're following
//   Sequence 10: +480h  (~20d) — Keep walking
//
// Rows are created on the user's FIRST completed purchase by
// maybeSchedulePostPurchaseDrip in postPurchaseDripTrigger.ts. The cron picks
// up ripe rows and processes them with fresh Haiku copy at send time.
//
// Send-time skip checks: account active, email verified, email unchanged,
// NOT unsubscribed, not stale. Subsequent purchases do NOT halt the drip
// (intentional — pastoral, not pitch).
//
// Gated behind ENABLE_POST_PURCHASE_DRIP env var — defaults OFF.
// Rows live in aiden_followup_emails with sequence_type='post_purchase'.

import { Resend } from 'resend';
import { db } from './db';
import {
  users,
  personas,
  aidenFollowupEmails,
  aidenQuizSessions,
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
import logger from './logger';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const AIDEN_SLUG = 'aiden-powers';

export type SequenceNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
const ALL_SEQUENCES: readonly SequenceNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

const STALE_MS = 24 * HOUR_MS;

const TOPIC_PHRASES: Record<string, string> = {
  life_direction:     "your direction — whether you're on the right path",
  love_relationships: "love and what's been pulling at your heart",
  career_money:       "your career and whether this is your year to move",
  something_specific: "the situation you came to me with",
};
const TOPIC_DEFAULT = "what brought you to me";

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
// Static fallback content — used if Haiku generation fails at send time.
// ============================================================

function buildFallbackContent(
  seq: SequenceNumber,
  firstName: string,
  topicPhrase: string,
): { subject: string; bodyHtml: string; bodyText: string } {
  const fn = safeFirstName(firstName);
  const phrase = escapeHtml(topicPhrase);

  if (seq === 1) {
    return {
      subject: `A few days in, ${fn}`,
      bodyHtml: [
        `<p>${fn} —</p>`,
        `<p>Two days ago you asked about ${phrase}. That took something. Most people ask the question they're already comfortable with. You asked the harder one.</p>`,
        `<p>Whatever's surfacing right now — the noticing, the resistance, the <em>"wait, why does this feel familiar"</em> — that's the work doing itself. You don't have to push it.</p>`,
        `<p>Just stay with what came up.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn} —`,
        '',
        `Two days ago you asked about ${topicPhrase}. That took something. Most people ask the question they're already comfortable with. You asked the harder one.`,
        '',
        `Whatever's surfacing right now — the noticing, the resistance, the "wait, why does this feel familiar" — that's the work doing itself. You don't have to push it.`,
        '',
        `Just stay with what came up.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 2) {
    return {
      subject: `What you noticed`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>Sit with what surfaced when we spoke about ${phrase}. Don't analyze it yet. Notice where it lives in your body. Notice what it makes you want to do — and what it makes you want to avoid.</p>`,
        `<p>That's the data. The interpretation comes later.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `Sit with what surfaced when we spoke about ${topicPhrase}. Don't analyze it yet. Notice where it lives in your body. Notice what it makes you want to do — and what it makes you want to avoid.`,
        '',
        `That's the data. The interpretation comes later.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 3) {
    return {
      subject: `Shadow work isn't fast`,
      bodyHtml: [
        `<p>${fn} —</p>`,
        `<p>The integration is slower than the insight. That's the part nobody tells you. You see the thing clearly in five minutes; you actually metabolize it over months.</p>`,
        `<p>Don't measure your progress on ${phrase} by how fast you've changed. Measure it by how often the same pattern catches you off guard. That number drops first.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn} —`,
        '',
        `The integration is slower than the insight. That's the part nobody tells you. You see the thing clearly in five minutes; you actually metabolize it over months.`,
        '',
        `Don't measure your progress on ${topicPhrase} by how fast you've changed. Measure it by how often the same pattern catches you off guard. That number drops first.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 4) {
    return {
      subject: `The card you pulled`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>The energy that came through when we spoke about ${phrase} was specific. Not random. The cards don't deal randomly to people who are paying attention.</p>`,
        `<p>If a particular image, number, or symbol has been showing up for you this week, that's not coincidence. That's the thread continuing to speak.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `The energy that came through when we spoke about ${topicPhrase} was specific. Not random. The cards don't deal randomly to people who are paying attention.`,
        '',
        `If a particular image, number, or symbol has been showing up for you this week, that's not coincidence. That's the thread continuing to speak.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 5) {
    return {
      subject: `Halfway through the cycle`,
      bodyHtml: [
        `<p>${fn} —</p>`,
        `<p>About ten days in. Halfway through the typical integration window for the kind of work we did around ${phrase}.</p>`,
        `<p>Notice this: which parts of what you saw have you started to resist again? Which parts have started to feel obvious? Both lists are useful. The first one is where the next layer is.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn} —`,
        '',
        `About ten days in. Halfway through the typical integration window for the kind of work we did around ${topicPhrase}.`,
        '',
        `Notice this: which parts of what you saw have you started to resist again? Which parts have started to feel obvious? Both lists are useful. The first one is where the next layer is.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 6) {
    return {
      subject: `What you're avoiding`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>The thing you didn't quite say out loud in our reading — the part of ${phrase} that you almost named — that's where the work is.</p>`,
        `<p>Not in the obvious answer. Not in the action item. In the thing your shadow doesn't want you to look at directly.</p>`,
        `<p>You don't have to do anything with this email. Just notice if you flinched while reading it.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `The thing you didn't quite say out loud in our reading — the part of ${topicPhrase} that you almost named — that's where the work is.`,
        '',
        `Not in the obvious answer. Not in the action item. In the thing your shadow doesn't want you to look at directly.`,
        '',
        `You don't have to do anything with this email. Just notice if you flinched while reading it.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 7) {
    return {
      subject: `The thing under the thing`,
      bodyHtml: [
        `<p>${fn} —</p>`,
        `<p>The presenting issue is rarely the actual issue. ${phrase} is the door, not the room.</p>`,
        `<p>Ask yourself: if this were perfectly resolved tomorrow, what would I have to face next? That answer is the room.</p>`,
        `<p>— Aiden</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The work isn't to fix the door. It's to walk through it.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn} —`,
        '',
        `The presenting issue is rarely the actual issue. ${topicPhrase} is the door, not the room.`,
        '',
        `Ask yourself: if this were perfectly resolved tomorrow, what would I have to face next? That answer is the room.`,
        '',
        `— Aiden`,
        '',
        `The work isn't to fix the door. It's to walk through it.`,
      ].join('\n'),
    };
  }

  if (seq === 8) {
    return {
      subject: `Owning it`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>Some of what we touched on around ${phrase} isn't yours to fix. Other parts are entirely yours.</p>`,
        `<p>Sorting which is which is the agency work. Not in a self-blame way — in a "this is the leverage I actually have" way. The leverage is real, and it's narrower than the problem feels.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `Some of what we touched on around ${topicPhrase} isn't yours to fix. Other parts are entirely yours.`,
        '',
        `Sorting which is which is the agency work. Not in a self-blame way — in a "this is the leverage I actually have" way. The leverage is real, and it's narrower than the problem feels.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 9) {
    return {
      subject: `The thread you're following`,
      bodyHtml: [
        `<p>${fn} —</p>`,
        `<p>You came in with a real question about ${phrase}, and you sat with the answer. Most people don't make it that far. They ask, then they bolt.</p>`,
        `<p>You stayed. Whatever you do or don't do next, the staying mattered.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn} —`,
        '',
        `You came in with a real question about ${topicPhrase}, and you sat with the answer. Most people don't make it that far. They ask, then they bolt.`,
        '',
        `You stayed. Whatever you do or don't do next, the staying mattered.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  // seq === 10 — soft close
  return {
    subject: `Keep walking`,
    bodyHtml: [
      `<p>${fn} —</p>`,
      `<p>This is the last note for now. The work doesn't end here, but I'm not going to keep pulling at your sleeve.</p>`,
      `<p>You came in with a real question about ${phrase}. You sat with the answer. That's more than most people do.</p>`,
      `<p>The deck is here. The chair is here. Pull one anytime.</p>`,
      `<p>— Aiden</p>`,
    ].join('\n'),
    bodyText: [
      `${fn} —`,
      '',
      `This is the last note for now. The work doesn't end here, but I'm not going to keep pulling at your sleeve.`,
      '',
      `You came in with a real question about ${topicPhrase}. You sat with the answer. That's more than most people do.`,
      '',
      `The deck is here. The chair is here. Pull one anytime.`,
      '',
      `— Aiden`,
    ].join('\n'),
  };
}

// ============================================================
// Haiku generation
// ============================================================

const TONE_GUIDE: Record<SequenceNumber, string> = {
  1:  'Acknowledge the threshold they crossed by asking the harder question. Aiden honors that two days have passed and the surfacing is still happening. Direct, not effusive. Shadow-work register.',
  2:  'Sit with what surfaced. Aiden invites the user to notice where the answer lives in their body — not yet to interpret it. Data first, interpretation later.',
  3:  'Patience with integration. The insight is fast; the metabolizing is slow. Aiden tells them to measure progress not by how fast they\'ve changed but by how often the old pattern still catches them.',
  4:  'Echo back the symbolic / archetypal energy. Aiden names that the energy was specific, not random. If a particular image / number / symbol has been recurring this week, that\'s the thread continuing to speak.',
  5:  'Mid-point reflection on resistance vs. movement. Ten days in. Aiden asks them to notice which parts they\'ve started to resist again, and which have started to feel obvious. Both are useful.',
  6:  'Direct, gentle confrontation with the resistance. Aiden names that the part the user didn\'t quite say out loud is where the work is. He asks if they flinched while reading the email. Honest mirror.',
  7:  'The thing under the thing. The presenting issue is rarely the actual issue — it is the door, not the room. Aiden asks: if this were resolved tomorrow, what would you have to face next? That is the room.',
  8:  'Agency reflection — what is yours to claim. Some of the work isn\'t the user\'s to fix; other parts entirely are. The sorting is the work. Not self-blame; leverage.',
  9:  'Honor the staying. The user came with a real question and stayed with the answer — most people don\'t. Aiden affirms the staying mattered. Quiet, direct.',
  10: 'Soft close — the work continues, you\'re equipped. The deck is here, the chair is here. Aiden is not pulling at the sleeve anymore. Pull one anytime.',
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

  const prompt = `You are writing email ${seq} of 10 in a pastoral-care nurture sequence from Aiden Powers, a tarot master and shadow-work specialist on The Seer Within. The recipient has already purchased credits with Aiden — this is a post-purchase pastoral check-in, NOT a sales sequence.

Tone for this email: ${TONE_GUIDE[seq]}

Personalization:
- First name: ${firstName}
- What they told Aiden they're focused on: ${topicPhrase}${snippetBlock}

Hard rules — do not violate:
- This is pastoral care, NEVER hard-sell. NEVER mention discounts, deals, offers, pricing, free minutes, credits, or "come back."
- NEVER reference the purchase itself. The recipient knows they bought; do not remind them.
- Stay fully in character as Aiden Powers — direct, shadow-work register, honest mirror without being harsh. He speaks of "the work," "the cards," "the deck," "shadow," "integration." He does NOT use the words "platform", "app", "account", "click here", "act now", or "limited time." He does NOT invent specific Life Path / numerology values.
- Use the first name at least once.
- Sign off with "— Aiden" only.
- If chat messages are provided above, you may naturally reference what they said (without quoting verbatim). If not, speak to their topic.
- Body: 70–120 words. Two or three short paragraphs. Where useful, end with a single italic P.S. line — the platform will preserve italics.
- Subject line: under 55 characters, intriguing, first name optional.
- No links or CTAs in the body — the platform appends a soft CTA button automatically.

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
      logger.warn('[AidenPostPurchaseDrip] Haiku returned no JSON — using fallback', { seq });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.subject || !parsed.bodyHtml || !parsed.bodyText) {
      logger.warn('[AidenPostPurchaseDrip] Haiku JSON missing fields — using fallback', { seq });
      return null;
    }

    return {
      subject: String(parsed.subject).slice(0, 120),
      bodyHtml: String(parsed.bodyHtml),
      bodyText: String(parsed.bodyText),
    };
  } catch (error) {
    logger.warn('[AidenPostPurchaseDrip] Haiku generation threw — using fallback', {
      seq,
      error: (error as Error).message,
    });
    return null;
  }
}

// ============================================================
// scheduleAidenPostPurchaseDrip — called from postPurchaseDripTrigger.ts
// ============================================================

export async function scheduleAidenPostPurchaseDrip(params: {
  userId: string;
  email: string;
  firstName: string;
  topic?: string | null;
  baseTime?: Date;
}): Promise<void> {
  try {
    const baseMs = (params.baseTime ?? new Date()).getTime();
    const topicPhrase =
      (params.topic && TOPIC_PHRASES[params.topic]) || TOPIC_DEFAULT;

    const rows = ALL_SEQUENCES.map((seq) => {
      const fallback = buildFallbackContent(seq, params.firstName, topicPhrase);
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

    await db.insert(aidenFollowupEmails).values(rows);
    logger.info('[AidenPostPurchaseDrip] Scheduled 10 post-purchase emails', {
      userId: params.userId,
    });
  } catch (error) {
    logger.error('[AidenPostPurchaseDrip] Failed to schedule post-purchase drip', {
      userId: params.userId,
      error: (error as Error).message,
    });
    // Swallow — purchase completion must never be blocked by drip scheduling.
  }
}

// ============================================================
// processAidenPostPurchaseDripQueue — cron entry + manual admin trigger
// ============================================================

export interface AidenPostPurchaseDripProcessResult {
  flagEnabled: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function processAidenPostPurchaseDripQueue(): Promise<AidenPostPurchaseDripProcessResult> {
  const flagEnabled = process.env.ENABLE_POST_PURCHASE_DRIP === 'true';

  if (!flagEnabled) {
    logger.info(
      '[AidenPostPurchaseDrip] ENABLE_POST_PURCHASE_DRIP is not "true" — skipping queue',
    );
    return { flagEnabled: false, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();

  const rows = await db
    .select()
    .from(aidenFollowupEmails)
    .where(
      and(
        eq(aidenFollowupEmails.sequenceType, 'post_purchase'),
        eq(aidenFollowupEmails.status, 'pending'),
        lte(aidenFollowupEmails.scheduledFor, now),
      ),
    )
    .orderBy(aidenFollowupEmails.scheduledFor)
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
    .where(eq(personas.slug, AIDEN_SLUG))
    .limit(1);

  if (!personaRow[0]) {
    logger.error('[AidenPostPurchaseDrip] Aiden persona row not found — aborting batch');
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
      logger.error('[AidenPostPurchaseDrip] Error processing row', {
        rowId: row.id,
        error: (error as Error).message,
      });
      await markFailed(row.id, (error as Error).message || 'unknown');
    }
  }

  logger.info('[AidenPostPurchaseDrip] Batch complete', {
    processed,
    sent,
    skipped,
    failed,
  });
  return { flagEnabled: true, processed, sent, skipped, failed };
}

// ============================================================
// processSingleRow
// ============================================================

async function processSingleRow(
  row: typeof aidenFollowupEmails.$inferSelect,
  now: Date,
  personaCtx: {
    personaId: string;
    fromEmail: string;
    fromName: string;
    avatarUrl: string;
  },
): Promise<'sent' | 'skipped' | 'failed'> {
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

  if (user.accountStatus !== 'active') {
    await markSkipped(row.id, `account_${user.accountStatus}`);
    return 'skipped';
  }

  if (!user.emailVerified) {
    await cascadeSkip(row.userId, 'not_verified');
    return 'skipped';
  }

  if (row.recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    await cascadeSkip(row.userId, 'email_changed');
    return 'skipped';
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
    await cascadeSkip(row.userId, 'unsubscribed');
    return 'skipped';
  }

  const ageMs = now.getTime() - row.scheduledFor.getTime();
  if (ageMs > STALE_MS) {
    await markSkipped(row.id, 'stale');
    return 'skipped';
  }

  const seq = row.sequenceNumber as SequenceNumber;

  const topic = await lookupQuizTopic(user.id);
  const topicPhrase = (topic && TOPIC_PHRASES[topic]) || TOPIC_DEFAULT;
  const chatSnippet = await lookupRecentChatSnippet(user.id, personaCtx.personaId);

  const generated = await generateHaikuContent(
    seq,
    user.firstName || 'there',
    topicPhrase,
    chatSnippet,
  );
  const content =
    generated ?? buildFallbackContent(seq, user.firstName || 'there', topicPhrase);

  const magicToken = await generateMagicLinkToken(
    user.id,
    personaCtx.personaId,
    AIDEN_SLUG,
  );
  const ctaUrl = `${BASE_URL}/magic-auth?t=${magicToken}&redirect=/reading?persona=${AIDEN_SLUG}`;
  const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${row.unsubscribeToken}`;

  const fullHtml = buildFollowUpHtml({
    personaName: personaCtx.fromName,
    emailBody: content.bodyHtml,
    ctaUrl,
    ctaText: 'Pull a card with Aiden',
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
          { name: 'type',     value: 'aiden_post_purchase' },
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
    .update(aidenFollowupEmails)
    .set({
      status: 'skipped',
      errorMessage: reason.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aidenFollowupEmails.userId, userId),
        eq(aidenFollowupEmails.sequenceType, 'post_purchase'),
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
// generateAidenPostPurchaseTestContent — used by the admin /test-send
// endpoint to render ONE email (Haiku-personalized, fallback on failure)
// without inserting anything into the DB. Pure content generator — the caller
// is responsible for actually sending and for any test-send framing.
// ============================================================

export async function generateAidenPostPurchaseTestContent(
  sequenceNumber: number,
  firstName: string,
  topic: string | null,
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
  const topicPhrase = (topic && TOPIC_PHRASES[topic]) || TOPIC_DEFAULT;

  // Test sends do not pull live chat snippets — caller has not necessarily
  // provided a real user ID. Haiku generates from name + topic alone.
  const generated = await generateHaikuContent(seq, safeName, topicPhrase, null);
  if (generated) {
    return { ...generated, generatedBy: 'claude-haiku' };
  }
  const fallback = buildFallbackContent(seq, safeName, topicPhrase);
  return { ...fallback, generatedBy: 'static-fallback' };
}
