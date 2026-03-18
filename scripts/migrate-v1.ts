/**
 * V1 → V2 Migration Script
 *
 * Migrates V1 Evelyn Cross conversations from Neon DB to V2 Supabase DB,
 * creates V2 user accounts for each unique email, and grants 180 coins (3 min).
 *
 * Usage:
 *   npx tsx scripts/migrate-v1.ts --dry-run    # Preview only, no writes
 *   npx tsx scripts/migrate-v1.ts              # Execute migration
 *
 * Requirements:
 *   - DATABASE_URL in .env (V2 Supabase)
 *   - V1_DATABASE_URL in .env (Neon) or uses hardcoded fallback
 */

import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { conversations, users, personas, magicLinkTokens, userMemory } from '../shared/schema';

// ─── Configuration ───────────────────────────────────────────────
const V1_DATABASE_URL =
  process.env.V1_DATABASE_URL ||
  'postgresql://neondb_owner:npg_WzV7lYfZ9nPm@ep-gentle-bonus-ae0zqm5v.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const V2_DATABASE_URL = process.env.DATABASE_URL;

const DRY_RUN = process.argv.includes('--dry-run');
const FREE_COINS = 180; // 3 minutes at 60 coins/min
const BATCH_SIZE = 100; // Insert conversations in batches
const EVELYN_SLUG = 'evelyn-cross';

// ─── Helpers ─────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[migrate-v1] ${msg}`);
}

function generateTempPassword(): string {
  return randomBytes(24).toString('base64url'); // 32-char random, user never sees it
}

// V1 columns (snake_case) that map directly to V2 conversations table
const V1_COLUMNS = [
  'id', 'email', 'first_name', 'location', 'time_of_day', 'bucket', 'sub_bucket',
  'person_name', 'concern', 'deeper_response', 'vision', 'emotional_response',
  'block_source', 'commitment_response', 'purchased', 'purchase_type',
  'objection_count', 'conversation_state', 'messages', 'created_at', 'updated_at',
  'stripe_session_id', 'stripe_customer_id', 'stripe_payment_method_id',
  'main_purchase_amount', 'upsell_offered', 'upsell_purchased', 'upsell_payment_id',
  'upsell_amount', 'shipping_name', 'shipping_line1', 'shipping_line2',
  'shipping_city', 'shipping_state', 'shipping_postal', 'shipping_country',
  'upsell2_offered', 'upsell2_purchased', 'upsell2_payment_id', 'upsell2_amount',
  'upsell2_type', 'shipping2_name', 'shipping2_line1', 'shipping2_line2',
  'shipping2_city', 'shipping2_state', 'shipping2_postal', 'shipping2_country',
];

