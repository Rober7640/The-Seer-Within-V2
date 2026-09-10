/**
 * Pull one n8n execution of 02 and save what the buyer would have received.
 *
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/read-02-run.mjs <executionId>
 *   → docs/02/n8n-02-reading-<id>.md      the reading, with the draw/arc/grade as a header
 *   → docs/02/n8n-02-draw-<id>.json       the twelve, as node 3 laid them
 *   then:  node scripts/make-02-pdf.mjs --from n8n-02-reading-<id>
 *
 * ⭐ WHY. The test drive now stops before Supabase (nodes 12/13a are disabled until the bucket
 *    exists), so there is no signed URL to fetch and compare-02-pdfs.mjs cannot run. The reading
 *    itself is in the execution record — node 6b's output — and the PDF renders from it locally
 *    through make-02-pdf.mjs, which is the same node-10 HTML PDFShift would have received.
 * ⛔ Which BUILD ran is checked first: a run whose house prompt lacks the arc line is an old
 *    build, and nothing in it says anything about the current one (see 02-HANDOVER.md).
 */
import fs from 'fs';
import crypto from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.resolve(ROOT, "../../../../..");
const env = (k) => (fs.readFileSync(path.join(REPO, '.env'), 'utf8')
  .match(new RegExp(`^\\s*${k}\\s*=\\s*(.+)$`, 'm')) || [])[1]?.trim().replace(/^['"]|['"]$/g, '');
const id = process.argv[2];
if (!id) throw new Error('usage: read-02-run.mjs <n8n executionId>');

const r = await fetch(`${env('N8N_BASE_URL').replace(/\/$/, '')}/api/v1/executions/${id}?includeData=true`,
  { headers: { 'X-N8N-API-KEY': env('N8N_API_KEY') } });
if (!r.ok) throw new Error(`n8n answered ${r.status} for execution ${id}`);
const ex = await r.json();
const rd = ex.data?.resultData?.runData || {};
const out = (n, run = (rd[n]?.length || 1) - 1) => rd[n]?.[run]?.data?.main?.[0]?.[0]?.json;
console.log(`\n  execution ${id} · ${ex.status} · ${ex.startedAt?.slice(0, 16)} → ${ex.stoppedAt?.slice(0, 16)}`);
console.log(`  nodes that ran: ${Object.keys(rd).join(' · ')}`);
const err = ex.data?.resultData?.error;
if (err) console.log(`  🔴 failed at ${err.node?.name}: ${String(err.message).slice(0, 200)}`);

// Compare the executable nodes, not obsolete strings from the Phase 2 prose prompt.
const buildArg = process.argv.includes('--build')
  ? process.argv[process.argv.indexOf('--build') + 1] : '02-fulfilment.n8n.json';
if (!/^02-fulfilment[A-Z0-9-]*\.n8n\.json$/.test(buildArg)) throw new Error('Invalid build basename');
const local = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/02', buildArg)));
const executed = ex.workflowData || ex.data?.workflowData;
const relevant = ['3 ·', '4a ·', '4b ·', '4c ·', '4r ·', '4s ·', '4t ·', '6 ·', '6a ·', '6b ·', '7 ·', '7a ·', '10 ·'];
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(k =>
    `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}` : JSON.stringify(value);
// n8n expands default parameters in execution records. Compare every authored field.
const containsAuthored = (wanted, actual) => Array.isArray(wanted)
  ? Array.isArray(actual) && wanted.length === actual.length && wanted.every((v, i) => containsAuthored(v, actual[i]))
  : wanted && typeof wanted === 'object'
    ? actual && Object.keys(wanted).every(k => containsAuthored(wanted[k], actual[k]))
    : wanted === actual;
const drift = executed?.nodes ? local.nodes.filter(n => relevant.some(p => n.name.startsWith(p)))
  .filter(n => !containsAuthored(n.parameters, executed.nodes.find(x => x.name === n.name)?.parameters))
  .map(n => n.name) : null;
const models = [];
for (const name of ['4b · Write the house', '4s · Retry the house once', '6a · Join into one reading', '7 · Grade it']) {
  for (const [attempt, run] of (rd[name] || []).entries()) {
    for (const item of run.data?.main?.[0] || []) {
      const response = item.json || {};
      models.push({node: name, call: attempt + 1, model: response.model || null,
        stop: response.stop_reason || response.choices?.[0]?.finish_reason || null,
        usage: response.usage || null});
    }
  }
}
const provenance = {execution: id, workflow: ex.workflowId, status: ex.status,
  startedAt: ex.startedAt, stoppedAt: ex.stoppedAt, driftFromCurrentLocalBuild: drift,
  executedNodesHash: executed?.nodes ? crypto.createHash('sha256').update(canonical(executed.nodes)).digest('hex') : null,
  models};
fs.writeFileSync(path.join(ROOT, `docs/02/n8n-02-provenance-${id}.json`), JSON.stringify(provenance, null, 2));
console.log(`  executable node comparison: ${drift === null ? 'unavailable' : drift.length ? `DIFFERS: ${drift.join(', ')}` : 'matches current local build'}`);
console.log(`  returned models: ${[...new Set(models.map(m => m.model))].join(', ')}`);

const read = out('6b · Keep the reading');
if (!read?.reading) { console.log('\n  🔴 no reading in this execution (never reached 6b)\n'); process.exit(1); }
const verdict = out('7a · Read the verdict')?.verdict || {};
const draw = read.draw;
const words = read.reading.trim().split(/\s+/).length;
const md = path.join(ROOT, `docs/02/n8n-02-reading-${id}.md`);
fs.writeFileSync(md, [
  `# 02 — n8n execution ${id} (${ex.startedAt?.slice(0, 16)})`, '',
  `| | |`, `|---|---|`,
  `| Order | \`${read.order_id}\` |`,
  `| Arc | ${read.arc || 'v1 (pre-arc build)'}${read.mechanism ? ` — "${read.mechanism}"` : ''} |`,
  `| Draw | ${draw.map((p) => `${p.house}:${p.card_name}${p.reversed ? '(r)' : ''}${p.owes ? '⭐' : ''}`).join(' · ')} |`,
  `| Words | ${words} against a target of ${read.target_words} (${(((words / read.target_words) - 1) * 100).toFixed(0)}%) |`,
  `| Grade | ${verdict.pass === undefined ? 'not graded' : verdict.pass ? 'PASS' : 'FAIL'}${verdict.failed?.length ? ` — lines ${verdict.failed.join(', ')}` : ''} |`,
  `| Why | ${verdict.why || ''} |`,
  '', '---', '', read.reading,
].join('\n'));
fs.writeFileSync(path.join(ROOT, `docs/02/n8n-02-draw-${id}.json`), JSON.stringify(draw, null, 2));
const rendered = out('10 · Build the HTML');
if (rendered?.html) {
  fs.writeFileSync(path.join(ROOT, `docs/02/n8n-02-reading-${id}.html`), rendered.html);
}
fs.writeFileSync(path.join(ROOT, `docs/02/n8n-02-audit-${id}.json`), JSON.stringify({
  order: {order_id: read.order_id, first_name: read.first_name, paid_at: read.paid_at},
  verdict, metrics: read.metrics || null, provenance,
}, null, 2));
console.log(`\n  arc ${read.arc || '?'} · ${words} words · grade ${verdict.pass === undefined ? '?' : verdict.pass ? 'PASS' : 'FAIL'}`);
for (const p of draw) console.log(`    house ${String(p.house).padStart(2)}${p.owes ? ' ⭐' : '  '} ${p.house_name.padEnd(40)} ${p.card_name}${p.reversed ? ' (reversed)' : ''}`);
console.log(`\n  ${path.relative(REPO, md)}`);
console.log(`  next: node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/make-02-pdf.mjs --from n8n-02-reading-${id}\n`);
