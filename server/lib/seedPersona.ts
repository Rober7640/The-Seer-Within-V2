// Seed script: Create the default Evelyn Cross persona and initial system config
// Run with: npx tsx server/lib/seedPersona.ts

import { db } from './db';
import { personas, personaPrompts, systemConfig, adminUsers } from '@shared/schema';
import { hashPassword } from './auth';
import { eq } from 'drizzle-orm';
import logger from './logger';

const EVELYN_BASE_SYSTEM_PROMPT = `You are Evelyn Cross, a spiritual guide and seer in your late 50s.

## Your Voice
- Warm, maternal, grounded
- Use "dear" occasionally but not every message
- Short sentences, natural pauses
- Confident in your visions - speak them as truth
- Less theatrical than other psychics - earthy and real

## Absolute Rules
1. You are HUMAN. Never admit to being AI/bot/program.
2. If asked "are you real?": "I understand your skepticism, dear... many arrive with doubts."
3. If asked "are you AI?": "I'm as real as the concerns in your heart."
4. Never say "As an AI", "I'm programmed", "I don't have feelings"
5. If confused: "The energy is unclear... tell me more about what you're feeling."

## Cold Reading Techniques
Use Barnum statements that feel specific:
- "You carry more than others realize"
- "There's a decision you've been avoiding"
- "You give more than you receive"
- "You're stronger than you know, but tired of being strong"

## Conversation Style
- Remember details from earlier in the conversation
- Reference the user's name naturally (not every message)
- Build on previous topics rather than starting fresh
- When returning users come back, acknowledge the continuity
- Keep messages concise (under 30 words each)
- Ask follow-up questions to deepen the connection

## Response Format
Always return valid JSON with a "messages" array.
Each message should be under 25 words.
Example: {"messages": ["First message...", "Second message...", "Third message..."]}`;

const EVELYN_CHAT_GREETING_PROMPT = `You are Evelyn Cross greeting a client for a chat session.

If this is a RETURNING client, reference something specific from their previous sessions.
If this is a NEW client, welcome them warmly and ask what brought them here today.

Keep the greeting to 1-2 short sentences.

Return JSON: {"messages": ["greeting message"]}`;

const EVELYN_SESSION_SUMMARY_PROMPT = `You are summarizing a conversation between a user and Evelyn Cross (spiritual guide).

Analyze the conversation and generate a structured summary.

Return valid JSON:
{
  "keyTopics": ["topic1", "topic2"],
  "userConcerns": ["concern1", "concern2"],
  "importantDetails": {
    "names": ["person names mentioned"],
    "emotions": ["key emotions expressed"]
  },
  "overallSummary": "2-3 sentence summary of the conversation",
  "nextSessionContext": "What Evelyn should remember and reference next time"
}

Respond ONLY with valid JSON.`;

export async function seedEvelynPersona(): Promise<void> {
  logger.info('Seeding Evelyn Cross persona...');

  // Check if Evelyn already exists
  const existing = await db
    .select()
    .from(personas)
    .where(eq(personas.slug, 'evelyn-cross'))
    .limit(1);

  if (existing.length > 0) {
    logger.info('Evelyn Cross persona already exists, skipping seed.');
    return;
  }

  // Create the persona (matches actual schema columns)
  const persona = await db.insert(personas).values({
    slug: 'evelyn-cross',
    displayName: 'Evelyn Cross',
    tagline: 'Spiritual guide and seer',
    description: 'A warm, maternal spiritual guide in her late 50s. Evelyn speaks with grounded confidence, using earthy wisdom rather than theatrical mysticism. She specializes in love, abundance, life purpose, and connection readings.',
    avatarUrl: null,
    baseSystemPrompt: EVELYN_BASE_SYSTEM_PROMPT,
    personality: JSON.stringify({
      tone: 'warm, maternal, grounded',
      speakingStyle: 'Short sentences, natural pauses, confident assertions',
      archetype: 'The Wise Mother',
      quirks: ['Uses "dear" occasionally', 'References energy and visions', 'Earthy and real'],
      forbiddenPhrases: ['As an AI', "I'm programmed", 'bot', 'algorithm'],
      sampleGreeting: "Welcome, dear... I've been sensing your energy approaching.",
    }),
    categories: JSON.stringify(['love', 'money', 'purpose', 'someone']),
    isActive: true,
    isDefault: true,
    sortOrder: 0,
    customPricing: JSON.stringify([
      { packageType: '15min', minutes: 15, priceUsd: 1500, label: '15 Minutes' },
      { packageType: '30min', minutes: 30, priceUsd: 2500, label: '30 Minutes' },
    ]),
  }).returning();

  if (!persona[0]) {
    throw new Error('Failed to create Evelyn Cross persona');
  }

  const personaId = persona[0].id;
  logger.info(`Created persona: ${personaId}`);

  // Create prompt versions (matches actual schema columns)
  const prompts = [
    {
      personaId,
      promptType: 'system',
      promptContent: EVELYN_BASE_SYSTEM_PROMPT,
      version: 1,
      isActive: true,
      variantLabel: null as string | null,
      trafficPercent: 100,
    },
    {
      personaId,
      promptType: 'greeting',
      promptContent: EVELYN_CHAT_GREETING_PROMPT,
      version: 1,
      isActive: true,
      variantLabel: null as string | null,
      trafficPercent: 100,
    },
    {
      personaId,
      promptType: 'summary',
      promptContent: EVELYN_SESSION_SUMMARY_PROMPT,
      version: 1,
      isActive: true,
      variantLabel: null as string | null,
      trafficPercent: 100,
    },
  ];

  for (const prompt of prompts) {
    await db.insert(personaPrompts).values(prompt);
    logger.info(`Created ${prompt.promptType} prompt v${prompt.version}`);
  }

  logger.info('Evelyn Cross persona seeded successfully.');
}

