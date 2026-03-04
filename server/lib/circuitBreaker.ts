// Circuit Breaker wrapper for external API calls.
// Prevents cascading failures when external services (Anthropic, Stripe, Resend) go down.
//
// Uses opossum: https://github.com/nodeshift/opossum
//
// Configuration per task spec:
//   - 5 failures in 60s -> open circuit for 30s
//   - Half-open: allows one test request after timeout
//   - Graceful error returned when circuit is open

import CircuitBreaker from 'opossum';
import logger from './logger';

// Shared options matching the spec: 5 failures in 60s window, 30s reset timeout
const DEFAULT_OPTIONS: CircuitBreaker.Options = {
  timeout: 30_000,          // If a request takes longer than 30s, count as failure
  errorThresholdPercentage: 50, // Open when >=50% of requests fail
  volumeThreshold: 5,       // Minimum 5 requests in the window before tripping
  rollingCountTimeout: 60_000,  // 60s rolling window
  resetTimeout: 30_000,     // Wait 30s before half-open test
  rollingCountBuckets: 6,   // 6 x 10s buckets for the rolling window
};

// Registry of all circuit breakers for metrics/status reporting
const registry = new Map<string, CircuitBreaker>();

/**
 * Create a named circuit breaker for an external service.
 * The wrapped function can be any async function.
 */
export function createCircuitBreaker<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
  overrides?: Partial<CircuitBreaker.Options>,
): CircuitBreaker<TArgs, TResult> {
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  const breaker = new CircuitBreaker(fn, options);

  // Log state transitions
  breaker.on('open', () => {
    logger.error(`Circuit breaker [${name}] OPENED - requests will be rejected`, { circuit: name });
  });

  breaker.on('halfOpen', () => {
    logger.warn(`Circuit breaker [${name}] HALF-OPEN - testing with next request`, { circuit: name });
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker [${name}] CLOSED - service recovered`, { circuit: name });
  });

  breaker.on('fallback', () => {
    logger.warn(`Circuit breaker [${name}] fallback invoked`, { circuit: name });
  });

  breaker.on('reject', () => {
    logger.warn(`Circuit breaker [${name}] rejected request (circuit open)`, { circuit: name });
  });

  registry.set(name, breaker);
  return breaker;
}

/**
 * Get the status of all registered circuit breakers.
 * Returns a map of name -> { state, stats }.
 */
export function getCircuitBreakerStatuses(): Record<string, {
  state: string;
  stats: {
    fires: number;
    successes: number;
    failures: number;
    rejects: number;
    timeouts: number;
    fallbacks: number;
  };
}> {
  const result: Record<string, any> = {};

  registry.forEach((breaker, name) => {
    const stats = breaker.stats;
    let state: string;
    if (breaker.opened) {
      state = breaker.halfOpen ? 'half-open' : 'open';
    } else {
      state = 'closed';
    }

    result[name] = {
      state,
      stats: {
        fires: stats.fires,
        successes: stats.successes,
        failures: stats.failures,
        rejects: stats.rejects,
        timeouts: stats.timeouts,
        fallbacks: stats.fallbacks,
      },
    };
  });

  return result;
}

/**
 * Format circuit breaker statuses as Prometheus metrics lines.
 */
export function getCircuitBreakerMetrics(): string {
  const lines: string[] = [];
  const statuses = getCircuitBreakerStatuses();

  lines.push('# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=half-open, 2=open)');
  lines.push('# TYPE circuit_breaker_state gauge');
  for (const [name, status] of Object.entries(statuses)) {
    const stateNum = status.state === 'closed' ? 0 : status.state === 'half-open' ? 1 : 2;
    lines.push(`circuit_breaker_state{name="${name}"} ${stateNum}`);
  }
  lines.push('');

  lines.push('# HELP circuit_breaker_fires_total Total circuit breaker fire attempts');
  lines.push('# TYPE circuit_breaker_fires_total counter');
  for (const [name, status] of Object.entries(statuses)) {
    lines.push(`circuit_breaker_fires_total{name="${name}"} ${status.stats.fires}`);
  }
  lines.push('');

  lines.push('# HELP circuit_breaker_successes_total Total circuit breaker successes');
  lines.push('# TYPE circuit_breaker_successes_total counter');
  for (const [name, status] of Object.entries(statuses)) {
    lines.push(`circuit_breaker_successes_total{name="${name}"} ${status.stats.successes}`);
  }
  lines.push('');

  lines.push('# HELP circuit_breaker_failures_total Total circuit breaker failures');
  lines.push('# TYPE circuit_breaker_failures_total counter');
  for (const [name, status] of Object.entries(statuses)) {
    lines.push(`circuit_breaker_failures_total{name="${name}"} ${status.stats.failures}`);
  }
  lines.push('');

  lines.push('# HELP circuit_breaker_rejects_total Total circuit breaker rejections (circuit open)');
  lines.push('# TYPE circuit_breaker_rejects_total counter');
  for (const [name, status] of Object.entries(statuses)) {
    lines.push(`circuit_breaker_rejects_total{name="${name}"} ${status.stats.rejects}`);
  }
  lines.push('');

  lines.push('# HELP circuit_breaker_timeouts_total Total circuit breaker timeouts');
  lines.push('# TYPE circuit_breaker_timeouts_total counter');
  for (const [name, status] of Object.entries(statuses)) {
    lines.push(`circuit_breaker_timeouts_total{name="${name}"} ${status.stats.timeouts}`);
  }
  lines.push('');

  return lines.join('\n');
}

// ============================================
// Pre-configured circuit breakers for each external service
// ============================================

// --- Anthropic (Claude API) ---
// Used by chatEngine.ts and claude.ts
// Longer timeout since AI responses can take time
export const anthropicBreaker = createCircuitBreaker(
  'anthropic',
  async <T>(fn: () => Promise<T>): Promise<T> => fn(),
  { timeout: 60_000 }, // Allow 60s for AI responses
);

// --- Stripe ---
// Used by credits.ts for checkout session creation
export const stripeBreaker = createCircuitBreaker(
  'stripe',
  async <T>(fn: () => Promise<T>): Promise<T> => fn(),
  { timeout: 15_000 }, // 15s for payment API
);

// --- Resend (Email) ---
// Used by verification, password reset, migration, follow-up, session timeout emails
// Email is less critical, shorter timeout
export const resendBreaker = createCircuitBreaker(
  'resend',
  async <T>(fn: () => Promise<T>): Promise<T> => fn(),
  { timeout: 10_000 }, // 10s for email API
);

/**
 * Helper to fire a circuit breaker with a wrapped function.
 * This is the primary API consumers should use.
 *
 * @example
 * const result = await fireWithBreaker(anthropicBreaker, () => anthropic.messages.create({...}));
 */
export async function fireWithBreaker<T>(
  breaker: CircuitBreaker,
  fn: () => Promise<T>,
): Promise<T> {
  return breaker.fire(fn) as Promise<T>;
}

/**
 * Error class thrown when a circuit breaker rejects a request.
 */
export class CircuitOpenError extends Error {
  constructor(serviceName: string) {
    super(`Service unavailable: ${serviceName} circuit breaker is open`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Check if an error is a circuit breaker rejection.
 */
export function isCircuitOpenError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Breaker is open');
  }
  return false;
}
