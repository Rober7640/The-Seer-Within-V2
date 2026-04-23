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
import { eq, and, lte, ne, desc, sql } from 'drizzle-orm';
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

// Delays measured from user's email-verification time (passed in as baseTime).
const DELAY_MS: Record<1 | 2 | 3, number> = {
  1: 1 * 60 * 60 * 1000,         // +1h
  2: 25 * 60 * 60 * 1000,        // +25h  (= +24h after Email 1)
  3: 49 * 60 * 60 * 1000,        // +49h  (= +24h after Email 2)
};

// Stale windows — if scheduledFor is more than this behind NOW, skip the email
// rather than send something that no longer makes sense.
const STALE_MS: Record<1 | 2 | 3, number> = {
  1: 6 * 60 * 60 * 1000,         // +1h  : skip if >6h late
  2: 20 * 60 * 60 * 1000,        // +25h : skip if >20h late
  3: 24 * 60 * 60 * 1000,        // +49h : skip if >24h late
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
  seq: 1 | 2 | 3,
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

  // seq === 3 — respectful farewell
  return {
    subject: `Last note, ${fn}`,
    bodyHtml: [
      `<p>${fn},</p>`,
      `<p>This will be my last note on this reading. I don't re-run the same chart twice — not out of stubbornness, but because the numbers don't change just because we look again.</p>`,
      `<p>If the timing isn't right today, that's a real answer too. The door stays open for when it is.</p>`,
      `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Either way — the Life Path I saw for you was a good one.</p>`,
      `<p>— Aiden</p>`,
    ].join('\n'),
    bodyText: [
      `${fn},`,
      '',
      `This will be my last note on this reading. I don't re-run the same chart twice — not out of stubbornness, but because the numbers don't change just because we look again.`,
      '',
      `If the timing isn't right today, that's a real answer too. The door stays open for when it is.`,
      '',
      `Either way — the Life Path I saw for you was a good one.`,
      '',
      `— Aiden`,
    ].join('\n'),
  };
}

// ============================================================
// Haiku generation — fresh copy per send, with personalization inputs.
// Falls back to the static template above if anything goes wrong.
// ============================================================

const TONE_GUIDE: Record<1 | 2 | 3, string> = {
  1: 'Observant, fresh read. As if Aiden has just pulled the chart moments ago and is writing quickly from the desk. No sales language. Curiosity-first.',
  2: 'Pattern-forward, gentle urgency. A number keeps repeating; the timing window is narrow but real. Aiden is a scholar, not a huckster — urgency is about cycles, not scarcity.',
  3: 'Respectful farewell. Aiden does not re-run the same chart. Warmth over persuasion. A clean close with the door left open.',
};

async function generateHaikuContent(
  seq: 1 | 2 | 3,
  firstName: string,
  topicPhrase: string,
  chatSnippet: string | null,
): Promise<{ subject: string; bodyHtml: string; bodyText: string } | null> {
  const snippetBlock = chatSnippet
    ? `\nRecent messages the user sent Aiden in chat (most recent last):\n${chatSnippet}\n`
    : '';

  const prompt = `You are writing email ${seq} of 3 in a nurture sequence from Aiden Powers, a master numerologist on The Seer Within. The recipient verified their email, received 10 free minutes, but has not yet purchased credits.

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

    const rows = ([1, 2, 3] as const).map((seq) => ({
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
    logger.info('[AidenVerifiedDrip] Scheduled 3 post-verify emails', {
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
  const seq = row.sequenceNumber as 1 | 2 | 3;
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
