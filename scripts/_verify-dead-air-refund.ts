// LOCAL-ONLY verification for the 2026-07-14 dead-air billing fix.
// Simulates the 72h audit's exact ledger shapes and drives the REAL billing
// functions against the local DB. Refuses to run against anything but localhost.
//
//   npx tsx scripts/_verify-dead-air-refund.ts
import 'dotenv/config';
import { pool } from '../server/lib/db';
import { checkpointSession, cleanupInactiveSessions, endChatSession } from '../server/lib/creditTracking';

async function main() {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('localhost')) throw new Error('REFUSING: DATABASE_URL is not localhost');

  // Persona with the Step-1 timeout (2 min — must sit BELOW the browser's ~3-min
  // auto-close so that close's idle tail is forgiven) applied locally
  const p = await pool.query(`SELECT id FROM personas WHERE slug='evelyn-cross' LIMIT 1`);
  const personaId = p.rows[0].id;
  await pool.query(`UPDATE personas SET session_timeout_minutes = 2 WHERE id = $1`, [personaId]);

  // Throwaway user
  await pool.query(`DELETE FROM users WHERE email = 'verify-billing@eval.internal'`);
  const u = await pool.query(
    `INSERT INTO users (email, first_name, coin_balance) VALUES ('verify-billing@eval.internal','Verify',1000) RETURNING id`
  );
  const userId = u.rows[0].id;

  const mkSession = async (startedMinAgo: number, lastMsgMinAgo: number, charged: number) => {
    const r = await pool.query(
      `INSERT INTO chat_sessions (user_id, persona_id, status, started_at, last_message_at, last_heartbeat_at, duration_seconds, coins_charged, promo_coins_charged, created_at)
       VALUES ($1,$2,'active',
               (NOW() AT TIME ZONE 'UTC') - ($3 || ' minutes')::interval,
               (NOW() AT TIME ZONE 'UTC') - ($4 || ' minutes')::interval,
               (NOW() AT TIME ZONE 'UTC'),
               $5, $6, 0, (NOW() AT TIME ZONE 'UTC'))
       RETURNING id`,
      [userId, personaId, String(startedMinAgo), String(lastMsgMinAgo), Math.round((startedMinAgo - lastMsgMinAgo) * 60), charged]
    );
    return r.rows[0].id as string;
  };
  const balance = async () => Number((await pool.query(`SELECT coin_balance FROM users WHERE id=$1`, [userId])).rows[0].coin_balance);
  const session = async (id: string) => (await pool.query(`SELECT status, duration_seconds, coins_charged FROM chat_sessions WHERE id=$1`, [id])).rows[0];

  let failures = 0;
  const check = (name: string, cond: boolean, detail: unknown) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`, cond ? '' : JSON.stringify(detail));
    if (!cond) failures++;
  };

  // ── Scenario 1: checkpoint refund. Started 10m ago, last msg 8m ago (active=120s),
  //    wall-clock billed 570 coins. Idle 480s > 180s timeout → rebase to 120s → refund 450.
  const b1 = await balance();
  const s1 = await mkSession(10, 8, 570);
  await checkpointSession(s1);
  const r1 = await session(s1);
  const b1after = await balance();
  check('checkpoint rebases coins to active time (120)', Number(r1.coins_charged) === 120, r1);
  check('checkpoint rewrites duration to 120s', Number(r1.duration_seconds) === 120, r1);
  check('checkpoint REFUNDS 450 to the user', b1after - b1 === 450, { before: b1, after: b1after });

  // ── Scenario 2: cleanup refund — the dc2ea37f audit shape (139s active, 780 charged).
  //    Idle > 5min scan cutoff → cleanup ends it; secondsToCoins(139)=135 → refund 645.
  const b2 = await balance();
  const s2 = await mkSession(20, 20 - 139 / 60, 780);
  await cleanupInactiveSessions();
  const r2 = await session(s2);
  const b2after = await balance();
  check('cleanup ends the abandoned session', r2.status === 'ended', r2);
  check('cleanup sets coins to 15s-block active basis (135)', Number(r2.coins_charged) === 135, r2);
  check('cleanup REFUNDS 645 to the user', b2after - b2 === 645, { before: b2, after: b2after });

  // ── Scenario 3: endChatSession refund path still intact (regression check).
  //    Active 30s, charged 100, idle 270s > 180 → final=30 coins → refund 70.
  const b3 = await balance();
  const s3 = await mkSession(5, 4.5, 100);
  await endChatSession(s3);
  const r3 = await session(s3);
  const b3after = await balance();
  check('endChatSession final charge = 30', Number(r3.coins_charged) === 30, r3);
  check('endChatSession refunds 70', b3after - b3 === 70, { before: b3, after: b3after });

  // ── Scenario 4: live session unaffected — started 1m ago, msg 10s ago, charged 45.
  //    Idle < timeout → wall-clock basis keeps billing forward, never refunds.
  const s4 = await mkSession(1, 10 / 60, 45);
  await checkpointSession(s4);
  const r4 = await session(s4);
  check('live session still bills forward (>=45, no refund)', Number(r4.coins_charged) >= 45 && r4.status === 'active', r4);

  // ── Scenario 5: the browser's "Are you still there?" auto-close (~3 min idle).
  //    This was the audit's ~190s-billed window: idle 180s vs old timeout 1800s →
  //    the tail was billed. With timeout=2min: idle 180s > 120s → tail forgiven.
  //    Started 10m ago, last msg 3m ago (active=420s), wall-clock charged 600.
  const b5 = await balance();
  const s5 = await mkSession(10, 3, 600);
  await endChatSession(s5);
  const r5 = await session(s5);
  const b5after = await balance();
  check('browser auto-close bills only active time (420)', Number(r5.coins_charged) === 420, r5);
  check('the ~3-min idle tail is REFUNDED (180)', b5after - b5 === 180, { before: b5, after: b5after });

  // Cleanup
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  console.log(failures === 0 ? '\nALL SCENARIOS PASS' : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
