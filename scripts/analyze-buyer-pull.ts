/**
 * analyze-buyer-pull.ts — mechanical stats over a pull-buyer-transcripts.ts output dir.
 * Pure file analysis, no DB. The math lives in scripts/lib/buyer-pull-stats.ts;
 * this file only formats it.
 *
 *   npx tsx scripts/analyze-buyer-pull.ts <pullDir> [label]
 *   npx tsx scripts/analyze-buyer-pull.ts <pullDir> [label] --persona aiden-powers
 */
import fs from 'fs';
import path from 'path';
import {
  loadPull, computeBehavior, computeBillingHealth, groupByPersona, MAX_COINS_PER_SECOND,
} from './lib/buyer-pull-stats';

const dir = process.argv[2];
const label = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : dir;
const onlyIdx = process.argv.indexOf('--persona');
const onlyPersona = onlyIdx > -1 ? process.argv[onlyIdx + 1] : undefined;

if (!dir || !fs.existsSync(path.join(dir, '01-purchases.json'))) {
  console.error('usage: analyze-buyer-pull.ts <pullDir> [label] [--persona <slug>]');
  process.exit(1);
}

const pull = loadPull(dir);
const pct = (a: number, b: number) => (b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : '0/0');
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

if (pull.excludedZeroPrice)
  console.log(`(excluded ${pull.excludedZeroPrice} zero-price rows, e.g. admin_adjustment)`);

console.log(`\n═══ ${label} ═══`);

// ── pooled totals (unchanged from the original output) ──────────────────────
const all = computeBehavior(pull.purchases, pull.msgsBySession);
console.log(`purchases=${all.purchases} buyers=${all.buyers} revenue=${usd(all.revenueCents)} repeat-buyers-in-window=${all.repeatBuyers}`);
console.log(`package mix: ${Object.entries(all.packageMix).map(([k, v]) => `${k}=${v}`).join(' ')}`);
console.log(`\nPurchase context (all personas):`);
console.log(`  bought DURING a live session:      ${pct(all.duringSession, all.purchases)}`);
console.log(`  buy-to-continue (pre-gap ≤15m):    ${pct(all.b2c15, all.purchases)}   (≤60m: ${pct(all.b2c60 + all.duringSession, all.purchases)})`);
console.log(`  cold start (no session ≤48h):      ${pct(all.coldStart, all.purchases)}  gap>60m: ${pct(all.longGap, all.purchases)}`);
console.log(`\nOf buy-to-continue (≤60m or during) purchases [n=${all.b2cTotal}]:`);
console.log(`  pre-session cut on open question:  ${pct(all.cutOnQ, all.b2cTotal)}`);
console.log(`  full reading (≥100w) before cut:   ${pct(all.readingBefore, all.b2cTotal)}`);
console.log(`  resumed chat ≤15m after buying:    ${pct(all.resumedFast, all.b2cTotal)}`);
console.log(`  ask-only assistant turns (<30w+?): ${pct(all.askOnlyTurns, all.assistantTurns)}`);

// ── per-persona breakdown (the point of this script) ────────────────────────
const rows = groupByPersona(pull).filter(r => !onlyPersona || r.persona === onlyPersona);
if (onlyPersona && !rows.length) {
  console.error(`\nno such persona in this pull: ${onlyPersona}`);
  process.exit(1);
}

console.log(`\n─── PER PERSONA ───`);
console.log(`persona            buyers   purch    revenue   reading-before-cut        cut-on-Q       ask-only    sess`);
for (const r of rows) {
  const b = r.behavior;
  if (!b.purchases && !r.sessionCount) {
    console.log(`${r.persona.padEnd(16)}  0 buyers in window`);
    continue;
  }
  console.log(
    `${r.persona.padEnd(16)}` +
    `${String(b.buyers).padStart(7)}` +
    `${String(b.purchases).padStart(8)}` +
    `${usd(b.revenueCents).padStart(11)}` +
    `${pct(b.readingBefore, b.b2cTotal).padStart(21)}` +
    `${pct(b.cutOnQ, b.b2cTotal).padStart(16)}` +
    `${pct(b.askOnlyTurns, b.assistantTurns).padStart(15)}` +
    `${String(r.sessionCount).padStart(8)}`,
  );
}

// ── billing health ─────────────────────────────────────────────────────────
const health = computeBillingHealth(pull.sessions, pull.msgsBySession);
console.log(`\nBilling health (all ${pull.sessions.length} pulled sessions):`);
console.log(`  rate ceiling: ${MAX_COINS_PER_SECOND.toFixed(3)} coins/sec  ·  observed median ${health.medianRatio.toFixed(2)} · max ${health.maxRatio.toFixed(2)}  (n=${health.sessionsChecked} sessions >60s)`);
console.log(`  billing ABOVE the contractual rate: ${health.overRate.length} sessions`);
console.log(`  zombie sessions (0 coin,≤5s,≥2msg): ${health.zombies}`);
console.log(`  billed ≥2min past last message:    ${health.idleTail}`);
if (health.overRate.length) {
  console.log(`  worst: ${health.overRate.slice(0, 8).map(o => `${o.id}(${o.ratio.toFixed(2)}/s, ${o.coins}c over ${o.dur}s)`).join(' ')}`);
  console.log(`  ⚠️ investigate these against credit_transactions — coins_charged is the meter, not the ledger.`);
}
