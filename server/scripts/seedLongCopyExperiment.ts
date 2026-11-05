// Idempotent seed for the long-copy + bonus-pack paywall test
// (improve_v2_paywall_2026, "updated test 1").
//   npx tsx server/scripts/seedLongCopyExperiment.ts
//
// Creates a DRAFT (disabled) experiment row in the `experiments` table, scoped to
// Evelyn Cross. Draft = nobody is enrolled, every user keeps today's paywall and
// today's grant — assign() returns the control arm until status is flipped to
// 'running'. To start the test: set status='running' (admin UI or SQL) AND pause
// paywall_copy_2026. Safe to run multiple times (ON CONFLICT DO NOTHING).

import 'dotenv/config';
import pg from 'pg';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  const evelyn = await pool.query(`SELECT id FROM personas WHERE slug = 'evelyn-cross' LIMIT 1`);
  const evelynId: string | null = evelyn.rows[0]?.id ?? null;
  if (!evelynId) console.warn('⚠ Evelyn persona not found; scope.personaId will be null (test would enrol every persona once running).');

  const variants = JSON.stringify([
    { key: 'A', weight: 50, payload: {} }, // control — today's paywall + grant
    { key: 'B', weight: 50, payload: {} }, // test — long-copy/repeat paywalls + bonus ladder
  ]);
  const scope = JSON.stringify({ personaId: evelynId, freezeAssignment: true });
  const conversion = JSON.stringify({ type: 'credit_purchase', windowDays: 7 });

  const result = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('improve_v2_paywall_2026',
       'Improve V2 paywall — long copy + bonus packs (updated test 1)',
       'A=control (today''s paywall + grant). B=long-copy first-timer / repeat-buyer paywalls + bonus-minute ladder incl. the $100 pack. Evelyn-only. Draft until started; pause paywall_copy_2026 when starting.',
       'draft', 'user', $1::jsonb, $2::jsonb, $3::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [variants, scope, conversion],
  );
  if (result.rowCount && result.rowCount > 0) console.log('✓ seeded DRAFT experiment improve_v2_paywall_2026 (Evelyn):', scope);
  else console.log('• experiment improve_v2_paywall_2026 already exists — left unchanged');

  await pool.end();
  console.log('Done.');
}

main().catch((e) => { console.error('seedLongCopyExperiment failed:', e); process.exit(1); });
