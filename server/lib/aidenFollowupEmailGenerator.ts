// Aiden Follow-Up Emails — nurture sequence for unverified /aiden signups.
//
// Three emails on fixed cadence from magic-register time:
//   Sequence 1: +10 minutes  — warm nudge ("your reading is ready")
//   Sequence 2: +24 hours    — curiosity hook ("a number kept repeating")
//   Sequence 3: +48 hours    — last call, soft urgency
//
// Rows are created at /magic-register. Cron processes ripe rows.
// Sending is suppressed if: user verifies, unsubscribes, email changed,
// account suspended, or the scheduled window has passed stale.
//
// Gated behind ENABLE_AIDEN_FOLLOWUPS env var — defaults OFF.
// No emails send to users who existed before this module deploys.

import { Resend } from 'resend';
import { db } from './db';
import {
  users,
  personas,
  aidenFollowupEmails,
  userFollowUpPreferences,
} from '@shared/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { buildFollowUpHtml, buildFollowUpText } from './emailTemplate';
import { generateMagicLinkToken } from './magicLink';
import { fireWithBreaker, resendBreaker } from './circuitBreaker';
import logger from './logger';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const AIDEN_SLUG = 'aiden-powers';

// Delays from user.createdAt
const DELAY_MS: Record<1 | 2 | 3, number> = {
  1: 10 * 60 * 1000,
  2: 24 * 60 * 60 * 1000,
  3: 48 * 60 * 60 * 1000,
};

// Stale windows — if scheduledFor is more than this behind NOW when we finally wake,
// skip the email rather than send something that no longer makes sense.
const STALE_MS: Record<1 | 2 | 3, number> = {
  1: 4 * 60 * 60 * 1000,       // +10m: skip if >4h late
  2: 20 * 60 * 60 * 1000,      // +24h: skip if >20h late
  3: 24 * 60 * 60 * 1000,      // +48h: skip if >24h late
};

// Quiz topic → second-email personalization phrase
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
// Email content — static drafts (pending Joel's sign-off)
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

function buildEmailContent(
  seq: 1 | 2 | 3,
  firstName: string,
  topicPhrase: string,
): { subject: string; bodyHtml: string; bodyText: string } {
  const fn = safeFirstName(firstName);
  const topic = escapeHtml(topicPhrase);

  if (seq === 1) {
    return {
      subject: `Your reading is ready, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I ran your Life Path the moment you left. The number came up fast — it almost always does when someone's ready.</p>`,
        `<p>But I can't show it to you until you confirm your email. One click, and your reading opens.</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">If this wasn't you, just ignore this note. Your numbers will keep until you are.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I ran your Life Path the moment you left. The number came up fast — it almost always does when someone's ready.`,
        '',
        `But I can't show it to you until you confirm your email. One click, and your reading opens.`,
        '',
        `If this wasn't you, just ignore this note. Your numbers will keep until you are.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  if (seq === 2) {
    return {
      subject: `${fn}, a number kept repeating for you`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I don't usually write twice. But a number kept surfacing when I pulled your chart yesterday, and I'd rather you hear it from me than guess what it means.</p>`,
        `<p>You told me ${topic}. What I saw in your Life Path says something specific about that — something timing-sensitive. It isn't a coincidence you came when you did.</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">The door's still open. But charts are cycles, and cycles close.</p>`,
        `<p>— Aiden</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I don't usually write twice. But a number kept surfacing when I pulled your chart yesterday, and I'd rather you hear it from me than guess what it means.`,
        '',
        `You told me ${topicPhrase}. What I saw in your Life Path says something specific about that — something timing-sensitive. It isn't a coincidence you came when you did.`,
        '',
        `The door's still open. But charts are cycles, and cycles close.`,
        '',
        `— Aiden`,
      ].join('\n'),
    };
  }

  // seq === 3
  return {
    subject: `Last thing, ${fn}`,
    bodyHtml: [
      `<p>${fn},</p>`,
      `<p>This is the last time I'll reach out about this reading. Not because your numbers changed — they didn't — but because I don't re-run the same chart twice, and yours has been sitting on my desk for two days.</p>`,
      `<p>Three free minutes are still waiting on the other side of one click. After that, it's your call.</p>`,
      `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Either way — the number I saw for you was a good one.</p>`,
      `<p>— Aiden</p>`,
    ].join('\n'),
    bodyText: [
      `${fn},`,
      '',
      `This is the last time I'll reach out about this reading. Not because your numbers changed — they didn't — but because I don't re-run the same chart twice, and yours has been sitting on my desk for two days.`,
      '',
      `Three free minutes are still waiting on the other side of one click. After that, it's your call.`,
      '',
      `Either way — the number I saw for you was a good one.`,
      '',
      `— Aiden`,
    ].join('\n'),
  };
}

// ============================================================
// scheduleAidenFollowups — called inside /magic-register
// ============================================================

export async function scheduleAidenFollowups(params: {
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

    const rows = ([1, 2, 3] as const).map((seq) => {
      const content = buildEmailContent(seq, params.firstName, topicPhrase);
      return {
        userId: params.userId,
        sequenceNumber: seq,
        scheduledFor: new Date(baseMs + DELAY_MS[seq]),
        recipientEmail: params.email,
        subject: content.subject,
        bodyHtml: content.bodyHtml,
        bodyText: content.bodyText,
        status: 'pending' as const,
        unsubscribeToken: randomUUID(),
      };
    });

    await db.insert(aidenFollowupEmails).values(rows);
    logger.info('[AidenFollowup] Scheduled 3 follow-up emails', {
      userId: params.userId,
    });
  } catch (error) {
    logger.error('[AidenFollowup] Failed to schedule follow-ups', {
      userId: params.userId,
      error: (error as Error).message,
    });
    // Swallow — registration must never be blocked by follow-up scheduling.
  }
}

