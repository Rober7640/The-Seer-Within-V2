#!/usr/bin/env node
// voc-by-hook — HER OWN WORDS, per /fb-tarot lander.
//
// WHY. Before a lander's copy is rewritten, somebody has to know what the woman who clicked
// that ad actually wants said back to her. Reasoning it out from the headline gets you close
// and confidently wrong: two hooks one word apart ("does he REALLY love me" vs "does he STILL
// love me") want opposite things, and only her own sentences show which. The standing
// instruction is to read real quotes directly rather than lead with frequency counts.
//
// So this pulls `conversations.concern` — the first thing she typed, unprompted — for one or
// more hooks, and writes them out to be READ. It computes almost nothing on purpose: counting
// n-grams here would reproduce exactly the mistake the instruction was given to prevent.
//
// Read-only, same two-key gate as its siblings (connectReadOnly + the 25006 canary).
//
//   node .../voc-by-hook.mjs --hook cards-feels                       # sandbox
//   LIVE_AUDIT_CONFIRM=1 node .../voc-by-hook.mjs --live --hook cards-feels --hook cards-who-he-is
//   ... --days 90 --limit 150
//
// Output: audit-runs/v1-funnel-live-audit/voc-<hook>.md (gitignored) + a console sample.
//
// 🔴 PII. These are real women's sentences about their own relationships, and they name real
// people. Emails and long digit runs are masked below, but NAMES ARE NOT — no scrubber is
// reliable enough to claim they are. The output stays in the gitignored audit-runs/ tree:
// never commit it, never paste it into an artifact, never send it anywhere outside this repo.

import { writeFileSync, mkdirSync } from 'node:fs';
import { connectReadOnly, beginReads, PAID, pct } from './lib/live-db.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const hooks = argv.reduce((a, v, i) => (v === '--hook' ? [...a, argv[i + 1]] : a), []);
const live = argv.includes('--live');
const days = Number(arg('--days', 120));
const limit = Number(arg('--limit', 200));

if (!hooks.length) { console.error('usage: voc-by-hook.mjs --hook <hook> [--hook <hook>] [--live] [--days N] [--limit N]'); process.exit(2); }

// Mask what CAN be masked reliably. Names cannot be, hence the header warning.
const mask = (s) => s
  .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
  .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]');

const { client, canary, mode, redactedHost } = await connectReadOnly({ live });
console.log(`\nDB: ${redactedHost}\nmode: ${mode}\ncanary: ${canary}\nwindow: last ${days}d · up to ${limit} quotes per hook\n`);
await beginReads(client);

mkdirSync('audit-runs/v1-funnel-live-audit', { recursive: true });

for (const hook of hooks) {
  // The exposure row is where the lander identity lives — `conversations` has no hook column.
  // Joined both ways because either side can be the one that carries the link (same join the
  // lander-coverage query in plan-live.mjs uses).
  const { rows } = await client.query(
    `SELECT DISTINCT ON (c.id) c.id, c.concern, c.first_name IS NOT NULL AS named,
            ${PAID} AS paid, c.created_at
       FROM experiment_exposures e
       JOIN conversations c ON (c.id = e.context->>'conversationId' OR c.ab_visitor_id = e.subject_id)
      WHERE e.context->>'hook' = $1
        AND c.created_at > now() - ($2 || ' days')::interval
        AND c.concern IS NOT NULL AND length(btrim(c.concern)) > 12
      ORDER BY c.id, c.created_at DESC
      LIMIT $3`,
    [hook, String(days), limit],
  );

  // The denominator: everyone who ARRIVED on this hook, whether or not she typed anything.
  // Without it the quotes look like the whole audience instead of the half that spoke.
  const { rows: [tot] } = await client.query(
    `SELECT count(DISTINCT c.id)::int n,
            count(DISTINCT c.id) FILTER (WHERE c.concern IS NOT NULL AND length(btrim(c.concern)) > 12)::int spoke
       FROM experiment_exposures e
       JOIN conversations c ON (c.id = e.context->>'conversationId' OR c.ab_visitor_id = e.subject_id)
      WHERE e.context->>'hook' = $1 AND c.created_at > now() - ($2 || ' days')::interval`,
    [hook, String(days)],
  );

  const buyers = rows.filter((r) => r.paid);
  const out = [
    `# ${hook} — her own words`,
    '',
    `⚠️ **PII — gitignored, never commit or share.** Real sentences about real relationships,`,
    `naming real people. Emails and phone numbers are masked; names are not.`,
    '',
    `Window: last ${days} days · arrived on this hook: **${tot?.n ?? 0}** · typed a concern:`,
    `**${tot?.spoke ?? 0}** (${pct(tot?.spoke ?? 0, tot?.n ?? 0)}) · shown below: ${rows.length}`,
    `· of those, ${buyers.length} went on to buy.`,
    '',
    `Read them. Do not count them.`,
    '',
    '## Buyers',
    '',
    ...buyers.map((r) => `- ${mask(r.concern.replace(/\s+/g, ' ').trim())}`),
    '',
    '## Everyone else',
    '',
    ...rows.filter((r) => !r.paid).map((r) => `- ${mask(r.concern.replace(/\s+/g, ' ').trim())}`),
    '',
  ].join('\n');

  const path = `audit-runs/v1-funnel-live-audit/voc-${hook}.md`;
  writeFileSync(path, out);
  console.log(`${hook.padEnd(20)} arrived ${String(tot?.n ?? 0).padStart(5)} · spoke ${String(tot?.spoke ?? 0).padStart(5)} (${pct(tot?.spoke ?? 0, tot?.n ?? 0)}) · wrote ${rows.length} quotes (${buyers.length} buyers) → ${path}`);
}

await client.query('ROLLBACK');
await client.end();
console.log('\nread-only transaction rolled back; nothing was written to the database.\n');
