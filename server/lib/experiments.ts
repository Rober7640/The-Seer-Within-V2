// Paywall A/B assignment (Problem 4 — see docs/posthog-evelyn-purchase-findings.md
// §3.13–3.15). Variant B = the redesigned paywall; variant A = today's UI.
//
// Assignment is sticky per user.id (sha256 bucket), gated by a system_config
// row, and — for Phase 1 — scoped to a single persona (Evelyn). The config row
// is ABSENT/disabled by default, so every user resolves to 'A' (current UI)
// until the team explicitly enables it.

import crypto from 'crypto';
import { db } from './db';
import { systemConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';
import logger from './logger';
import type { PaywallVariant } from '@shared/paywall';

export const PAYWALL_EXPERIMENT_KEY = 'paywall_copy_2026';
const CONFIG_KEY = 'paywall_copy_experiment';

export interface PaywallExperimentConfig {
  enabled: boolean;
  percentB: number;          // 0..100 — share of eligible users bucketed to B
  personaId: string | null;  // Phase 1: only enroll this persona; null = all personas
}

const DEFAULT_CONFIG: PaywallExperimentConfig = { enabled: false, percentB: 0, personaId: null };

// Short cache so /pricing doesn't hit the DB for the config on every call.
let cache: { value: PaywallExperimentConfig; at: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getPaywallExperimentConfig(): Promise<PaywallExperimentConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const rows = await db
      .select({ configValue: systemConfig.configValue })
      .from(systemConfig)
      .where(eq(systemConfig.configKey, CONFIG_KEY))
      .limit(1);

    let value = DEFAULT_CONFIG;
    if (rows[0]?.configValue) {
      const parsed = JSON.parse(rows[0].configValue);
      value = {
        enabled: !!parsed.enabled,
        percentB:
          typeof parsed.percentB === 'number'
            ? Math.max(0, Math.min(100, parsed.percentB))
            : 0,
        personaId: parsed.personaId ?? null,
      };
    }
    cache = { value, at: now };
    return value;
  } catch (err) {
    logger.error('paywall experiment config read failed', { error: (err as Error).message });
    return DEFAULT_CONFIG;
  }
}

/** Deterministic 0..99 bucket for a user, stable across sessions. */
export function paywallBucket(userId: string): number {
  const hex = crypto
    .createHash('sha256')
    .update(userId + PAYWALL_EXPERIMENT_KEY)
    .digest('hex')
    .slice(0, 8);
  return parseInt(hex, 16) % 100;
}

/** Authoritative variant for a (user, persona) — sticky, config-gated, persona-scoped. */
export async function paywallVariant(
  userId: string | null | undefined,
  personaId: string | null | undefined,
): Promise<PaywallVariant> {
  if (!userId) return 'A';
  const cfg = await getPaywallExperimentConfig();
  if (!cfg.enabled) return 'A';
  if (cfg.personaId && personaId !== cfg.personaId) return 'A'; // Phase 1: Evelyn only
  return paywallBucket(userId) < cfg.percentB ? 'B' : 'A';
}

/**
 * Variant for a request, honouring a `?paywallVariant=A|B` QA override in
 * non-production only (so devs/QA can force a variant; inert for real prod users).
 */
export async function resolvePaywallVariant(opts: {
  userId?: string | null;
  personaId?: string | null;
  override?: string | null;
  allowOverride?: boolean;
}): Promise<PaywallVariant> {
  if (opts.allowOverride && (opts.override === 'A' || opts.override === 'B')) {
    return opts.override;
  }
  return paywallVariant(opts.userId, opts.personaId);
}

/** Test seam: clear the in-process config cache. */
export function _resetPaywallExperimentCache(): void {
  cache = null;
}
