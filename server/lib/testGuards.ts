/**
 * Safety rails for tests that touch a real Postgres.
 *
 * This repo has a single DATABASE_URL and it points at production Supabase.
 * Tests that create users, sessions and messages must never run against it, so
 * every DB-touching test file calls assertLocalDb() at module scope: a missing
 * `--env-file=.env.test` then fails loudly instead of writing to production.
 *
 * Run DB tests with: npm run test:local <file>
 */

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

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