// Map snake_case DB column → camelCase Drizzle field
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  if (!V2_DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set in .env');
    process.exit(1);
  }

  log(DRY_RUN ? '🔍 DRY RUN MODE — no data will be written' : '🚀 LIVE MODE — writing to V2 database');
  log('');

  // Connect to V1 (Neon)
  const v1Client = new pg.Client({ connectionString: V1_DATABASE_URL });
  await v1Client.connect();
  log('Connected to V1 (Neon)');

  // Connect to V2 (Supabase)
  const v2Pool = new pg.Pool({ connectionString: V2_DATABASE_URL, max: 5 });
  const v2 = drizzle(v2Pool);
  log('Connected to V2 (Supabase)');

  // ─── Step 1: Get Evelyn Cross persona ID from V2 ──────────────
  const evelynRows = await v2
    .select({ id: personas.id })
    .from(personas)
    .where(eq(personas.slug, EVELYN_SLUG))
    .limit(1);

  if (!evelynRows[0]) {
    console.error('ERROR: Evelyn Cross persona not found in V2. Run seed first.');
    process.exit(1);
  }
  const evelynPersonaId = evelynRows[0].id;
  log(`Evelyn Cross persona ID: ${evelynPersonaId}`);

  // ─── Step 2: Fetch all V1 conversations ───────────────────────
  const v1Result = await v1Client.query(
    `SELECT ${V1_COLUMNS.join(', ')} FROM conversations ORDER BY created_at ASC`,
  );
  const v1Rows = v1Result.rows;
  log(`Fetched ${v1Rows.length} V1 conversations`);

  // ─── Step 3: Check existing V2 data ───────────────────────────
  // Get existing conversation IDs to skip duplicates
  const existingConvoIds = new Set<string>();
  const existingConvos = await v2
    .select({ id: conversations.id })
    .from(conversations);
  for (const c of existingConvos) {
    existingConvoIds.add(c.id);
  }
  log(`V2 already has ${existingConvoIds.size} conversations`);

  // Get existing user emails to skip duplicates
  const existingEmailsMap = new Map<string, string>(); // email → userId
  const existingUsers = await v2
    .select({ id: users.id, email: users.email })
    .from(users);
  for (const u of existingUsers) {
    existingEmailsMap.set(u.email.toLowerCase(), u.id);
  }
  log(`V2 already has ${existingEmailsMap.size} users`);

  // ─── Step 4: Insert conversations ─────────────────────────────
  let convosInserted = 0;
  let convosSkipped = 0;

  // Build Drizzle-compatible objects from V1 rows
  const newConvos: any[] = [];
  for (const row of v1Rows) {
    if (existingConvoIds.has(row.id)) {
      convosSkipped++;
      continue;
    }

    const mapped: any = {};
    for (const col of V1_COLUMNS) {
      const camelKey = snakeToCamel(col);
      mapped[camelKey] = row[col];
    }
    newConvos.push(mapped);
  }

  if (!DRY_RUN && newConvos.length > 0) {
    // Insert in batches
    for (let i = 0; i < newConvos.length; i += BATCH_SIZE) {
      const batch = newConvos.slice(i, i + BATCH_SIZE);
      await v2.insert(conversations).values(batch);
      convosInserted += batch.length;
      if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= newConvos.length) {
        log(`  Conversations: ${convosInserted}/${newConvos.length} inserted...`);
      }
    }
  } else {
    convosInserted = newConvos.length; // count for dry-run reporting
  }

  log(`Conversations: ${convosInserted} to insert, ${convosSkipped} already exist`);

  // ─── Step 5: Create user accounts ─────────────────────────────
  // Group V1 conversations by email (pick the most recent one for each user)
  const emailToConvo = new Map<string, any>();
  for (const row of v1Rows) {
    const email = row.email.toLowerCase();
    const existing = emailToConvo.get(email);
    if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
      emailToConvo.set(email, row);
    }
  }

  let usersCreated = 0;
  let usersSkipped = 0;
  const migrationReport: Array<{
    email: string;
    firstName: string;
    userId: string;
    conversationId: string;
    purchased: boolean;
  }> = [];

  for (const [email, convo] of emailToConvo) {
    // Skip if user already exists in V2
    if (existingEmailsMap.has(email)) {
      usersSkipped++;
      continue;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    if (!DRY_RUN) {
      const inserted = await v2
        .insert(users)
        .values({
          email: convo.email, // preserve original casing
          passwordHash,
          firstName: convo.first_name || 'Friend',
          emailVerified: true, // V1 users already provided their email
          coinBalance: FREE_COINS,
          totalCoinsUsed: 0,
          defaultPersonaId: evelynPersonaId,
          accountStatus: 'active',
          migratedFromConversationId: convo.id,
        })
        .returning({ id: users.id });

      const userId = inserted[0]?.id;
      if (userId) {
        // Seed memory from V1 conversation data so Evelyn remembers them
        const summaryParts: string[] = [];
        if (convo.bucket) summaryParts.push(`Area of focus: ${convo.bucket}`);
        if (convo.concern) summaryParts.push(`Main concern: ${convo.concern}`);
        if (convo.person_name) summaryParts.push(`Important person: ${convo.person_name}`);
        if (convo.vision) summaryParts.push(`Vision/desires: ${convo.vision}`);
        if (convo.emotional_response) summaryParts.push(`Emotional state: ${convo.emotional_response}`);
        if (convo.location) summaryParts.push(`Location: ${convo.location}`);

        if (summaryParts.length > 0) {
          const fullContext: Record<string, unknown> = {
            source: 'v1_migration',
            bucket: convo.bucket,
            subBucket: convo.sub_bucket,
            concern: convo.concern,
            personName: convo.person_name,
            vision: convo.vision,
            deeperResponse: convo.deeper_response,
            emotionalResponse: convo.emotional_response,
            blockSource: convo.block_source,
            location: convo.location,
            timeOfDay: convo.time_of_day,
            purchased: convo.purchased,
            funnelDate: convo.created_at,
            keyTopics: [convo.bucket, convo.sub_bucket].filter(Boolean),
            nextSessionContext: convo.concern
              ? `User previously discussed: ${convo.concern}. Pick up where you left off naturally.`
              : undefined,
          };

          await v2.insert(userMemory).values({
            userId,
            personaId: evelynPersonaId,
            memoryType: 'long_term_context',
            summary: `From initial reading: ${summaryParts.join('. ')}`,
            fullContext: JSON.stringify(fullContext),
            importance: 8,
            category: convo.bucket || 'general',
          });
        }

        migrationReport.push({
          email: convo.email,
          firstName: convo.first_name,
          userId,
          conversationId: convo.id,
          purchased: convo.purchased || false,
        });
      }
    }

    usersCreated++;

    if (usersCreated % 500 === 0) {
      log(`  Users: ${usersCreated}/${emailToConvo.size - usersSkipped} created...`);
    }
  }

  log(`Users: ${usersCreated} created, ${usersSkipped} already exist`);

  // ─── Step 6: Summary ──────────────────────────────────────────
  const purchasers = [...emailToConvo.values()].filter((c) => c.purchased).length;

  log('');
  log('═══════════════════════════════════════════');
  log('  MIGRATION SUMMARY');
  log('═══════════════════════════════════════════');
  log(`  Mode:               ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  log(`  V1 conversations:   ${v1Rows.length}`);
  log(`  Unique emails:      ${emailToConvo.size}`);
  log(`  Purchasers:         ${purchasers}`);
  log('');
  log(`  Conversations inserted: ${convosInserted}`);
  log(`  Conversations skipped:  ${convosSkipped}`);
  log(`  Users created:          ${usersCreated}`);
  log(`  Users skipped:          ${usersSkipped}`);
  log(`  Coins granted per user: ${FREE_COINS} (3 minutes)`);
  log('═══════════════════════════════════════════');

  if (!DRY_RUN && migrationReport.length > 0) {
    // Save report for later email sending
    const reportPath = 'scripts/migration-report.json';
    const fs = await import('fs');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          migratedAt: new Date().toISOString(),
          totalUsers: migrationReport.length,
          totalConversations: convosInserted,
          users: migrationReport,
        },
        null,
        2,
      ),
    );
    log(`\nMigration report saved to ${reportPath}`);
  }

  // Cleanup
  await v1Client.end();
  await v2Pool.end();
  log('\nDone.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
