// Persona Management System
// CRUD operations for managing psychic consultant personas
// Aligned with schema: personas table uses slug, displayName, isActive, personality/categories/customPricing as JSON text

import { db } from './db';
import { personas, personaPrompts, chatSessions, chatMessages, creditPurchases } from '@shared/schema';
import { eq, and, sql, desc, count } from 'drizzle-orm';

// Types for persona configuration stored in JSON columns
export interface PersonalityConfig {
  tone: string;                  // e.g. "warm, maternal, grounded"
  speakingStyle: string;         // e.g. "Short sentences, natural pauses"
  archetype: string;             // e.g. "The Wise Mother"
  quirks: string[];              // e.g. ["Uses 'dear' occasionally"]
  forbiddenPhrases: string[];    // e.g. ["As an AI", "I'm programmed"]
  specialties: string[];         // e.g. ["tarot", "astrology", "mediumship"]
  sampleGreeting: string;
  maxWordsPerMessage: number;
  claudeModel: string;
}

export interface PricingPackage {
  packageType: string;           // e.g. "15min", "30min"
  minutes: number;
  priceUsd: number;              // Price in cents
  label: string;                 // Display label
}

export interface CreatePersonaInput {
  slug: string;
  displayName: string;
  tagline?: string;
  description?: string;
  avatarUrl?: string;
  baseSystemPrompt: string;
  personality?: PersonalityConfig;
  categories?: string[];
  freeMinutes?: number;
  customPricing?: PricingPackage[];
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdatePersonaInput {
  displayName?: string;
  tagline?: string;
  description?: string;
  avatarUrl?: string;
  baseSystemPrompt?: string;
  personality?: Partial<PersonalityConfig>;
  categories?: string[];
  freeMinutes?: number;
  customPricing?: PricingPackage[];
  isDefault?: boolean;
  sortOrder?: number;
}

export interface PersonaWithStats {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  description: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  freeMinutes: number;
  categories: string[];
  totalSessions: number;
  totalRevenue: number;
  activeUsers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonaDetail {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  description: string | null;
  avatarUrl: string | null;
  baseSystemPrompt: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  freeMinutes: number;
  personality: PersonalityConfig | null;
  categories: string[];
  customPricing: PricingPackage[];
  promptCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CREATE PERSONA
// ============================================

export async function createPersona(input: CreatePersonaInput): Promise<string> {
  const result = await db
    .insert(personas)
    .values({
      slug: input.slug,
      displayName: input.displayName,
      tagline: input.tagline || null,
      description: input.description || null,
      avatarUrl: input.avatarUrl || null,
      baseSystemPrompt: input.baseSystemPrompt,
      personality: input.personality ? JSON.stringify(input.personality) : null,
      categories: input.categories ? JSON.stringify(input.categories) : null,
      freeMinutes: input.freeMinutes ?? 3,
      customPricing: input.customPricing ? JSON.stringify(input.customPricing) : null,
      isActive: false,   // Always start inactive
      isDefault: input.isDefault || false,
      sortOrder: input.sortOrder || 0,
    })
    .returning({ id: personas.id });

  if (!result[0]) {
    throw new Error('Failed to create persona');
  }

  console.log(`Created persona: ${input.displayName} (${result[0].id})`);
  return result[0].id;
}

// ============================================
// UPDATE PERSONA
// ============================================

export async function updatePersona(
  personaId: string,
  updates: UpdatePersonaInput,
): Promise<void> {
  const current = await db
    .select()
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  if (!current[0]) {
    throw new Error('Persona not found');
  }

  const setValues: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.displayName !== undefined) setValues.displayName = updates.displayName;
  if (updates.tagline !== undefined) setValues.tagline = updates.tagline;
  if (updates.description !== undefined) setValues.description = updates.description;
  if (updates.avatarUrl !== undefined) setValues.avatarUrl = updates.avatarUrl;
  if (updates.baseSystemPrompt !== undefined) setValues.baseSystemPrompt = updates.baseSystemPrompt;
  if (updates.isDefault !== undefined) setValues.isDefault = updates.isDefault;
  if (updates.sortOrder !== undefined) setValues.sortOrder = updates.sortOrder;
  if (updates.freeMinutes !== undefined) setValues.freeMinutes = updates.freeMinutes;

  // Merge personality JSON
  if (updates.personality) {
    const currentPersonality = current[0].personality
      ? JSON.parse(current[0].personality)
      : {};
    setValues.personality = JSON.stringify({
      ...currentPersonality,
      ...updates.personality,
    });
  }

  // Replace categories array
  if (updates.categories) {
    setValues.categories = JSON.stringify(updates.categories);
  }

  // Replace pricing packages array
  if (updates.customPricing) {
    setValues.customPricing = JSON.stringify(updates.customPricing);
  }

  await db
    .update(personas)
    .set(setValues)
    .where(eq(personas.id, personaId));

  console.log(`Updated persona: ${personaId}`);
}

// ============================================
// ACTIVATE / DEACTIVATE PERSONA
// ============================================

export async function setPersonaActive(
  personaId: string,
  isActive: boolean,
): Promise<void> {
  // Validation: must have at least one active prompt to activate
  if (isActive) {
    const activePrompts = await db
      .select({ count: count() })
      .from(personaPrompts)
      .where(
        and(
          eq(personaPrompts.personaId, personaId),
          eq(personaPrompts.isActive, true),
        ),
      );

    if (!activePrompts[0] || activePrompts[0].count === 0) {
      throw new Error('Cannot activate persona without at least one active prompt. Create and activate a prompt first.');
    }
  }

  await db
    .update(personas)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(personas.id, personaId));

