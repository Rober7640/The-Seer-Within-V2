// Model Configuration for Cost Optimization
// Allows different Claude models for different operations
// Defaults are managed via system_config table in the admin Settings page.
// Per-persona overrides are stored on the personas table (ai_model, basic_model).

import { db } from './db';
import { systemConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Any valid Anthropic model ID string
export type ClaudeModel = string;

export interface ModelConfig {
  // Greeting generation (simpler task, less critical)
  greeting: ClaudeModel;

  // Main conversation responses (high quality needed)
  conversation: ClaudeModel;

  // Memory summarization (background task)
  summarization: ClaudeModel;
}

// ============================================================
// Hardcoded fallbacks (used only if DB has no config yet)
// ============================================================
const HARDCODED_DEFAULTS = {
  conversation: 'claude-sonnet-4-5-20250929',
  basic: 'claude-haiku-4-5-20251001',
};

// ============================================================
// DB-driven model defaults (cached, refreshed periodically)
// ============================================================

interface CachedDefaults {
  conversationModel: string;
  basicModel: string;
  availableModels: Array<{ id: string; label: string; tier: 'premium' | 'basic' }>;
  fetchedAt: number;
}

let cachedDefaults: CachedDefaults | null = null;
const CACHE_TTL_MS = 60_000; // re-read from DB every 60 seconds

async function fetchDefaultsFromDb(): Promise<CachedDefaults> {
  try {
    const rows = await db
      .select()
      .from(systemConfig)
      .where(
        eq(systemConfig.configKey, 'default_conversation_model'),
      );

    const basicRow = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'default_basic_model'));

    const modelsRow = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'available_models'));

    let availableModels: CachedDefaults['availableModels'] = [];
    try {
      if (modelsRow[0]?.configValue) {
        availableModels = JSON.parse(modelsRow[0].configValue);
      }
    } catch { /* use empty */ }

    return {
      conversationModel: rows[0]?.configValue || HARDCODED_DEFAULTS.conversation,
      basicModel: basicRow[0]?.configValue || HARDCODED_DEFAULTS.basic,
      availableModels,
      fetchedAt: Date.now(),
    };
  } catch {
    // DB not ready yet (e.g. during initial migration) — use hardcoded
    return {
      conversationModel: HARDCODED_DEFAULTS.conversation,
      basicModel: HARDCODED_DEFAULTS.basic,
      availableModels: [],
      fetchedAt: Date.now(),
    };
  }
}

async function getDefaults(): Promise<CachedDefaults> {
  if (cachedDefaults && Date.now() - cachedDefaults.fetchedAt < CACHE_TTL_MS) {
    return cachedDefaults;
  }
  cachedDefaults = await fetchDefaultsFromDb();
  return cachedDefaults;
}

/** Force-refresh the cached defaults (call after admin saves settings) */
export function invalidateModelCache(): void {
  cachedDefaults = null;
}

// ============================================================
// Public API: resolve model for a given operation
// ============================================================

/**
 * Get the conversation model for a persona.
 * Priority: persona override → global default (DB) → hardcoded fallback
 */
export async function getConversationModel(personaAiModel?: string | null): Promise<ClaudeModel> {
  if (personaAiModel) return personaAiModel;
  const defaults = await getDefaults();
  return defaults.conversationModel;
}

/**
 * Get the basic model (greetings, summaries) for a persona.
 * Priority: persona override → global default (DB) → hardcoded fallback
 */
export async function getBasicModel(personaBasicModel?: string | null): Promise<ClaudeModel> {
  if (personaBasicModel) return personaBasicModel;
  const defaults = await getDefaults();
  return defaults.basicModel;
}

/**
 * Get available models list (for admin UI dropdowns).
 */
export async function getAvailableModels() {
  const defaults = await getDefaults();
  return defaults.availableModels;
}

/**
 * Get current global defaults (for admin UI).
 */
export async function getGlobalModelDefaults() {
  const defaults = await getDefaults();
  return {
    conversationModel: defaults.conversationModel,
    basicModel: defaults.basicModel,
  };
}

// ============================================================
// Legacy API: kept for backward compatibility with code
// that still calls getModelForOperation()
// ============================================================

export function getModelForOperation(
  operation: 'greeting' | 'conversation' | 'summarization',
): ClaudeModel {
  // Synchronous fallback — uses cached value or hardcoded
  if (cachedDefaults) {
    if (operation === 'conversation') return cachedDefaults.conversationModel;
    return cachedDefaults.basicModel; // greeting + summarization = basic
  }
  if (operation === 'conversation') return HARDCODED_DEFAULTS.conversation;
  return HARDCODED_DEFAULTS.basic;
}

// ============================================================
// Testing Configuration Override
// ============================================================

export interface ModelConfigLegacy {
  greeting: ClaudeModel;
  conversation: ClaudeModel;
  summarization: ClaudeModel;
}

let testOverride: ModelConfigLegacy | null = null;

export function setTestModelConfig(config: ModelConfigLegacy): void {
  testOverride = config;
}

export function clearTestModelConfig(): void {
  testOverride = null;
}

export function getActiveModelConfig(): ModelConfigLegacy {
  if (testOverride) return testOverride;
  if (cachedDefaults) {
    return {
      greeting: cachedDefaults.basicModel,
      conversation: cachedDefaults.conversationModel,
      summarization: cachedDefaults.basicModel,
    };
  }
  return {
    greeting: HARDCODED_DEFAULTS.basic,
    conversation: HARDCODED_DEFAULTS.conversation,
    summarization: HARDCODED_DEFAULTS.basic,
  };
}

// Pre-warm cache on module load
getDefaults().catch(() => {});
