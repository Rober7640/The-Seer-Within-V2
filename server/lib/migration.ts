// Migration script: Convert existing funnel conversations into chat service user accounts
// Run with: npx tsx server/lib/migration.ts

import { db } from './db';
import { conversations, users, userMemory } from '@shared/schema';
import { desc, isNotNull } from 'drizzle-orm';
import { hashPassword } from './auth';
import crypto from 'crypto';
import logger from './logger';

interface MigrationResult {
  totalProcessed: number;
  usersCreated: number;
  memoriesSeeded: number;
  errors: string[];
  credentials: Array<{ email: string; tempPassword: string }>;
}

export async function migrateConversationsToUsers(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalProcessed: 0,
    usersCreated: 0,
    memoriesSeeded: 0,
    errors: [],
    credentials: [],
  };

  // Fetch all conversations that have emails (ordered by most recent first)
  const allConversations = await db
    .select()
    .from(conversations)
    .where(isNotNull(conversations.email))
    .orderBy(desc(conversations.createdAt));

  // Deduplicate by email - keep the most recent conversation per email
  const uniqueEmails = new Map<string, typeof allConversations[0]>();
  for (const conv of allConversations) {
    if (conv.email && !uniqueEmails.has(conv.email.toLowerCase())) {
      uniqueEmails.set(conv.email.toLowerCase(), conv);
    }
  }

  logger.info(`Found ${allConversations.length} conversations, ${uniqueEmails.size} unique emails`);

  for (const [email, conv] of uniqueEmails) {
    result.totalProcessed++;

    try {
      // Generate a secure temporary password
      const tempPassword = crypto.randomBytes(12).toString('base64url').slice(0, 16);
      const passwordHash = await hashPassword(tempPassword);

      // Bonus coins: paying customers get 600 (10 min), leads get 300 (5 min)
      const bonusCoins = conv.purchased ? 600 : 300;
      const totalCoins = 180 + bonusCoins; // 180 base (3 min) + bonus

      // Create user account
      const newUser = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          firstName: conv.firstName || 'Friend',
          location: conv.location || null,
          coinBalance: totalCoins,
          migratedFromConversationId: conv.id,
        })
        .returning();

      if (!newUser[0]) {
        result.errors.push(`Failed to create user for ${email}: no return value`);
        continue;
      }

      result.usersCreated++;
      result.credentials.push({ email, tempPassword });

      // Seed initial memory from funnel conversation data
      if (conv.concern || conv.personName || conv.bucket) {
        const fullContext: Record<string, unknown> = {
          source: 'funnel_migration',
          bucket: conv.bucket,
          subBucket: conv.subBucket,
          concern: conv.concern,
          personName: conv.personName,
          vision: conv.vision,
          deeperResponse: conv.deeperResponse,
          emotionalResponse: conv.emotionalResponse,
          location: conv.location,
          timeOfDay: conv.timeOfDay,
          funnelDate: conv.createdAt,
          purchased: conv.purchased,
        };

        // Build a human-readable summary from the funnel data
        const summaryParts: string[] = [];
        if (conv.bucket) summaryParts.push(`Area of focus: ${conv.bucket}`);
        if (conv.concern) summaryParts.push(`Main concern: ${conv.concern}`);
        if (conv.personName) summaryParts.push(`Important person: ${conv.personName}`);
        if (conv.vision) summaryParts.push(`Vision/desires: ${conv.vision}`);
        if (conv.location) summaryParts.push(`Location: ${conv.location}`);

        const summary = summaryParts.length > 0
          ? `From initial reading: ${summaryParts.join('. ')}`
          : 'User went through initial reading funnel';

        await db.insert(userMemory).values({
          userId: newUser[0].id,
          memoryType: 'long_term_context',
          summary,
          fullContext: JSON.stringify(fullContext),
          importance: 8,
          category: conv.bucket || 'general',
          // No expiresAt: memories persist as long as the user is active
        });

        result.memoriesSeeded++;
      }

      logger.info(`Migrated ${email} (${totalCoins} coins, password: ${tempPassword})`);
    } catch (error: any) {
      const errorMsg = `Failed to migrate ${email}: ${error.message || error}`;
      logger.error(errorMsg);
      result.errors.push(errorMsg);
    }
  }

  return result;
}

// Standalone execution
const isDirectRun = process.argv[1]?.endsWith('migration.ts') || process.argv[1]?.endsWith('migration.js');
if (isDirectRun) {
  console.log('Starting migration of funnel conversations to user accounts...\n');

  migrateConversationsToUsers()
    .then((result) => {
      console.log('\n=== Migration Complete ===');
      console.log(`Processed: ${result.totalProcessed}`);
      console.log(`Users created: ${result.usersCreated}`);
      console.log(`Memories seeded: ${result.memoriesSeeded}`);
      console.log(`Errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach((e) => console.log(`  - ${e}`));
      }

      if (result.credentials.length > 0) {
        console.log('\nCredentials (send to users):');
        result.credentials.forEach(({ email, tempPassword }) => {
          console.log(`  ${email}: ${tempPassword}`);
        });
      }

      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
