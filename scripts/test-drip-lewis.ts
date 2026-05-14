/**
 * Send migration drip Email 1 to lewis@altiuspublishing.com specifically.
 */
import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users, conversations, personas, migrationDripEmails } from '../shared/schema';
import { eq } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { getModelForOperation } from '../server/lib/modelConfig';
import { Resend } from 'resend';
import { randomBytes } from 'crypto';
import { buildFollowUpHtml, buildFollowUpText } from '../server/lib/emailTemplate';
import { generateMagicLinkToken } from '../server/lib/magicLink';
import { fireWithBreaker, resendBreaker, anthropicBreaker } from '../server/lib/circuitBreaker';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const db = drizzle(pool);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TARGET_EMAIL = 'lewis@altiuspublishing.com';

async function main() {
  // Load user
  const user = await db.select().from(users).where(eq(users.email, TARGET_EMAIL)).limit(1);
  if (!user[0]) { console.error('User not found'); process.exit(1); }
  console.log('User:', user[0].id, user[0].firstName);

  // Load conversation
  const convo = await db.select().from(conversations).where(eq(conversations.id, user[0].migratedFromConversationId!)).limit(1);
  if (!convo[0]) { console.error('Conversation not found'); process.exit(1); }
  console.log('Concern:', convo[0].concern);
  console.log('Vision:', convo[0].vision);

  // Load Evelyn
  const evelyn = await db.select().from(personas).where(eq(personas.slug, 'evelyn-cross')).limit(1);
  if (!evelyn[0]) { console.error('Evelyn not found'); process.exit(1); }

  // Generate email via Haiku
  const prompt = `You are ${evelyn[0].displayName}, a warm and gifted spiritual guide.

${user[0].firstName} had a reading with you. Here is what you know:
- Area of focus: ${convo[0].bucket || 'general guidance'}
${convo[0].concern ? `- Their concern: ${convo[0].concern}` : ''}
${convo[0].vision ? `- Their vision/desires: ${convo[0].vision}` : ''}
${convo[0].emotionalResponse ? `- Emotional state: ${convo[0].emotionalResponse}` : ''}
${convo[0].location ? `- Location: ${convo[0].location}` : ''}

This is email #1 of 3 in a re-engagement sequence.
Tone: warm and personal, like a friend reaching out
Angle: reference their specific concern from the reading, invite them to a new space to continue
Sign off with: "With light, Evelyn"

Rules:
- Stay fully in character as ${evelyn[0].displayName}
- Use ${user[0].firstName}'s name at least once
- Reference something specific from their reading
- Do NOT be pushy or use sales language — this is a spiritual message
- Do NOT mention "platform", "app", "website", or "account" — say "a new space" or "a place I've created"
- Include this exact sentence somewhere in the body: "I've set aside 3 minutes for you to ask anything and explore today's insights. Start your private conversation."
- Body: 80-150 words
- Subject line: under 60 characters, personal

Return ONLY valid JSON:
{
  "subject": "Your email subject line",
  "bodyText": "Plain text version",
  "bodyHtml": "<p>HTML version with basic formatting</p>"
}`;

  console.log('\nGenerating email via Haiku...');
  const response = await anthropic.messages.create({
    model: getModelForOperation('greeting'),
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch![0]);
  console.log('Subject:', parsed.subject);

  // Build full email
  const magicToken = await generateMagicLinkToken(user[0].id, evelyn[0].id, 'evelyn-cross');
  const magicUrl = `${BASE_URL}/magic-auth?t=${magicToken}`;

  const avatarUrl = evelyn[0].avatarUrl
    ? (evelyn[0].avatarUrl.startsWith('http') ? evelyn[0].avatarUrl : `${BASE_URL}${evelyn[0].avatarUrl}`)
    : undefined;

  const fullHtml = buildFollowUpHtml({
    personaName: evelyn[0].displayName,
    emailBody: parsed.bodyHtml,
    ctaUrl: magicUrl,
    ctaText: 'Continue Your Reading with Evelyn',
    unsubscribeUrl: `${BASE_URL}/api/webhooks/unsubscribe?token=na`,
    privacyUrl: `${BASE_URL}/privacy`,
    avatarUrl,
  });

  const fullText = buildFollowUpText({
    personaName: evelyn[0].displayName,
    emailBody: parsed.bodyText,
    ctaUrl: magicUrl,
    unsubscribeUrl: `${BASE_URL}/api/webhooks/unsubscribe?token=na`,
  });

  // Track in DB
  const record = await db.insert(migrationDripEmails).values({
    userId: user[0].id,
    sequenceNumber: 1,
    recipientEmail: user[0].email,
    subject: parsed.subject,
    bodyHtml: fullHtml,
    bodyText: fullText,
    status: 'pending',
    generatedBy: 'claude-haiku',
  }).returning({ id: migrationDripEmails.id });

  // Send
  const fromEmail = evelyn[0].fromEmail || 'evelyn@theseerwithin.com';
  const fromName = evelyn[0].fromName || 'Evelyn Cross';

  console.log(`Sending from ${fromName} <${fromEmail}>...`);
  const result = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: TARGET_EMAIL,
    replyTo: fromEmail,
    subject: parsed.subject,
    html: fullHtml,
    text: fullText,
    tags: [{ name: 'type', value: 'migration_drip' }, { name: 'sequence', value: '1' }],
  });

  if (result.error) {
    await db.update(migrationDripEmails).set({ status: 'failed', updatedAt: new Date() }).where(eq(migrationDripEmails.id, record[0]!.id));
    console.error('Send failed:', result.error);
  } else {
    await db.update(migrationDripEmails).set({ status: 'sent', sentAt: new Date(), resendEmailId: result.data?.id || null, updatedAt: new Date() }).where(eq(migrationDripEmails.id, record[0]!.id));
    console.log('Sent! Resend ID:', result.data?.id);
  }

  console.log('\nMagic link:', magicUrl);
  await pool.end();
}

main().catch((e) => { console.error(e); pool.end(); process.exit(1); });
