// Generalized "verified, not purchased" 10-email drip for the additional personas
// (Marcus, Luna, Nova, Maren, ...). Persona-agnostic port of
// evelynVerifiedDripGenerator.ts: voice/copy comes from personaDripConfig.ts and
// rows live in the shared persona_followup_emails table (discriminated by
// persona_slug). One cron processor drains the queue for ALL personas at once.
//
// Cadence (from verification): +1h / +25h / +49h, then 48h apart through email 10
// (~day 16). Same spacing as Evelyn's first 10 emails.
//
// Send-time skip checks (identical posture to Evelyn): still verified, account
// active, NOT purchased, not unsubscribed, recipient email unchanged, not stale.
//
// Gated behind ENABLE_PERSONA_VERIFIED_DRIP (defaults OFF).

import { Resend } from 'resend';
import { db } from './db';
import {
  users,
  personas,
  personaFollowupEmails,
  personaLanderSessions,
  userFollowUpPreferences,
  creditPurchases,
  chatSessions,
  chatMessages,
} from '@shared/schema';
import { eq, and, lte, ne, desc, sql, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { buildFollowUpHtml, buildFollowUpText } from './emailTemplate';
import { generateMagicLinkToken } from './magicLink';
import { fireWithBreaker, resendBreaker, anthropicBreaker } from './circuitBreaker';
import { anthropicFailover as anthropic } from './anthropicWithFailover';
import { getModelForOperation } from './modelConfig';
import {
  getPersonaDripConfig,
  PERSONA_DRIP_SLUGS,
  type PersonaDripConfig,
  type DripEmailContent,
} from './personaDripConfig';
import logger from './logger';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const SEQUENCE_TYPE = 'verified_nopurchase';
const TOTAL_EMAILS = 10;
const ALL_SEQUENCES = Array.from({ length: TOTAL_EMAILS }, (_, i) => i + 1);

// Delays from verification time. Email 1 +1h, 2 +25h, 3 +49h, then 48h apart.
const HOUR = 60 * 60 * 1000;
const DELAY_MS: Record<number, number> = {
  1: 1 * HOUR, 2: 25 * HOUR, 3: 49 * HOUR, 4: 97 * HOUR, 5: 145 * HOUR,
  6: 193 * HOUR, 7: 241 * HOUR, 8: 289 * HOUR, 9: 337 * HOUR, 10: 385 * HOUR,
};
// If a row is more than this far behind when processed, skip rather than send late.
const STALE_MS: Record<number, number> = {
  1: 6 * HOUR, 2: 20 * HOUR, 3: 24 * HOUR, 4: 24 * HOUR, 5: 24 * HOUR,
  6: 24 * HOUR, 7: 24 * HOUR, 8: 24 * HOUR, 9: 24 * HOUR, 10: 24 * HOUR,
};

// Shared, voice-neutral topic phrases (slot into "{topic}"). The persona voice comes
// from the surrounding copy + the Haiku voiceBrief, not the phrase.
const BUCKET_PHRASES: Record<string, string> = {
  love: "love and what's been weighing on your heart",
  money: 'the money question you carried in',
  purpose: "the path you're trying to find",
  specific: "the person who's been on your mind",
};
const BUCKET_DEFAULT = 'what surfaced when we last spoke';

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
  return trimmed || 'there';
}

function fill(template: string, firstName: string, topicPhrase: string): string {
  return template.split('{firstName}').join(firstName).split('{topic}').join(topicPhrase);
}

function emailFor(config: PersonaDripConfig, seq: number): DripEmailContent {
  return config.emails.find((e) => e.seq === seq) ?? config.emails[0];
}

// Build the inner-content fallback (paragraphs only — the email template wraps it).
function buildFallbackContent(
  config: PersonaDripConfig,
  seq: number,
  firstName: string,
  topicPhrase: string,
): { subject: string; bodyHtml: string; bodyText: string } {
  const email = emailFor(config, seq);
  const fn = safeFirstName(firstName);
  const paras = email.paras.map((p) => fill(p, fn, topicPhrase));
  const allParas = [...paras, config.signoff];
  const bodyHtml = allParas.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
  const bodyText = allParas.join('\n\n');
  return { subject: email.subject, bodyHtml, bodyText };
}

// ============================================================
// Haiku generation — fresh copy per send, falls back to the static template.
// ============================================================

