/**
 * Test Migration Email: Inserts dummy migrated users and sends
 * migration emails from Evelyn Cross with magic links.
 *
 * Usage:
 *   npx tsx scripts/test-migration-email.ts                    # Send to all test users
 *   npx tsx scripts/test-migration-email.ts swapnil            # Send to swapnil only
 *   npx tsx scripts/test-migration-email.ts outsourcemayur     # Send to mayur only
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
import { conversations, users, personas, magicLinkTokens, userMemory } from '../shared/schema';
import { buildFollowUpHtml, buildFollowUpText } from '../server/lib/emailTemplate';

// ─── Configuration ───────────────────────────────────────────────
const FREE_COINS = 180;
const EVELYN_SLUG = 'evelyn-cross';
const MAGIC_LINK_EXPIRY_DAYS = 30;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Test users — swapnil uses sunny.kanmahale's real V1 data
const TEST_USERS = [
  {
    key: 'outsourcemayur',
    email: 'outsourcemayur@gmail.com',
    firstName: 'Mayur',
    conversation: {
      bucket: 'purpose',
      purchased: false,
      objectionCount: 0,
    },
  },
  {
    key: 'swapnil',
    email: 'swapnil.kanmahale88@gmail.com',
    firstName: 'Sunny',
    // Same data as sunny.kanmahale@gmail.com from V1
    conversation: {
      location: 'Pune, India',
      timeOfDay: 'afternoon',
      bucket: 'love',
      subBucket: 'RELATIONSHIP_TROUBLE',
      concern: 'I need to improve relationship with my wife.',
      deeperResponse: '1 year',
      vision: 'I can have a good loving time with her',
      emotionalResponse: 'I am loving her too much and having a great healthy relationship',
      blockSource: 'No',
      commitmentResponse: 'Yes',
      purchased: true,
      purchaseType: 'main',
      objectionCount: 0,
      conversationState: 'PITCH',
    },
  },
];

function log(msg: string) {
  console.log(`[test-migration] ${msg}`);
}

function buildEmailBody(firstName: string): string {
  return `<p>Dear ${firstName},</p>
<p>It's Evelyn. I hope this message finds you well.</p>
<p>Since our last reading together, I've been sensing that there's more we need to explore. That feeling hasn't faded — if anything, it's grown stronger.</p>
<p>I've created a new space where we can continue our journey together — a place where you can return to me anytime, and even connect with other gifted advisors who each bring their own unique sight.</p>
<p>As a thank you for being one of my earliest seekers, I've set aside <strong>3 free minutes</strong> for you. No strings, no commitments — just a chance to reconnect.</p>
<p>Click below to claim your reading and set up your private account. It only takes a moment.</p>
<p>I'll be here when you're ready.</p>
<p>With light,<br>Evelyn</p>`;
}

function buildEmailText(firstName: string): string {
  return `Dear ${firstName},

It's Evelyn. I hope this message finds you well.

Since our last reading together, I've been sensing that there's more we need to explore. That feeling hasn't faded — if anything, it's grown stronger.

I've created a new space where we can continue our journey together — a place where you can return to me anytime, and even connect with other gifted advisors who each bring their own unique sight.

As a thank you for being one of my earliest seekers, I've set aside 3 free minutes for you. No strings, no commitments — just a chance to reconnect.

Click below to claim your reading and set up your private account. It only takes a moment.

I'll be here when you're ready.

With light,
Evelyn`;
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

  // Filter by CLI argument if provided
  const filterKey = process.argv[2];
  const usersToProcess = filterKey
    ? TEST_USERS.filter((u) => u.key === filterKey)
    : TEST_USERS;

  if (usersToProcess.length === 0) {
    console.error(`ERROR: No test user found matching "${filterKey}". Available: ${TEST_USERS.map((u) => u.key).join(', ')}`);
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const db = drizzle(pool);
  const resend = new Resend(process.env.RESEND_API_KEY);

  log(`Using BASE_URL: ${BASE_URL}`);
  log(`Processing ${usersToProcess.length} test user(s): ${usersToProcess.map((u) => u.email).join(', ')}`);
  log('');

  // Get Evelyn Cross persona
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
  log('');

  for (const testUser of usersToProcess) {
    log(`━━━ Processing: ${testUser.email} ━━━`);

    // Check if user already exists
    const existingUser = await db
      .select({ id: users.id, migratedFromConversationId: users.migratedFromConversationId, passwordChangedAt: users.passwordChangedAt })
      .from(users)
      .where(eq(users.email, testUser.email))
      .limit(1);

    let userId: string;

    if (existingUser[0]) {
      userId = existingUser[0].id;
      log(`User already exists: ${userId}`);

      // Reset passwordChangedAt so set-password screen shows again (for re-testing)
      if (existingUser[0].passwordChangedAt) {
        await db.update(users).set({ passwordChangedAt: null, updatedAt: new Date() }).where(eq(users.id, userId));
        log('  Reset passwordChangedAt for re-testing');
      }
    } else {
      // Create dummy conversation with full V1-like data
      const dummyConvoId = randomBytes(16).toString('hex');
      const convoData: any = {
        id: dummyConvoId,
        email: testUser.email,
        firstName: testUser.firstName,
        ...testUser.conversation,
      };
      await db.insert(conversations).values(convoData);
      log(`Created conversation: ${dummyConvoId}`);

      // Create migrated user
      const tempPassword = randomBytes(24).toString('base64url');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const inserted = await db
        .insert(users)
        .values({
          email: testUser.email,
          passwordHash,
          firstName: testUser.firstName,
          emailVerified: true,
          coinBalance: FREE_COINS,
          totalCoinsUsed: 0,
          defaultPersonaId: evelyn.id,
          accountStatus: 'active',
          migratedFromConversationId: dummyConvoId,
        })
        .returning({ id: users.id });

      userId = inserted[0]!.id;
      log(`Created user: ${userId}`);

      // Seed memory from conversation data (same as migration script)
      const conv = testUser.conversation as any;
      const summaryParts: string[] = [];
      if (conv.bucket) summaryParts.push(`Area of focus: ${conv.bucket}`);
      if (conv.concern) summaryParts.push(`Main concern: ${conv.concern}`);
      if (conv.vision) summaryParts.push(`Vision/desires: ${conv.vision}`);
      if (conv.emotionalResponse) summaryParts.push(`Emotional state: ${conv.emotionalResponse}`);
      if (conv.location) summaryParts.push(`Location: ${conv.location}`);

      if (summaryParts.length > 0) {
        const fullContext: Record<string, unknown> = {
          source: 'v1_migration',
          bucket: conv.bucket,
          subBucket: conv.subBucket,
          concern: conv.concern,
          vision: conv.vision,
          deeperResponse: conv.deeperResponse,
          emotionalResponse: conv.emotionalResponse,
          blockSource: conv.blockSource,
          location: conv.location,
          timeOfDay: conv.timeOfDay,
          purchased: conv.purchased,
          keyTopics: [conv.bucket, conv.subBucket].filter(Boolean),
          nextSessionContext: conv.concern
            ? `User previously discussed: ${conv.concern}. Pick up where you left off naturally.`
            : undefined,
        };

        await db.insert(userMemory).values({
          userId,
          personaId: evelyn.id,
          memoryType: 'long_term_context',
          summary: `From initial reading: ${summaryParts.join('. ')}`,
          fullContext: JSON.stringify(fullContext),
          importance: 8,
          category: conv.bucket || 'general',
        });
        log(`Seeded memory: ${summaryParts.join('. ')}`);
      }
    }

    // Generate magic link token
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

    // Build and send email
    const avatarUrl = evelyn.avatarUrl
      ? (evelyn.avatarUrl.startsWith('http') ? evelyn.avatarUrl : `${BASE_URL}${evelyn.avatarUrl}`)
      : undefined;

    const fullHtml = buildFollowUpHtml({
      personaName: evelyn.displayName,
      emailBody: buildEmailBody(testUser.firstName),
      ctaUrl: magicUrl,
      ctaText: 'Claim Your Free Reading',
      unsubscribeUrl: `${BASE_URL}/api/webhooks/unsubscribe?token=test`,
      privacyUrl: `${BASE_URL}/privacy`,
      avatarUrl,
    });

    const fullText = buildFollowUpText({
      personaName: evelyn.displayName,
      emailBody: buildEmailText(testUser.firstName),
      ctaUrl: magicUrl,
      unsubscribeUrl: `${BASE_URL}/api/webhooks/unsubscribe?token=test`,
    });

    const fromEmail = evelyn.fromEmail || 'evelyn@theseerwithin.com';
    const fromName = evelyn.fromName || 'Evelyn Cross';

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: testUser.email,
      replyTo: fromEmail,
      subject: `I've been waiting to tell you something, ${testUser.firstName}`,
      html: fullHtml,
      text: fullText,
      tags: [
        { name: 'type', value: 'migration' },
        { name: 'test', value: 'true' },
      ],
    });

    if (result.error) {
      console.error(`  Resend error:`, result.error);
    } else {
      log(`Email sent! Resend ID: ${result.data?.id}`);
    }

    log('');
  }

  log('═══════════════════════════════════════════');
  log('  Done! Check inboxes for migration emails.');
  log('  Flow: Click magic link → Set password → Chat with Evelyn');
  log('═══════════════════════════════════════════');

  await pool.end();
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
