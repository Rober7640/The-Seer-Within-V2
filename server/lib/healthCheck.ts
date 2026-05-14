import { db } from './db';
import { sql } from 'drizzle-orm';
import { users, chatSessions, creditPurchases, safetyViolations } from '@shared/schema';
import { eq, count, sum, gte } from 'drizzle-orm';
import * as os from 'os';
import { getCircuitBreakerMetrics } from './circuitBreaker';

export interface DependencyStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  message?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  dependencies: {
    database: DependencyStatus;
    stripe: DependencyStatus;
    anthropic: DependencyStatus;
    resend: DependencyStatus;
    disk: DependencyStatus;
  };
}

export interface ReadinessResult {
  ready: boolean;
  checks: {
    database: boolean;
    environment: boolean;
  };
}

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Track API error counts for metrics
let apiErrorCount = 0;
let apiRequestCount = 0;

export function recordApiRequest(): void {
  apiRequestCount++;
}

export function recordApiError(): void {
  apiErrorCount++;
}

async function checkDatabase(): Promise<DependencyStatus> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error.message || 'Database connection failed',
    };
  }
}

async function checkStripe(): Promise<DependencyStatus> {
  const start = Date.now();
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key || key === 'sk_test_placeholder') {
    return {
      status: 'degraded',
      latencyMs: 0,
      message: 'Stripe not configured',
    };
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok || response.status === 200) {
      return { status: 'healthy', latencyMs: Date.now() - start };
    }
    return {
      status: response.status === 401 ? 'unhealthy' : 'degraded',
      latencyMs: Date.now() - start,
      message: `Stripe returned ${response.status}`,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error.message || 'Stripe unreachable',
    };
  }
}

async function checkAnthropic(): Promise<DependencyStatus> {
  const start = Date.now();
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return {
      status: 'degraded',
      latencyMs: 0,
      message: 'Anthropic API key not configured',
    };
  }

  try {
    // Use a lightweight HEAD-style check - just verify the API is reachable
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return { status: 'healthy', latencyMs: Date.now() - start };
    }
    return {
      status: response.status === 401 ? 'unhealthy' : 'degraded',
      latencyMs: Date.now() - start,
      message: `Anthropic returned ${response.status}`,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error.message || 'Anthropic unreachable',
    };
  }
}

async function checkResend(): Promise<DependencyStatus> {
  const start = Date.now();
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    return {
      status: 'degraded',
      latencyMs: 0,
      message: 'Resend API key not configured',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return { status: 'healthy', latencyMs: Date.now() - start };
    }
    return {
      status: response.status === 401 ? 'unhealthy' : 'degraded',
      latencyMs: Date.now() - start,
      message: `Resend returned ${response.status}`,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error.message || 'Resend unreachable',
    };
  }
}

function checkDisk(): DependencyStatus {
  const start = Date.now();
  try {
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const freePercent = (freeMem / totalMem) * 100;

    if (freePercent < 5) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: `Memory critically low: ${freePercent.toFixed(1)}% free`,
      };
    }
    if (freePercent < 15) {
      return {
        status: 'degraded',
        latencyMs: Date.now() - start,
        message: `Memory low: ${freePercent.toFixed(1)}% free`,
      };
    }
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      status: 'degraded',
      latencyMs: Date.now() - start,
      message: error.message || 'Could not check system resources',
    };
  }
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const [database, stripe, anthropic, resend] = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkAnthropic(),
    checkResend(),
  ]);
  const disk = checkDisk();

  const dependencies = { database, stripe, anthropic, resend, disk };

  // Overall status: unhealthy if DB is down, degraded if any non-critical service is down
  let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (database.status === 'unhealthy') {
    overall = 'unhealthy';
  } else {
    const statuses = Object.values(dependencies).map((d) => d.status);
    if (statuses.includes('unhealthy')) {
      overall = 'degraded';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    }
  }

  return {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    dependencies,
  };
}

export async function runReadinessCheck(): Promise<ReadinessResult> {
  const checks = {
    database: false,
    environment: false,
  };

  // Check database connectivity
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // Check required environment variables
  checks.environment = !!(
    process.env.DATABASE_URL &&
    process.env.JWT_SECRET
  );

  return {
    ready: checks.database && checks.environment,
    checks,
  };
}

