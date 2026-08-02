/**
 * Safety rails for tests that touch a real Postgres — or, via
 * assertNoOutboundCalls(), a real third-party API.
 *
 * This repo has a single DATABASE_URL and it points at production Supabase.
 * Tests that create users, sessions and messages must never run against it, so
 * every DB-touching test file calls assertLocalDb() at module scope: a missing
 * `--env-file=.env.test` then fails loudly instead of writing to production.
 *
 * Run DB tests with: npm run test:local <file>
 *
 * .env.test (git-ignored, machine-specific) must contain at least:
 *   DATABASE_URL=postgresql://<you>@localhost:5432/seer_local
 *   NODE_ENV=test
 *   RESEND_API_KEY=
 *   POSTHOG_API_KEY=
 *   TURNSTILE_SECRET_KEY=
 *   NEVERBOUNCE_API_KEY=
 * Everything not listed there falls through to .env — which holds the LIVE keys.
 */

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

/**
 * Third-party keys that must be blank under test. Each of these libraries treats
 * an empty value as "not configured" and no-ops, so blanking them is what keeps a
 * route test from mailing a real address, writing to the production PostHog
 * project, or making a live outbound HTTP call:
 *   RESEND_API_KEY       — verificationEmail.ts logs the URL instead of sending
 *   POSTHOG_API_KEY      — posthog.ts swaps in a no-op client
 *   TURNSTILE_SECRET_KEY — turnstile.ts skips verification (returns true)
 *   NEVERBOUNCE_API_KEY  — neverbounce.ts skips validation (returns valid)
 * They live in .env with REAL values, and .env.test does not override anything it
 * does not name — so a file that exercises these paths has to say so explicitly.
 */
const MUST_BE_BLANK_UNDER_TEST = [
  'RESEND_API_KEY',
  'POSTHOG_API_KEY',
  'TURNSTILE_SECRET_KEY',
  'NEVERBOUNCE_API_KEY',
] as const;

/**
 * Throws unless every third-party key above is blank. Call at module scope in any
 * test that drives a route which mails, tracks, or validates through one of them.
 */
export function assertNoOutboundCalls(): void {
  const populated = MUST_BE_BLANK_UNDER_TEST.filter((key) => !!process.env[key]);
  if (populated.length > 0) {
    throw new Error(
      `Refusing to run: ${populated.join(', ')} ${populated.length === 1 ? 'is' : 'are'} set, ` +
        'so this test would send real email / analytics / API traffic.\n' +
        'Add them (blank) to your git-ignored .env.test, and run: npm run test:local <file>',
    );
  }
}

/** True when DATABASE_URL is set and points at a local Postgres. */
export function isLocalDb(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  try {
    return LOCAL_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Throws unless DATABASE_URL points at a local Postgres. Call at the top of any
 * test module that writes to the database.
 */
export function assertLocalDb(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Run DB tests with: npm run test:local <file>',
    );
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(`DATABASE_URL is not a valid URL: ${url}`);
  }

  if (!LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `Refusing to run DB tests against a non-local database (host: ${hostname}).\n` +
        'These tests create and delete rows. Run them with: npm run test:local <file>',
    );
  }
}
