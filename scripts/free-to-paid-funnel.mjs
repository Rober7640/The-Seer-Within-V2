// Free -> Paid in-product funnel report (Task 2.6).
// READ-ONLY. Cohort = users who signed up in the window. Steps (did the user EVER):
//   signup -> started chat -> paywall shown -> purchased
//     signup        = users.created_at in window
//     started chat  = >=1 chat_sessions row
//     paywall shown = >=1 checkout_views row (saw the buy UI)
//     purchased     = >=1 credit_purchases row, status='completed'
//   Plus the paywall-shown split (which is more insightful than a broken "exhausted" step,
//   since chat_sessions.status is always 'ended' — there is no exhaustion flag on sessions):
//     ran out (out_of_credits)  = checkout_views.source='out_of_credits'  (paywall forced by empty balance)
//     proactive                 = checkout_views.source<>'out_of_credits' (user opened buy UI voluntarily)
//   ...with the purchase rate of each, to see whether running out converts better than proactive intent.
//
// Usage:  node scripts/free-to-paid-funnel.mjs [days]      (default 30)

import pg from 'pg';
import fs from 'fs';

const days = Number(process.argv[2] || 30);

let url = null;
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
  if (m) url = m[1].replace(/^["']|["']$/g, '').trim();
}
if (!url) { console.error('no DATABASE_URL in .env'); process.exit(1); }

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const funnelSql = (groupBy) => `
WITH cohort AS (
  SELECT id AS user_id, coalesce(signup_funnel, 'none') AS funnel
  FROM users
  WHERE created_at >= now() - interval '${days} days'
),
chatted   AS (SELECT DISTINCT user_id FROM chat_sessions),
paywall   AS (SELECT DISTINCT user_id FROM checkout_views),
ooc       AS (SELECT DISTINCT user_id FROM checkout_views WHERE source = 'out_of_credits'),
proactive AS (SELECT DISTINCT user_id FROM checkout_views WHERE source <> 'out_of_credits'),
purchased AS (SELECT DISTINCT user_id FROM credit_purchases WHERE status = 'completed')
SELECT
  ${groupBy ? 'c.funnel,' : `'ALL' AS funnel,`}
  count(*)                                                             AS signups,
  count(*) FILTER (WHERE c.user_id IN (SELECT user_id FROM chatted))   AS started_chat,
  count(*) FILTER (WHERE c.user_id IN (SELECT user_id FROM paywall))   AS paywall_shown,
  count(*) FILTER (WHERE c.user_id IN (SELECT user_id FROM ooc))       AS paywall_ran_out,
  count(*) FILTER (WHERE c.user_id IN (SELECT user_id FROM proactive)) AS paywall_proactive,
  count(*) FILTER (WHERE c.user_id IN (SELECT user_id FROM purchased)) AS purchased,
  count(*) FILTER (WHERE c.user_id IN (SELECT user_id FROM ooc)
                     AND c.user_id IN (SELECT user_id FROM purchased)) AS ran_out_and_paid,
  count(*) FILTER (WHERE c.user_id IN (SELECT user_id FROM proactive)
                     AND c.user_id IN (SELECT user_id FROM purchased)) AS proactive_and_paid
FROM cohort c
${groupBy ? 'GROUP BY c.funnel ORDER BY signups DESC' : ''};
`;

const pct = (n, d) => (d > 0 ? (100 * n / d).toFixed(1) + '%' : '—');

function printRow(r) {
  console.log(
    `  ${String(r.funnel).padEnd(10)} ` +
    `signup ${String(r.signups).padStart(6)} ` +
    `| chat ${String(r.started_chat).padStart(6)} (${pct(r.started_chat, r.signups)}) ` +
    `| paywall ${String(r.paywall_shown).padStart(5)} (${pct(r.paywall_shown, r.signups)}) ` +
    `| paid ${String(r.purchased).padStart(4)} (${pct(r.purchased, r.signups)})`
  );
}

try {
  console.log(`\n=== Free -> Paid funnel — signups in the last ${days} days ===\n`);
  const overall = await pool.query(funnelSql(false));
  console.log('OVERALL:');
  overall.rows.forEach(printRow);

  const byFunnel = await pool.query(funnelSql(true));
  console.log('\nBY SIGNUP FUNNEL:');
  byFunnel.rows.forEach(printRow);

  const o = overall.rows[0];
  console.log('\nSTEP -> STEP (overall):');
  console.log(`  signup -> chat         ${pct(o.started_chat, o.signups)}`);
  console.log(`  chat -> paywall shown  ${pct(o.paywall_shown, o.started_chat)}`);
  console.log(`  paywall -> paid        ${pct(o.purchased, o.paywall_shown)}`);
  console.log(`  signup -> paid (all)   ${pct(o.purchased, o.signups)}`);

  console.log('\nPAYWALL TRIGGER -> PURCHASE (does running out convert better than proactive?):');
  console.log(`  ran out of credits -> paid   ${o.ran_out_and_paid}/${o.paywall_ran_out} (${pct(o.ran_out_and_paid, o.paywall_ran_out)})`);
  console.log(`  proactive open     -> paid   ${o.proactive_and_paid}/${o.paywall_proactive} (${pct(o.proactive_and_paid, o.paywall_proactive)})`);

  console.log('\nNOTES:');
  console.log('  - chat_sessions.status is always \'ended\' — there is no per-session exhaustion flag, so');
  console.log('    "ran out of credits" is inferred from checkout_views.source=\'out_of_credits\'.');
  console.log('  - "reached" coverage, not strictly nested (a user can buy without opening the paywall).');
  console.log(`  - Right-censoring: users who signed up recently in the ${days}d window have had less time to convert.`);
  console.log('  - The huge \'none\' cohort is mostly V1-funnel auto-created / migrated accounts with no V2 intent —');
  console.log('    the engaged lander funnels (evelyn/aiden/luna) are the meaningful free->paid rates.');
} catch (e) {
  console.error('QUERY ERROR:', e.message);
} finally {
  await pool.end();
}
