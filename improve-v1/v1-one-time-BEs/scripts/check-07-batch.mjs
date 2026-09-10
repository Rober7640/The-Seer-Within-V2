/**
 * 07 — validate ONE batch of designed spreads before it is merged into the registry.
 *
 *   node scripts/check-07-batch.mjs scripts/07-batch-1.json
 *
 * ⭐ Why this exists. Phase 2 designs thirty spreads in five batches, one agent per batch, each
 *    writing its OWN file. ⛔ Five agents cannot write scripts/07-spreads.json — concurrent
 *    writes to one JSON corrupt it. So each batch is validated here, alone, and merged after.
 *
 * ⛔ This checks SHAPE and the numeric rules from docs/07-marcus/07-spread-design-rules.md.
 *    It cannot tell you whether a `job` string is any good — that is the reviewer's job, and
 *    `job` goes VERBATIM into the model prompt, so a shaped-but-empty job still ships a blank
 *    passage in a paid PDF.
 */
import fs from 'fs';
import { REGISTRY, TIER_MODEL, FLOOR } from './07-registry.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check-07-batch.mjs <batch.json>'); process.exit(2); }

const problems = [];
const bad = (where, msg) => problems.push(`${where}  ${msg}`);
const WEEKDAYS = new Set(REGISTRY.days);

let batch;
try { batch = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.error(`❌ ${file} is not valid JSON — ${e.message}`); process.exit(1); }

const entries = Object.entries(batch).filter(([k]) => !k.startsWith('_'));
if (!entries.length) { console.error(`❌ ${file} holds no spreads`); process.exit(1); }

for (const [key, s] of entries) {
  const at = key;

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)) bad(at, 'key must be kebab-case');
  // ⛔ node 4's guard dies SILENTLY on a short slug — `&s=` must be the FULL registry key.
  if (s.slug_in_link !== key) bad(at, `slug_in_link '${s.slug_in_link}' is not the key`);
  if (!s.name || !s.name.trim()) bad(at, 'no name');
  if (!s.question || !s.question.trim()) bad(at, 'no question');
  if (!s.shape || !s.shape.trim()) bad(at, 'no shape — the one sentence that orders the positions');
  if (!WEEKDAYS.has(s.day)) bad(at, `day '${s.day}' is not one of ${REGISTRY.days.join(',')}`);
  if (!Number.isInteger(s.day_number) || s.day_number < 1 || s.day_number > 30) {
    bad(at, `day_number must be an integer 1..30 — got ${s.day_number}`);
  }
  // ⛔ Phase 3 shoots the art and Phase 4 writes the email. A batch that invents either is
  //    claiming cards that were never cut.
  if (s.built_email) bad(at, 'built_email is Phase 3/4 — a batch must not write it');
  if (s.guards) bad(at, 'guards is deleted — the operator withdrew the disclaimer 2026-09-06');

  const ps = s.positions;
  if (!Array.isArray(ps) || !ps.length) { bad(at, 'no positions'); continue; }

  const free = ps.filter((p) => p.free);
  const paid = ps.filter((p) => !p.free);
  // ⭐ COUNTS RELAXED 2026-09-06. The old rule was "6–9 cards, 5–6 paid", which came from a model
  //    where she bought the rest of today's spread. Under C5 she buys her questions answered and
  //    resolve() tops a small answer up from the open cut, so a three-card past/present/future
  //    daily is legitimate — and it costs three photographs instead of seven.
  // ⛔ What still binds: a spread is at least three placed cards, it has both a free and a paid
  //    side, and it does not run so long that a passage drops under ~115 words.
  if (ps.length < 3) bad(at, `${ps.length} placed cards — a spread is at least 3`);
  if (ps.length > 9) bad(at, `${ps.length} cards — over 9; a passage drops under ~115 words`);
  if (!paid.length) bad(at, 'no paid position — there is nothing to sell');
  if (free.length < 1 || free.length > 3) bad(at, `${free.length} free — the rules say 1 to 3`);
  // ⚠ 4 paid is the awkward middle: too many to top up cleanly, too few to stand alone.
  if (paid.length === 4) bad(at, '4 paid — use 2 (topped up from the cut) or 5+');

  ps.forEach((p, i) => {
    const pat = `${at} pos ${i + 1}`;
    if (p.n !== i + 1) bad(pat, `numbered ${p.n} — numbers must be 1..N in order`);
    if (!p.name || !p.name.trim()) bad(pat, 'no name');
    if (typeof p.free !== 'boolean') bad(pat, '`free` must be true or false');

    const job = (p.job || '').trim();
    if (job.length < 20) { bad(pat, 'no usable job string'); return; }
    const words = job.split(/\s+/).length;
    if (words < 9 || words > 25) bad(pat, `job is ${words} words — the rules say 9 to 25`);
    if (/[.!?]$/.test(job)) bad(pat, 'job ends in a full stop — it is a phrase, not a sentence');
    // ⛔ The job is what the model must FIND. Second person means it was written at her.
    if (/\b(you|your)\b/i.test(job)) bad(pat, 'job is in second person — write it in the third');
  });

  // ⛔ Free is what the daily email already read, and the email reads from the top of the cut.
  const firstPaid = ps.findIndex((p) => !p.free);
  if (firstPaid !== -1 && ps.slice(firstPaid).some((p) => p.free)) {
    bad(at, 'free positions are not contiguous from position 1');
  }
  const names = ps.map((p) => p.name);
  if (new Set(names).size !== names.length) bad(at, 'two positions share a name');
}

