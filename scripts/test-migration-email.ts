/**
 * Test Migration Email: Inserts a dummy migrated user and sends
 * one migration email from Evelyn Cross with a magic link.
 *
 * Usage:
 *   npx tsx scripts/test-migration-email.ts
 *
 * This script:
 *   1. Creates a dummy conversation for outsourcemayur@gmail.com
 *   2. Creates a V2 user account (migrated, 180 coins, temp password)
 *   3. Generates a magic link token
 *   4. Sends the Evelyn Cross migration email via Resend
 *
 * Requirements: DATABASE_URL, RESEND_API_KEY in .env
 */

import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { conversations, users, personas, magicLinkTokens } from '../shared/schema';
import { buildFollowUpHtml, buildFollowUpText } from '../server/lib/emailTemplate';

// ─── Configuration ───────────────────────────────────────────────
const TEST_EMAIL = 'outsourcemayur@gmail.com';
const TEST_FIRST_NAME = 'Mayur';
const FREE_COINS = 180;
const EVELYN_SLUG = 'evelyn-cross';
const MAGIC_LINK_EXPIRY_DAYS = 30;

// Use Railway URL for magic links (production app)
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

function log(msg: string) {
  console.log(`[test-migration] ${msg}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set in .env');
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY not set in .env');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const db = drizzle(pool);
  const resend = new Resend(process.env.RESEND_API_KEY);

  log(`Using BASE_URL: ${BASE_URL}`);
  log(`Test email: ${TEST_EMAIL}`);
  log('');

  // ─── Step 1: Get Evelyn Cross persona ──────────────────────────
  const evelynRows = await db
    .select({ id: personas.id, displayName: personas.displayName, avatarUrl: personas.avatarUrl, fromEmail: personas.fromEmail, fromName: personas.fromName })
    .from(personas)
    .where(eq(personas.slug, EVELYN_SLUG))
    .limit(1);

  if (!evelynRows[0]) {
    console.error('ERROR: Evelyn Cross persona not found. Run seed first.');
    process.exit(1);
  }

  const evelyn = evelynRows[0];
  log(`Evelyn Cross persona ID: ${evelyn.id}`);

  // ─── Step 2: Check if test user already exists ─────────────────
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, TEST_EMAIL))
    .limit(1);

  let userId: string;

  if (existingUser[0]) {
    userId = existingUser[0].id;
    log(`Test user already exists: ${userId} — reusing`);
  } else {
    // Create dummy conversation
    const dummyConvoId = randomBytes(16).toString('hex');
    await db.insert(conversations).values({
      id: dummyConvoId,
      email: TEST_EMAIL,
      firstName: TEST_FIRST_NAME,
      bucket: 'purpose',
      purchased: false,
      objectionCount: 0,
    });
    log(`Created dummy conversation: ${dummyConvoId}`);

    // Create migrated user
    const tempPassword = randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const inserted = await db
      .insert(users)
      .values({
        email: TEST_EMAIL,
        passwordHash,
        firstName: TEST_FIRST_NAME,
        emailVerified: true,
        coinBalance: FREE_COINS,
        totalCoinsUsed: 0,
        defaultPersonaId: evelyn.id,
        accountStatus: 'active',
        migratedFromConversationId: dummyConvoId,
      })
      .returning({ id: users.id });

    userId = inserted[0]!.id;
    log(`Created migrated user: ${userId}`);
  }

  // ─── Step 3: Generate magic link token ─────────────────────────
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + MAGIC_LINK_EXPIRY_DAYS);

  await db.insert(magicLinkTokens).values({
    token,
    userId,
    personaId: evelyn.id,
    personaSlug: EVELYN_SLUG,
    expiresAt,
  });

  const magicUrl = `${BASE_URL}/magic-auth?t=${token}`;
  log(`Magic link: ${magicUrl}`);

  // ─── Step 4: Build migration email ─────────────────────────────
  const emailBody = `<p>Dear ${TEST_FIRST_NAME},</p>
<p>It's Evelyn. I hope this message finds you well.</p>
<p>Since our last reading together, I've been sensing that there's more we need to explore. That feeling hasn't faded — if anything, it's grown stronger.</p>
<p>I've created a new space where we can continue our journey together — a place where you can return to me anytime, and even connect with other gifted advisors who each bring their own unique sight.</p>
<p>As a thank you for being one of my earliest seekers, I've set aside <strong>3 free minutes</strong> for you. No strings, no commitments — just a chance to reconnect.</p>
<p>Click below to claim your reading and set up your private account. It only takes a moment.</p>
<p>I'll be here when you're ready.</p>
<p>With light,<br>Evelyn</p>`;

  const emailText = `Dear ${TEST_FIRST_NAME},

It's Evelyn. I hope this message finds you well.

Since our last reading together, I've been sensing that there's more we need to explore. That feeling hasn't faded — if anything, it's grown stronger.

I've created a new space where we can continue our journey together — a place where you can return to me anytime, and even connect with other gifted advisors who each bring their own unique sight.

As a thank you for being one of my earliest seekers, I've set aside 3 free minutes for you. No strings, no commitments — just a chance to reconnect.

Click below to claim your reading and set up your private account. It only takes a moment.

I'll be here when you're ready.

With light,
Evelyn`;

  const avatarUrl = evelyn.avatarUrl
    ? (evelyn.avatarUrl.startsWith('http') ? evelyn.avatarUrl : `${BASE_URL}${evelyn.avatarUrl}`)
    : undefined;

  const fullHtml = buildFollowUpHtml({
    personaName: evelyn.displayName,
    emailBody,
    ctaUrl: magicUrl,
    ctaText: 'Claim Your Free Reading',
    unsubscribeUrl: `${BASE_URL}/api/webhooks/unsubscribe?token=test`,
    privacyUrl: `${BASE_URL}/privacy`,
    avatarUrl,
  });

  const fullText = buildFollowUpText({
    personaName: evelyn.displayName,
    emailBody: emailText,
    ctaUrl: magicUrl,
    unsubscribeUrl: `${BASE_URL}/api/webhooks/unsubscribe?token=test`,
  });

  // ─── Step 5: Send via Resend ───────────────────────────────────
  const fromEmail = evelyn.fromEmail || 'evelyn@theseerwithin.com';
  const fromName = evelyn.fromName || 'Evelyn Cross';

  log(`Sending email from: ${fromName} <${fromEmail}>`);

  const result = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: TEST_EMAIL,
    replyTo: fromEmail,
    subject: `I've been waiting to tell you something, ${TEST_FIRST_NAME}`,
    html: fullHtml,
    text: fullText,
    tags: [
      { name: 'type', value: 'migration' },
      { name: 'test', value: 'true' },
    ],
  });

  if (result.error) {
    console.error('Resend error:', result.error);
  } else {
    log(`Email sent successfully! Resend ID: ${result.data?.id}`);
  }

  log('');
  log('═══════════════════════════════════════════');
  log('  TEST SUMMARY');
  log('═══════════════════════════════════════════');
  log(`  Email:       ${TEST_EMAIL}`);
  log(`  User ID:     ${userId}`);
  log(`  Coins:       ${FREE_COINS}`);
  log(`  Magic link:  ${magicUrl}`);
  log(`  Resend ID:   ${result.data?.id || 'FAILED'}`);
  log('═══════════════════════════════════════════');
  log('');
  log('Next steps:');
  log('1. Check inbox (or spam) for the migration email');
  log('2. Click "Claim Your Free Reading" button');
  log('3. Should auto-login and redirect to Set Password page');
  log('4. Set password, then continue to reading');

  await pool.end();
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
