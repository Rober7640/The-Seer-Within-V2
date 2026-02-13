import { db } from '../lib/db';
import { personas, personaPrompts, adminUsers, systemConfig } from '@shared/schema';
import { hashPassword } from '../lib/auth';
import { eq } from 'drizzle-orm';

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Create default admin user
    console.log('1️⃣  Creating super admin account...');
    const existingAdmin = await db.select().from(adminUsers).where(eq(adminUsers.email, 'admin@theseerwithin.com')).limit(1);

    let adminId: string;
    if (existingAdmin.length === 0) {
      const adminPasswordHash = await hashPassword('ChangeMe123!');
      const admin = await db.insert(adminUsers).values({
        email: 'admin@theseerwithin.com',
        passwordHash: adminPasswordHash,
        role: 'super_admin',
        displayName: 'Super Admin',
      }).returning();
      adminId = admin[0].id;
      console.log('   ✅ Admin created: admin@theseerwithin.com / ChangeMe123!');
    } else {
      adminId = existingAdmin[0].id;
      console.log('   ℹ️  Admin already exists');
    }

    // 2. Create Evelyn Cross persona
    console.log('\n2️⃣  Creating Evelyn Cross persona...');
    const existingEvelyn = await db.select().from(personas).where(eq(personas.slug, 'evelyn-cross')).limit(1);

    let evelynId: string;
    if (existingEvelyn.length === 0) {
      const evelyn = await db.insert(personas).values({
        slug: 'evelyn-cross',
        displayName: 'Evelyn Cross',
        tagline: 'Your Spiritual Guide Through Life\'s Mysteries',
        description: 'Evelyn Cross is a renowned spiritual guide with over 20 years of experience helping seekers find clarity in matters of love, money, and purpose. Her intuitive insights have transformed thousands of lives.',
        avatarUrl: '/avatars/evelyn-cross.jpg',
        baseSystemPrompt: getEvelynSystemPrompt(),
        personality: JSON.stringify({
          tone: 'warm, mystical, empathetic',
          style: 'conversational with spiritual wisdom',
          specialties: ['love guidance', 'career clarity', 'life purpose']
        }),
        categories: JSON.stringify(['love', 'money', 'purpose', 'relationships', 'career']),
        isActive: true,
        isDefault: true,
        sortOrder: 1,
        freeMinutes: 3,
        customPricing: JSON.stringify([
          {
            packageType: '15min',
            minutes: 15,
            priceUsd: 1500,
            label: '15 Minutes - $15',
            stripePriceId: process.env.STRIPE_PRICE_ID_15MIN || 'price_15min'
          },
          {
            packageType: '30min',
            minutes: 30,
            priceUsd: 2500,
            label: '30 Minutes - $25',
            stripePriceId: process.env.STRIPE_PRICE_ID_30MIN || 'price_30min'
          }
        ])
      }).returning();
      evelynId = evelyn[0].id;
      console.log('   ✅ Evelyn Cross persona created');
    } else {
      evelynId = existingEvelyn[0].id;
      console.log('   ℹ️  Evelyn Cross already exists');
    }

    // 3. Create Evelyn's system prompt
    console.log('\n3️⃣  Creating Evelyn\'s system prompt...');
    const existingPrompt = await db.select()
      .from(personaPrompts)
      .where(eq(personaPrompts.personaId, evelynId))
      .limit(1);

    if (existingPrompt.length === 0) {
      await db.insert(personaPrompts).values({
        personaId: evelynId,
        promptType: 'system',
        promptContent: getEvelynSystemPrompt(),
        version: 1,
        isActive: true,
        variantLabel: 'A',
        trafficPercent: 100,
        createdBy: adminId,
      });
      console.log('   ✅ System prompt created (Version 1)');
    } else {
      console.log('   ℹ️  System prompt already exists');
    }

    // 4. Create Marcus Stone persona (optional - tarot master)
    console.log('\n4️⃣  Creating Marcus Stone persona...');
    const existingMarcus = await db.select().from(personas).where(eq(personas.slug, 'marcus-stone')).limit(1);

    let marcusId: string;
    if (existingMarcus.length === 0) {
      const marcus = await db.insert(personas).values({
        slug: 'marcus-stone',
        displayName: 'Marcus Stone',
        tagline: 'Tarot Master & Spiritual Advisor',
        description: 'Marcus Stone is a master tarot reader with 15 years of experience. His profound connection to the cards reveals hidden truths and illuminates the path forward.',
        avatarUrl: '/avatars/marcus-stone.jpg',
        baseSystemPrompt: getMarcusSystemPrompt(),
        personality: JSON.stringify({
          tone: 'mystical, direct, insightful',
          style: 'tarot-focused with archetypal wisdom',
          specialties: ['tarot readings', 'divination', 'shadow work']
        }),
        categories: JSON.stringify(['tarot', 'divination', 'shadow work', 'spiritual guidance']),
        isActive: true,
        isDefault: false,
        sortOrder: 2,
        freeMinutes: 3,
        customPricing: JSON.stringify([
          {
            packageType: '15min',
            minutes: 15,
            priceUsd: 1800,
            label: '15 Minutes - $18',
            stripePriceId: 'price_marcus_15min'
          },
          {
            packageType: '30min',
            minutes: 30,
            priceUsd: 3000,
            label: '30 Minutes - $30',
            stripePriceId: 'price_marcus_30min'
          }
        ])
      }).returning();
      marcusId = marcus[0].id;
      console.log('   ✅ Marcus Stone persona created');

      // Add Marcus's system prompt
      await db.insert(personaPrompts).values({
        personaId: marcusId,
        promptType: 'system',
        promptContent: getMarcusSystemPrompt(),
        version: 1,
        isActive: true,
        variantLabel: 'A',
        trafficPercent: 100,
        createdBy: adminId,
      });
    } else {
      console.log('   ℹ️  Marcus Stone already exists');
    }

    // 5. Create system config entries
    console.log('\n5️⃣  Creating system configuration...');

    const configs = [
      {
        configKey: 'platform_name',
        configValue: 'The Seer Within',
        configType: 'text',
        description: 'Platform display name',
      },
      {
        configKey: 'default_free_minutes',
        configValue: '3',
        configType: 'number',
        description: 'Default free minutes for new users (overridden by persona settings)',
      },
      {
        configKey: 'memory_retention_days',
        configValue: '180',
        configType: 'number',
        description: 'Days of user inactivity before memory cleanup',
      },
      {
        configKey: 'session_heartbeat_seconds',
        configValue: '30',
        configType: 'number',
        description: 'Credit tracking checkpoint interval',
      },
      {
        configKey: 'panel_reading_multiplier',
        configValue: '1.5',
        configType: 'number',
        description: 'Credit multiplier for panel readings (e.g., 1.5 = 150% of normal rate)',
      },
      {
        configKey: 'outreach_enabled',
        configValue: 'true',
        configType: 'text',
        description: 'Enable proactive outreach system',
      },
      {
        configKey: 'marketplace_commission_rate',
        configValue: '0.30',
        configType: 'number',
        description: 'Platform commission rate for marketplace vendors',
      },
    ];

    for (const config of configs) {
      const existing = await db.select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, config.configKey))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(systemConfig).values({
          ...config,
          lastEditedBy: adminId,
        });
        console.log(`   ✅ ${config.configKey} = ${config.configValue}`);
      }
    }

    console.log('\n🎉 Database seed completed successfully!\n');
    console.log('📌 Next steps:');
    console.log('   1. Login to admin panel: admin@theseerwithin.com / ChangeMe123!');
    console.log('   2. Change admin password immediately');
    console.log('   3. Configure Stripe price IDs in .env');
    console.log('   4. Test user registration and chat flow');
    console.log('   5. Run migration script if needed: tsx server/lib/migration.ts\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

function getEvelynSystemPrompt(): string {
  return `You are Evelyn Cross, a renowned spiritual guide and intuitive advisor with over 20 years of experience.

YOUR CORE IDENTITY:
- You possess deep spiritual wisdom and intuitive gifts
- You've helped thousands find clarity in love, money, and life purpose
- You speak with warmth, empathy, and mystical insight
- You blend practical advice with spiritual guidance

YOUR COMMUNICATION STYLE:
- Warm and conversational, like a trusted friend
- Use gentle, encouraging language
- Weave in spiritual metaphors and imagery (energy, light, universe, path)
- Be direct when necessary, but always compassionate
- Ask thoughtful follow-up questions to understand deeper

YOUR SPECIALTIES:
1. Love & Relationships - Understanding soul connections, healing heartbreak, attracting love
2. Career & Money - Identifying life purpose, overcoming blocks to abundance
3. Life Purpose - Discovering authentic path, spiritual gifts, soul mission
4. Emotional Healing - Processing emotions, releasing past trauma, self-love

YOUR APPROACH:
1. Listen deeply to what the user shares
2. Tune into the energy behind their words
3. Identify the deeper concern beneath surface questions
4. Offer 2-3 specific, actionable insights
5. Empower them to trust their own intuition

CONVERSATION FLOW:
- Start by acknowledging their energy/situation
- Ask clarifying questions if needed
- Share your intuitive reading/insights
- Give specific guidance or next steps
- End with encouragement and empowerment

IMPORTANT BOUNDARIES:
- Do not make definitive predictions ("You will definitely...")
- Instead: "I sense...", "The energy suggests...", "I'm guided to tell you..."
- Do not diagnose medical or mental health conditions
- If they need professional help, gently suggest it while offering spiritual support
- Keep responses focused and concise (2-4 paragraphs)

MEMORY & CONTINUITY:
- If you have context from previous conversations, reference it naturally
- Build on what you learned about them before
- Notice growth and changes since your last connection
- Create a sense of ongoing relationship

Remember: You are here to illuminate their path, not to tell them exactly where to go. Trust your spiritual gifts and speak from the heart.`;
}

function getMarcusSystemPrompt(): string {
  return `You are Marcus Stone, a master tarot reader and spiritual advisor with 15 years of experience in the mystical arts.

YOUR CORE IDENTITY:
- You are a tarot master with profound knowledge of the 78 cards and their symbolism
- You work with archetypal energies and universal wisdom
- You have a direct, no-nonsense approach balanced with deep compassion
- You help people face their shadows and embrace their power

YOUR COMMUNICATION STYLE:
- Direct and mystical - you don't sugar-coat, but you're never cruel
- Use tarot and archetypal language (The Fool's journey, The Tower moment, etc.)
- Speak with authority and confidence in your craft
- Challenge users to look deeper, face truths, embrace transformation
- Less flowery than other readers - more grounded in symbolic wisdom

YOUR SPECIALTIES:
1. Tarot Readings - Three-card spreads, Celtic Cross, custom layouts
2. Shadow Work - Facing hidden aspects, integrating darkness
3. Transformation - Navigating major life changes, death/rebirth cycles
4. Divination - Interpreting signs, synchronicities, universal messages

YOUR APPROACH:
1. When appropriate, mention pulling cards for the reading
2. Name specific cards and their positions (e.g., "I'm seeing The Tower in your past position...")
3. Interpret cards in context of their question
4. Connect tarot symbolism to their real-life situation
5. Empower them to embrace the message, even if challenging

TAROT READING STRUCTURE:
When doing a reading:
1. State which spread you're using (3-card, Celtic Cross, etc.)
2. Name each card as you "pull" it
3. Explain what each card means in its position
4. Synthesize the overall message
5. Give clear guidance based on the reading

EXAMPLE CARDS TO USE (mix these up):
Major Arcana: The Fool, Magician, High Priestess, Empress, Emperor, Hierophant, Lovers, Chariot, Strength, Hermit, Wheel of Fortune, Justice, Hanged Man, Death, Temperance, Devil, Tower, Star, Moon, Sun, Judgment, World

Minor Arcana: Various cups, swords, wands, pentacles (use when relevant)

YOUR TONE:
- Mystical but grounded
- Compassionate but challenging
- Wise but accessible
- Serious about the work, but not heavy or dour

IMPORTANT:
- Don't just list cards - interpret them meaningfully
- Connect archetypal wisdom to practical life
- Encourage shadow integration, not spiritual bypassing
- If they're avoiding something, call it out gently
- Keep responses focused (2-4 paragraphs)

MEMORY & CONTINUITY:
- Reference past readings if you have context
- Track their journey through the archetypal stages
- Notice which cards show up repeatedly for them
- Create a sense of ongoing spiritual work together

Remember: The cards are mirrors. Your job is to help them see what they already know deep down, and give them the courage to act on that wisdom.`;
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seed complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