/**
 * 🔴 THE OPEN-POSITION COLLISION. Found by the batch-1 agent, 2026-09-06.
 *
 * `tier_model.open_positions` are the three jobs laid on the open cards for HER SECOND AND
 * THIRD questions — so on every $57 and $87 order they land in the same PDF as the day
 * spread. A day position whose job is a twin of one of those makes the model write the same
 * paragraph twice in one paid reading, and the buyer who paid the most sees it.
 *
 * ⛔ The spread-design rules doc recommends move-phrasing that is VERBATIM open position 4's
 *    job, so this is not hypothetical — it is what the doc tells an agent to do.
 */
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (t) => new Set(norm(t).split(' ').filter((w) => w.length > 3));
const overlap = (a, b) => {
  const A = toks(a), B = toks(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / Math.min(A.size, B.size);
};

const OPEN = (TIER_MODEL.open_positions || []).map((o) => ({ n: o.n, name: o.name, job: o.job }));
const seen = new Map();   // normalised job -> "key pos n"

for (const [key, s2] of entries) {
  for (const p of s2.positions || []) {
    const job = (p.job || '').trim();
    if (job.length < 20) continue;
    const at = `${key} pos ${p.n}`;

    for (const o of OPEN) {
      const r = overlap(job, o.job);
      if (norm(job) === norm(o.job)) {
        bad(at, `job is VERBATIM open position ${o.n} ("${o.name}") — every $57/$87 order would print that paragraph twice`);
      } else if (r >= 0.8) {
        bad(at, `job is a near-twin of open position ${o.n} ("${o.name}", ${Math.round(r * 100)}% overlap) — they meet in the same paid PDF`);
      }
    }

    const n = norm(job);
    if (seen.has(n)) bad(at, `job repeats ${seen.get(n)}`);
    else seen.set(n, at);
  }
}

const dupKeys = entries.map(([k]) => k);
if (new Set(dupKeys).size !== dupKeys.length) bad(file, 'a key appears twice');
const slots = entries.map(([, s]) => s.day_number);
if (new Set(slots).size !== slots.length) bad(file, `two spreads claim the same day_number: ${slots.join(',')}`);

if (problems.length) {
  console.log(`❌ ${problems.length} problem(s) in ${file}\n`);
  for (const p of problems) console.log(`   ${p}`);
  process.exit(1);
}
const pos = entries.reduce((a, [, s]) => a + s.positions.length, 0);
console.log(`✅ ${entries.length} spreads · ${pos} positions · shape and numbers are right.`);
console.log('   ⛔ This says nothing about whether the job strings are any good. Read them.');