  console.log(`Persona ${personaId} isActive set to: ${isActive}`);
}

// ============================================
// GET PERSONA BY ID
// ============================================

export async function getPersonaById(personaId: string): Promise<PersonaDetail | null> {
  const result = await db
    .select()
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  if (!result[0]) return null;

  return formatPersonaDetail(result[0]);
}

// ============================================
// GET PERSONA BY SLUG
// ============================================

export async function getPersonaBySlug(slug: string): Promise<PersonaDetail | null> {
  const result = await db
    .select()
    .from(personas)
    .where(eq(personas.slug, slug))
    .limit(1);

  if (!result[0]) return null;

  return formatPersonaDetail(result[0]);
}

// ============================================
// GET DEFAULT PERSONA
// ============================================

export async function getDefaultPersona(): Promise<PersonaDetail | null> {
  const result = await db
    .select()
    .from(personas)
    .where(eq(personas.isDefault, true))
    .limit(1);

  if (!result[0]) {
    // Fallback: first active persona
    const fallback = await db
      .select()
      .from(personas)
      .where(eq(personas.isActive, true))
      .orderBy(personas.sortOrder)
      .limit(1);

    if (!fallback[0]) return null;
    return formatPersonaDetail(fallback[0]);
  }

  return formatPersonaDetail(result[0]);
}

// ============================================
// LIST PERSONAS (with optional stats)
// ============================================

export async function listPersonas(options?: {
  activeOnly?: boolean;
  includeStats?: boolean;
}): Promise<PersonaWithStats[]> {
  let query = db.select().from(personas);

  if (options?.activeOnly) {
    query = query.where(eq(personas.isActive, true)) as typeof query;
  }

  const allPersonas = await query.orderBy(personas.sortOrder, personas.displayName);

  if (!options?.includeStats) {
    return allPersonas.map((p) => ({
      id: p.id,
      slug: p.slug,
      displayName: p.displayName,
      tagline: p.tagline,
      description: p.description,
      avatarUrl: p.avatarUrl,
      isActive: p.isActive,
      isDefault: p.isDefault,
      sortOrder: p.sortOrder,
      freeMinutes: p.freeMinutes,
      categories: parseJsonArray(p.categories),
      totalSessions: 0,
      totalRevenue: 0,
      activeUsers: 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  const results: PersonaWithStats[] = [];

  for (const persona of allPersonas) {
    const sessionStats = await db
      .select({
        totalSessions: count(),
      })
      .from(chatSessions)
      .where(eq(chatSessions.personaId, persona.id));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUserStats = await db
      .select({
        activeUsers: sql<number>`COUNT(DISTINCT ${chatSessions.userId})`,
      })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.personaId, persona.id),
          sql`${chatSessions.startedAt} >= ${thirtyDaysAgo}`,
        ),
      );

    results.push({
      id: persona.id,
      slug: persona.slug,
      displayName: persona.displayName,
      tagline: persona.tagline,
      description: persona.description,
      avatarUrl: persona.avatarUrl,
      isActive: persona.isActive,
      isDefault: persona.isDefault,
      sortOrder: persona.sortOrder,
      freeMinutes: persona.freeMinutes,
      categories: parseJsonArray(persona.categories),
      totalSessions: sessionStats[0]?.totalSessions || 0,
      totalRevenue: 0, // Computed separately if needed
      activeUsers: Number(activeUserStats[0]?.activeUsers || 0),
      createdAt: persona.createdAt,
      updatedAt: persona.updatedAt,
    });
  }

  return results;
}

// ============================================
// LIST ACTIVE PERSONAS (public-facing)
// ============================================

export async function listActivePersonas(): Promise<Array<{
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  description: string | null;
  avatarUrl: string | null;
  freeMinutes: number;
  categories: string[];
  customPricing: PricingPackage[];
}>> {
  const activePersonas = await db
    .select()
    .from(personas)
    .where(eq(personas.isActive, true))
    .orderBy(personas.sortOrder, personas.displayName);

  return activePersonas.map((p) => ({
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    tagline: p.tagline,
    description: p.description,
    avatarUrl: p.avatarUrl,
    freeMinutes: p.freeMinutes,
    categories: parseJsonArray(p.categories),
    customPricing: parseJsonArray(p.customPricing) as unknown as PricingPackage[],
  }));
}

// ============================================
// CLONE PERSONA
// ============================================

export async function clonePersona(
  sourcePersonaId: string,
  newSlug: string,
  newDisplayName: string,
): Promise<string> {
  const source = await db
    .select()
    .from(personas)
    .where(eq(personas.id, sourcePersonaId))
    .limit(1);

  if (!source[0]) {
    throw new Error('Source persona not found');
  }

  const s = source[0];

  const newId = await createPersona({
    slug: newSlug,
    displayName: newDisplayName,
    tagline: s.tagline || undefined,
    description: s.description || undefined,
    avatarUrl: s.avatarUrl || undefined,
    baseSystemPrompt: s.baseSystemPrompt,
    personality: s.personality ? JSON.parse(s.personality) : undefined,
    categories: parseJsonArray(s.categories),
    customPricing: s.customPricing ? JSON.parse(s.customPricing) : undefined,
  });

  // Clone all prompts from source persona
  const sourcePrompts = await db
    .select()
    .from(personaPrompts)
    .where(eq(personaPrompts.personaId, sourcePersonaId));

  for (const prompt of sourcePrompts) {
    await db.insert(personaPrompts).values({
      personaId: newId,
      promptType: prompt.promptType,
      promptContent: prompt.promptContent,
      version: 1,
      isActive: prompt.isActive,
      variantLabel: null,
      trafficPercent: 100,
    });
  }

  console.log(`Cloned persona ${sourcePersonaId} -> ${newId} (${newDisplayName})`);
  return newId;
}

// ============================================
// GET PERSONA ANALYTICS
// ============================================

export interface PersonaAnalytics {
  personaId: string;
  totalSessions: number;
  totalMessages: number;
  averageSessionDuration: number;
  totalMinutesUsed: number;
  uniqueUsers: number;
  topBuckets: Array<{ bucket: string; count: number }>;
}

export async function getPersonaAnalytics(
  personaId: string,
  dateRange?: { start: Date; end: Date },
): Promise<PersonaAnalytics> {
  // Build conditions
  let sessionConditions = eq(chatSessions.personaId, personaId);
  if (dateRange) {
    sessionConditions = and(
      sessionConditions,
      sql`${chatSessions.startedAt} >= ${dateRange.start}`,
      sql`${chatSessions.startedAt} <= ${dateRange.end}`,
    )!;
  }

  const sessionStats = await db
    .select({
      totalSessions: count(),
      avgDuration: sql<number>`COALESCE(AVG(${chatSessions.durationSeconds}), 0)`,
      totalMinutes: sql<number>`COALESCE(SUM(${chatSessions.minutesCharged}), 0)`,
      uniqueUsers: sql<number>`COUNT(DISTINCT ${chatSessions.userId})`,
    })
    .from(chatSessions)
    .where(sessionConditions);

  const messageStats = await db
    .select({
      totalMessages: count(),
    })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(sessionConditions);

  const bucketStats = await db
    .select({
      bucket: chatSessions.lastBucket,
      count: count(),
    })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.personaId, personaId),
        sql`${chatSessions.lastBucket} IS NOT NULL`,
      ),
    )
    .groupBy(chatSessions.lastBucket)
    .orderBy(desc(count()))
    .limit(5);

  return {
    personaId,
    totalSessions: sessionStats[0]?.totalSessions || 0,
    totalMessages: messageStats[0]?.totalMessages || 0,
    averageSessionDuration: Number(sessionStats[0]?.avgDuration || 0),
    totalMinutesUsed: Number(sessionStats[0]?.totalMinutes || 0),
    uniqueUsers: Number(sessionStats[0]?.uniqueUsers || 0),
    topBuckets: bucketStats.map((b) => ({
      bucket: b.bucket || 'unknown',
      count: b.count,
    })),
  };
}

// ============================================
// HELPERS
// ============================================

function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function formatPersonaDetail(
  persona: typeof personas.$inferSelect,
): Promise<PersonaDetail> {
  const promptResult = await db
    .select({ count: count() })
    .from(personaPrompts)
    .where(eq(personaPrompts.personaId, persona.id));

  return {
    id: persona.id,
    slug: persona.slug,
    displayName: persona.displayName,
    tagline: persona.tagline,
    description: persona.description,
    avatarUrl: persona.avatarUrl,
    baseSystemPrompt: persona.baseSystemPrompt,
    isActive: persona.isActive,
    isDefault: persona.isDefault,
    sortOrder: persona.sortOrder,
    personality: persona.personality ? JSON.parse(persona.personality) : null,
    categories: parseJsonArray(persona.categories),
    customPricing: persona.customPricing ? JSON.parse(persona.customPricing) : null,
    promptCount: promptResult[0]?.count || 0,
    createdAt: persona.createdAt,
    updatedAt: persona.updatedAt,
  };
}