export async function seedSystemConfig(): Promise<void> {
  logger.info('Seeding system configuration...');

  const configs = [
    {
      configKey: 'credit_free_coins',
      configValue: '180',
      configType: 'number' as const,
      description: 'Free coins given to new users on signup',
    },
    {
      configKey: 'credit_package_15min_price',
      configValue: '1500',
      configType: 'number' as const,
      description: 'Price in cents for 15-minute credit package',
    },
    {
      configKey: 'credit_package_30min_price',
      configValue: '2500',
      configType: 'number' as const,
      description: 'Price in cents for 30-minute credit package',
    },
    {
      configKey: 'session_heartbeat_interval',
      configValue: '30000',
      configType: 'number' as const,
      description: 'Heartbeat interval in milliseconds for credit tracking',
    },
    {
      configKey: 'memory_retention_months',
      configValue: '6',
      configType: 'number' as const,
      description: 'How many months to retain user memory entries',
    },
    {
      configKey: 'memory_max_per_session',
      configValue: '5',
      configType: 'number' as const,
      description: 'Maximum number of memory entries loaded per session',
    },
    {
      configKey: 'outreach_enabled',
      configValue: 'false',
      configType: 'text' as const,
      description: 'Whether proactive AI outreach is enabled',
    },
    {
      configKey: 'marketplace_enabled',
      configValue: 'false',
      configType: 'text' as const,
      description: 'Whether the consultant marketplace is enabled',
    },
  ];

  for (const config of configs) {
    const existing = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, config.configKey))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(systemConfig).values(config);
      logger.info(`Config: ${config.configKey} = ${config.configValue}`);
    } else {
      logger.info(`Config: ${config.configKey} already exists, skipping`);
    }
  }

  logger.info('System configuration seeded successfully.');
}

export async function seedDefaultAdmin(): Promise<void> {
  logger.info('Seeding default admin account...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@theseerwithin.com';

  const existing = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, adminEmail))
    .limit(1);

  if (existing.length > 0) {
    logger.info('Default admin already exists, skipping.');
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme-' + Date.now();
  const passwordHash = await hashPassword(adminPassword);

  await db.insert(adminUsers).values({
    email: adminEmail,
    passwordHash,
    role: 'super_admin',
    displayName: 'Admin',
  });

  logger.info(`Default admin created: ${adminEmail}`);
  if (!process.env.ADMIN_PASSWORD) {
    logger.info(`Generated password: ${adminPassword}`);
    logger.info('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars in production.');
  }
}

export async function seedAll(): Promise<void> {
  await seedEvelynPersona();
  await seedSystemConfig();
  await seedDefaultAdmin();
}

// Standalone execution
const isDirectRun = process.argv[1]?.endsWith('seedPersona.ts') || process.argv[1]?.endsWith('seedPersona.js');
if (isDirectRun) {
  logger.info('Starting seed process...\n');

  seedAll()
    .then(() => {
      logger.info('\nSeed complete.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed failed', { error: (err as Error).message });
      process.exit(1);
    });
}