async function generateHaikuContent(
  config: PersonaDripConfig,
  seq: number,
  firstName: string,
  topicPhrase: string,
  chatSnippet: string | null,
): Promise<{ subject: string; bodyHtml: string; bodyText: string } | null> {
  const email = emailFor(config, seq);
  const snippetBlock = chatSnippet
    ? `\nRecent messages the user sent ${config.personaName} in chat (most recent last):\n${chatSnippet}\n`
    : '';

  const prompt = `You are writing email ${seq} of ${TOTAL_EMAILS} in a nurture sequence from ${config.personaName}, ${config.voiceBrief} The recipient verified their email, received free minutes, but has not yet purchased credits.

Tone for this email: ${email.toneGuide}

Personalization:
- First name: ${firstName}
- What they came to ${config.personaName} about: ${topicPhrase}${snippetBlock}

Rules:
- Stay fully in character as ${config.personaName}: ${config.voiceBrief} You do NOT sell. You do NOT use the words "platform", "app", "account", "click here", "act now", or "limited time."
- Use the first name at least once (open with "${firstName}," — no "Dear" or "Hi").
- Sign off with "${config.signoff}" only.
- If chat messages are provided above, you may naturally reference what they said (without quoting verbatim). If not, speak to their topic.
- Body: 70–110 words. Two or three short paragraphs.
- Subject line: under 55 characters, evocative, first name optional.
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
      logger.warn('[PersonaVerifiedDrip] Haiku returned no JSON — using fallback', { persona: config.slug, seq });
      return null;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.subject || !parsed.bodyHtml || !parsed.bodyText) {
      logger.warn('[PersonaVerifiedDrip] Haiku JSON missing fields — using fallback', { persona: config.slug, seq });
      return null;
    }
    return {
      subject: String(parsed.subject).slice(0, 120),
      bodyHtml: String(parsed.bodyHtml),
      bodyText: String(parsed.bodyText),
    };
  } catch (error) {
    logger.warn('[PersonaVerifiedDrip] Haiku generation threw — using fallback', {
      persona: config.slug,
      seq,
      error: (error as Error).message,
    });
    return null;
  }
}

// ============================================================
// schedulePersonaVerifiedDrip — called from the verification endpoint when the
// user came through one of the generalized persona landers.
// ============================================================

export async function schedulePersonaVerifiedDrip(params: {
  userId: string;
  email: string;
  firstName: string;
  personaSlug: string;
  bucket?: string | null;
  baseTime?: Date;
}): Promise<void> {
  try {
    const config = getPersonaDripConfig(params.personaSlug);
    if (!config) {
      logger.warn('[PersonaVerifiedDrip] No drip config for persona — skipping schedule', {
        persona: params.personaSlug,
      });
      return;
    }
    const baseMs = (params.baseTime ?? new Date()).getTime();
    const topicPhrase = (params.bucket && BUCKET_PHRASES[params.bucket]) || BUCKET_DEFAULT;

    // Seed rows with the static fallback so admin previews are meaningful before the
    // cron fires; the send-time processor overwrites with fresh Haiku copy on success.
    const rows = ALL_SEQUENCES.map((seq) => {
      const fallback = buildFallbackContent(config, seq, params.firstName, topicPhrase);
      return {
        userId: params.userId,
        personaSlug: config.slug,
        sequenceType: SEQUENCE_TYPE,
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

    await db.insert(personaFollowupEmails).values(rows);
    logger.info('[PersonaVerifiedDrip] Scheduled drip', {
      userId: params.userId,
      persona: config.slug,
      count: rows.length,
    });
  } catch (error) {
    logger.error('[PersonaVerifiedDrip] Failed to schedule drip', {
      userId: params.userId,
      persona: params.personaSlug,
      error: (error as Error).message,
    });
    // Swallow — verification must never be blocked by drip scheduling.
  }
}

// ============================================================
// skipPersonaVerifiedDripForUser — cascade-skip on purchase / unsubscribe.
// ============================================================

export async function skipPersonaVerifiedDripForUser(userId: string, reason: string): Promise<void> {
  try {
    await db
      .update(personaFollowupEmails)
      .set({ status: 'skipped', errorMessage: reason.slice(0, 500), updatedAt: new Date() })
      .where(
        and(
          eq(personaFollowupEmails.userId, userId),
          eq(personaFollowupEmails.sequenceType, SEQUENCE_TYPE),
          eq(personaFollowupEmails.status, 'pending'),
        ),
      );
  } catch (error) {
    logger.warn('[PersonaVerifiedDrip] Failed to skip pending rows', { userId, error: (error as Error).message });
  }
}

// ============================================================
// processPersonaVerifiedDripQueue — cron entry + manual admin trigger.
// Drains ripe rows for ALL personas in one pass.
// ============================================================

export interface PersonaVerifiedDripProcessResult {
  flagEnabled: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

interface PersonaCtx {
  config: PersonaDripConfig;
  personaId: string;
  fromEmail: string;
  fromName: string;
  avatarUrl: string;
}

export async function processPersonaVerifiedDripQueue(): Promise<PersonaVerifiedDripProcessResult> {
  const flagEnabled = process.env.ENABLE_PERSONA_VERIFIED_DRIP === 'true';
  if (!flagEnabled) {
    logger.info('[PersonaVerifiedDrip] ENABLE_PERSONA_VERIFIED_DRIP is not "true" — skipping queue');
    return { flagEnabled: false, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();
  const rows = await db
    .select()
    .from(personaFollowupEmails)
    .where(
      and(
        eq(personaFollowupEmails.sequenceType, SEQUENCE_TYPE),
        eq(personaFollowupEmails.status, 'pending'),
        lte(personaFollowupEmails.scheduledFor, now),
      ),
    )
    .orderBy(personaFollowupEmails.scheduledFor)
    .limit(100);

  if (rows.length === 0) {
    return { flagEnabled: true, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  // Resolve persona context (from-info + config) once per distinct slug in the batch.
  const slugs = Array.from(new Set(rows.map((r) => r.personaSlug)));
  const personaRows = await db
    .select({
      id: personas.id,
      slug: personas.slug,
      avatarUrl: personas.avatarUrl,
      fromEmail: personas.fromEmail,
      fromName: personas.fromName,
      displayName: personas.displayName,
    })
    .from(personas)
    .where(inArray(personas.slug, slugs));

  const ctxBySlug = new Map<string, PersonaCtx>();
  for (const p of personaRows) {
    const config = getPersonaDripConfig(p.slug);
    if (!config) continue; // a slug with rows but no drip config — skip its rows below
    const avatarRel = p.avatarUrl || `/uploads/avatars/${p.slug}.png`;
    ctxBySlug.set(p.slug, {
      config,
      personaId: p.id,
      fromEmail: p.fromEmail || `${config.signoff.replace('— ', '').toLowerCase()}@theseerwithin.com`,
      fromName: p.fromName || config.personaName,
      avatarUrl: avatarRel.startsWith('http') ? avatarRel : `${BASE_URL}${avatarRel}`,
    });
  }

  let processed = 0, sent = 0, skipped = 0, failed = 0;
  for (const row of rows) {
    processed++;
    try {
      const ctx = ctxBySlug.get(row.personaSlug);
      if (!ctx) {
        await markSkipped(row.id, 'no_persona_config');
        skipped++;
        continue;
      }
      const outcome = await processSingleRow(row, now, ctx);
      if (outcome === 'sent') sent++;
      else if (outcome === 'skipped') skipped++;
      else failed++;
    } catch (error) {
      failed++;
      logger.error('[PersonaVerifiedDrip] Error processing row', { rowId: row.id, error: (error as Error).message });
      await markFailed(row.id, (error as Error).message || 'unknown');
    }
  }

  logger.info('[PersonaVerifiedDrip] Batch complete', { processed, sent, skipped, failed });
  return { flagEnabled: true, processed, sent, skipped, failed };
}

// ============================================================
// processSingleRow — all send-time skip checks + Haiku + Resend call.
// ============================================================

async function processSingleRow(
  row: typeof personaFollowupEmails.$inferSelect,
  now: Date,
  ctx: PersonaCtx,
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
  if (!user.emailVerified) {
    await cascadeSkip(row.userId, 'not_verified');
    return 'skipped';
  }
  if (user.accountStatus !== 'active') {
    await markSkipped(row.id, `account_${user.accountStatus}`);
    return 'skipped';
  }
  if (row.recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    await cascadeSkip(row.userId, 'email_changed');
    return 'skipped';
  }

  // (2) Purchase check — any completed Stripe/PayPal purchase (excl. admin adjustments).
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
  if (prefs[0] && (prefs[0].unsubscribedAt !== null || prefs[0].enableFollowUps === false)) {
    await cascadeSkip(row.userId, 'unsubscribed');
    return 'skipped';
  }

  // (4) Stale window
  const ageMs = now.getTime() - row.scheduledFor.getTime();
  const seq = row.sequenceNumber;
  if (STALE_MS[seq] && ageMs > STALE_MS[seq]) {
    await markSkipped(row.id, 'stale');
    return 'skipped';
  }

  // (5) Personalization inputs
  const bucket = await lookupPersonaBucket(user.id, row.personaSlug);
  const topicPhrase = (bucket && BUCKET_PHRASES[bucket]) || BUCKET_DEFAULT;
  const chatSnippet = await lookupRecentChatSnippet(user.id, ctx.personaId);

  // (6) Generate via Haiku; fall back to the static template.
  const generated = await generateHaikuContent(
    ctx.config, seq, user.firstName || 'there', topicPhrase, chatSnippet,
  );
  const content = generated ?? buildFallbackContent(ctx.config, seq, user.firstName || 'there', topicPhrase);

  // (7) CTA: magic-link auto-logs and lands on this persona's chat.
  const magicToken = await generateMagicLinkToken(user.id, ctx.personaId, row.personaSlug);
  const ctaUrl = `${BASE_URL}/magic-auth?t=${magicToken}&redirect=/reading?persona=${row.personaSlug}`;
  const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${row.unsubscribeToken}`;

  // (8) Render via shared email template.
  const fullHtml = buildFollowUpHtml({
    personaName: ctx.fromName,
    emailBody: content.bodyHtml,
    ctaUrl,
    ctaText: ctx.config.ctaText,
    unsubscribeUrl,
    privacyUrl: `${BASE_URL}/privacy`,
    avatarUrl: ctx.avatarUrl,
  });
  const fullText = buildFollowUpText({
    personaName: ctx.fromName,
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
        from: `${ctx.fromName} <${ctx.fromEmail}>`,
        to: row.recipientEmail,
        replyTo: ctx.fromEmail,
        subject: content.subject,
        html: fullHtml,
        text: fullText,
        tags: [
          { name: 'type', value: 'persona_verified_drip' },
          { name: 'persona', value: row.personaSlug },
          { name: 'sequence', value: String(row.sequenceNumber) },
          { name: 'user_id', value: user.id },
        ],
      }),
    );
    if (result.error) {
      await markFailed(row.id, result.error.message || 'resend_error');
      return 'failed';
    }
    await db
      .update(personaFollowupEmails)
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
      .where(eq(personaFollowupEmails.id, row.id));
    return 'sent';
  } catch (error) {
    await markFailed(row.id, (error as Error).message || 'send_exception');
    return 'failed';
  }
}

