#!/usr/bin/env node
// Renders views from hook-ledger.json. No deps.
// Usage: node render-ledger.cjs <status|urls|briefs|queue> [hookId]
const fs = require('fs');
const path = require('path');

const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'hook-ledger.json'), 'utf8'));
const cmd = process.argv[2] || 'status';
const hookArg = process.argv[3];

const SIGNS = L.signs;
const uniqueSigns = SIGNS.filter(s => !s.altOf && s.reads !== 'him'); // palm signs needing their own reads
const allSigns = SIGNS;                                      // get their own ad creative + URL
const liveHooks = L.hooks.filter(h => h.status !== 'killed');
const route = L.meta.version_routes;
const BASE = L.meta.prod_base;

const targetSigns = (h) => h.target_signs === 'all'
  ? allSigns.filter(s => s.reads !== 'him')   // "all" = palm signs (block-diagonal: card hooks list ["cards"] explicitly)
  : allSigns.filter(s => h.target_signs.includes(s.id));
const creativeFor = (hook, sign) =>
  (L.creatives || []).find(c => c.hook === hook && c.sign === sign);
const pad = (s, n) => String(s).padEnd(n);

function urls(h) {
  console.log(`\n# URL matrix — ${h.id}  ("${h.headline}")   status:${h.status}`);
  for (const s of targetSigns(h)) {
    const q = s.id === 'thumb' ? `?hook=${h.id}` : `?hook=${h.id}&sign=${s.id}`;
    console.log(`  ${pad(s.id, 18)}  A ${BASE}${route.a}${q}`);
    console.log(`  ${pad('', 18)}  B ${BASE}${route.b}${q}`);
    console.log(`  ${pad('', 18)}  C ${BASE}${route.c}${q}`);
  }
}

function briefs(h) {
  console.log(`\n# Image briefs — ${h.id}  headline: "${h.headline}"`);
  console.log(`  (set the headline over each sign's existing A/B/C strip — match the live lander art)`);
  for (const s of targetSigns(h)) {
    const c = creativeFor(h.id, s.id);
    const state = c ? `${c.status}${c.link ? ' ' + c.link : ''}` : 'NEEDED';
    console.log(`  [${c && c.status === 'ready' ? 'x' : ' '}] ${pad(s.id, 18)} ${pad(s.strip + ` (${s.w}x${s.h})`, 34)} ${state}`);
  }
}

function status() {
  console.log(`# Hook ledger — ${liveHooks.length} active hooks · ${uniqueSigns.length} unique-read signs · ${allSigns.length} total signs\n`);
  console.log(`${pad('hook', 16)} ${pad('reads', 8)} ${pad('status', 9)} ${pad('creatives', 11)} headline`);
  for (const h of liveHooks) {
    const ts = targetSigns(h);
    const ready = ts.filter(s => creativeFor(h.id, s.id)?.status === 'ready').length;
    console.log(`${pad(h.id, 16)} ${pad(h.reads_status, 8)} ${pad(h.status, 9)} ${pad(ready + '/' + ts.length, 11)} ${h.headline}`);
  }
  const reads = uniqueSigns.reduce((n, s) => n + s.options.length, 0);
  console.log(`\nFull-matrix cost per new hook: ${reads} reads (${uniqueSigns.length} unique signs) · ${allSigns.length} ad creatives · ${allSigns.length * 3} live URLs`);
}

function queue() {
  const todo = liveHooks.filter(h => h.reads_status === 'todo');
  const review = liveHooks.filter(h => h.reads_status === 'review');
  console.log('# Generation queue');
  console.log('TODO (generate reads):  ' + (todo.map(h => h.id).join(', ') || '—'));
  console.log('REVIEW (awaiting gate): ' + (review.map(h => `${h.id} [${(h.drafted_signs || []).join('/') || 'full'}]`).join(', ') || '—'));
}

const hook = hookArg && L.hooks.find(h => h.id === hookArg);
if ((cmd === 'urls' || cmd === 'briefs') && !hook) {
  console.error(`Pass a hook id. Known: ${L.hooks.map(h => h.id).join(', ')}`);
  process.exit(1);
}
({ status, urls: () => urls(hook), briefs: () => briefs(hook), queue }[cmd] || status)();
