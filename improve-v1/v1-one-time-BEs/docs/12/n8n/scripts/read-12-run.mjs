/**
 * Pull one n8n execution of 12 and save what the buyer would have received.
 *
 *   node scripts/read-12-run.mjs <executionId> [--build 12-fulfilment-TESTDRIVE-FAKETTA.n8n.json]
 *   → runs/12-run-<id>.md         the reading, with numbers, grade and cost as a header
 *   → runs/12-run-<id>.html       node 10's exact HTML
 *   → runs/12-run-<id>-audit.json metrics, verdict, each model call, drift from the local build
 *   then: node scripts/make-12-pdf.mjs --from runs/12-run-<id>.html
 *
 * Reads the n8n API only. Saved runs hold a fake buyer. A real buyer's run must never be saved here.
 */
import fs from 'fs';
import path from 'path';
import { BUILD, TESTINA, RUNS, REPO, loadWf } from './lib-12.mjs';

const env = (k) => process.env[k] || (fs.existsSync(path.join(REPO, '.env')) && (fs.readFileSync(path.join(REPO, '.env'), 'utf8')
  .match(new RegExp(`^\\s*${k}\\s*=\\s*(.+)$`, 'm')) || [])[1]?.trim().replace(/^['"]|['"]$/g, ''));
const id = process.argv[2];
if (!id || id.startsWith('--')) throw new Error('usage: read-12-run.mjs <n8n executionId> [--build <file>]');
const buildArg = process.argv.includes('--build') ? process.argv[process.argv.indexOf('--build') + 1] : TESTINA;
if (!/^12-fulfilment[A-Z0-9-]*\.n8n\.json$/.test(buildArg)) throw new Error('Invalid build basename');
const PRICE_IN = 2 / 1e6, PRICE_OUT = 10 / 1e6;

const r = await fetch(`${String(env('N8N_BASE_URL')).replace(/\/$/, '')}/api/v1/executions/${id}?includeData=true`,
  { headers: { 'X-N8N-API-KEY': env('N8N_API_KEY') } });
if (!r.ok) throw new Error(`n8n answered ${r.status} for execution ${id}`);
const ex = await r.json();
const rd = ex.data?.resultData?.runData || {};
const out = (prefix) => { const n = Object.keys(rd).find((k) => k.startsWith(prefix)); if (!n) return null;
  const runs = rd[n]; return runs[runs.length - 1]?.data?.main?.[0]?.[0]?.json || null; };
console.log(`\n  execution ${id} · ${ex.status} · ${ex.startedAt?.slice(0, 16)} → ${ex.stoppedAt?.slice(0, 16)}`);
console.log(`  nodes that ran: ${Object.keys(rd).join(' · ')}`);
const err = ex.data?.resultData?.error;
if (err) console.log(`  🔴 failed at ${err.node?.name}: ${String(err.message).slice(0, 300)}`);

const local = loadWf(buildArg);
const executed = ex.workflowData || ex.data?.workflowData;
const contains = (w, a) => (Array.isArray(w) ? Array.isArray(a) && w.length === a.length && w.every((v, i) => contains(v, a[i]))
  : w && typeof w === 'object' ? a && Object.keys(w).every((k) => contains(w[k], a[k])) : w === a);
const drift = executed?.nodes ? local.nodes.filter((n) => !contains(n.parameters, executed.nodes.find((x) => x.name === n.name)?.parameters)).map((n) => n.name) : null;
console.log(`  node comparison with ${buildArg}: ${drift === null ? 'unavailable' : drift.length ? `DIFFERS: ${drift.join(', ')}` : 'matches'}`);

const calls = [];
for (const [name, runs] of Object.entries(rd)) {
  if (!/^(4b|4s|7) ·/.test(name)) continue;
  runs.forEach((run, i) => { for (const item of run.data?.main?.[0] || []) {
    const u = item.json?.usage || {};
    calls.push({ node: name, run: i + 1, model: item.json?.model || null, stop: item.json?.choices?.[0]?.finish_reason || null,
      input: u.prompt_tokens || 0, cached: u.prompt_tokens_details?.cached_tokens || 0,
      output: u.completion_tokens || 0, reasoning: u.completion_tokens_details?.reasoning_tokens || 0 });
  } });
}
const sum = (k) => calls.reduce((n, c) => n + c[k], 0);
const cost = sum('input') * PRICE_IN + sum('output') * PRICE_OUT;
console.log(`  returned models: ${[...new Set(calls.map((c) => c.model))].join(', ') || 'none'}`);
for (const c of calls) console.log(`    ${c.node.padEnd(30)} run ${c.run}  in ${String(c.input).padStart(6)}  cached ${String(c.cached).padStart(6)}  out ${String(c.output).padStart(6)}  thinking ${String(c.reasoning).padStart(6)}  ${c.stop}`);
console.log(`  ${calls.length} calls · ${sum('input')} in · ${sum('output')} out (${sum('reasoning')} of it thinking) · $${cost.toFixed(2)} at $2/$10, ignoring any cache discount`);

const read = out('7a ·');
const provenance = { execution: id, workflow: ex.workflowId, status: ex.status, startedAt: ex.startedAt, stoppedAt: ex.stoppedAt, drift, calls, cost_usd: Number(cost.toFixed(3)) };
fs.mkdirSync(RUNS, { recursive: true });
if (!read?.reading) {
  fs.writeFileSync(path.join(RUNS, `12-run-${id}-audit.json`), JSON.stringify({ provenance }, null, 2));
  console.log('\n  🔴 no finished reading in this execution (never reached 7a)\n'); process.exit(1);
}
const v = read.verdict || {}, m = read.metrics || {};
const md = path.join(RUNS, `12-run-${id}.md`);
fs.writeFileSync(md, [
  `# 12 — n8n execution ${id} (${ex.startedAt?.slice(0, 16)})`, '',
  '| | |', '|---|---|',
  `| Buyer | ${read.birth_name} (fixture) · order \`${read.order_id}\` |`,
  `| Numbers | ${read.lucky.numbers.three.join(', ')} · six ${read.lucky.tickets.list.join(', ')} · PIN ${read.lucky.pin.value} · stop ${read.lucky.stopNumber.value} |`,
  `| Window | ${read.lucky.windowLabel} · arm ${read.arm} · bump ${read.bump ? 'yes' : 'no'} |`,
  `| Open days | ${read.lucky.openDays.map((o) => o.date).join(' · ')} |`,
  `| Words | ${m.words} |`,
  `| Attempt | ${read.attempt}${read.first_failure ? ` · first failure: lines ${read.first_failure.failed.join(', ')}. ${read.first_failure.why}` : ''} |`,
  `| Grade | ${v.pass ? 'PASS' : 'FAIL'}${v.failed?.length ? ` — lines ${v.failed.join(', ')}` : ''} · weighted ${v.weighted_score} · recommend ${v.recommend} |`,
  `| Why | ${v.why || ''} |`,
  `| Cost | $${cost.toFixed(2)} · ${calls.length} calls |`,
  '', '---', '', read.reading,
].join('\n'));
const html = out('10 ·')?.html;
if (html) fs.writeFileSync(path.join(RUNS, `12-run-${id}.html`), html);
fs.writeFileSync(path.join(RUNS, `12-run-${id}-audit.json`), JSON.stringify({ verdict: v, metrics: m, lucky: read.lucky, arm: read.arm, bump: read.bump, devices: read.devices, provenance }, null, 2));
console.log(`\n  ${m.words} words · attempt ${read.attempt} · grade ${v.pass ? 'PASS' : 'FAIL'}${v.failed?.length ? ` lines ${v.failed.join(', ')}` : ''}`);
console.log(`  ${v.why || ''}`);
console.log(`\n  ${md}`);
if (html) console.log(`  next: node ${path.relative(REPO, path.join(path.dirname(md), '../scripts/make-12-pdf.mjs'))} --from ${path.join(RUNS, `12-run-${id}.html`)}\n`);