// ============================================================
// skipAidenFollowupsForUser — call on verify-email or unsubscribe
// ============================================================

export async function skipAidenFollowupsForUser(
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
          eq(aidenFollowupEmails.status, 'pending'),
        ),
      );
  } catch (error) {
    logger.warn('[AidenFollowup] Failed to skip pending rows', {
      userId,
      error: (error as Error).message,
    });
  }
}

// ============================================================
// processAidenFollowupQueue — cron entry point AND manual admin trigger
// ============================================================

export interface ProcessResult {
  flagEnabled: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function processAidenFollowupQueue(): Promise<ProcessResult> {
  const flagEnabled = process.env.ENABLE_AIDEN_FOLLOWUPS === 'true';

  if (!flagEnabled) {
    logger.info(
      '[AidenFollowup] ENABLE_AIDEN_FOLLOWUPS is not "true" — skipping queue',
    );
    return { flagEnabled: false, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();

  // Load ripe pending rows. Ordered so earlier-scheduled fires first.
  const rows = await db
    .select()
    .from(aidenFollowupEmails)
    .where(
      and(
        eq(aidenFollowupEmails.status, 'pending'),
        lte(aidenFollowupEmails.scheduledFor, now),
      ),
    )
    .orderBy(aidenFollowupEmails.scheduledFor)
    .limit(200);

  if (rows.length === 0) {
    return { flagEnabled: true, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  // Resolve Aiden persona once for the batch.
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
    logger.error('[AidenFollowup] Aiden persona row not found — aborting batch');
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
      logger.error('[AidenFollowup] Error processing row', {
        rowId: row.id,
        error: (error as Error).message,
      });
      await markFailed(row.id, (error as Error).message || 'unknown');
    }
  }

  logger.info('[AidenFollowup] Batch complete', {
    processed,
    sent,
    skipped,
    failed,
  });
  return { flagEnabled: true, processed, sent, skipped, failed };
}

// ============================================================
// processSingleRow — all send-time skip checks + Resend call
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
  // (1) Fresh user lookup
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
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

  // User verified between schedule and now → cascade-skip THIS and any later-pending rows.
  if (user.emailVerified) {
    await db
      .update(aidenFollowupEmails)
      .set({ status: 'skipped', errorMessage: 'user_verified', updatedAt: new Date() })
      .where(
        and(
          eq(aidenFollowupEmails.userId, row.userId),
          eq(aidenFollowupEmails.status, 'pending'),
        ),
      );
    return 'skipped';
  }

  if (user.accountStatus !== 'active') {
    await markSkipped(row.id, `account_${user.accountStatus}`);
    return 'skipped';
  }

  // Email changed since schedule → stop the drip (what we'd be sending no longer applies).
  if (row.recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    await db
      .update(aidenFollowupEmails)
      .set({ status: 'skipped', errorMessage: 'email_changed', updatedAt: new Date() })
      .where(
        and(
          eq(aidenFollowupEmails.userId, row.userId),
          eq(aidenFollowupEmails.status, 'pending'),
        ),
      );
    return 'skipped';
  }

  // (2) Unsubscribe
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
    await db
      .update(aidenFollowupEmails)
      .set({ status: 'skipped', errorMessage: 'unsubscribed', updatedAt: new Date() })
      .where(
        and(
          eq(aidenFollowupEmails.userId, row.userId),
          eq(aidenFollowupEmails.status, 'pending'),
        ),
      );
    return 'skipped';
  }

  // (3) Stale window — if we're too late, skip.
  const ageMs = now.getTime() - row.scheduledFor.getTime();
  const seq = row.sequenceNumber as 1 | 2 | 3;
  if (STALE_MS[seq] && ageMs > STALE_MS[seq]) {
    await markSkipped(row.id, 'stale');
    return 'skipped';
  }

  // (4) Build CTA: magic-link URL auto-logs user in AND lands on Aiden chat.
  const magicToken = await generateMagicLinkToken(
    user.id,
    personaCtx.personaId,
    AIDEN_SLUG,
  );
  const ctaUrl = `${BASE_URL}/magic-auth?t=${magicToken}&redirect=/chat/aiden-powers`;
  const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${row.unsubscribeToken}`;

  // (5) Render final HTML/text
  const fullHtml = buildFollowUpHtml({
    personaName: personaCtx.fromName,
    emailBody: row.bodyHtml,
    ctaUrl,
    ctaText: 'Open My Reading',
    unsubscribeUrl,
    privacyUrl: `${BASE_URL}/privacy`,
    avatarUrl: personaCtx.avatarUrl,
  });
  const fullText = buildFollowUpText({
    personaName: personaCtx.fromName,
    emailBody: row.bodyText,
    ctaUrl,
    unsubscribeUrl,
  });

  // (6) Send
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
        subject: row.subject,
        html: fullHtml,
        text: fullText,
        tags: [
          { name: 'type',     value: 'aiden_followup' },
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
