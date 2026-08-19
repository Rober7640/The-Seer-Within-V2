#!/usr/bin/env node
// voc-by-theme — her own words, searched by THEME across the whole V1 corpus.
//
// WHY. voc-by-hook only works once a hook has traffic. A family shipped days ago has none,
// and skipping the read is what produced copy that acquitted a man on cards-who-he-is. The
// women who would click "Why do his children come before me?" have been typing into V1 for
// months under other ads — this finds them by what they SAID, not by which lander they hit.
//
// Read-only, same gate as its siblings.
import { writeFileSync, mkdirSync } from 'node:fs';
import { connectReadOnly, beginReads, PAID } from './lib/live-db.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const live = argv.includes('--live');
const label = arg('--label', 'theme');
const pattern = arg('--pattern');
const days = Number(arg('--days', 3650));
const limit = Number(arg('--limit', 120));
if (!pattern) { console.error('usage: --label X --pattern "<regex>" [--live] [--days N] [--limit N]'); process.exit(2); }

const mask = (s) => s
  .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
  .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]');

const { client, canary, mode, redactedHost } = await connectReadOnly({ live });
console.log(`\nDB: ${redactedHost}\nmode: ${mode}\ncanary: ${canary}\n`);
await beginReads(client);

const { rows } = await client.query(
  `SELECT c.concern, ${PAID} AS paid
     FROM conversations c
    WHERE c.created_at > now() - ($1 || ' days')::interval
      AND c.concern IS NOT NULL AND length(btrim(c.concern)) > 20
      AND c.concern ~* $2
    ORDER BY ${PAID} DESC, length(c.concern) DESC
    LIMIT $3`,
  [String(days), pattern, limit],
);
const { rows: [tot] } = await client.query(
  `SELECT count(*)::int n FROM conversations c
    WHERE c.created_at > now() - ($1 || ' days')::interval
      AND c.concern IS NOT NULL AND length(btrim(c.concern)) > 20 AND c.concern ~* $2`,
  [String(days), pattern],
);

const buyers = rows.filter((r) => r.paid);
mkdirSync('audit-runs/v1-funnel-live-audit', { recursive: true });
const out = [
  `# ${label} — her own words (theme search across all V1 concerns)`, '',
  `⚠️ **PII — gitignored, never commit or share.**`, '',
  `pattern: \`${pattern}\` · matched: **${tot?.n ?? 0}** · shown: ${rows.length} · buyers shown: ${buyers.length}`, '',
  'Read them. Do not count them.', '',
  '## Buyers', '', ...buyers.map((r) => `- ${mask(r.concern.replace(/\s+/g, ' ').trim())}`), '',
  '## Everyone else', '', ...rows.filter((r) => !r.paid).map((r) => `- ${mask(r.concern.replace(/\s+/g, ' ').trim())}`), '',
].join('\n');
const path = `audit-runs/v1-funnel-live-audit/theme-${label}.md`;
writeFileSync(path, out);
console.log(`${label.padEnd(22)} matched ${String(tot?.n ?? 0).padStart(6)} · wrote ${rows.length} (${buyers.length} buyers) → ${path}`);

await client.query('ROLLBACK');
await client.end();
console.log('\nread-only transaction rolled back; nothing was written.\n');
