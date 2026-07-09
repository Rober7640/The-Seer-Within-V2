// Fraud Detection Module
// Detects abuse patterns: multiple accounts from same IP, suspicious fingerprints, etc.

import { db } from './db';
import { users } from '@shared/schema';
import { eq, and, gte, sql, count } from 'drizzle-orm';
import { Request } from 'express';
import logger from './logger';

// Thresholds
//
// Registration is gated by stronger, earlier layers (Cloudflare Turnstile, disposable-email
// blocklist, NeverBounce deliverability, and required email verification before any coins are
// granted). The IP check below is a coarse backstop, NOT the primary defense — so it is tuned
// to avoid blocking real buyers, who routinely share an IP via mobile carrier CGNAT, offices,
// households, and cafés (Facebook traffic is mostly mobile).
//
// - FLAG threshold: generous. Reaching it only stamps the account for admin review; it never
//   blocks registration. Real users on a busy shared IP still get in.
const MAX_ACCOUNTS_PER_IP_24H = parseInt(process.env.MAX_ACCOUNTS_PER_IP_24H || '10', 10);
// - HARD-BLOCK threshold: set well above any realistic shared-IP level, so only extreme,
//   script-like volume from a single IP is refused. This is the only IP condition that blocks.
const HARD_BLOCK_ACCOUNTS_PER_IP_24H = parseInt(process.env.HARD_BLOCK_ACCOUNTS_PER_IP_24H || '25', 10);
// - FINGERPRINT threshold: a matching device fingerprint means the same physical browser
//   (not affected by shared/CGNAT IPs), so it's a much stronger abuse signal — kept tight.
//   It flags for review; it does not block.
const MAX_ACCOUNTS_PER_FINGERPRINT_24H = parseInt(process.env.MAX_ACCOUNTS_PER_FINGERPRINT_24H || '3', 10);

export type FraudFlag = 'ip_flagged' | 'ip_hard_blocked' | 'manual_review' | 'fingerprint_flagged' | 'cleared';

export interface FraudCheckResult {
  /** True when the account should be stamped for review (does NOT imply blocking). */
  flagged: boolean;
  /** True only on extreme IP volume — the caller should refuse registration. */
  hardBlocked: boolean;
  flags: FraudFlag[];
  details: string;
  recentAccountsFromIp: number;
  recentAccountsFromFingerprint: number;
}

/**
 * Extract the client IP from an Express request, handling proxies.
 */
export function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]!.trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Extract the user agent from an Express request.
 */
export function extractUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Extract device fingerprint from request headers (sent by the client).
 */
export function extractFingerprint(req: Request): string | null {
  return (req.headers['x-device-fingerprint'] as string) || null;
}

/**
 * Check if a new registration should be flagged for fraud.
 * Looks at how many accounts were created from the same IP in the last 24 hours.
 */
