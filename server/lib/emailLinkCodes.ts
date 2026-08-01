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

/** Name Postgres gives the email_link_codes primary key (its default naming
 * convention for a single-column PK: `<table>_pkey`). Verified against the
 * real local schema (`\d email_link_codes`), not guessed. */
const CODE_PK_CONSTRAINT = 'email_link_codes_pkey';

function generateCode(): string {
  // 5 random bytes -> 7-char URL-safe string (base64url, no padding).
  return randomBytes(5).toString('base64url');
}

/**
 * True only when `err` is a unique_violation against THIS table's primary
 * key — i.e. a genuine random-code collision that's safe to retry. A unique
 * violation on any other constraint (or any other kind of error) must not be
 * swallowed by a silent retry loop.
 *
 * Exported (not just inlined in the catch block) so the decision itself can
 * be unit-tested against a fabricated error shape, independent of whether
 * the live schema currently has a second unique constraint to provoke one.
 */
export function isCodeCollision(err: unknown): boolean {
  const e = err as { code?: unknown; constraint?: unknown } | null | undefined;
  return e?.code === PG_UNIQUE_VIOLATION && e?.constraint === CODE_PK_CONSTRAINT;
}

export async function mintEmailLinkCode(
  input: MintEmailLinkCodeInput,
  // Injectable purely so tests can force a specific code sequence (e.g. a
  // pre-occupied code followed by a fresh one) to observe a real retry.
  // Production callers never pass this — it defaults to the real generator.
  codeGenerator: () => string = generateCode,
): Promise<string> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = codeGenerator();
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
    } catch (err) {
      if (isCodeCollision(err)) continue;
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
