/**
 * Mint/resolve opaque short codes for marketing-email links (/e/:code).
 *
 * A code stands in for a content snapshot (persona, campaign, recap, open
 * loop, continuation seed) captured at email-render time, so the lander can
 * continue the specific reading a reader clicked from without exposing a
 * guessable `?campaign=` param. See shared/schema.ts `emailLinkCodes`.
 */
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { emailLinkCodes } from '@shared/schema';

export interface ResolvedEmailLink {
  personaSlug: string;
  campaign: string;
  readingRecap: string | null;
  openLoop: string | null;
  continueSeed: string;
}

interface MintEmailLinkCodeInput {
  personaSlug: string;
  campaign: string;
  continueSeed: string;
  readingRecap?: string;
  openLoop?: string;
}

/** Postgres unique_violation error code (primary key or unique constraint). */
const PG_UNIQUE_VIOLATION = '23505';

function generateCode(): string {
  // 5 random bytes -> 7-char URL-safe string (base64url, no padding).
  return randomBytes(5).toString('base64url');
}

export async function mintEmailLinkCode(input: MintEmailLinkCodeInput): Promise<string> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    try {
      await db.insert(emailLinkCodes).values({
        code,
        personaSlug: input.personaSlug,
        campaign: input.campaign,
        continueSeed: input.continueSeed,
        readingRecap: input.readingRecap ?? null,
        openLoop: input.openLoop ?? null,
      });
      return code;
    } catch (err: any) {
      // Only retry on a collision against THIS code's primary key — a unique
      // violation on some other constraint (or any other error) must not be
      // swallowed by a silent retry loop.
      const isCodeCollision =
        err?.code === PG_UNIQUE_VIOLATION &&
        typeof err?.constraint === 'string' &&
        err.constraint.includes('email_link_codes_pkey');
      if (isCodeCollision) continue;
      throw err;
    }
  }
  throw new Error(`Failed to mint a unique email link code after ${MAX_ATTEMPTS} attempts`);
}

export async function resolveEmailLinkCode(code: string): Promise<ResolvedEmailLink | null> {
  const rows = await db.select().from(emailLinkCodes).where(eq(emailLinkCodes.code, code)).limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    personaSlug: row.personaSlug,
    campaign: row.campaign,
    readingRecap: row.readingRecap,
    openLoop: row.openLoop,
    continueSeed: row.continueSeed,
  };
}
