// White-label Consultant Marketplace
// Allows third-party consultants to create personas and earn revenue
// through a revenue-sharing model.

import { db } from './db';
import { personas, personaPrompts, chatSessions, users, systemConfig } from '@shared/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import Stripe from 'stripe';
import { getPersonaPricing } from './personaPricing';
import type { PricingTier } from '../../shared/types';
import logger from './logger';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey && stripeKey !== 'sk_test_placeholder'
  ? new Stripe(stripeKey)
  : null;

const PLATFORM_SHARE = 0.30;
const CONSULTANT_SHARE = 0.70;

interface RevenueReport {
  consultantId: string;
  period: string;
  totalSessions: number;
  totalCoins: number;
  grossRevenue: number;
  platformFee: number;
  consultantPayout: number;
  personas: Array<{
    personaId: string;
    personaName: string;
    sessions: number;
    coins: number;
    revenue: number;
  }>;
}

interface MarketplacePersona {
  id: string;
  displayName: string;
  tagline: string | null;
  description: string | null;
  categories: string | null;
  avatarUrl: string | null;
  customPricing: string | null;
  totalSessions: number;
}

/**
 * Check if marketplace is enabled.
 */
async function isMarketplaceEnabled(): Promise<boolean> {
  const config = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, 'marketplace_enabled'))
    .limit(1);

  return config[0]?.configValue === 'true';
}

/**
 * Register a user as a consultant by creating a Stripe Connected Account.
 */
export async function registerConsultant(
  userId: string,
  email: string,
  returnUrl: string,
): Promise<{ onboardingUrl: string | null }> {
  const enabled = await isMarketplaceEnabled();
  if (!enabled) {
    throw new Error('Marketplace is not currently enabled');
  }

  if (!stripe) {
    logger.warn('Stripe not configured - marketplace registration skipped');
    return { onboardingUrl: null };
  }

  const account = await stripe.accounts.create({
    type: 'express',
    email,
    metadata: {
      userId,
      app: 'the-seer-within-marketplace',
    },
    capabilities: {
      transfers: { requested: true },
    },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${returnUrl}?refresh=true`,
    return_url: `${returnUrl}?onboarded=true`,
    type: 'account_onboarding',
  });

  return { onboardingUrl: accountLink.url };
}

/**
 * Create a new persona for a consultant (inactive until admin-approved).
 */
export async function createConsultantPersona(
  consultantUserId: string,
  personaData: {
    displayName: string;
    tagline: string;
    description: string;
    categories: string[];
    personality: {
      tone: string;
      speakingStyle: string;
      archetype: string;
      quirks: string[];
      forbiddenPhrases: string[];
    };
    baseSystemPrompt: string;
    customPricing?: PricingTier[];
  },
): Promise<{ personaId: string }> {
  const enabled = await isMarketplaceEnabled();
  if (!enabled) {
    throw new Error('Marketplace is not currently enabled');
  }

  const persona = await db.insert(personas).values({
    slug: personaData.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    displayName: personaData.displayName,
    tagline: personaData.tagline,
    description: personaData.description,
    baseSystemPrompt: personaData.baseSystemPrompt,
    personality: JSON.stringify(personaData.personality),
    categories: JSON.stringify(personaData.categories),
    isActive: false, // Requires admin approval
    isDefault: false,
    sortOrder: 999,
    customPricing: personaData.customPricing
      ? JSON.stringify(personaData.customPricing)
      : null,
  }).returning();

  if (!persona[0]) {
    throw new Error('Failed to create persona');
  }

  // Create the initial system prompt
  await db.insert(personaPrompts).values({
    personaId: persona[0].id,
    promptType: 'system',
    promptContent: personaData.baseSystemPrompt,
    version: 1,
    isActive: true,
    trafficPercent: 100,
  });

  return { personaId: persona[0].id };
}

/**
 * Get marketplace listings - active personas available for users.
 */
export async function getMarketplaceListings(): Promise<MarketplacePersona[]> {
  const enabled = await isMarketplaceEnabled();
  if (!enabled) return [];

  const activePersonas = await db
    .select()
    .from(personas)
    .where(eq(personas.isActive, true))
    .orderBy(personas.sortOrder);

  const listings: MarketplacePersona[] = [];

  for (const persona of activePersonas) {
    const sessionCount = await db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(chatSessions)
      .where(eq(chatSessions.personaId, persona.id));

    listings.push({
      id: persona.id,
      displayName: persona.displayName,
      tagline: persona.tagline,
      description: persona.description,
      categories: persona.categories,
      avatarUrl: persona.avatarUrl,
      customPricing: persona.customPricing,
      totalSessions: Number(sessionCount[0]?.count || 0),
    });
  }

  return listings;
}

/**
 * Calculate revenue for a consultant over a given period.
 * Revenue is derived from session coins charged, converted to minutes for rate calculation.
 */
export async function calculateConsultantRevenue(
  consultantPersonaIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<RevenueReport> {
  const personaReports: RevenueReport['personas'] = [];
  let totalSessions = 0;
  let totalCoins = 0;
  let grossRevenue = 0;

  for (const personaId of consultantPersonaIds) {
    const persona = await db
      .select()
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);

    if (!persona[0]) continue;

    // Use the persona pricing system for rate calculation
    const personaPricing = await getPersonaPricing(personaId);
    const firstTier = personaPricing.tiers[0];
    const ratePerMinute = firstTier
      ? Math.round(firstTier.priceUsd / firstTier.minutes)
      : 100; // fallback: $1/min

    const sessions = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.personaId, personaId),
          gte(chatSessions.createdAt, startDate),
        )
      );

    const personaSessions = sessions.length;
    const personaCoins = sessions.reduce((sum, s) => sum + s.coinsCharged, 0);
    const personaRevenue = Math.round(personaCoins * ratePerMinute / 60);

    personaReports.push({
      personaId: persona[0].id,
      personaName: persona[0].displayName,
      sessions: personaSessions,
      coins: personaCoins,
      revenue: personaRevenue,
    });

    totalSessions += personaSessions;
    totalCoins += personaCoins;
    grossRevenue += personaRevenue;
  }

  const platformFee = Math.round(grossRevenue * PLATFORM_SHARE);
  const consultantPayout = grossRevenue - platformFee;

  return {
    consultantId: consultantPersonaIds[0] || '',
    period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    totalSessions,
    totalCoins,
    grossRevenue,
    platformFee,
    consultantPayout,
    personas: personaReports,
  };
}
