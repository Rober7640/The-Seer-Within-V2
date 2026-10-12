// Evelyn email stats — READ-ONLY funnel report straight from production.
// Clicks (lander arrivals via /e/ short links) → signed in → chat → buyers → revenue,
// per campaign, for a window. Source of truth for email clicks/revenue (NOT AWeber,
// whose click column is always 0 for these custom-HTML short-link emails).
//
// Usage (from repo root):
//   node .claude/skills/email-stats/stats.mjs [--days N] [--prefix story-] [--json]
//   --days N     window, default 7
//   --prefix P   campaign prefix to match, default "story-" (use "" for ALL campaigns)
//   --json       print raw JSON instead of the table
//
// Prod creds: reads the Supabase DATABASE_URL from .env (even if commented). SELECT-only.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const DAYS = parseInt(arg('--days', '7'), 10);
const PREFIX = arg('--prefix', 'story-');
const JSON_OUT = process.argv.includes('--json');

function prodUrl() {
  // 1) explicit override — the CURRENT prod read-only connection (preferred).
  if (process.env.EMAIL_STATS_DATABASE_URL) return process.env.EMAIL_STATS_DATABASE_URL;
  const env = readFileSync(path.join(ROOT, '.env'), 'utf8');
  // 2) a dedicated line in .env (set this to the live prod read URL).
  // 3) fall back to any Supabase DATABASE_URL (may be stale — the script warns if empty).
  let supa;
  for (const raw of env.split('\n')) {
    const line = raw.replace(/^\s*#\s*/, '').trim();          // tolerate commented-out line
    let m = line.match(/^EMAIL_STATS_DATABASE_URL=(.+)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    m = line.match(/^DATABASE_URL=(.+)$/);
    if (m) { const v = m[1].trim().replace(/^["']|["']$/g, ''); if (v.includes('supabase.com')) supa = supa || v; }
  }
  if (supa) return supa;
  throw new Error('no prod URL — set EMAIL_STATS_DATABASE_URL (the current prod read-only connection) in .env or the environment');
}

const CLICKS = `
  SELECT campaign,
         COUNT(*)                         AS clicks,
         COUNT(DISTINCT resolved_user_id) AS signed_in
  FROM evelyn_lander_sessions
  WHERE started_at >= now() - ($1 || ' days')::interval
    AND campaign IS NOT NULL
    AND ($2 = '' OR campaign LIKE $2 || '%')
  GROUP BY campaign`;

const FUNNEL = `
  WITH clk AS (
    SELECT campaign AS camp, resolved_user_id AS uid, MIN(started_at) AS t0
    FROM evelyn_lander_sessions
    WHERE started_at >= now() - ($1 || ' days')::interval
      AND resolved_user_id IS NOT NULL
      AND ($2 = '' OR campaign LIKE $2 || '%')
    GROUP BY campaign, resolved_user_id
  ),
  cht AS (
    SELECT c.camp, c.uid FROM clk c
    WHERE EXISTS (SELECT 1 FROM chat_sessions s
                  WHERE s.user_id = c.uid AND s.started_at >= c.t0)
  ),
  buy AS (
    SELECT c.camp, c.uid, SUM(p.price_usd) AS cents
    FROM clk c
    JOIN credit_purchases p ON p.user_id = c.uid
                           AND p.status = 'completed'
                           AND p.created_at >= c.t0
    GROUP BY c.camp, c.uid
  )
  SELECT k.camp AS campaign,
         COUNT(DISTINCT t.uid) AS chatted,
         COUNT(DISTINCT b.uid) AS buyers,
         ROUND(COALESCE(SUM(b.cents),0)/100.0, 2) AS revenue_usd
  FROM clk k
  LEFT JOIN cht t ON t.camp = k.camp AND t.uid = k.uid
  LEFT JOIN buy b ON b.camp = k.camp AND b.uid = k.uid
  GROUP BY k.camp`;

function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function padL(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }

async function main() {
  const url = prodUrl();
  const host = url.replace(/\/\/[^@]*@/, '//****@').replace(/\?.*$/, '');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('SET default_transaction_read_only = on');  // belt-and-braces
    const clicks = (await client.query(CLICKS, [String(DAYS), PREFIX])).rows;
    const funnel = (await client.query(FUNNEL, [String(DAYS), PREFIX])).rows;
    const byCamp = new Map();
    for (const r of clicks) byCamp.set(r.campaign, { campaign: r.campaign, clicks: +r.clicks, signed_in: +r.signed_in, chatted: 0, buyers: 0, revenue_usd: 0 });
    for (const r of funnel) { const e = byCamp.get(r.campaign) || { campaign: r.campaign, clicks: 0, signed_in: 0 }; e.chatted = +r.chatted; e.buyers = +r.buyers; e.revenue_usd = +r.revenue_usd; byCamp.set(r.campaign, e); }
    const rows = [...byCamp.values()].sort((a, b) => b.clicks - a.clicks);

    if (!rows.length) {
      console.error(`\n⚠ No matching campaigns in ${host}.`);
      console.error(`  This is likely the WRONG/stale DB. Set EMAIL_STATS_DATABASE_URL to the current`);
      console.error(`  production read-only connection string, then re-run. (Try --prefix "" --days 30 to sanity-check.)`);
      return;
    }
    if (JSON_OUT) { console.log(JSON.stringify(rows, null, 2)); return; }

    const t = rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, signed_in: a.signed_in + r.signed_in, chatted: a.chatted + r.chatted, buyers: a.buyers + r.buyers, revenue_usd: a.revenue_usd + r.revenue_usd }), { clicks: 0, signed_in: 0, chatted: 0, buyers: 0, revenue_usd: 0 });
    console.log(`\nEvelyn email stats — last ${DAYS} days${PREFIX ? ` · campaigns "${PREFIX}*"` : ' · ALL campaigns'}`);
    console.log(`prod: ${host}\n`);
    console.log(`${pad('campaign', 30)} ${padL('clicks', 7)} ${padL('signed', 7)} ${padL('chat', 6)} ${padL('buyers', 7)} ${padL('revenue', 10)}`);
    console.log('-'.repeat(72));
    for (const r of rows) console.log(`${pad(r.campaign, 30)} ${padL(r.clicks, 7)} ${padL(r.signed_in, 7)} ${padL(r.chatted, 6)} ${padL(r.buyers, 7)} ${padL('$' + r.revenue_usd.toFixed(2), 10)}`);
    console.log('-'.repeat(72));
    console.log(`${pad('TOTAL', 30)} ${padL(t.clicks, 7)} ${padL(t.signed_in, 7)} ${padL(t.chatted, 6)} ${padL(t.buyers, 7)} ${padL('$' + t.revenue_usd.toFixed(2), 10)}`);
    console.log(`\n(clicks = /e/ short-link arrivals; chat/buyers/revenue = signed-in clickers only; directional attribution — a reader who clicked several emails counts under each.)`);
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