export async function checkRegistrationFraud(ip: string, fingerprint: string | null): Promise<FraudCheckResult> {
  const flags: FraudFlag[] = [];
  const details: string[] = [];

  // Skip checks for localhost/development IPs
  if (isLocalIp(ip)) {
    return {
      flagged: false,
      hardBlocked: false,
      flags: [],
      details: 'Local IP - skipped fraud checks',
      recentAccountsFromIp: 0,
      recentAccountsFromFingerprint: 0,
    };
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let hardBlocked = false;

  // Check accounts from same IP in last 24 hours.
  // Extreme volume -> hard block; merely-high volume -> flag for review (still allowed in).
  const ipCountResult = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.registrationIp, ip),
        gte(users.createdAt, twentyFourHoursAgo),
      ),
    );

  const recentAccountsFromIp = ipCountResult[0]?.count || 0;

  if (recentAccountsFromIp >= HARD_BLOCK_ACCOUNTS_PER_IP_24H) {
    flags.push('ip_hard_blocked');
    hardBlocked = true;
    details.push(`${recentAccountsFromIp} accounts from same IP in 24h (hard-block threshold: ${HARD_BLOCK_ACCOUNTS_PER_IP_24H})`);
  } else if (recentAccountsFromIp >= MAX_ACCOUNTS_PER_IP_24H) {
    flags.push('ip_flagged');
    details.push(`${recentAccountsFromIp} accounts from same IP in 24h (flag threshold: ${MAX_ACCOUNTS_PER_IP_24H})`);
  }

  // Check accounts with same device fingerprint (if provided). Same fingerprint = same
  // physical browser, a stronger signal than a shared IP — flags for review, never blocks.
  let recentAccountsFromFingerprint = 0;
  if (fingerprint) {
    const fpCountResult = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.deviceFingerprint, fingerprint),
          gte(users.createdAt, twentyFourHoursAgo),
        ),
      );

    recentAccountsFromFingerprint = fpCountResult[0]?.count || 0;

    if (recentAccountsFromFingerprint >= MAX_ACCOUNTS_PER_FINGERPRINT_24H) {
      flags.push('fingerprint_flagged');
      details.push(`${recentAccountsFromFingerprint} accounts with same fingerprint in 24h (threshold: ${MAX_ACCOUNTS_PER_FINGERPRINT_24H})`);
    }
  }

  const flagged = flags.length > 0;

  if (flagged) {
    logger.warn(`[Fraud Detection] Registration ${hardBlocked ? 'HARD-BLOCKED' : 'flagged'} from IP ${ip}: ${details.join('; ')}`);
  }

  return {
    flagged,
    hardBlocked,
    flags,
    details: details.join('; ') || 'No issues detected',
    recentAccountsFromIp,
    recentAccountsFromFingerprint,
  };
}

/**
 * Get parsed account flags for a user, or empty array.
 */
export function parseAccountFlags(flagsJson: string | null): FraudFlag[] {
  if (!flagsJson) return [];
  try {
    return JSON.parse(flagsJson) as FraudFlag[];
  } catch {
    return [];
  }
}

/**
 * Serialize account flags to JSON string.
 */
export function serializeAccountFlags(flags: FraudFlag[]): string {
  return JSON.stringify(flags);
}

/**
 * Check if an IP is a localhost/private address (skip fraud checks in dev).
 */
function isLocalIp(ip: string): boolean {
  return (
    !ip ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('127.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip === 'unknown'
  );
}

/**
 * Get all users flagged for fraud review (for admin dashboard).
 */
export async function getFlaggedUsers(page: number = 1, limit: number = 50) {
  const offset = (page - 1) * limit;

  // Users whose accountFlags is not null and not an empty array
  const flaggedUsers = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      registrationIp: users.registrationIp,
      lastLoginIp: users.lastLoginIp,
      registrationUserAgent: users.registrationUserAgent,
      deviceFingerprint: users.deviceFingerprint,
      accountFlags: users.accountFlags,
      accountStatus: users.accountStatus,
      coinBalance: users.coinBalance,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(
      and(
        sql`${users.accountFlags} IS NOT NULL`,
        sql`${users.accountFlags} != '[]'`,
      ),
    )
    .orderBy(sql`${users.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        sql`${users.accountFlags} IS NOT NULL`,
        sql`${users.accountFlags} != '[]'`,
      ),
    );

  const total = totalResult[0]?.count || 0;

  return {
    users: flaggedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get all users registered from a specific IP address.
 */
export async function getUsersByIp(ip: string) {
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      accountFlags: users.accountFlags,
      accountStatus: users.accountStatus,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.registrationIp, ip))
    .orderBy(sql`${users.createdAt} DESC`);
}

/**
 * Admin action: clear fraud flags for a user.
 */
export async function clearFraudFlags(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      accountFlags: serializeAccountFlags(['cleared']),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Admin action: add a flag to a user account.
 */
export async function addFraudFlag(userId: string, flag: FraudFlag): Promise<void> {
  const user = await db
    .select({ accountFlags: users.accountFlags })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]) return;

  const existing = parseAccountFlags(user[0].accountFlags);
  if (!existing.includes(flag)) {
    existing.push(flag);
  }

  await db
    .update(users)
    .set({
      accountFlags: serializeAccountFlags(existing),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
