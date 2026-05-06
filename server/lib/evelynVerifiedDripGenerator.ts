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
import { eq, and, lte, ne, desc, sql } from 'drizzle-orm';
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

// Delays measured from user's email-verification time (passed as baseTime).
const DELAY_MS: Record<1 | 2 | 3, number> = {
  1: 1 * 60 * 60 * 1000,         // +1h
  2: 25 * 60 * 60 * 1000,        // +25h
  3: 49 * 60 * 60 * 1000,        // +49h
};

const STALE_MS: Record<1 | 2 | 3, number> = {
  1: 6 * 60 * 60 * 1000,
  2: 20 * 60 * 60 * 1000,
  3: 24 * 60 * 60 * 1000,
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
  seq: 1 | 2 | 3,
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

  // seq === 3 — respectful farewell
  return {
    subject: `A final word, ${fn}`,
    bodyHtml: [
      `<p>${fn},</p>`,
      `<p>This will be my last note about what came through after we spoke. I don't keep returning to the same reading — not out of distance, but because some things only land when you're ready, and pressing them changes the energy.</p>`,
      `<p>If the timing isn't right today, that's a real answer too. The space stays here for when it is.</p>`,
      `<p>— Evelyn</p>`,
      `<p style="margin-top:28px;font-style:italic;color:#6a6275;">What I saw for you was good. Whether you act on it now or later, the path holds.</p>`,
    ].join('\n'),
    bodyText: [
      `${fn},`,
      '',
      `This will be my last note about what came through after we spoke. I don't keep returning to the same reading — not out of distance, but because some things only land when you're ready, and pressing them changes the energy.`,
      '',
      `If the timing isn't right today, that's a real answer too. The space stays here for when it is.`,
      '',
      `— Evelyn`,
      '',
      `What I saw for you was good. Whether you act on it now or later, the path holds.`,
    ].join('\n'),
  };
}

// ============================================================
// Haiku generation — fresh copy per send, with personalization inputs.
// Falls back to the static template above if anything goes wrong.
// ============================================================

const TONE_GUIDE: Record<1 | 2 | 3, string> = {
  1: 'Continuation of the thread. Evelyn caught something fresh in the quiet after the conversation ended. Conversational and grounded, not breathless. Free minutes are mentioned as already-theirs, not a call to action.',
  2: 'Pattern-forward, soft urgency framed as cycles, not scarcity. Evelyn has revisited the reading and the same energy keeps surfacing. The window is real but small. Warm — never pushy. No sales register.',
  3: 'Respectful farewell. Evelyn does not pursue. She names that she will stop reaching out but leaves the door open. The closing line is not a guilt trip. Quiet conviction over urgency.',
};

async function generateHaikuContent(
  seq: 1 | 2 | 3,
  firstName: string,
  bucketPhrase: string,
  chatSnippet: string | null,
): Promise<{ subject: string; bodyHtml: string; bodyText: string } | null> {
  const snippetBlock = chatSnippet
    ? `\nRecent messages the user sent Evelyn in chat (most recent last):\n${chatSnippet}\n`
    : '';

  const prompt = `You are writing email ${seq} of 3 in a nurture sequence from Evelyn Cross, a spiritual guide on The Seer Within. The recipient verified their email, received 3 free minutes, but has not yet purchased credits.

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
    const rows = ([1, 2, 3] as const).map((seq) => {
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
    logger.info('[EvelynVerifiedDrip] Scheduled 3 post-verify emails', {
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
  const seq = row.sequenceNumber as 1 | 2 | 3;
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
