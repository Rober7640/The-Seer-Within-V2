// Per-offer backend stats: initial purchases (be_orders) + U1/U2 (be_upsell_orders).
//   RUN: DOTENV_CONFIG_PATH=<env> npx tsx server/scripts/be-upsell-stats.ts
import 'dotenv/config';
import { pool } from '../lib/db';

async function main() {
  const sql = `
    SELECT
      COALESCE(i.offer, u.offer)                              AS offer,
      COALESCE(i.initial, 0)                                  AS initial,
      COALESCE(u.u1, 0)                                       AS upsell1,
      COALESCE(u.u2, 0)                                       AS upsell2,
      COALESCE(u.upsell_cents, 0)                             AS upsell_cents
    FROM (
      SELECT offer, COUNT(*)::int AS initial
      FROM be_orders WHERE status = 'paid' GROUP BY offer
    ) i
    FULL JOIN (
      SELECT offer,
             COUNT(*) FILTER (WHERE product = 'be_protection_ritual')::int AS u1,
             COUNT(*) FILTER (WHERE product = 'be_bracelet')::int          AS u2,
             SUM(amount_cents)::int                                        AS upsell_cents
      FROM be_upsell_orders GROUP BY offer
    ) u ON u.offer = i.offer
    ORDER BY offer;`;
  const { rows } = await pool.query(sql);
  console.table(rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
