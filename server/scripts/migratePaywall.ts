// Additive, idempotent migration for the Problem-4 paywall A/B experiment.
//   npx tsx server/scripts/migratePaywall.ts
//
// Creates the `paywall_views` table + indexes and seeds a DISABLED experiment
// config row scoped to Evelyn Cross. Disabled = every user keeps the current
// paywall (variant A). To start the test: set config_value.enabled=true and
// percentB=50 on the `paywall_copy_experiment` row.
//
// Safe to run multiple times: CREATE ... IF NOT EXISTS + ON CONFLICT DO NOTHING.

import 'dotenv/config';
import pg from 'pg';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS paywall_views (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      experiment_key text NOT NULL DEFAULT 'paywall_copy_2026',
      variant text NOT NULL,
      surface text NOT NULL,
      persona_id varchar REFERENCES personas(id) ON DELETE SET NULL,
      is_out_of_credits boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_paywall_views_user_created ON paywall_views (user_id, created_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_paywall_views_exp_variant ON paywall_views (experiment_key, variant);`);
  console.log('✓ paywall_views table + indexes ready');

  const evelyn = await pool.query(`SELECT id FROM personas WHERE slug = 'evelyn-cross' LIMIT 1`);
  const evelynId: string | null = evelyn.rows[0]?.id ?? null;
  const cfg = JSON.stringify({ enabled: false, percentB: 50, personaId: evelynId });

  const result = await pool.query(
    `INSERT INTO system_config (config_key, config_value, config_type, description)
     VALUES ('paywall_copy_experiment', $1, 'json',
       'Paywall copy A/B. variant B = redesign. Phase 1: Evelyn only. Set enabled=true, percentB=50 to start.')
     ON CONFLICT (config_key) DO NOTHING
     RETURNING id`,
    [cfg],
  );
  if (result.rowCount && result.rowCount > 0) {
    console.log('✓ seeded DISABLED experiment config (Evelyn):', cfg);
  } else {
    console.log('• experiment config already exists — left unchanged');
  }

  await pool.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error('migratePaywall failed:', err);
  process.exit(1);
});
