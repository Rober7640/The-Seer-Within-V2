// Session Timeout Email: Sends a notification when a session times out
// due to inactivity, including a summary of what was discussed.

import { Resend } from 'resend';
import { db } from './db';
import { users, chatSessions, chatMessages, personas } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { buildSessionTimeoutHtml, buildSessionTimeoutText } from './emailTemplate';
import logger from './logger';
import { fireWithBreaker, resendBreaker } from './circuitBreaker';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const GLOBAL_FROM_EMAIL = process.env.FOLLOW_UP_FROM_EMAIL || 'hello@theseerwithin.com';
const GLOBAL_FROM_NAME = process.env.FOLLOW_UP_FROM_NAME || 'The Seer Within';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Send a session timeout notification email to the user.
 * Loads all necessary data from the database given the sessionId.
 */
export async function sendSessionTimeoutEmail(sessionId: string): Promise<void> {
  try {
    // Load session
    const session = await db.select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session[0]) return;

    // Load user
    const user = await db.select({ email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, session[0].userId))
      .limit(1);

    if (!user[0]?.email) return;

    // Load persona
    const persona = await db.select({
      displayName: personas.displayName,
      avatarUrl: personas.avatarUrl,
      fromEmail: personas.fromEmail,
      fromName: personas.fromName,
    })
      .from(personas)
      .where(eq(personas.id, session[0].personaId))
      .limit(1);

    const personaName = persona[0]?.displayName || 'Your Advisor';
    const fromEmail = persona[0]?.fromEmail || GLOBAL_FROM_EMAIL;
    const fromName = persona[0]?.fromName || personaName;

    // Load recent messages for summary
    const messages = await db.select({
      role: chatMessages.role,
      content: chatMessages.content,
    })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.sentAt))
      .limit(10);

    const sessionSummary = buildQuickSummary(messages.reverse(), personaName);
    const minutesUsed = session[0].coinsCharged || 0;
    const ctaUrl = `${BASE_URL}/chat`;

    const htmlContent = buildSessionTimeoutHtml({
      personaName,
      userName: user[0].firstName,
      sessionSummary,
      minutesUsed,
      ctaUrl,
      logoUrl: persona[0]?.avatarUrl || undefined,
    });

    const textContent = buildSessionTimeoutText({
      personaName,
      userName: user[0].firstName,
      sessionSummary,
      minutesUsed,
      ctaUrl,
    });

    if (!resend) {
      logger.warn('Session timeout email skipped: Resend API key not configured', { sessionId });
      return;
    }

    await fireWithBreaker(resendBreaker, () =>
      resend!.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: user[0].email,
        replyTo: GLOBAL_FROM_EMAIL,
        subject: `Your session with ${personaName} has ended`,
        html: htmlContent,
        text: textContent,
      }),
    );

    logger.info('Session timeout email sent', {
      sessionId,
      email: user[0].email,
      personaName,
    });
  } catch (error) {
    logger.error('Failed to send session timeout email', {
      sessionId,
      error: (error as Error).message,
    });
  }
}

/**
 * Build a quick text summary from recent messages (no AI call needed).
 */
function buildQuickSummary(
  messages: Array<{ role: string; content: string }>,
  personaName: string,
): string {
  if (messages.length === 0) {
    return 'No messages were exchanged in this session.';
  }

  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  const parts: string[] = [];

  if (userMessages.length > 0) {
    const firstTopic = userMessages[0].content.length > 150
      ? userMessages[0].content.substring(0, 150) + '...'
      : userMessages[0].content;
    parts.push(`You discussed: "${firstTopic}"`);
  }

  if (assistantMessages.length > 0) {
    const lastResponse = assistantMessages[assistantMessages.length - 1].content;
    const truncated = lastResponse.length > 200
      ? lastResponse.substring(0, 200) + '...'
      : lastResponse;
    parts.push(`${personaName}'s last guidance: "${truncated}"`);
  }

  return parts.join('\n\n');
}
