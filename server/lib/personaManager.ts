// Persona Management System
// CRUD operations for managing psychic consultant personas
// Aligned with schema: personas table uses slug, displayName, isActive, personality/categories/customPricing as JSON text

import { db } from './db';
import { personas, personaPrompts, chatSessions, chatMessages, creditPurchases } from '@shared/schema';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { CENTS_PER_MINUTE_DEFAULT, minutesToCoins } from '@shared/types';
import logger from './logger';

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

export interface AvailabilityWindow {
  days: number[];      // 0=Sun … 6=Sat
  startTime: string;   // "HH:MM" 24h
  endTime: string;     // "HH:MM" 24h
}

export interface AvailabilitySchedule {
  timezone: string;
  windows: AvailabilityWindow[];
}

export interface CyclicBreakSchedule {
  enabled: boolean;
  availableMinutes: number; // e.g. 30 — how long the guide is online each cycle
  breakMinutes: number;     // e.g. 7  — how long the break lasts each cycle
}

/**
 * Check whether the current moment falls inside a cyclic break period.
 * The cycle is anchored to Unix epoch, so breaks recur at fixed clock intervals.
 */
function isInCyclicBreak(cyclicBreakScheduleJson?: string | null): boolean {
  if (!cyclicBreakScheduleJson) return false;
  try {
    const sched = JSON.parse(cyclicBreakScheduleJson) as CyclicBreakSchedule;
    if (!sched.enabled) return false;
    const cycleMs = (sched.availableMinutes + sched.breakMinutes) * 60 * 1000;
    const positionMs = Date.now() % cycleMs;
    return positionMs >= sched.availableMinutes * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Determine whether a persona is currently available for new sessions.
 * Priority: expired-override → manual override → schedule → cyclic break → default (online)
 */
export function isPersonaOnline(persona: {
  onlineOverride?: string | null;
  overrideExpiresAt?: Date | null;
  availabilitySchedule?: string | null;
  cyclicBreakSchedule?: string | null;
}): boolean {
  // 1. Expire override if past
  let override = persona.onlineOverride;
  if (override && persona.overrideExpiresAt && new Date() > persona.overrideExpiresAt) {
    override = null;
  }
  // 2. Manual override wins (bypasses cyclic breaks too)
  if (override === 'online') return true;
  if (override === 'offline') return false;
  // 3. No schedule — check cyclic break then default to online
  if (!persona.availabilitySchedule) {
    return !isInCyclicBreak(persona.cyclicBreakSchedule);
  }
  // 4. Evaluate day/time schedule
  try {
    const { timezone, windows } = JSON.parse(persona.availabilitySchedule) as AvailabilitySchedule;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const weekdayPart = parts.find(p => p.type === 'weekday')?.value ?? '';
    const hourPart = parts.find(p => p.type === 'hour')?.value ?? '00';
    const minutePart = parts.find(p => p.type === 'minute')?.value ?? '00';
    const day = dayNames.indexOf(weekdayPart);
    const time = `${hourPart.padStart(2, '0')}:${minutePart.padStart(2, '0')}`;
    const inSchedule = windows.some(w => w.days.includes(day) && time >= w.startTime && time < w.endTime);
    if (!inSchedule) return false;
    // 5. Within schedule — check cyclic break
    return !isInCyclicBreak(persona.cyclicBreakSchedule);
  } catch {
    return !isInCyclicBreak(persona.cyclicBreakSchedule);
  }
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
  freeCoins?: number;
  coinsPerMinute?: number;
  customPricing?: PricingPackage[];
  isDefault?: boolean;
  sortOrder?: number;
  yearsExperience?: number;
  readingsCount?: number;
}

export interface UpdatePersonaInput {
  displayName?: string;
  tagline?: string;
  description?: string;
  avatarUrl?: string;
  baseSystemPrompt?: string;
  personality?: Partial<PersonalityConfig>;
  categories?: string[];
  freeCoins?: number;
  coinsPerMinute?: number;
  customPricing?: PricingPackage[] | Record<string, unknown> | null;
  isDefault?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  accuracyRank?: number | null;
  sessionTimeoutMinutes?: number;
  availabilitySchedule?: AvailabilitySchedule | null;
  onlineOverride?: 'online' | 'offline' | null;
  overrideExpiresAt?: Date | string | null;
  cyclicBreakSchedule?: CyclicBreakSchedule | null;
  overallRating?: number | null;
  yearsExperience?: number | null;
  readingsCount?: number | null;
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
  freeCoins: number;
  categories: string[];
  totalSessions: number;
  totalRevenue: number;
  totalUsers: number;
  activeSessionsNow: number;
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
  isFeatured: boolean;
  sortOrder: number;
  accuracyRank: number | null;
  freeCoins: number;
  coinsPerMinute: number;
  sessionTimeoutMinutes: number;
  personality: PersonalityConfig | null;
  categories: string[];
  customPricing: PricingPackage[] | null;
  availabilitySchedule: AvailabilitySchedule | null;
  onlineOverride: string | null;
  overrideExpiresAt: Date | null;
  cyclicBreakSchedule: CyclicBreakSchedule | null;
  overallRating: number | null;
  yearsExperience: number | null;
  readingsCount: number | null;
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
      // 3:00 at the default rate = 897¢ (was 180 coins/3min @ 60/min)
      freeCoins: input.freeCoins ?? minutesToCoins(3),
      coinsPerMinute: input.coinsPerMinute ?? CENTS_PER_MINUTE_DEFAULT,
      customPricing: input.customPricing ? JSON.stringify(input.customPricing) : null,
      isActive: false,   // Always start inactive
      isDefault: input.isDefault || false,
      sortOrder: input.sortOrder || 0,
      yearsExperience: input.yearsExperience ?? null,
      readingsCount: input.readingsCount ?? null,
    })
    .returning({ id: personas.id });

  if (!result[0]) {
    throw new Error('Failed to create persona');
  }

  logger.info('Created persona', { displayName: input.displayName, personaId: result[0].id });
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
  if (updates.isFeatured !== undefined) setValues.isFeatured = updates.isFeatured;
  if (updates.sortOrder !== undefined) setValues.sortOrder = updates.sortOrder;
  if (updates.accuracyRank !== undefined) setValues.accuracyRank = updates.accuracyRank ?? null;
  if (updates.freeCoins !== undefined) setValues.freeCoins = updates.freeCoins;
  if (updates.coinsPerMinute !== undefined) setValues.coinsPerMinute = updates.coinsPerMinute;
  if (updates.sessionTimeoutMinutes !== undefined) setValues.sessionTimeoutMinutes = updates.sessionTimeoutMinutes;

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

  // Replace pricing packages (null / empty array clears to global defaults)
  if ('customPricing' in updates) {
    const cp = updates.customPricing;
    if (cp === null || cp === undefined || (Array.isArray(cp) && cp.length === 0)) {
      setValues.customPricing = null;
    } else {
      setValues.customPricing = JSON.stringify(cp);
    }
  }

  // Availability scheduling fields
  if ('availabilitySchedule' in updates) {
    setValues.availabilitySchedule = updates.availabilitySchedule
      ? JSON.stringify(updates.availabilitySchedule)
      : null;
  }
  if ('onlineOverride' in updates) {
    setValues.onlineOverride = updates.onlineOverride ?? null;
  }
  if ('cyclicBreakSchedule' in updates) {
    setValues.cyclicBreakSchedule = updates.cyclicBreakSchedule
      ? JSON.stringify(updates.cyclicBreakSchedule)
      : null;
  }
  if ('overrideExpiresAt' in updates) {
    const exp = updates.overrideExpiresAt;
    setValues.overrideExpiresAt = exp
      ? (exp instanceof Date ? exp : new Date(exp))
      : null;
  }
  if ('overallRating' in updates) {
    setValues.overallRating = updates.overallRating ?? null;
  }
  if ('yearsExperience' in updates) {
    setValues.yearsExperience = updates.yearsExperience ?? null;
  }
  if ('readingsCount' in updates) {
    setValues.readingsCount = updates.readingsCount ?? null;
  }

  await db
    .update(personas)
    .set(setValues)
    .where(eq(personas.id, personaId));

  logger.info('Updated persona', { personaId });
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

  logger.info('Persona activation changed', { personaId, isActive });
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
      freeCoins: p.freeCoins,
      categories: parseJsonArray(p.categories),
      totalSessions: 0,
      totalRevenue: 0,
      totalUsers: 0,
      activeSessionsNow: 0,
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

    const totalUserStats = await db
      .select({
        totalUsers: sql<number>`COUNT(DISTINCT ${chatSessions.userId})`,
      })
      .from(chatSessions)
      .where(eq(chatSessions.personaId, persona.id));

    const activeNowStats = await db
      .select({
        activeNow: count(),
      })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.personaId, persona.id),
          eq(chatSessions.status, 'active'),
        ),
      );

    const revenueStats = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(${creditPurchases.priceUsd}), 0)`,
      })
      .from(creditPurchases)
      .where(
        and(
          eq(creditPurchases.personaId, persona.id),
          eq(creditPurchases.status, 'completed'),
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
      freeCoins: persona.freeCoins,
      categories: parseJsonArray(persona.categories),
      totalSessions: sessionStats[0]?.totalSessions || 0,
      totalRevenue: Number(revenueStats[0]?.revenue || 0),
      totalUsers: Number(totalUserStats[0]?.totalUsers || 0),
      activeSessionsNow: activeNowStats[0]?.activeNow || 0,
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
  freeCoins: number;
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
    freeCoins: p.freeCoins,
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
    coinsPerMinute: s.coinsPerMinute,
    freeCoins: s.freeCoins,
    yearsExperience: s.yearsExperience ?? undefined,
    readingsCount: s.readingsCount ?? undefined,
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

  logger.info('Cloned persona', { sourcePersonaId, newPersonaId: newId, newDisplayName });
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
  totalCoinsUsed: number;
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
      totalCoins: sql<number>`COALESCE(SUM(${chatSessions.coinsCharged}), 0)`,
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
    totalCoinsUsed: Number(sessionStats[0]?.totalCoins || 0),
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
    isFeatured: persona.isFeatured,
    sortOrder: persona.sortOrder,
    accuracyRank: persona.accuracyRank ?? null,
    freeCoins: persona.freeCoins,
    coinsPerMinute: persona.coinsPerMinute,
    sessionTimeoutMinutes: persona.sessionTimeoutMinutes,
    personality: persona.personality ? JSON.parse(persona.personality) : null,
    categories: parseJsonArray(persona.categories),
    customPricing: persona.customPricing ? JSON.parse(persona.customPricing) : null,
    availabilitySchedule: persona.availabilitySchedule
      ? JSON.parse(persona.availabilitySchedule) as AvailabilitySchedule
      : null,
    onlineOverride: persona.onlineOverride ?? null,
    overrideExpiresAt: persona.overrideExpiresAt ?? null,
    cyclicBreakSchedule: persona.cyclicBreakSchedule
      ? JSON.parse(persona.cyclicBreakSchedule) as CyclicBreakSchedule
      : null,
    overallRating: persona.overallRating ?? null,
    yearsExperience: persona.yearsExperience ?? null,
    readingsCount: persona.readingsCount ?? null,
    promptCount: promptResult[0]?.count || 0,
    createdAt: persona.createdAt,
    updatedAt: persona.updatedAt,
  };
}
