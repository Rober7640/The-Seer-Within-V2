// Per-funnel open-rate / CTR report for the V1->V2 migration drip emails.
//
// READ-ONLY. Numbers come from Resend's opened/clicked webhook events stored in
// migration_drip_emails, sliced by ad-funnel via the migrated conversation's
// price_variant. This is what the boss compares against FB ad performance.
//
// Usage:
//   node scripts/funnel-email-report.mjs              # last 30 days
//   node scripts/funnel-email-report.mjs 3            # last 3 days
//   node scripts/funnel-email-report.mjs 2026-06-19 2026-06-22   # explicit range
//
// Writes funnel-email-report.csv alongside the console table.

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const line = fs.readFileSync(path.resolve('.env'), 'utf8').split(/\r?\n/)
  .find((l) => /^\s*DATABASE_URL\s*=/.test(l) && !/^\s*#/.test(l));
const DATABASE_URL = line.replace(/^\s*DATABASE_URL\s*=/, '').trim();

// --- parse args: either "<days>" or "<sinceDate> <untilDate>" ---
const a = process.argv.slice(2);
let where, label;
if (a.length >= 2) {
  where = `m.sent_at >= '${a[0]}' and m.sent_at < ('${a[1]}'::date + 1)`;
  label = `${a[0]} .. ${a[1]}`;
} else {
  const days = a[0] ? parseInt(a[0], 10) : 30;
  where = `m.sent_at > now() - interval '${days} days'`;
  label = `last ${days} days`;
}

const FUNNEL_CASE = `case
  when cv.price_variant ~* '_palm' then 'v1-palm'
  when cv.price_variant ~* '_fb2'  then 'v1-fb2'
  when cv.price_variant ~* '_gdn'  then 'v1-gdn'
  when cv.price_variant ~* '_fb'   then 'v1-fb'
  when cv.price_variant is null    then '(no variant)'
  else 'base-v1' end`;

const c = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const rows = (await c.query(`
  select ${FUNNEL_CASE} as funnel,
         count(*)::int                                              as sent,
         count(m.opened_at)::int                                    as opened,
         round(100.0*count(m.opened_at)/nullif(count(*),0),1)       as open_pct,
         count(m.clicked_at)::int                                   as clicked,
         round(100.0*count(m.clicked_at)/nullif(count(*),0),1)      as ctr_pct,
         round(100.0*count(m.clicked_at)/nullif(count(m.opened_at),0),1) as click_to_open_pct
  from migration_drip_emails m
  join users u        on u.id = m.user_id
  left join conversations cv on cv.id = u.migrated_from_conversation_id
  where m.status='sent' and ${where}
  group by funnel order by sent desc`)).rows;
await c.end();

console.log(`\nMigration drip — open rate / CTR by funnel (${label})`);
console.log('source: Resend opened/clicked events stored in migration_drip_emails\n');
console.log('funnel'.padEnd(14), 'sent'.padStart(8), 'open%'.padStart(7), 'CTR%'.padStart(7), 'clk/opn%'.padStart(9), 'opened'.padStart(8), 'clicked'.padStart(8));
console.log('-'.repeat(70));
for (const r of rows) {
  console.log(
    String(r.funnel).padEnd(14),
    String(r.sent).padStart(8),
    String(r.open_pct ?? 0).padStart(7),
    String(r.ctr_pct ?? 0).padStart(7),
    String(r.click_to_open_pct ?? 0).padStart(9),
    String(r.opened).padStart(8),
    String(r.clicked).padStart(8),
  );
}

const header = 'funnel,sent,open_rate_pct,ctr_pct,click_to_open_pct,opened,clicked';
const csv = [header, ...rows.map((r) =>
  `${r.funnel},${r.sent},${r.open_pct ?? 0},${r.ctr_pct ?? 0},${r.click_to_open_pct ?? 0},${r.opened},${r.clicked}`)].join('\n');
fs.writeFileSync('funnel-email-report.csv', csv);
console.log(`\nWrote funnel-email-report.csv (${label}).`);
