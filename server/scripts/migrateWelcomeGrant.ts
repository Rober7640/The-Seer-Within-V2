// Additive, idempotent migration for Task 1.1 (grant free minutes at registration).
//   npx tsx server/scripts/migrateWelcomeGrant.ts
//
// Adds users.welcome_coins_granted_at — the idempotency marker that lets the welcome
// free-coin grant fire exactly once, whether it happens at registration (when
// ENABLE_FREE_MINS_AT_REGISTRATION is on for the funnel) or at /verify-email.
//
// Safe to run multiple times: ADD COLUMN IF NOT EXISTS. Nullable, no default →
// instant, non-locking on Postgres. Existing rows get NULL, which is correct:
// already-verified users can never re-reach the grant path (they hit the
// "already verified" early-return in /verify-email), so a NULL marker on them
// can never cause a double grant.

import 'dotenv/config';
import pg from 'pg';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_coins_granted_at timestamp;`,
  );
  console.log('✓ users.welcome_coins_granted_at ready');

  await pool.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error('migrateWelcomeGrant failed:', err);
  process.exit(1);
});