// ============================================================
// Personalization input lookups
// ============================================================

/** Latest lander bucket the user chose for this persona (from persona_lander_sessions). */
async function lookupPersonaBucket(userId: string, personaSlug: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ bucket: personaLanderSessions.bucket })
      .from(personaLanderSessions)
      .where(
        and(
          eq(personaLanderSessions.resolvedUserId, userId),
          eq(personaLanderSessions.personaSlug, personaSlug),
        ),
      )
      .orderBy(desc(personaLanderSessions.startedAt))
      .limit(1);
    return rows[0]?.bucket ?? null;
  } catch {
    return null;
  }
}

/** Last 3 user-authored messages in the user's chat with this persona (~500 char cap). */
async function lookupRecentChatSnippet(userId: string, personaId: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ content: chatMessages.content, sentAt: chatMessages.sentAt })
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
// State transitions
// ============================================================

async function cascadeSkip(userId: string, reason: string): Promise<void> {
  await db
    .update(personaFollowupEmails)
    .set({ status: 'skipped', errorMessage: reason.slice(0, 500), updatedAt: new Date() })
    .where(
      and(
        eq(personaFollowupEmails.userId, userId),
        eq(personaFollowupEmails.sequenceType, SEQUENCE_TYPE),
        eq(personaFollowupEmails.status, 'pending'),
      ),
    );
}

async function markSkipped(rowId: string, reason: string): Promise<void> {
  await db
    .update(personaFollowupEmails)
    .set({ status: 'skipped', errorMessage: reason.slice(0, 500), updatedAt: new Date() })
    .where(eq(personaFollowupEmails.id, rowId));
}

async function markFailed(rowId: string, reason: string): Promise<void> {
  await db
    .update(personaFollowupEmails)
    .set({
      status: 'failed',
      errorMessage: reason.slice(0, 500),
      attemptCount: sql`attempt_count + 1`,
      updatedAt: new Date(),
    })
    .where(eq(personaFollowupEmails.id, rowId));
}

/** Slugs that currently have a generalized drip configured. */
export { PERSONA_DRIP_SLUGS };
