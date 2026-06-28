// Additive, idempotent migration for the unified A/B experiment framework
// (PRD: docs/ab-testing-framework-prd.md §3). Mirrors migratePaywall.ts.
//
//   npx tsx server/scripts/migrateExperiments.ts            # create + seed
//   npx tsx server/scripts/migrateExperiments.ts --rollback # drop the new tables
//
// Creates `experiments` + `experiment_exposures` (+ indexes) and seeds the
// paywall test as a DISABLED (status='draft') experiment scoped to Evelyn —
// draft ⇒ assign() returns the control arm for everyone, so live UI is
// unchanged. To START: set the row's status='running' (ramp via variant weights).
//
// Additive + reversible: only CREATE ... IF NOT EXISTS / INSERT ... ON CONFLICT
// DO NOTHING here (safe to run repeatedly); --rollback DROPs ONLY these two
// experiment-only tables and touches nothing else (users, credit_purchases,
// system_config, paywall_views are all left intact).

import 'dotenv/config';
import pg from 'pg';

async function up(pool: pg.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS experiments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      key text NOT NULL UNIQUE,
      name text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'draft',
      subject_type text NOT NULL DEFAULT 'user',
      variants jsonb NOT NULL,
      scope jsonb,
      conversion jsonb,
      started_at timestamp,
      ended_at timestamp,
      winner_variant text,
      created_by varchar REFERENCES admin_users(id),
      updated_by varchar REFERENCES admin_users(id),
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log('✓ experiments table ready');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS experiment_exposures (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      experiment_key text NOT NULL,
      subject_id text NOT NULL,
      variant text NOT NULL,
      surface text NOT NULL,
      context jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_experiment_exposures_key_subject ON experiment_exposures (experiment_key, subject_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_experiment_exposures_key_variant ON experiment_exposures (experiment_key, variant);`,
  );
  console.log('✓ experiment_exposures table + indexes ready');

  // Seed the paywall test as a DRAFT experiment (Evelyn-scoped), mirroring the
  // existing disabled system_config.paywall_copy_experiment row.
  const evelyn = await pool.query(`SELECT id FROM personas WHERE slug = 'evelyn-cross' LIMIT 1`);
  const evelynId: string | undefined = evelyn.rows[0]?.id;
  if (!evelynId) {
    // Refuse to seed an UNSCOPED paywall experiment: scope {personaId:null} would
    // let assign() enrol every persona once started (Phase-1 is Evelyn-only). The
    // tables are already created above; just seed personas first, then re-run.
    throw new Error(
      "persona 'evelyn-cross' not found — run `npm run seed` first so the paywall experiment can be scoped to Evelyn. Tables were created; re-run this migration after seeding.",
    );
  }

  const variants = JSON.stringify([
    { key: 'A', weight: 50, payload: {} },
    { key: 'B', weight: 50, payload: {} },
  ]);
  const scope = JSON.stringify({ personaId: evelynId });
  const conversion = JSON.stringify({ type: 'credit_purchase', windowDays: 7 });

  const result = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('paywall_copy_2026', 'Paywall copy redesign (Problem 4)',
       'Variant B = redesigned minutes-led paywall. Phase 1: Evelyn only. To start, set status=running.',
       'draft', 'user', $1::jsonb, $2::jsonb, $3::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [variants, scope, conversion],
  );
  if (result.rowCount && result.rowCount > 0) {
    console.log('✓ seeded DRAFT paywall experiment (Evelyn):', { variants, scope, conversion });
  } else {
    console.log('• paywall experiment already exists — left unchanged');
  }

  // Phase 3b — Upsell-1 price test ($47 control vs $37 treatment). Draft = OFF,
  // so the Upsell-1 price stays the legacy $47 until started from the dashboard.
  const u1Variants = JSON.stringify([
    { key: 'A', weight: 50, payload: { upsell1Cents: 4700 } },
    { key: 'B', weight: 50, payload: { upsell1Cents: 3700 } },
  ]);
  const u1Conversion = JSON.stringify({ type: 'upsell1_funnel' });
  const u1 = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('u1_price_2026', 'Upsell-1 price ($47 vs $37)',
       'Upsell-1 (Protection Ritual) price test. A=$47 (control, today), B=$37. Sticky per email; assigned at lead capture, stored on conversations.upsell1AmountCents. To start, set status=running.',
       'draft', 'email', $1::jsonb, NULL, $2::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [u1Variants, u1Conversion],
  );
  if (u1.rowCount && u1.rowCount > 0) {
    console.log('✓ seeded DRAFT Upsell-1 price experiment:', { u1Variants });
  } else {
    console.log('• u1_price_2026 experiment already exists — left unchanged');
  }
}

async function down(pool: pg.Pool) {
  // Experiment-only tables: dropping them removes no other data.
  await pool.query(`DROP TABLE IF EXISTS experiment_exposures;`);
  await pool.query(`DROP TABLE IF EXISTS experiments;`);
  console.log('✓ dropped experiment_exposures + experiments (rollback)');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const rollback = process.argv.includes('--rollback');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  if (rollback) {
    await down(pool);
  } else {
    await up(pool);
  }
  await pool.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error('migrateExperiments failed:', err);
  process.exit(1);
});
