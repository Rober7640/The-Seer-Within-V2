/**
 * 07 — cross-check the five designed batches and merge them into the registry. Task 2.4.
 *
 *   node scripts/merge-07-batches.mjs --check    # cross-check only, write nothing
 *   node scripts/merge-07-batches.mjs            # cross-check, then write 07-spreads.json
 *
 * ⭐ WHY A MERGE STEP EXISTS AT ALL. Phase 2 designs thirty spreads in five batches, one agent
 *    per batch, because seven parallel agents drifted on 2026-09-04. Five agents cannot write
 *    one JSON — concurrent writes corrupt it — so each writes its own file and this joins them.
 *
 * 🔴 THE CHECKS HERE ARE THE ONES NO SINGLE BATCH COULD RUN. A batch agent can only see its own
 *    six, and the batch that finishes first can see nobody. Duplicate keys, duplicate calendar
 *    slots and repeated `job` strings ACROSS batches are invisible from inside one batch and are
 *    exactly what a five-way parallel run produces.
 *
 * ⛔ THIS RETIRES THE SEVEN. The clean-sheet decision of 2026-09-05 replaces the `spreads` object
 *    outright. Everything else in 07-spreads.json — tier_model, floor, days — is untouched.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REGISTRY, TIER_MODEL } from './07-registry.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REG_PATH = path.join(HERE, '07-spreads.json');
const CHECK_ONLY = process.argv.includes('--check');

const files = fs.readdirSync(HERE).filter((f) => /^07-batch-\d+\.json$/.test(f)).sort();
if (!files.length) { console.error('No scripts/07-batch-*.json files.'); process.exit(1); }

const problems = [];
const notes = [];
const bad = (m) => problems.push(m);

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (t) => new Set(norm(t).split(' ').filter((w) => w.length > 3));
const overlap = (a, b) => {
  const A = toks(a), B = toks(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / Math.min(A.size, B.size);
};

// ── gather ────────────────────────────────────────────────────────────────────────────
const merged = {};
const origin = new Map();          // key -> batch file
for (const f of files) {
  let obj;
  try { obj = JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8')); }
  catch (e) { bad(`${f} is not valid JSON — ${e.message}`); continue; }
  for (const [key, s] of Object.entries(obj)) {
    if (key.startsWith('_')) continue;
    if (merged[key]) bad(`key '${key}' is in both ${origin.get(key)} and ${f}`);
    merged[key] = s;
    origin.set(key, f);
  }
}

const entries = Object.entries(merged);
console.log(`${files.length} batch file(s) · ${entries.length} spreads · ` +
  `${entries.reduce((a, [, s]) => a + s.positions.length, 0)} positions\n`);

// ── the calendar must be exactly 1..N, no gaps, no ties ───────────────────────────────
const slots = new Map();
for (const [key, s] of entries) {
  if (slots.has(s.day_number)) {
    bad(`day_number ${s.day_number} is claimed by '${slots.get(s.day_number)}' and '${key}'`);
  } else slots.set(s.day_number, key);
}
for (let i = 1; i <= entries.length; i++) {
  if (!slots.has(i)) bad(`calendar slot ${i} is empty — day_number must be 1..${entries.length}`);
}

// ── the weekday rotation must actually rotate ─────────────────────────────────────────
// ⭐ The weekday picks the OPENING SHAPE. Day 1 is a Monday, so slot n runs days[(n-1) % 7].
for (const [key, s] of entries) {
  const want = REGISTRY.days[(s.day_number - 1) % 7];
  if (s.day !== want) bad(`'${key}' is calendar day ${s.day_number}, which is ${want} — it says ${s.day}`);
}

// ── names ─────────────────────────────────────────────────────────────────────────────
const byName = new Map();
for (const [key, s] of entries) {
  const n = norm(s.name);
  if (byName.has(n)) bad(`two spreads are called '${s.name}' — ${byName.get(n)} and ${key}`);
  else byName.set(n, key);
}

// ── 🔴 the cross-batch job check ──────────────────────────────────────────────────────
// A repeated job is the same paragraph in two different paid PDFs, sold on two mornings as
// two different products. Invisible from inside one batch.
const jobs = [];
for (const [key, s] of entries) for (const p of s.positions) jobs.push({ key, n: p.n, job: p.job });
for (let i = 0; i < jobs.length; i++) {
  for (let j = i + 1; j < jobs.length; j++) {
    if (jobs[i].key === jobs[j].key) continue;
    const r = norm(jobs[i].job) === norm(jobs[j].job) ? 1 : overlap(jobs[i].job, jobs[j].job);
    if (r === 1) bad(`${jobs[i].key} pos ${jobs[i].n} and ${jobs[j].key} pos ${jobs[j].n} share a job VERBATIM`);
    else if (r >= 0.85) {
      notes.push(`${jobs[i].key} pos ${jobs[i].n} ≈ ${jobs[j].key} pos ${jobs[j].n} (${Math.round(r * 100)}% overlap)`);
    }
  }
}
// ── position NAMES across batches ─────────────────────────────────────────────────────
// ⭐ Found by the batch-3 agent, which spotted a clash between batches 4 and 5 that no
//    validator ran. A name is the label she reads above a card; the same label on two
//    mornings makes two products look like one, and the rules doc bans it outright.
const nameAt = new Map();
for (const [key, s2] of entries) {
  for (const p of s2.positions) {
    const n = norm(p.name);
    if (nameAt.has(n) && nameAt.get(n).key !== key) {
      const prev = nameAt.get(n);
      bad(`position name "${p.name}" is used by both ${prev.key} pos ${prev.n} and ${key} pos ${p.n}`);
    } else nameAt.set(n, { key, n: p.n });
  }
}

// …and against the open three, which reach the same PDF on every $57 and $87 order.
for (const o of TIER_MODEL.open_positions || []) {
  for (const jb of jobs) {
    const r = norm(jb.job) === norm(o.job) ? 1 : overlap(jb.job, o.job);
    if (r >= 0.8) bad(`${jb.key} pos ${jb.n} collides with open position ${o.n} ("${o.name}") at ${Math.round(r * 100)}%`);
  }
}

// ── report ────────────────────────────────────────────────────────────────────────────
if (notes.length) {
  console.log(`⚠ ${notes.length} near-twin job(s) — read these, they are not automatically wrong:`);
  for (const n of notes) console.log(`   ${n}`);
  console.log('');
}
if (problems.length) {
  console.log(`❌ ${problems.length} problem(s) — nothing merged\n`);
  for (const p of problems) console.log(`   ${p}`);
  process.exit(1);
}
console.log('✅ the five batches agree with each other.');

if (CHECK_ONLY) { console.log('   --check, so nothing was written.'); process.exit(0); }

// ── write ─────────────────────────────────────────────────────────────────────────────
const reg = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));
const retired = Object.keys(reg.spreads);
const ordered = {};
for (const [, key] of [...slots.entries()].sort((a, b) => a[0] - b[0])) ordered[key] = merged[key];
reg.spreads = ordered;
fs.writeFileSync(REG_PATH, JSON.stringify(reg, null, 2) + '\n');
console.log(`\n⛔ RETIRED ${retired.length} spread(s): ${retired.join(' · ')}`);
console.log(`✅ wrote ${entries.length} spreads to scripts/07-spreads.json in calendar order.`);
console.log('   Now run: node scripts/check-07-registry.mjs');