export async function getMetrics(): Promise<string> {
  const lines: string[] = [];
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - serverStartTime) / 1000);

  // Server uptime
  lines.push('# HELP app_uptime_seconds Server uptime in seconds');
  lines.push('# TYPE app_uptime_seconds gauge');
  lines.push(`app_uptime_seconds ${uptimeSeconds}`);
  lines.push('');

  // API request/error counts
  lines.push('# HELP app_api_requests_total Total API requests');
  lines.push('# TYPE app_api_requests_total counter');
  lines.push(`app_api_requests_total ${apiRequestCount}`);
  lines.push('');

  lines.push('# HELP app_api_errors_total Total API errors');
  lines.push('# TYPE app_api_errors_total counter');
  lines.push(`app_api_errors_total ${apiErrorCount}`);
  lines.push('');

  // Error rate (requests in the last window)
  const errorRate = apiRequestCount > 0 ? apiErrorCount / apiRequestCount : 0;
  lines.push('# HELP app_api_error_rate API error rate (errors/requests)');
  lines.push('# TYPE app_api_error_rate gauge');
  lines.push(`app_api_error_rate ${errorRate.toFixed(6)}`);
  lines.push('');

  // System metrics
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  lines.push('# HELP node_memory_free_bytes Free system memory in bytes');
  lines.push('# TYPE node_memory_free_bytes gauge');
  lines.push(`node_memory_free_bytes ${freeMem}`);
  lines.push('');

  lines.push('# HELP node_memory_total_bytes Total system memory in bytes');
  lines.push('# TYPE node_memory_total_bytes gauge');
  lines.push(`node_memory_total_bytes ${totalMem}`);
  lines.push('');

  const processMemory = process.memoryUsage();
  lines.push('# HELP process_heap_used_bytes Process heap used in bytes');
  lines.push('# TYPE process_heap_used_bytes gauge');
  lines.push(`process_heap_used_bytes ${processMemory.heapUsed}`);
  lines.push('');

  lines.push('# HELP process_rss_bytes Process resident set size in bytes');
  lines.push('# TYPE process_rss_bytes gauge');
  lines.push(`process_rss_bytes ${processMemory.rss}`);
  lines.push('');

  // Database metrics
  try {
    // Active sessions count
    const activeSessionsResult = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(eq(chatSessions.status, 'active'));
    const activeSessionCount = activeSessionsResult[0]?.count ?? 0;

    lines.push('# HELP app_active_sessions Number of active chat sessions');
    lines.push('# TYPE app_active_sessions gauge');
    lines.push(`app_active_sessions ${activeSessionCount}`);
    lines.push('');

    // Total users
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const totalUserCount = totalUsersResult[0]?.count ?? 0;

    lines.push('# HELP app_users_total Total registered users');
    lines.push('# TYPE app_users_total gauge');
    lines.push(`app_users_total ${totalUserCount}`);
    lines.push('');

    // Credits: sum of coinBalance across all users
    const creditResult = await db
      .select({
        totalCredits: sum(users.coinBalance),
        totalUsed: sum(users.totalCoinsUsed),
      })
      .from(users);
    const totalCreditsRemaining = Number(creditResult[0]?.totalCredits ?? 0);
    const totalCreditsUsed = Number(creditResult[0]?.totalUsed ?? 0);

    lines.push('# HELP app_credits_remaining_coins Total coins remaining across all users');
    lines.push('# TYPE app_credits_remaining_coins gauge');
    lines.push(`app_credits_remaining_coins ${totalCreditsRemaining}`);
    lines.push('');

    lines.push('# HELP app_credits_used_coins Total coins used across all users');
    lines.push('# TYPE app_credits_used_coins gauge');
    lines.push(`app_credits_used_coins ${totalCreditsUsed}`);
    lines.push('');

    // Credit purchases count
    const purchasesResult = await db
      .select({ count: count() })
      .from(creditPurchases)
      .where(eq(creditPurchases.status, 'completed'));
    const purchaseCount = purchasesResult[0]?.count ?? 0;

    lines.push('# HELP app_credit_purchases_total Total completed credit purchases');
    lines.push('# TYPE app_credit_purchases_total counter');
    lines.push(`app_credit_purchases_total ${purchaseCount}`);
    lines.push('');

    // Safety violations in last 24 hours
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const violationsResult = await db
      .select({ count: count() })
      .from(safetyViolations)
      .where(gte(safetyViolations.createdAt, oneDayAgo));
    const recentViolations = violationsResult[0]?.count ?? 0;

    lines.push('# HELP app_safety_violations_24h Safety violations in last 24 hours');
    lines.push('# TYPE app_safety_violations_24h gauge');
    lines.push(`app_safety_violations_24h ${recentViolations}`);
    lines.push('');
  } catch (error) {
    // If DB is down, still return the system metrics
    lines.push('# HELP app_db_metrics_error Database metrics unavailable');
    lines.push('# TYPE app_db_metrics_error gauge');
    lines.push('app_db_metrics_error 1');
    lines.push('');
  }

  // Circuit breaker metrics
  lines.push(getCircuitBreakerMetrics());

  return lines.join('\n');
}
